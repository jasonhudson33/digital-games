# Design

## Context

See proposal.md for motivation. How computers move today:

- **23 games on the shared engine room** (`lib/engine-room.js`): Bang, Camel Up, Catan, Cover Your Assets, Dominion, DOS, Five Crowns, Flip 7, Hearts, Life, Monopoly, No Thanks, Phase 10, Qwirkle, Risk, Sequence, 7-Up, Splendor, Spyrium, Stratego, Ticket to Ride, UNO and Viticulture. The adapter's `computerStep` applies one move and only the host's seat may post it. The host's client decides when: six clients pass `computerDelay` and `computerDue` to `useEngineRoom` (480 to 760ms), and the other 17, including Monopoly's TypeScript client in `monopoly/src/main.tsx`, run their own timer and call their own `stepComputer` (620 to 950ms).
- **Six games with their own rooms** (`lib/<game>-rooms.js`: Pinochle, Scum, Skull King, Hand & Foot, Killer Bunnies, Secret Hitler): every human action and the start action ends with `run<Game>Computers(room)`, a loop that plays all computer moves at once, so the client never sees them one at a time. They have their own API routes (`handleRoomAction`) and client services, and no `computerStep`.
- A room's engine state has a bookkeeping key beside the adapter's game object (`__seats`), stripped before the adapter sees the game and added back when saved. Every response is a per-seat view built in `viewFor`.
- Existing specs already say only the host advances computers (`platform/room-lifecycle`) and describe `computerStep` for engine-backed rooms (`platform/server-authoritative-rooms`). The six custom rooms do not follow that today.
- Mafia has no computer players.

## Goals / Non-Goals

**Goals:**
- One speed per room, changeable by any seated human, the same for everyone, kept with the room.
- One pacing implementation in place of 23 hand-written ones, and every computer move a visible step in all 29 games with computers.

**Non-Goals:**
- Per-player or per-computer speeds, an instant (0ms) setting, or speeds outside the list.
- Changing animations or the pauses around a human's own action (Catan's and Risk's dice-roll pauses), or Monopoly's 4-second computer trading window.
- Changing who drives the computers: the host's browser still does, and a host who leaves still stalls them, in all 29 games.

## Decisions

**1. One small module defines the setting.** `lib/computer-speed.js` exports the four presets (`fast` 300, `normal` 600, `slow` 1000, `very slow` 1500), the default, `normalizeComputerDelay(value)` (a listed value or `null`) and `computerDelayOf(room)` (the room's value, or the default). Server and client share it, so the list cannot drift. Alternative: free-form milliseconds, which invite unusable values and need bounds and a slider.

**2. The engine room stores it beside the seats.** A bookkeeping key `__computerMs` is split out in `split()` and written back in `persist()`, so no adapter sees it and none needs to change. `viewFor` adds `computerDelayMs` to every view. A reserved action `setComputerSpeed` (next to `computerStep`) is handled before the adapter lookup: any seated human, a listed value, and a request for the current value changes nothing. A new room stores no key and reads as Normal, which is also what a room saved earlier reads as. Alternative: an adapter action per game, which is 23 copies of the same code.

**3. The custom rooms store it on the room.** `room.computerDelayMs` is added to both the lobby and game views, with a `setComputerSpeed` action that requires a seated human, and the same normalisation. Rooms saved earlier read as Normal.

**4. The six custom games become host-stepped.** Each loop in `run<Game>Computers` is split into a pure `computerMove(game)` that returns the next game, or the same game when no computer is due, the same contract as an engine adapter's `computerStep`. Human actions and start stop calling the loop. A new host-only `computerStep` room action applies one `computerMove`, and the view carries `computerDue` (`computerMove(game) !== game`), because these clients cannot work out whose turn it is from phase logic they do not have. Alternative: keep the instant loop and add a delay on the client, which would still deliver one state and so could not pace anything.

**5. One pacing hook.** `lib/use-computer-pacer.js` exports `useComputerPacer({ enabled, due, delayMs, step, key })`. When the host is enabled and a computer is due it arms one timer for `delayMs`, restarts it whenever `key` (the room's `updatedAt`) changes, reads `delayMs` when it arms, and cleans up. A speed change saves the room, so it changes `key` and restarts the wait at the new speed at once. It returns `{ waiting }` for the "computer is thinking" labels. `useEngineRoom` uses it, and its `computerDelay` option is removed. The 17 clients with their own timers delete them. A client whose condition is a pure function of the room passes `computerDue` to `useEngineRoom`; one that also depends on local state (Stratego's battle result still on screen, Risk's selection) or that does not use `useEngineRoom` (DOS, UNO, Catan, Risk, Monopoly) calls `useComputerPacer` directly. Camel Up's two direct steps on closing a leg recap respond to a click, not a timer, and stay. The six custom clients call the hook directly. Alternative: a shared constant, which would still leave 17 timers to keep in step.

**6. The control belongs to the shared shell.** A `ComputerSpeedControl` is built in `components/ui/` and rendered by `GameHeader` and `Lobby` when a `computerSpeed` prop is given: a button showing the current speed that opens a four-option radio list, closing on a choice, Escape or an outside click, with 44px targets. `useEngineRoom` returns the prop (or `null` when the room has no computer players) so engine clients pass it straight through; a small helper builds it for the six custom clients. Alternative: a native select, which fights the shell's 16px text rule on phones.

**7. Monopoly keeps its trading window.** A Monopoly computer in the manage stage waited 4 seconds so humans could still propose a trade before it ended its turn. That is a rule of play, not pacing, so it stays as a floor: ordinary steps use the room's speed, and the manage stage waits the longer of the room's speed and 4 seconds.

**8. Migrate in layers.** First the module, hook, engine room and control, proven on one game; then the 23 engine clients; then the six custom games one at a time, each with its own tests. Each layer leaves the games working.

## Risks / Trade-offs

- [The six custom games change behaviour: computers are paced, and they now need the host's browser] → this is the stated intent; it matches the other 23, and the lobby already requires a host.
- [The six custom games' room tests assume computers have already played] → a shared test helper steps computers until none is due, and each game's tests use it.
- [Migrating 17 private timers can drop a condition they relied on] → each client's extra conditions move into `computerDue` or the pacer's `due`, and every game is exercised with computers by the mobile audit.
- [A sub-component renders the game bar without the speed prop, which compiles and then throws when it renders] → a wiring test checks that every use of `computerSpeed` is in a function that has it. Three such cases were found and fixed.
- [Changing the speed races a computer step and conflicts on save] → the existing stale-write rejection and client retry apply; a lost speed change shows as the old value and can be set again.
- [Any seated player can set Very slow] → accepted; any seated player can set it back, and it is visible in the bar.
- [Rooms in progress at deploy] → a custom room with a computer due is stepped by the host's browser as soon as it reloads; nothing is stored in a new format that an old client misreads.

## Migration Plan

Ship the shared module, engine room, hook and control first (engine games gain the setting but keep behaving as today until migrated), then the client migrations, then each custom game. Revert any layer independently; reverting a custom game restores its instant loop.

## Open Questions

- None.
