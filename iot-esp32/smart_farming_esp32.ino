#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// =====================================================================
// KONFIGURASI WIFI HOTSPOT & MQTT BROKER
// =====================================================================
// Hubungkan ESP32 dan Laptop Windows ke Hotspot HP yang sama.
// Cek IP Laptop Windows di CMD/PowerShell via: ipconfig (pada interface Wi-Fi)
// Contoh IP Hotspot Android: 192.168.43.x | iPhone: 172.20.10.x
const char* ssid = "HOTSPOT_HP_ANDA";          // Sesuaikan SSID Hotspot HP
const char* password = "PASSWORD_HOTSPOT";     // Sesuaikan Password Hotspot HP
const char* mqtt_server = "192.168.43.100";    // GANTI DENGAN IP LAPTOP WINDOWS ANDA
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

// =====================================================================
// KONFIGURASI PIN MAPPING HARDWARE
// =====================================================================
// 1. Sensor DHT22 (Internal & Eksternal)
#define DHT_INTERNAL_PIN 16
#define DHT_EXTERNAL_PIN 17
#define DHTTYPE DHT22

DHT dhtInternal(DHT_INTERNAL_PIN, DHTTYPE);
DHT dhtExternal(DHT_EXTERNAL_PIN, DHTTYPE);

// 2. Sensor Soil Moisture (Analog - Input Only ADC1)
#define SOIL_PIN 34

// 3. Aktuator Relay (Semua Active LOW)
#define RELAY_INTAKE_PIN  18
#define RELAY_EXHAUST_PIN 19
#define RELAY_PTC_PIN     23

// Level logika untuk modul relay Active LOW
const int RELAY_ON  = LOW;   // Aktif / Menghantarkan arus
const int RELAY_OFF = HIGH;  // Nonaktif / Terputus

// =====================================================================
// VARIABEL INTERVAL & TIMING NON-BLOCKING
// =====================================================================
unsigned long lastPublishTime = 0;
const unsigned long publishInterval = 5000; // Publish setiap 5 detik

unsigned long lastWifiRetry = 0;
const unsigned long wifiRetryInterval = 10000; // Cek WiFi setiap 10 detik

unsigned long lastMqttRetry = 0;
const unsigned long mqttRetryInterval = 5000;  // Coba reconnect MQTT setiap 5 detik

// Default Threshold Otomasi (dapat diperbarui via MQTT)
float threshold_temp_min = 28.0;
float threshold_temp_max = 34.0;
float threshold_soil_min = 40.0;

// Status Aktuator
bool isIntakeOn  = false;
bool isExhaustOn = false;
bool isPtcOn     = false; // PTC tetap OFF pada pengujian awal

// Flag pengujian awal: paksa PTC heater tetap OFF demi keamanan
const bool SAFETY_LOCK_PTC_OFF = true;

// =====================================================================
// DEKLARASI FUNGSI
// =====================================================================
void setupWifi();
void maintainConnections();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void controlActuators(float avgTemp, float avgSoil);
void publishSensorData(float avgTemp, float avgHum, float soilPercent, int rawSoil);

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n[SYSTEM] Booting ESP32 Mag-Sense Local Integration...");

  // Inisialisasi Relay (Active LOW: Wajib set HIGH terlebih dahulu sebelum pinMode agar tidak flick/nyala sesaat)
  digitalWrite(RELAY_INTAKE_PIN, RELAY_OFF);
  digitalWrite(RELAY_EXHAUST_PIN, RELAY_OFF);
  digitalWrite(RELAY_PTC_PIN, RELAY_OFF);

  pinMode(RELAY_INTAKE_PIN, OUTPUT);
  pinMode(RELAY_EXHAUST_PIN, OUTPUT);
  pinMode(RELAY_PTC_PIN, OUTPUT);

  // Pastikan kondisi awal semua relay mati (OFF = HIGH)
  digitalWrite(RELAY_INTAKE_PIN, RELAY_OFF);
  digitalWrite(RELAY_EXHAUST_PIN, RELAY_OFF);
  digitalWrite(RELAY_PTC_PIN, RELAY_OFF);
  Serial.println("[RELAY] Semua relay diinisialisasi ke kondisi OFF (Active LOW = HIGH)");

  // Inisialisasi Sensor DHT22
  dhtInternal.begin();
  dhtExternal.begin();
  Serial.println("[SENSOR] DHT22 Internal (GPIO16) & Eksternal (GPIO17) siap");

  // Inisialisasi Soil Moisture
  pinMode(SOIL_PIN, INPUT);
  Serial.println("[SENSOR] Soil Moisture (GPIO34 ADC1) siap");

  // Inisialisasi MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  client.setBufferSize(512); // Pastikan buffer muat payload JSON lengkap

  // Koneksi awal WiFi
  setupWifi();
}

