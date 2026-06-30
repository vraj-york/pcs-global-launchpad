import { z } from 'zod';

export const customizationSchema = z.object({
  crown: z.boolean().optional(),
  aura: z.enum(['none', 'blue', 'gold', 'purple']).optional(),
  roofEffect: z.string().optional(),
}).strict();

export const listDevelopersQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
