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
WiFiClientSecure client;  // Utilisation de WiFiClientSecure pour HTTPS

void setup() {
  pinMode(LEDV, OUTPUT);
  pinMode(LEDR, OUTPUT);
  digitalWrite(LEDV, LOW);
  digitalWrite(LEDR, LOW);

  Serial.begin(115200);

  // Connexion au Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connexion au Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnecté au Wi-Fi !");

  // Désactiver la vérification SSL (⚠️ Utile si le certificat est auto-signé)
  client.setInsecure();

  // Initialisation du module RFID
  SPI.begin();
  mfrc522.PCD_Init();

  Serial.println(F("Performing RFID self-test..."));
  if (mfrc522.PCD_PerformSelfTest()) {
    Serial.println(F("RFID Module OK"));
    for (int i = 0; i < 2; i++) {
      digitalWrite(LEDV, HIGH);
      delay(500);
      digitalWrite(LEDV, LOW);
      delay(500);
    }
  } else {
    Serial.println(F("RFID Module DEFECT or UNKNOWN"));
    digitalWrite(LEDR, HIGH);
    while (true);  // Arrête le programme en cas d'échec du test
  }
}

void loop() {
  // Vérifie la présence d'une nouvelle carte
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Lecture et affichage de l'UID
  Serial.print(F("Carte détectée ! UID : "));
  String uidString = "";
  for (int i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      uidString += "0";  
    }
    uidString += String(mfrc522.uid.uidByte[i], HEX);
  }
  uidString.toUpperCase();
  Serial.println(uidString);

  // -------------------------------------- //
  // ----------- Envoi HTTP POST -----------//
  // -------------------------------------- //
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(client, serverUrl);  // Utilisation du client sécurisé
    http.addHeader("Content-Type", "application/json");

    // Création du JSON
    StaticJsonDocument<200> jsonDoc;
    jsonDoc["badge_id"] = uidString;

    String jsonString;
    serializeJson(jsonDoc, jsonString);
    Serial.println("Données envoyées : " + jsonString);

    // Envoi de la requête POST
    int httpResponseCode = http.POST(jsonString);
    Serial.print("Réponse HTTP: ");
    Serial.println(httpResponseCode);

    // Lecture de la réponse du serveur
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Réponse du serveur:");
      Serial.println(response);
    } else {
      Serial.println("Erreur d'envoi de la requête !");
    }

    http.end();
  } else {
    Serial.println("Wi-Fi non connecté !");
  }

  // Vérification de l'UID pour allumer les LEDs
  if (uidString == "6305160C") {
    digitalWrite(LEDV, HIGH);
  } else {
    digitalWrite(LEDR, HIGH);
  }

  // -------------------------------------- //
  // ----------- Nettoyage RFID ------------//
  // -------------------------------------- //
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  digitalWrite(LEDV, LOW);
  digitalWrite(LEDR, LOW);
  delay(500);
}