const fs = require('fs');
const axios = require('axios');

function sendReportToGist(inputFile, githubToken, gistId, gistFileName) {
  const fileContent = fs.readFileSync(inputFile, 'utf8');
  axios.patch(`https://api.github.com/gists/${gistId}`, {
    files: {
      [gistFileName]: {
        content: fileContent
      }
    }
  }, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      'User-Agent': 'gist-updater'
    }
  }).then(res => {
    console.log('✅ Gist updated:', res.data.html_url);
    return true;
  }).catch(err => {
    console.error('❌ Error updating gist:', err.response?.data || err.message);
    return false;
  });
}

module.exports = sendReportToGist;