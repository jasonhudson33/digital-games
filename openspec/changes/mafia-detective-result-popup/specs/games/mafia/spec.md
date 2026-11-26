# Spec Delta

## ADDED Requirements

### Requirement: Detective result popup
After the detectives agree on a player to check, each living detective SHALL be shown a popup naming the checked player and stating whether that player is a killer. The popup SHALL stay until the detective dismisses it and SHALL be shown only to detectives.

#### Scenario: Killer checked
- **WHEN** the detectives check a player who is a killer
- **THEN** each living detective sees a popup naming that player as a killer

#### Scenario: Non-killer checked
- **WHEN** the detectives check a player who is not a killer
- **THEN** each living detective sees a popup naming that player as not a killer

#### Scenario: Popup stays
- **WHEN** a detective has not tapped OK
- **THEN** the popup remains on their screen

#### Scenario: Other players
- **WHEN** a detective's result is shown
- **THEN** no other player's screen shows it

### Requirement: Night waits for detectives
The night SHALL NOT move from the detective step to the angel step until every living human detective has dismissed their result popup. Computer detectives SHALL count as having dismissed it.

#### Scenario: Waiting
- **WHEN** some living human detectives have not tapped OK
- **THEN** the angel step does not begin

#### Scenario: All acknowledged
- **WHEN** every living human detective has tapped OK
- **THEN** the angel step begins

#### Scenario: Computer detectives
- **WHEN** all human detectives have tapped OK and the remaining detectives are computers
- **THEN** the angel step begins

### Requirement: Host continues past detectives
While the night waits for detectives, the acting host SHALL be able to continue to the angel step without the remaining acknowledgements, and SHALL see how many detectives are ready. No other player SHALL see this control.

#### Scenario: Host continues
- **WHEN** the host taps Continue while a detective has not tapped OK
- **THEN** the angel step begins

#### Scenario: Other players
- **WHEN** a player who is not the acting host views the detective step
- **THEN** no Continue control is shown
