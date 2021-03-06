const Promise = require('bluebird');
const sendMessage = require('./send-message');
const sendStatus = require('./send-status');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');

module.exports = async(err, req, res) => {
  err = String(err && err.stack || err);
  console.log(err);
  if (req.query.logDir) {
    await fs.writeFileAsync(path.join(req.query.logDir,'error.log'),err);
  }
  const reasons = [
    'SEND_STATUS_FAILED',
    'READY_CHECK_FAILED',
    'REV_CHECK_FAILED',
    'INTEGRITY_CHECK_FAILED',
    'CYPRESS_CHECK_FAILED',
    'Failed to find successful build',
    'Failed to find artifacts',
    'ENOSPC: no space left on device',
    'UnexpectedAlertOpen',
    'CircleCIResponse.serverError'
  ];
  let reason = reasons.reduce((o,d) => err.indexOf(d) > -1 && d || o, '');
  let cleanErr = err.replace(reason,'').replace(/^\s*/,'').replace(/$\s*/,'');
  if (reason === 'CYPRESS_CHECK_FAILED') {
    cleanErr = err.replace(/^[\S\s]*\(Run Finished\)\n\n\n/g,'').replace(/  \n\n/g,'').replace(/\[\?25h/g,'');
  }
  if (cleanErr.split('\n').length > 98) { // 100 lines max for slack message
    cleanErr = cleanErr.split('\n').slice(0,98).join('\n') + '... [message clipped]';
  }
  if (cleanErr.length > 30000) { // 40000 characters max for slack message
    cleanErr = cleanErr.substring(0,30000) + '... [message clipped]';
  }
  reason += (' ```' + cleanErr + '```');
  const message = `Testify FAILED ${req.query.external?'external data on ':''}${req.query.target} ${reason} ${req.query.logUrl}`;
  try { res.end(message); } catch(e) { }
  return Promise.all([
    sendMessage(message),
    sendStatus({
      username: req.query.username,
      reponame: req.query.reponame,
      rev: req.query.rev,
      state: 'failure',
      description: message,
      targetUrl: req.query.logUrl
    })
  ]).catch(err => console.log(err));
};
