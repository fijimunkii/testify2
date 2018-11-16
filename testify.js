const path = require('path');
const env = require('./lib/env');
const os = require('os');
const mkdirp = require('bluebird').promisify(require('mkdirp'));
const handleError = require('./lib/handle-error');
const sendMessage = require('./lib/send-message');
const sendStatus = require('./lib/send-status');
const getArtifacts = require('./lib/get-artifacts');
const runTestReady = require('./lib/run-test-ready');
const runTestRev = require('./lib/run-test-rev');
const runTestIntegrity = require('./lib/run-test-integrity');
const runTestCypress = require('./lib/run-test-cypress');
const Promise = require('bluebird');

module.exports = (req, res) => {
  return sendMessage(`Testifying ${req.query.external?'external data on ':''}${req.query.target}`)
    .then(() => testify(req,res))
    .then(() => sendMessage(`Testified ${req.query.external?'external data on ':''}${req.query.target}`))
    .catch(err => handleError(err,req,res));
};

async function testify(req, res) {
  // required input
  ['username','reponame','branchname','target'].forEach(d => {
    if (!req.query[d])
      throw `Missing required query parameter: ${d}`;
  });
  // validate all input
  ['username','reponame','branchname','target','skip','external'].forEach(d => {
    if (req.query[d] && /[^\w\-\.]/.test(req.query[d]))
      throw `Invalid characters in query: ${d} - Only [^\w\-\.] allowed`;
  });
  if (req.query.quick) { res.status(200).send('OK'); }
  const branchname = String(req.query.branchname).replace(/([^\w\d\s-])/,''); 
  const targetUrl = decodeURIComponent(req.query.target);
  // eastern timezone url safe string
  const time = (() => { const d=new Date(); d.setHours(d.getHours()-4); return d.toISOString().slice(0,19).replace(/[:]/g,''); })();
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
      description: `Testifying ${req.query.external?'external data on ':''}${targetUrl}`,
      targetUrl: logUrl
    })
    .catch(err => {  throw `SEND_STATUS_FAILED ${err}`; });

  await runTestReady({
      username: req.query.username,
      reponame: req.query.reponame,
      targetUrl: targetUrl
    })
    .catch(err => { throw `READY_CHECK_FAILED ${err}`; });

  await runTestRev({
      username: req.query.username,
      reponame: req.query.reponame,
      rev: rev,
      targetUrl: targetUrl
    })
    .catch(err => { throw `REV_CHECK_FAILED ${err}`; });
  if (!req.query.quick) { res.write('Rev is OK\n'); res.flush(); }

  await runTestIntegrity({
      username: req.query.username,
      reponame: req.query.reponame,
      targetUrl: targetUrl,
      external: req.query.external
    })
    .catch(err => { throw `INTEGRITY_CHECK_FAILED ${err}`; });
  if (!req.query.quick) { res.write('Integrity is OK\n'); res.flush(); }

  await runTestCypress({
      username: req.query.username,
      reponame: req.query.reponame,
      targetUrl: targetUrl,
      logDir: logDir,
      artifactUrl: artifactUrl,
      skip: req.query.skip,
      req: req,
      res: res
    })
    .catch(err => { throw `CYPRESS_CHECK_FAILED ${err}`; });
  if (!req.query.quick) { res.write('Cypress is OK\n'); res.flush(); }

  await sendStatus({
      username: req.query.username,
      reponame: req.query.reponame,
      rev: rev,
      state: 'success',
      description: `Testified ${req.query.external?'external data on ':''} ${targetUrl}`,
      targetUrl: logUrl
    })
    .catch(err => {  throw `SEND_STATUS_FAILED ${err}`; });
  if (!req.query.quick) { res.write('OK\n'); res.end(); }
};
