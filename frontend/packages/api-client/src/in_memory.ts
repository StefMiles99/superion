import type { LoginInput, LoginResponse, RefreshInput } from '@superion/domain';
import { AuthError } from '@superion/domain';
import type { IApiClient, Paginated } from '@superion/domain';
import type { User } from '@superion/domain';
import type { WorkOrder } from '@superion/domain';

const MOCK_PASSWORD = 'test1234';
const TOKEN_EXPIRES_IN = 3600;

const FIXTURE_USERS: User[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'juan@planta.com',
    fullName: 'Juan Pérez',
    role: 'technician',
    plantId: '660e8400-e29b-41d4-a716-446655440001',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'maria@planta.com',
    fullName: 'María García',
    role: 'technician',
    plantId: '660e8400-e29b-41d4-a716-446655440001',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'pedro@planta.com',
    fullName: 'Pedro López',
    role: 'technician',
    plantId: '660e8400-e29b-41d4-a716-446655440001',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'ana@planta.com',
    fullName: 'Ana Ruiz',
    role: 'supervisor',
    plantId: '660e8400-e29b-41d4-a716-446655440001',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    email: 'admin@planta.com',
    fullName: 'Admin Sistema',
    role: 'rag_admin',
    plantId: '660e8400-e29b-41d4-a716-446655440001',
  },
];

const FIXTURE_WORK_ORDERS: WorkOrder[] = [
  {
    id: '770e8400-e29b-41d4-a716-446655440002',
    code: 'OT-1234',
    status: 'pending',
    priority: 'high',
    procedureName: 'MP-Compresor-C3-v3',
    estimatedMinutes: 90,
  },
];

function base64Encode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return globalThis.btoa(binary);
}

export function createMockJwt(user: User, expiresIn: number, now: number): string {
  const header = base64Encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(now / 1000) + expiresIn;
  const payload = base64Encode(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      plant_id: user.plantId,
      exp,
    }),
  );
  const signature = base64Encode('mock-signature');
  return `${header}.${payload}.${signature}`;
}

function createMockRefreshToken(userId: string): string {
  return `v1.mock.${userId}`;
}

export class InMemoryApiClient implements IApiClient {
  private users: User[] = FIXTURE_USERS.map((user) => ({ ...user }));
  private workOrders: WorkOrder[] = FIXTURE_WORK_ORDERS.map((wo) => ({ ...wo }));
  private currentUser: User | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private now: () => number = () => Date.now();

  setClock(now: () => number): void {
    this.now = now;
  }

  setTokens(accessToken: string | null, refreshToken?: string | null): void {
    this.accessToken = accessToken;
    if (refreshToken !== undefined) {
      this.refreshToken = refreshToken;
    }
  }

  async login(input: LoginInput): Promise<LoginResponse> {
    const user = this.users.find((fixture) => fixture.email === input.email);
    if (!user || input.password !== MOCK_PASSWORD) {
      throw new AuthError('Credenciales inválidas');
    }

    const timestamp = this.now();
    const accessToken = createMockJwt(user, TOKEN_EXPIRES_IN, timestamp);
    const refreshToken = createMockRefreshToken(user.id);

    this.currentUser = { ...user };
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    return {
      accessToken,
      refreshToken,
      expiresIn: TOKEN_EXPIRES_IN,
      user: { ...user },
    };
  }

  async refresh(input: RefreshInput): Promise<LoginResponse> {
    const user = this.users.find(
      (fixture) => createMockRefreshToken(fixture.id) === input.refreshToken,
    );
    if (!user) {
      throw new AuthError('Refresh token inválido');
    }

    const timestamp = this.now();
    const accessToken = createMockJwt(user, TOKEN_EXPIRES_IN, timestamp);
    const refreshToken = createMockRefreshToken(user.id);

    this.currentUser = { ...user };
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    return {
      accessToken,
      refreshToken,
      expiresIn: TOKEN_EXPIRES_IN,
      user: { ...user },
    };
  }

  async logout(): Promise<void> {
    this.currentUser = null;
    this.accessToken = null;
    this.refreshToken = null;
  }

  async me(): Promise<User> {
    if (!this.currentUser) {
      throw new AuthError('No autenticado');
    }
    return { ...this.currentUser };
  }

  async listWorkOrders(): Promise<Paginated<WorkOrder>> {
    return {
      items: this.workOrders.map((wo) => ({ ...wo })),
      nextCursor: null,
    };
  }

  async healthCheck(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  reset(): void {
    this.users = FIXTURE_USERS.map((user) => ({ ...user }));
    this.workOrders = FIXTURE_WORK_ORDERS.map((wo) => ({ ...wo }));
    this.currentUser = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.now = () => Date.now();
  }
}
