export type HubPoint = { x: number; y: number };

export type PortalInfo = {
  index: number;
  name: string;
  icon: string;
  wx: number;
  wy: number;
  radius: number;
  locked: boolean;
  stars: number;
  duck: boolean;
  flip?: number; // 1 = rivolto SE, -1 = specchiato SW lungo il muro NE
};

export type NpcKind = "mamma" | "papa" | "micio" | "paperella" | "coniglio";

export type NpcInfo = {
  id: NpcKind;
  name: string;
  wx: number;
  wy: number;
  radius: number;
  lines: string[];
  color: string;
};

export type BallSpark = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  alpha: number;
  rot: number;
};

export type ToyBall = {
  wx: number;
  wy: number;
  wz: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  rotation: number;
  rollAngleX: number;
  rollAngleY: number;
  squish: number;
  squishVel: number;
  combo: number;
  bestCombo: number;
  comboTimer: number;
  comboPop: number;
  lastKickBy: NpcKind | "player" | "tramp" | null;
  sparks: BallSpark[];
};

export type HubToy = {
  ball: ToyBall;
  trampoline: { wx: number; wy: number; radius: number };
  musicBox: { wx: number; wy: number; playing: boolean; notes: { x: number; y: number; t: number; char: string }[] };
};

export type DialogueState = {
  speaker: string;
  npcId: NpcKind;
  lines: string[];
  lineIndex: number;
} | null;

export type TapTarget = {
  wx: number;
  wy: number;
  t: number;
  path?: { wx: number; wy: number }[];
  waypointIndex?: number;
} | null;

export type HubPlayer = {
  wx: number;
  wy: number;
  wz: number;
  vx: number;
  vy: number;
  vz: number;
  flip: number; // 1 = destra, -1 = sinistra
  moving: boolean;
  footstepTimer: number;
  dustPuffs: { x: number; y: number; r: number; alpha: number }[];
};

export type HubState = {
  player: HubPlayer;
  cam: { x: number; y: number };
  tapTarget: TapTarget;
  dialogue: DialogueState;
  portals: PortalInfo[];
  npcs: NpcInfo[];
  toys: HubToy;
  t: number;
  activePortal: PortalInfo | null;
  activeNpc: NpcInfo | null;
  nearShop: boolean;
  lastEnteredPortal: number | null;
};
