import type { NpcInfo, PortalInfo } from "@/game/hub/types";
import type { SaveData } from "@/game/save";
import { PLAYER_NAME } from "@/game/player";

export const MAP_SIZE = 24;

export const ROOM_NAMES = [
  "SALOTTO",
  "CUCINA",
  "GIARDINO",
  "CORRIDOIO",
  "LAVANDERIA",
  "CAMERETTA",
  "TERRAZZO",
  "BAGNO",
];

export const ROOM_ICONS = ["🛋️", "🍳", "🌸", "🚪", "🧺", "🧸", "🫧", "🚽"];

/** Crea i portali delle 8 stanze posizionati e orientati a filo con le pareti a L del diorama. */
export function createPortals(save: SaveData): PortalInfo[] {
  const portalConfigs: { wx: number; wy: number; flip: number }[] = [
    { wx: 4.2, wy: 8.5, flip: 1 }, // 0: Salotto (Parete NO, inserito nel muro)
    { wx: 4.2, wy: 13.5, flip: 1 }, // 1: Cucina (Parete NO, inserito nel muro)
    { wx: 18.5, wy: 15.5, flip: -1 }, // 2: Giardino (Soglia giardino a sud-est)
    { wx: 8.5, wy: 4.2, flip: -1 }, // 3: Corridoio (Parete NE, inserito nel muro)
    { wx: 4.2, wy: 18.5, flip: 1 }, // 4: Lavanderia (Parete NO, inserito nel muro)
    { wx: 14.5, wy: 4.2, flip: -1 }, // 5: Cameretta (Parete NE, inserito nel muro)
    { wx: 17.5, wy: 4.2, flip: -1 }, // 6: Terrazzo (Parete NE, inserito nel muro a ritmo con le altre stanze)
    { wx: 11.5, wy: 4.2, flip: -1 }, // 7: Bagno d'Oro (Apice Parete NE, alla fine del tappeto rosso)
  ];

  return portalConfigs.map((c, i) => ({
    index: i,
    name: ROOM_NAMES[i] ?? `STANZA ${i + 1}`,
    icon: ROOM_ICONS[i] ?? "🚪",
    wx: c.wx,
    wy: c.wy,
    radius: 1.4,
    locked: i > save.unlocked,
    stars: save.best[i] ?? 0,
    duck: !!save.ducks[i],
    flip: c.flip,
  }));
}

/** Crea gli NPC amici con dialoghi in chiaro stampatello per Celeste. */
export function createNpcs(): NpcInfo[] {
  return [
    {
      id: "mamma",
      name: "MAMMA ORSA",
      wx: 8.5,
      wy: 8.5,
      radius: 1.5,
      color: "#f472b6",
      lines: [
        `CIAO ${PLAYER_NAME}! CHE BELLO VEDERTI!`,
        "SEGUI I TAPPETI PER ENTRARE NELLE STANZE!",
        "CORRI FORTE, IL BAGNO È IN CIMA ALLA CASA!",
      ],
    },
    {
      id: "papa",
      name: "PAPÀ ORSO",
      wx: 17.5,
      wy: 11.5,
      radius: 1.5,
      color: "#60a5fa",
      lines: [
        "BUONGIORNO PICCOLA CAMPIONESSA!",
        "HAI VISTO IL TRAMPOLINO NEL CORTILE? FA BOING!",
        "USA IL BOROTALCO PER VOLARE SOPRA I CUSCINI!",
      ],
    },
    {
      id: "micio",
      name: "MICIO IL GATTO",
      wx: 14.5,
      wy: 7.0,
      radius: 1.3,
      color: "#fb923c",
      lines: [
        "MIAO! PURRR... CHE COCCOLE DOLCI!",
        "IO STO QUI SUL CUSCINO MORBIDO A FARE LA NANNA!",
        "MI PIACCIONO TANTISSIMO LE TUE CAREZZE!",
      ],
    },
    {
      id: "paperella",
      name: "PAPERELLA D'ORO",
      wx: 11.5,
      wy: 11.5,
      radius: 1.5,
      color: "#facc15",
      lines: [
        "QUACK QUACK! SONO LA PAPERELLA DEI TROFEI!",
        "IN OGNI STANZA C'È UNA MIA AMICA SEGRETA!",
        "CERCA I PASSAGGI SEGRETI PER TROVARCI TUTTE!",
      ],
    },
    {
      id: "coniglio",
      name: "BABBO CONIGLIO",
      wx: 9.5,
      wy: 14.5,
      radius: 2.6,
      color: "#a78bfa",
      lines: [
        `BENVENUTA AL BAZAR DI ORSO, ${PLAYER_NAME}!`,
        "PORTAMI LE STELLINE E TI DARÒ CAPPELLINI BELLISSIMI!",
        "C'È ANCHE IL BOROTALCO CHE FA I CUORICINI!",
      ],
    },
  ];
}

