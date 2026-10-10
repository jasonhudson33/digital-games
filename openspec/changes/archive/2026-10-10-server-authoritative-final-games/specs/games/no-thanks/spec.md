# Spec Delta

## ADDED Requirements

### Requirement: No Thanks! hidden draw pile
No Thanks! SHALL be played with its rules on the server, and each seat's view SHALL show the active card, the chips on it, every seat's taken cards and chips, and the draw pile as a count only.

#### Scenario: Draw pile
- **WHEN** a seat reads a started game
- **THEN** the draw pile is empty with a count and the next card is not revealed

### Requirement: Take and pass checked on the server
Taking a card and paying a chip to pass SHALL be validated on the server against the acting seat's turn and chips.

#### Scenario: Pass with no chips
- **WHEN** a seat with no chips asks to pass
- **THEN** the action is rejected
