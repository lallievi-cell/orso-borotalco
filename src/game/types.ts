export const VIEW_W = 960;
export const VIEW_H = 540;
export const PW = 42;
export const PH = 58;

export type Theme = "salotto" | "corridoio" | "bagno";
export type SolidKind = "ground" | "pillow" | "bench" | "mat";
export type EnemyKind = "sponge" | "roll" | "bubble" | "duck";
export type PowerKind = "powder" | "glide" | "speed" | "heart";

export type Rect = { x: number; y: number; w: number; h: number };

export type Mover = { axis: "x" | "y"; origin: number; amp: number; speed: number; phase: number };

export type Solid = Rect & { kind: SolidKind; oneWay: boolean; bounce?: boolean; move?: Mover };

export type Coin = Rect & { got: boolean };

export type Power = Rect & { kind: PowerKind; got: boolean };

export type Checkpoint = { x: number; floor: number; got: boolean };

export type Enemy = {
  kind: EnemyKind;
  x: number;
  y: number;
  w: number;
  h: number;
  minX: number;
  maxX: number;
  speed: number;
  dir: number;
  vy: number;
  stun: number;
  phase: number;
  hop: number;
  homeY: number;
  floor: number;
  fade: number;
};

export type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  grounded: boolean;
  coyote: number;
  buffer: number;
  jumpCut: boolean;
  hearts: number;
  stars: number;
  invuln: number;
  powder: number;
  glide: number;
  speed: number;
  drop: number;
  spawnX: number;
  spawnY: number;
  anim: number;
  land: number;
  nap: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  color: string;
};

export type Level = {
  index: number;
  name: string;
  hint: string;
  winTitle: string;
  winText: string;
  theme: Theme;
  w: number;
  h: number;
  groundY: number;
  solids: Solid[];
  coins: Coin[];
  enemies: Enemy[];
  powers: Power[];
  checkpoints: Checkpoint[];
  goal: Rect;
  spawnX: number;
};

export type StepEvents = {
  jump: boolean;
  coins: number;
  stomp: boolean;
  hurt: boolean;
  heal: boolean;
  power: PowerKind | null;
  checkpoint: boolean;
  win: boolean;
  nap: boolean;
  fall: boolean;
};

export type Input = {
  x: number;
  jumpHeld: boolean;
  jumpPressed: boolean;
  down: boolean;
  auto?: boolean;
};
