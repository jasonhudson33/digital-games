import assert from "node:assert/strict";
import test from "node:test";

/**
 * The room tests every host-stepped game shares (platform/computer-pacing):
 * the computer speed setting, host-only stepping, and the rule that a human's
 * action or the start no longer plays the computers inside the request.
 *
 * @param {Object} config
 * @param {string} config.name
 * @param {(input: { name: string }) => Promise<any>} config.create
 * @param {(input: { roomCode: string, name: string }) => Promise<any>} config.join
 * @param {(input: { roomCode: string, token: string }) => Promise<any>} config.addComputer
 * @param {(input: { roomCode: string, token: string, random?: () => number }) => Promise<any>} config.start
 * @param {(input: { roomCode: string, token: string }) => Promise<any>} config.get
 * @param {(input: { roomCode: string, token: string }) => Promise<any>} config.step
 * @param {(input: { roomCode: string, token: string, ms: unknown }) => Promise<any>} config.setSpeed
 * @param {number} [config.computers]      computers to seat before starting (host alone with the computers)
 * @param {number} [config.guestComputers] computers to seat when a guest has also joined; defaults to `computers`
 * @param {boolean} [config.startLeavesComputersDue] false for games whose start waits on a human (a role reveal)
 */
export function computerRoomTests({ name, create, join, addComputer, start, get, step, setSpeed, computers = 2, guestComputers = computers, startLeavesComputersDue = true }) {
  test(`${name}: a new room runs at Normal, any seated player changes the speed, and only listed speeds are accepted`, async () => {
    const host = await create({ name: "Host" });
    const roomCode = host.state.roomCode;
    assert.equal(host.state.computerDelayMs, 600);
    const guest = await join({ roomCode, name: "Guest" });
    const changed = (await setSpeed({ roomCode, token: guest.token, ms: 1000 })).state;
    assert.equal(changed.computerDelayMs, 1000);
    assert.equal((await get({ roomCode, token: host.token })).state.computerDelayMs, 1000, "every seat sees it");
    for (const ms of [5, 0, 2000, "fast-ish", undefined, null]) {
      await assert.rejects(setSpeed({ roomCode, token: host.token, ms }), /listed computer speeds/, String(ms));
    }
    await assert.rejects(setSpeed({ roomCode, token: "nope", ms: 300 }));
    assert.equal((await setSpeed({ roomCode, token: host.token, ms: 1500 })).state.computerDelayMs, 1500);
    assert.equal((await get({ roomCode, token: guest.token })).state.computerDelayMs, 1500, "kept with the room");
  });

  test(`${name}: only the host steps computers, and a step with nothing due changes nothing`, async () => {
    const host = await create({ name: "Host" });
    const roomCode = host.state.roomCode;
    const guest = await join({ roomCode, name: "Guest" });
    for (let i = 0; i < guestComputers; i += 1) await addComputer({ roomCode, token: host.token });
    await start({ roomCode, token: host.token, random: () => 0 });
    await assert.rejects(step({ roomCode, token: guest.token }), /host/i);
    let state = (await get({ roomCode, token: host.token })).state;
    for (let steps = 0; state.computerDue && steps < 500; steps += 1) state = (await step({ roomCode, token: host.token })).state;
    assert.equal(state.computerDue, false, "the table settles on a human");
    const settled = (await step({ roomCode, token: host.token })).state;
    assert.equal(settled.updatedAt, state.updatedAt, "nothing due: not even saved");
  });

  test(`${name}: starting and a human's action leave the computers' moves to the host, one saved move at a time`, async () => {
    let sawDue = false;
    for (const random of [0, 0.25, 0.5, 0.75, 0.99]) {
      const host = await create({ name: "Host" });
      const roomCode = host.state.roomCode;
      for (let i = 0; i < computers; i += 1) await addComputer({ roomCode, token: host.token });
      const started = (await start({ roomCode, token: host.token, random: () => random })).state;
      if (!started.computerDue) continue;
      sawDue = true;
      let state = started;
      const seen = new Set([state.updatedAt]);
      for (let steps = 0; state.computerDue && steps < 500; steps += 1) {
        state = (await step({ roomCode, token: host.token })).state;
        assert.equal(seen.has(state.updatedAt), false, "each step is a separate saved state");
        seen.add(state.updatedAt);
      }
      assert.ok(seen.size > 1, "at least one computer move was taken by a step");
      break;
    }
    if (startLeavesComputersDue) assert.ok(sawDue, "some starting seat is a computer, and starting did not play for it");
  });
}
