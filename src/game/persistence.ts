import type { GameState, Settings } from './types';
import { SAVE_VERSION } from './engine/newGame';

// The key is stable; compatibility is decided by GameState.saveVersion, not the key.
const SAVE_KEY = 'uzbekiston-tycoon:save:v1';
const SETTINGS_KEY = 'uzbekiston-tycoon:settings:v1';

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save game', err);
  }
}

export type SaveStatus = 'none' | 'ok' | 'outdated' | 'corrupt';

/** Pure: classify a raw localStorage string. */
export function parseSave(raw: string | null): { status: SaveStatus; state: GameState | null } {
  if (!raw) return { status: 'none', state: null };
  try {
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || typeof parsed !== 'object') return { status: 'corrupt', state: null };
    if (parsed.saveVersion !== SAVE_VERSION) return { status: 'outdated', state: null };
    if (!Array.isArray(parsed.players) || !parsed.ownership) return { status: 'corrupt', state: null };
    return { status: 'ok', state: parsed };
  } catch {
    return { status: 'corrupt', state: null };
  }
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
}

export function getSaveStatus(): SaveStatus {
  return parseSave(readRaw()).status;
}

export function loadGame(): GameState | null {
  return parseSave(readRaw()).state;
}

/** True only when a save exists AND this build can load it. */
export function hasSavedGame(): boolean {
  return getSaveStatus() === 'ok';
}

export function deleteSavedGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    console.warn('Failed to delete save', err);
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save settings', err);
  }
}

export function loadSettings(): Settings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as Settings) : null;
  } catch (err) {
    console.warn('Failed to load settings', err);
    return null;
  }
}

export const DEFAULT_SETTINGS: Settings = { sound: true, animations: true, aiSpeedMs: 900, language: 'en', theme: 'dark' };

const VALID_LANGUAGES = ['en', 'uz', 'ru', 'uz-cyrl'];

/** Saved preferences merged over the defaults; tolerates missing/garbled storage. */
export function loadPreferredSettings(): Settings {
  const saved = loadSettings();
  const merged: Settings = { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
  if (!VALID_LANGUAGES.includes(merged.language)) merged.language = DEFAULT_SETTINGS.language;
  if (merged.theme !== 'light' && merged.theme !== 'dark') merged.theme = 'dark';
  return merged;
}
