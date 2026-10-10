import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

// The Monopoly engine is TypeScript, so (like game-rules.test.mjs) this loads it through Vite.
const root = fileURLToPath(new URL('..', import.meta.url));
const lib = (file) => fileURLToPath(new URL(`../../lib/${file}`, import.meta.url));
const vite = await createServer({
  root,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true, fs: { strict: false } }
});

const { monopolyAdapter } = await vite.ssrLoadModule('/src/roomAdapter.ts');
const { createEngineRoom } = await vite.ssrLoadModule(lib('engine-room.js'));
const { createEngineRoomRoutes } = await vite.ssrLoadModule(lib('engine-room-route.js'));
const { createSupabaseRoomStore } = await vite.ssrLoadModule(lib('supabase-server-room-store.js'));

let counter = 0;
const newRoom = () => {
  const store = createSupabaseRoomStore({ namespace: 'monopoly-adapter-test', memoryKey: `__monoAdapter${counter += 1}${Math.random()}`, environment: {} });
  return { store, room: createEngineRoom({ store, adapter: monopolyAdapter }) };
};

/** Host + guest + a local seat, started, with the turn handed to `turnOf`. */
async function started(turnOf = 'host') {
  const { store, room } = newRoom();
  const host = await room.create({ name: 'Host', options: { piece: 'car' } });
  const code = host.state.roomCode;
  const guest = await room.join({ roomCode: code, name: 'Guest', options: { piece: 'hat' } });
  await room.act({ roomCode: code, token: host.token, action: 'addLocal' });
  await room.act({ roomCode: code, token: host.token, action: 'start' });
  const game = await store.load(code);
  const local = game.players.find((p) => p.id.startsWith('local-'));
  const ids = { host: host.playerId, guest: guest.playerId, local: local.id };
  const index = game.players.findIndex((p) => p.id === ids[turnOf]);
  game.currentPlayerIndex = index;
  game.turnStage = 'roll';
  await store.save(game);
  const send = (seat, action, args = {}) => room.act({ roomCode: code, token: seat.token, action, args });
  const set = async (change) => { const g = await store.load(code); change(g, ids); await store.save(g); };
  return { store, room, code, host, guest, ids, send, set, load: () => store.load(code) };
}

const snapshot = (game) => JSON.stringify({ ...game, log: undefined, updatedAt: undefined });

test('the lobby: piece choice, a taken piece, and a started game refuse a late joiner', async () => {
  const { store, room } = newRoom();
  const host = await room.create({ name: 'Host', options: { piece: 'ship' } });
  const code = host.state.roomCode;
  assert.equal((await store.load(code)).players[0].piece, 'ship');
  await assert.rejects(() => room.join({ roomCode: code, name: 'Twin', options: { piece: 'ship' } }), /already taken/);
  const guest = await room.join({ roomCode: code, name: 'Guest', options: { piece: 'hat' } });
  assert.equal((await store.load(code)).players[1].piece, 'hat');
  await assert.rejects(() => room.act({ roomCode: code, token: guest.token, action: 'start' }), /Only the host/);
  await assert.rejects(() => room.act({ roomCode: code, token: guest.token, action: 'addComputer' }), /Only the host/);
  await assert.rejects(() => room.act({ roomCode: code, token: guest.token, action: 'setHouseRules', args: { enabled: true } }), /Only the host/);
  await room.act({ roomCode: code, token: host.token, action: 'start' });
  await assert.rejects(() => room.join({ roomCode: code, name: 'Late' }), /full or has already started/);
});

test('only the current player can roll, and a die value in the request is ignored', async () => {
  const t = await started('guest');
  const before = snapshot(await t.load());
  await assert.rejects(() => t.send(t.host, 'roll'), /not available/);
  assert.equal(snapshot(await t.load()), before);

  const realRandom = Math.random;
  const sequence = [0.99, 0.99]; // two sixes from the server's own random source
  Math.random = () => sequence.shift() ?? 0;
  let state;
  try {
    state = (await t.send(t.guest, 'roll', { dieOne: 1, dieTwo: 1, dice: [1, 1] })).state;
  } finally {
    Math.random = realRandom;
  }
  assert.deepEqual([state.lastRoll.dieOne, state.lastRoll.dieTwo], [6, 6]);
});

