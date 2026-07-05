import { z } from "zod";

export const roleSchema = z.enum(["technician", "supervisor", "rag_admin"]);

export const userProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  full_name: z.string(),
  role: roleSchema,
  plant_id: z.string(),
});

export const authSessionSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number(),
  user: userProfileSchema,
});

export const procedureStepSchema = z.object({
  index: z.number().int().nonnegative(),
  title: z.string(),
  description: z.string(),
  estimated_minutes: z.number(),
  critical: z.boolean(),
  requires_photo: z.boolean(),
  photo_criteria: z.string().nullable(),
});

export const workOrderSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: z.enum(["preventive", "corrective"]),
  priority: z.enum(["low", "med", "high"]),
  status: z.enum(["pending", "in_progress", "paused", "completed", "cancelled"]),
  asset: z.object({
    id: z.string(),
    tag: z.string(),
    name: z.string(),
    model: z.string(),
  }),
  assigned_to: z.object({ id: z.string(), full_name: z.string() }),
  planned_start: z.string(),
  planned_end: z.string(),
  procedure_template_id: z.string(),
  procedure_name: z.string().optional(),
  estimated_minutes: z.number().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});
