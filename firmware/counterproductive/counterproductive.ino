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

static const String VERSION = "Ver 1"; // Version

// Pins
// ------------------------------------------------------
static const int PIN_BUTTON = 22;     // D4
static const int PIN_MATRIX_CS = 23;  // D5


//

// Global
// ------------------------------------------------------
static int g_counter = 0;

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


// LED Blin
// Generally, you should use "unsigned long" for variables that hold time
// The value will quickly become too large for an int to store
unsigned long ledPreviousMillis = 0;  // will store last time LED was updated
// constants won't change:
const long ledInterval = 1000;  // interval at which to blink (milliseconds)

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





// the setup function runs once when you press reset or power the board
void setup() {
  // initialize serial communications at 9600 bps:
  Serial.begin(9600);

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
  delay(1000*3);

  // ToDo: Get the current number from the internet
  ledMatrix.print("0"); // 
}


void CheckButton() {
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
        Serial.print("Button pressed. g_counter: ");
        Serial.println(g_counter);

        // String text = g_counter;
        ledMatrix.print(g_counter);

        // ToDo Push to the internet
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
  CheckButton();

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
