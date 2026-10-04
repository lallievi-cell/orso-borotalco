import { ChevronLeft, ChevronRight, House, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { asset, loadArt, type Art } from "@/game/assets";
import { createAudio, type AudioBus } from "@/game/audio";
import { renderTitle, renderWorld } from "@/game/draw";
import { coinTotal, coinsLeft, createSim, powerLabel, step, type Sim } from "@/game/sim";
import { emptySave, loadSave, writeSave, type SaveData } from "@/game/save";
import { PH, PW, VIEW_H, VIEW_W, type Input } from "@/game/types";

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      getY: () => number;
      setKeys: (codes: string[]) => void;
    };
  }
}

type Mode = "title" | "play" | "pause" | "win";

type Hud = {
  hearts: number;
  stars: number;
  left: number;
  total: number;
  name: string;
  index: number;
  powder: number;
  glide: number;
  speed: number;
  hint: string;
};

type WinInfo = {
  index: number;
  stars: number;
  left: number;
  title: string;
  text: string;
};

const ZERO: Input = { x: 0, jumpHeld: false, jumpPressed: false, down: false };
const NAMES = ["Il salotto", "Il corridoio", "Le scale"];

const emptyHud = (): Hud => ({
  hearts: 5,
  stars: 0,
  left: 0,
  total: 0,
  name: "",
  index: 0,
  powder: 0,
  glide: 0,
  speed: 0,
  hint: "",
});

