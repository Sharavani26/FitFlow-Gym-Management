const m = require('../metrics/registry');

const SKIP = /^\/(metrics|health)(\/|$)/;

module.exports = (req, res, next) => {
  if (SKIP.test(req.path)) return next();

  const end = m.httpRequestDuration.startTimer();
  m.httpRequestsInFlight.inc();
  let done = false;
  let base = '';
  let matched;

  // Express assigns req.route when a route matches, while req.baseUrl is still set.
  Object.defineProperty(req, 'route', {
    configurable: true,
    get: () => matched,
    set(value) {
      matched = value;
      base = this.baseUrl || '';
    },
  });

  const finish = () => {
    if (done) return;
    done = true;
    m.httpRequestsInFlight.dec();
    const route = matched ? base + matched.path : 'unmatched';
    const labels = { method: req.method, route, status_code: String(res.statusCode) };
    m.httpRequestsTotal.inc(labels);
    end(labels);
  };

  res.on('finish', finish);
  res.on('close', finish);
  next();
};