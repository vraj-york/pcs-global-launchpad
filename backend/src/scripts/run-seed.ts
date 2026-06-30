import { pool } from '../utils/db.js';
import { logger } from '../utils/logger.js';
import { runSeed } from './seed.js';

runSeed()
  .then(() => pool.end())
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
