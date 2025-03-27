#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>

#define RST_PIN 3
#define SS_PIN 20
#define LEDV 21
#define LEDR 7

MFRC522 mfrc522(SS_PIN, RST_PIN);

void setup() {
  pinMode(LEDV, OUTPUT);
  pinMode(LEDR, OUTPUT);
  digitalWrite(LEDV, LOW);
  digitalWrite(LEDR, LOW);
  Serial.begin(115200);
  SPI.begin(); // Init SPI bus
  mfrc522.PCD_Init(); // Init MFRC522 card

  Serial.println(F("Performing test..."));
  bool result = mfrc522.PCD_PerformSelfTest();
  Serial.print(F("Result: "));
  delay(500);

  if (result) {
    Serial.println(F("OK"));
    for (int i = 0; i < 2; i++) {
      digitalWrite(LEDV, HIGH);
      delay(500);
      digitalWrite(LEDV, LOW);
      delay(500);
    }
  } else {
    Serial.println(F("DEFECT or UNKNOWN"));
    digitalWrite(LEDR, HIGH);
    return;
  }
  Serial.println();
}

void loop() {
  // Si aucune nouvelle carte détectée, on sort du loop
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  // Si l'UID de la carte ne peut pas être lu, on sort du loop
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Affichage des infos de la carte
  Serial.print(F("Carte détectée ! UID : "));
  String uidString = "";  // Variable pour stocker le UID

  for (int i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
        uidString += "0";  // Ajoute un 0 devant si chiffre < 0x10 (format hexadécimal)
    }
    uidString += String(mfrc522.uid.uidByte[i], HEX);  // Convertit en HEX et ajoute
  }

  uidString.toUpperCase();  // Mettre en majuscules (optionnel)
  Serial.println(uidString);

  if(uidString == "6305160C"){
    digitalWrite(LEDV, HIGH);
  }
  else{
    digitalWrite(LEDR, HIGH);
  }

  // Met la carte en veille pour éviter de lire plusieurs fois la même
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();

  delay(500);
  digitalWrite(LEDV, LOW);
  digitalWrite(LEDR, LOW);
}