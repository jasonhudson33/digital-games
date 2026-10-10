# Spec Delta

## ADDED Requirements

### Requirement: Randomness chosen by the server
Every die roll, spin, shuffle and draw in an engine-backed game SHALL be chosen by the server, and a request SHALL NOT be able to supply or influence the result.

#### Scenario: Client-supplied result
- **WHEN** a request carries a number, roll or random source alongside a move
- **THEN** the server ignores it and uses its own
