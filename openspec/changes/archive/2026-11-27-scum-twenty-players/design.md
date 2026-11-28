# Design

## Context

The seat cap is one constant (`SCUM_MAX_PLAYERS` in `lib/scum-rooms.js`), but the pass-group ceiling `floor(players / 2)` is written out separately in five places:

- `lib/scum.js` `getScumTradeGroups` (used during play) and `createScumGame` setup
- `lib/scum-rooms.js`: the clamp after a join, the clamp after a leave, and `setScumRoomOptions`
- `components/scum-client.js`: `maximumGroups` for the lobby selector

The deck count (`ceil(n/4)`), the opponent grid (`auto-fit`) and the lobby `max={Infinity}` already scale to twenty without changes. `BOT_NAMES` has 16 entries, so seats beyond that fall back to "Player N".

## Goals / Non-Goals

**Goals:**
- One source of truth for the pass-group ceiling, shared by the rules, the room service and the lobby UI.

**Non-Goals:**
- Large-table layout on phones. We'll ship and watch.
- Changing the cards-per-group formula (group i trades `groups - i` cards).

## Decisions

- **Shared helper.** Export `SCUM_MAX_PASS_GROUPS = 4` and `getScumMaxPassGroups(playerCount) = min(4, floor(playerCount / 2))` from `lib/scum.js`, and replace every `floor(n/2)` site with it. The client imports from `lib/scum.js` already, so the lobby can't offer a value the room would clamp. The alternative, clamping only in `getScumTradeGroups`, would let the lobby show options that silently do nothing.
- **Cap groups rather than cards per trade.** At four groups the largest trade is 4 cards, and only 8 players trade. That keeps the trade phase short, which matters more than card counts at large tables.
- **Clamp on read for stored rooms.** A stored room with `passGroupCount: 5` isn't migrated. The room clamps it the next time it's touched, and `getScumTradeGroups` clamps at play time, so the old value is harmless.
- **Bot names.** Add four names to `BOT_NAMES` so twenty computer seats all get distinct names.

## Risks / Trade-offs

- [The phone layout gets long with 19 opponent tiles] → Accepted for now. Revisit once a full table has been played on mobile.
- [Nine- and ten-player rooms lose the five-group option] → An intentional rules change, noted as BREAKING in the proposal.
- [Five-deck rounds and twenty seats increase payload and bot search time] → Each hand stays at about 13-14 cards, so per-player work doesn't change. Spot-check computer-turn latency at twenty seats.
