const dns = require('dns');
const mongoose = require('mongoose');
const config = require('./env');
const logger = require('./logger');

// Classify an error without ever exposing its message (it may contain the URI).
function classifyDbError(err) {
  const msg = ((err && err.message) || '').toLowerCase();
  const name = ((err && err.name) || '').toLowerCase();
  if (/querysrv|getaddrinfo|enotfound|ebadresp/.test(msg)) return 'dns';
  if (/auth/.test(msg) || err?.code === 18 || err?.code === 8000) return 'auth';
  if (/ssl|tls|certificate/.test(msg)) return 'tls';
  if (/timed out|timeout|serverselection/.test(msg + name)) return 'timeout';
  if (/econnrefused|econnreset|network/.test(msg)) return 'network';
  return 'other';
}

const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];
const getDbState = () => STATES[mongoose.connection.readyState] || 'unknown';

let listenersAttached = false;
function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  mongoose.connection.on('error', (err) =>
    logger.error({ category: classifyDbError(err) }, 'MongoDB connection error')
  );
}

async function connectDB(uri = config.mongoUri) {
  attachListeners();
  if (config.dnsServers.length) dns.setServers(config.dnsServers);
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 10 });
  } catch (err) {
    logger.error({ category: classifyDbError(err) }, 'MongoDB initial connection failed');
    throw new Error('Database connection failed (' + classifyDbError(err) + ')');
  }
}

// Cheap round-trip used by readiness checks and metrics.
async function pingDB() {
  if (mongoose.connection.readyState !== 1) return false;
  try {
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (err) {
    logger.error({ category: classifyDbError(err) }, 'MongoDB ping failed');
    return false;
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB, pingDB, getDbState, classifyDbError };

