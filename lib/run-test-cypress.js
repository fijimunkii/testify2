const env = require('./env');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const os = require('os');
const del = require('rimraf');
const touch = Promise.promisify(require('touch'));
const https = require('https');
const exec = require('child_process').exec;
const unzipper = require('unzipper');

module.exports = async (options) => {
  const loginCredentials = env.get(`${options.username}/${options.reponame}:login:user`);
  const name = `${options.username}-${options.reponame}-${+new Date()}`;
  const tmpdir = path.join(os.tmpdir(),name);
  await new Promise((resolve, reject) => {
    https.get(options.artifactUrl, res => {
      res
        .pipe(unzipper.Extract({ path: tmpdir }))
        .on('log', console.log)
        .on('error', reject)
        .on('finish', resolve)});
    });
  console.log(`downloaded - ${tmpdir}`);
  await new Promise((resolve, reject) => {
    const cmd = 'docker run'+
      ' -v '+tmpdir+'/cypress:/root/cypress'+
      ' -v '+options.logdir+':/root/logs'+
      ' -v '+path.join(__dirname,'../cert')+':/root/proxy-cert/cert'+
      ' -e PROXY_TARGET_URL=https://'+options.targetUrl+
      ' -e CYPRESS_base_user_email='+loginCredentials.username+
      ' -e CYPRESS_base_user_password='+loginCredentials.password+
      ' --name='+name+
      ' fijimunkii/cypress-proxy-cert:latest'
    console.log(cmd);
    const test = exec(cmd, { cwd: tmpdir, maxBuffer: 1024 * 500 });
    let output = '';
    test.stdout.on('data', data => { output += String(data); });
    const testTimeout = setTimeout(() => {
      test.kill();
      const killCmd = `docker rm $(docker stop $(docker ps -a -q --filter name=${name} --format="{{.ID}}"))`;
      exec(killCmd, { cwd: tmpdir, maxBuffer: 1024 * 500 });
      reject('Test failed: timed out');
    }, env.get('CYPRESS_TEST_TIMEOUT')||1000*60*60);
    test.on('close', () => {
      clearTimeout(testTimeout);
      if (!output || output.indexOf('Test failed') !== -1)
        return reject('Test failed: ' + output);
      resolve();
    });
  })
  .then(() => del(tmpdir, function(){}))
  .catch(err => {
    del(tmpdir, function(){});
    throw err;
  });

};
