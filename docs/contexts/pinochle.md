# Pinochle

Pinochle owns room-based auction play, meld scoring, trump selection, and trick-taking for two to six players.

## Language

**Auction**: Players raise the bid or pass until one bidder remains.

**Contract**: The winning bid that the bidder or bidding team must earn from meld and tricks.

**Meld**: Scoring card combinations shown after trump is chosen, including runs, arounds, marriages, pinochles, and dix.

**Cutthroat**: Individual auction scoring used at three players. Two-player Draw Pinochle also scores individually but has no auction.

**Partnership**: Two alternating teams used at four and six players.

**Partner Exchange**: The private card trade after trump is chosen and before meld is scored.

**Calling Partner**: A temporary five-player teammate who holds a jack of the declared trump suit.

**Draw Pinochle**: The two-player variant with 12-card hands, a center stock, face-up trump card, and one optional meld by each trick winner before drawing.

## Relationships

- The **Auction** produces one **Contract** and its bidder chooses trump.
- The winning bidder leads the first **Trick**; each later trick is led by the previous trick's winner.
- Two-player **Draw Pinochle** has no auction: the player left of the dealer leads, the turned stock card sets trump, and each trick winner may declare at most one previously undeclared meld before drawing first.
- In two-player **Draw Pinochle**, a computer must follow the led suit whenever it holds that suit and cannot substitute a trump card.
- In four-player **Partnership**, the bidder exchanges four cards with their teammate.
- In six-player **Partnership**, the bidder exchanges three cards with each of their two teammates.
- Every partnership exchange pauses after each transfer so only the recipient can review and acknowledge the cards they received before play continues.
- **Cutthroat** games do not have a **Partner Exchange**.
- In five-player play, a contract counts only the bidder's **Meld**, plus captured trick points from the bidder and every **Calling Partner**. Calling Partners' own meld does not help satisfy the contract. When the contract is made, each temporary teammate scores only their own meld and captured trick points; when set, each receives only the negative bid.
- A **Calling Partner** privately knows they are with the bidder, but remains hidden from other players until they play their jack of trump.
- A team's **Meld** and captured trick counters combine toward its **Contract**.
- Every player's scored **Meld** and its cards remain public on the table.
- Computers participate in the **Auction** and may raise when their cards support a stronger contract.
- A partnership **Auction** ends immediately when every remaining bidder is on the same team, preventing partners from raising against each other after all opponents pass.
- A completed **Trick** remains face-up until a human clears it; only then does its winner lead the following trick.
- A bidding team that misses its **Contract** loses the value of the bid.
- After final hands and meld are known, a contract is washed when its eligible meld plus every available trick counter and the last-trick bonus cannot reach the bid. The bidder team loses the bid, every opposing player or team banks meld only, and the next hand is dealt immediately.
- Players must follow suit, head the trick when able, and trump or overtrump when void.
- A player leading a fresh trick may **Take the rest** when the stock is empty, every card they hold is trump or an ace, no opponent holds trump, and all hands are the same size. The claim credits that player with every remaining trick, counter, and the last-trick bonus.

## Player-count variants

- Two to five players use a 48-card deck containing two copies of each 9 through Ace in every suit.
- Two-player deals give each player 12 cards; the remaining 24 form the center stock, with one card face up to establish trump.
- Five-player deals give each player nine cards and leave a three-card center kitty that the bidder takes and replaces; bidding begins at 150.
- All Pinochle scoring uses trailing-zero values: meld and trick counters are ten times their traditional shorthand values, and bids advance in increments of ten.
- Six players use a 96-card deck containing four copies of each card.
