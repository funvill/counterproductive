/**
 * 
 * Subscribe to a MQTT topic. 
 * - if its a count increase, append a output.txt file in the following format 
 *   "2025-04-09T19:02:33-07:00 CounterProductive/count 314"
 * - then generate a new report and send it to Gist 
 */

const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

const generateReport = require('./generateReport');
const sendGist = require('./sendGist');

// Consts 
const MQTT_CLIENT_ID = 'COUNTER_PRODUCTIVE';
const APP_VERSION = '2025May09';

// Load the settings from a JSON file
const SETTINGS_FILE = 'settings.json';
// If the settings file does not exist. Error out and exit
const settingsPath = path.join(__dirname, SETTINGS_FILE);
if (!fs.existsSync(settingsPath)) {
  console.error(`❌ Settings file not found: ${SETTINGS_FILE}`);
  process.exit(1);
}
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

// Debug. 
// Override the settings with debug settings 
// settings.topic = 'test/CounterProductive/count';
// settings.outputFile = 'debug_output.txt';
// settings.reportFileName = 'debug_report.html';
// settings.gistFilename = settings.reportFileName;

// Info 
console.log(`\n\n`);
console.log(`*-------------------------------------------------------------------*`);
console.log(`| CounterProductive MQTT Logger                                     |`);
console.log(`| https://blog.abluestar.com/projects/2025-counterproductive/       |`);
console.log(`| VERSION: ${APP_VERSION}                                                |`);
console.log(`*-------------------------------------------------------------------*`);


const SOUND_REPORT = 1;
function PlaySound(type) {
  if (type == SOUND_REPORT) {

    // Check to see if "sound-play" is installed
    // If not, then we will use the BELL character to make a sound
    try {
      var sound = require('sound-play')
      const filePath = path.join(__dirname, settings.notificationSound);
      sound.play(filePath);
    } catch (error) {
      console.error(`❌ Failed to play sound: ${error}. File: ${filePath}`);
      // Print the BELL character to the console to make a sound instead.
      process.stdout.write('\x07');
    }
  } else {
    process.stdout.write('\x07');
  }
}

