# Proposal

## Why

Ten games now run their rules on the server behind the shared engine room, so a seat no longer receives other seats' hands. Five games with hidden information still do not: Dominion (hands and draw piles), Risk (territory cards), Splendor (reserved developments and face-down decks), Ticket to Ride (train cards, destination tickets and both decks) and Viticulture (vine, order and visitor cards and the decks). Their rooms are token-gated against strangers, but any seated player still receives every opponent's cards and can overwrite the whole game with a `PUT`. The engine room, routes, service and hook already exist, so each game needs an adapter, its client conversion and tests.

## What Changes

- Run the Dominion, Risk, Splendor, Ticket to Ride and Viticulture engines on the server through the existing engine room, with per-seat views.
- Hide per game: Dominion hands and draw piles; Risk territory cards and the card deck; Splendor other seats' reserved developments and the three face-down decks; Ticket to Ride other seats' train cards, destination tickets (until the game ends), pending destination choices and the train and destination decks; Viticulture other seats' vine, order and visitor cards and the four decks.
- Remove whole-state `GET`/`PUT` for these five games. **BREAKING** Rooms created before the deploy cannot be resumed; they expire within 24 hours.
- Move Risk's lobby creation, joining and start out of the browser and into a server adapter, because its engine has no lobby and its functions act on the current player without naming one.
- Adapt the five clients from `update(state => engine(state))` closures to named actions and host-paced `computerStep`.
- Leave Life, No Thanks! and Spyrium (token-gated, nothing hidden), and Catan and Monopoly (their own browser-side storage) unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `platform/client-authoritative-rooms`: the list of games without whole-state `GET`/`PUT` grows by five.
- `games/dominion`: adds hidden hands and draw piles.
- `games/risk`: adds hidden territory cards and a server-side lobby, with moves accepted only from the seat whose turn it is.
- `games/splendor`: adds hidden reserved developments and face-down decks.
- `games/ticket-to-ride`: adds hidden train cards, destination tickets and decks, with tickets revealed when the game ends.
- `games/viticulture`: adds hidden hand cards and decks.

## Impact

- Five new `lib/<game>-room-adapter.js` and `lib/<game>-engine-room.js` modules; five route files change to the engine routes plus a new collection route; five `components/<game>-room-service.js` wrappers and five `components/<game>-client.js` files change (Risk's client is about 1,150 lines and Ticket to Ride's about 690).
- Per-game tests that no opponent card, ticket or reserved development id appears in another seat's payload.
- Docs: `CONTEXT-MAP.md`, ADR 0004's game list (now only Life, No Thanks! and Spyrium), `README.md`, the Purposes of the two platform specs, and context docs for the five games (Dominion, Risk, Ticket to Ride and Viticulture exist from the baseline; Splendor already has one).
- No Supabase migration; `lib/engine-room.js` and the hook are reused as they are.
- Out of scope: new rules, UI redesign, Life, No Thanks! and Spyrium (a later change could move them so a seated player cannot overwrite the board), Catan and Monopoly.
