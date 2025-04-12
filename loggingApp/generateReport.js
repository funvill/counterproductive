/**
 * Log Analyzer → HTML Report Generator
 * Converts a time-series log into a styled HTML report.
 * Version: 2025-Apr-11
 */

const fs = require('fs');

// Helper function to format dates as MMM-DD in local time
// There is a whole bunch of fuckery here, because of timezones and date formating.
//
// All of these should produce the same results
// console.log('formatDateMMMDD:', formatDateMMMDD(new Date('2025-04-01T23:02:48-0700')));
// console.log('formatDateMMMDD:', formatDateMMMDD('2025-04-01'));
// console.log('formatDateMMMDD:', formatDateMMMDD('2025-04-01T00:00:00.000Z'));
const formatDateMMMDD = (dateInput) => {
  let date;
  if (typeof dateInput === 'string') {
    if (dateInput.includes('T')) {
      // Parse ISO string and adjust to local time
      const [year, month, day] = dateInput.split('T')[0].split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      // Handle date strings without time as local dates
      const [year, month, day] = dateInput.split('-').map(Number);
      date = new Date(year, month - 1, day);
    }
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    throw new Error('Invalid date input. Must be a string or Date object.');
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
};

// Helper function to format date and time in local time
const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'america/vancouver' });
};

