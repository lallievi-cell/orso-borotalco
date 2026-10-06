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

/** Crea i portali delle 8 stanze posizionati e orientati in linea con i muri del diorama. */
export function createPortals(save: SaveData): PortalInfo[] {
  const portalConfigs: { wx: number; wy: number; flip: number }[] = [
    { wx: 5.0, wy: 8.5, flip: 1 }, // 0: Salotto (Muro NO, rivolto verso SE nel cortile)
    { wx: 5.0, wy: 13.5, flip: 1 }, // 1: Cucina (Muro NO, rivolto verso SE nel cortile)
    { wx: 18.5, wy: 14.5, flip: -1 }, // 2: Giardino (Soglia giardino, rivolto verso SO)
    { wx: 8.5, wy: 5.6, flip: -1 }, // 3: Corridoio (Muro NE, rivolto verso SO nel cortile)
    { wx: 5.0, wy: 18.5, flip: 1 }, // 4: Lavanderia (Muro NO, rivolto verso SE nel cortile)
    { wx: 14.5, wy: 5.6, flip: -1 }, // 5: Cameretta (Muro NE, rivolto verso SO nel cortile)
    { wx: 18.5, wy: 7.5, flip: -1 }, // 6: Terrazzo (Muro est con staccionata, rivolto verso SO)
    { wx: 11.5, wy: 4.5, flip: -1 }, // 7: Bagno d'Oro (Apice settentrionale della villa, sul marmo rosa)
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
      wx: 16.5,
      wy: 12.5,
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
      radius: 1.6,
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
export function getMapColliders(): { circles: ColliderCircle[]; rects: ColliderRect[] } {
  return {
    circles: [
      // Fontana centrale
      { x: 11.5, y: 11.5, r: 1.6 },
      // Gazebo del mercatino
      { x: 9.5, y: 14.5, r: 1.4 },
      // Alberelli e cespugli nel cortile
      { x: 19.5, y: 18.5, r: 1.2 },
      { x: 16.5, y: 19.5, r: 1.2 },
      { x: 20.5, y: 11.5, r: 1.2 },
      { x: 3.5, y: 19.5, r: 1.2 },
      // Amici NPC (impediscono compenetrazioni dello sprite ma lasciano raggio di dialogo)
      { x: 8.5, y: 8.5, r: 0.8 }, // Mamma Orsa
      { x: 16.5, y: 12.5, r: 0.8 }, // Papà Orso
      { x: 14.5, y: 7.0, r: 0.65 }, // Micio il Gatto
    ],
    rects: [
      // Muro perimetrale esterno (confini del mondo calpestabile: 2 <= x, y <= 21)
      { x1: -5, y1: -5, x2: 2.2, y2: 27 }, // Ovest
      { x1: 21.8, y1: -5, x2: 28, y2: 27 }, // Est
      { x1: -5, y1: -5, x2: 27, y2: 1.8 }, // Nord
      { x1: -5, y1: 21.8, x2: 27, y2: 28 }, // Sud

      // Muri interni della casa (ala nord)
      { x1: 2.5, y1: 6.8, x2: 8.0, y2: 7.2 },
      { x1: 2.5, y1: 11.8, x2: 8.0, y2: 12.2 },
      { x1: 2.5, y1: 16.8, x2: 8.0, y2: 17.2 },

      // Recinzione giardino est e terrazzo
      { x1: 17.8, y1: 6.8, x2: 18.8, y2: 10.6 },
    ],
  };
}
