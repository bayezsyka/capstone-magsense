#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ==========================================
// KONFIGURASI WIFI & MQTT
// ==========================================
const char* ssid = "WIFI_SSID_ANDA";
const char* password = "WIFI_PASSWORD_ANDA";
const char* mqtt_server = "192.168.1.100"; // IP Raspberry Pi / Broker
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

// ==========================================
// KONFIGURASI PIN MAPPING (Sesuai Skematik)
// ==========================================

// 1. Sensor DHT22
#define DHT1_PIN 13
#define DHT2_PIN 14
#define DHT3_PIN 16
#define DHT4_PIN 17
#define DHTTYPE DHT22

DHT dht1(DHT1_PIN, DHTTYPE);
DHT dht2(DHT2_PIN, DHTTYPE);
DHT dht3(DHT3_PIN, DHTTYPE);
DHT dht4(DHT4_PIN, DHTTYPE);

// 2. Sensor Soil Moisture (Analog)
const int soilPins[6] = {32, 33, 34, 35, 36, 39};

// 3. Aktuator Relay
// Lampu (Heater)
const int lampuPins[4] = {18, 19, 21, 22};
// Kipas
const int kipasPins[4] = {27, 4, 5, 15};
// Solenoid Valve
const int solenoidPins[3] = {23, 25, 26};

// ==========================================
// VARIABEL KONTROL & INTERVAL
// ==========================================
unsigned long lastMsgTime = 0;
const long interval = 5000; // 5 detik

// Default Threshold (Akan diupdate via MQTT)
float threshold_temp_min = 28.0;
float threshold_temp_max = 32.0;
float threshold_soil_min = 40.0;

// Status Aktuator untuk dilampirkan di payload
bool isHeaterOn = false;
bool isKipasOn = false;
bool isPompaOn = false;

// ==========================================
// DEKLARASI FUNGSI
// ==========================================
void setup_wifi();
void reconnect();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void controlActuators(float avgTemp, float avgSoil);
void publishSensorData(float avgTemp, float avgHum, float avgSoil);
void setRelays(const int pins[], int size, bool state);

void setup() {
  Serial.begin(115200);
  
  // Inisialisasi DHT
  dht1.begin();
  dht2.begin();
  dht3.begin();
  dht4.begin();

  // Inisialisasi Pin Aktuator sebagai OUTPUT & set ke LOW (Mati)
  for(int i = 0; i < 4; i++) {
    pinMode(lampuPins[i], OUTPUT);
    digitalWrite(lampuPins[i], LOW);
    
    pinMode(kipasPins[i], OUTPUT);
    digitalWrite(kipasPins[i], LOW);
  }
  for(int i = 0; i < 3; i++) {
    pinMode(solenoidPins[i], OUTPUT);
    digitalWrite(solenoidPins[i], LOW);
  }

  // Koneksi ke WiFi dan MQTT
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsgTime >= interval) {
    lastMsgTime = now;

    // --- PEMBACAAN SENSOR ---
    
    // 1. Baca DHT22 (Suhu & Kelembapan Udara)
    float t1 = dht1.readTemperature();
    float t2 = dht2.readTemperature();
    float t3 = dht3.readTemperature();
    float t4 = dht4.readTemperature();
    
    float h1 = dht1.readHumidity();
    float h2 = dht2.readHumidity();
    float h3 = dht3.readHumidity();
    float h4 = dht4.readHumidity();

    // Hitung rata-rata Suhu & Kelembapan (abaikan jika NaN)
    float sumT = 0, sumH = 0;
    int validDHT = 0;
    
    if(!isnan(t1)) { sumT += t1; sumH += h1; validDHT++; }
    if(!isnan(t2)) { sumT += t2; sumH += h2; validDHT++; }
    if(!isnan(t3)) { sumT += t3; sumH += h3; validDHT++; }
    if(!isnan(t4)) { sumT += t4; sumH += h4; validDHT++; }

    float avgTemp = (validDHT > 0) ? (sumT / validDHT) : 0;
    float avgHum = (validDHT > 0) ? (sumH / validDHT) : 0;

    // 2. Baca Soil Moisture (Kelembapan Media)
    float sumSoil = 0;
    for(int i = 0; i < 6; i++) {
      int analogVal = analogRead(soilPins[i]);
      // Konversi analog (0-4095 di ESP32) ke persentase (0-100%).
      // Kalibrasi spesifik bisa disesuaikan, ini asumsi 4095=kering, 0=basah.
      float percentage = map(analogVal, 4095, 0, 0, 100);
      if(percentage < 0) percentage = 0;
      if(percentage > 100) percentage = 100;
      sumSoil += percentage;
    }
    float avgSoil = sumSoil / 6.0;

    // --- OTOMASI KONTROL ---
    controlActuators(avgTemp, avgSoil);

    // --- PUBLISH DATA ---
    publishSensorData(avgTemp, avgHum, avgSoil);
  }
}

