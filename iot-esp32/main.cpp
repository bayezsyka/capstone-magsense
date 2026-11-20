#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// =====================================================================
// CONFIGURATION (HOTSPOT & MQTT BROKER)
// =====================================================================
const char* ssid = "YOUR_HOTSPOT_SSID";
const char* password = "YOUR_HOTSPOT_PASSWORD";
const char* mqtt_server = "192.168.43.100"; // Replace with your Windows laptop hotspot IP (check via 'ipconfig')
const int mqtt_port = 1883;

// MQTT Topics
const char* topic_sensor_data = "maggot/sensor/data";
const char* topic_control_threshold = "maggot/kontrol/threshold";

// =====================================================================
// PIN MAPPING (HARDWARE SPECIFICATION)
// =====================================================================
#define DHT_INTERNAL_PIN 16
#define DHT_EXTERNAL_PIN 17
#define DHTTYPE DHT22

DHT dhtInternal(DHT_INTERNAL_PIN, DHTTYPE);
DHT dhtExternal(DHT_EXTERNAL_PIN, DHTTYPE);

#define PIN_SOIL 34 // ADC1 Input-Only

#define PIN_RELAY_INTAKE  18
#define PIN_RELAY_EXHAUST 19
#define PIN_RELAY_PTC     23

// Active LOW Relays
const int RELAY_ON  = LOW;
const int RELAY_OFF = HIGH;

// Safety Lock: Keep PTC heater OFF during initial integration testing
const bool SAFETY_LOCK_PTC_OFF = true;

// =====================================================================
// TIMING & NON-BLOCKING STATES
// =====================================================================
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
const long interval = 5000;

unsigned long lastWifiRetry = 0;
const unsigned long wifiRetryInterval = 10000;

unsigned long lastMqttRetry = 0;
const unsigned long mqttRetryInterval = 5000;

// Thresholds
float temp_min = 28.0;
float temp_max = 34.0;
float moisture_min = 40.0;

bool isIntakeActive = false;
bool isExhaustActive = false;
bool isPtcActive = false;

// =====================================================================
// NON-BLOCKING CONNECTION HANDLER
// =====================================================================
void setup_wifi() {
  Serial.print("[WIFI] Connecting to ");
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
}

void maintainConnections() {
  unsigned long now = millis();

  // 1. Maintain WiFi
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWifiRetry >= wifiRetryInterval) {
      lastWifiRetry = now;
      Serial.println("[WIFI] Connection lost. Reconnecting to hotspot...");
      WiFi.disconnect();
      WiFi.reconnect();
    }
    return;
  }

  // 2. Maintain MQTT
  if (!client.connected()) {
    if (now - lastMqttRetry >= mqttRetryInterval) {
      lastMqttRetry = now;
      Serial.print("[MQTT] Connecting to ");
      Serial.print(mqtt_server);
      Serial.print("...");
      String clientId = "ESP32-MagSense-";
      clientId += String((uint32_t)ESP.getEfuseMac(), HEX);

      if (client.connect(clientId.c_str())) {
        Serial.println(" CONNECTED!");
        client.subscribe(topic_control_threshold);
      } else {
        Serial.print(" FAILED, rc=");
        Serial.println(client.state());
      }
    }
  }
}

// =====================================================================
// MQTT CALLBACK
// =====================================================================
void callback(char* topic, byte* payload, unsigned int length) {
  String messageTemp;
  for (unsigned int i = 0; i < length; i++) {
    messageTemp += (char)payload[i];
  }
  Serial.print("[MQTT RX] ");
  Serial.print(topic);
  Serial.print(": ");
  Serial.println(messageTemp);

  if (String(topic) == topic_control_threshold) {
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, messageTemp);
    if (!error) {
      if (doc.containsKey("temp_min")) temp_min = doc["temp_min"];
      if (doc.containsKey("temp_max")) temp_max = doc["temp_max"];
      if (doc.containsKey("soil_min")) moisture_min = doc["soil_min"];
      Serial.println("[THRESHOLD] Updated successfully.");
    }
  }
}

