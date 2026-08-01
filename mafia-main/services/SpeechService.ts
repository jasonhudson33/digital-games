import { GoogleGenAI, Modality } from "@google/genai";

const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// Helper to decode base64 manually
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to decode raw PCM data into an AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const MAFIA_NARRATION = {
  sleep: "The village sleeps. Everyone, close your eyes.",
  killersWake: "Kings, wake up. Open your eyes and choose your target.",
  detectivesWake: "Kings, go to sleep. Jacks, wake up. Identify your suspects.",
  angelsWake: "Jacks, go to sleep. Aces, wake up. Choose one person to protect.",
  morning: "Aces, go to sleep. Everyone, wake up. It is now morning.",
  killersWin: "The town has fallen. The Killers win.",
  citizensWin: "Justice is served. The Citizens win."
} as const;

const GAME_SCRIPTS = Object.values(MAFIA_NARRATION);
const DEFAULT_SPEECH_TIMEOUT_MS = 8_000;

export class SpeechService {
  private audioContext: AudioContext | null = null;
  private audioCache: Map<string, AudioBuffer> = new Map();
  private isPreloading = false;
  private useWebSpeech = false;
  private lastSpokenText: string = "";
  private lastSpokenTime: number = 0;
  private speechQueue: Promise<void> = Promise.resolve();
  private readonly speechTimeoutMs: number;

  constructor(speechTimeoutMs = DEFAULT_SPEECH_TIMEOUT_MS) {
    this.speechTimeoutMs = speechTimeoutMs;
    this.useWebSpeech = !geminiApiKey;
  }

  private async getContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  async unlock() {
    if (this.useWebSpeech) {
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(' ');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
      }
    } else {
      await this.getContext();
    }
    console.log("Narrator: Audio system unlocked.");
  }

  async preloadAll() {
    if (this.useWebSpeech) return; 
    if (this.isPreloading || this.audioCache.size === GAME_SCRIPTS.length) return;
    
    const apiKey = geminiApiKey;
    if (!apiKey) {
      this.useWebSpeech = true;
      return;
    }

    this.isPreloading = true;
    const ctx = await this.getContext();

    try {
      for (const text of GAME_SCRIPTS) {
        if (this.audioCache.has(text)) continue;

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Zephyr' }, 
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          const audioData = decode(base64Audio);
          const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
          this.audioCache.set(text, audioBuffer);
        }
      }
    } catch (error) {
      console.warn("Narrator: Gemini TTS failed. Using Web Speech.");
      this.useWebSpeech = true;
    } finally {
      this.isPreloading = false;
    }
  }

  private async playBuffer(buffer: AudioBuffer): Promise<void> {
    const ctx = await this.getContext();
    await new Promise<void>((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => resolve();
      source.start(0);
    });
  }

  private async speakWithWebSpeech(text: string): Promise<void> {
    if (!window.speechSynthesis) return;
    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Premium'))
      ) || voices.find(v => v.lang.includes('en'));

      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 0.9;
      utterance.pitch = 0.8;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }

  private async performSpeech(text: string): Promise<void> {
    // Throttle: prevent exact same text from playing twice within 2 seconds
    const now = Date.now();
    if (text === this.lastSpokenText && now - this.lastSpokenTime < 2000) {
      return;
    }
    this.lastSpokenText = text;
    this.lastSpokenTime = now;

    if (this.useWebSpeech) {
      await this.speakWithWebSpeech(text);
      return;
    }

    await this.getContext();
    const cachedBuffer = this.audioCache.get(text);
    if (cachedBuffer) {
      await this.playBuffer(cachedBuffer);
      return;
    }

    const apiKey = geminiApiKey;
    if (!apiKey) {
      this.useWebSpeech = true;
      await this.speakWithWebSpeech(text);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' }, 
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const ctx = await this.getContext();
        const audioData = decode(base64Audio);
        const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
        this.audioCache.set(text, audioBuffer);
        await this.playBuffer(audioBuffer);
      }
    } catch (error) {
      this.useWebSpeech = true;
      await this.speakWithWebSpeech(text);
    }
  }

  speak(text: string): Promise<void> {
    const queued = this.speechQueue.then(async () => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        this.performSpeech(text),
        new Promise<void>((resolve) => {
          timeoutId = setTimeout(() => {
            if (this.useWebSpeech) window.speechSynthesis?.cancel();
            resolve();
          }, this.speechTimeoutMs);
        }),
      ]);
      if (timeoutId) clearTimeout(timeoutId);
    });
    this.speechQueue = queued.catch(() => undefined);
    return queued;
  }
}

export const narrator = new SpeechService();
