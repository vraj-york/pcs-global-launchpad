import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { achievementsRouter, cityRouter, shopItemsRouter } from './routes/catalog.js';
import { developersRouter } from './routes/developers.js';
import { config } from './utils/config.js';
import { sendError } from './utils/response.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    }),
  );
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: config.isProduction ? 200 : 1000,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/v1/developers', developersRouter);
  app.use('/api/v1/city', cityRouter);
  app.use('/api/v1/shop-items', shopItemsRouter);
  app.use('/api/v1/achievements', achievementsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    sendError(res, err);
  });

  return app;
}
