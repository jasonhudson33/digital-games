import assert from 'node:assert/strict';
import test from 'node:test';

import { displayCardCode } from '../mafia-main/services/CardState.ts';

test('Mafia displays the assigned card code', () => {
  assert.equal(displayCardCode('KH', 'King'), 'KH');
  assert.equal(displayCardCode('0D', 'Citizen'), 'TD');
});

test('older rooms receive a card matching the private role', () => {
  assert.equal(displayCardCode('', 'King'), 'KS');
  assert.equal(displayCardCode('', 'Jack'), 'JS');
  assert.equal(displayCardCode('', 'Ace'), 'AS');
  assert.equal(displayCardCode('', 'Citizen'), '2S');
});
