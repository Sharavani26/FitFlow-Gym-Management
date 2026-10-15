const router = require('express').Router();
const { pingDB } = require('../config/db');

router.get('/', (req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() });
});

router.get('/ready', async (req, res) => {
  const dbUp = await pingDB();
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'unavailable',
    checks: { database: dbUp ? 'up' : 'down' },
  });
});

module.exports = router;
