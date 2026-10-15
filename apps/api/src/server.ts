import { loadConfig } from './config.js';
import { connectDb } from './db.js';
import { createApp } from './app.js';
import { logger } from './logger.js';

const config = loadConfig();
createApp({ db: connectDb(config.DATABASE_URL), config }).listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'Warren API listening');
});
