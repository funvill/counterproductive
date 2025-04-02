/**
 * Log Analyzer
 * This script reads a log file, processes the entries, and generates a report.
 * 
 * Version: 2025-Apr-02
 * 
 * Example of the log file:
 * ```
 * 2025-04-01T19:11:20-0700 CounterProductive/count 165
 * 2025-04-01T20:02:48-0700 CounterProductive/count 166
 * 2025-04-01T22:19:37-0700 CounterProductive/count 167
 * ```
 * 
 */ 
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'output.txt');

// Read and parse the file
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

// Sort by timestamp
entries.sort((a, b) => a.timestamp - b.timestamp);

// Find longest time between updates
// -------------------------------------------------------
let maxGap = 0;
let gapStart = null;
let gapEnd = null;

for (let i = 1; i < entries.length; i++) {
  const diff = (entries[i].timestamp - entries[i - 1].timestamp) / 1000; // seconds
  if (diff > maxGap) {
    maxGap = diff;
    gapStart = entries[i - 1].timestamp;
    gapEnd = entries[i].timestamp;
  }
}

// Most frequent hour
// -------------------------------------------------------
const hourFreq = {};
entries.forEach(entry => {
  hourFreq[entry.hour] = (hourFreq[entry.hour] || 0) + 1;
});
const mostFrequentHour = Object.entries(hourFreq).sort((a, b) => b[1] - a[1])[0];

// Most frequent date with count
// -------------------------------------------------------
const dateFreq = {};
entries.forEach(entry => {
  const key = `${entry.date}`;
  dateFreq[key] = (dateFreq[key] || 0) + 1;
});

const topDateCounts = Object.entries(dateFreq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3); // Top 3

// Count how many days are represented in the log
// --------------------------------------------------------
const uniqueDates = new Set(entries.map(entry => entry.date));
const totalDays = uniqueDates.size;
const averagePerDay = (entries.length / totalDays).toFixed(2);


// Output the report
// --------------------------------------------------------
console.log('📊 Report:');
console.log('-----------------------------');
const gapHours = Math.floor(maxGap / 3600);
const gapMinutes = Math.floor((maxGap % 3600) / 60);
console.log(`🕒 Longest gap between updates: ${gapHours}h ${gapMinutes}m`);
console.log(`   From: ${gapStart.toISOString()}`);
console.log(`   To:   ${gapEnd.toISOString()}`);
console.log('');
console.log(`⏰ Most frequent hour: ${mostFrequentHour[0]}:00 (${mostFrequentHour[1]} entries)`);
console.log(`📈 Average entries per day: ${averagePerDay} (${entries.length} entries over ${totalDays} days)`);
console.log('📅 Top 3 most frequent date+entries combinations:');
topDateCounts.forEach(([key, count], idx) => {
  console.log(`   ${idx + 1}. ${key} (${count} entries)`);
});


