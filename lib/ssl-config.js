const path = require('path');
const fs = require('fs');
let sslConfig = {
//  requestCert: true, 
//  rejectUnauthorized: clientCertRequired
};
try {
  sslConfig.key = fs.readFileSync(path.join(__dirname,'../cert/ssl.key'));
  sslConfig.cert = fs.readFileSync(path.join(__dirname,'../cert/ssl.crt'));
//  sslConfig.ca = fs.readFileSync(path.join(__dirname, '../cert/ca.crt'));
} catch(e) {
  console.log(e);
}

module.exports = sslConfig;
