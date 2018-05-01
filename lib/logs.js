const express = require('express');
const serveIndex = require('serve-index');
const env = require('./env');
module.exports = (req, res, next) => {
  if (/\./.test(req.originalUrl))
    return express.static(env.get('LOG_DIR'))(req, res, next);
  serveIndex(env.get('LOG_DIR'))(req, res, next);
};
