const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const request = require('bluebird').promisifyAll(require('request'),{multiArgs:true});

module.exports = async (options) => {
  const p12 = await fs.readFileAsync(path.join(__dirname,'../cert/'+options.project+'/'+options.NODE_ENV+'-api.p12'));
  return request.getAsync({
    uri: 'https://' + options.server + '/auth/rev',
    pfx: p12,
    passphrase: env.get(options.req.query.username+'/'+options.req.query.reponame+':apiCertPassword:'+options.NODE_ENV)
  }).spread((res,body) => {
    if (String(body).indexOf('The SSL certificate error') !== -1) throw 'The SSL certificate error';
    if (String(body).indexOf(options.rev) === -1) throw 'REV_CHECK_FAILED';
  });
};
