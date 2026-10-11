# Tasks

## 1. Pure helpers

- [x] 1.1 Add `diffCamelPositions(prevStacks, nextStacks)` in a new `lib/camel-up-motion.js` returning each camel's previous and next space plus the units that moved, and add `tests/camel-up-motion.test.mjs` covering a single camel, a carried stack, a booing shift, a crazy camel, no change, and missing previous state; verify `node --experimental-strip-types --test tests/camel-up-motion.test.mjs` passes
- [x] 1.2 Add a small `unavailableReason(room, me, action)` helper (same module or `lib/camel-up-actions.js`) returning a short reason string or `null` for leg bet, roll, tile, finish bet and partner, and test not-your-turn, tickets gone, all cards placed, no legal tile space, and fewer than six seats; verify its tests pass

## 2. Board and component split

- [x] 2.1 Create `components/camel-up-recap.js` by moving the dice tray, leg recap and finish-bets dialogs out of `components/camel-up-client.js` without behavior change, and verify `npm run typecheck` and the camel-up tests still pass and a played leg still shows the recap
- [x] 2.2 Create `components/camel-up-board.js` with the redrawn ring (numbered path tiles, direction cues, finish arch, start marker), a reusable `Camel` at two sizes with clear stack overlap, spectator tiles, and a last-moved ring from the newest roll; verify by screenshot at 1280px that stacks, tiles and both crazy camels read clearly
- [x] 2.3 Redraw the center pyramid to show which of the six dice remain inside, with the racing order beside it, and verify the remaining dice update after each roll in a played game
- [x] 2.4 Add the FLIP movement hook using `diffCamelPositions`, with a short transition and no animation under `prefers-reduced-motion`; verify with a played game (stacked move, tile shift, crazy-camel carry) and with reduced motion emulated that camels land correctly
- [x] 2.5 Update `docs/contexts/camel-up.md` with the new component boundaries and verify the Boundaries section names every new file

## 3. Players and bets at a glance

- [x] 3.1 Create `components/camel-up-players.js` with scoreboard cards showing turn marker, money, held leg tickets, pyramid tickets, tile (side and space) and partner, and verify each appears and updates in a played game and for the viewer's own card
- [x] 3.2 Add leg-ticket stacks per camel showing remaining values with the next payout on top, shared with the leg-bet action, and verify taking a ticket updates the stack and the holder's card
- [x] 3.3 Show overall winner and loser deck counts and the viewer's own placed cards with their camel, and add an engine-room assertion in `tests/camel-up-engine-room.test.mjs` that other seats still receive no camel for cards that are not theirs; verify the test passes

## 4. Turn action panel

- [x] 4.1 Create `components/camel-up-actions.js` with the segmented action choice and the roll panel (primary 44px+ button, tickets left), disabled actions with their reasons from `unavailableReason`, and a clear waiting state naming the current player; verify with screenshots on your turn and off your turn
- [x] 4.2 Add the leg-bet action using the ticket stacks and the finish-bet action using pickable camel cards with a winner/loser toggle and confirm, replacing the selects; verify both submit the right action in a played game and a used card cannot be picked again
- [x] 4.3 Add spectator-tile placing mode (cheer/boo toggle, legal spaces as labelled buttons on the track, preview, confirm, cancel) and the partner action for six-plus seats; verify illegal spaces cannot be chosen, cancel leaves the turn unchanged, and the tile can be placed by keyboard alone
- [x] 4.4 Wire the new modules into `components/camel-up-client.js`, delete the old bar, selects and now-unused styles, and verify `npm run validate` and `npm run typecheck` pass and a full 3-seat race plays to the standings

## 5. Styling and responsive pass

- [x] 5.1 Rewrite `app/camel-up/camel-up.css` around local custom properties and the existing theme tokens, restyling the tray and recap to match, and verify no unused selectors remain (search for removed class names) and the shared landing, lobby, bar and dialogs are unchanged
- [x] 5.2 Implement the phone layout (order strip above the board, docked and collapsible action panel, placing mode usable by tap) and verify at 320x568, 390x844 and 844x390 that the page does not scroll sideways and primary actions are at least 44px tall
- [x] 5.3 Check accessibility: labelled controls, visible focus, color contrast of tile and ticket text, and the dialogs' focus behavior from the previous change; verify by tabbing through a turn and by a contrast spot-check of the camel and ticket colors

## 6. Integration

- [x] 6.1 Run `npm run check` and `npm run audit:mobile -- --games camel-up` and play a six-plus-seat game and a 3-seat game to the end at desktop and phone widths, confirming recap, final bets, tile placement, finish bets and partnerships all work with the new UI
