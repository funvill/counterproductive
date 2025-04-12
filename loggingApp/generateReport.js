/**
 * Log Analyzer → HTML Report Generator
 * Converts a time-series log into a styled HTML report.
 * Version: 2025-Apr-02
 */

const fs = require('fs');

// Helper function to format dates as MMM-DD in local time
const formatDateMMMDD = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'america/vancouver' });
};

// Helper function to format date and time in local time
const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'america/vancouver' });
};

// Main function to generate the report
const generateReport = (logFilePath) => {
  // Read and parse the log
  const lines = fs.readFileSync(logFilePath, 'utf8').split('\n').filter(line => line.startsWith('2025-'));

  // Parse log entries
  const entries = lines.map(line => {
    const [timestamp, topic, countStr] = line.trim().split(/\s+/);
    const dateObj = new Date(timestamp); // Parse the timestamp, including the time zone offset
    return {
      rawTimestamp: timestamp,
      timestamp: dateObj,
      hour: dateObj.getHours(), // Use local hours
      date: dateObj.toLocaleDateString().split('T')[0], // Extract the date in UTC
      time: dateObj.toTimeString().split(' ')[0], // Extract the time in UTC
      count: parseInt(countStr, 10)
    };
  });

  entries.sort((a, b) => a.timestamp - b.timestamp);

  // Calculate gaps between entries
  for (let i = 1; i < entries.length; i++) {
    entries[i].timeDiff = (entries[i].timestamp - entries[i - 1].timestamp) / 1000;
  }

  // Filter out rapid button presses (gap < 30 seconds) for stats calculations
  const filteredEntries = entries.filter((entry, index) => {
    if (index === 0) return true; // Keep the first entry
    return entries[index].timeDiff >= 30;
  });

  // Update stats calculations to use filteredEntries instead of entries
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

  // Longest gap per day (same-date gaps only)
  const longestGapByDate = {};
  for (let i = 1; i < filteredEntries.length; i++) {
    const prev = filteredEntries[i - 1];
    const curr = filteredEntries[i];
    const gap = (curr.timestamp - prev.timestamp) / 1000;
    const dateKey = prev.date; // Attribute to date of earlier entry

    if (!longestGapByDate[dateKey] || gap > longestGapByDate[dateKey].gap) {
      longestGapByDate[dateKey] = { gap, start: prev.timestamp, end: curr.timestamp };
    }
  }

  // Top 3 most active days
  const dateFreq = {};
  filteredEntries.forEach(e => dateFreq[e.date] = (dateFreq[e.date] || 0) + 1);
  const topDateCounts = Object.entries(dateFreq).sort((a, b) => b[1] - a[1]).slice(0, 1);

  // Median and average time between updates
  const gaps = filteredEntries.slice(1).map(e => e.timeDiff);
  const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianGap = sortedGaps.length % 2 === 0 ? (sortedGaps[sortedGaps.length / 2 - 1] + sortedGaps[sortedGaps.length / 2]) / 2 : sortedGaps[Math.floor(sortedGaps.length / 2)];

  // Calculate stats for the most popular day of the week
  const dayOfWeekCounts = Array(7).fill(0); // Array to store counts for each day (0 = Sunday, 6 = Saturday)
  filteredEntries.forEach(e => {
    const dayOfWeek = e.timestamp.getDay(); // Get day of the week (0 = Sunday, 6 = Saturday)
    dayOfWeekCounts[dayOfWeek]++;
  });
  const mostPopularDayIndex = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
  const mostPopularDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][mostPopularDayIndex];
  const mostPopularDayCount = dayOfWeekCounts[mostPopularDayIndex];
  const mostPopularDayPercentage = ((mostPopularDayCount / filteredEntries.length) * 100).toFixed(2);

  // Compare activity levels on weekdays versus weekends
  const weekdayCount = dayOfWeekCounts.slice(1, 6).reduce((sum, count) => sum + count, 0); // Monday to Friday
  const weekendCount = dayOfWeekCounts[0] + dayOfWeekCounts[6]; // Sunday + Saturday

  // Compare activity levels on weekdays versus weekends
  const totalPresses = weekdayCount + weekendCount;
  const weekdayPercentage = ((weekdayCount / totalPresses) * 100).toFixed(2);
  const weekendPercentage = ((weekendCount / totalPresses) * 100).toFixed(2);

  // Calculate the average length between button presses
  const formattedAvgGap = `${Math.floor(avgGap / 3600)}h ${Math.floor((avgGap % 3600) / 60)}m ${Math.floor(avgGap % 60)}s`; // Format as h:m:s

  // Calculate the most presses in a single hour of a day
  let maxPressesInHour = 0;
  let maxPressesHour = null;
  let maxPressesDate = null;

  const hourDayFreq = {}; // Track presses for each hour of each day

  filteredEntries.forEach(e => {
    const key = `${e.date}-${e.hour}`;

    // Set initial count if not already set
    if (!hourDayFreq[key]) hourDayFreq[key] = 0;

    // Increment the number of times that hour had a press
    // This is a simple way to track the number of presses in each hour of each day
    hourDayFreq[key]++;

    if (hourDayFreq[key] > maxPressesInHour) {
      maxPressesInHour = hourDayFreq[key];
      maxPressesHour = e.hour;
      maxPressesDate = e.date;
    }
  });

  // Calculate rapid button presses (gap < 30 seconds)
  let rapidPressCount = 152; // Start at 152 because of the unlogged events
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
      currentRapidSession = 0; // Reset the session if the gap is > 30 seconds
    }
  }

  // HTML report
  const html = `
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: auto; }
      h1 { color: #333; }
      .stat { margin-bottom: 1em; }
      code { background: #eee; padding: 2px 4px; border-radius: 4px; }
      div.stat { margin: 0; padding: 0; }
      .gap-visualization { display: flex; flex-wrap: nowrap; overflow-x: auto; margin-top: 20px; }
      .gap-box { display: inline-block; margin-right: 2px; text-align: center; font-size: 10px; color: #fff; background-color: #007bff; border-radius: 4px; overflow: hidden; }
      .gap-box span { display: block; padding: 2px; }    
    </style>
  <h1>📊 CounterProductive Log Report</h1>

  <div class="stats">
  <div class="stat">🔘 The button has been pressed <strong>${lastCount}</strong> times, last pressed <span id='timeSinceLastSpan'><i>calculating...</i></span> ago</div>
  <div class="stat">😟 Time remaining to keep this project alive: <span id='timeRemainingSpan'><i>calculating...</i></span></div>
  <div class="stat">🗓️ Last button press: <strong>${formatDateTime(entries[entries.length - 1].timestamp)}</strong></div>
  <div class="stat">⏳ Project has been running for: <strong>${Math.floor((entries[entries.length - 1].timestamp - entries[0].timestamp) / (1000 * 60 * 60 * 24))} days</strong></div>

  <div class="stat">&nbsp;</div>

  <div class="stat">📊 Total rapid button presses (gap < 30 seconds): <strong>${rapidPressCount}</strong> (${((rapidPressCount / lastCount)*100).toFixed(2)}%)</div>
  <div class="stat">📊 Most rapid button presses in a single session: <strong>${longestRapidSession}</strong> on <strong>${formatDateMMMDD(longestRapidSessionDate)}</strong></div>
  <div>&nbsp;</div>

  <div class="note">Note: Rapid button presses occurring within a 30-second interval significantly affect the statistics. <br />The following statistics combine rapid button presses into a single button press event.</div>
  <div>&nbsp;</div>

  <div class="stat">📈 Average button presses per day: <strong>${averagePerDay}</strong> (${filteredEntries.length} entries over ${totalDays} days)</div>
  <div class="stat">⏳ Average length between button presses: <strong>${formattedAvgGap}</strong></div>
  <div class="stat">⏳ <span title="The median is the middle value in a sorted list of numbers. It represents the point where half the values are smaller and half are larger.">Median</span> length between button presses: 
      <strong>${Math.floor(medianGap / 3600)}h ${Math.floor((medianGap % 3600) / 60)}m ${Math.floor(medianGap % 60)}s</strong>
  </div>
  <div class="stat">📅 Most active day:
      ${topDateCounts.map(([d, c]) => `<strong>${formatDateMMMDD(d)}</strong> with <strong>${c}</strong> button presses`).join('\n')}  
  </div>
  <div class="stat">📊 The most presses in a single hour of a day: <strong>${maxPressesInHour}</strong> presses in the <strong>${maxPressesHour}:00</strong> on <strong>${formatDateMMMDD(maxPressesDate)}</strong></div>
  <div class="stat">⏰ Most popular hour of the day: <strong>${mostFreqHour}:00</strong> (${freqCount} button presses)</div>
  <div class="stat">📅 Most popular day of the week: <strong>${mostPopularDayName}</strong> with <strong>${mostPopularDayCount}</strong> (<strong>${mostPopularDayPercentage}%</strong>) button presses </div>
  <div class="stat">📊 Weekday vs Weekend Activity: 
      <strong>${weekdayCount}</strong> (${weekdayPercentage}%) presses on weekdays vs 
      <strong>${weekendCount}</strong> (${weekendPercentage}%) presses on weekends 
  </div>
  <div class="stat">🕒 Top 3 Longest gaps between button presses:
    <ul>
      ${topGaps.map(gap => `<li><strong>${Math.floor(gap.gap / 3600)}h ${Math.floor((gap.gap % 3600) / 60)}m</strong> between <code>${formatDateTime(gap.start)} → ${formatDateTime(gap.end)}</code></li>`).join('')}
    </ul>
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

    ${[...uniqueDates]
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
        const dayOfWeek = new Date(nextDate).toLocaleDateString('en-US', { weekday: 'short' }); // Get three-letter day of the week
        const isWeekend = dayOfWeek === 'Sat' || dayOfWeek === 'Sun'; // Check if the day is a weekend

        return `
          <div class="day-row ${isWeekend ? 'weekend' : ''}">
            <div class="day-label">${formatDateMMMDD(nextDate)} (${dayOfWeek})</div>
            <div class="day-boxes">
              ${Array.from({ length: 24 }).map((_, hour) => {
          const hourEntries = dailyEntries.filter(e => e.hour === hour);
          const isPressed = hourEntries.length > 0;
          const tooltip = isPressed
            ? hourEntries.map(e => `${e.timestamp.toLocaleTimeString()} (#${e.count})`).join(', ')
            : `No presses during ${hour}:00 - ${hour + 1}:00`;

          return `
                  <div class="hour-box ${isPressed ? 'pressed' : 'gap'}" title="${tooltip}">
                    ${isPressed ? hourEntries.length : ''}
                  </div>
                `;
        }).join('')}
            </div>
            <div class="day-total">${totalEntries}</div> <!-- Total entries for the day -->
          </div>
        `;
      }).join('')}
  </div>

  <p>Generated on: <strong>${formatDateTime(new Date())}</strong></p>
  </div> <!-- End of stats div -->

  <style>
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
      background-color: #007bff;
    }
    .hour-box.pressed {
      background-color: #28a745;
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
  </style>
  <span id='LastUpdated'>${entries[entries.length - 1].timestamp.toLocaleString()}</span>
  `;

  return html;
};

// Export the function for external use
module.exports = generateReport;