export type ColliderCircle = { x: number; y: number; r: number };
export type ColliderRect = { x1: number; y1: number; x2: number; y2: number };

/** Ritorna gli ostacoli della mappa (muri della casa, fontana, recinti). */
/** Ritorna gli ostacoli della mappa con sagome fisiche calibrate sull'esatto ingombro a terra dei disegni. */
export function getMapColliders(): { circles: ColliderCircle[]; rects: ColliderRect[] } {
  return {
    circles: [
      // Fontana centrale (bordo vasca in marmo a terra)
      { x: 11.5, y: 11.5, r: 1.35 },

      // Gazebo del mercatino (ingombro piedini e bancone in legno di Babbo Coniglio)
      { x: 9.3, y: 14.3, r: 0.65 },

      // Alberelli da frutto (tronco solido alla base: la chioma fogliare è in alto!)
      { x: 20.5, y: 18.5, r: 0.38 },
      { x: 16.5, y: 13.5, r: 0.38 },
      { x: 4.5, y: 20.5, r: 0.38 },

      // Cespugli di rose fiorite (sagoma cespuglio alla base)
      { x: 16.5, y: 19.5, r: 0.38 },
      { x: 20.5, y: 11.5, r: 0.38 },
      { x: 22.5, y: 16.5, r: 0.38 },
      { x: 13.5, y: 21.5, r: 0.38 },

      // Canestro da basket (base e palo di sostegno posteriore, canestro libero davanti)
      { x: 13.8, y: 19.7, r: 0.32 },

      // Tavolino bistrot da tè (piedistallo centrale)
      { x: 6.5, y: 15.5, r: 0.45 },

      // Panchine in legno del viale (ingombro seduta)
      { x: 6.5, y: 11.5, r: 0.42 },
      { x: 15.5, y: 11.5, r: 0.42 },

      // 4 Lampioni vittoriani (fusto sottile in ghisa)
      { x: 9.5, y: 9.5, r: 0.22 },
      { x: 13.5, y: 9.5, r: 0.22 },
      { x: 9.5, y: 17.5, r: 0.22 },
      { x: 17.5, y: 17.5, r: 0.22 },

      // Cannocchiale panoramico (terrazzo belvedere verso l'orizzonte)
      { x: 21.5, y: 7.5, r: 0.32 },

      // Amici NPC (ingombro zampette naturale, senza bolle teoriche giganti)
      { x: 8.5, y: 8.5, r: 0.42 }, // Mamma Orsa
      { x: 17.5, y: 11.5, r: 0.45 }, // Papà Orso
      { x: 14.5, y: 7.0, r: 0.38 }, // Micio il Gatto (cuscino)
    ],
    rects: [
      // Muro perimetrale esterno (confini del mondo calpestabile: 3.6 <= x, y <= 23.6)
      { x1: -5, y1: -5, x2: 3.6, y2: 30 }, // Parete Ovest / Nord-Ovest
      { x1: 23.6, y1: -5, x2: 32, y2: 30 }, // Bordo Est
      { x1: -5, y1: -5, x2: 32, y2: 3.6 }, // Parete Nord / Nord-Est
      { x1: -5, y1: 23.6, x2: 32, y2: 32 }, // Bordo Sud

      // Ringhiera in legno bianco sul bordo est del terrazzo belvedere (passerella musicale x: 18.0 completamente libera)
      { x1: 22.4, y1: 5.6, x2: 23.2, y2: 6.8 },
      { x1: 22.4, y1: 8.6, x2: 23.2, y2: 9.8 },
    ],
  };
}
