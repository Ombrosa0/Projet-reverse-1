#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "time.h"
#include <base64.h>
#include "mbedtls/base64.h"

// Wifi values
const char* ssid = "Pixel de Johann";
const char* password = "mdpduturfu";

// API values
const char* serverUrl = "https://arduinoooo.lol/badge";
const char* serverLogin = "https://arduinoooo.lol/login";

// Initialization expiration token date
int expToken = 0;

// Server NTP and clock
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 0;
const int daylightOffset_sec = 0;
time_t currentTime;
unsigned long lastMillis;

// Initialization JWT token
String jwtToken = "";

// Define LED pins and RFID-RC522 pins
#define RST_PIN 3
#define SS_PIN 20
MFRC522 mfrc522(SS_PIN, RST_PIN);
#define LEDV 21
#define LEDR 5

// Define screen definition
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Use https
WiFiClientSecure client;


void setup() {

  // ------------------------------------- //
  // --------------- Screen ---------------//
  // ------------------------------------- //
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;);
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  String message = "Setup ESP";
  int textWidth = message.length() * 6; // Chaque caractère est de 6 pixels de large
  int cursorX = (SCREEN_WIDTH - textWidth) / 2; // Centrer le texte
  display.setCursor(cursorX, 20); // Déplacer le curseur à la position calculée
  display.println(message); // Afficher le texte
  display.display();

  // ------------------------------------- //
  // -------- Start LED and Serial --------//
  // ------------------------------------- //
  pinMode(LEDV, OUTPUT);
  pinMode(LEDR, OUTPUT);
  digitalWrite(LEDV, LOW);
  digitalWrite(LEDR, LOW);
  Serial.begin(115200);

  // ------------------------------------- //
  // ------------- Connection -------------//
  // ------------------------------------- //
  WiFi.begin(ssid, password);
  Serial.print("Connexion au Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnecté au Wi-Fi !");
  client.setInsecure();

  // ------------------------------------- //
  // ---------------- RFID ----------------//
  // ------------------------------------- //
  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println(F("Performing RFID self-test..."));
  if (!mfrc522.PCD_PerformSelfTest()) {
    Serial.println(F("RFID Module DEFECT or UNKNOWN"));
    digitalWrite(LEDR, HIGH);
    while (true)
      ;
  }
  Serial.println(F("RFID Module OK"));

  // ------------------------------------- //
  // -------------- Fonction --------------//
  // ------------------------------------- //

  Serial.println("Get time...");
  updateTime();
  Serial.println("Get JWT token...");
  getTokenJWT();
  Serial.println("-----------------------------------------");
  Serial.println("-----------------------------------------");
  clear();
}

void loop() {
  time_t elapsedSeconds = (millis() - lastMillis) / 1000;
  time_t adjustedTime = currentTime + elapsedSeconds;
  if (adjustedTime > expToken){
    Serial.println(String(adjustedTime) + ">" + String(expToken));
    msg("Please wait");
    getTokenJWT();
    clear();
  }

  // Test if card is detect
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) return;

  // Read UID
  String uidString = "";
  for (int i = 0; i < mfrc522.uid.size; i++) {
    uidString += (mfrc522.uid.uidByte[i] < 0x10 ? "0" : "") + String(mfrc522.uid.uidByte[i], HEX);
  }
  uidString.toUpperCase();

  // -------------------------------------- //
  // ----------- Envoi HTTP POST -----------//
  // -------------------------------------- //
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi non connecté !");
    digitalWrite(LEDR, HIGH);
    String message = "Error WIFI";
    msg(message);
    delay(1500);
    clear();
    digitalWrite(LEDR, LOW);
    return;
  }

  HTTPClient http;
  http.begin(client, serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + jwtToken);

  StaticJsonDocument<200> jsonDoc;
  jsonDoc["badge_id"] = uidString;
  String jsonString;
  serializeJson(jsonDoc, jsonString);
  //Serial.println("Données envoyées : " + jsonString);

  int httpResponseCode = http.POST(jsonString);
  //Serial.print("Réponse HTTP: ");
  //Serial.println(httpResponseCode);

  if (httpResponseCode <= 0) {
    Serial.println("Erreur d'envoi de la requête !");
    http.end();
    digitalWrite(LEDR, HIGH);
    String message = "Error envoi";
    msg(message);
    delay(1500);
    clear();
    digitalWrite(LEDR, LOW);
    return;
  }

  String response = http.getString();
  //Serial.print("Réponse du serveur: ");
  //Serial.println(response);

  // --------------------------------------- //
  // --------- Traitement des données -------//
  // --------------------------------------- //
  StaticJsonDocument<200> jsonResponse;
  DeserializationError error = deserializeJson(jsonResponse, response);
  http.end();
  
  if (error) {
    Serial.println("Erreur de parsing JSON !");
    digitalWrite(LEDR, HIGH);
    String message = "Error JSON";
    msg(message);
    delay(1500);
    clear();
    digitalWrite(LEDR, LOW);
    return;
  }

  if (String(jsonResponse["error"]) == "Badge introuvable") {
    Serial.println("Badge rejeté !");
    Serial.println("-----------------------------------------");
    String message = "Unauthorize !";
    int textWidth = message.length() * 6; // Chaque caractère est de 6 pixels de large
    int cursorX = (SCREEN_WIDTH - textWidth) / 2; // Centrer le texte
    display.setCursor(cursorX, 20); // Déplacer le curseur à la position calculée
    display.println(message); // Afficher le texte
    display.display();
    digitalWrite(LEDR, HIGH);
    delay(1500);
    digitalWrite(LEDR, LOW);
    clear();
    return;
  }
  
  String nom = (jsonResponse["name"]);
  String niveau = (jsonResponse["level"]);
  String message = "Hello "+ nom;
  int textWidth = message.length() * 6; // Chaque caractère est de 6 pixels de large
  int cursorX = (SCREEN_WIDTH - textWidth) / 2; // Centrer le texte
  display.setCursor(cursorX, 20); // Déplacer le curseur à la position calculée
  display.println(message); // Afficher le texte
  display.display();
  Serial.print("Bienvenu ");
  Serial.print(nom);
  Serial.println(" !");
  Serial.print("Vous êtes de niveau ");
  Serial.println(niveau);
  Serial.println("-----------------------------------------");
  digitalWrite(LEDV, HIGH);
  delay(2000);
  digitalWrite(LEDV, LOW);
  clear();
}

