const mongoose = require('mongoose');
const m = require('./registry');
const { pingDB } = require('../config/db');

let timer = null;

async function check() {
  m.dbConnectionState.set(mongoose.connection.readyState);
  const end = m.dbPingDuration.startTimer();
  const ok = await pingDB();
  end();
  m.dbUp.set(ok ? 1 : 0);
  if (!ok) m.dbErrorsTotal.inc({ type: 'ping' });
}

function startDbMonitor(intervalMs = 15000) {
  if (timer) return;
  check();
  timer = setInterval(check, intervalMs);
  timer.unref();
}

function stopDbMonitor() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { startDbMonitor, stopDbMonitor, check };
