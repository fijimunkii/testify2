const env = require('../env');
const request = require('bluebird').promisifyAll(require('request'),{multiArgs:true});

module.exports = (msg) => {
  return request.postAsync({
    url: env.get('messageEndpoint'),
    body: { text: String(msg) },
    json: true
  })
  .spread((res, body) => { if (res.statusCode !== 200) throw body; })
  .catch(err => {
    // response sometimes doesnt include a content range header that node <3s
    const error = err && err.stack || err;
    if (String(error).indexOf('Range Not Satisfiable'))
      return;
    console.log(error);
  });
};
