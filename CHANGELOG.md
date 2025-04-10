# CHANGE LOG

## Version 5 (2025-April-08)

- Only do a heatbeat once every 15 mins instead once a mins. Improve battery life.
- When the button is pressed, it instantly changes to the button count.

## Version 4 (2025-April-01)

- Added a hearbeat to send the remaining time to the MQTT server once a min
- Added a call to action, telling people to push the button
- Added a thank you message when people press the button
- Changed the big button from Red (Danger) to Green (Alive)
- Removed birth MQTT publish, and replaced it with hearbeat
- Replaced zipties with metal bolts for securing it to the fence
- Added death sequence for when the timer runs out
