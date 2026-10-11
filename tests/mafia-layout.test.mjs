import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";

import { loadComponents, render } from "./ui-render.mjs";

/*
 * Mafia's rooms live in Supabase and are reached from the browser, so the mobile
 * audit cannot get past its landing without that project's keys. These render
 * the pieces it would otherwise have to reach: the lobby and the in-game bar.
 */
const { default: Lobby } = await loadComponents("mafia-main/components/Lobby.tsx");
const { default: GameBar } = await loadComponents("mafia-main/components/GameBar.tsx");

const players = [
  { id: "host", name: "Host", isHost: true, isAlive: true, voteCount: 0, cardCode: "" },
  { id: "bot", name: "Computer 1", isBot: true, isComputer: true, isAlive: true, voteCount: 0, cardCode: "" },
];
const lobbyProps = (extra = {}) => ({
  roomCode: "ABCD", players, isHost: true, myPlayerId: "host",
  onStart() {}, onAddComputer() {}, onRemoveComputer() {}, onLeave() {}, ...extra,
});

test("the lobby shows the room code, the seats, computer controls, start and leave", () => {
  const html = render(Lobby, lobbyProps());
  assert.match(html, /data-layout="lobby"/);
  for (const text of ["ABCD", "Host", "Computer 1", "Add computer player", "Start game", "Leave room", "Remove Computer 1"]) {
    assert.match(html, new RegExp(text));
  }
});

test("a guest's lobby has no start or computer controls", () => {
  const html = render(Lobby, lobbyProps({ isHost: false, myPlayerId: "bot" }));
  assert.doesNotMatch(html, /Start game|Add computer player/);
  assert.match(html, /Waiting for the host/);
});

test("the lobby asks for five players before the host can start", () => {
  assert.match(render(Lobby, lobbyProps()), /Add 3 more players/);
});

test("the in-game bar shows the title, room, phase, Rules and Leave", () => {
  const html = render(GameBar, { roomCode: "ABCD", phase: "NIGHT_KILLER", round: 2, isLeaving: false, onLeave() {} });
  assert.match(html, /data-layout="game-bar"/);
  for (const text of ["Mafia", "ABCD", "Round 2", "Night: the Killers choose", "Rules", "Leave"]) assert.match(html, new RegExp(text));
});
