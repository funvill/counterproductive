const fs = require('fs');
const axios = require('axios');

function sendReportToGist(inputFile, githubToken, gistId, gistFileName, callback) {
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
    callback(null, res.data);
  }).catch(err => {
    callback(err);
  });
}

module.exports = sendReportToGist;