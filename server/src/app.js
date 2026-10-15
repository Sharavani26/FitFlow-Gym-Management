const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const pinoHttp = require('pino-http');

const config = require('./config/env');
const logger = require('./config/logger');
const { register } = require('./metrics/registry');
const metricsMiddleware = require('./middleware/metricsMiddleware');
const metricsAuth = require('./middleware/metricsAuth');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const planRoutes = require('./routes/planRoutes');
const memberRoutes = require('./routes/memberRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const statsRoutes = require('./routes/statsRoutes');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1); // Render sits behind a proxy

app.use(helmet());
app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => /^\/(metrics|health)/.test(req.url) },
    serializers: {
      req: (req) => ({ method: req.method, url: req.url.split('?')[0] }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  })
);
app.use(metricsMiddleware);

// Operational endpoints (before body parsing and rate limiting)
app.use('/health', cors({ origin: config.clientOrigin }), healthRoutes);
app.get('/metrics', metricsAuth, async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use(cors({ origin: config.clientOrigin, credentials: false }));
app.use(express.json({ limit: '100kb' }));
app.use(mongoSanitize());
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many requests. Slow down.' },
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/trainers', trainerRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/stats', statsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;