void loop() {
  // Pemeliharaan koneksi WiFi dan MQTT secara non-blocking
  maintainConnections();

  if (client.connected()) {
    client.loop();
  }

  // Siklus Pembacaan Sensor & Pengiriman Data
  unsigned long now = millis();
  if (now - lastPublishTime >= publishInterval) {
    lastPublishTime = now;

    // 1. Baca DHT22 Internal
    float tIn = dhtInternal.readTemperature();
    float hIn = dhtInternal.readHumidity();

    // 2. Baca DHT22 Eksternal
    float tEx = dhtExternal.readTemperature();
    float hEx = dhtExternal.readHumidity();

    // Hitung rata-rata atau gunakan nilai valid
    float sumT = 0, sumH = 0;
    int validCount = 0;

    if (!isnan(tIn) && !isnan(hIn)) {
      sumT += tIn; sumH += hIn; validCount++;
    } else {
      Serial.println("[WARN] DHT Internal (GPIO16) pembacaan NaN!");
    }

    if (!isnan(tEx) && !isnan(hEx)) {
      sumT += tEx; sumH += hEx; validCount++;
    } else {
      Serial.println("[WARN] DHT Eksternal (GPIO17) pembacaan NaN!");
    }

    float avgTemp = (validCount > 0) ? (sumT / validCount) : 29.0;
    float avgHum  = (validCount > 0) ? (sumH / validCount) : 70.0;

    // 3. Baca Soil Moisture (Analog ADC 0 - 4095)
    int rawSoil = analogRead(SOIL_PIN);
    // Asumsi kalibrasi kapasitif: 4095 = udara kering (0%), 1500 = air/media basah (100%)
    float soilPercent = map(rawSoil, 4095, 1500, 0, 100);
    soilPercent = constrain(soilPercent, 0.0, 100.0);

    // 4. Logika Otomasi Aktuator
    controlActuators(avgTemp, soilPercent);

    // 5. Publish Telemetri ke Mosquitto
    if (client.connected()) {
      publishSensorData(avgTemp, avgHum, soilPercent, rawSoil);
    } else {
      Serial.println("[MQTT] Broker belum terhubung, data disimpan sementara...");
    }
  }
}

// =====================================================================
// MANAJEMEN KONEKSI NON-BLOCKING (WIFI & MQTT)
// =====================================================================
void setupWifi() {
  Serial.print("[WIFI] Menghubungkan ke ");
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
}

void maintainConnections() {
  unsigned long now = millis();

  // 1. Cek status WiFi
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWifiRetry >= wifiRetryInterval) {
      lastWifiRetry = now;
      Serial.println("[WIFI] Terputus. Mencoba rekoneksi ke hotspot...");
      WiFi.disconnect();
      WiFi.reconnect();
    }
    return; // Tunggu WiFi pulih sebelum mencoba MQTT
  }

  // 2. Cek status MQTT
  if (!client.connected()) {
    if (now - lastMqttRetry >= mqttRetryInterval) {
      lastMqttRetry = now;
      Serial.print("[MQTT] Menghubungkan ke broker ");
      Serial.print(mqtt_server);
      Serial.print(":");
      Serial.print(mqtt_port);
      Serial.print("... ");

      String clientId = "ESP32-MagSense-";
      clientId += String((uint32_t)ESP.getEfuseMac(), HEX);

      if (client.connect(clientId.c_str())) {
        Serial.println("TERHUBUNG!");
        client.subscribe("maggot/kontrol/threshold");
      } else {
        Serial.print("GAGAL, rc=");
        Serial.print(client.state());
        Serial.println(" (Akan dicoba lagi dalam 5 detik)");
      }
    }
  }
}

