import { describe, expect, it } from 'vitest';

import { ApiError } from '../src/errors';
import { InMemoryApiClient } from '../src/in_memory';

const OT_1234_ID = '770e8400-e29b-41d4-a716-446655440000';
const TECHNICIAN_ID = '550e8400-e29b-41d4-a716-446655440000';

async function loginAsTechnician(client: InMemoryApiClient) {
  await client.login({ email: 'juan@planta.com', password: 'test1234' });
}

describe('InMemoryApiClient session methods', () => {
  it('getWorkOrder returns detail for seeded OT', async () => {
    const client = new InMemoryApiClient();
    await loginAsTechnician(client);

    const detail = await client.getWorkOrder(OT_1234_ID);

    expect(detail.code).toBe('OT-1234');
    expect(detail.description).toBeTruthy();
    expect(detail.procedureTemplateId).toBeTruthy();
  });

  it('startSession creates session and marks work order in progress', async () => {
    const client = new InMemoryApiClient();
    await loginAsTechnician(client);

    const started = await client.startSession(OT_1234_ID);

    expect(started.sessionId).toBeTruthy();
    expect(started.workOrderId).toBe(OT_1234_ID);
    expect(started.procedureTemplate.steps).toHaveLength(12);
    expect(started.procedureTemplate.name).toBe('MP-Compresor-C3-v3');

    const session = await client.getSession(started.sessionId);
    expect(session.currentStepIndex).toBe(0);
    expect(session.status).toBe('active');
    expect(session.technicianId).toBe(TECHNICIAN_ID);

    const workOrder = await client.getWorkOrder(OT_1234_ID);
    expect(workOrder.status).toBe('in_progress');
  });

  it('postSessionEvent step_advance moves to next step', async () => {
    const client = new InMemoryApiClient();
    await loginAsTechnician(client);

    const started = await client.startSession(OT_1234_ID);
    const response = await client.postSessionEvent(started.sessionId, {
      eventId: 'evt-advance-1',
      type: 'step_advance',
      stepIndex: 0,
      payload: {},
    });

    expect(response.accepted).toBe(true);

    const session = await client.getSession(started.sessionId);
    expect(session.currentStepIndex).toBe(1);
  });

  it('postSessionEvent step_advance rejects with STEP_REQUIRES_PHOTO when photo missing', async () => {
    const client = new InMemoryApiClient();
    await loginAsTechnician(client);

    const started = await client.startSession(OT_1234_ID);

    for (let index = 0; index < 3; index += 1) {
      await client.postSessionEvent(started.sessionId, {
        eventId: `evt-advance-${String(index)}`,
        type: 'step_advance',
        stepIndex: index,
        payload: {},
      });
    }

    await expect(
      client.postSessionEvent(started.sessionId, {
        eventId: 'evt-advance-photo',
        type: 'step_advance',
        stepIndex: 3,
        payload: {},
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'STEP_REQUIRES_PHOTO',
    });
  });

  it('pauseSession and resumeSession toggle session status', async () => {
    const client = new InMemoryApiClient();
    await loginAsTechnician(client);

    const started = await client.startSession(OT_1234_ID);

    await client.pauseSession(started.sessionId);
    let session = await client.getSession(started.sessionId);
    expect(session.status).toBe('paused');

    await client.resumeSession(started.sessionId);
    session = await client.getSession(started.sessionId);
    expect(session.status).toBe('active');
  });

  it('startSession rejects when work order already started', async () => {
    const client = new InMemoryApiClient();
    await loginAsTechnician(client);

    await client.startSession(OT_1234_ID);

    await expect(client.startSession(OT_1234_ID)).rejects.toMatchObject({
      status: 409,
      code: 'WORK_ORDER_ALREADY_STARTED',
    });
  });

  it('getSession throws ApiError when session not found', async () => {
    const client = new InMemoryApiClient();
    await loginAsTechnician(client);

    await expect(client.getSession('missing-session')).rejects.toBeInstanceOf(ApiError);
  });
});