void clear(){
  display.clearDisplay();
  display.display();
}

void msg(String message){
  int textWidth = message.length() * 6; // Chaque caractère est de 6 pixels de large
  int cursorX = (SCREEN_WIDTH - textWidth) / 2; // Centrer le texte
  display.setCursor(cursorX, 20); // Déplacer le curseur à la position calculée
  display.println(message); // Afficher le texte
  display.display();
}

void updateTime() {
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        Serial.println("Erreur de récupération de l'heure !");
        return;
    }
    currentTime = mktime(&timeinfo);
    lastMillis = millis();
}

void getTokenJWT() {
  HTTPClient http;
  http.begin(client, serverLogin);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> jsonDoc;
  jsonDoc["username"] = "admin";
  jsonDoc["password"] = "admin123";
  String jsonString;
  serializeJson(jsonDoc, jsonString);

  int httpResponseCode = http.POST(jsonString);
  //Serial.print("Réponse HTTP (login) : ");
  //Serial.println(httpResponseCode);

  if (httpResponseCode != 200) {
    Serial.println(http.getString());
    http.end();
    return;
  }

  String response = http.getString();
  http.end();

  StaticJsonDocument<512> resDoc;
  DeserializationError error = deserializeJson(resDoc, response);
  if (error || !resDoc.containsKey("token")) {
    Serial.println("Erreur parsing JSON ou token absent");
    return;
  }

  jwtToken = resDoc["token"].as<String>();

  // --------------------------------------- //
  // -------------- Get exp date ------------//
  // --------------------------------------- //

  String decoded = decodeJWT(jwtToken);
  if (decoded == "") {
    Serial.println("Can't decode JWT Token");
  }
  
  Serial.println("Payload JWT décodé : " + decoded);
  StaticJsonDocument<512> doc;
  DeserializationError jwtError = deserializeJson(doc, decoded);

  if (jwtError) {
    Serial.println("Erreur de parsing JSON !");
  }

  Serial.print("exp date : ");
  Serial.println(doc["exp"].as<String>());
  expToken = doc["exp"].as<int>();

}


// Fonction pour décoder un JWT
String decodeJWT(String jwt) {
    int firstDot = jwt.indexOf('.');
    int secondDot = jwt.indexOf('.', firstDot + 1);

    if (firstDot == -1 || secondDot == -1) {
        Serial.println("JWT invalide !");
        return "";
    }

    String payloadBase64 = jwt.substring(firstDot + 1, secondDot);  // Extraction du payload
    payloadBase64.replace('-', '+');  // Correction Base64URL → Base64
    payloadBase64.replace('_', '/');

    while (payloadBase64.length() % 4 != 0) {
        payloadBase64 += '=';  // Ajout du padding si nécessaire
    }

    String decodedPayload = base64Decode(payloadBase64);  // Décodage Base64
    return decodedPayload;
}

String base64Decode(String input) {
    size_t outputLength;
    uint8_t decoded[512];  // Ajuste la taille selon tes besoins
    int ret = mbedtls_base64_decode(decoded, sizeof(decoded), &outputLength, 
                                    (const unsigned char*)input.c_str(), input.length());

    if (ret != 0) {
        Serial.println("Erreur de décodage Base64 !");
        return "";
    }
    
    return String((char*)decoded);
}