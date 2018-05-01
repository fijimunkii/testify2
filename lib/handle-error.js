const Promise = require('bluebird');
const sendMessage = require('./send-message');
const sendStatus = require('./send-status');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');

module.exports = async(err, req, res) => {
  err = String(err && err.stack || err);
  console.log(err);
  try {
    await fs.writeFileAsync(path.join(env.get('LOG_DIR'),'error.log'));
  } catch(e) { }
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
  try { res.end(`Testify FAILED ${req.query.target} ${reason}`); } catch(e) { }
  return Promise.all([
    sendMessage(`Testify FAILED ${req.query.target} ${reason}`),
    sendStatus({
      username: req.query.username,
      reponame: req.query.reponame,
      rev: req.query.rev,
      state: 'failure',
      description: `Testify FAILED ${req.query.target} ${reason}`,
      targetUrl: String(req.query.logUrl).replace(/test\.log/error\.log/)
    })
  ]).catch(err => console.log(err));
};
