## ADDED Requirements

### Requirement: Server-side rules
Every Catan state change SHALL be computed on the server by named actions through the engine room. The server SHALL validate the acting seat, phase, costs, placement legality and pending choices, and SHALL reject any action that is not available with 400 "That action is not available right now." The room API SHALL expose only `GET` and `POST`.

#### Scenario: Out-of-turn action
- **WHEN** a seat that is not the active player sends a build, roll or end-turn action
- **THEN** the request is rejected and the stored game is unchanged

#### Scenario: Unaffordable build
- **WHEN** the active player builds something they cannot pay for
- **THEN** the request is rejected and no resources are spent

#### Scenario: Whole-state write
- **WHEN** a client sends PUT with a whole state to the Catan room API
- **THEN** no route handles it and no state is replaced

### Requirement: Hidden cards per seat
A seat's payload SHALL contain its own resource, development and progress cards. Opponents' cards SHALL appear only as counts, and the development and progress decks SHALL appear only as counts. A robber steal SHALL reveal the stolen card only to the two players involved.

#### Scenario: Opponent hand
- **WHEN** a seat fetches the room
- **THEN** no opponent card identity appears anywhere in the payload

#### Scenario: Deck contents
- **WHEN** any seat fetches the room
- **THEN** the development and progress decks are not present, only their sizes

### Requirement: Server-chosen randomness
Dice (including the event and alchemy dice), board layout, ports, number tokens and deck order SHALL be chosen on the server. Clients SHALL NOT supply roll results, card indexes into a hidden deck, or shuffle seeds.

#### Scenario: Roll
- **WHEN** the active player sends the roll action
- **THEN** the server rolls the dice and the response carries the result

### Requirement: Computer players
Computer turns SHALL advance one step per host-triggered request using the existing computer strategy, and a non-host seat SHALL NOT be able to trigger them.

#### Scenario: Non-host trigger
- **WHEN** a non-host seat requests a computer step
- **THEN** it is rejected with "Only the host"

### Requirement: Old rooms
A Catan room stored in the earlier whole-state format SHALL answer 410 and not be resumed.

#### Scenario: Pre-deploy room
- **WHEN** a client fetches a room created before the engine format
- **THEN** the response is 410