// ==========================================
// IMPLEMENTASI FUNGSI
// ==========================================

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Create a random client ID
    String clientId = "ESP32Client-";
    clientId += String(random(0, 1000), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      // Subscribe to control topic
      client.subscribe("maggot/kontrol/threshold");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String messageTemp;
  for (int i = 0; i < length; i++) {
    messageTemp += (char)payload[i];
  }
  
  Serial.print("Message arrived on topic: ");
  Serial.print(topic);
  Serial.print(". Message: ");
  Serial.println(messageTemp);

  // Proses JSON dari topik kontrol threshold
  if (String(topic) == "maggot/kontrol/threshold") {
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, messageTemp);

    if (!error) {
      if (doc.containsKey("temp_min")) threshold_temp_min = doc["temp_min"];
      if (doc.containsKey("temp_max")) threshold_temp_max = doc["temp_max"];
      if (doc.containsKey("soil_min")) threshold_soil_min = doc["soil_min"];
      
      Serial.println("Threshold updated successfully.");
    } else {
      Serial.print("deserializeJson() failed: ");
      Serial.println(error.c_str());
    }
  }
}

void setRelays(const int pins[], int size, bool state) {
  // state: true = nyala (tergantung modul relay, asumsikan active HIGH untuk logika ini. 
  // Jika active LOW, balik logika ini menjadi state ? LOW : HIGH)
  int pinState = state ? HIGH : LOW;
  for (int i = 0; i < size; i++) {
    digitalWrite(pins[i], pinState);
  }
}

void controlActuators(float avgTemp, float avgSoil) {
  // 1. Kontrol Suhu Udara
  if (avgTemp < threshold_temp_min) {
    // Suhu dingin -> Nyalakan Lampu Heater, Matikan Kipas
    setRelays(lampuPins, 4, true);
    setRelays(kipasPins, 4, false);
    isHeaterOn = true;
    isKipasOn = false;
  } else if (avgTemp > threshold_temp_max) {
    // Suhu panas -> Nyalakan Kipas, Matikan Lampu Heater
    setRelays(lampuPins, 4, false);
    setRelays(kipasPins, 4, true);
    isHeaterOn = false;
    isKipasOn = true;
  } else {
    // Suhu ideal -> Matikan keduanya
    setRelays(lampuPins, 4, false);
    setRelays(kipasPins, 4, false);
    isHeaterOn = false;
    isKipasOn = false;
  }

  // 2. Kontrol Kelembapan Media
  if (avgSoil < threshold_soil_min) {
    // Kering -> Nyalakan Pompa/Solenoid Valve
    setRelays(solenoidPins, 3, true);
    isPompaOn = true;
  } else {
    // Cukup basah -> Matikan Pompa
    setRelays(solenoidPins, 3, false);
    isPompaOn = false;
  }
}

void publishSensorData(float avgTemp, float avgHum, float avgSoil) {
  StaticJsonDocument<256> doc;
  
  doc["box_id"] = 1;
  doc["temperature"] = avgTemp;
  doc["humidity"] = avgHum;
  doc["media_humidity"] = avgSoil;
  
  JsonObject actuators = doc.createNestedObject("actuators");
  actuators["heater"] = isHeaterOn ? "ON" : "OFF";
  actuators["kipas"] = isKipasOn ? "ON" : "OFF";
  actuators["pompa"] = isPompaOn ? "ON" : "OFF";

  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);
  
  client.publish("maggot/sensor/data", jsonBuffer);
  Serial.print("Published data: ");
  Serial.println(jsonBuffer);
}
