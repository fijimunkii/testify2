const express = require('express');
const serveIndex = require('serve-index');
module.exports = (req, res, next) => {
  if (/\./.test(req.originalUrl))
    return express.static('logs')(req, res, next);
  serveIndex('logs')(req, res, next);
};
