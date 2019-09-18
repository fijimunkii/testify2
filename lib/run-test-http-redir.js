const http = require('http');

module.exports = async (options) => {
  ['targetUrl']
    .map(d => { if (!options[d]) throw `Missing option in runTestHttpRedir: ${d}`; });

  await new Promise((resolve, reject) => {
    const req = http.get(`http://${options.targetUrl}`, res => {
      if (res.statusCode !== 301) {
        reject('HTTP Redirect missing');
      }
      resolve();
    });
    req.end();
  });

};
