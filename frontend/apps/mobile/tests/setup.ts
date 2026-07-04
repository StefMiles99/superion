import '@testing-library/jest-dom/vitest';
import { fetch, Headers, Request, Response } from 'undici';

Object.assign(globalThis, {
  fetch,
  Headers,
  Request,
  Response,
});
