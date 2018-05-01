const env = require('./env');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const os = require('os');
const del = require('rimraf');
const touch = Promise.promisify(require('touch'));
const https = require('https');
const unzipper = require('unzipper');
const spawn = require('child_process').spawn;
const spawnAsync = Promise.promisify(require('child_process').spawn);

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
  //console.log(`downloaded - ${tmpdir}`);
  await new Promise((resolve, reject) => {
    const cmd = 'docker run'+
      ' -v '+tmpdir+'/cypress:/root/cypress'+
      ' -v '+options.logdir+':/root/logs'+
      ' -e S3_BUCKET='+env.get('S3_BUCKET')+
      ' -e PROXY_TARGET_URL='+options.targetUrl+
      ' -e CYPRESS_base_user_email='+loginCredentials.username+
      ' -e CYPRESS_base_user_password='+loginCredentials.password+
      ' --name='+name+
      ' fijimunkii/cypress-proxy-cert:latest'
    //console.log(cmd);
    let output = '';
    const test = spawn(cmd, {shell:true});
    test.stdout.on('data', data => { output = `${output}${String(data)}`; });
    //test.stdout.on('data', data => { console.log(String(data)); });
    const killTest = async () => {
      try { test.kill(); } catch(err) { }
      const killCmd = `docker rm $(docker stop $(docker ps -a -q --filter name=${name} --format="{{.ID}}") 2>/dev/null) 2>/dev/null`;
      //console.log(killCmd);
      const { stdout } = await spawnAsync(killCmd, {shell:true});
      return stdout;
    };
    const testTimeout = setTimeout(async () => {
      await killTest();
      reject('Test failed: timed out');
    }, env.get('CYPRESS_TEST_TIMEOUT')||1000*60*60);
    test.on('close', async (exitCode, signal) => {
      clearTimeout(testTimeout);
      await killTest();
      if (exitCode || !output || output.indexOf('Test failed') !== -1)
        reject(`Test failed: ${output}`);
      resolve();
    });
  })
  .then(() => del(tmpdir, function(){}))
  .catch(err => {
    del(tmpdir, function(){});
    throw err;
  });

};
