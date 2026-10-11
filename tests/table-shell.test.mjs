import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";

import { loadComponents, render } from "./ui-render.mjs";

const shell = await loadComponents("components/ui/table-shell.js");

const entry = {
  name: "", setName() {}, joinCode: "", setJoinCode() {},
  createRoom() {}, joinRoom() {}, busy: false, error: "",
};
const hero = () => createElement(shell.Hero, {
  kicker: "Kicker", title: "Title", copy: "Copy", badges: [{ label: "2-4 players" }],
});

test("landing renders the hero, then create, then join", () => {
  const html = render(shell.Landing, { gameName: "Test", theme: "test-theme", hero: hero(), entry, onRules() {} });
  assert.match(html, /data-layout="landing"/);
  assert.match(html, /tbl-landing test-theme/);
  assert.match(html, /data-layout="entry"/);
  for (const text of ["Kicker", "Title", "Copy", "2-4 players"]) assert.match(html, new RegExp(text));
  const create = html.indexOf("Create a room");
  const join = html.indexOf('placeholder="ROOM CODE"');
  assert.ok(create > 0 && join > create, "Create a room comes before the room code field");
});

test("landing has no separate local-play option", () => {
  const html = render(shell.Landing, { gameName: "Test", hero: hero(), entry });
  assert.doesNotMatch(html, /Play against computers|local/i);
});

const room = {
  roomCode: "ABCDE", hostId: "p1", round: 1,
  players: [{ id: "p1", name: "Host", isComputer: false }],
};
const lobbyProps = {
  gameName: "Test", room, me: { id: "p1" }, busy: false, error: "", min: 2, max: 4,
  onAdd() {}, onRemove() {}, onStart() {}, onLeave() {}, onRules() {},
};

test("lobby shows its common content and a game's own options together", () => {
  const html = render(shell.Lobby, { ...lobbyProps, options: createElement("div", { id: "expansions" }, "Expansions") });
  assert.match(html, /data-layout="lobby"/);
  for (const text of ["ABCDE", "Add computer player", "Start game", "Leave room", "Expansions"]) {
    assert.match(html, new RegExp(text));
  }
});

test("lobby counts the seats still needed, and a game can say it differently", () => {
  assert.match(render(shell.Lobby, { ...lobbyProps, min: 3 }), /Add 2 more players/);
  assert.match(render(shell.Lobby, lobbyProps), /Add 1 more player</);
  assert.match(render(shell.Lobby, { ...lobbyProps, seatNote: "Needs an even number" }), /Needs an even number/);
});

test("a guest sees no start or computer controls", () => {
  const html = render(shell.Lobby, { ...lobbyProps, me: { id: "p2" } });
  assert.doesNotMatch(html, /Start game|Add computer player/);
  assert.match(html, /Waiting for the host/);
});

test("game bar shows title, rules, room and leave, and a game's own actions", () => {
  const html = render(shell.GameHeader, {
    title: "Test", room, status: "Your turn", onRules() {}, onLeave() {},
    actions: createElement("button", { id: "trade" }, "Trade"),
  });
  assert.match(html, /data-layout="game-bar"/);
  for (const text of ["Test", "Your turn", "Rules", "ABCDE", "Leave", "Trade"]) assert.match(html, new RegExp(text));
  assert.match(html, /Round 1 · private room/);
  assert.match(render(shell.GameHeader, { title: "T", room, status: "", subtitle: "Trick 3 of 7", onRules() {}, onLeave() {} }), /Trick 3 of 7/);
});
