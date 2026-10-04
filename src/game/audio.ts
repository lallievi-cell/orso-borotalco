const MELODY = [523.25, 587.33, 659.25, 523.25, 783.99, 659.25, 587.33, 392];

export function createAudio() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = false;
  let next = 0;
  let step = 0;
  let musicOn = false;

  function ensure() {
    if (typeof AudioContext === "undefined") return null;
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.2;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
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
      if (master) master.gain.value = v ? 0 : 0.2;
    },
    get muted() {
      return muted;
    },
    startMusic() {
      musicOn = true;
      ensure();
    },
    tick() {
      if (!musicOn || muted) return;
      const ac = ensure();
      if (!ac || !master) return;
      const t = ac.currentTime;
      if (next < t) next = t + 0.02;
      while (next < t + 0.35) {
        const f = MELODY[step % MELODY.length] ?? 523;
        tone(f, 0.28, "sine", 0.035, next);
        if (step % 4 === 0) tone(f / 2, 0.36, "triangle", 0.02, next);
        next += 0.36;
        step += 1;
      }
    },
    jump() {
      tone(420, 0.12, "sine", 0.06, undefined, 720);
    },
    coin() {
      tone(880, 0.08, "sine", 0.05);
      tone(1320, 0.12, "sine", 0.04, (ctx?.currentTime ?? 0) + 0.07);
    },
    stomp() {
      tone(240, 0.1, "triangle", 0.05, undefined, 140);
    },
    hurt() {
      tone(220, 0.18, "sine", 0.05, undefined, 120);
    },
    power() {
      tone(523, 0.1, "sine", 0.05);
      tone(659, 0.12, "sine", 0.05, (ctx?.currentTime ?? 0) + 0.08);
      tone(784, 0.16, "sine", 0.05, (ctx?.currentTime ?? 0) + 0.16);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, "sine", 0.06, (ctx?.currentTime ?? 0) + i * 0.1));
    },
    checkpoint() {
      tone(660, 0.1, "sine", 0.04);
      tone(880, 0.14, "sine", 0.04, (ctx?.currentTime ?? 0) + 0.08);
    },
  };
}

export type AudioBus = ReturnType<typeof createAudio>;
