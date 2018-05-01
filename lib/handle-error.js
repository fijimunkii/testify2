const Promise = require('bluebird');
const sendMessage = require('./send-message');
const sendStatus = require('./send-status');

module.exports = (err, req, res) => {
  err = String(err && err.stack || err);
  console.log(err);
  const reasons = [
    'INTEGRITY_CHECK_FAILED',
    'REV_CHECK_FAILED',
    'Failed to find successful build',
    'ENOSPC: no space left on device',
    'UnexpectedAlertOpen'
  ];
  const reason = reasons.reduce((o,d) => err.indexOf(d) > -1 && err || o, '');
  if (reason.length)
    err = reason;
  res.end(`Testify FAILED ${req.query.target} ${reason}`);
  return Promise.all([
    sendMessage(`Testify FAILED ${req.query.target} ${reason}`),
    sendStatus({
      username: req.query.username,
      reponame: req.query.reponame,
      rev: req.query.rev,
      state: 'failure',
      description: `Testify FAILED ${req.query.target} ${reason}`,
      targetUrl: req.query.logUrl
    })
  ]).catch(err => console.log(err));
};
