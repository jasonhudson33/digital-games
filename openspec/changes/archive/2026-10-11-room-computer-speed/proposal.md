# Proposal

## Why

How fast the computers play is fixed in code, and it is inconsistent. 23 games step computers from the host's browser with delays that each client hard-codes (480 to 850ms, some through the shared hook and some through private timers), and six games (Pinochle, Scum, Skull King, Hand & Foot, Killer Bunnies, Secret Hitler) play every computer move instantly on the server inside the human's action, so a whole round of computer turns appears at once. Players cannot slow the computers down to follow them, or speed them up when they are waiting.

## What Changes

- Every room gets one computer speed, shared by everyone in it: Fast (300ms), Normal (600ms), Slow (1000ms) or Very slow (1500ms). New rooms start at Normal.
- Any seated human can change it, in the lobby and in the shared game bar. It is stored in the room, so every player sees the same pace and it survives rejoining. It is shown only in rooms that have computer players.
- The host's browser paces the computers with the room's value. The 23 clients' hard-coded delays and private timers are replaced by one shared pacing hook. Pauses that animate a human's own action (Catan's and Risk's dice rolls) are not computer pacing and stay.
- The six instant-computer games change to the host-stepped model the other 23 already use: a human's action no longer plays the computers' turns on the server, and instead the host's browser asks for one computer move at a time. Computers in those games become visibly paced, which is a behaviour change.
- The shared engine room carries the setting for its games in one place (a reserved `setComputerSpeed` action, next to `computerStep`); the six custom rooms carry it on the room and gain the same two actions.
- Invalid speeds are rejected, and rooms saved before this change read as Normal.

## Capabilities

### New Capabilities
- `platform/computer-pacing`: the per-room computer speed, who can change it, where it is stored and shown, and how computers are paced in every game.

### Modified Capabilities
- `platform/game-layout`: the common lobby and the common game bar gain the computer speed control in rooms that have computers.

## Impact

- New `lib/computer-speed.js` (presets, default, validation) and `lib/use-computer-pacer.js` (the one pacing hook); `lib/use-engine-room.js` uses it.
- `lib/engine-room.js`: a bookkeeping key for the speed, a reserved `setComputerSpeed` action, and the speed in every seat view.
- The six custom rooms (`lib/pinochle-rooms.js`, `scum-rooms.js`, `skull-king-rooms.js`, `hand-and-foot-rooms.js`, `killer-bunnies-rooms.js`, `secret-hitler-rooms.js`): the speed, a one-move `computerStep`, `setComputerSpeed`, a `computerDue` flag in the view, and their API routes.
- `components/ui/table-shell.js` (game bar and lobby) and a new speed control component; about 30 game clients drop their hard-coded delays and pass the control its props.
- Tests: new unit and room tests, and the six custom games' room tests, which assume computers play instantly, are changed to step them.
- No change to game rules. Mafia has no computer players and is unaffected.
