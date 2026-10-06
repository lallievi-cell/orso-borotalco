import type { HubState, PortalInfo } from "@/game/hub/types";
import type { SaveData } from "@/game/save";
import type { AudioBus } from "@/game/audio";
import { createPortals, createNpcs } from "@/game/hub/map";
import { worldToScreen } from "@/game/hub/coords";

/** Inizializza lo stato dell'Hub Overworld. */
export function createHub(save: SaveData, returnPortalIndex: number | null = null): HubState {
  const portals = createPortals(save);
  const npcs = createNpcs();

  // Posizione di partenza nel cortile: aperta e di fronte alla fontana
  let startX = 11.5;
  let startY = 14.0;

  if (returnPortalIndex !== null && portals[returnPortalIndex]) {
    const p = portals[returnPortalIndex]!;
    if (p.flip === 1) {
      // Esce verso il cortile dalla parete Nord-Ovest (+X)
      startX = p.wx + 0.95;
      startY = p.wy;
    } else {
      // Esce verso il cortile dalla parete Nord-Est (+Y)
      startX = p.wx;
      startY = p.wy + 0.95;
    }
  }

  const initialScreen = worldToScreen(startX, startY, 0);

  return {
    player: {
      wx: startX,
      wy: startY,
      wz: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      flip: 1,
      moving: false,
      footstepTimer: 0,
      dustPuffs: [],
    },
    cam: {
      x: Math.max(-140, Math.min(140, initialScreen.sx)),
      y: Math.max(260, Math.min(450, initialScreen.sy - 24)),
    },
    tapTarget: null,
    dialogue: null,
    portals,
    npcs,
    toys: {
      ball: {
        wx: 11.5,
        wy: 13.8,
        wz: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        radius: 0.52,
        rotation: 0,
        rollAngleX: 0,
        rollAngleY: 0,
        squish: 0,
        squishVel: 0,
        combo: 0,
        bestCombo: 0,
        comboTimer: 0,
        comboPop: 0,
        lastKickBy: null,
        sparks: [],
      },
      trampoline: {
        wx: 16.5,
        wy: 17.5,
        radius: 1.25,
      },
      hoop: {
        wx: 13.8,
        wy: 19.5,
        radius: 0.75,
        score: 0,
        swishT: 0,
        lastScoreT: 0,
      },
      trampStars: [
        { id: 1, wx: 16.5, wy: 17.5, wz: 1.6, collected: false, respawnT: 0 },
        { id: 2, wx: 16.5, wy: 17.5, wz: 2.3, collected: false, respawnT: 0 },
        { id: 3, wx: 16.5, wy: 17.5, wz: 3.0, collected: false, respawnT: 0 },
      ],
      appleTrees: [
        { id: 1, wx: 20.5, wy: 18.5, apples: 3, shakeT: 0, fallingApples: [] },
        { id: 2, wx: 16.5, wy: 13.5, apples: 3, shakeT: 0, fallingApples: [] },
        { id: 3, wx: 4.5, wy: 20.5, apples: 3, shakeT: 0, fallingApples: [] },
      ],
      musicTiles: [
        { id: 1, wx: 18.0, wy: 6.0, note: "DO", freq: 523.25, color: "#f87171", triggerT: 0 },
        { id: 2, wx: 18.0, wy: 7.0, note: "RE", freq: 587.33, color: "#fb923c", triggerT: 0 },
        { id: 3, wx: 18.0, wy: 8.0, note: "MI", freq: 659.25, color: "#facc15", triggerT: 0 },
        { id: 4, wx: 18.0, wy: 9.0, note: "FA", freq: 698.46, color: "#4ade80", triggerT: 0 },
        { id: 5, wx: 18.0, wy: 10.0, note: "SOL", freq: 783.99, color: "#38bdf8", triggerT: 0 },
      ],
      telescope: {
        wx: 20.5,
        wy: 5.5,
        radius: 1.3,
        lookT: 0,
      },
      wishingFountain: {
        wx: 11.5,
        wy: 11.5,
        radius: 1.8,
        wishesCount: 0,
        lastWishT: 0,
        auraT: 0,
      },
      micioPet: {
        petCount: 0,
        hearts: [],
      },
    },
    t: 0,
    activePortal: null,
    activeNpc: null,
    nearShop: false,
    nearFountain: false,
    nearTelescope: false,
    floatingMessages: [],
    lastEnteredPortal: returnPortalIndex,
  };
}

