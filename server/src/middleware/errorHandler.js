const logger = require('../config/logger');
const config = require('../config/env');
const m = require('../metrics/registry');
const { classifyDbError } = require('../config/db');

module.exports = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.isOperational ? err.message : 'Internal server error';
  let details = err.details;

  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ' + err.path;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = 'Duplicate value for ' + field;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body too large';
  } else if (/^Mongo/.test(err.name || '')) {
    m.dbErrorsTotal.inc({ type: classifyDbError(err) });
    status = 503;
    message = 'Database error';
  }

  if (status >= 500) {
    logger.error({ err: { name: err.name, stack: config.isProd ? undefined : err.stack }, path: req.path }, 'Request failed');
  }

  res.status(status).json({ status: 'error', message, ...(details ? { details } : {}) });
};
