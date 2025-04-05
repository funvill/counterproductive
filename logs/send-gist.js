const fs = require('fs');
const axios = require('axios');

// Get command-line arguments
const [, , GIST_ID, GITHUB_TOKEN, gistFileName, inputFile] = process.argv;

if (!GIST_ID || !GITHUB_TOKEN || !gistFileName || !inputFile) {
  console.error('Usage: node update-gist.js <GIST_ID> <GITHUB_TOKEN> <gistFileName> <inputFile>');
  process.exit(1);
}

const fileContent = fs.readFileSync(inputFile, 'utf8');

axios.patch(`https://api.github.com/gists/${GIST_ID}`, {
  files: {
    [gistFileName]: {
      content: fileContent
    }
  }
}, {
  headers: {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    'User-Agent': 'gist-updater'
  }
}).then(res => {
  console.log('✅ Gist updated:', res.data.html_url);
  process.exit(0);
}).catch(err => {
  console.error('❌ Error updating gist:', err.response?.data || err.message);
  process.exit(1);
});
