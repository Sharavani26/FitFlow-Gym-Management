const pino = require('pino');
const config = require('./env');

const redact = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-api-key"]',
    'res.headers["set-cookie"]',
    '*.password',
    '*.passwordHash',
    '*.token',
    '*.jwtSecret',
    '*.mongoUri',
    'password',
    'passwordHash',
    'token',
  ],
  censor: '[REDACTED]',
};

const options = { level: config.logLevel, redact };

if (!config.isProd && config.env !== 'test') {
  options.transport = {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
  };
}

if (config.env === 'test') options.level = 'silent';

module.exports = pino(options);