// =====================================================================
// ACTUATOR AUTOMATION
// =====================================================================
void checkAutomation(float avgTemp, float avgMoisture) {
  // Intake & Exhaust
  if (avgTemp > temp_max) {
    digitalWrite(PIN_RELAY_INTAKE, RELAY_ON);
    digitalWrite(PIN_RELAY_EXHAUST, RELAY_ON);
    isIntakeActive = true;
    isExhaustActive = true;
  } else {
    digitalWrite(PIN_RELAY_INTAKE, RELAY_OFF);
    digitalWrite(PIN_RELAY_EXHAUST, RELAY_OFF);
    isIntakeActive = false;
    isExhaustActive = false;
  }

  // PTC Heater (Forced OFF in safety lock mode)
  if (SAFETY_LOCK_PTC_OFF) {
    digitalWrite(PIN_RELAY_PTC, RELAY_OFF);
    isPtcActive = false;
  } else {
    if (avgTemp < temp_min) {
      digitalWrite(PIN_RELAY_PTC, RELAY_ON);
      isPtcActive = true;
    } else {
      digitalWrite(PIN_RELAY_PTC, RELAY_OFF);
      isPtcActive = false;
    }
  }
}

// =====================================================================
// SETUP & LOOP
// =====================================================================
void setup() {
  Serial.begin(115200);

  // Initialize Relays (Pre-write HIGH so Active LOW relays stay OFF during boot)
  digitalWrite(PIN_RELAY_INTAKE, RELAY_OFF);
  digitalWrite(PIN_RELAY_EXHAUST, RELAY_OFF);
  digitalWrite(PIN_RELAY_PTC, RELAY_OFF);

  pinMode(PIN_RELAY_INTAKE, OUTPUT);
  pinMode(PIN_RELAY_EXHAUST, OUTPUT);
  pinMode(PIN_RELAY_PTC, OUTPUT);

  digitalWrite(PIN_RELAY_INTAKE, RELAY_OFF);
  digitalWrite(PIN_RELAY_EXHAUST, RELAY_OFF);
  digitalWrite(PIN_RELAY_PTC, RELAY_OFF);

  // Initialize DHT22
  dhtInternal.begin();
  dhtExternal.begin();

  // Initialize Soil
  pinMode(PIN_SOIL, INPUT);

  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  client.setBufferSize(512);
}

void loop() {
  maintainConnections();

  if (client.connected()) {
    client.loop();
  }

  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;

    float t1 = dhtInternal.readTemperature();
    float h1 = dhtInternal.readHumidity();
    float t2 = dhtExternal.readTemperature();
    float h2 = dhtExternal.readHumidity();

    float sumT = 0, sumH = 0;
    int count = 0;
    if (!isnan(t1) && !isnan(h1)) { sumT += t1; sumH += h1; count++; }
    if (!isnan(t2) && !isnan(h2)) { sumT += t2; sumH += h2; count++; }

    float avgTemp = count > 0 ? (sumT / count) : 29.0;
    float avgHum  = count > 0 ? (sumH / count) : 70.0;

    int rawSoil = analogRead(PIN_SOIL);
    float soilPct = map(rawSoil, 4095, 1500, 0, 100);
    soilPct = constrain(soilPct, 0.0, 100.0);

    checkAutomation(avgTemp, soilPct);

    if (client.connected()) {
      StaticJsonDocument<384> doc;
      doc["box_id"] = 1;
      doc["box_code"] = "MAG-01";
      doc["device_id"] = "ESP32-MAG-01";
      doc["temperature"] = round(avgTemp * 10.0) / 10.0;
      doc["humidity"] = round(avgHum * 10.0) / 10.0;
      doc["media_humidity"] = round(soilPct * 10.0) / 10.0;
      doc["raw_soil_adc"] = rawSoil;
      doc["source"] = "real";

      JsonObject actuators = doc.createNestedObject("actuators");
      actuators["intake"]  = isIntakeActive ? "ON" : "OFF";
      actuators["exhaust"] = isExhaustActive ? "ON" : "OFF";
      actuators["ptc"]     = isPtcActive ? "ON" : "OFF";
      actuators["heater"]  = isPtcActive ? "ON" : "OFF";
      actuators["kipas"]   = (isIntakeActive || isExhaustActive) ? "ON" : "OFF";

      char jsonBuffer[384];
      serializeJson(doc, jsonBuffer);
      client.publish(topic_sensor_data, jsonBuffer);
      Serial.print("[PUBLISHED] ");
      Serial.println(jsonBuffer);
    }
  }
}
