/**
 * Title: Counterproductive
*
 * Created by: Steven Smethurst
 * Created on: 2025-March-30
 *
 * Repo: https://github.com/funvill/counterproductive
 * Project details: https://blog.abluestar.com/projects/2025-counterproductive/ 
 * 
 * 
 */

static const String VERSION = "Ver 2";  // Version

// Pins
// ------------------------------------------------------
static const int PIN_BUTTON = 22;     // D4
static const int PIN_MATRIX_CS = 23;  // D5

// Global
// ------------------------------------------------------
static int g_counter = 0;
static boolean g_wait_for_mqtt_recv = true; 

// Button Debounce
// ------------------------------------------------------
// Variables will change:
int ledState = HIGH;        // the current state of the output pin
int buttonState;            // the current reading from the input pin
int lastButtonState = LOW;  // the previous reading from the input pin

// the following variables are unsigned longs because the time, measured in
// milliseconds, will quickly become a bigger number than can be stored in an int.
unsigned long lastDebounceTime = 0;  // the last time the output pin was toggled
unsigned long debounceDelay = 50;    // the debounce time; increase if the output flickers

// LED Matrix
// ------------------------------------------------------
// MD_Parola library
// MD_MAX72XX library can be found at https://github.com/MajicDesigns/MD_MAX72XX
#include <MD_Parola.h>
#include <MD_MAX72xx.h>
#include <SPI.h>

// Define the number of devices we have in the chain and the hardware interface
// NOTE: These pin numbers will probably not work with your hardware and may
// need to be adapted
#define HARDWARE_TYPE MD_MAX72XX::FC16_HW

#define MAX_DEVICES 4

// Hardware SPI connection
MD_Parola ledMatrix = MD_Parola(HARDWARE_TYPE, PIN_MATRIX_CS, MAX_DEVICES);

// Wifi & MQTT
// -----------------------------------------------------
#if defined(ESP8266)
#include <ESP8266WiFi.h>  //ESP8266 Core WiFi Library
#else
#include <WiFi.h>  //ESP32 Core WiFi Library
#endif

#include <WiFiClient.h>
#include <PubSubClient.h>

WiFiClient espClient;
PubSubClient client(espClient);


#include "settings.h"


// Update these with values suitable for your network.
// const char* SETTING_WIFI_SSID = "your_wifi_name";
// const char* SETTING_WIFI_PASSWORD = "your_wifi_password";
// const char* SETTING_WIFI_MQTT_SERVER_HOST = "<your_cluster_url>";
// const int SETTING_WIFI_MQTT_SERVER_PORT = 8883;
// const char* SETTING_WIFI_MQTT_USERNAME = "";
// const char* SETTING_WIFI_MQTT_PASSWORD = "";
// const char* SETTING_WIFI_MQTT_TOPIC_COUNT = "CounterProductive/count";
// const char* SETTING_WIFI_MQTT_TOPIC_BIRTH = "CounterProductive/birth";


void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    ledMatrix.print("W rec");
    Serial.print("Attempting MQTT connection...");
    // Attempt to connect
    if (client.connect("arduinoClient")) {
      Serial.println("connected");
      // Once connected, publish an announcement...
      client.publish(SETTING_WIFI_MQTT_TOPIC_BIRTH, "I am alive");
      // ... and resubscribe
      client.subscribe(SETTING_WIFI_MQTT_TOPIC_COUNT);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      // Wait 5 seconds before retrying
      delay(5000);
    }
  }
}



void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();

  // look for the SETTING_WIFI_MQTT_TOPIC_COUNT topic
  if (String(topic) == SETTING_WIFI_MQTT_TOPIC_COUNT) {
    // Convert the payload to a string
    String message = String((char*)payload).substring(0, length);
    // Convert the string to an integer
    g_counter = message.toInt();
    Serial.print("MQTT Recv g_counter: ");
    Serial.println(g_counter);
    ledMatrix.print(g_counter);

    g_wait_for_mqtt_recv = false; // We got the first recive.
  }
}
















