# Spec Delta

## MODIFIED Requirements

### Requirement: Acting host
The first player SHALL act as host for the whole game, whether alive or eliminated, to aggregate intents into room state and keep the narration audio. If that player is absent or has left, host duty SHALL pass to the next present player in seat order and SHALL return to the first player when they are present again.

#### Scenario: Host eliminated
- **WHEN** the first player is eliminated
- **THEN** they remain acting host and keep narration audio and phase controls

#### Scenario: Host absent
- **WHEN** the first player's device has been absent past the presence timeout
- **THEN** the next present player in seat order becomes acting host

#### Scenario: Host returns
- **WHEN** the first player's device is present again
- **THEN** they resume as acting host

#### Scenario: Host leaves
- **WHEN** the first player permanently leaves
- **THEN** the next present player in seat order becomes acting host
