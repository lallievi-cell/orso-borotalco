import { LEVEL_COUNT } from "@/game/levels";

export type SaveData = {
  v: 5;
  unlocked: number;
  best: number[];
  cleared: boolean[];
  ducks: boolean[];
  starsWallet: number;
  unlockedHats: string[];
  equippedHat: string | null;
  unlockedPowders: string[];
  equippedPowder: string | null;
};

const KEY = "orso-borotalco-v1";
const LAST = LEVEL_COUNT - 1;

export const emptySave = (): SaveData => ({
  v: 5,
  unlocked: 0,
  best: Array.from({ length: LEVEL_COUNT }, () => 0),
  cleared: Array.from({ length: LEVEL_COUNT }, () => false),
  ducks: Array.from({ length: LEVEL_COUNT }, () => false),
  starsWallet: 0,
  unlockedHats: [],
  equippedHat: null,
  unlockedPowders: ["classic"],
  equippedPowder: null,
});

function pad(best: number[], cleared: boolean[], ducks: boolean[]): { best: number[]; cleared: boolean[]; ducks: boolean[] } {
  const pBest = Array.from({ length: LEVEL_COUNT }, () => 0);
  const pCleared = Array.from({ length: LEVEL_COUNT }, () => false);
  const pDucks = Array.from({ length: LEVEL_COUNT }, () => false);
  for (let i = 0; i < LEVEL_COUNT; i++) {
    pBest[i] = typeof best[i] === "number" ? best[i] : 0;
    pCleared[i] = Boolean(cleared[i]);
    pDucks[i] = Boolean(ducks[i]);
  }
  return { best: pBest, cleared: pCleared, ducks: pDucks };
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
      ducks?: boolean[];
      starsWallet?: number;
      unlockedHats?: string[];
      equippedHat?: string | null;
      unlockedPowders?: string[];
      equippedPowder?: string | null;
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
      const initialStars = best.reduce((a, b) => a + b, 0);
      return {
        v: 5,
        unlocked,
        best,
        cleared,
        ducks: Array.from({ length: LEVEL_COUNT }, () => false),
        starsWallet: initialStars,
        unlockedHats: [],
        equippedHat: null,
        unlockedPowders: ["classic"],
        equippedPowder: null,
      };
    }

    if (p.v === 3 || p.v === 4) {
      const padded = pad(p.best ?? [], p.cleared ?? [], p.ducks ?? []);
      const unlocked = Math.max(0, Math.min(LAST, p.unlocked ?? 0));
      const initialStars = padded.best.reduce((a, b) => a + b, 0);
      return {
        v: 5,
        unlocked,
        best: padded.best,
        cleared: padded.cleared,
        ducks: padded.ducks,
        starsWallet: typeof p.starsWallet === "number" ? p.starsWallet : initialStars,
        unlockedHats: Array.isArray(p.unlockedHats) ? p.unlockedHats : [],
        equippedHat: typeof p.equippedHat === "string" ? p.equippedHat : null,
        unlockedPowders: Array.isArray(p.unlockedPowders) ? p.unlockedPowders : ["classic"],
        equippedPowder: typeof p.equippedPowder === "string" ? p.equippedPowder : null,
      };
    }

    if (p.v === 5) {
      const padded = pad(p.best ?? [], p.cleared ?? [], p.ducks ?? []);
      return {
        v: 5,
        unlocked: Math.max(0, Math.min(LAST, p.unlocked ?? 0)),
        best: padded.best,
        cleared: padded.cleared,
        ducks: padded.ducks,
        starsWallet: typeof p.starsWallet === "number" ? p.starsWallet : 0,
        unlockedHats: Array.isArray(p.unlockedHats) ? p.unlockedHats : [],
        equippedHat: typeof p.equippedHat === "string" ? p.equippedHat : null,
        unlockedPowders: Array.isArray(p.unlockedPowders) ? p.unlockedPowders : ["classic"],
        equippedPowder: typeof p.equippedPowder === "string" ? p.equippedPowder : null,
      };
    }

    return emptySave();
  } catch {
    return emptySave();
  }
}

export function writeSave(data: SaveData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
