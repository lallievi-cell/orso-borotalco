import { House, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import React, { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { asset, loadArt, type Art } from "@/game/assets";
import { createAudio, type AudioBus } from "@/game/audio";
import { renderTitle, renderWorld } from "@/game/draw";
import { coinTotal, coinsLeft, createSim, step, type Sim } from "@/game/sim";
import { emptySave, loadSave, writeSave, type SaveData } from "@/game/save";
import { PH, PW, VIEW_H, VIEW_W, type Input } from "@/game/types";
import { cheer, PLAYER_NAME } from "@/game/player";
import { createHub, interactHub } from "@/game/hub/engine";
import { stepHub, type HubInput } from "@/game/hub/physics";
import { renderHub } from "@/game/hub/render";
import { screenToWorld, worldToScreen } from "@/game/hub/coords";
import type { HubState } from "@/game/hub/types";
import { ShopModal } from "@/components/ShopModal";
import { createPortals } from "@/game/hub/map";

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

type Mode = "title" | "hub" | "play" | "pause" | "win";

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
const ROOM_ICONS = ["🛋️", "🍳", "🌸", "🚪", "🧺", "🧸", "🫧", "🚽"];
const NAMES = ["SALOTTO", "CUCINA", "GIARDINO", "CORRIDOIO", "LAVANDERIA", "CAMERETTA", "TERRAZZO", "BAGNO"];

const STORY_PAGES = [
  {
    title: "MAMMA MIA CHE URGENZA!",
    text: `All'Orso Borotalco scappa tantissimo la cacca! Aiutalo tu, ${PLAYER_NAME}!`,
  },
  {
    title: "LA NUVOLA MAGICA!",
    text: "Con una spolverata di borotalco profumato salta leggero tra cuscini e giochi!",
  },
  {
    title: "VERSO LA PORTA AZZURRA!",
    text: "Attraversa stanze, giardini e terrazzi superando ostacoli birichini...",
  },
  {
    title: "IL BAGNO È VICINO!",
    text: `Corri orsetto, ${PLAYER_NAME} ti porta dritto sulla tazza del water!`,
  },
];

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
  const [trophies, setTrophies] = useState(false);
  const [save, setSave] = useState<SaveData>(emptySave);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [roomsModalOpen, setRoomsModalOpen] = useState(false);
  const [hubAction, setHubAction] = useState<{
    type: "portal" | "npc" | "shop";
    label: string;
    icon: string;
    locked?: boolean;
  } | null>(null);
  const bag = useRef({
    mode: "title" as Mode,
    sim: null as Sim | null,
    hub: null as HubState | null,
    hubTap: null as { wx: number; wy: number } | null,
    hubInteractQueue: false,
    lastHubActionKey: "",
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
        e.code === "KeyS" ||
        e.code === "KeyE" ||
        e.code === "Enter";
      if ((m === "play" || m === "pause" || m === "hub") && gameKey) e.preventDefault();
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") bag.current.jumpDownAt = performance.now();
      if (e.code === "Escape" || e.code === "KeyP") {
        if (m === "play") {
          bag.current.mode = "pause";
          setMode("pause");
        } else if (m === "pause") {
          bag.current.wasJump = bag.current.keys.has("Space") || bag.current.keys.has("ArrowUp") || bag.current.keys.has("KeyW");
          bag.current.mode = "play";
          setMode("play");
        } else if (m === "hub") {
          bag.current.mode = "title";
          setMode("title");
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

      // Aggiornamento Hub Overworld se attivo
      if (b.mode === "hub" && b.hub) {
        const has = (code: string) => b.keys.has(code) || b.injected.has(code);
        let screenDx = 0;
        let screenDy = 0;
        if (has("KeyA") || has("ArrowLeft")) screenDx -= 1;
        if (has("KeyD") || has("ArrowRight")) screenDx += 1;
        if (has("KeyW") || has("ArrowUp")) screenDy -= 1;
        if (has("KeyS") || has("ArrowDown")) screenDy += 1;

        let dx = 0;
        let dy = 0;
        if (screenDx !== 0 || screenDy !== 0) {
          dx = screenDx / 64 + screenDy / 32;
          dy = screenDy / 32 - screenDx / 64;
        }

        const interact = has("Space") || has("Enter") || has("KeyE") || b.hubInteractQueue;
        b.hubInteractQueue = false;

        const hubEv = stepHub(
          b.hub,
          {
            dx,
            dy,
            interact,
            tapWorld: b.hubTap,
          },
          dt,
        );
        b.hubTap = null;

        if (hubEv.bounce || hubEv.ballTramp) audio.bounce();
        if (hubEv.kick) {
          if ((b.hub.toys.ball.combo || 0) > 1) {
            audio.coin();
          } else {
            audio.jump();
          }
        }
        if (hubEv.ballNpcPass) {
          audio.speak(hubEv.ballNpcPass.line);
        }
        if (hubEv.hoopScore) {
          audio.swish();
          audio.power();
          audio.speak("Canestro! Che bel tiro, campionessa!");
        }
        if (hubEv.starPop) {
          audio.secret();
        }
        if (hubEv.treeShake) {
          audio.rustle();
        }
        if (hubEv.musicNote) {
          audio.note(hubEv.musicNote.freq);
        }
        if (hubEv.starReward && hubEv.starReward > 0) {
          const next = {
            ...b.save,
            starsWallet: (b.save.starsWallet ?? 0) + hubEv.starReward,
          };
          b.save = next;
          writeSave(next);
          setSave(next);
        }

        if (interact) {
          const res = interactHub(b.hub, audio);
          if (res.enterLevel !== undefined) {
            begin(res.enterLevel);
            return;
          }
          if (res.openShop) {
            setShopOpen(true);
          }
        }

        // Rilevamento vicinanza per il pulsante d'azione touch
        const portal = b.hub.activePortal;
        const shop = b.hub.nearShop;
        const npc = b.hub.activeNpc;
        const fountain = b.hub.nearFountain;
        const telescope = b.hub.nearTelescope;
        let key = "";
        if (portal) key = `p:${portal.index}:${portal.locked}`;
        else if (shop) key = "shop";
        else if (npc) key = `n:${npc.id}`;
        else if (fountain) key = "fountain";
        else if (telescope) key = "telescope";

        if (key !== b.lastHubActionKey) {
          b.lastHubActionKey = key;
          if (portal) {
            setHubAction({
              type: "portal",
              label: portal.locked ? "STANZA CHIUSA 🔒" : `ENTRA IN ${portal.name} ▶`,
              icon: portal.icon,
              locked: portal.locked,
            });
          } else if (shop) {
            setHubAction({
              type: "shop",
              label: "APRI IL BAZAR DELLE STELLINE",
              icon: "🛍️",
              locked: false,
            });
          } else if (npc) {
            setHubAction({
              type: "npc",
              label: `PARLA CON ${npc.name}`,
              icon: "💬",
              locked: false,
            });
          } else if (fountain) {
            setHubAction({
              type: "npc",
              label: "ESPRIMI UN DESIDERIO ALLA PAPERELLA",
              icon: "✨",
              locked: false,
            });
          } else if (telescope) {
            setHubAction({
              type: "npc",
              label: "GUARDA DAL CANNOCCHIALE",
              icon: "🔭",
              locked: false,
            });
          } else {
            setHubAction(null);
          }
        }
      }

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
          if (ev.bounce) audio.bounce();
          if (ev.bump) audio.bump();
          if (ev.secret) {
            audio.secret();
            audio.speak(`Evviva ${PLAYER_NAME}! Hai trovato la paperella d'oro!`);
            const next = {
              ...b.save,
              ducks: [...b.save.ducks],
            };
            next.ducks[sim.levelIndex] = true;
            b.save = next;
            writeSave(next);
            setSave(next);
          }
          if (ev.heal) audio.heal();
          if (ev.hurt) audio.hurt();
          if (ev.checkpoint) audio.checkpoint();
          if (ev.power) audio.power();
          if (ev.win) {
            b.mode = "win";
            setMode("win");
            audio.win();
            audio.speak(`${cheer()} ${sim.winTitle}! ${sim.winText}`);
            const earnedStars = sim.player.stars;
            const next = {
              ...b.save,
              best: [...b.save.best],
              cleared: [...b.save.cleared],
              ducks: [...b.save.ducks],
              starsWallet: (b.save.starsWallet ?? 0) + earnedStars,
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
      if (b.mode === "hub") {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGrad.addColorStop(0, "#bae6fd");
        skyGrad.addColorStop(0.35, "#e0f2fe");
        skyGrad.addColorStop(0.65, "#fef3c7");
        skyGrad.addColorStop(0.85, "#fed7aa");
        skyGrad.addColorStop(1, "#faebd7");
        ctx.fillStyle = skyGrad;
      } else {
        ctx.fillStyle = wide ? "#f3c7ae" : "#fff4e4";
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, ox, oy);
      ctx.imageSmoothingEnabled = true;
      if (!b.art) {
        ctx.fillStyle = "#fff4e4";
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      } else if (b.mode === "title") {
        renderTitle(ctx, b.art, b.titleT);
      } else if (b.mode === "hub" && b.hub) {
        renderHub(ctx, b.hub, b.art, b.save.equippedHat);
      } else if (sim) {
        renderWorld(ctx, sim, b.art, b.cam.x, b.cam.y, b.save.equippedHat, b.save.equippedPowder);
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
    let cancelled = false;
    let timerId = 0;

    bag.current.audio?.speak(STORY_PAGES[panel]?.text ?? "", () => {
      if (cancelled) return;
      // Pausa confortevole di 1.2s dopo la fine della voce per godersi il disegno
      timerId = window.setTimeout(() => {
        if (cancelled) return;
        if (panel >= 3) {
          setStory(false);
          goToHub(0);
        } else {
          setPanel((p) => p + 1);
        }
      }, 1200);
    });

    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [story, panel]);

  function openStory() {
    setPanel(0);
    setStory(true);
    bag.current.audio?.unlock();
  }

  function advanceStory() {
    if (panel >= 3) {
      setStory(false);
      goToHub(0);
      return;
    }
    setPanel(panel + 1);
  }

  function goToHub(returnPortalIndex: number | null = null) {
    const h = createHub(bag.current.save, returnPortalIndex);
    bag.current.hub = h;
    bag.current.mode = "hub";
    bag.current.hubTap = null;
    bag.current.hubInteractQueue = false;
    bag.current.lastHubActionKey = "";
    bag.current.keys.clear();
    bag.current.pointers.clear();
    bag.current.jumps.clear();
    bag.current.jumpQueue = 0;
    setMode("hub");
    setWin(null);
    setHelp(false);
    setTrophies(false);
    setShopOpen(false);
    setRoomsModalOpen(false);
    setHubAction(null);
    bag.current.audio?.unlock();
    bag.current.audio?.startMusic();
    if (returnPortalIndex !== null) {
      bag.current.audio?.speak("Bravissima! Bentornata nel cortile! Scegli la prossima stanza!");
    } else {
      bag.current.audio?.speak(`Ciao ${PLAYER_NAME}! Esplora il cortile e tocca dove vuoi andare!`);
    }
  }

  function triggerHubAction() {
    if (!bag.current.hub) return;
    if (bag.current.hub.nearShop || bag.current.hub.activeNpc?.id === "coniglio") {
      bag.current.audio?.coin();
      bag.current.audio?.speak("Benvenuta al Bazar delle stelline!");
      setShopOpen(true);
      return;
    }
    const res = interactHub(bag.current.hub, bag.current.audio);
    if (res.enterLevel !== undefined) {
      begin(res.enterLevel);
      return;
    }
    if (res.openShop) {
      setShopOpen(true);
      return;
    }
  }

  function onCanvasPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    bag.current.audio?.unlock();
    if (bag.current.mode !== "hub" || !bag.current.hub) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const scale = Math.min(canvas.width / VIEW_W, canvas.height / VIEW_H);
    const wide = canvas.width / canvas.height > VIEW_W / VIEW_H;
    const ox = (canvas.width - VIEW_W * scale) / 2;
    const oy = wide ? (canvas.height - VIEW_H * scale) / 2 : (canvas.height - VIEW_H * scale) * 0.12;

    const canvasX = (clientX - rect.left) * (canvas.width / rect.width);
    const canvasY = (clientY - rect.top) * (canvas.height / rect.height);

    const sx = (canvasX - ox) / scale;
    const sy = (canvasY - oy) / scale;

    const hub = bag.current.hub;
    const centerSx = VIEW_W / 2;
    const centerSy = VIEW_H / 2;
    const camX = hub.cam.x - centerSx;
    const camY = hub.cam.y - centerSy;

    // Se c'è un dialogo aperto da un NPC, qualsiasi tocco lo fa avanzare!
    if (hub.dialogue) {
      const res = interactHub(hub, bag.current.audio);
      if (res.enterLevel !== undefined) begin(res.enterLevel);
      if (res.openShop) setShopOpen(true);
      return;
    }

    // Se c'è un tocco diretto sul Bazar (bancarella o insegna "BAZAR")
    const bazarScreen = worldToScreen(9.5, 14.5, 0, camX, camY);
    const distToBazarScreen = Math.hypot(sx - bazarScreen.sx, sy - (bazarScreen.sy - 55));
    const distToBazarTag = Math.hypot(sx - bazarScreen.sx, sy - (bazarScreen.sy - 116));
    const isClickOnBazar = distToBazarScreen < 75 || distToBazarTag < 45;

    if (isClickOnBazar) {
      const distPlayerToBazar = Math.hypot(hub.player.wx - 9.5, hub.player.wy - 14.5);
      if (distPlayerToBazar <= 2.8) {
        bag.current.audio?.coin();
        bag.current.audio?.speak("Benvenuta al Bazar delle stelline!");
        setShopOpen(true);
        return;
      } else {
        // Cammina direttamente di fronte al bancone del Bazar
        bag.current.hubTap = { wx: 10.8, wy: 14.5 };
        return;
      }
    }

    // Se l'orsetto è vicino alla porta e il tocco è sull'icona/pulsante della porta
    if (hub.activePortal) {
      const portalScreen = worldToScreen(hub.activePortal.wx, hub.activePortal.wy, 0, camX, camY);
      if (Math.hypot(sx - portalScreen.sx, sy - (portalScreen.sy - 80)) < 70) {
        const res = interactHub(hub, bag.current.audio);
        if (res.enterLevel !== undefined) {
          begin(res.enterLevel);
          return;
        }
      }
    }

    // Se l'orsetto è vicino all'NPC o allo Shop e il tocco è su di loro
    if (hub.activeNpc || hub.nearShop) {
      const targetNpc = hub.activeNpc ?? { wx: 9.5, wy: 14.5, radius: 2.6, id: "coniglio" };
      const npcScreen = worldToScreen(targetNpc.wx, targetNpc.wy, 0, camX, camY);
      if (
        Math.hypot(sx - npcScreen.sx, sy - (npcScreen.sy - 50)) < 85 ||
        Math.hypot(sx - npcScreen.sx, sy - (npcScreen.sy - 105)) < 65
      ) {
        const res = interactHub(hub, bag.current.audio);
        if (res.enterLevel !== undefined) {
          begin(res.enterLevel);
          return;
        }
        if (res.openShop) {
          setShopOpen(true);
          return;
        }
        return;
      }
    }

    // Se c'è un tocco diretto sulla Fontana dei Desideri (11.5, 11.5)
    const fountainScreen = worldToScreen(11.5, 11.5, 0, camX, camY);
    if (Math.hypot(sx - fountainScreen.sx, sy - (fountainScreen.sy - 35)) < 65) {
      if (Math.hypot(hub.player.wx - 11.5, hub.player.wy - 11.5) <= 2.6) {
        interactHub(hub, bag.current.audio);
        return;
      } else {
        bag.current.hubTap = { wx: 11.5, wy: 13.0 };
        return;
      }
    }

    // Se c'è un tocco diretto sul Cannocchiale Panoramico (20.5, 5.5)
    const telScreen = worldToScreen(20.5, 5.5, 0, camX, camY);
    if (Math.hypot(sx - telScreen.sx, sy - (telScreen.sy - 35)) < 55) {
      if (Math.hypot(hub.player.wx - 20.5, hub.player.wy - 5.5) <= 2.2) {
        interactHub(hub, bag.current.audio);
        return;
      } else {
        bag.current.hubTap = { wx: 19.8, wy: 5.8 };
        return;
      }
    }

    // Altrimenti: Tap-to-Move! Converte le coordinate schermo nelle coordinate mondo isometriche 2:1
    const { wx, wy } = screenToWorld(sx, sy, camX, camY);
    const clampedWx = Math.max(3.8, Math.min(23.2, wx));
    const clampedWy = Math.max(3.8, Math.min(23.2, wy));
    bag.current.hubTap = { wx: clampedWx, wy: clampedWy };
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
    setTrophies(false);
    setMode("play");
    bag.current.audio?.unlock();
    bag.current.audio?.startMusic();
    if (sim.say) {
      bag.current.audio?.speak(sim.say);
    }
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
      <canvas
        ref={canvasRef}
        onPointerDown={onCanvasPointerDown}
        className="absolute inset-0 h-full w-full cursor-pointer"
        aria-hidden
      />
      <div className="pointer-events-none relative z-10 flex h-full flex-col">
        {mode === "title" ? (
          <div className="pointer-events-auto flex h-full items-center justify-center overflow-y-auto px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex max-h-full w-full max-w-5xl flex-col items-center gap-2 rounded-card bg-foam/95 px-4 py-3 text-center shadow-lg landscape:flex-row landscape:items-center landscape:gap-5 landscape:px-6 landscape:py-4 landscape:text-left">
              <img src={asset("/sprites/bear/idle-1.png")} alt="" className="floaty h-20 w-auto object-contain sm:h-28 landscape:h-28" />
              <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-2 landscape:items-stretch">
                <div>
                  <p className="font-display text-sm tracking-wider uppercase text-amber-900/80 font-bold">CIAO {PLAYER_NAME.toUpperCase()}! • 8 STANZE, 1 BAGNO</p>
                  <h1 className="font-display text-4xl leading-none sm:text-5xl uppercase tracking-wide">ORSO BOROTALCO</h1>
                  <p className="mt-1 text-sm leading-snug sm:text-base font-bold text-amber-950/70">GLI SCAPPA LA CACCA! AIUTALO AD ARRIVARE IN BAGNO!</p>
                </div>
                <button
                  type="button"
                  className="min-h-14 w-full rounded-full bg-peach px-6 font-display text-2xl text-cocoa font-bold uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-2"
                  onClick={() => goToHub(null)}
                >
                  <span>🏡</span>
                  <span>ENTRA NEL CORTILE! ▶</span>
                </button>
                <div className="grid w-full grid-cols-4 gap-2">
                  {NAMES.map((name, i) => {
                    const locked = i > save.unlocked;
                    const stars = save.best[i] ?? 0;
                    const hasDuck = !!save.ducks[i];
                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={locked}
                        onClick={() => begin(i)}
                        className={`min-h-14 rounded-2xl p-1.5 transition-all flex flex-col items-center justify-between border-2 ${
                          locked
                            ? "bg-cream/50 border-cocoa/10 opacity-50 cursor-not-allowed"
                            : "bg-cream border-peach/40 hover:border-peach shadow-sm hover:scale-[1.02] active:scale-95"
                        } landscape:min-h-12`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-lg leading-none">{ROOM_ICONS[i]}</span>
                          {hasDuck ? <span className="text-xs">🦆</span> : null}
                        </div>
                        <span className="block font-display text-xs sm:text-sm leading-tight uppercase font-bold text-cocoa">
                          {name}
                        </span>
                        <div className="flex items-center gap-0.5 text-xs">
                          {locked ? (
                            <span className="text-cocoa/60 font-bold text-[10px]">🔒 CHIUSO</span>
                          ) : (
                            <span className="text-amber-600 font-bold text-[10px]">
                              {stars > 0 ? "⭐".repeat(Math.min(3, stars)) : "✨ APERTO"}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    className="min-h-11 rounded-full bg-gold/90 px-4 font-display text-cocoa shadow-sm active:scale-95 transition-transform flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs sm:text-sm"
                    onClick={() => {
                      setTrophies(true);
                      bag.current.audio?.unlock();
                      bag.current.audio?.secret();
                    }}
                  >
                    <span>🦆</span> PAPERELLE ({save.ducks.filter(Boolean).length}/8)
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-full bg-mint px-4 text-cocoa font-display font-bold uppercase tracking-wider text-xs sm:text-sm shadow-sm active:scale-95 transition-transform"
                    onClick={() => setHelp(true)}
                  >
                    ❓ COME SI GIOCA
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-full bg-cream px-4 text-cocoa font-display font-bold uppercase tracking-wider text-xs sm:text-sm shadow-sm active:scale-95 transition-transform"
                    onClick={openStory}
                  >
                    📖 STORIA
                  </button>
                  <button
                    type="button"
                    className="grid h-11 w-11 place-items-center rounded-full bg-cream shadow-sm"
                    onClick={toggleMute}
                    aria-label={muted ? "Attiva il suono" : "Silenzia"}
                  >
                    {muted ? <VolumeX /> : <Volume2 />}
                  </button>
                </div>
                {save.cleared.every(Boolean) ? (
                  <p className="font-display text-mint text-base uppercase font-bold tracking-wider">
                    🎉 TUTTI I BAGNI TROVATI: BRAVISSIMA {PLAYER_NAME.toUpperCase()}! 👑
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {mode === "hub" ? (
          <div className="pointer-events-none relative z-30 flex h-full flex-col justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {/* Top Bar dell'Hub */}
            <div className="flex items-center justify-between gap-2">
              <div className="pointer-events-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    bag.current.mode = "title";
                    setMode("title");
                  }}
                  className="min-h-11 px-3.5 rounded-full bg-foam/95 text-cocoa shadow-md flex items-center gap-1.5 font-display text-xs sm:text-sm uppercase font-bold hover:scale-105 active:scale-95 transition-transform border border-cocoa/10"
                >
                  <House className="h-4 w-4" />
                  <span>TITOLO</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoomsModalOpen(true)}
                  className="min-h-11 px-3.5 rounded-full bg-foam/95 text-cocoa shadow-md flex items-center gap-1.5 font-display text-xs sm:text-sm uppercase font-bold hover:scale-105 active:scale-95 transition-transform border border-cocoa/10"
                >
                  <span>📋</span>
                  <span>STANZE</span>
                </button>
              </div>

              <div className="pointer-events-auto flex items-center gap-2">
                {/* Portafoglio Stelline & Bottone Bazar */}
                <button
                  type="button"
                  onClick={() => setShopOpen(true)}
                  className="min-h-11 px-3.5 sm:px-4 rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 text-amber-950 font-display font-bold shadow-md flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform text-xs sm:text-sm border-2 border-amber-400"
                >
                  <span className="text-base sm:text-lg">⭐</span>
                  <span className="text-sm sm:text-base font-extrabold">{save.starsWallet}</span>
                  <span className="bg-amber-500/20 text-amber-900 text-[11px] sm:text-xs px-2 py-0.5 rounded-full font-bold ml-0.5">
                    🛍️ BAZAR
                  </span>
                </button>

                {/* Audio Mute/Unmute */}
                <button
                  type="button"
                  className="grid h-11 w-11 place-items-center rounded-full bg-foam shadow-md border border-cocoa/10 hover:scale-105 active:scale-95 transition-transform"
                  onClick={toggleMute}
                  aria-label={muted ? "Attiva il suono" : "Silenzia"}
                >
                  {muted ? <VolumeX /> : <Volume2 />}
                </button>
              </div>
            </div>

            {/* Bottom Floating Action Prompt / Touch Button */}
            <div className="flex flex-col items-center gap-2">
              {hubAction ? (
                <button
                  type="button"
                  disabled={hubAction.locked}
                  onClick={triggerHubAction}
                  className={`pointer-events-auto min-h-14 max-w-md w-full sm:w-auto px-7 rounded-full font-display text-lg sm:text-xl uppercase font-bold shadow-2xl flex items-center justify-center gap-2.5 transition-all active:scale-95 animate-bounce border-2 border-white ${
                    hubAction.locked
                      ? "bg-rose-500 text-white cursor-not-allowed opacity-90"
                      : hubAction.type === "shop"
                      ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950"
                      : hubAction.type === "portal"
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  <span className="text-2xl">{hubAction.icon}</span>
                  <span>{hubAction.label}</span>
                </button>
              ) : (
                <div className="pointer-events-none rounded-full bg-cocoa/65 backdrop-blur-sm px-4 py-1.5 text-white font-display text-xs sm:text-sm uppercase font-bold tracking-wider shadow">
                  👆 TOCCA DOVE VUOI ANDARE NEL CORTILE!
                </div>
              )}
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
          <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-between px-[max(1rem,env(safe-area-inset-left))] pb-[max(1rem,env(safe-area-inset-bottom))] landscape:items-center">
            <button
              type="button"
              data-move
              aria-label="Indietro"
              className="pointer-events-auto flex flex-col items-center justify-center h-24 w-24 rounded-full bg-foam/95 text-cocoa shadow-xl landscape:h-28 landscape:w-28 active:scale-90 transition-transform font-display border-2 border-cocoa/10 select-none"
              {...hold("ArrowLeft")}
            >
              <span className="text-2xl leading-none">⬅️</span>
              <span className="text-xs font-bold tracking-wider mt-0.5">INDIETRO</span>
            </button>
            <button
              type="button"
              data-move
              aria-label="Salta"
              className="pointer-events-auto flex flex-col items-center justify-center h-24 w-24 rounded-full bg-peach/95 text-cocoa shadow-xl landscape:h-28 landscape:w-28 active:scale-90 transition-transform font-display border-2 border-cocoa/10 select-none"
              onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => {
                e.preventDefault();
                e.stopPropagation();
                bag.current.jumps.add(e.pointerId);
                bag.current.jumpQueue += 1;
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  /* pointer already captured */
                }
              }}
              onPointerUp={(e: ReactPointerEvent<HTMLButtonElement>) => {
                bag.current.jumps.delete(e.pointerId);
              }}
              onPointerCancel={(e: ReactPointerEvent<HTMLButtonElement>) => {
                bag.current.jumps.delete(e.pointerId);
              }}
            >
              <span className="text-2xl leading-none">🐾</span>
              <span className="text-xs font-bold tracking-wider mt-0.5">SALTA</span>
            </button>
          </div>
        ) : (
          <div className="mt-auto" />
        )}

        {mode === "pause" && bag.current.sim ? (
          <div className="pointer-events-auto absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-cocoa/35 p-4">
            <div className="w-full max-w-sm rounded-card bg-foam px-6 py-6 text-center shadow-lg">
              <h2 className="font-display text-3xl uppercase font-bold tracking-wide">PAUSA</h2>
              <p className="mt-1 text-cocoa/80 uppercase font-bold text-sm">ORSO TI ASPETTA!</p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-peach font-display text-xl uppercase font-bold shadow-sm active:scale-95 transition-transform"
                  onClick={() => {
                    bag.current.wasJump = true;
                    bag.current.mode = "play";
                    setMode("play");
                  }}
                >
                  <Play className="h-5 w-5" /> CONTINUA
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cream font-display text-xl uppercase font-bold shadow-sm active:scale-95 transition-transform"
                  onClick={() => begin(bag.current.sim?.levelIndex ?? 0)}
                >
                  <RotateCcw className="h-5 w-5" /> DA CAPO
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cream font-display text-xl uppercase font-bold shadow-sm active:scale-95 transition-transform"
                  onClick={() => goToHub(bag.current.sim?.levelIndex ?? null)}
                >
                  🏡 CORTILE
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cream font-display text-xl uppercase font-bold shadow-sm active:scale-95 transition-transform"
                  onClick={() => {
                    bag.current.mode = "title";
                    bag.current.keys.clear();
                    bag.current.pointers.clear();
                    bag.current.jumps.clear();
                    bag.current.jumpQueue = 0;
                    setMode("title");
                  }}
                >
                  <House className="h-5 w-5" /> AL TITOLO
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
              <h2 className="font-display text-3xl sm:text-4xl uppercase font-bold tracking-wide text-cocoa">{win.title}</h2>
              <p className="mt-2 text-base sm:text-lg leading-snug uppercase font-bold text-cocoa/90">{win.text}</p>
              <p className="mt-3 font-display text-2xl text-gold uppercase font-bold">STELLINE: {win.stars}</p>
              {win.left === 0 ? (
                <p className="text-sm uppercase font-bold text-mint">HAI PRESO TUTTE LE STELLINE!</p>
              ) : (
                <p className="text-sm uppercase font-bold text-cocoa/70">NE MANCANO {win.left} LUNGO LA STRADA</p>
              )}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  className="min-h-12 rounded-full bg-mint text-cocoa font-display text-xl uppercase font-bold shadow active:scale-95 transition-transform flex items-center justify-center gap-2"
                  onClick={() => goToHub(win.index)}
                >
                  🏡 TORNA NEL CORTILE
                </button>
                {win.index < NAMES.length - 1 ? (
                  <button
                    type="button"
                    className="min-h-12 rounded-full bg-peach font-display text-xl uppercase font-bold shadow active:scale-95 transition-transform"
                    onClick={() => begin(win.index + 1)}
                  >
                    AVANTI ▶
                  </button>
                ) : (
                  <p className="font-display text-xl text-mint uppercase font-bold">TUTTI I BAGNI! CHE SOLLIEVO!</p>
                )}
                <button
                  type="button"
                  className="min-h-12 rounded-full bg-cream font-display text-xl uppercase font-bold shadow-sm active:scale-95 transition-transform"
                  onClick={() => begin(win.index)}
                >
                  GIOCA ANCORA ↺
                </button>
                <button
                  type="button"
                  className="min-h-12 rounded-full bg-cream font-display text-xl uppercase font-bold shadow-sm active:scale-95 transition-transform"
                  onClick={() => {
                    bag.current.mode = "title";
                    bag.current.keys.clear();
                    bag.current.pointers.clear();
                    bag.current.jumps.clear();
                    bag.current.jumpQueue = 0;
                    setMode("title");
                  }}
                >
                  AL TITOLO 🏠
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {story ? (
          <button
            type="button"
            className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-cocoa/40 p-3"
            onClick={advanceStory}
          >
            <div className="flex w-full max-w-2xl flex-col items-center gap-3 rounded-card bg-foam px-5 py-5 shadow-2xl text-center">
              <div className="relative h-44 w-full max-w-md landscape:h-48">
                <img
                  src={panel === 3 ? asset("/sprites/bear/run-1.png") : asset("/sprites/bear/idle-1.png")}
                  alt=""
                  className={`absolute bottom-0 h-36 w-auto transition-all duration-500 ${panel === 0 ? "left-1/2 -translate-x-1/2" : "left-4"} ${panel === 3 ? "left-8" : ""}`}
                />
                {panel === 0 ? <span className="absolute bottom-8 left-1/2 h-10 w-10 -translate-x-1/2 rounded-full bg-peach/75 animate-pulse" /> : null}
                {panel === 1 ? <img src={asset("/sprites/powder.png")} alt="" className="absolute bottom-8 right-6 h-20 w-auto" /> : null}
                {panel >= 2 ? (
                  <div className={`absolute bottom-0 right-4 flex items-end gap-1 transition-all duration-500 ${panel === 3 ? "scale-100" : "scale-75 opacity-80"}`}>
                    <img
                      src={asset("/sprites/door.png")}
                      alt=""
                      className={panel === 3 ? "h-36 w-auto" : "h-20 w-auto"}
                    />
                    {panel === 3 ? (
                      <img src={asset("/sprites/toilet.png")} alt="" className="h-28 w-auto -ml-3 animate-bounce" />
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col items-center text-center mt-1">
                <h3 className="font-display text-2xl sm:text-3xl text-cocoa">{STORY_PAGES[panel].title}</h3>
                <p className="mt-1 text-base sm:text-lg text-cocoa/90 font-medium max-w-md">{STORY_PAGES[panel].text}</p>
              </div>

              <div className="flex items-center gap-2 mt-2" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={`h-3 rounded-full transition-all ${i === panel ? "w-6 bg-peach" : "w-3 bg-cream border border-cocoa/20"}`} />
                ))}
              </div>

              <div className="flex items-center justify-between w-full mt-2 px-3">
                <span className="text-xs text-cocoa/70 font-display font-bold uppercase tracking-wide">TOCCA PER ANDARE AVANTI 👆</span>
                <span
                  role="button"
                  tabIndex={0}
                  className="text-xs font-bold text-cocoa/80 hover:text-cocoa uppercase underline p-1 cursor-pointer tracking-wider"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStory(false);
                    goToHub(0);
                  }}
                >
                  SALTA ⏩
                </span>
              </div>
            </div>
          </button>
        ) : null}

        {trophies ? (
          <div className="pointer-events-auto absolute inset-0 z-50 grid place-items-center overflow-y-auto bg-cocoa/45 p-3">
            <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-card bg-foam p-5 shadow-2xl text-center border-4 border-gold/30">
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl animate-bounce">🦆</span>
                <h2 className="font-display text-3xl sm:text-4xl text-cocoa uppercase font-bold">GALLERIA PAPERELLE D'ORO</h2>
              </div>
              <p className="mt-1 text-sm text-cocoa/80 uppercase font-bold">
                IN OGNI STANZA DELLA CASA È NASCOSTA UNA PAPERELLA D'ORO SEGRETA! QUANTE NE HAI TROVATE?
              </p>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {NAMES.map((name, i) => {
                  const found = !!save.ducks[i];
                  const locked = i > save.unlocked;
                  return (
                    <div
                      key={name}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all ${
                        found
                          ? "bg-amber-50 border-gold shadow-md scale-100"
                          : "bg-cream/60 border-cocoa/15 opacity-60"
                      }`}
                    >
                      <div className="h-14 w-14 grid place-items-center">
                        {found ? (
                          <img
                            src={asset("/sprites/goldduck.png")}
                            alt="Paperella d'oro"
                            className="h-12 w-auto object-contain animate-pulse drop-shadow"
                          />
                        ) : (
                          <span className="text-2xl filter grayscale opacity-40">🦆</span>
                        )}
                      </div>
                      <span className="font-display text-sm leading-tight text-cocoa mt-1 uppercase font-bold">{name}</span>
                      <span className="text-[11px] font-bold mt-0.5 uppercase" style={{ color: found ? "#b45309" : "#8c7e72" }}>
                        {found ? "TROVATA! ✨" : locked ? "🔒 CHIUSA" : "NASCOSTA... 🔍"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {save.ducks.filter(Boolean).length === 8 ? (
                <div className="mt-4 p-2.5 rounded-2xl bg-amber-100 border border-gold text-cocoa font-display text-base font-bold uppercase">
                  🌟 EVVIVA {PLAYER_NAME.toUpperCase()}! HAI TUTTE LE 8 PAPERELLE D'ORO! CAMPIONESSA SUPREMA! 👑
                </div>
              ) : null}

              <button
                type="button"
                className="mt-4 min-h-12 w-full rounded-full bg-peach font-display text-xl text-cocoa shadow active:scale-95 transition-transform uppercase font-bold"
                onClick={() => setTrophies(false)}
              >
                TORNA AI GIOCHI 🏠
              </button>
            </div>
          </div>
        ) : null}

        {help ? (
          <div className="pointer-events-auto absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-cocoa/40 p-4">
            <div className="max-h-[85vh] w-full max-w-md overflow-auto rounded-card bg-foam px-6 py-5 shadow-2xl border-2 border-mint/40 text-cocoa">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-3xl uppercase font-bold">COME SI GIOCA</h2>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full bg-peach font-display text-xs font-bold uppercase shadow-sm hover:scale-105 active:scale-95 transition-transform"
                  onClick={() => {
                    bag.current.audio?.unlock();
                    bag.current.audio?.speak("Tocca lo schermo per saltare! Orso cammina da solo verso il bagno. Salta sui cuscini morbidi, raccogli le stelline d'oro e cerca la paperella segreta!");
                  }}
                >
                  🔊 ASCOLTA
                </button>
              </div>
              <div className="mt-4 space-y-3 font-display uppercase font-bold text-sm sm:text-base leading-snug">
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-cream/70">
                  <span className="text-2xl">🐾</span>
                  <p>TOCCA LO SCHERMO O IL TASTO ROSA PER SALTARE!</p>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-cream/70">
                  <span className="text-2xl">🧸</span>
                  <p>L'ORSO CAMMINA DA SOLO VERSO IL BAGNO! CON ◀ TORNI INDIETRO.</p>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-cream/70">
                  <span className="text-2xl">🛏️</span>
                  <p>I CUSCINI A RIGHE TI FANNO RIMBALZARE IN ALTO!</p>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-cream/70">
                  <span className="text-2xl">⭐</span>
                  <p>RACCOGLI LE STELLINE E CERCA LA PAPERELLA D'ORO 🦆 IN OGNI STANZA!</p>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-cream/70">
                  <span className="text-2xl">🚽</span>
                  <p>ARRIVA ALLA PORTA DEL BAGNO PER VINCERE!</p>
                </div>
              </div>
              <button
                type="button"
                className="mt-5 min-h-12 w-full rounded-full bg-peach font-display text-xl font-bold uppercase shadow active:scale-95 transition-transform"
                onClick={() => setHelp(false)}
              >
                HO CAPITO! ▶
              </button>
            </div>
          </div>
        ) : null}

        {shopOpen ? (
          <ShopModal
            save={save}
            onSaveChange={(next) => {
              setSave(next);
              bag.current.save = next;
              writeSave(next);
              if (bag.current.hub) {
                bag.current.hub.portals = createPortals(next);
              }
            }}
            onClose={() => setShopOpen(false)}
            audio={bag.current.audio}
          />
        ) : null}

        {roomsModalOpen ? (
          <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-cocoa/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-cream border-4 border-amber-300 p-5 shadow-2xl text-center">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  <h3 className="font-display text-2xl uppercase font-bold text-cocoa">SCEGLI LA STANZA</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRoomsModalOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-white text-cocoa shadow hover:bg-white/80 active:scale-95"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {NAMES.map((name, i) => {
                  const locked = i > save.unlocked;
                  const stars = save.best[i] ?? 0;
                  const hasDuck = !!save.ducks[i];
                  return (
                    <button
                      key={name}
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        setRoomsModalOpen(false);
                        begin(i);
                      }}
                      className={`min-h-16 rounded-2xl p-2 transition-all flex flex-col items-center justify-between border-2 ${
                        locked
                          ? "bg-cream/50 border-cocoa/10 opacity-50 cursor-not-allowed"
                          : "bg-white border-amber-300 hover:border-amber-500 shadow-sm hover:scale-105 active:scale-95"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-xl leading-none">{ROOM_ICONS[i]}</span>
                        {hasDuck ? <span className="text-xs">🦆</span> : null}
                      </div>
                      <span className="block font-display text-xs sm:text-sm leading-tight uppercase font-bold text-cocoa mt-1">
                        {name}
                      </span>
                      <div className="flex items-center gap-0.5 text-xs mt-0.5">
                        {locked ? (
                          <span className="text-cocoa/60 font-bold text-[10px]">🔒 CHIUSO</span>
                        ) : (
                          <span className="text-amber-600 font-bold text-[10px]">
                            {stars > 0 ? "⭐".repeat(Math.min(3, stars)) : "✨ APERTO"}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setRoomsModalOpen(false)}
                className="mt-5 px-6 py-2.5 rounded-full bg-peach font-display text-lg uppercase font-bold text-cocoa shadow active:scale-95"
              >
                CHIUDI ✕
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
