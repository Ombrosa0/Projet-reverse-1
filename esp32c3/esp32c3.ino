#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "RouteurCadeau";
const char* password = "CadeauRouteur";
const char* serverUrl = "https://arduinoooo.lol/badge";  // URL API HTTPS

#define RST_PIN 3
#define SS_PIN 20
#define LEDV 21
#define LEDR 7

MFRC522 mfrc522(SS_PIN, RST_PIN);
WiFiClientSecure client;

void setup() {
  pinMode(LEDV, OUTPUT);
  pinMode(LEDR, OUTPUT);
  digitalWrite(LEDV, LOW);
  digitalWrite(LEDR, LOW);

  Serial.begin(115200);
  WiFi.begin(ssid, password);
  Serial.print("Connexion au Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnecté au Wi-Fi !");

  client.setInsecure();
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
  for (int i = 0; i < 2; i++) {
    digitalWrite(LEDV, HIGH);
    delay(500);
    digitalWrite(LEDV, LOW);
    delay(500);
  }
  Serial.println("-----------------------------------------");
  Serial.println("-----------------------------------------");
}

void loop() {
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) return;

  //Serial.print(F("Carte détectée ! UID : "));
  String uidString = "";
  for (int i = 0; i < mfrc522.uid.size; i++) {
    uidString += (mfrc522.uid.uidByte[i] < 0x10 ? "0" : "") + String(mfrc522.uid.uidByte[i], HEX);
  }
  uidString.toUpperCase();
  //Serial.println(uidString);

  // -------------------------------------- //
  // ----------- Envoi HTTP POST -----------//
  // -------------------------------------- //

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi non connecté !");
    return;
  }

  HTTPClient http;
  http.begin(client, serverUrl);
  http.addHeader("Content-Type", "application/json");

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
    return;
  }

  if (String(jsonResponse["error"]) == "Badge introuvable") {
    Serial.println("Badge rejeté !");
    Serial.println("-----------------------------------------");
    digitalWrite(LEDR, HIGH);
    delay(1500);
    digitalWrite(LEDR, LOW);
    return;
  }
  
  String nom = (jsonResponse["name"]);
  String niveau = (jsonResponse["level"]);
  Serial.print("Bienvenu ");
  Serial.print(nom);
  Serial.println(" !");
  Serial.print("Vous êtes de niveau ");
  Serial.println(niveau);
  Serial.println("-----------------------------------------");
  digitalWrite(LEDV, HIGH);
  delay(1500);
  digitalWrite(LEDV, LOW);
  
}