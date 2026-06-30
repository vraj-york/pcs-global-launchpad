import { Router } from 'express';
import { getCityStats, listAchievements, listShopItems } from '../services/developerService.js';
import { sendData, sendError } from '../utils/response.js';

export const cityRouter = Router();
export const shopItemsRouter = Router();
export const achievementsRouter = Router();

cityRouter.get('/stats', async (_req, res) => {
  try {
    const data = await getCityStats();
    sendData(res, data);
  } catch (err) {
    sendError(res, err);
  }
});

shopItemsRouter.get('/', async (_req, res) => {
  try {
    const data = await listShopItems();
    sendData(res, data);
  } catch (err) {
    sendError(res, err);
  }
});

achievementsRouter.get('/', async (_req, res) => {
  try {
    const data = await listAchievements();
    sendData(res, data);
  } catch (err) {
    sendError(res, err);
  }
});
