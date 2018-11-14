const env = require('./env');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const request = Promise.promisifyAll(require('request'),{multiArgs:true});

const keepTryingFor = 1000 * 60 * 2; // 2 minutes

module.exports = async (options) => {
  ['username','reponame','targetUrl']
    .map(d => { if (!options[d]) throw `Missing option in runTestReady: ${d}`; });

  const passphrase = env.get(`${options.username}/${options.reponame}:certPassword`);
  const p12 = await fs.readFileAsync(path.join(__dirname,`../cert/${options.username}-${options.reponame}.p12`));

  const isReady = timeStarted => {
    if (new Date() - timeStarted > keepTryingFor)
      throw 'Timed out';
    return request.getAsync({
      uri: `https://${options.targetUrl}/auth/rev`,
      pfx: p12,
      passphrase: passphrase
    })
    .catch(err => {
      console.log(err);
      if (String(err).contains('ETIMEDOUT'))
        return Promise.delay(1000)
          .then(() => isReady(timeStarted));
    });
  };

  return isReady(new Date());

};