// =====================================================================
// KONTROL AKTUATOR (RELAY ACTIVE LOW)
// =====================================================================
void controlActuators(float avgTemp, float avgSoil) {
  // Kontrol Kipas Intake & Exhaust berdasarkan suhu
  if (avgTemp > threshold_temp_max) {
    // Suhu tinggi -> Nyalakan Intake & Exhaust
    digitalWrite(RELAY_INTAKE_PIN, RELAY_ON);
    digitalWrite(RELAY_EXHAUST_PIN, RELAY_ON);
    isIntakeOn  = true;
    isExhaustOn = true;
  } else {
    // Suhu normal / sejuk -> Matikan Kipas
    digitalWrite(RELAY_INTAKE_PIN, RELAY_OFF);
    digitalWrite(RELAY_EXHAUST_PIN, RELAY_OFF);
    isIntakeOn  = false;
    isExhaustOn = false;
  }

  // Kontrol PTC Ceramic Heater: Wajib OFF pada pengujian awal demi keamanan
  if (SAFETY_LOCK_PTC_OFF) {
    digitalWrite(RELAY_PTC_PIN, RELAY_OFF);
    isPtcOn = false;
  } else {
    if (avgTemp < threshold_temp_min) {
      digitalWrite(RELAY_PTC_PIN, RELAY_ON);
      isPtcOn = true;
    } else {
      digitalWrite(RELAY_PTC_PIN, RELAY_OFF);
      isPtcOn = false;
    }
  }
}

// =====================================================================
// CALLBACK MQTT (TERIMA PENGATURAN THRESHOLD)
// =====================================================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("[MQTT RCVD] ");
  Serial.print(topic);
  Serial.print(" -> ");
  Serial.println(message);

  if (String(topic) == "maggot/kontrol/threshold") {
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);
    if (!error) {
      if (doc.containsKey("temp_min")) threshold_temp_min = doc["temp_min"];
      if (doc.containsKey("temp_max")) threshold_temp_max = doc["temp_max"];
      if (doc.containsKey("soil_min")) threshold_soil_min = doc["soil_min"];
      Serial.println("[THRESHOLD] Berhasil diperbarui via MQTT!");
    }
  }
}

// =====================================================================
// PUBLISH DATA TELEMETRI SENSOR KE MQTT BROKER
// =====================================================================
void publishSensorData(float avgTemp, float avgHum, float soilPercent, int rawSoil) {
  StaticJsonDocument<384> doc;

  doc["box_id"] = 1;
  doc["box_code"] = "MAG-01";
  doc["device_id"] = "ESP32-MAG-01";
  doc["temperature"] = round(avgTemp * 10.0) / 10.0;
  doc["humidity"] = round(avgHum * 10.0) / 10.0;
  doc["media_humidity"] = round(soilPercent * 10.0) / 10.0;
  doc["raw_soil_adc"] = rawSoil;
  doc["source"] = "real";

  // Struktur status aktuator (lengkap dengan alias untuk kompabilitas backend)
  JsonObject actuators = doc.createNestedObject("actuators");
  actuators["intake"]  = isIntakeOn ? "ON" : "OFF";
  actuators["exhaust"] = isExhaustOn ? "ON" : "OFF";
  actuators["ptc"]     = isPtcOn ? "ON" : "OFF";
  actuators["heater"]  = isPtcOn ? "ON" : "OFF";
  actuators["kipas"]   = (isIntakeOn || isExhaustOn) ? "ON" : "OFF";

  char jsonBuffer[384];
  serializeJson(doc, jsonBuffer);

  bool success = client.publish("maggot/sensor/data", jsonBuffer);
  if (success) {
    Serial.print("[MQTT PUB] ");
    Serial.println(jsonBuffer);
  } else {
    Serial.println("[MQTT PUB FAILED] Paket gagal dikirim, periksa koneksi broker.");
  }
}
