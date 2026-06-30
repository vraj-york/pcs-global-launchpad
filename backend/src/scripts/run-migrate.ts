import { pool } from '../utils/db.js';
import { logger } from '../utils/logger.js';
import { runMigrations } from './migrate.js';

runMigrations()
  .then(() => {
    logger.info('Migrations complete');
    return pool.end();
  })
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
