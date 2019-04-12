const env = require('./env');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const request = Promise.promisifyAll(require('request'),{multiArgs:true});
const https = require('https');

const initialWait = 1000 * 90; // 90 seconds
const keepTryingFor = 1000 * 60 * 5; // 5 minutes

module.exports = async (options) => {
  ['username','reponame','targetUrl']
    .map(d => { if (!options[d]) throw `Missing option in runTestReady: ${d}`; });

  const passphrase = env.get(`${options.username}/${options.reponame}:certPassword`);
  const p12 = await fs.readFileAsync(path.join(__dirname,`../cert/${options.username}-${options.reponame}.p12`));

  const isReady = timeStarted => {
    return request.getAsync({
      uri: `https://${options.targetUrl}/auth/rev`,
      pfx: p12,
      passphrase: passphrase,
      agent: new https.Agent(),
      timeout: 1000*20
    })
    .catch(err => {
      const keepTrying = new Date() - timeStarted < keepTryingFor;
      if (err.code === 'ETIMEDOUT' && keepTrying) {
        return Promise.delay(1000)
          .then(() => isReady(timeStarted));
      } else {
        throw err;
      }
    });
  };

  return Promise.delay(initialWait)
    .then(() => isReady(new Date()));

};
