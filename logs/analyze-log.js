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
const topDateCounts = Object.entries(dateFreq).sort((a, b) => b[1] - a[1]).slice(0, 3);

// Median and average time between updates
const gaps = entries.slice(1).map(e => e.timeDiff);
const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
const sortedGaps = [...gaps].sort((a, b) => a - b);
const medianGap = sortedGaps.length % 2 === 0 ? (sortedGaps[sortedGaps.length / 2 - 1] + sortedGaps[sortedGaps.length / 2]) / 2 : sortedGaps[Math.floor(sortedGaps.length / 2)];

const formatGap = (s) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;

// Last entry time
const lastEntryTime = entries[entries.length - 1].timestamp.getTime();
const now = Date.now();


// HTML report
const html = `
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: auto; }
    h1 { color: #333; }
    .stat { margin-bottom: 1em; }
    code { background: #eee; padding: 2px 4px; border-radius: 4px; }
    div.stat { margin: 0; padding: 0; }
  </style>
<h1>📊 CounterProductive Log Report</h1>
<p>Generated on: <strong>${new Date().toLocaleString()}</strong></p>

<div class="stat">🔘 The button has been pressed <strong>${lastCount}</strong> times, last pressed <span id='timeSinceLastSpan'><i>calulating...</i></span> ago</div>
<div class="stat">😟 Time remaining to keep this project alive: <span id='timeRemainingSpan'><i>calulating...</i></span></div>
<div class="stat">&nbsp;</div>
<div class="stat">🗓️ Last update: <strong><span id='LastUpdated'>${entries[entries.length - 1].timestamp.toLocaleString()}</span></strong></div>
<div class="stat">📈 Average entries per day: <strong>${averagePerDay}</strong> (${entries.length} entries over ${totalDays} days)</div>
<div class="stat">⏰ Most frequent hour: <strong>${mostFreqHour}:00</strong> (${freqCount} entries)</div>
<div class="stat">🕒 Longest gap between updates: <strong>${gapHours}h ${gapMinutes}m</strong> From ${gapStart.toLocaleString()} → ${gapEnd.toLocaleString()}</div>
<div class="stat">📆 Longest gap per day (same-date only):<ul>${Object.entries(longestGapByDate).map(([date, { gap, start, end }]) => {
  const hours = Math.floor(gap / 3600);
  const minutes = Math.floor((gap % 3600) / 60);

  // format the hours and minutes to be prefixed with '0' if less than 10
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '');

  return `<li><code>${date}: ${formattedHours}h ${formattedMinutes}m. From ${start.toLocaleString()} → ${end.toLocaleString()}</code></li>`;
}).join('\n')}</ul></div>


<div class="stat">📅 Top 3 most active days:
  <ul>
    ${topDateCounts.map(([d, c]) => `<li>${d}: ${c} entries</li>`).join('\n')}
  </ul>
</div>

<!-- <div class="stat">📏 Median time between entries: <strong>${formatGap(medianGap)}</strong></div> -->
<!-- <div class="stat">🕓 Average time between updates: <strong>${formatGap(avgGap)}</strong></div> -->
`;

fs.writeFileSync(OUTPUT_FILE, html, 'utf8');
console.log(`✅ Report written to ${OUTPUT_FILE}`);
