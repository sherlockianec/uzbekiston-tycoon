import { useCallback, useRef } from 'react';

export type SoundName = 'dice' | 'buy' | 'cash-in' | 'cash-out' | 'card' | 'error';

interface Note {
  type: OscillatorType;
  freq: number;
  start: number;
  duration: number;
  volume: number;
}

function soundRecipe(name: SoundName): Note[] {
  switch (name) {
    case 'dice':
      return [
        { type: 'triangle', freq: 220, start: 0, duration: 0.06, volume: 0.12 },
        { type: 'triangle', freq: 330, start: 0.07, duration: 0.06, volume: 0.12 },
      ];
    case 'buy':
      return [
        { type: 'sine', freq: 440, start: 0, duration: 0.1, volume: 0.15 },
        { type: 'sine', freq: 660, start: 0.08, duration: 0.15, volume: 0.15 },
      ];
    case 'cash-in':
      return [
        { type: 'sine', freq: 523, start: 0, duration: 0.12, volume: 0.14 },
        { type: 'sine', freq: 784, start: 0.05, duration: 0.14, volume: 0.12 },
      ];
    case 'cash-out':
      return [
        { type: 'sine', freq: 392, start: 0, duration: 0.16, volume: 0.14 },
        { type: 'sine', freq: 262, start: 0.08, duration: 0.16, volume: 0.12 },
      ];
    case 'card':
      return [{ type: 'square', freq: 300, start: 0, duration: 0.05, volume: 0.08 }];
    case 'error':
      return [{ type: 'sawtooth', freq: 180, start: 0, duration: 0.15, volume: 0.1 }];
    default:
      return [];
  }
}

/** Returns a `play(name)` function that makes short procedural tones — no
 * audio assets involved, so there's nothing to license or fetch. */
export function useSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  return useCallback(
    (name: SoundName) => {
      if (!enabled) return;
      try {
        if (!ctxRef.current) {
          const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!Ctor) return;
          ctxRef.current = new Ctor();
        }
        const ctx = ctxRef.current;
        const now = ctx.currentTime;
        for (const note of soundRecipe(name)) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = note.type;
          osc.frequency.setValueAtTime(note.freq, now + note.start);
          gain.gain.setValueAtTime(0, now + note.start);
          gain.gain.linearRampToValueAtTime(note.volume, now + note.start + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + note.start);
          osc.stop(now + note.start + note.duration + 0.02);
        }
      } catch {
        // Sound is a nicety; never let it break gameplay.
      }
    },
    [enabled]
  );
}
