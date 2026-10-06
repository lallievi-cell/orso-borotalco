import { describe, expect, it } from "vitest";
import { forSpeech, pickVoice, prosody, splitSentences, voiceScore } from "@/game/voice";

describe("voice scoring and selection", () => {
  it("scarta voci non italiane", () => {
    expect(voiceScore({ name: "David", lang: "en-US" })).toBe(-1);
    expect(voiceScore({ name: "Anna", lang: "de-DE" })).toBe(-1);
  });

  it("preferisce voci neurali o premium rispetto a voci base ed espeak", () => {
    const espeak = { name: "it-espeak", lang: "it" };
    const base = { name: "Italian standard", lang: "it-IT" };
    const google = { name: "Google italiano", lang: "it-IT" };
    const neural = { name: "Microsoft Elsa Online (Natural) - Italian", lang: "it-IT" };

    expect(voiceScore(espeak)).toBeLessThan(voiceScore(base));
    expect(voiceScore(base)).toBeLessThan(voiceScore(google));
    expect(voiceScore(google)).toBeLessThan(voiceScore(neural));

    const selected = pickVoice([espeak, base, google, neural]);
    expect(selected?.name).toBe(neural.name);
  });
});

describe("sentence splitting and prosody", () => {
  it("divide correttamente frasi con punteggiatura", () => {
    const text = "Il salotto! Salta sui cuscini. Attenta al vaso...";
    const sentences = splitSentences(text);
    expect(sentences).toEqual(["Il salotto!", "Salta sui cuscini.", "Attenta al vaso..."]);
  });

  it("applica intonazione vivace per esclamazioni e rilassata per punti di sospensione", () => {
    const ex = prosody("Bravissima Celeste!");
    const susp = prosody("Chissà cosa c'è...");
    expect(ex.pitch).toBeGreaterThan(susp.pitch);
  });

  it("pulisce il testo per la sintesi vocale", () => {
    expect(forSpeech("Shhh! Corri al wc! 🦆")).toBe("Sssst! Corri al vater!");
  });
});
