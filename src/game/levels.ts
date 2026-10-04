import type { Coin, Enemy, EnemyKind, Level, Power, PowerKind, Solid, SolidKind } from "@/game/types";

const H = 640;
const GROUND = 500;

function ground(w: number): Solid {
  return { x: 0, y: GROUND, w, h: 220, kind: "ground", oneWay: false };
}

function plat(kind: SolidKind, x: number, y: number, w: number, oneWay = true): Solid {
  const h = kind === "mat" ? 30 : 34;
  return { x, y, w, h, kind, oneWay };
}

function coin(x: number, y: number): Coin {
  return { x, y, w: 30, h: 30, got: false };
}

function power(kind: PowerKind, x: number, y: number): Power {
  return { kind, x, y, w: 42, h: 42, got: false };
}

function foe(
  kind: EnemyKind,
  x: number,
  minX: number,
  maxX: number,
  speed: number,
  floor: number,
  w: number,
  h: number,
  homeY?: number,
): Enemy {
  return {
    kind,
    x,
    y: kind === "bubble" ? (homeY ?? floor) : floor - h,
    w,
    h,
    minX,
    maxX,
    speed,
    dir: 1,
    vy: 0,
    stun: 0,
    phase: x * 0.01,
    hop: 0.4,
    homeY: homeY ?? floor - h,
    floor,
  };
}

function coinsOn(plats: Solid[], extra: number[]): Coin[] {
  const list = extra.map((x) => coin(x, GROUND - 64));
  for (const p of plats) list.push(coin(p.x + p.w * 0.5 - 15, p.y - 52));
  return list;
}

export function createLevel(index: number): Level {
  if (index <= 0) return salotto();
  if (index === 1) return corridoio();
  return scale();
}

function salotto(): Level {
  const w = 4500;
  const plats = [
    plat("pillow", 480, 392, 280),
    plat("bench", 1000, 358, 240),
    plat("pillow", 1500, 404, 270),
    plat("mat", 2020, 348, 230),
    plat("bench", 2500, 384, 240),
    plat("pillow", 3000, 346, 280),
    plat("mat", 3520, 378, 220),
    plat("bench", 3960, 340, 240),
  ];
  return {
    index: 0,
    name: "Il salotto",
    hint: "Frecce o A e D per camminare. Spazio per saltare.",
    winTitle: "Piccolo sollievo!",
    winText: "Questo è il bagno degli ospiti. Quello grande è più avanti.",
    theme: "salotto",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), ...plats],
    coins: coinsOn(plats, [280, 760, 1280, 1780, 2360, 2860, 3380, 4180]),
    enemies: [
      foe("sponge", 700, 600, 1180, 46, GROUND, 52, 40),
      foe("roll", 1680, 1560, 2280, 74, GROUND, 44, 44),
      foe("bubble", 2620, 2460, 3240, 40, GROUND, 44, 44, 246),
      foe("duck", 3480, 3320, 4040, 50, GROUND, 46, 38),
    ],
    powers: [power("powder", 1080, 358 - 58)],
    checkpoints: [{ x: 2140, floor: GROUND, got: false }],
    goal: { x: 4280, y: GROUND - 210, w: 130, h: 210 },
    spawnX: 72,
  };
}

function corridoio(): Level {
  const w = 5000;
  const stairs: Solid[] = [];
  for (let i = 0; i < 5; i++) {
    stairs.push({
      x: 640 + i * 148,
      y: 476 - i * 22,
      w: 172,
      h: 40,
      kind: i % 2 === 0 ? "bench" : "mat",
      oneWay: false,
    });
  }
  const plats = [
    plat("pillow", 1680, 372, 270),
    plat("mat", 2180, 332, 230),
    plat("bench", 2680, 388, 240),
    plat("pillow", 3220, 348, 280),
    plat("mat", 3760, 336, 220),
    plat("bench", 4240, 364, 240),
  ];
  const hillTop = stairs[stairs.length - 1]!;
  return {
    index: 1,
    name: "Il corridoio",
    hint: "La ciambella di sapone: tieni premuto il salto per planare.",
    winTitle: "Ancora un po'!",
    winText: "Il corridoio finisce qui. Le scale portano al bagno vero.",
    theme: "corridoio",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), ...stairs, ...plats],
    coins: [
      ...coinsOn(plats, [240, 420, 1500, 1960, 2560, 3040, 3600, 4120, 4680]),
      coin(hillTop.x + 60, hillTop.y - 52),
    ],
    enemies: [
      foe("roll", 220, 140, 520, 62, GROUND, 44, 44),
      foe("sponge", 1460, 1360, 1960, 48, GROUND, 52, 40),
      foe("bubble", 2360, 2200, 2920, 42, GROUND, 44, 44, 230),
      foe("roll", 3080, 2960, 3660, 78, GROUND, 44, 44),
      foe("duck", 4000, 3860, 4560, 52, GROUND, 46, 38),
    ],
    powers: [power("glide", hillTop.x + 50, hillTop.y - 64), power("powder", 2300, 332 - 58)],
    checkpoints: [{ x: 2600, floor: GROUND, got: false }],
    goal: { x: 4760, y: GROUND - 210, w: 130, h: 210 },
    spawnX: 70,
  };
}

function scale(): Level {
  const w = 5300;
  const stairs: Solid[] = [];
  for (let i = 0; i < 10; i++) {
    const kinds: SolidKind[] = ["pillow", "bench", "mat"];
    stairs.push({
      x: 430 + i * 172,
      y: 478 - i * 20,
      w: 198,
      h: 42,
      kind: kinds[i % 3]!,
      oneWay: false,
    });
  }
  const top = 478 - 9 * 20;
  const high: Solid = { x: 1960, y: top, w: 3180, h: 48, kind: "mat", oneWay: false };
  const stepCoins = stairs.map((s) => coin(s.x + s.w * 0.45, s.y - 50));
  return {
    index: 2,
    name: "Le scale del bagno",
    hint: "Sali le scale camminando. Il bagno è in cima!",
    winTitle: "Che sollievo!",
    winText: "Orso Borotalco ce l'ha fatta. Il barattolo può riposare.",
    theme: "bagno",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), ...stairs, high],
    coins: [
      ...stepCoins,
      coin(2200, top - 56),
      coin(2600, top - 56),
      coin(3100, top - 56),
      coin(3600, top - 56),
      coin(4100, top - 56),
      coin(4550, top - 56),
      coin(200, GROUND - 64),
      coin(320, GROUND - 64),
    ],
    enemies: [
      foe("roll", 120, 80, 340, 54, GROUND, 44, 44),
      foe("bubble", 2500, 2300, 3400, 38, top, 44, 44, top - 150),
      foe("duck", 2680, 2480, 3300, 48, top, 46, 38),
      foe("sponge", 3680, 3500, 4500, 44, top, 52, 40),
    ],
    powers: [
      power("speed", stairs[4]!.x + 70, stairs[4]!.y - 60),
      power("heart", 2140, top - 62),
      power("powder", 4000, top - 62),
    ],
    checkpoints: [{ x: 2140, floor: top, got: false }],
    goal: { x: 4920, y: top - 210, w: 140, h: 210 },
    spawnX: 64,
  };
}
