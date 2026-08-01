import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePrivateRole } from '../mafia-main/services/RoleState.ts';

test('a role that has not loaded is not displayed as Citizen', () => {
  assert.equal(resolvePrivateRole({}, 'player-1'), null);
});

test('assigned roles are displayed without substitution', () => {
  assert.equal(resolvePrivateRole({ 'player-1': 'Citizen' }, 'player-1'), 'Citizen');
  assert.equal(resolvePrivateRole({ 'player-1': 'King' }, 'player-1'), 'King');
});
