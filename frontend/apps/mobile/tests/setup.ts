import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import { fetch, Headers, Request, Response } from 'undici';

Object.assign(globalThis, {
  fetch,
  Headers,
  Request,
  Response,
});

if (typeof globalThis.File === 'undefined' || typeof globalThis.File.prototype.arrayBuffer !== 'function') {
  globalThis.File = NodeFile as unknown as typeof File;
  globalThis.Blob = NodeBlob as unknown as typeof Blob;
}

afterEach(() => {
  cleanup();
});
