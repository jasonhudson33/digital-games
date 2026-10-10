# Spec Delta

## REMOVED Requirements

### Requirement: Lobby open, started game gated
**Reason**: No game uses whole-state rooms with seat tokens any more. Every online game except Catan and Monopoly runs on the server, where a seat token is required for every read and action.
**Migration**: Use the seat-token requirements in `platform/server-authoritative-rooms`.

### Requirement: Tokens issued at create and join
**Reason**: Token issuance for whole-state rooms is gone with those rooms; engine-backed rooms issue a token at create and join as part of `platform/server-authoritative-rooms`.
**Migration**: Use `platform/server-authoritative-rooms`.

### Requirement: Roster protected
**Reason**: Clients no longer send whole-state writes, so there is no roster for a write to remove a player from.
**Migration**: The server applies only the rules engine's own actions.

### Requirement: Legacy rooms
**Reason**: The pre-token rooms this protected expired long ago (rooms last 24 hours).
**Migration**: None needed.

### Requirement: Rooms outside the gate
**Reason**: With the gate retired, Catan and Monopoly are simply the games that keep whole-state rooms, which `platform/client-authoritative-rooms` already describes.
**Migration**: See `platform/client-authoritative-rooms`.