test('every decision belongs to one player: the right seat succeeds, any other is refused with nothing changed', async () => {
  const t = await started('guest');
  const cases = [
    { name: 'buy the pending property', action: 'buyProperty', pending: (ids) => ({ pendingPurchase: { spaceId: 1, playerId: ids.guest } }), works: (g, ids) => g.players.find((p) => p.id === ids.guest).properties.includes(1) },
    { name: 'pay a flat tax', action: 'payFlatTax', pending: (ids) => ({ pendingTax: { spaceId: 4, playerId: ids.guest, flatAmount: 200, percentAmount: 150 } }), works: (g, ids) => g.players.find((p) => p.id === ids.guest).money < 1500 },
    { name: 'acknowledge rent', action: 'acknowledgeRent', pending: (ids) => ({ pendingRent: { spaceId: 1, payerId: ids.guest, ownerId: ids.host, amount: 2, isMortgaged: false, hasMonopoly: false } }), works: (g) => g.pendingRent === null },
    { name: 'settle a debt', action: 'finishDebt', pending: (ids) => ({ pendingDebt: { playerId: ids.guest, creditorId: ids.host, amountOwed: 10, reason: 'test' } }), works: (g) => g.pendingDebt === null },
    { name: 'bid in an auction', action: 'bid', pending: (ids) => ({ pendingAuction: { spaceId: 1, currentBid: 0, highBidderId: null, activePlayerId: ids.guest, passedPlayerIds: [] } }), works: (g) => g.pendingAuction?.currentBid === 10 },
    { name: 'pass in an auction', action: 'passAuction', pending: (ids) => ({ pendingAuction: { spaceId: 1, currentBid: 0, highBidderId: null, activePlayerId: ids.guest, passedPlayerIds: [] } }) },
    { name: 'answer a card', action: 'acknowledgeCard', pending: (ids) => ({ pendingCard: { id: 'chance-test', deck: 'chance', title: 't', text: 't', actionText: 't', playerId: ids.guest } }), refuseOnly: true },
    { name: 'resolve a forced jail exit', action: 'payForcedJailExit', pending: (ids) => ({ pendingJailExit: { playerId: ids.guest, dieOne: 1, dieTwo: 2 } }), refuseOnly: true },
    { name: 'roll for utility rent', action: 'rollUtilityRent', pending: (ids) => ({ pendingUtilityRent: { spaceId: 12, payerId: ids.guest, ownerId: ids.host, multiplier: 4 } }) }
  ];
  for (const c of cases) {
    const reset = async () => t.set((g, ids) => {
      for (const key of ['pendingPurchase', 'pendingTax', 'pendingRent', 'pendingDebt', 'pendingAuction', 'pendingCard', 'pendingJailExit', 'pendingUtilityRent', 'pendingTrade']) g[key] = null;
      Object.assign(g, c.pending(ids));
    });
    await reset();
    const before = snapshot(await t.load());
    for (const wrong of [t.host]) {
      await assert.rejects(() => t.send(wrong, c.action), /not available/, `${c.name}: wrong seat`);
    }
    assert.equal(snapshot(await t.load()), before, `${c.name}: refused move changed the game`);
    if (!c.refuseOnly) {
      await t.send(t.guest, c.action);
      const after = await t.load();
      assert.notEqual(snapshot(after), before, `${c.name}: right seat's move changed the game`);
      if (c.works) assert.ok(c.works(after, t.ids), `${c.name}: right seat's move took effect`);
    }
  }
});

