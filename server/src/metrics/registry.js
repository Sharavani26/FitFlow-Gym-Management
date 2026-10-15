const client = require('prom-client');

const register = new client.Registry();
register.setDefaultLabels({ app: 'fitflow-api' });

// Node.js process metrics: CPU, resident/heap memory, event loop lag, GC, handles, uptime
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

const httpRequestsInFlight = new client.Gauge({
  name: 'http_requests_in_flight',
  help: 'HTTP requests currently being processed',
  registers: [register],
});

const dbConnectionState = new client.Gauge({
  name: 'fitflow_db_connection_state',
  help: 'Mongoose readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting',
  registers: [register],
});

const dbUp = new client.Gauge({
  name: 'fitflow_db_up',
  help: '1 if the last database ping succeeded, otherwise 0',
  registers: [register],
});

const dbPingDuration = new client.Histogram({
  name: 'fitflow_db_ping_duration_seconds',
  help: 'Database ping duration in seconds',
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const dbErrorsTotal = new client.Counter({
  name: 'fitflow_db_errors_total',
  help: 'Database errors by category (auth, network, timeout, other)',
  labelNames: ['type'],
  registers: [register],
});

const authFailuresTotal = new client.Counter({
  name: 'fitflow_auth_failures_total',
  help: 'Failed login attempts',
  registers: [register],
});

// Make sure the series exist from the first scrape.
dbUp.set(0);
dbConnectionState.set(0);

module.exports = {
  register,
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestsInFlight,
  dbConnectionState,
  dbUp,
  dbPingDuration,
  dbErrorsTotal,
  authFailuresTotal,
};
