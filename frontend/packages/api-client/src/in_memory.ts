import type { LoginInput, LoginResponse, RefreshInput } from '@superion/domain';
import { AuthError } from '@superion/domain';
import type { IApiClient, Paginated } from '@superion/domain';
import type { User } from '@superion/domain';
import type { WorkOrder, WorkOrderFilter } from '@superion/domain';
import { matchesWorkOrderFilter } from '@superion/domain';

const MOCK_PASSWORD = 'test1234';
const TOKEN_EXPIRES_IN = 3600;
const DEFAULT_PAGE_LIMIT = 10;

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
    id: '770e8400-e29b-41d4-a716-446655440000',
    code: 'OT-1234',
    status: 'pending',
    priority: 'high',
    procedureName: 'MP-Compresor-C3-v3',
    estimatedMinutes: 90,
    asset: {
      id: '880e8400-e29b-41d4-a716-446655440000',
      tag: 'COMP-C3',
      name: 'Compresor C-3',
    },
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440001',
    code: 'OT-1235',
    status: 'pending',
    priority: 'med',
    procedureName: 'MP-Bomba-B2-v1',
    estimatedMinutes: 60,
    asset: {
      id: '880e8400-e29b-41d4-a716-446655440001',
      tag: 'PUMP-B2',
      name: 'Bomba B-2',
    },
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440002',
    code: 'OT-1236',
    status: 'pending',
    priority: 'low',
    procedureName: 'MP-Motor-M1-v2',
    estimatedMinutes: 45,
    asset: {
      id: '880e8400-e29b-41d4-a716-446655440002',
      tag: 'MOTOR-M1',
      name: 'Motor M-1',
    },
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440003',
    code: 'OT-1237',
    status: 'in_progress',
    priority: 'high',
    procedureName: 'MP-Valvula-V4',
    estimatedMinutes: 30,
    asset: {
      id: '880e8400-e29b-41d4-a716-446655440003',
      tag: 'VALV-V4',
      name: 'Válvula V-4',
    },
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440004',
    code: 'OT-1238',
    status: 'completed',
    priority: 'med',
    procedureName: 'MP-Filtro-F1',
    estimatedMinutes: 20,
    asset: {
      id: '880e8400-e29b-41d4-a716-446655440004',
      tag: 'FILT-F1',
      name: 'Filtro F-1',
    },
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

function paginateWorkOrders(
  items: WorkOrder[],
  filter: WorkOrderFilter = {},
): Paginated<WorkOrder> {
  const limit = filter.limit ?? DEFAULT_PAGE_LIMIT;
  const start = filter.cursor ? Number.parseInt(filter.cursor, 10) : 0;
  const safeStart = Number.isFinite(start) && start >= 0 ? start : 0;
  const pageItems = items.slice(safeStart, safeStart + limit);
  const nextIndex = safeStart + pageItems.length;
  const nextCursor = nextIndex < items.length ? String(nextIndex) : null;

  return {
    items: pageItems.map((item) => ({ ...item, asset: { ...item.asset } })),
    nextCursor,
  };
}

export class InMemoryApiClient implements IApiClient {
  private users: User[] = FIXTURE_USERS.map((user) => ({ ...user }));
  private workOrders: WorkOrder[] = FIXTURE_WORK_ORDERS.map((wo) => ({
    ...wo,
    asset: { ...wo.asset },
  }));
  private currentUser: User | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private now: () => number = () => Date.now();
  private listWorkOrdersError = false;

  setClock(now: () => number): void {
    this.now = now;
  }

  setListWorkOrdersError(enabled: boolean): void {
    this.listWorkOrdersError = enabled;
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

  async listWorkOrders(filter: WorkOrderFilter = {}): Promise<Paginated<WorkOrder>> {
    if (this.listWorkOrdersError) {
      throw new Error('Error simulado al listar OTs');
    }

    const filtered = this.workOrders.filter((workOrder) =>
      matchesWorkOrderFilter(workOrder, filter),
    );

    return paginateWorkOrders(filtered, filter);
  }

  async healthCheck(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  reset(): void {
    this.users = FIXTURE_USERS.map((user) => ({ ...user }));
    this.workOrders = FIXTURE_WORK_ORDERS.map((wo) => ({
      ...wo,
      asset: { ...wo.asset },
    }));
    this.currentUser = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.now = () => Date.now();
    this.listWorkOrdersError = false;
  }
}
