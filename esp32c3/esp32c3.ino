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

const char* ssid = "RouteurCadeau";
const char* password = "CadeauRouteur";
const char* serverUrl = "https://arduinoooo.lol/badge";  // URL API HTTPS

#define RST_PIN 3
#define SS_PIN 20
#define LEDV 21
#define LEDR 5

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
const char* clearmsg = "";

MFRC522 mfrc522(SS_PIN, RST_PIN);
WiFiClientSecure client;

void setup() {
  // Screen
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;);
  }
  display.clearDisplay();

  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  // Ajouter un texte sous la barre de réseau
  String message = "Setup ESP";
  int textWidth = message.length() * 6; // Chaque caractère est de 6 pixels de large
  int cursorX = (SCREEN_WIDTH - textWidth) / 2; // Centrer le texte
  display.setCursor(cursorX, 20); // Déplacer le curseur à la position calculée
  display.println(message); // Afficher le texte
  display.display();

  pinMode(LEDV, OUTPUT);
  pinMode(LEDR, OUTPUT);
  digitalWrite(LEDV, LOW);
  digitalWrite(LEDR, LOW);

  Serial.begin(115200);

  // Connection
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

  // RFID
  Serial.println(F("Performing RFID self-test..."));
  if (!mfrc522.PCD_PerformSelfTest()) {
    Serial.println(F("RFID Module DEFECT or UNKNOWN"));
    digitalWrite(LEDR, HIGH);
    while (true)
      ;
  }
  Serial.println(F("RFID Module OK"));

  display.println(clearmsg); // Afficher le texte
  display.display();
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
    delay(500);
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
  Serial.print("Réponse HTTP: ");
  Serial.println(httpResponseCode);

  if (httpResponseCode <= 0) {
    Serial.println("Erreur d'envoi de la requête !");
    http.end();
    delay(500);
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
    delay(500);
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
    display.clearDisplay();
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
  delay(1500);
  digitalWrite(LEDV, LOW);
  display.clearDisplay();
}