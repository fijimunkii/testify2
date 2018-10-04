const env = require('./env');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const os = require('os');
const del = require('rimraf');
const request = Promise.promisifyAll(require('request'));
const unzipper = require('unzipper');
const spawn = require('child_process').spawn;
const spawnAsync = Promise.promisify(require('child_process').spawn);

module.exports = async (options) => {
  const name = `${options.username}-${options.reponame}-${+new Date()}`;
  const tmpdir = path.join(os.tmpdir(),name);
  const port = Math.random() * (1080 - 555) + 555;
  await new Promise((resolve, reject) => {
    //  first the proxy cert with random port
    const proxyCmd = 'docker run'+
      ' -e S3_BUCKET='+env.get('S3_BUCKET')+
      ' -e PROXY_TARGET_URL='+options.targetUrl+
      ' -p '+port+':8000'+
      ' --name='+name+'-proxy'+
      ' fijimunkii/proxy-cert:latest';
    //  then zap
    const zapCmd = 'docker run' +
      ' -v '+tmpdir+'/zap:/zap/wrk/:rw'+
      ' --name='+name+'-zap'+
      ' -t owasp/zap2docker-weekly zap-baseline.py'
      ' -t http://localhost:'+port+
      ' -g gen.conf -r report.html';
    console.log(proxyCmd);
    console.log(zapCmd);
    let output = '';
    const test = spawn(cmd, {shell:true});
    test.stdout.on('data', data => { output = `${output}${String(data)}`; });
    test.stdout.on('data', data => { console.log(String(data)); });
    test.stdout.on('data', data => { if (!options.req.query.quick) options.res.write(String(data)); });
    const killTest = async () => {
      try { test.kill(); } catch(err) { }
      const killCmd = `docker rm $(docker stop $(docker ps -a -q --filter name=${name} --format="{{.ID}}") 2>/dev/null) 2>/dev/null`;
      console.log(killCmd);
      const { stdout } = await spawnAsync(killCmd, {shell:true});
      return stdout;
    };
    const testTimeout = setTimeout(() => {
      killTest();
      reject('Test failed: timed out');
    }, env.get('ZAP_TEST_TIMEOUT')||1000*60*2);
    test.on('close', async (exitCode, signal) => {
      clearTimeout(testTimeout);
      killTest();
      await fs.writeFileAsync(path.join(options.logDir,'test.log'),output);
      await fs.copyFileAsync(path.join(tmpdir,'zap','report.html'), path.join(options.logDir,'zap.html'));
      if (exitCode || !output) {
        reject(`Test failed: ${output}`);
      }
      resolve();
    });
  })
  .then(() => del(tmpdir, function(){}))
  .catch(err => {
    del(tmpdir, function(){});
    throw err;
  });

};
