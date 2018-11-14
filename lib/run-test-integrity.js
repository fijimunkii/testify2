const env = require('./env');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const request = Promise.promisifyAll(require('request'),{multiArgs:true});

module.exports = async (options) => {
  ['username','reponame','targetUrl']
    .map(d => { if (!options[d]) throw `Missing option in runTestIntegrity: ${d}`; });

  const passphrase = env.get(`${options.username}/${options.reponame}:certPassword`);
  const p12 = await fs.readFileAsync(path.join(__dirname,`../cert/${options.username}-${options.reponame}.p12`));
  const j = request.jar();
  const params = {
      jar: j,
      json: true,
      pfx: p12,
      passphrase: passphrase
  };

  let token = (await request.getAsync(Object.assign(params, {
      uri: `https://${options.targetUrl}/auth/token`,
    })))[1];

  await request.postAsync(Object.assign(params, {
      uri: `https://${options.targetUrl}/auth/login`,
      body: { user: env.get(`${options.username}/${options.reponame}:login:user`), token:token },
    }));

  token = (await request.getAsync(Object.assign(params, {
      uri: `https://${options.targetUrl}/auth/token`,
    })))[1];

  let endpoint = 'utils.integrity.all';
  if (options.external) {
    endpoint = 'utils.external_integrity.all';
  }
  const testResult = (await request.getAsync(Object.assign(params, {
      uri: `https://${options.targetUrl}/api/${endpoint}`,
      body: { token: token }
    })))[1];

  if (testResult && testResult[endpoint] !== 'OK') {
    throw `${testResult[endpoint].message}`;
  }

};