// the setup function runs once when you press reset or power the board
void setup() {
  delay(500);
  // When opening the Serial Monitor, select 9600 Baud
  Serial.begin(9600);
  delay(500);

  // initialize digital pin LED_BUILTIN as an output.
  pinMode(LED_BUILTIN, OUTPUT);

  // Button
  pinMode(PIN_BUTTON, INPUT_PULLUP);

  // set initial LED state
  digitalWrite(LED_BUILTIN, ledState);

  // LED maxtrix
  ledMatrix.begin();          // initialize the object
  ledMatrix.setIntensity(0);  // set the brightness of the LED matrix display (from 0 to 15)
  ledMatrix.displayClear();   // clear led matrix display
  ledMatrix.setTextAlignment(PA_RIGHT);

  // Print version
  ledMatrix.print(VERSION);
  delay(1000 * 3);


  // WIFI
  ledMatrix.print("W0");
  // connecting to a WiFi network
  WiFi.begin(SETTING_WIFI_SSID, SETTING_WIFI_PASSWORD);
  static int wifiAttempts = 0 ; 
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    wifiAttempts++;
    Serial.print("Connecting to WiFi.. attempt: ");
    Serial.println(wifiAttempts);
  }
  

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  //connecting to a mqtt broker
  client.setServer(SETTING_WIFI_MQTT_SERVER_HOST, SETTING_WIFI_MQTT_SERVER_PORT);
  client.setCallback(callback);

  // ToDo: Get the current number from the internet
  ledMatrix.print("0");  //
}

void UpdateCounter(int count) {
  if(g_wait_for_mqtt_recv)  {
    // We are waiting for the first recive before we can change the count
    return; 
  }

  // String text = g_counter;
  ledMatrix.print(count);

  // Send MQTT message
  Serial.println("");
  Serial.print("MQTT Send g_counter=");
  Serial.println(count);
  String message = String(count);
  const boolean retain = true; 
  client.publish(SETTING_WIFI_MQTT_TOPIC_COUNT, message.c_str(), retain);
  
}


void CheckButton() {
  if(g_wait_for_mqtt_recv) {
    // Don't bother until we get the first recive
    return ;    
  }
  // read the state of the switch into a local variable:
  int reading = digitalRead(PIN_BUTTON);


  // check to see if you just pressed the button
  // (i.e. the input went from LOW to HIGH), and you've waited long enough
  // since the last press to ignore any noise:

  // If the switch changed, due to noise or pressing:
  if (reading != lastButtonState) {
    // reset the debouncing timer
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    // whatever the reading is at, it's been there for longer than the debounce
    // delay, so take it as the actual current state:

    // if the button state has changed:
    if (reading != buttonState) {
      buttonState = reading;

      // only toggle the LED if the new button state is HIGH
      if (buttonState == HIGH) {
        ledState = !ledState;

        // Incrmenmt the counter
        g_counter++;

        // print the results to the Serial Monitor:
        Serial.println("");
        Serial.print("Button pressed. g_counter: ");
        Serial.println(g_counter);

        // Update screen and MQTT        
        UpdateCounter(g_counter);
      }
    }
  }
  // set the LED:
  // digitalWrite(LED_BUILTIN, ledState);

  // save the reading. Next time through the loop, it'll be the lastButtonState:
  lastButtonState = reading;
}


// the loop function runs over and over again forever
void loop() {

  if (!client.connected()) {
    reconnect();
  }
  client.loop();


  // Button
  CheckButton();

  // LED
  unsigned long currentMillis = millis();

  // Status button
  static long builtInLEDTimer = 0;
  if (currentMillis >= builtInLEDTimer + 1000) {
    // save the last time you blinked the LED
    builtInLEDTimer = currentMillis;
    ledState = !ledState;
    digitalWrite(LED_BUILTIN, ledState);

    // print the results to the Serial Monitor:
    Serial.print(".");
  }
}
