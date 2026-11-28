# Tasks

## 1. No burn on four of a kind

- [x] 1.1 Remove the `selected.length === 4` burn branch from `playScumCards` in `lib/scum.js`. Replace the "four of a kind burns the pile" test in `tests/scum-rules.test.mjs` with tests where four 9s stay on the pile and the turn moves on, four 10s beat them, and four 7s are rejected.
- [x] 1.2 Remove the `burnsPile` bonus from the bot scorer in `lib/scum.js`. Verify the Scum rules and room tests still pass (`node --test tests/scum-*.test.mjs`).
- [x] 1.3 In the rules dialog in `components/scum-client.js`, replace "Four of a kind burns the pile." with text saying the pile clears when everyone else passes. Verify no "burn" text is left (`grep -i burn components/scum-client.js lib/scum.js`).

## 2. Show who passed

- [x] 2.1 Pass `passed={(game.passed ?? []).includes(playerIndex)}` to `Opponent` in `components/scum-client.js`. Render a "Passed" label and a `passed` class, with dimmed styling in `app/scum/scum.css`. Verify in the running app that an opponent who passes shows "Passed" until the pile clears.
- [x] 2.2 Show "Passed" in the viewer's seat chip when the viewer is in `game.passed` and isn't in their continuation. Verify in the running app after passing.

## 3. Integration

- [x] 3.1 Run `npm test` and verify it passes.
- [x] 3.2 Run the Scum page locally (`npm run dev`) and play against computers. Verify that four of a kind stays on the pile, passed badges appear and disappear at the next lead, and the layout still fits at phone width.
