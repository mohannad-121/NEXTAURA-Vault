import test from 'node:test';
import assert from 'node:assert/strict';
import type { Credential } from '@workspace/api-client-react';
import { filterCredentials } from './filter';

const rows: Credential[] = [
  { id: '1', division: 'agency', platform: 'github', accountName: 'Main repo', username: 'founder@fake.test', favorite: false, createdAt: '', updatedAt: '' },
  { id: '2', division: 'ai', platform: 'openai', accountName: 'Research', username: 'lab@fake.test', favorite: true, createdAt: '', updatedAt: '' },
];

test('searches platform, username and account name case-insensitively', () => {
  assert.deepEqual(filterCredentials(rows, 'GIT', 'all').map((row) => row.id), ['1']);
  assert.deepEqual(filterCredentials(rows, 'LAB@', 'all').map((row) => row.id), ['2']);
  assert.deepEqual(filterCredentials(rows, 'main REPO', 'all').map((row) => row.id), ['1']);
});

test('filters divisions without exposing unrelated rows', () => {
  assert.deepEqual(filterCredentials(rows, '', 'ai').map((row) => row.id), ['2']);
  assert.deepEqual(filterCredentials(rows, 'repo', 'ai'), []);
});
