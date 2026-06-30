import { createApp } from './app.js';
import { config } from './utils/config.js';
import { pool } from './utils/db.js';
import { logger } from './utils/logger.js';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`DevCity API listening on port ${config.port}`);
});

async function shutdown() {
  logger.info('Shutting down...');
  server.close();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
