/**
 * Log Analyzer → HTML Report Generator
 * Converts a time-series log into a styled report.html output.
 * Version: 2025-Apr-02
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'output.txt');
const OUTPUT_FILE = path.join(__dirname, 'report.html');

// Read and parse the log
const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(line => line.startsWith('2025-'));

const entries = lines.map(line => {
  const [timestamp, topic, countStr] = line.trim().split(/\s+/);
  return {
    timestamp: new Date(timestamp),
    hour: new Date(timestamp).getHours(),
    date: timestamp.split('T')[0],
    count: parseInt(countStr, 10)
  };
});

entries.sort((a, b) => a.timestamp - b.timestamp);

// Calculate gaps between entries
for (let i = 1; i < entries.length; i++) {
  entries[i].timeDiff = (entries[i].timestamp - entries[i - 1].timestamp) / 1000;
}

// Calculations
const uniqueDates = new Set(entries.map(e => e.date));
const totalDays = uniqueDates.size;
const averagePerDay = (entries.length / totalDays).toFixed(2);
const lastCount = entries[entries.length - 1].count;

// Most frequent hour
const hourFreq = {};
entries.forEach(e => hourFreq[e.hour] = (hourFreq[e.hour] || 0) + 1);
const [mostFreqHour, freqCount] = Object.entries(hourFreq).sort((a, b) => b[1] - a[1])[0];

// Longest gap overall
let maxGap = 0, gapStart, gapEnd;
for (let i = 1; i < entries.length; i++) {
  const gap = entries[i].timeDiff;
  if (gap > maxGap) {
    maxGap = gap;
    gapStart = entries[i - 1].timestamp;
    gapEnd = entries[i].timestamp;
  }
}
const gapHours = Math.floor(maxGap / 3600);
const gapMinutes = Math.floor((maxGap % 3600) / 60);

// Longest gap per day (same-date gaps only)
const longestGapByDate = {};
for (let i = 1; i < entries.length; i++) {
  const prev = entries[i - 1];
  const curr = entries[i];
  const gap = (curr.timestamp - prev.timestamp) / 1000;
  const dateKey = prev.date; // Attribute to date of earlier entry

  if (!longestGapByDate[dateKey] || gap > longestGapByDate[dateKey].gap) {
    longestGapByDate[dateKey] = { gap, start: prev.timestamp, end: curr.timestamp };
  }

}

// Top 3 most active days
const dateFreq = {};
entries.forEach(e => dateFreq[e.date] = (dateFreq[e.date] || 0) + 1);
const topDateCounts = Object.entries(dateFreq).sort((a, b) => b[1] - a[1]).slice(0, 1);

// Median and average time between updates
const gaps = entries.slice(1).map(e => e.timeDiff);
const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
const sortedGaps = [...gaps].sort((a, b) => a - b);
const medianGap = sortedGaps.length % 2 === 0 ? (sortedGaps[sortedGaps.length / 2 - 1] + sortedGaps[sortedGaps.length / 2]) / 2 : sortedGaps[Math.floor(sortedGaps.length / 2)];

const formatGap = (s) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;

// Last entry time
const lastEntryTime = entries[entries.length - 1].timestamp.getTime();
const now = Date.now();

// Calculate stats for the most popular day of the week
const dayOfWeekCounts = Array(7).fill(0); // Array to store counts for each day (0 = Sunday, 6 = Saturday)
entries.forEach(e => {
  const dayOfWeek = e.timestamp.getDay(); // Get day of the week (0 = Sunday, 6 = Saturday)
  dayOfWeekCounts[dayOfWeek]++;
});
const mostPopularDayIndex = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
const mostPopularDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][mostPopularDayIndex];
const mostPopularDayCount = dayOfWeekCounts[mostPopularDayIndex];
const mostPopularDayPercentage = ((mostPopularDayCount / entries.length) * 100).toFixed(2);

// Compare activity levels on weekdays versus weekends
const weekdayCount = dayOfWeekCounts.slice(1, 6).reduce((sum, count) => sum + count, 0); // Monday to Friday
const weekendCount = dayOfWeekCounts[0] + dayOfWeekCounts[6]; // Sunday + Saturday

// Compare activity levels on weekdays versus weekends
const totalPresses = weekdayCount + weekendCount;
const weekdayPercentage = ((weekdayCount / totalPresses) * 100).toFixed(2);
const weekendPercentage = ((weekendCount / totalPresses) * 100).toFixed(2);

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
<p>Generated on: <strong>${new Date().toLocaleString()}</strong></p>

<div class="stat">🔘 The button has been pressed <strong>${lastCount}</strong> times, last pressed <span id='timeSinceLastSpan'><i>calculating...</i></span> ago</div>
<div class="stat">😟 Time remaining to keep this project alive: <span id='timeRemainingSpan'><i>calculating...</i></span></div>
<div class="stat">&nbsp;</div>
<div class="stat">🗓️ Last button press: <strong><span id='LastUpdated'>${entries[entries.length - 1].timestamp.toLocaleString()}</span></strong></div>
<div class="stat">📈 Average button presses per day: <strong>${averagePerDay}</strong> (${entries.length} entries over ${totalDays} days)</div>
<div class="stat">🕒 Longest between button presses: <strong>${gapHours}h ${gapMinutes}m</strong> between <code>${gapStart.toLocaleString()} → ${gapEnd.toLocaleString()}</code></div>
<div class="stat">📅 Most active day:
    ${topDateCounts.map(([d, c]) => `<strong>${d}</strong> with <strong>${c}</strong> button presses`).join('\n')}  
</div>
<div class="stat">⏰ Most popular hour of the day: <strong>${mostFreqHour}:00</strong> (${freqCount} button presses)</div>
<div class="stat">📅 Most popular day of the week: <strong>${mostPopularDayName}</strong> with <strong>${mostPopularDayCount}</strong> (<strong>${mostPopularDayPercentage}%</strong>) button presses </div>
<div class="stat">📊 Weekday vs Weekend Activity: 
    <strong>${weekdayCount}</strong> (${weekdayPercentage}%) presses on weekdays vs 
    <strong>${weekendCount}</strong> (${weekendPercentage}%) presses on weekends 
</div>

<h2>📅 Day Visualization</h2>
<div class="gap-visualization">
  <!-- Add hour labels as the top row -->
  <div class="day-row">
    <div class="day-label">Hour</div> <!-- Empty cell for alignment -->
    <div class="day-boxes">
      ${Array.from({ length: 24 }).map((_, hour) => `
        <div class="hour-box header" title="Hour ${hour}:00">${hour}</div>
      `).join('')}
    </div>
    <div class="day-total header">Total</div> <!-- Header for the total column -->
  </div>

  ${[...uniqueDates].map(date => {
    const dailyEntries = entries.filter(e => e.date === date);
    const totalEntries = dailyEntries.length; // Calculate total entries for the day

    return `
      <div class="day-row">
        <div class="day-label">${date}</div>
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
  .day-label {
    width: 100px;
    font-weight: bold;
    text-align: right;
    padding-right: 5px;
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
</style>
`;

fs.writeFileSync(OUTPUT_FILE, html, 'utf8');
console.log(`✅ Report written to ${OUTPUT_FILE}`);
