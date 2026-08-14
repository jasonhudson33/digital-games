import test from "node:test";
import assert from "node:assert/strict";
import { addLifeComputer, buyInvestment, chooseCareer, chooseLifePath, createLifeLobby, currentLifePlayer, playerNetWorth, spinLife, startLifeGame } from "../lib/life.js";

function startedRoom() {
  let room = createLifeLobby({ id: "human", name: "Alex" }, "LIFE1");
  room = addLifeComputer(room);
  return startLifeGame(room);
}

test("Life rooms require two players and begin with a path decision", () => {
  const onePlayer = createLifeLobby({ id: "human", name: "Alex" }, "LIFE1");
  assert.equal(startLifeGame(onePlayer).phase, "lobby");
  const room = startedRoom();
  assert.equal(room.phase, "playing");
  assert.deepEqual(room.pending, { type: "path", playerId: "human" });
});

test("college adds tuition loans while career start offers non-degree work", () => {
  let college = chooseLifePath(startedRoom(), "human", "college");
  assert.equal(college.players[0].college, true);
  assert.equal(college.players[0].loans, 2);
  assert.equal(college.players[0].cash, 50000);

  let career = chooseLifePath(startedRoom(), "human", "career");
  assert.equal(career.pending.type, "career");
  assert.ok(career.pending.options.every((option) => !option.degree));
  career = chooseCareer(career, "human", career.pending.options[0].id);
  assert.ok(career.players[0].career);
});

test("spinner moves 1-10 spaces and collects passed paydays", () => {
  let room = chooseLifePath(startedRoom(), "human", "career");
  room = chooseCareer(room, "human", room.pending.options[0].id);
  const salary = room.players[0].career.salary;
  const cash = room.players[0].cash;
  room = spinLife(room, "human", 4);
  assert.equal(room.lastSpin.number, 4);
  assert.equal(room.players[0].position, 11);
  assert.equal(room.players[0].cash, cash + salary - 20000);
  assert.equal(currentLifePlayer(room).isComputer, true);
});

test("investments pay whenever their number is spun", () => {
  let room = chooseLifePath(startedRoom(), "human", "career");
  room = chooseCareer(room, "human", room.pending.options[0].id);
  room = buyInvestment(room, "human", 4);
  assert.equal(room.players[0].investment, 4);
  const before = room.players[0].cash;
  room = spinLife(room, "human", 4);
  assert.ok(room.players[0].cash >= before + 10000 - 20000);
});

test("net worth includes home and LIFE tiles and subtracts loan payoff", () => {
  assert.equal(playerNetWorth({ cash: 100000, house: { value: 120000 }, lifeTiles: [20000, 30000], loans: 2 }), 220000);
});
