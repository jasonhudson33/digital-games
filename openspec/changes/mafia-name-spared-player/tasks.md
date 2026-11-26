# Tasks

## 1. Name the spared player

- [x] 1.1 In `resolveNight` (`mafia-main/services/NightRules.ts`), return "{name} was attacked in the night but was spared." when the save matches the target, falling back to the old text if the player isn't found; verify with updated and new cases in `tests/mafia-night-rules.test.mjs` (named player, unknown target id, players unchanged, nobody eliminated)
- [x] 1.2 Run `node --experimental-strip-types --test tests/*.test.mjs`, `npm run typecheck` and `openspec validate mafia-name-spared-player --strict`, and verify all pass
