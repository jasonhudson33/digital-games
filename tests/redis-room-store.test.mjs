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

test('a failed Redis connection stops retrying and allows a later request to retry', async () => {
  const originalRedisUrl = process.env.REDIS_URL;
  let attempts = 0;
  let clientOptions;
  const store = createRedisRoomStore({
    namespace: 'connection-test',
    memoryKey: '__connectionTestRooms',
    missingRedisMessage: 'missing',
    redisClientFactory(options) {
      clientOptions = options;
      return {
        on() {},
        async connect() {
          attempts += 1;
          throw new Error('unreachable');
        },
      };
    },
  });
  process.env.REDIS_URL = 'redis://unreachable.invalid:6379';

  try {
    await assert.rejects(store.save({ roomCode: 'FAIL1' }), /Could not connect to room storage/);
    await assert.rejects(store.save({ roomCode: 'FAIL2' }), /Could not connect to room storage/);
    assert.equal(attempts, 2);
    assert.deepEqual(clientOptions.socket, {
      connectTimeout: 5000,
      reconnectStrategy: false,
    });
  } finally {
    if (originalRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedisUrl;
  }
});
