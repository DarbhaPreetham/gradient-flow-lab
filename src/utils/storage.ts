import type { Difficulty } from "./colors";

const KEY = "chromaweave:v1";

export type Settings = {
  sound: boolean;
  haptics: boolean;
  colorBlind: boolean;
};

export type SaveData = {
  settings: Settings;
  unlocked: string[];
  completed: string[];
  best: Record<string, number>;
};

const DEFAULT: SaveData = {
  settings: { sound: true, haptics: true, colorBlind: false },
  unlocked: ["l1"],
  completed: [],
  best: {},
};

export function loadSave(): SaveData {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      settings: { ...DEFAULT.settings, ...(parsed.settings ?? {}) },
      unlocked: parsed.unlocked ?? DEFAULT.unlocked,
      completed: parsed.completed ?? [],
      best: parsed.best ?? {},
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveSave(data: SaveData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function difficultyOrder(d: Difficulty): number {
  return d === "beginner" ? 0 : d === "casual" ? 1 : 2;
}