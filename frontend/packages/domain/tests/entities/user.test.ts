import { describe, expect, it } from 'vitest';

import type { User } from '../../src/entities/user';
import { UserSchema, WorkOrderSchema } from '../../src/validators/zod';

const validUser: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'juan@planta.com',
  fullName: 'Juan Pérez',
  role: 'technician',
  plantId: '660e8400-e29b-41d4-a716-446655440001',
};

describe('User entity', () => {
  it('satisfies User type at compile time', () => {
    const user: User = validUser;
    expect(user.role).toBe('technician');
  });

  it('validates a correct user with zod', () => {
    const result = UserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('rejects invalid role at runtime', () => {
    const result = UserSchema.safeParse({
      ...validUser,
      role: 'admin',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email at runtime', () => {
    const result = UserSchema.safeParse({
      ...validUser,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});

describe('WorkOrderSchema', () => {
  it('validates a minimal work order', () => {
    const result = WorkOrderSchema.safeParse({
      id: '770e8400-e29b-41d4-a716-446655440002',
      code: 'OT-1234',
      status: 'pending',
      priority: 'high',
      procedureName: 'MP-Compresor-C3-v3',
      estimatedMinutes: 90,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = WorkOrderSchema.safeParse({
      id: '770e8400-e29b-41d4-a716-446655440002',
      code: 'OT-1234',
      status: 'unknown',
      priority: 'high',
      procedureName: 'MP-Compresor-C3-v3',
      estimatedMinutes: 90,
    });
    expect(result.success).toBe(false);
  });
});
