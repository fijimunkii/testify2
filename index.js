process.setMaxListeners(0);
const env = require('./env');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.use(require('body-parser').json());

app.use(require('hpp')());

app.use('/testify', require('./testify'));

app.use('/logs', require('./logs'));

var port = env.get('PORT')||5555;
app.listen(port, () => console.log('http://localhost:'+port));
