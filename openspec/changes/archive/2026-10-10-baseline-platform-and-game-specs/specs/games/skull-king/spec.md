# Spec Delta

## Purpose

Defines Skull King, a ten-round bidding trick-taker for two to nine captains with three selectable card sets.

## ADDED Requirements

### Requirement: Card sets
The host SHALL choose First Release (70 cards, up to seven), Mermaids & Monsters (74, up to seven) or All Cards (93, up to nine).

#### Scenario: Eight captains
- **WHEN** eight captains are seated
- **THEN** only All Cards may be chosen

### Requirement: Bids
Each player SHALL bid the exact number of tricks they expect, and bonuses such as a captured 14 SHALL score only when the bid is met exactly.

#### Scenario: Missed bid
- **WHEN** a player captures a 14 but misses their bid
- **THEN** no 14 bonus is awarded

### Requirement: Special captures
Pirates SHALL capture Mermaids for 20, the Skull King SHALL capture Pirates for 30 each, and a Mermaid SHALL capture the Skull King for 40.

#### Scenario: Mermaid beats Skull King
- **WHEN** a Mermaid and the Skull King are in one trick
- **THEN** the Mermaid wins and earns 40

### Requirement: Sea Monsters
The Kraken SHALL destroy its trick, the White Whale SHALL make the highest number win, and the Spotted Stingray SHALL make the lowest win.

#### Scenario: Kraken
- **WHEN** the Kraken is the effective monster
- **THEN** no player wins the trick
