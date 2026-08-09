import assert from 'node:assert/strict';
import test from 'node:test';

import { createRedisRoomStore } from '../lib/redis-room-store.js';

test('configurable room stores isolate game namespaces and normalize room codes', async () => {
  const first = createRedisRoomStore({
    namespace: 'test-one',
    memoryKey: '__testRoomStoreOne',
    missingRedisMessage: 'missing',
  });
  const second = createRedisRoomStore({
    namespace: 'test-two',
    memoryKey: '__testRoomStoreTwo',
    missingRedisMessage: 'missing',
  });
  await first.save({ roomCode: 'abc12', value: 1 });
  assert.equal((await first.load('ABC12')).value, 1);
  assert.equal(await second.load('abc12'), null);
});
