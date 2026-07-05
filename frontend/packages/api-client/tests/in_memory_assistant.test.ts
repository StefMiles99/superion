import { describe, expect, it } from 'vitest';

import { validateAssistantAnswer } from '@superion/domain';

import { InMemoryApiClient } from '../src/in_memory';

const OT_1234_ID = '770e8400-e29b-41d4-a716-446655440000';

async function loginAndStartSession(client: InMemoryApiClient) {
  await client.login({ email: 'juan@planta.com', password: 'test1234' });
  return client.startSession(OT_1234_ID);
}

describe('InMemoryApiClient.askAssistant', () => {
  it('returns answer with 1-2 citations for torque questions', async () => {
    const client = new InMemoryApiClient();
    const started = await loginAndStartSession(client);

    const answer = await client.askAssistant(started.sessionId, '¿cuál es el torque?');

    expect(() => validateAssistantAnswer(answer)).not.toThrow();
    expect(answer.citations.length).toBeGreaterThanOrEqual(1);
    expect(answer.citations.length).toBeLessThanOrEqual(2);
    expect(answer.answerText.toLowerCase()).toContain('torque');
    expect(answer.citations.some((citation) => citation.page === 42)).toBe(true);
  });

  it('rejects unauthenticated requests', async () => {
    const client = new InMemoryApiClient();

    await expect(client.askAssistant('sess-1', '¿cuál es el torque?')).rejects.toThrow(
      /autenticado/i,
    );
  });
});