async function Start() {

  const args = process.argv.slice(2);
  const command = (args[0] || 'start').toLowerCase();

  console.log(`Command ${command}`);

  switch (command) {
    case 'start':
      // Existing application logic remains unchanged
      break;

    case 'report': {
      const inputFile = args[1] || 'output.txt';
      const outputFile = args[2] || 'report.html';

      if (!fs.existsSync(inputFile)) {
        console.error(`❌ Input file not found: ${inputFile}`);
        process.exit(1);
      }

      const reportHtml = generateReport(inputFile);
      fs.writeFileSync(outputFile, reportHtml);
      console.log(`✅ Report generated and saved to ${outputFile}`);
      process.exit(0);
    }

    case 'send': {
      const reportFilePath = path.join(__dirname, 'report.html');
      const heartbeatFilePath = path.join(__dirname, 'heartbeat.json');

      if (!fs.existsSync(reportFilePath)) {
        console.error(`❌ Report file not found: ${reportFilePath}`);
        process.exit(1);
      }

      if (!fs.existsSync(heartbeatFilePath)) {
        console.error(`❌ Heartbeat file not found: ${heartbeatFilePath}`);
        process.exit(1);
      }

      try {
        const reportResult = await new Promise((resolve, reject) => {
          sendGist(reportFilePath, settings.githubToken, settings.gistId, settings.gistFilename, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
        console.log(`📤 Report Gist updated: ${reportResult.html_url}#file-counterproductive-report-html`);

        // Send the heartbeat file to Gist
        const heartbeatResult = await new Promise((resolve, reject) => {
          sendGist(heartbeatFilePath, settings.githubToken, settings.gistId, 'heartbeat.json', (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
        console.log(`📤 Heartbeat Gist updated: ${heartbeatResult.html_url}#file-heartbeat-json`);
      } catch (error) {
        console.error(`❌ Failed to send files to Gist: ${error}`);
      }

      process.exit(0);
    }

    default:
      console.error(`❌ Unknown command: ${command}`);
      process.exit(1);
  }
}

// Await the Start function before continuing
(async () => {
  await Start();

  // Subscribe to the MQTT topic
  console.log(`Connecting to MQTT broker: ${settings.broker}:${settings.port}`);
  const mqttClient = mqtt.connect(`mqtt://${settings.broker}:${settings.port}`, {
    clientId: MQTT_CLIENT_ID
  });

  mqttClient.on('connect', () => {
    console.log('✅ Connected to MQTT broker');
    mqttClient.subscribe(settings.topic, (err) => {
      if (err) {
        console.error('❌ Failed to subscribe to topic:', err);
      } else {
        console.log(`✅ Subscribed to topic: ${settings.topic}`);
      }
    });
  });

  mqttClient.on('message', (topic, message) => {

    // Check the topic to ensure that its for the count increase
    // Example: CounterProductive/count
    if (topic === settings.topicCount) {
      console.log(''); // Add a line feed because of the heartbeat
      console.log(`📩 Received message on topic: ${topic}, Message: ${message}`);
      OnMessageCountIncrease(topic, message);
      return;
    } else if (topic === settings.topicHeartbeat) {
      OnMessageHeartBeat(topic, message);
      return;
    } else {
      console.log(`Received message on different topic: ${topic}`);
      return;
    }
  });
})();

// Convert date to string with timezone offset
// Example: 2025-04-09T19:02:33-07:00
function DateTimeToString(date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const offsetHours = Math.abs(date.getTimezoneOffset() / 60);
  const offsetMinutes = Math.abs(date.getTimezoneOffset() % 60);
  const offsetSign = date.getTimezoneOffset() < 0 ? '+' : '-';

  const msLocal = date.getTime() - offsetMs;
  const dateLocal = new Date(msLocal);
  const iso = dateLocal.toISOString();
  const isoLocal = iso.slice(0, 19);
  return isoLocal + offsetSign + String(offsetHours).padStart(2, '0') + ':' + String(offsetMinutes).padStart(2, '0');
}

function OnMessageCountIncrease(topic, message) {

  // output to the output file
  const now = new Date()
  const dateString = DateTimeToString(now);

  // String any line feeds or carriage returns
  const messageString = message.toString().replace(/[\r\n]+/g, ' ');

  // Format the output
  // Example: 2025-04-09T19:02:33-07:00 CounterProductive/count 314
  output = `${dateString} ${topic} ${messageString}`;

  // Append the message to output.txt
  fs.appendFile(settings.outputFile, output + "\n", (err) => {
    if (err) {
      console.error(`❌ Failed to write to (${settings.outputFile}): ${err}`);
    } else {
      console.log(`\t✅ Appended log file: ${output}`);

      // Generate a new report 
      const reportHtml = generateReport(settings.outputFile);
      // Save the report to a file
      const reportFilePath = path.join(__dirname, settings.reportFileName);

      // Overwrite the report file
      fs.writeFile(reportFilePath, reportHtml, (err) => {
        if (err) {
          console.error(`❌ Failed to write report file (${settings.reportFileName}): ${err}`);
        } else {
          console.log(`\t✅ Report generated and saved to ${settings.reportFileName}`);

          // Send the report to Gist
          sendGist(reportFilePath, settings.githubToken, settings.gistId, settings.gistFilename, (err, data) => {
            if (err) {
              console.error(`❌ Failed to send report file to Gist: ${err}`);
            } else {
              console.log("\t📤 Gist updated:", data.html_url);

              // Print the BELL character to the console to make a sound
              PlaySound(SOUND_REPORT);
            }
          });
        }
      });
    }
  });
}



var lastHeartbeatSentTimer = 0;
// We do not want this message to be noisy. So we silence it unless there is an error
function OnMessageHeartBeat(topic, message) {
  // console.log(`\t❤️ Received heartbeat: ${message}`);

  // Github Gist rate limit is 60 requests per hour
  // We don't want the heatbeat to send too many requests so that the report can not be sent.
  // The average report is sent once every 2 hours, but there are exceptions where the users have pressed 
  // the button multiple times in a row.
  // So we only want to send the heartbeat once every 5 minutes. (12 times an hour)
  const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

  const currentTime = new Date().getTime();
  const timeSinceLastHeartbeat = currentTime - lastHeartbeatSentTimer;
  if (timeSinceLastHeartbeat < HEARTBEAT_INTERVAL) {
    // Don't send the heartbeat, its too soon
    process.stdout.write('🩶');
    return;
  }
  lastHeartbeatSentTimer = currentTime;

  // Write the heartbeat to a file
  // Send the heartbeat to Gist

  const heatbeatFileName = 'heartbeat.json';
  const heartbeatFilePath = path.join(__dirname, heatbeatFileName);

  // The message format is time remaining on display 23:59:59
  const heartbeatData = {
    timeRemaining: message.toString()
  }

  // Overwrite the heartbeat.json with this message
  fs.writeFile(heartbeatFilePath, JSON.stringify(heartbeatData), (err) => {
    if (err) {
      console.log(`\t❤️ Received heartbeat: ${message}`);
      console.error(`❌ Failed to write heartbeat file (${heartbeatFilePath}): ${err}`);
    } else {
      // Send to Gist
      sendGist(heartbeatFilePath, settings.githubToken, settings.gistId, heatbeatFileName, (err) => {
        if (err) {
          console.log(`\t❤️ Received heartbeat: ${message}`);
          console.log(`\t✅ Heartbeat file updated: ${heatbeatFileName}`);
          console.error(`❌ Failed to send heartbeat file to Gist: ${err}`);
        } else {
          // Update the console with a heart without line feed
          process.stdout.write('❤️');
        }
      });
    }
  });
}
