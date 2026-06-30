import { Router } from 'express';
import {
  getDeveloperById,
  listDevelopers,
  updateCustomization,
} from '../services/developerService.js';
import { sendData, sendError } from '../utils/response.js';
import { customizationSchema, listDevelopersQuerySchema } from '../utils/validation.js';
import { badRequest } from '../utils/errors.js';

export const developersRouter = Router();

developersRouter.get('/', async (req, res) => {
  try {
    const parsed = listDevelopersQuerySchema.safeParse(req.query);
    if (!parsed.success) throw badRequest(parsed.error.message);
    const { q, limit } = parsed.data;
    const data = await listDevelopers(q, limit);
    sendData(res, data);
  } catch (err) {
    sendError(res, err);
  }
});

developersRouter.get('/:id', async (req, res) => {
  try {
    const data = await getDeveloperById(req.params.id);
    sendData(res, data);
  } catch (err) {
    sendError(res, err);
  }
});

developersRouter.patch('/:id/customizations', async (req, res) => {
  try {
    const parsed = customizationSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.message);
    const data = await updateCustomization(req.params.id, parsed.data);
    sendData(res, data);
  } catch (err) {
    sendError(res, err);
  }
});