/** Gestisce l'interazione del giocatore (tasto Azione o tocco sul prompt). */
export function interactHub(
  hub: HubState,
  audio: AudioBus | null,
): { enterLevel?: number; openShop?: boolean; starReward?: number } {
  // 1. Se c'è già un dialogo aperto, avanza al testo successivo
  if (hub.dialogue) {
    hub.dialogue.lineIndex += 1;
    if (hub.dialogue.lineIndex >= hub.dialogue.lines.length) {
      hub.dialogue = null;
    } else {
      const line = hub.dialogue.lines[hub.dialogue.lineIndex];
      if (line && audio) {
        audio.speak(line);
      }
    }
    return {};
  }

  // 2. Se l'orsetto è davanti a una porta
  if (hub.activePortal) {
    if (!hub.activePortal.locked) {
      if (audio) {
        audio.unlock();
        audio.checkpoint();
      }
      return { enterLevel: hub.activePortal.index };
    } else {
      if (audio) {
        audio.bump();
        audio.speak(`Questa stanza è ancora chiusa! Completa prima il livello precedente.`);
      }
      return {};
    }
  }

  // 3. Se l'orsetto è vicino al coniglio dello shop o al Bazar
  if (hub.nearShop || hub.activeNpc?.id === "coniglio") {
    if (audio) {
      audio.coin();
      audio.speak("Benvenuta al Bazar delle stelline! Scegli il tuo cappellino preferito!");
    }
    return { openShop: true };
  }

  // 3b. Se l'orsetto è vicino alla Fontana dei Desideri
  if (hub.nearFountain) {
    const f = hub.toys.wishingFountain;
    f.wishesCount += 1;
    f.lastWishT = hub.t;
    f.auraT = 10.0; // 10 secondi di aura arcobaleno di borotalco!
    if (audio) {
      audio.secret();
      audio.speak("QUACK! HAI ESPRESSO UN DESIDERIO MAGICO! CHE LA TUA GIORNATA SIA PIENA DI STELLINE!");
    }
    hub.floatingMessages.push({
      id: Math.random(),
      text: "DESIDERIO ESPRESSO! +1 ⭐✨",
      wx: 11.5,
      wy: 11.5,
      wz: 2.2,
      color: "#facc15",
      t: hub.t,
    });
    return { starReward: 1 };
  }

  // 3c. Se l'orsetto è vicino al Cannocchiale Panoramico
  if (hub.nearTelescope) {
    const tel = hub.toys.telescope;
    tel.lookT = hub.t;
    if (audio) {
      audio.power();
      audio.speak("Guarda là in fondo! C'è una bellissima mongolfiera colorata che vola tra le nuvole soffici!");
    }
    hub.floatingMessages.push({
      id: Math.random(),
      text: "CHE BEL PANORAMA! 🎈",
      wx: tel.wx,
      wy: tel.wy,
      wz: 1.8,
      color: "#38bdf8",
      t: hub.t,
    });
    return {};
  }

  // 4. Se l'orsetto è vicino a un NPC amico
  if (hub.activeNpc) {
    const npc = hub.activeNpc;
    if (npc.id === "micio") {
      hub.toys.micioPet.petCount += 1;
      for (let h = 0; h < 5; h++) {
        hub.toys.micioPet.hearts.push({
          wx: npc.wx + (Math.random() - 0.5) * 0.4,
          wy: npc.wy + (Math.random() - 0.5) * 0.4,
          wz: 0.8 + Math.random() * 0.4,
          vy: 0.8 + Math.random() * 0.6,
          alpha: 1.0,
        });
      }
    }
    hub.dialogue = {
      speaker: npc.name,
      npcId: npc.id,
      lines: npc.lines,
      lineIndex: 0,
    };
    if (audio) {
      audio.unlock();
      if (npc.id === "micio") audio.secret();
      else audio.speak(npc.lines[0] ?? "");
    }
    return {};
  }

  return {};
}
