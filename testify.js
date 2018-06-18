const path = require('path');
const env = require('./lib/env');
const os = require('os');
const mkdirp = require('bluebird').promisify(require('mkdirp'));
const handleError = require('./lib/handle-error');
const sendMessage = require('./lib/send-message');
const sendStatus = require('./lib/send-status');
const getArtifacts = require('./lib/get-artifacts');
const runTestRev = require('./lib/run-test-rev');
const runTestIntegrity = require('./lib/run-test-integrity');
const runTestCypress = require('./lib/run-test-cypress');

module.exports = (req, res) => {
  return sendMessage(`Testifying ${req.query.target}`)
    .then(() => testify(req,res))
    .then(() => sendMessage(`Testified ${req.query.target}`))
    .catch(err => handleError(err,req,res));
};

async function testify(req, res) {
  ['username','reponame','branchname','target'].forEach(d => {
    if (!req.query[d])
      throw `Missing query parameter: ${d}`;
    if (/[^\w\-\.]/.test(req.query[d]))
      throw `Invalid characters in query: ${d} - Only [^\w\-\.] allowed`;
  });
  if (req.query.quick) { res.status(200).send('OK'); }
  const branchname = String(req.query.branchname).replace(/([^\w\d\s-])/,''); 
  const targetUrl = decodeURIComponent(req.query.target);
  let d;
  const time = ((d=new Date())&&d.setHours(d.getHours()-4)&&d).toISOString().slice(0,19).replace(/[:]/g,'');
  const key = [req.query.username,req.query.reponame,branchname,time].join('/');
  const logDir = path.join(env.get('LOG_DIR'), key);
  req.query.logDir = logDir; // store in req for error handler //TODO refactor
  await mkdirp(logDir);
  const logUrl = `http${env.get('HTTPS')?'s':''}://${env.get('hostname')}/logs/${key}/`;
  req.query.logUrl = logUrl; // store in req for error handler
  const artifacts = await getArtifacts({
      username: req.query.username,
      reponame: req.query.reponame,
      branchname: req.query.branchname
    });
  const artifact = artifacts[0];
  const artifactUrl = artifact.url;
  const rev = artifact.sha;
  req.query.rev = rev; // store in req for error handler
  await sendStatus({
      username: req.query.username,
      reponame: req.query.reponame,
      rev: rev,
      state: 'pending',
      description: `Testifying ${req.query.external?'external':''} ${targetUrl}`,
      targetUrl: logUrl
    });

  await runTestRev({
      username: req.query.username,
      reponame: req.query.reponame,
      rev: rev,
      targetUrl: targetUrl
    });
  if (!req.query.quick) { res.write('Rev is OK\n'); res.flush(); }

  await runTestIntegrity({
      username: req.query.username,
      reponame: req.query.reponame,
      targetUrl: targetUrl,
      external: req.query.external
    });
  if (!req.query.quick) { res.write('Integrity is OK\n'); res.flush(); }

  await runTestCypress({
      username: req.query.username,
      reponame: req.query.reponame,
      targetUrl: targetUrl,
      logDir: logDir,
      artifactUrl: artifactUrl,
      req: req,
      res: res
    });
  if (!req.query.quick) { res.write('Cypress is OK\n'); res.flush(); }

  await sendStatus({
      username: req.query.username,
      reponame: req.query.reponame,
      rev: rev,
      state: 'success',
      description: `Testified ${req.query.external?'external':''} ${targetUrl}`,
      targetUrl: logUrl
    });
  if (!req.query.quick) { res.write('OK\n'); res.end(); }
};