test('trades: only the recipient answers, any seat may ask for expiry, and the server clock decides', async () => {
  const t = await started('host');
  const trade = (ids, expiresAt) => ({ id: 'trade-1', expiresAt, fromPlayerId: ids.host, toPlayerId: ids.guest, offeredPropertyIds: [], requestedPropertyIds: [], offeredMoney: 0, requestedMoney: 0, offeredJailCards: 0, requestedJailCards: 0 });
  await t.set((g, ids) => { g.turnStage = 'manage'; g.pendingTrade = trade(ids, Date.now() + 60_000); });
  await assert.rejects(() => t.send(t.host, 'acceptTrade'), /not available/);
  await assert.rejects(() => t.send(t.host, 'declineTrade'), /not available/);

  // Too early to expire: asking changes nothing.
  await assert.rejects(() => t.send(t.guest, 'expireTrade', { tradeId: 'trade-1' }), /not available/);
  assert.equal((await t.load()).pendingTrade?.id, 'trade-1');

  await t.set((g) => { g.pendingTrade.expiresAt = Date.now() - 1000; });
  await t.send(t.host, 'expireTrade', { tradeId: 'trade-1' });
  assert.equal((await t.load()).pendingTrade, null);

  await t.set((g, ids) => { g.pendingTrade = trade(ids, Date.now() + 60_000); });
  await t.send(t.guest, 'declineTrade');
  assert.equal((await t.load()).pendingTrade, null);
});

test('proposing a trade and managing property are for the acting player only', async () => {
  const t = await started('host');
  await t.set((g, ids) => {
    g.turnStage = 'manage';
    g.players.find((p) => p.id === ids.guest).properties = [1];
    g.players.find((p) => p.id === ids.host).properties = [3];
  });
  const before = snapshot(await t.load());
  // The guest cannot mortgage the host's property by naming the host.
  await assert.rejects(() => t.send(t.guest, 'mortgage', { playerId: t.ids.host, spaceId: 3 }), /not available/);
  // Nor claim to be the host in a trade.
  await assert.rejects(() => t.send(t.guest, 'mortgage', { playerId: t.ids.guest, spaceId: 3 }), /not available/);
  assert.equal(snapshot(await t.load()), before);

  await t.send(t.guest, 'mortgage', { playerId: t.ids.guest, spaceId: 1 });
  assert.deepEqual((await t.load()).players.find((p) => p.id === t.ids.guest).mortgagedProperties, [1]);

  await t.send(t.host, 'proposeTrade', { toPlayerId: t.ids.guest, offeredPropertyIds: [3], requestedPropertyIds: [], offeredMoney: 0, requestedMoney: 10 });
  const pending = (await t.load()).pendingTrade;
  assert.equal(pending.fromPlayerId, t.ids.host, 'the proposer is the sender, not a name in the request');
});

test('the host acts for local seats and for nobody else', async () => {
  const t = await started('guest');
  await t.set((g, ids) => { g.currentPlayerIndex = g.players.findIndex((p) => p.id === ids.local); });
  const before = snapshot(await t.load());
  // The guest may not name a local seat; the host may not name another human or itself via another's id.
  await assert.rejects(() => t.send(t.guest, 'roll', { asPlayerId: t.ids.local }), /cannot act for that player/);
  await assert.rejects(() => t.send(t.host, 'roll', { asPlayerId: t.ids.guest }), /cannot act for that player/);
  await assert.rejects(() => t.send(t.host, 'roll', { asPlayerId: 'local-nobody' }), /cannot act for that player/);
  await assert.rejects(() => t.send(t.host, 'roll'), /not available/); // it is the local seat's turn, not the host's
  assert.equal(snapshot(await t.load()), before);
  const state = (await t.send(t.host, 'roll', { asPlayerId: t.ids.local })).state;
  assert.ok(state.lastRoll, 'the host rolled for the local seat');
  assert.equal(state.lastRoll.playerId, t.ids.local);
});

test('computer steps are host only', async () => {
  const t = await started('host');
  const { room, code } = t;
  await assert.rejects(() => room.computerStep({ roomCode: code, token: t.guest.token }), /Only the host/);
  await room.computerStep({ roomCode: code, token: t.host.token }); // nothing due: a no-op
});

test('the Monopoly routes expose GET and POST only', async () => {
  const { monopolyRoutes } = await vite.ssrLoadModule(lib('monopoly-engine-room.js'));
  assert.ok(monopolyRoutes, 'the Monopoly engine room module loads');
  assert.equal('PUT' in monopolyRoutes.item, false);
  assert.equal(typeof monopolyRoutes.item.POST, 'function');
  assert.equal(typeof monopolyRoutes.collection.POST, 'function');
  void createEngineRoomRoutes;
});

test.after(async () => { await vite.close(); });
