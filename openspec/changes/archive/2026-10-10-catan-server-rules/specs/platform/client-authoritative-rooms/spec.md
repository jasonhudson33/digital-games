## REMOVED Requirements

### Requirement: Whole-state room API
**Reason**: Catan, the last client-authoritative game, now runs on the server rules engine.
**Migration**: Use the engine room API (`GET` plus named-action `POST`).

### Requirement: Write validation
**Reason**: There is no whole-state write path left to validate.
**Migration**: Action validation lives in the engine adapters.

### Requirement: Version conflict
**Reason**: Whole-state 409 conflicts no longer exist; the engine room serializes actions with optimistic versions.
**Migration**: None.

### Requirement: Rooms reach the database only through the server
**Reason**: Covered for all games by the server-authoritative rooms spec.
**Migration**: None.

### Requirement: Changes arrive by polling
**Reason**: Covered by the engine room hook used by every game.
**Migration**: None.
