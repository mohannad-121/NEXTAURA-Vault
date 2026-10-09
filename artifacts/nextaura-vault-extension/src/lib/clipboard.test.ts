import test from 'node:test';
import assert from 'node:assert/strict';
import { copyRevealedPassword } from './clipboard';

test('copies a fake revealed password only after the reveal succeeds', async () => {
  const writes: string[] = [];
  await copyRevealedPassword(
    'fake-credential-id',
    async () => ({ password: 'fake-test-password-only' }),
    async (value) => { writes.push(value); },
  );
  assert.deepEqual(writes, ['fake-test-password-only']);
});

test('does not write or resolve successfully when reveal is rejected', async () => {
  let wrote = false;
  await assert.rejects(() => copyRevealedPassword(
    'fake-credential-id',
    async () => { throw new Error('Cross-site request rejected.'); },
    async () => { wrote = true; },
  ), /Cross-site request rejected/);
  assert.equal(wrote, false);
});

test('does not resolve successfully when clipboard writing fails', async () => {
  await assert.rejects(() => copyRevealedPassword(
    'fake-credential-id',
    async () => ({ password: 'fake-test-password-only' }),
    async () => { throw new Error('Clipboard denied.'); },
  ), /Clipboard denied/);
});