// Extracted the HTML template into a separate function for better readability and maintainability
const generateHTMLTemplate = (stats, entries, filteredEntries) => {
  return `
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: auto; }
      h1 { color: #333; }
      .stat { margin-bottom: 1em; }
      code { background: #eee; padding: 2px 4px; border-radius: 4px; }
      div.stat { margin: 0; padding: 0; }
      .gap-visualization { display: flex; flex-wrap: nowrap; overflow-x: auto; margin-top: 20px; }
      .gap-box { display: inline-block; margin-right: 2px; text-align: center; font-size: 10px; color: #fff; background-color: #007bff; border-radius: 4px; overflow: hidden; }
      .gap-box span { display: block; padding: 2px; }
      .gap-visualization {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
    .day-row {
      display: flex;
      align-items: center;
    }
    .day-row.weekend {
      background-color: #f0f0f0; /* Light gray background for weekends */
    }
    .day-label {
      width: 150px; /* Increased width to accommodate day of the week */
      font-weight: bold;
      font-size: larger;
      text-align: right;
      padding-right: 5px;
      font-family: monospace;
    }
    .day-boxes {
      display: flex;
      flex-wrap: nowrap;
      gap: 2px;
      flex-grow: 1;
    }
    .day-total {
      width: 100px;
      font-weight: bold;
      text-align: right;
      padding-left: 5px;
    }

    .day-total-hot {
      color: rgb(248, 68, 40);
    }
    .hour-box {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      text-align: center;
      line-height: 20px;
      font-size: 10px;
      color: #fff;
      margin: 0; /* Ensure no extra margin */
      padding: 0; /* Ensure no extra padding */
      box-sizing: border-box; /* Include border in width/height */
    }
    .hour-box.gap {
      background-color:rgb(101, 175, 253);
    }
    .hour-box.pressed {
      background-color: #28a745;
    }
    .hour-box.hotButtonPressing {
      background-color:rgb(248, 68, 40);
    }
    .hour-box.header {
      background-color: #ffffff;
      color: #000;
      font-weight: bold;
      border: 1px solid #ccc;
      width: 20px; /* Match the width of regular boxes */
      height: 20px; /* Match the height of regular boxes */
      line-height: 20px; /* Match the vertical alignment */
      text-align: center;
      margin: 0; /* Ensure no extra margin */
      padding: 0; /* Ensure no extra padding */
      box-sizing: border-box; /* Include border in width/height */
    }
    #LastUpdated {
      display: none;
    }
    .stat ul {
      margin: 0 0 1em 0; /* Remove margin */
    }
    .stat ol {
      margin: 0 0 1em 0; /* Remove margin */
    }

    </style>
  <h1>📊 CounterProductive Log Report</h1>

  <div class="stats">
  <div class="stat">🔘 The button has been pressed <strong>${stats.lastCount}</strong> times, last pressed <span id='timeSinceLastSpan'><i>calculating...</i></span> ago</div>
  <div class="stat">😟 Time remaining to keep this project alive: <span id='timeRemainingSpan'><i>calculating...</i></span></div>
  <div class="stat">🗓️ Last button press: <strong>${formatDateTime(entries[entries.length - 1].timestamp)}</strong></div>
  <div class="stat">⏳ Project has been running for: <strong>${stats.totalDays} days</strong></div>

  <div>&nbsp;</div>
  <div class="stat">📊 Total rapid button presses (gap < 30 seconds): <strong>${stats.rapidPressCount}</strong> (${((stats.rapidPressCount / stats.lastCount) * 100).toFixed(2)}%)</div>
  <div class="stat">📊 Most rapid button presses in a single session: <strong>${stats.longestRapidSession}</strong> on <strong>${formatDateMMMDD(stats.longestRapidSessionDate)}</strong></div>
  <div>&nbsp;</div>

  <div class="note">📎 Note: Rapid button presses occurring within a 30-second interval significantly affect the statistics. <br />The following statistics combine rapid button presses into a single button press event.</div>
  <div>&nbsp;</div>

  <div class="stat">📈 Average button presses per day: <strong>${stats.averagePerDay}</strong> (${stats.filteredEntries.length} entries over ${stats.totalDays} days)</div>
  <div class="stat">🕒 Top 3 Longest gaps between button presses:
    <ol>
      ${stats.topGaps.map(gap => `<li><strong>${Math.floor(gap.gap / 3600)}h ${Math.floor((gap.gap % 3600) / 60)}m</strong> between <code>${formatDateTime(gap.start)} → ${formatDateTime(gap.end)}</code></li>`).join('')}
    </ol>
  </div>
  <div class="stat">⏳ Average length between button presses: <strong>${stats.formattedAvgGap}</strong></div>
  <div class="stat">⏳ <span title="The median is the middle value in a sorted list of numbers. It represents the point where half the values are smaller and half are larger.">Median</span> length between button presses: 
      <strong>${Math.floor(stats.medianGap / 3600)}h ${Math.floor((stats.medianGap % 3600) / 60)}m ${Math.floor(stats.medianGap % 60)}s</strong>
  </div>
  <div class="stat">📅 Most active day:
      ${stats.topDateCounts.map(([d, c]) => `<strong>${formatDateMMMDD(d)}</strong> with <strong>${c}</strong> button presses`).join('\n')}  
  </div>
  <div class="stat">📊 The most presses in a single hour of a day: <strong>${stats.maxPressesInHour}</strong> presses in the <strong>${stats.maxPressesHour}:00</strong> on <strong>${formatDateMMMDD(stats.maxPressesDate)}</strong></div>
  <div class="stat">⏰ Most popular hour of the day: <strong>${stats.mostFreqHour}:00</strong> (${stats.freqCount} button presses)</div>
  <div class="stat">📅 Button presses by day of the week:

  ${stats.dayOfWeekStats.map(dayStat => `
          <div class="day-row">
            <div class="day-label">${dayStat.day}:</div>
            <div class="day-boxes">
              ${'🟩'.repeat(Math.round(dayStat.percentage / 5))}
              ${'▪️'.repeat(Math.round((100 - dayStat.percentage) / 5))}
            </div>
            <div class="day-total header"><strong>${dayStat.count}</strong> (${dayStat.percentage}%)</div>
          </div>
        `).join('')}
        <div>&nbsp;</div>
  </div>

  <!-- Weekday vs Weekend Activity--->
  <div class="stat">📊 Weekday vs Weekend Activity:</div> 
    <div class="day-row">
      <div class="day-label" title='Monday - Friday'>🏢 Weekdays:</div>
      <div class="day-boxes">
        ${'🟩'.repeat(Math.round(stats.weekdayPercentage / 5))}
        ${'▪️'.repeat(Math.round((100 - stats.weekdayPercentage) / 5))}
      </div>
      <div class="day-total header"><strong>${stats.weekdayCount}</strong> (${stats.weekdayPercentage}%)</div>
    </div>
    <div class="day-row">
      <div class="day-label" title='Saturday, and Sunday'>🏖️ Weekends:</div>
      <div class="day-boxes">
        ${'🟩'.repeat(Math.round(stats.weekendPercentage / 5))}        
        ${'▪️'.repeat(Math.round((100 - stats.weekendPercentage) / 5))}
      </div>
      <div class="day-total header"><strong>${stats.weekendCount}</strong> (${stats.weekendPercentage}%)</div>
    </div>
    <div>&nbsp;</div>
  </div>

  <div class="stat">⏳ Activity by time of day:
      <div class="day-row">
        <div class="day-label"><span title='Morning: 00:00am - 07:59am'>🌅 Morning</span>:</div>
        <div class="day-boxes">
          ${'🟩'.repeat(Math.round(stats.timeChunksStats.morning.percentage / 5))}
          ${'▪️'.repeat(Math.round((100 - stats.timeChunksStats.morning.percentage) / 5))}
        </div>
        <div class="day-total header"><strong>${stats.timeChunksStats.morning.count}</strong> (${stats.timeChunksStats.morning.percentage}%)</div>
      </div>

      <div class="day-row">
        <div class="day-label"><span title='Daytime: 08:00am - 16:59pm'>🌞 Daytime</span>:</div>
        <div class="day-boxes">
          ${'🟩'.repeat(Math.round(stats.timeChunksStats.daytime.percentage / 5))}
          ${'▪️'.repeat(Math.round((100 - stats.timeChunksStats.daytime.percentage) / 5))}
        </div>
        <div class="day-total header"><strong>${stats.timeChunksStats.daytime.count}</strong> (${stats.timeChunksStats.daytime.percentage}%)</div>
      </div>   

      <div class="day-row">
        <div class="day-label"><span title='Evening: 17:00pm - 23:59pm'>🌙 Evening</span>:</div>
        <div class="day-boxes">
          ${'🟩'.repeat(Math.round(stats.timeChunksStats.evening.percentage / 5))}
          ${'▪️'.repeat(Math.round((100 - stats.timeChunksStats.evening.percentage) / 5))}
        </div>
        <div class="day-total header"><strong>${stats.timeChunksStats.evening.count}</strong> (${stats.timeChunksStats.evening.percentage}%)</div>
      </div>
      <div>&nbsp;</div>
    </div>

  <h2>📅 Day Visualization</h2>
  <div class="gap-visualization">
    <!-- Add hour labels as the top row -->
    <div class="day-row">
      <div class="day-label">Hour</div>
      <div class="day-boxes">
        ${Array.from({ length: 24 }).map((_, hour) => `
          <div class="hour-box header" title="Hour ${hour}:00">${hour}</div>
        `).join('')}
      </div>
      <div class="day-total header">Total</div> <!-- Header for the total column -->
    </div>

    ${[...new Set(filteredEntries.map(e => e.date))]
      .sort((a, b) => new Date(b) - new Date(a)) // Sort dates in descending order
      .map(date => {

        // There is a bug here where the date is always one day behind
        // This is because the date is being set to midnight UTC, which is 7 hours behind
        // the local time in Vancouver (PST/PDT)
        // Push the date ahead one day to get the next date
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);


        const dailyEntries = entries.filter(e => e.date === date);
        const totalEntries = dailyEntries.length; // Calculate total entries for the day
        const totalEntriesHot = totalEntries >= 10;
        const dayOfWeek = new Date(nextDate).toLocaleDateString('en-US', { weekday: 'short' }); // Get three-letter day of the week
        const isWeekend = dayOfWeek === 'Sat' || dayOfWeek === 'Sun'; // Check if the day is a weekend

        return `
          <div class="day-row ${isWeekend ? 'weekend' : ''}">
            <div class="day-label">${isWeekend ? '🏖️ ' : ''}${formatDateMMMDD(nextDate)} (${dayOfWeek})</div>
            <div class="day-boxes">
              ${Array.from({ length: 24 }).map((_, hour) => {
          const hourEntries = dailyEntries.filter(e => e.hour === hour);
          const isPressed = hourEntries.length > 0;
          const isHot = hourEntries.length >= 10;
          const tooltip = isPressed
            ? `Pressed ${hourEntries.length} times. ` + hourEntries.map(e => `${e.timestamp.toLocaleTimeString()} (#${e.count})`).join(', ')
            : `No presses during ${hour}:00 - ${hour + 1}:00`;

          return `
                  <div class="hour-box ${isPressed ? 'pressed' : 'gap'} ${isHot ? 'hotButtonPressing' : ''}" title="${tooltip}">
                    ${isPressed ? hourEntries.length : ''}
                  </div>
                `;
        }).join('')}
            </div>
            <div class="day-total ${totalEntriesHot ? 'day-total-hot' : ''}">${totalEntries}</div> <!-- Total entries for the day -->
          </div>
        `;
      }).join('')}
  </div>

  <div style='text-align: center'><p>Generated on: <strong>${formatDateTime(new Date())}</strong></p></div>
  </div> <!-- End of stats div -->

  <span id='LastUpdated'>${entries[entries.length - 1].timestamp.toLocaleString()}</span>
  `;
};

