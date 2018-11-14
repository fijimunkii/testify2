const env = require('./env');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const request = Promise.promisifyAll(require('request'),{multiArgs:true});

module.exports = async (options) => {
  ['username','reponame','rev','targetUrl']
    .map(d => { if (!options[d]) throw `Missing option in runTestRev: ${d}`; });
  const passphrase = env.get(`${options.username}/${options.reponame}:certPassword`);
  const p12 = await fs.readFileAsync(path.join(__dirname,`../cert/${options.username}-${options.reponame}.p12`));
  return request.getAsync({
    uri: `https://${options.targetUrl}/auth/rev`,
    pfx: p12,
    passphrase: passphrase
  }).spread((res,body) => {
    if (String(body).indexOf('The SSL certificate error') !== -1) throw 'The SSL certificate error';
    if (String(body).indexOf(options.rev) === -1) throw `${options.rev} !== ${String(body)}`;
  });
};
