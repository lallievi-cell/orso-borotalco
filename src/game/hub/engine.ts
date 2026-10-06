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
    startX = p.wx;
    startY = p.wy + 0.8;
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
      x: initialScreen.sx,
      y: initialScreen.sy,
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
        radius: 0.45,
        rotation: 0,
      },
      trampoline: {
        wx: 14.5,
        wy: 10.5,
        radius: 1.1,
      },
      musicBox: {
        wx: 13.5,
        wy: 6.2,
        playing: false,
        notes: [],
      },
    },
    t: 0,
    activePortal: null,
    activeNpc: null,
    nearShop: false,
    lastEnteredPortal: returnPortalIndex,
  };
}

/** Gestisce l'interazione del giocatore (tasto Azione o tocco sul prompt). */
export function interactHub(
  hub: HubState,
  audio: AudioBus | null,
): { enterLevel?: number; openShop?: boolean } {
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

  // 3. Se l'orsetto è vicino al coniglio dello shop
  if (hub.nearShop) {
    if (audio) {
      audio.coin();
      audio.speak("Benvenuta al Bazar delle stelline! Scegli il tuo cappellino preferito!");
    }
    return { openShop: true };
  }

  // 4. Se l'orsetto è vicino a un NPC amico
  if (hub.activeNpc) {
    const npc = hub.activeNpc;
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
