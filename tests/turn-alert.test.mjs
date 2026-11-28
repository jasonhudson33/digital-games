import assert from "node:assert/strict";
import test from "node:test";

import { TURN_SOUND_KEY, createTurnAlert } from "../lib/turn-alert.js";

function fakeAudio() {
  const notes = [];
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  return {
    notes,
    state: "running",
    currentTime: 0,
    destination: {},
    resume() { this.state = "running"; },
    createOscillator() {
      const node = { type: "", frequency: param(), connect() {}, start() { notes.push(node.frequency.value); }, stop() {} };
      return node;
    },
    createGain() { return { gain: param(), connect() {} }; },
  };
}

function memoryStorage() {
  const values = new Map();
  return { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
}

function setup({ hidden = false, vibrate = true } = {}) {
  const audio = fakeAudio();
  const buzzes = [];
  const storage = memoryStorage();
  const alerts = createTurnAlert({
    storage,
    createAudio: () => audio,
    vibrate: vibrate ? (ms) => buzzes.push(ms) : null,
    isHidden: () => hidden,
  });
  return { alerts, audio, buzzes, storage };
}

test("one chime per turn key", () => {
  const { alerts, audio, buzzes } = setup();
  assert.equal(alerts.alert("ABCDE:1:4"), true);
  assert.equal(alerts.alert("ABCDE:1:4"), false);
  assert.deepEqual(audio.notes, [660, 880]);
  assert.deepEqual(buzzes, [60]);
  assert.equal(alerts.alert("ABCDE:1:9"), true);
  assert.equal(audio.notes.length, 4);
});

test("muted or hidden pages stay silent", () => {
  const muted = setup();
  muted.alerts.setMuted(true);
  assert.equal(muted.alerts.alert("k1"), false);
  assert.deepEqual(muted.audio.notes, []);
  assert.deepEqual(muted.buzzes, []);

  const hidden = setup({ hidden: true });
  assert.equal(hidden.alerts.alert("k1"), false);
  assert.deepEqual(hidden.audio.notes, []);
});

test("the mute choice is stored and read back", () => {
  const { alerts, storage } = setup();
  assert.equal(alerts.isMuted(), false);
  alerts.setMuted(true);
  assert.equal(storage.getItem(TURN_SOUND_KEY), "off");
  const again = createTurnAlert({ storage, createAudio: fakeAudio, vibrate: null, isHidden: () => false });
  assert.equal(again.isMuted(), true);
  again.setMuted(false);
  assert.equal(again.isMuted(), false);
});

test("no vibration support is fine", () => {
  const { alerts, audio } = setup({ vibrate: false });
  assert.equal(alerts.alert("k"), true);
  assert.deepEqual(audio.notes, [660, 880]);
});

test("unlock resumes a suspended context", () => {
  const { alerts, audio } = setup();
  audio.state = "suspended";
  alerts.unlock();
  assert.equal(audio.state, "running");
});
