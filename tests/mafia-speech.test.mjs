import assert from 'node:assert/strict';
import test from 'node:test';

test('Mafia narration cannot block a phase transition forever', async () => {
  globalThis.window = {
    speechSynthesis: {
      cancel() {},
      getVoices: () => [],
      speak() {},
    },
  };
  globalThis.SpeechSynthesisUtterance = class {};

  const { SpeechService } = await import('../mafia-main/services/SpeechService.ts');
  const narrator = new SpeechService(20);
  const startedAt = Date.now();

  await narrator.speak('Kings, wake up.');

  assert.ok(Date.now() - startedAt < 200, 'narration should settle after its timeout');
});
