// Dolce melodia carillon / ninna-nanna per bambini in scala pentatonica maggiore
const LULLABY_NOTES = [
  523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 523.25,
  587.33, 659.25, 587.33, 440.0, 523.25, 659.25, 783.99, 1046.5,
  880.0, 783.99, 659.25, 523.25, 659.25, 587.33, 523.25, 392.0,
  440.0, 523.25, 587.33, 659.25, 523.25, 392.0, 440.0, 523.25,
];

const BASS_NOTES = [
  261.63, 0, 329.63, 0, 392.0, 0, 329.63, 0,
  293.66, 0, 329.63, 0, 261.63, 0, 392.0, 0,
  349.23, 0, 392.0, 0, 329.63, 0, 261.63, 0,
  220.0, 0, 293.66, 0, 261.63, 0, 196.0, 0,
];

export function createAudio() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let musicGain: GainNode | null = null;
  let muted = false;
  let next = 0;
  let step = 0;
  let musicOn = false;

  function ensure() {
    if (typeof AudioContext === "undefined") return null;
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);

      musicGain = ctx.createGain();
      musicGain.gain.value = 0.055;
      musicGain.connect(master);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  // Timbro tipo celesta / carillon con fondamentale e leggera armonica
  function playMusicBoxNote(freq: number, dur: number, at: number, gain = 1) {
    const ac = ensure();
    if (!ac || !musicGain || muted) return;

    // Fondamentale calda
    const o1 = ac.createOscillator();
    const g1 = ac.createGain();
    o1.type = "sine";
    o1.frequency.setValueAtTime(freq, at);
    g1.gain.setValueAtTime(gain * 0.04, at);
    g1.gain.exponentialRampToValueAtTime(0.0005, at + dur);
    o1.connect(g1);
    g1.connect(musicGain);
    o1.start(at);
    o1.stop(at + dur + 0.03);

    // Armonica superiore morbida per dare brillantezza da campanellino
    const o2 = ac.createOscillator();
    const g2 = ac.createGain();
    o2.type = "triangle";
    o2.frequency.setValueAtTime(freq * 2, at);
    g2.gain.setValueAtTime(gain * 0.015, at);
    g2.gain.exponentialRampToValueAtTime(0.0001, at + dur * 0.5);
    o2.connect(g2);
    g2.connect(musicGain);
    o2.start(at);
    o2.stop(at + dur * 0.5 + 0.03);
  }

  function tone(freq: number, dur: number, type: OscillatorType, gain: number, at?: number, slide?: number) {
    const ac = ensure();
    if (!ac || !master || muted) return;
    const t = at ?? ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  return {
    unlock() {
      ensure();
    },
    setMuted(v: boolean) {
      muted = v;
      if (master) master.gain.value = v ? 0 : 0.22;
      if (typeof window !== "undefined" && window.speechSynthesis && v) {
        window.speechSynthesis.cancel();
      }
    },
    get muted() {
      return muted;
    },
    startMusic() {
      musicOn = true;
      ensure();
    },
    speak(text: string) {
      if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "it-IT";
        u.pitch = 1.15; // Voce dolce e amichevole per bambini
        u.rate = 0.92; // Ritmata e scandita bene
        // Seleziona preferibilmente una voce italiana naturale se presente
        const voices = window.speechSynthesis.getVoices();
        const itVoice = voices.find((v) => v.lang.startsWith("it") && !v.name.includes("Google") && !v.name.includes("eSpeak")) ||
          voices.find((v) => v.lang.startsWith("it"));
        if (itVoice) u.voice = itVoice;
        window.speechSynthesis.speak(u);
      } catch {
        // Nessun blocco se la sintesi vocale non è disponibile
      }
    },
    tick() {
      if (!musicOn || muted) return;
      const ac = ensure();
      if (!ac || !musicGain) return;
      const t = ac.currentTime;
      if (next < t) next = t + 0.05;
      while (next < t + 0.45) {
        const stepIdx = step % LULLABY_NOTES.length;
        const note = LULLABY_NOTES[stepIdx] ?? 523.25;
        playMusicBoxNote(note, 0.55, next, 1);

        const bass = BASS_NOTES[stepIdx] ?? 0;
        if (bass > 0) {
          tone(bass, 0.48, "triangle", 0.022, next);
        }
        next += 0.38; // Tempo calmo (~79 BPM)
        step += 1;
      }
    },
    jump() {
      // Salto morbido "boop!" con risalita dolce
      tone(340, 0.14, "sine", 0.065, undefined, 580);
    },
    coin() {
      // Tintinnio di stellina fatata
      const ac = ensure();
      const t = ac?.currentTime ?? 0;
      tone(880, 0.1, "sine", 0.045, t);
      tone(1320, 0.14, "sine", 0.04, t + 0.05);
      tone(1760, 0.16, "sine", 0.03, t + 0.1);
    },
    stomp() {
      // Salto morbido sulla testa dei nemici: "puf!" di cotone
      tone(260, 0.12, "sine", 0.06, undefined, 130);
    },
    bounce() {
      // Molla rimbalzante giocosa: "sproing!"
      const ac = ensure();
      const t = ac?.currentTime ?? 0;
      tone(320, 0.12, "sine", 0.07, t, 680);
      tone(680, 0.14, "triangle", 0.04, t + 0.06, 520);
    },
    bump() {
      // Piccolo tocco buffo se un nemico tocca l'orso fermo
      tone(440, 0.08, "triangle", 0.035, undefined, 480);
    },
    secret() {
      // Fanfara paperella d'oro
      const ac = ensure();
      const t = ac?.currentTime ?? 0;
      [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => {
        tone(f, 0.22, "sine", 0.055, t + i * 0.07);
      });
    },
    hurt() {
      // Suono soffice senza spavento: piccolo starnuto
      tone(220, 0.14, "triangle", 0.04, undefined, 160);
    },
    heal() {
      // Cuoricino rigenerato: arpa dolce
      const ac = ensure();
      const t = ac?.currentTime ?? 0;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        tone(f, 0.18, "sine", 0.045, t + i * 0.06);
      });
    },
    power() {
      // Potenziamento magico
      const ac = ensure();
      const t = ac?.currentTime ?? 0;
      [587.33, 739.99, 880.0, 1174.66].forEach((f, i) => {
        tone(f, 0.16, "sine", 0.05, t + i * 0.07);
      });
    },
    win() {
      // Trionfo finale
      const ac = ensure();
      const t = ac?.currentTime ?? 0;
      [523, 659, 784, 880, 1046].forEach((f, i) => tone(f, 0.28, "sine", 0.065, t + i * 0.09));
    },
    checkpoint() {
      // Lampada checkpoint
      const ac = ensure();
      const t = ac?.currentTime ?? 0;
      tone(698.46, 0.12, "sine", 0.04, t);
      tone(880.0, 0.18, "sine", 0.04, t + 0.08);
    },
  };
}

export type AudioBus = ReturnType<typeof createAudio>;
