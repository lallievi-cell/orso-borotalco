export const VIEW_W = 960;
export const VIEW_H = 540;
/** Larghezza minima e massima della vista: si adatta al formato dello schermo (4:3 tablet, 16:9, telefoni lunghi). */
export const VIEW_MIN_W = 720;
export const VIEW_MAX_W = 1240;
export const PW = 42;
export const PH = 58;

export type Theme = "salotto" | "cucina" | "giardino" | "corridoio" | "lavanderia" | "cameretta" | "terrazzo" | "bagno";
export type SolidKind = "ground" | "pillow" | "bench" | "mat" | "hedge" | "basket" | "cloud" | "blocks";
export type EnemyKind = "sponge" | "roll" | "bubble" | "duck" | "tomato" | "slipper" | "sock";
export type PowerKind = "powder" | "glide" | "speed" | "heart";

export type Rect = { x: number; y: number; w: number; h: number };

export type Mover = { axis: "x" | "y"; origin: number; amp: number; speed: number; phase: number };

export type Solid = Rect & {
  kind: SolidKind;
  oneWay: boolean;
  bounce?: boolean;
  move?: Mover;
  pop?: { period: number; open: number; phase: number };
  /** Timer dell'ammaccatura quando l'orso ci rimbalza sopra (solo grafica). */
  squish?: number;
};

export type Gust = { x: number; w: number; y: number; dir: number; phase: number };

export type Coin = Rect & { got: boolean };

export type Power = Rect & { kind: PowerKind; got: boolean };

export type Secret = Rect & { got: boolean };

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
  /** Piccolo rimbalzo all'indietro quando tocca l'orso fermo (nessun danno). */
  bump: number;
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
  /** >0 quando l'orso aspetta un salto (nemico davanti, siepe, acqua): mostra il suggerimento "tocca". */
  wait: number;
  combo: number;
  comboT: number;
  happy: number;
};

export type ParticleShape = "dot" | "star" | "heart" | "ring" | "bubble";

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  color: string;
  shape: ParticleShape;
  spin: number;
  grav: number;
};

/** Stellina che vola verso il contatore in alto a sinistra. */
export type Flyer = { x: number; y: number; t: number };

export type Slip = { x: number; w: number };
export type Steam = { x: number; y: number; phase: number };

export type Level = {
  index: number;
  name: string;
  hint: string;
  say: string;
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
  secret: Secret | null;
  goal: Rect;
  spawnX: number;
  slips: Slip[];
  steams: Steam[];
  gusts: Gust[];
  finale: boolean;
};

export type StepEvents = {
  jump: boolean;
  coins: number;
  combo: number;
  stomp: boolean;
  hurt: boolean;
  heal: boolean;
  power: PowerKind | null;
  checkpoint: boolean;
  win: boolean;
  nap: boolean;
  fall: boolean;
  bounce: boolean;
  bump: boolean;
  secret: boolean;
  steam: boolean;
};

export type Input = {
  x: number;
  jumpHeld: boolean;
  jumpPressed: boolean;
  down: boolean;
  auto?: boolean;
};
