# Counter-Productive

This is an art project and a social experiment. A big red button is installed in a park with a LED Maxtrix.

The project is over when the counter reaches zero. The counter is reset if someone presses the button (to 24 hours). To keep the project alive people must keep press the button every day.

To see how long this project survives and how people interact with the button. Will they keep pressing the button to keep this project alive? Will they destroy the button? What kind of people press the button? What kind of people don't.

This [repo](https://github.com/funvill/counterproductive) contains the source code files for the **CounterProductive** project.

- See the [CounterProductive Project Page](https://blog.abluestar.com/projects/2025-counterproductive/) for more information about this project.
- See the [CounterProductive Live Stats](https://blog.abluestar.com/other/counterproductive.html) for the current live status of this project and its history.

## Printed Project instructions

**Instructions:**

- Press the button to reset the 24-hour countdown timer.
- If the timer ever reaches zero, the project ends and will be removed.
- To keep the project alive — press the button

## LED Matrix prompts

This is the text that appears on the LED matrix at the different states of the counterproductiuve button.

The LED matrix has a limited amount of text that can be displayed at any given time. Aproxmitly 7 letters. Larger texts can  scroll across the matrix.

### Start up

The following text is displayed on the LED Matrix when the device is power cycled.

1) First it prints the hardware version (`Ver 4`).

2) Then prints the Wifi state. `W0`: Start up, `W rec`: Reconnect

3) Then `Wait` after all the setup is done, while it waits for the MQTT connection to get the current button press.

**Example:**

```txt
Ver 4
W0
W rec
Wait
```

### Main / Idle

This is the main state of the counterproductiuve button. This text continuliously scrolls across the LED Matrix.

The time in the `Time Remaining` line gets cut off as the LED Matrix can only show 7 letters and the time is 8 letters long `3:59:59` is shown for `24:59:59`

**Example:**

```txt
Time Remaining: 23:59:59
Keep me Alive - Press the Button
```

### Button press

This state is entered if someone presses the button. The first number (eg. `600`) is how many times the button has been pressed in total.

**Example:**

```txt
#600      Thank you for keeping me alive
```

### Death

This state is entered and locked if the counter ever reachs zero. To unlock this state the device needs to be restarted.

**Example:**

```txt
GAME OVER. I have died
```

## Tech Stack

- [XIAO ESP32-C6](https://wiki.seeedstudio.com/xiao_esp32c6_getting_started/) - Microcontroller
- [Arduino](https://www.arduino.cc/) firmware - I was being lasy and just wanted to get something up and running.
- [MQTT](https://mqtt.org/) - Online broker
- [NodeJS](https://github.com/funvill/counterproductive/tree/main/loggingApp) - Generates the stats page, and sends it to GIST
- [Github GIST](https://gist.github.com/funvill/95b658729c105829aec9ea0e33cfafdb/) - Stores the stats
