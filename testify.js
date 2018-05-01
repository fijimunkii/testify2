const path = require('path');
const env = require('./lib/env');
const os = require('os');
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
      throw 'Missing query parameter: ' + d;
  });
  if (req.query.quick) res.status(200).send('OK');
  const branchname = String(req.query.branchname).replace(/([^\w\d\s-])/,''); 
  const targetUrl = decodeURIComponent(req.query.target);
  const key = [req.query.username,req.query.reponame,branchname,targetUrl].join('/');
  const logDir = path.join(os.tmpdir(), key);
  const logUrl = `https://${env.get('hostname')}/logs/${key}/test.log`;
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
      description: 'Testifying ' + targetUrl,
      targetUrl: logUrl
    });
  await runTestRev({
      username: req.query.username,
      reponame: req.query.reponame,
      rev: rev,
      targetUrl: targetUrl
    });
  res.write('Rev is OK');
  await runTestIntegrity({
      username: req.query.username,
      reponame: req.query.reponame,
      targetUrl: targetUrl
    });
  res.write('Integrity is OK');
  await runTestCypress({
      username: req.query.username,
      reponame: req.query.reponame,
      targetUrl: targetUrl,
      logdir: logDir,
      artifactUrl: artifactUrl,
      res: res
    });
  res.write('Cypress is OK');
  await sendStatus({
      username: req.query.username,
      reponame: req.query.reponame,
      rev: rev,
      state: 'success',
      description: 'Testified ' + targetUrl,
      targetUrl: logUrl
    });
  res.status(200).send('OK');
};
