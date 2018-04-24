const env = require('./env');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const os = require('os');
const mkdirp = Promise.promisify(require('mkdirp'));
const del = require('rimraf');
const touch = Promise.promisify(require('touch'));
const https = require('https');
const zlib = require('zlib');
const exec = require('child_process').exec;

module.exports = async (options) => {
  const name = `${options.username-options.reponame}${+new Date()}`;
  const tmpdir = path.join(os.tmpdir(),name);
  await mkdirp(tmpdir);
  await mkdirp(options.logdir);
  await Promise.all(options.logfiles.map(log => touch(`${options.logdir}/${log}`)));
  await new Promise((resolve, reject) => {
    https.get(options.artifactUrl, res => {
      const gunzip = zlib.createGunzip;
      res
        .pipe(gunzip)
        .pipe(fs.createWriteStream(path.join(tmpdir,'cypress')))
        .on('log', console.log)
        .on('error', reject)
        .on('finish', resolve)});
    });
  console.log(`downloaded - ${tmpdir}`);
  await new Promise((resolve, reject) => {
    const cmd = 'docker run'+
      ' -v '+path.join(tmpdir,'cypress')+':/root/cypress'+
      ' -v '+options.logdir+':/root/logs'+
      ' -v '+path.join('/root/cert/',`${options.username}-${options.reponame}`)+':/root/cert-proxy/cert'+
      ' -e PROXY_TARGET_URL=https://'+options.targetUrl+
      ' --name='+name+
      ' fijimunkii/cypress-proxy-cert:latest'
    const test = exec(cmd, { cwd: tmpdir, maxBuffer: 1024 * 500 });
    let output = '';
    test.stdout.on('data', data => { output += String(data); });
    const testTimeout = setTimeout(() => {
      test.kill();
      const killCmd = `docker rm $(docker stop $(docker ps -a -q --filter name=${name} --format="{{.ID}}"))`;
      exec(killCmd, { cwd: tmpdir, maxBuffer: 1024 * 500 });
      reject('Test failed: timed out');
    }, env.get('TEST_TIMEOUT')||1000*60*60);
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
