import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { fetch, Headers, Request, Response } from 'undici';

Object.assign(globalThis, {
  fetch,
  Headers,
  Request,
  Response,
});

afterEach(() => {
  cleanup();
});
