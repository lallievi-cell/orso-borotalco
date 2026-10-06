/**
 * Voce narrante: sceglie la voce italiana migliore disponibile sul dispositivo
 * e prepara il testo perché suoni più naturale (frasi corte, intonazione per "!" e "?").
 * Funzioni pure, così si possono testare senza browser.
 */

export type VoiceLike = { name: string; lang: string; localService?: boolean };

/** Punteggio di qualità di una voce. -1 = non italiana, non usarla. */
export function voiceScore(v: VoiceLike): number {
  const lang = v.lang.toLowerCase().replace("_", "-");
  if (!lang.startsWith("it")) return -1;
  const n = v.name.toLowerCase();
  // eSpeak è la voce robotica di Linux/Android vecchi: solo come ultima spiaggia.
  if (n.includes("espeak")) return 0;
  let s = 10;
  if (lang === "it-it") s += 2;
  // Edge/Windows: "Microsoft Elsa Online (Natural)" sono le voci neurali, le migliori in assoluto.
  if (/natural|neural|online/.test(n)) s += 50;
  // iPad/Mac: le voci "Premium" o "Enhanced"/"Migliorata" scaricate dalle impostazioni.
  if (/premium|enhanced|migliorat/.test(n)) s += 40;
  // Chrome: "Google italiano" è fluida, meglio delle voci di sistema base.
  if (n.includes("google")) s += 25;
  if (/compact|compatt/.test(n)) s -= 8;
  // A parità di qualità, una voce femminile dolce per raccontare la fiaba.
  if (/elsa|isabella|alice|federica|paola|emma|bianca|carla|giorgia|valentina|chiara/.test(n)) s += 5;
  return s;
}

export function pickVoice<T extends VoiceLike>(voices: readonly T[]): T | null {
  let best: T | null = null;
  let bestScore = -1;
  for (const v of voices) {
    const s = voiceScore(v);
    if (s > bestScore) {
      best = v;
      bestScore = s;
    }
  }
  return bestScore >= 0 ? best : null;
}

/**
 * Divide il testo in frasi. Frasi brevi suonano più naturali, e Chrome a volte
 * tronca le frasi lunghe dopo una quindicina di secondi.
 */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Intonazione per frase: più squillante sulle esclamazioni, più lenta sulle frasi normali. */
export function prosody(sentence: string): { pitch: number; rate: number } {
  const t = sentence.trim();
  if (t.endsWith("!")) return { pitch: 1.18, rate: 0.94 };
  if (t.endsWith("?")) return { pitch: 1.12, rate: 0.9 };
  if (t.endsWith("…") || t.endsWith("...")) return { pitch: 1.02, rate: 0.82 };
  return { pitch: 1.08, rate: 0.88 };
}

/** Correzioni di pronuncia per la sintesi vocale (il testo a schermo resta uguale). */
export function forSpeech(text: string): string {
  return text
    .replace(/\bShhh\b/gi, "Sssst")
    .replace(/\bwc\b/gi, "vater")
    .replace(/[⏩★♥✨🦆🐾👑🌟]/gu, "")
    .trim();
}
