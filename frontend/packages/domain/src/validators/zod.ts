import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(['technician', 'supervisor', 'rag_admin']),
  plantId: z.string().uuid(),
});

export const AuthSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.number().int().positive(),
  user: UserSchema,
});

export const WorkOrderAssetSchema = z.object({
  id: z.string().uuid(),
  tag: z.string().min(1),
  name: z.string().min(1),
});

export const WorkOrderSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  status: z.enum(['pending', 'in_progress', 'paused', 'completed', 'cancelled']),
  priority: z.enum(['low', 'med', 'high']),
  procedureName: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  asset: WorkOrderAssetSchema,
});

export type UserInput = z.infer<typeof UserSchema>;
export type WorkOrderInput = z.infer<typeof WorkOrderSchema>;