// Add a new stat to calculate events in 8-hour chunks
const calculateTimeChunksStats = (filteredEntries) => {
  const timeChunks = { morning: 0, daytime: 0, evening: 0 };

  filteredEntries.forEach(e => {
    if (e.hour >= 0 && e.hour <= 7) {
      timeChunks.morning++;
    } else if (e.hour >= 8 && e.hour <= 16) {
      timeChunks.daytime++;
    } else if (e.hour >= 17 && e.hour <= 23) {
      timeChunks.evening++;
    }
  });

  const totalEvents = filteredEntries.length;
  return {
    morning: {
      count: timeChunks.morning,
      percentage: ((timeChunks.morning / totalEvents) * 100).toFixed(2)
    },
    daytime: {
      count: timeChunks.daytime,
      percentage: ((timeChunks.daytime / totalEvents) * 100).toFixed(2)
    },
    evening: {
      count: timeChunks.evening,
      percentage: ((timeChunks.evening / totalEvents) * 100).toFixed(2)
    }
  };
};

// Update the generateStats function to calculate counts and percentages for each day of the week
const generateStats = (entries, filteredEntries) => {


  const uniqueDates = new Set(filteredEntries.map(e => e.date));
  const totalDays = uniqueDates.size;
  const averagePerDay = (filteredEntries.length / totalDays).toFixed(2);
  const lastCount = filteredEntries[filteredEntries.length - 1].count;

  // Most frequent hour
  const hourFreq = {};
  filteredEntries.forEach(e => hourFreq[e.hour] = (hourFreq[e.hour] || 0) + 1);
  const [mostFreqHour, freqCount] = Object.entries(hourFreq).sort((a, b) => b[1] - a[1])[0];

  // Calculate top 3 longest gaps overall
  const topGaps = filteredEntries.slice(1).map((entry, index) => {
    return {
      gap: (entry.timestamp - filteredEntries[index].timestamp) / 1000,
      start: filteredEntries[index].timestamp,
      end: entry.timestamp
    };
  }).sort((a, b) => b.gap - a.gap).slice(0, 3);

  // Top 3 most active days
  const dateFreq = {};
  filteredEntries.forEach(e => dateFreq[e.date] = (dateFreq[e.date] || 0) + 1);
  const topDateCounts = Object.entries(dateFreq).sort((a, b) => b[1] - a[1]).slice(0, 1);

  // Median and average time between updates
  const gaps = filteredEntries.slice(1).map(e => e.timeDiff);
  const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianGap = sortedGaps.length % 2 === 0 ? (sortedGaps[sortedGaps.length / 2 - 1] + sortedGaps[sortedGaps.length / 2]) / 2 : sortedGaps[Math.floor(sortedGaps.length / 2)];

  // Calculate stats for each day of the week
  const dayOfWeekCounts = Array(7).fill(0);
  filteredEntries.forEach(e => {
    const dayOfWeek = e.timestamp.getDay();
    dayOfWeekCounts[dayOfWeek]++;
  });

  const totalPresses = filteredEntries.length;
  const dayOfWeekStats = dayOfWeekCounts.map((count, index) => {
    return {
      day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index],
      count,
      percentage: ((count / totalPresses) * 100).toFixed(2)
    };
  });

  // Compare activity levels on weekdays versus weekends
  const weekdayCount = dayOfWeekCounts.slice(1, 6).reduce((sum, count) => sum + count, 0);
  const weekendCount = dayOfWeekCounts[0] + dayOfWeekCounts[6];
  const weekdayPercentage = ((weekdayCount / totalPresses) * 100).toFixed(2);
  const weekendPercentage = ((weekendCount / totalPresses) * 100).toFixed(2);

  // Calculate the average length between button presses
  const formattedAvgGap = `${Math.floor(avgGap / 3600)}h ${Math.floor((avgGap % 3600) / 60)}m ${Math.floor(avgGap % 60)}s`;

  // Calculate the most presses in a single hour of a day
  let maxPressesInHour = 0;
  let maxPressesHour = null;
  let maxPressesDate = null;
  const hourDayFreq = {};
  filteredEntries.forEach(e => {
    const key = `${e.date}-${e.hour}`;
    if (!hourDayFreq[key]) hourDayFreq[key] = 0;
    hourDayFreq[key]++;
    if (hourDayFreq[key] > maxPressesInHour) {
      maxPressesInHour = hourDayFreq[key];
      maxPressesHour = e.hour;
      maxPressesDate = e.date;
    }
  });

  // Calculate rapid button presses (gap < 30 seconds)
  let rapidPressCount = 152;
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].timeDiff < 30) {
      rapidPressCount++;
    }
  }

  // Calculate the longest session of rapid button presses (gaps < 30 seconds)
  let longestRapidSession = 0;
  let longestRapidSessionDate = null;
  let currentRapidSession = 0;
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].timeDiff < 30) {
      currentRapidSession++;
      if (currentRapidSession > longestRapidSession) {
        longestRapidSession = currentRapidSession;
        longestRapidSessionDate = entries[i].date;
      }
    } else {
      currentRapidSession = 0;
    }
  }

  const timeChunksStats = calculateTimeChunksStats(filteredEntries);

  // Include filteredEntries in the stats object
  return {
    lastCount,
    averagePerDay,
    totalDays,
    mostFreqHour,
    freqCount,
    topGaps,
    topDateCounts,
    avgGap,
    medianGap,
    dayOfWeekStats,
    weekdayCount,
    weekdayPercentage,
    weekendCount,
    weekendPercentage,
    formattedAvgGap,
    maxPressesInHour,
    maxPressesHour,
    maxPressesDate,
    rapidPressCount,
    longestRapidSession,
    longestRapidSessionDate,
    timeChunksStats,
    filteredEntries // Added this property
  };
};


