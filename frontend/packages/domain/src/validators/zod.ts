import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(['technician', 'supervisor', 'rag_admin']),
  plantId: z.string().uuid(),
});

export const WorkOrderSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  status: z.enum(['pending', 'in_progress', 'paused', 'completed', 'cancelled']),
  priority: z.enum(['low', 'med', 'high']),
  procedureName: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
});

export type UserInput = z.infer<typeof UserSchema>;
export type WorkOrderInput = z.infer<typeof WorkOrderSchema>;