function toHud(sim: Sim): Hud {
  return {
    hearts: sim.player.hearts,
    stars: sim.player.stars,
    left: coinsLeft(sim),
    total: coinTotal(sim),
    name: sim.name,
    index: sim.levelIndex,
    powder: sim.player.powder,
    glide: sim.player.glide,
    speed: sim.player.speed,
    hint: sim.t < 8 ? sim.hint : "",
  };
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function OrsoGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("title");
  const [hud, setHud] = useState<Hud>(emptyHud);
  const [toast, setToast] = useState("");
  const [win, setWin] = useState<WinInfo | null>(null);
  const [help, setHelp] = useState(false);
  const [save, setSave] = useState<SaveData>(emptySave);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);
  const bag = useRef({
    mode: "title" as Mode,
    sim: null as Sim | null,
    art: null as Art | null,
    keys: new Set<string>(),
    injected: new Set<string>(),
    pointers: new Map<number, string>(),
    jumpDownAt: 0,
    wasJump: false,
    audio: null as AudioBus | null,
    save: emptySave(),
    cam: { x: 0, y: 0 },
    hudAt: 0,
    titleT: 0,
    gentle: false,
    toastTimer: 0,
  });

  useEffect(() => {
    const audio = createAudio();
    bag.current.audio = audio;
    const stored = loadSave();
    bag.current.save = stored;
    setSave(stored);
    const mute = localStorage.getItem("orso-borotalco-mute") === "1";
    audio.setMuted(mute);
    setMuted(mute);
    bag.current.gentle = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse), (max-width: 900px)");
    const onCoarse = () => setTouch(coarse.matches);
    onCoarse();
    coarse.addEventListener("change", onCoarse);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let dead = false;
    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    const say = (text: string) => {
      setToast(text);
      window.clearTimeout(bag.current.toastTimer);
      bag.current.toastTimer = window.setTimeout(() => {
        if (!dead) setToast("");
      }, 2300);
    };

    const readInput = (): Input => {
      const has = (code: string) => bag.current.keys.has(code) || bag.current.injected.has(code);
      let x = 0;
      if (has("KeyA") || has("ArrowLeft")) x -= 1;
      if (has("KeyD") || has("ArrowRight")) x += 1;
      const jumpHeld = has("Space") || has("ArrowUp") || has("KeyW");
      const jumpPressed = jumpHeld && !bag.current.wasJump;
      bag.current.wasJump = jumpHeld;
      return { x, jumpHeld, jumpPressed, down: has("ArrowDown") || has("KeyS") };
    };

    const onKeyDown = (e: KeyboardEvent) => {
      bag.current.keys.add(e.code);
      const m = bag.current.mode;
      const gameKey =
        e.code === "Space" ||
        e.code.startsWith("Arrow") ||
        e.code === "KeyA" ||
        e.code === "KeyD" ||
        e.code === "KeyW" ||
        e.code === "KeyS";
      if ((m === "play" || m === "pause") && gameKey) e.preventDefault();
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") bag.current.jumpDownAt = performance.now();
      if (e.code === "Escape" || e.code === "KeyP") {
        if (m === "play") {
          bag.current.mode = "pause";
          setMode("pause");
        } else if (m === "pause") {
          bag.current.wasJump = bag.current.keys.has("Space") || bag.current.keys.has("ArrowUp") || bag.current.keys.has("KeyW");
          bag.current.mode = "play";
          setMode("play");
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const move = e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "KeyA" || e.code === "KeyD";
      // Some keyboards drop the direction key the instant jump is pressed. Ignore that fake release.
      if (move && performance.now() - bag.current.jumpDownAt < 120) return;
      bag.current.keys.delete(e.code);
    };
    const onBlur = () => bag.current.keys.clear();
    const onUnlock = () => audio.unlock();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pointerdown", onUnlock);
    const onPointerUp = (e: PointerEvent) => {
      const code = bag.current.pointers.get(e.pointerId);
      if (!code) return;
      bag.current.pointers.delete(e.pointerId);
      for (const held of bag.current.pointers.values()) if (held === code) return;
      bag.current.keys.delete(code);
    };
    window.addEventListener("pointerup", onPointerUp);

    void loadArt().then((art) => {
      if (!dead) bag.current.art = art;
    });

    const frame = (now: number) => {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const b = bag.current;
      b.titleT += dt;
      const sim = b.sim;
      if (sim && (b.mode === "play" || b.mode === "win")) {
        acc += dt;
        let n = 0;
        while (acc >= 1 / 60 && n < 5) {
          const input = b.mode === "play" && !sim.won ? readInput() : ZERO;
          const ev = step(sim, input, 1 / 60);
          if (ev.jump) audio.jump();
          if (ev.coins) audio.coin();
          if (ev.stomp) audio.stomp();
          if (ev.hurt) audio.hurt();
          if (ev.checkpoint) {
            audio.checkpoint();
            say("Lucina accesa. Da qui si riparte.");
          }
          if (ev.power) {
            audio.power();
            say(powerLabel[ev.power]);
          } else if (ev.heal) say("Un cuoricino in più!");
          if (ev.nap) say("Facciamo un riposino… e si riparte.");
          else if (ev.fall) say("Ops! Ti riprendo io.");
          if (ev.win) {
            b.mode = "win";
            setMode("win");
            audio.win();
            const next = {
              ...b.save,
              best: [...b.save.best],
              cleared: [...b.save.cleared],
            };
            next.best[sim.levelIndex] = Math.max(next.best[sim.levelIndex] ?? 0, sim.player.stars);
            next.cleared[sim.levelIndex] = true;
            next.unlocked = Math.max(next.unlocked, Math.min(2, sim.levelIndex + 1));
            b.save = next;
            writeSave(next);
            setSave(next);
            setWin({
              index: sim.levelIndex,
              stars: sim.player.stars,
              left: coinsLeft(sim),
              title: sim.winTitle,
              text: sim.winText,
            });
          }
          acc -= 1 / 60;
          n += 1;
        }
        const look = clamp(sim.player.vx * 0.28, -140, 140);
        const tx = clamp(sim.player.x + PW / 2 - VIEW_W / 2 + look, 0, Math.max(0, sim.w - VIEW_W));
        const ty = clamp(sim.player.y + PH / 2 - VIEW_H * 0.58, 0, Math.max(0, sim.h - VIEW_H));
        const follow = 1 - Math.exp(-8 * dt);
        b.cam.x += (tx - b.cam.x) * follow;
        b.cam.y += (ty - b.cam.y) * follow;
        if (now - b.hudAt > 120) {
          b.hudAt = now;
          setHud(toHud(sim));
        }
      }

      window.__controlsTest = {
        getYaw: () => b.sim?.player.x ?? 0,
        getSpeed: () => Math.abs(b.sim?.player.vx ?? 0),
        getX: () => b.sim?.player.x ?? 0,
        getY: () => b.sim?.player.y ?? 0,
        setKeys: (codes: string[]) => {
          b.injected.clear();
          for (const code of codes) b.injected.add(code);
        },
      };

      const scale = Math.min(canvas.width / VIEW_W, canvas.height / VIEW_H);
      const ox = (canvas.width - VIEW_W * scale) / 2;
      const oy = (canvas.height - VIEW_H * scale) * 0.16;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#fff4e4";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, ox, oy);
      ctx.imageSmoothingEnabled = true;
      if (!b.art) {
        ctx.fillStyle = "#fff4e4";
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      } else if (b.mode === "title" || !sim) {
        renderTitle(ctx, b.art, b.titleT);
      } else {
        renderWorld(ctx, sim, b.art, b.cam.x, b.cam.y);
      }
      audio.tick();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pointerdown", onUnlock);
      window.removeEventListener("pointerup", onPointerUp);
      coarse.removeEventListener("change", onCoarse);
      window.clearTimeout(bag.current.toastTimer);
      delete window.__controlsTest;
    };
  }, []);

  function begin(index: number) {
    const sim = createSim(index);
    sim.gentle = bag.current.gentle;
    bag.current.sim = sim;
    bag.current.cam = { x: Math.max(0, sim.player.x - 160), y: 0 };
    bag.current.wasJump = false;
    bag.current.keys.clear();
    bag.current.mode = "play";
    bag.current.hudAt = 0;
    setHud(toHud(sim));
    setWin(null);
    setToast("");
    setHelp(false);
    setMode("play");
    bag.current.audio?.unlock();
    bag.current.audio?.startMusic();
  }

  function releasePointer(id: number) {
    const code = bag.current.pointers.get(id);
    if (!code) return;
    bag.current.pointers.delete(id);
    for (const held of bag.current.pointers.values()) if (held === code) return;
    bag.current.keys.delete(code);
  }

  function hold(code: string) {
    return {
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        bag.current.pointers.set(e.pointerId, code);
        bag.current.keys.add(code);
      },
      onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => releasePointer(e.pointerId),
      onPointerCancel: () => {
        // Phones cancel the first finger when Salta is pressed. Keep holding.
      },
    };
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    bag.current.audio?.setMuted(next);
    localStorage.setItem("orso-borotalco-mute", next ? "1" : "0");
  }

  const playing = mode === "play" || mode === "pause" || mode === "win";
  const active = Math.max(0, hud.powder, hud.glide, hud.speed);
  const activeName = hud.powder > 0 ? "Nuvoletta" : hud.glide > 0 ? "Planata" : hud.speed > 0 ? "Corsa" : "";

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-cream text-cocoa">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      <div className="pointer-events-none relative z-10 flex h-full flex-col">
        {mode === "title" ? (
          <div className="pointer-events-auto mt-auto flex w-full justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex w-full max-w-xl flex-col items-center gap-3 rounded-card bg-foam/95 px-5 py-5 text-center shadow-lg">
              <p className="rounded-full bg-peach/40 px-3 py-1 font-display text-sm">Tre stanze, un bagno</p>
              <img src={asset("/sprites/bear/idle-1.png")} alt="" className="floaty h-28 w-auto sm:h-40" />
              <div>
                <h1 className="font-display text-4xl leading-none sm:text-6xl">Orso Borotalco</h1>
                <p className="mt-2 text-base leading-snug sm:text-lg">
                  Gli scappa la cacca. Aiutalo ad arrivare in bagno!
                </p>
                <p className="mt-1 text-sm text-cocoa/70">Cuscini molla, tappeti che camminano e scale da salire. Se sbaglia, fa un riposino.</p>
              </div>
              <button
                type="button"
                className="min-h-14 w-full max-w-xs rounded-full bg-peach px-6 font-display text-2xl text-cocoa"
                onClick={() => begin(0)}
              >
                Giochiamo
              </button>
              <div className="grid w-full grid-cols-3 gap-2">
                {NAMES.map((name, i) => {
                  const locked = i > save.unlocked;
                  return (
                    <button
                      key={name}
                      type="button"
                      disabled={locked}
                      onClick={() => begin(i)}
                      className="min-h-12 rounded-2xl bg-cream px-2 py-2 text-sm disabled:opacity-40"
                    >
                      <span className="block font-display text-base leading-tight">{name}</span>
                      <span className="text-cocoa/70">{locked ? "chiuso" : save.best[i] ? `${save.best[i]} stelline` : "aperto"}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button type="button" className="min-h-11 rounded-full bg-mint px-4 text-cocoa" onClick={() => setHelp(true)}>
                  Come si gioca
                </button>
                <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-cream" onClick={toggleMute} aria-label={muted ? "Attiva il suono" : "Silenzia"}>
                  {muted ? <VolumeX /> : <Volume2 />}
                </button>
              </div>
              {save.cleared.every(Boolean) ? <p className="font-display text-mint">Tutti i bagni: che campione!</p> : null}
            </div>
          </div>
        ) : null}

        {playing ? (
          <div className="pointer-events-none flex flex-col gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="flex items-center justify-between gap-2">
              <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-foam/95 px-2.5 py-1.5 shadow">
                <div className="flex">
                  {Array.from({ length: 5 }, (_, i) => (
                    <img
                      key={i}
                      src={asset("/sprites/heart.png")}
                      alt=""
                      className={`h-6 w-6 object-contain ${i < hud.hearts ? "" : "opacity-25"}`}
                    />
                  ))}
                </div>
                <img src={asset("/sprites/star.png")} alt="" className="h-6 w-6 object-contain" />
                <span className="font-display text-lg leading-none">{hud.stars}</span>
              </div>
              <div className="pointer-events-auto flex gap-2">
                <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-foam shadow" onClick={toggleMute} aria-label={muted ? "Attiva il suono" : "Silenzia"}>
                  {muted ? <VolumeX /> : <Volume2 />}
                </button>
                {mode === "play" ? (
                  <button
                    type="button"
                    className="grid h-11 w-11 place-items-center rounded-full bg-foam shadow"
                    aria-label="Pausa"
                    onClick={() => {
                      bag.current.mode = "pause";
                      setMode("pause");
                    }}
                  >
                    <Pause />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mx-auto rounded-full bg-foam/95 px-3 py-1 text-center font-display text-base shadow">
              {hud.name}
              <span className="ml-2 text-sm text-cocoa/70">{hud.left} rimaste</span>
            </div>
          </div>
        ) : null}

        {playing && activeName ? (
          <p className="pointer-events-none mx-auto mt-2 rounded-full bg-mint px-4 py-1 font-display text-cocoa">
            {activeName} {Math.ceil(active)}s
          </p>
        ) : null}

        {playing && hud.hint ? (
          <p className="pointer-events-none mx-auto mt-2 max-w-md rounded-full bg-foam/95 px-4 py-2 text-center text-sm shadow">{hud.hint}</p>
        ) : null}

        {toast ? (
          <p className="pointer-events-none mx-auto mt-2 max-w-md rounded-full bg-peach px-4 py-2 text-center font-display text-lg text-cocoa shadow" aria-live="polite">
            {toast}
          </p>
        ) : null}

        <div className="sr-only" aria-live="polite">
          {toast}
        </div>

        {touch && mode === "play" ? (
          <div className="pointer-events-none mt-auto flex items-end justify-between px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [touch-action:none]">
            <div className="pointer-events-auto flex gap-3 [touch-action:none]">
              <button type="button" aria-label="Sinistra" className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-foam/95 text-cocoa shadow-lg" {...hold("ArrowLeft")}>
                <ChevronLeft className="h-9 w-9" />
              </button>
              <button type="button" aria-label="Destra" className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-foam/95 text-cocoa shadow-lg" {...hold("ArrowRight")}>
                <ChevronRight className="h-9 w-9" />
              </button>
            </div>
            <div className="pointer-events-auto flex items-end gap-2 [touch-action:none]">
              <button type="button" aria-label="Scendi" className="grid h-14 min-w-14 place-items-center rounded-full bg-cream/95 px-3 font-display text-sm text-cocoa shadow-lg" {...hold("ArrowDown")}>
                Giù
              </button>
              <button
                type="button"
                aria-label="Salta"
                className="grid h-20 min-w-28 place-items-center rounded-full bg-peach px-5 font-display text-2xl text-cocoa shadow-lg"
                {...hold("Space")}
              >
                Salta
              </button>
            </div>
          </div>
        ) : <div className="mt-auto" />}

        {mode === "pause" && bag.current.sim ? (
          <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-cocoa/35 p-4">
            <div className="w-full max-w-sm rounded-card bg-foam px-6 py-6 text-center shadow-lg">
              <h2 className="font-display text-3xl">Pausa</h2>
              <p className="mt-1 text-cocoa/80">Orso ti aspetta.</p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-peach font-display text-xl"
                  onClick={() => {
                    bag.current.wasJump = true;
                    bag.current.mode = "play";
                    setMode("play");
                  }}
                >
                  <Play className="h-5 w-5" /> Continua
                </button>
                <button type="button" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cream font-display text-xl" onClick={() => begin(bag.current.sim?.levelIndex ?? 0)}>
                  <RotateCcw className="h-5 w-5" /> Da capo
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cream font-display text-xl"
                  onClick={() => {
                    bag.current.mode = "title";
                    bag.current.keys.clear();
                    setMode("title");
                  }}
                >
                  <House className="h-5 w-5" /> Al titolo
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {mode === "win" && win ? (
          <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-cocoa/35 p-4">
            <div className="w-full max-w-sm rounded-card bg-foam px-6 py-6 text-center shadow-lg">
              <img src={asset("/sprites/bear/idle-2.png")} alt="" className="floaty mx-auto h-24 w-auto" />
              <h2 className="font-display text-4xl">{win.title}</h2>
              <p className="mt-2 text-lg leading-snug">{win.text}</p>
              <p className="mt-3 font-display text-2xl text-gold">Stelline {win.stars}</p>
              {win.left === 0 ? <p className="text-sm">Hai preso tutte le stelline del livello!</p> : <p className="text-sm text-cocoa/70">Ne sono rimaste {win.left} lungo la strada.</p>}
              <div className="mt-4 flex flex-col gap-2">
                {win.index < 2 ? (
                  <button type="button" className="min-h-12 rounded-full bg-peach font-display text-xl" onClick={() => begin(win.index + 1)}>
                    Avanti
                  </button>
                ) : (
                  <p className="font-display text-xl text-mint">Tutti i bagni! Che sollievo.</p>
                )}
                <button type="button" className="min-h-12 rounded-full bg-cream font-display text-xl" onClick={() => begin(win.index)}>
                  Gioca ancora
                </button>
                <button
                  type="button"
                  className="min-h-12 rounded-full bg-cream font-display text-xl"
                  onClick={() => {
                    bag.current.mode = "title";
                    bag.current.keys.clear();
                    setMode("title");
                  }}
                >
                  Al titolo
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {help ? (
          <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-cocoa/40 p-4">
            <div className="max-h-[85vh] w-full max-w-md overflow-auto rounded-card bg-foam px-6 py-5 shadow-lg">
              <h2 className="font-display text-3xl">Come si gioca</h2>
              <ul className="mt-3 space-y-2 text-base leading-snug">
                <li>Frecce oppure A e D per camminare. Spazio, W o il pulsante Salta per saltare. Tieni premuto per un salto più alto. Giù per scendere da un cuscino.</li>
                <li>Il cuscino a righe è una molla: ci salti sopra e voli. Alcuni tappeti si muovono da soli, salici sopra.</li>
                <li>Spugna Birba cammina, Rotolino rotola, la Bolla vola, Paperotto l'anatra saltella. Saltagli sulla testa: si fermano e tu rimbalzi.</li>
                <li>Il barattolo di borotalco fa una nuvoletta: nessuno ti tocca e salti più su.</li>
                <li>La ciambella di sapone ti fa planare se tieni premuto il salto.</li>
                <li>Lo spazzolino ti fa correre. Il cuoricino di cotone è una vita in più.</li>
                <li>Dieci stelline ridanno un cuoricino, se ne manca uno. La porta con scritto BAGNO è il traguardo.</li>
              </ul>
              <button type="button" className="mt-4 min-h-12 w-full rounded-full bg-peach font-display text-xl" onClick={() => setHelp(false)}>
                Ho capito
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
