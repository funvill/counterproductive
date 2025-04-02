const axios = require('axios');

// Get command-line arguments
const [, , GIST_ID, GITHUB_TOKEN, countArg, lastUpdatedArg] = process.argv;

if (!GIST_ID || !GITHUB_TOKEN || !countArg || !lastUpdatedArg) {
  console.error('Usage: node update-gist.js <GIST_ID> <GITHUB_TOKEN> <count> <lastUpdated>');
  process.exit(1);
}

const FILENAME = 'counterproductive-data.json';

const newData = {
  count: parseInt(countArg, 10),
  lastUpdated: lastUpdatedArg
};

axios.patch(`https://api.github.com/gists/${GIST_ID}`, {
  files: {
    [FILENAME]: {
      content: JSON.stringify(newData, null, 2)
    }
  }
}, {
  headers: {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    'User-Agent': 'gist-updater'
  }
}).then(res => {
  console.log('✅ Gist updated:', res.data.html_url);
  return process.exit(0); // Good exit code
}).catch(err => {
  console.error('❌ Error updating gist:', err.response?.data || err.message);
  return process.exit(1); // Bad exit code
});
