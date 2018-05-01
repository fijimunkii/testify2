process.setMaxListeners(0);

const env = require('./lib/env');
const os = require('os');
if (!env.get('LOG_DIR')) env.set('LOG_DIR', os.tmpdir());

const express = require('express');
const app = express();
app.use(require('body-parser').json());
app.use(require('hpp')());

app.use('/testify', require('./testify'));
app.use('/logs', require('./lib/logs'));

const port = env.get('PORT')||5555;
app.listen(port, () => console.log(`Listening at http://localhost:${port}`));
