import { LEVEL_COUNT } from "@/game/levels";

export type SaveData = {
  v: 2;
  unlocked: number;
  best: number[];
  cleared: boolean[];
};

const KEY = "orso-borotalco-v1";
const LAST = LEVEL_COUNT - 1;

export const emptySave = (): SaveData => ({
  v: 2,
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
    if (p.v === 1) {
      const best = [0, 0, 0, 0, 0];
      const cleared = [false, false, false, false, false];
      best[0] = typeof p.best?.[0] === "number" ? p.best[0] : 0;
      best[2] = typeof p.best?.[1] === "number" ? p.best[1] : 0;
      best[4] = typeof p.best?.[2] === "number" ? p.best[2] : 0;
      cleared[0] = Boolean(p.cleared?.[0]);
      cleared[2] = Boolean(p.cleared?.[1]);
      cleared[4] = Boolean(p.cleared?.[2]);
      let unlocked = 0;
      if ((p.unlocked ?? 0) >= 1 || cleared[0]) unlocked = 2;
      if ((p.unlocked ?? 0) >= 2 || cleared[2]) unlocked = LAST;
      return { v: 2, unlocked, best, cleared };
    }
    if (p.v !== 2) return emptySave();
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
