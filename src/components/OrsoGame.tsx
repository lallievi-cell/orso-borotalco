import { ChevronLeft, House, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { asset, loadArt, type Art } from "@/game/assets";
import { createAudio, type AudioBus } from "@/game/audio";
import { renderTitle, renderWorld } from "@/game/draw";
import { coinTotal, coinsLeft, createSim, step, type Sim } from "@/game/sim";
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
const NAMES = ["Il salotto", "La cucina", "Il giardino", "Il corridoio", "La lavanderia", "La cameretta", "Il terrazzo", "Il bagno"];

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
  const [win, setWin] = useState<WinInfo | null>(null);
  const [story, setStory] = useState(false);
  const [panel, setPanel] = useState(0);
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
    jumps: new Set<number>(),
    jumpQueue: 0,
    jumpDownAt: 0,
    wasJump: false,
    audio: null as AudioBus | null,
    save: emptySave(),
    cam: { x: 0, y: 0 },
    hudAt: 0,
    titleT: 0,
    gentle: false,
    touch: false,
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
    const onCoarse = () => {
      bag.current.touch = coarse.matches;
      setTouch(coarse.matches);
    };
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

    const readInput = (): Input => {
      const has = (code: string) => bag.current.keys.has(code) || bag.current.injected.has(code);
      let touchingLeft = false;
      let touchingRight = false;
      for (const code of bag.current.pointers.values()) {
        if (code === "ArrowLeft") touchingLeft = true;
        if (code === "ArrowRight") touchingRight = true;
      }
      let x = 0;
      const left = has("KeyA") || has("ArrowLeft") || touchingLeft;
      const right = has("KeyD") || has("ArrowRight") || touchingRight;
      if (left) x -= 1;
      if (right) x += 1;
      const auto = bag.current.touch && x === 0;
      if (auto) x = 1;
      const jumpHeldKeys = has("Space") || has("ArrowUp") || has("KeyW") || bag.current.jumps.size > 0;
      const tapped = bag.current.jumpQueue > 0;
      if (tapped) bag.current.jumpQueue = 0;
      const jumpHeld = jumpHeldKeys || tapped;
      const jumpPressed = tapped || (jumpHeldKeys && !bag.current.wasJump);
      bag.current.wasJump = jumpHeldKeys;
      return { x, jumpHeld, jumpPressed, down: has("ArrowDown") || has("KeyS"), auto };
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
      bag.current.keys.delete(e.code);
    };
    const onBlur = () => {
      bag.current.keys.clear();
      bag.current.pointers.clear();
      bag.current.jumps.clear();
      bag.current.jumpQueue = 0;
    };
    const onUnlock = () => audio.unlock();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pointerdown", onUnlock);
    const releaseTouch = (id: number) => {
      bag.current.pointers.delete(id);
      if (!bag.current.jumps.delete(id)) return;
    };
    const onPointerUp = (e: PointerEvent) => releaseTouch(e.pointerId);
    const onPointerCancel = (e: PointerEvent) => releaseTouch(e.pointerId);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);

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
          if (ev.checkpoint) audio.checkpoint();
          if (ev.power) audio.power();
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
            next.unlocked = Math.max(next.unlocked, Math.min(NAMES.length - 1, sim.levelIndex + 1));
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
      const wide = canvas.width / canvas.height > VIEW_W / VIEW_H;
      const ox = (canvas.width - VIEW_W * scale) / 2;
      const oy = wide ? (canvas.height - VIEW_H * scale) / 2 : (canvas.height - VIEW_H * scale) * 0.12;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = wide ? "#f3c7ae" : "#fff4e4";
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
      window.removeEventListener("pointercancel", onPointerCancel);
      coarse.removeEventListener("change", onCoarse);
      delete window.__controlsTest;
    };
  }, []);

  useEffect(() => {
    if (!story) return;
    const id = window.setTimeout(() => {
      if (panel >= 3) {
        setStory(false);
        begin(0);
      } else {
        setPanel(panel + 1);
      }
    }, 2600);
    return () => window.clearTimeout(id);
  }, [story, panel]);

  function openStory() {
    setPanel(0);
    setStory(true);
    bag.current.audio?.unlock();
  }

  function advanceStory() {
    if (panel >= 3) {
      setStory(false);
      begin(0);
      return;
    }
    setPanel(panel + 1);
  }

  function begin(index: number) {
    const sim = createSim(index);
    sim.gentle = bag.current.gentle;
    bag.current.sim = sim;
    bag.current.cam = { x: Math.max(0, sim.player.x - 160), y: 0 };
    bag.current.wasJump = false;
    bag.current.keys.clear();
    bag.current.pointers.clear();
    bag.current.jumps.clear();
    bag.current.jumpQueue = 0;
    bag.current.mode = "play";
    bag.current.hudAt = 0;
    setHud(toHud(sim));
    setWin(null);
    setHelp(false);
    setMode("play");
    bag.current.audio?.unlock();
    bag.current.audio?.startMusic();
  }

  function releasePointer(id: number) {
    bag.current.pointers.delete(id);
  }

  function hold(code: string) {
    return {
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        bag.current.jumps.delete(e.pointerId);
        bag.current.pointers.set(e.pointerId, code);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* il dito è già finito */
        }
      },
      onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => releasePointer(e.pointerId),
      onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => releasePointer(e.pointerId),
    };
  }

  function jumpDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-move]")) return;
    e.preventDefault();
    bag.current.jumps.add(e.pointerId);
    bag.current.jumpQueue += 1;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* il dito è già finito */
    }
  }

  function jumpUp(e: React.PointerEvent<HTMLDivElement>) {
    bag.current.jumps.delete(e.pointerId);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    bag.current.audio?.setMuted(next);
    localStorage.setItem("orso-borotalco-mute", next ? "1" : "0");
  }

  const playing = mode === "play" || mode === "pause" || mode === "win";
  const active = Math.max(0, hud.powder, hud.glide, hud.speed);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-cream text-cocoa">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      <div className="pointer-events-none relative z-10 flex h-full flex-col">
        {mode === "title" ? (
          <div className="pointer-events-auto flex h-full items-center justify-center overflow-y-auto px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex max-h-full w-full max-w-5xl flex-col items-center gap-2 rounded-card bg-foam/95 px-4 py-3 text-center shadow-lg landscape:flex-row landscape:items-center landscape:gap-5 landscape:px-6 landscape:py-4 landscape:text-left">
              <img src={asset("/sprites/bear/idle-1.png")} alt="" className="floaty h-20 w-auto object-contain sm:h-28 landscape:h-28" />
              <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-2 landscape:items-stretch">
                <div>
                  <p className="font-display text-sm text-cocoa/70">Otto stanze, un bagno</p>
                  <h1 className="font-display text-4xl leading-none sm:text-5xl landscape:text-4xl">Orso Borotalco</h1>
                  <p className="mt-1 text-sm leading-snug sm:text-base landscape:hidden">Gli scappa la cacca. Aiutalo ad arrivare in bagno!</p>
                </div>
                <button
                  type="button"
                  className="min-h-14 w-full rounded-full bg-peach px-6 font-display text-2xl text-cocoa"
                  onClick={openStory}
                >
                  Giochiamo
                </button>
                <div className="grid w-full grid-cols-4 gap-2">
                  {NAMES.map((name, i) => {
                    const locked = i > save.unlocked;
                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={locked}
                        onClick={() => begin(i)}
                        className="min-h-12 rounded-2xl bg-cream px-1 py-1 text-sm disabled:opacity-40 landscape:min-h-10"
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
                  <button type="button" className="min-h-11 rounded-full bg-cream px-4 text-cocoa" onClick={openStory}>
                    Storia
                  </button>
                  <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-cream" onClick={toggleMute} aria-label={muted ? "Attiva il suono" : "Silenzia"}>
                    {muted ? <VolumeX /> : <Volume2 />}
                  </button>
                </div>
                {save.cleared.every(Boolean) ? <p className="font-display text-mint">Tutti i bagni: che campione!</p> : null}
              </div>
            </div>
          </div>
        ) : null}

        {playing ? (
          <div className="pointer-events-none relative z-30 flex flex-col gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
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
                {active > 0 ? (
                  <span className="ml-1 font-display text-lg leading-none text-cocoa/80">{Math.ceil(active)}</span>
                ) : null}
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
          </div>
        ) : null}

        {touch && mode === "play" ? (
          <div
            className="pointer-events-auto absolute inset-0 z-20 touch-none"
            onPointerDown={jumpDown}
            onPointerUp={jumpUp}
            onPointerCancel={jumpUp}
          />
        ) : null}

        {touch && mode === "play" ? (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-start px-[max(0.75rem,env(safe-area-inset-left))] pb-[max(0.75rem,env(safe-area-inset-bottom))] landscape:items-center">
            <button
              type="button"
              data-move
              aria-label="Indietro"
              className="pointer-events-auto grid h-28 w-28 place-items-center rounded-full bg-foam/95 text-cocoa shadow-lg landscape:h-32 landscape:w-32"
              {...hold("ArrowLeft")}
            >
              <ChevronLeft className="h-14 w-14" />
            </button>
          </div>
        ) : (
          <div className="mt-auto" />
        )}

        {mode === "pause" && bag.current.sim ? (
          <div className="pointer-events-auto absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-cocoa/35 p-4">
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
                    bag.current.pointers.clear();
                    bag.current.jumps.clear();
      bag.current.jumpQueue = 0;
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
          <div className="pointer-events-auto absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-cocoa/35 p-4">
            <div className="w-full max-w-sm rounded-card bg-foam px-6 py-6 text-center shadow-lg">
              <div className="mx-auto flex items-center justify-center gap-3">
                <img src={asset("/sprites/bear/idle-2.png")} alt="" className="floaty h-24 w-auto" />
                {win.index === 7 ? (
                  <img src={asset("/sprites/toilet.png")} alt="Il bagno!" className="h-24 w-auto animate-bounce" />
                ) : null}
              </div>
              <h2 className="font-display text-4xl">{win.title}</h2>
              <p className="mt-2 text-lg leading-snug">{win.text}</p>
              <p className="mt-3 font-display text-2xl text-gold">Stelline {win.stars}</p>
              {win.left === 0 ? <p className="text-sm">Hai preso tutte le stelline del livello!</p> : <p className="text-sm text-cocoa/70">Ne sono rimaste {win.left} lungo la strada.</p>}
              <div className="mt-4 flex flex-col gap-2">
                {win.index < NAMES.length - 1 ? (
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
                    bag.current.pointers.clear();
                    bag.current.jumps.clear();
      bag.current.jumpQueue = 0;
                    setMode("title");
                  }}
                >
                  Al titolo
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {story ? (
          <button
            type="button"
            className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-cocoa/35 p-3"
            onClick={advanceStory}
          >
            <div className="flex w-full max-w-3xl flex-col items-center gap-3 rounded-card bg-foam px-4 py-4 shadow-lg landscape:flex-row landscape:gap-6 landscape:px-6">
              <div className="relative h-44 w-full max-w-md landscape:h-52">
                <img
                  src={panel === 3 ? asset("/sprites/bear/run-1.png") : asset("/sprites/bear/idle-1.png")}
                  alt=""
                  className={`absolute bottom-0 h-36 w-auto transition-all duration-500 ${panel === 0 ? "left-1/2 -translate-x-1/2" : "left-2"} ${panel === 3 ? "left-6" : ""}`}
                />
                {panel === 0 ? <span className="absolute bottom-8 left-1/2 h-10 w-10 -translate-x-1/2 rounded-full bg-peach/75 animate-pulse" /> : null}
                {panel === 1 ? <img src={asset("/sprites/powder.png")} alt="" className="absolute bottom-8 right-6 h-20 w-auto" /> : null}
                {panel >= 2 ? (
                  <div className={`absolute bottom-0 right-2 flex items-end gap-1 transition-all duration-500 ${panel === 3 ? "scale-100" : "scale-75 opacity-80"}`}>
                    <img
                      src={asset("/sprites/door.png")}
                      alt=""
                      className={panel === 3 ? "h-36 w-auto" : "h-20 w-auto"}
                    />
                    {panel === 3 ? (
                      <img src={asset("/sprites/toilet.png")} alt="" className="h-28 w-auto -ml-3" />
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={`h-3 w-3 rounded-full ${i === panel ? "bg-peach" : "bg-cream"}`} />
                ))}
              </div>
            </div>
          </button>
        ) : null}

        {help ? (
          <div className="pointer-events-auto absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-cocoa/40 p-4">
            <div className="max-h-[85vh] w-full max-w-md overflow-auto rounded-card bg-foam px-6 py-5 shadow-lg">
              <h2 className="font-display text-3xl">Come si gioca</h2>
              <ul className="mt-3 space-y-2 text-base leading-snug">
                <li>L'orso cammina da solo verso il bagno. Tocca lo schermo per farlo saltare, tieni premuto per un salto più alto. La freccia grande lo fa tornare indietro. Da tastiera: frecce o A e D, spazio per saltare.</li>
                <li>In cucina l'olio fa scivolare e le pentole soffiano. In giardino aspetta l'acqua e salta le siepi. In lavanderia sali nei cesti. Sul terrazzo le bolle scoppiano.</li>
                <li>Il cuscino a righe è una molla: ci salti sopra e voli. Alcuni tappeti si muovono da soli, salici sopra.</li>
                <li>Spugna Birba cammina, Rotolino rotola, la Bolla vola, Paperotto l'anatra saltella. Saltagli sulla testa: spariscono e tu rimbalzi.</li>
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
