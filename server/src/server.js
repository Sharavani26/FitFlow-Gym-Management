const config = require('./config/env');
const logger = require('./config/logger');
const { connectDB, disconnectDB } = require('./config/db');
const { startDbMonitor, stopDbMonitor } = require('./metrics/dbMonitor');
const app = require('./app');

async function main() {
  try {
    await connectDB();
  } catch (e) {
    logger.error('Could not start: ' + e.message);
    process.exit(1);
  }
  startDbMonitor();
  const server = app.listen(config.port, () => logger.info('FitFlow API listening on port ' + config.port));

  const shutdown = (signal) => {
    logger.info(signal + ' received, shutting down');
    stopDbMonitor();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
