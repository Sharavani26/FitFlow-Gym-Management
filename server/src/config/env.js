const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
const problems = [];

const get = (name) => (process.env[name] || '').trim();

const mongoUri = get('MONGODB_URI');
const jwtSecret = get('JWT_SECRET');
const metricsToken = get('METRICS_TOKEN');
const clientOrigin = get('CLIENT_ORIGIN') || (isProd ? '' : 'http://localhost:5173');
const port = Number(get('PORT') || 5000);

// Only variable NAMES appear in messages, never their values.
if (!mongoUri) problems.push('MONGODB_URI is missing');
else if (!/^mongodb(\+srv)?:\/\//.test(mongoUri)) problems.push('MONGODB_URI must start with mongodb:// or mongodb+srv://');
else if (mongoUri.includes('<') || mongoUri.includes('REPLACE_ME')) problems.push('MONGODB_URI still contains a placeholder');

if (jwtSecret.length < 32 || jwtSecret === 'REPLACE_ME') problems.push('JWT_SECRET must be at least 32 characters');
if (metricsToken.length < 32 || metricsToken === 'REPLACE_ME') problems.push('METRICS_TOKEN must be at least 32 characters');
if (jwtSecret && jwtSecret === metricsToken) problems.push('JWT_SECRET and METRICS_TOKEN must be different');
if (!clientOrigin) problems.push('CLIENT_ORIGIN is required in production');
if (!Number.isInteger(port) || port < 1 || port > 65535) problems.push('PORT must be a valid port number');

if (problems.length) {
  const message = 'Invalid environment configuration:\n - ' + problems.join('\n - ');
  if (NODE_ENV === 'test') throw new Error(message);
  console.error(message);
  process.exit(1);
}

module.exports = Object.freeze({
  env: NODE_ENV,
  isProd,
  port,
  mongoUri,
  jwtSecret,
  jwtExpiresIn: get('JWT_EXPIRES_IN') || '1d',
  metricsToken,
  clientOrigin,
  dnsServers: get('DNS_SERVERS').split(',').map((s) => s.trim()).filter(Boolean),
  logLevel: get('LOG_LEVEL') || (isProd ? 'info' : 'debug'),
});