function processLogFile(logFilePath) {

  // Only include lines that start with "2025-", 
  // The other lines are notes and comments.

  // Example of lines from the input file.
  // 2025-04-01T20:02:48-0700 CounterProductive/count 166
  // 2025-04-01T22:19:37-0700 CounterProductive/count 167

  // Note the timestamp includes the GMT offset. "-0700" is Vancouver/BC/Canada

  const lines = fs.readFileSync(logFilePath, 'utf8').split('\n').filter(line => line.startsWith('2025-'));

  const entries = lines.map(line => {
    const [timestamp, topic, countStr] = line.trim().split(/\s+/);

    // This produces a dateobject that is in UTC time
    const dateObj = new Date(timestamp);
    return {
      rawTimestamp: timestamp,
      timestamp: dateObj,
      hour: dateObj.getHours(),
      date: dateObj.toLocaleDateString().split('T')[0],
      time: dateObj.toTimeString().split(' ')[0],
      count: parseInt(countStr, 10)
    };
  });

  // Sort all the entries to ensure that they are in order
  // They should already be sorted, but just incase.
  entries.sort((a, b) => a.timestamp - b.timestamp);

  // Update each entry to find the difference between this one and the previouse one.
  for (let i = 1; i < entries.length; i++) {
    entries[i].timeDiff = (entries[i].timestamp - entries[i - 1].timestamp) / 1000;
  }

  // Because of rapit button presses. 
  // We want to combine entries together that are less then 30 seconds apart. 
  const RAPID_BUTTON_PRESSER_TIMEOUT_SECONDS = 30;
  const filteredEntries = entries.filter((entry, index) => {
    if (index === 0) return true;
    return entries[index].timeDiff >= RAPID_BUTTON_PRESSER_TIMEOUT_SECONDS;
  });

  // We have built the database. 
  return {
    entries,
    filteredEntries
  }
}


const generateReport = (logFilePath) => {

  // Load the database from the file.
  let database = processLogFile(logFilePath);

  // Use the database to generate stats.
  const stats = generateStats(database.entries, database.filteredEntries);

  // Update the HTML template with the stats
  const html = generateHTMLTemplate(stats, database.entries, database.filteredEntries);

  // Return the results as HTML.
  return html;
};

// Export the function for external use
module.exports = generateReport;
