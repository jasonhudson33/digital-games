# Context Map

## Contexts

- [7-Up](./docs/contexts/seven-up.md) - Classic card play with local seats, computer players, and shared online rooms.
- [BANG!](./docs/contexts/bang.md) - Draw fast in a hidden-role western showdown with friends or computer gunslingers.
- [Catan](./docs/contexts/catan.md) - Settle a randomized island, gather resources, trade with the bank, and race to ten victory points.
- [Cover Your Assets](./docs/contexts/cover-your-assets.md) - Pair a fortune, cover your stack, and challenge exposed assets with friends or computer rivals.
- [Dominion](./docs/contexts/dominion.md) - Build a kingdom one shuffle at a time, refine your deck, and claim the most valuable realm.
- [DOS](./docs/contexts/dos.md) - Match the center row with single cards or two-card sums and turn color matches into bonuses.
- [Five Crowns](./docs/contexts/five-crowns.md) - Build books and runs across five suits, chase the rotating wild rank, and finish with the lowest score.
- [Flip 7](./docs/contexts/flip-7.md) - Flip unique numbers, dodge duplicates, and press your luck against friends or computer players.
- [Hand and Foot](./docs/contexts/hand-and-foot.md) - Build books with the partner across from you, unlock your hidden foot, and chase the biggest score.
- [Hearts](./docs/contexts/hearts.md) - Play Classic Hearts or remove every guardrail with fast, unforgiving Killer Hearts.
- [Killer Bunnies](./docs/contexts/killer-bunnies.md) - Program your run, protect your Bunny Circle, and hunt the tabletop for the one Magic Carrot.
- [Life](./docs/contexts/life.md) - Spin through careers, homes, family milestones, and retirement with friends or computer players.
- [Mafia](./docs/contexts/mafia.md) - Create a room, assign hidden roles, and play through shared night and day phases.
- [Monopoly](./docs/contexts/monopoly.md) - Buy properties, roll animated dice, trade, mortgage, auction, and build houses in shared rooms.
- [No Thanks!](./docs/contexts/no-thanks.md) - Take the card or pay to pass, build low-scoring runs, and outlast friends or computer players.
- [Phase 10](./docs/contexts/phase-10.md) - Complete ten escalating sets, runs, and color phases while keeping your score low.
- [Pinochle](./docs/contexts/pinochle.md) - Win the auction, lay down your meld, call trump, and make the contract at a shared table.
- [Qwirkle](./docs/contexts/qwirkle.md) - Match colors and shapes, cross the grid for bigger scores, and complete six-tile Qwirkles.
- [Risk](./docs/contexts/risk.md) - Deploy armies, roll into battle, claim continent bonuses, and conquer the world with friends or computer commanders.
- [Scum](./docs/contexts/scum.md) - Climb from lowly 2s to Jokers, shed every card, and fight your way from Scum to President.
- [Secret Hitler](./docs/contexts/secret-hitler.md) - Nominate a government, pass secret policies, and uncover the hidden Fascist team before democracy falls.
- [Sequence](./docs/contexts/sequence.md) - Play a card, claim a space, and connect five chips with friends or computers across up to three teams.
- [Skull King](./docs/contexts/skull-king.md) - Bid your tricks, command Pirates and monsters, and survive ten rounds to claim the captain's crown.
- [Splendor](./docs/contexts/splendor.md) - Gather precious gems, build a permanent engine of bonuses, and attract nobles before rival merchants.
- [Spyrium](./docs/contexts/spyrium.md) - Place workers in a shifting Victorian market, mine miraculous crystals, and build an industrial empire.
- [Stratego](./docs/contexts/stratego.md) - Deploy a hidden army, read the enemy formation, and fight through the ranks to capture the Flag.
- [Ticket to Ride](./docs/contexts/ticket-to-ride.md) - Collect colorful train cards, claim routes across the map, and complete secret destination tickets.
- [UNO](./docs/contexts/uno.md) - Play Classic UNO or flip every hand between light and dark sides in UNO Flip.
- [Viticulture](./docs/contexts/viticulture.md) - Place workers through the seasons, grow a vineyard, craft wine, and fulfill orders in a race to 20 VP.

## Relationships

There are three online room models here, and the difference decides whether a
player can read a rival's hand.

- **Server-authoritative, filtered per viewer.** **7-Up**, **BANG!**, **Cover
  Your Assets**, **Dominion**, **DOS**, **Five Crowns**, **Flip 7**, **Hand and
  Foot**, **Killer Bunnies**, **Life**, **No Thanks!**, **Phase 10**, **Pinochle**,
  **Qwirkle**, **Risk**, **Scum**, **Secret Hitler**, **Sequence**, **Skull King**,
  **Splendor**, **Spyrium**, **Stratego**, **Ticket to Ride**, **UNO**, and
  **Viticulture** keep the whole game on the server. A request carries a seat token, the
  server decides what that seat may see, and returns only that. Private hands
  and hidden roles stay private.

- **Client-authoritative, fully readable.** Only **Catan** and **Monopoly** still
  compute state in the browser. Each keeps its own browser-side Supabase tables
  (with an in-memory route for local development), so a room code gives read and
  write access to the whole game, with no seat tokens. See
  [ADR 0004](./docs/adr/0004-seat-tokens-for-client-authoritative-rooms.md) for how
  the other games moved off this model.

- **Hearts** has no shared rooms: it runs in one browser against computer players.

- **Mafia** uses a separate token-validated Supabase RPC model because roles and
  intents are private.

- Every server-authoritative game persists through `lib/supabase-server-room-store.js`,
  which expires rooms after 24 hours and cleans up opportunistically.

- All contexts share the Next.js shell, site header, deployment, and root
  quality pipeline; game rules remain context-owned.
