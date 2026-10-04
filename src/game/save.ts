export type SaveData = {
  v: 1;
  unlocked: number;
  best: number[];
  cleared: boolean[];
};

const KEY = "orso-borotalco-v1";

export const emptySave = (): SaveData => ({
  v: 1,
  unlocked: 0,
  best: [0, 0, 0],
  cleared: [false, false, false],
});

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptySave();
    const p = JSON.parse(raw) as Partial<SaveData>;
    if (p.v !== 1) return emptySave();
    const best = [0, 1, 2].map((i) => (typeof p.best?.[i] === "number" ? p.best[i] : 0));
    const cleared = [0, 1, 2].map((i) => Boolean(p.cleared?.[i]));
    return {
      v: 1,
      unlocked: Math.max(0, Math.min(2, p.unlocked ?? 0)),
      best,
      cleared,
    };
  } catch {
    return emptySave();
  }
}

export function writeSave(data: SaveData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
