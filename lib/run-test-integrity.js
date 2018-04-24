const env = require('../env');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const request = require('bluebird').promisifyAll(require('request'),{multiArgs:true});

module.exports = async (options) => {
  const passphrase = env.get(options.req.query.username+'/'+options.req.query.reponame+':apiCertPassword:'+options.NODE_ENV);
  const p12 = await fs.readFileAsync(path.join(__dirname,'../cert/'+options.project+'/'+options.NODE_ENV+'-api.p12'));
  const j = request.jar();
  const params = {
      jar: j,
      json: true,
      pfx: p12,
      passphrase: passphrase
  };

  let token = (await request.getAsync(Object.assign(params, {
      uri: 'https://' + options.server + '/auth/token',
    }))).body;

  await request.postAsync(Object.assign(params, {
      uri: 'https://' + options.server + '/auth/login',
      body: { user: env.get(options.req.query.username+'/'+options.req.query.reponame+':login:user'), token:token },
    }));

  token = (await request.getAsync(Object.assign(params, {
      uri: 'https://' + options.server + '/auth/token',
    }))).body;

  const testResult = (await request.getAsync(Object.assign(params, {
      uri: 'https://' + options.server + '/api/utils.integrity.all',
      body: { token: token }
    }))).body;

  if (testResult && testResult['utils.integrity.all'] !== 'OK') {
    throw `INTEGRITY_CHECK_FAILED ${testResult['utils.integrity.all'].message}`;
  });

};
