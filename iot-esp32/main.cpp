#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h> // Library for JSON serialization/deserialization

// ======================= CONFIGURATION =======================
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "192.168.1.100"; // Ganti dengan IP Raspberry Pi / Broker MQTT
const int mqtt_port = 1883;

// MQTT Topics
const char* topic_sensor_data = "maggot/sensor/data";
const char* topic_control_threshold = "maggot/kontrol/threshold";

// ======================= PIN MAPPING =======================
// DHT22 Sensors (4 Units)
#define DHTPIN1 15
#define DHTPIN2 2
#define DHTPIN3 4
#define DHTPIN4 16
#define DHTTYPE DHT22

DHT dht1(DHTPIN1, DHTTYPE);
DHT dht2(DHTPIN2, DHTTYPE);
DHT dht3(DHTPIN3, DHTTYPE);
DHT dht4(DHTPIN4, DHTTYPE);

// Analog Soil Moisture (6 Units)
const int soilPins[6] = {34, 35, 32, 33, 25, 26};

// Output Relays
#define PIN_HEATER 12     // Lampu Penghangat
#define PIN_KIPAS 14      // Kipas IN/OUT
#define PIN_VALVE 27      // Solenoid Valve

// ======================= GLOBAL VARIABLES =======================
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
const long interval = 10000; // 10 seconds non-blocking interval

// Thresholds (Default values)
float temp_min = 25.0;
float temp_max = 32.0;
float moisture_min = 40.0;
float moisture_max = 65.0;

// Current aggregate readings
float currentTemp = 0.0;
float currentMoisture = 0.0;

// ======================= SETUP WIFI =======================
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

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

// ======================= MQTT CALLBACK =======================
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  String messageTemp;
  for (int i = 0; i < length; i++) {
    messageTemp += (char)payload[i];
  }
  Serial.println(messageTemp);

  // Handle Threshold updates
  if (String(topic) == topic_control_threshold) {
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, messageTemp);

    if (error) {
      Serial.print(F("deserializeJson() failed: "));
      Serial.println(error.f_str());
      return;
    }

    if(doc.containsKey("tempMin")) temp_min = doc["tempMin"];
    if(doc.containsKey("tempMax")) temp_max = doc["tempMax"];
    if(doc.containsKey("mediaMin")) moisture_min = doc["mediaMin"];
    if(doc.containsKey("mediaMax")) moisture_max = doc["mediaMax"];
    
    Serial.println("Thresholds updated via MQTT");
  }
}

// ======================= MQTT RECONNECT =======================
void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      client.subscribe(topic_control_threshold);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

// ======================= LOCAL AUTOMATION =======================
void checkAutomation() {
  // Heater Logic
  if (currentTemp < temp_min) {
    digitalWrite(PIN_HEATER, HIGH); // Assuming HIGH triggers relay
    Serial.println("Automation: Temp low. Heater ON.");
  } else if (currentTemp >= temp_min + 1.0) { // Hysteresis
    digitalWrite(PIN_HEATER, LOW);
  }

  // Kipas Logic
  if (currentTemp > temp_max) {
    digitalWrite(PIN_KIPAS, HIGH);
    Serial.println("Automation: Temp high. Kipas ON.");
  } else if (currentTemp <= temp_max - 1.0) {
    digitalWrite(PIN_KIPAS, LOW);
  }

  // Solenoid Valve Logic
  if (currentMoisture < moisture_min) {
    digitalWrite(PIN_VALVE, HIGH);
    Serial.println("Automation: Moisture low. Valve OPEN.");
  } else if (currentMoisture > moisture_max) {
    digitalWrite(PIN_VALVE, LOW);
    Serial.println("Automation: Moisture high. Valve CLOSED.");
  }
}

// ======================= MAIN SETUP =======================
void setup() {
  Serial.begin(115200);

  // Initialize Relays
  pinMode(PIN_HEATER, OUTPUT);
  pinMode(PIN_KIPAS, OUTPUT);
  pinMode(PIN_VALVE, OUTPUT);
  digitalWrite(PIN_HEATER, LOW);
  digitalWrite(PIN_KIPAS, LOW);
  digitalWrite(PIN_VALVE, LOW);

  // Initialize DHT
  dht1.begin();
  dht2.begin();
  dht3.begin();
  dht4.begin();

  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

// ======================= MAIN LOOP =======================
void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;

    // Read DHT Sensors (Average logic for simplicity)
    float t1 = dht1.readTemperature();
    float h1 = dht1.readHumidity();
    
    // Fallback if NaN
    if (isnan(t1)) t1 = 28.0; 
    if (isnan(h1)) h1 = 70.0;
    
    currentTemp = t1; // Simplified: using sensor 1 as primary for this example
    float currentHumAir = h1;

    // Read Soil Moisture (Average of 6 sensors)
    long totalMoisture = 0;
    for(int i=0; i<6; i++) {
      int raw = analogRead(soilPins[i]);
      // Convert analog value to percentage (Calibration needed in real life)
      int pct = map(raw, 4095, 1000, 0, 100); 
      pct = constrain(pct, 0, 100);
      totalMoisture += pct;
    }
    currentMoisture = totalMoisture / 6.0;

    // Local Automation
    checkAutomation();

    // Create JSON Payload
    StaticJsonDocument<256> doc;
    doc["box_id"] = 1; // ID Box ESP32 ini
    doc["temperature"] = currentTemp;
    doc["humidity"] = currentHumAir;
    doc["media_humidity"] = currentMoisture;
    
    // Status aktuator
    JsonObject actuators = doc.createNestedObject("actuators");
    actuators["heater"] = digitalRead(PIN_HEATER) == HIGH ? "ON" : "OFF";
    actuators["kipas"] = digitalRead(PIN_KIPAS) == HIGH ? "ON" : "OFF";
    actuators["valve"] = digitalRead(PIN_VALVE) == HIGH ? "ON" : "OFF";

    char jsonBuffer[256];
    serializeJson(doc, jsonBuffer);

    // Publish to MQTT
    client.publish(topic_sensor_data, jsonBuffer);
    Serial.print("Published data: ");
    Serial.println(jsonBuffer);
  }
}
