import { LEVEL_COUNT } from "@/game/levels";

export type SaveData = {
  v: 3;
  unlocked: number;
  best: number[];
  cleared: boolean[];
};

const KEY = "orso-borotalco-v1";
const LAST = LEVEL_COUNT - 1;

export const emptySave = (): SaveData => ({
  v: 3,
  unlocked: 0,
  best: Array.from({ length: LEVEL_COUNT }, () => 0),
  cleared: Array.from({ length: LEVEL_COUNT }, () => false),
});

function pad(best: number[], cleared: boolean[]): SaveData {
  const next = emptySave();
  for (let i = 0; i < LEVEL_COUNT; i++) {
    next.best[i] = typeof best[i] === "number" ? best[i] : 0;
    next.cleared[i] = Boolean(cleared[i]);
  }
  return next;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptySave();
    const p = JSON.parse(raw) as {
      v?: number;
      unlocked?: number;
      best?: number[];
      cleared?: boolean[];
    };
    if (p.v === 1 || p.v === 2) {
      const best = Array.from({ length: LEVEL_COUNT }, () => 0);
      const cleared = Array.from({ length: LEVEL_COUNT }, () => false);
      const from5 = p.v === 2 ? [0, 1, 3, 5, 7] : [0, 3, 7];
      from5.forEach((to, from) => {
        best[to] = typeof p.best?.[from] === "number" ? p.best[from] : 0;
        cleared[to] = Boolean(p.cleared?.[from]);
      });
      const oldU = Math.max(0, p.unlocked ?? 0);
      const unlocked = from5[Math.min(from5.length - 1, oldU)] ?? 0;
      return { v: 3, unlocked, best, cleared };
    }
    if (p.v !== 3) return emptySave();
    const data = pad(p.best ?? [], p.cleared ?? []);
    data.unlocked = Math.max(0, Math.min(LAST, p.unlocked ?? 0));
    return data;
  } catch {
    return emptySave();
  }
}

export function writeSave(data: SaveData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
