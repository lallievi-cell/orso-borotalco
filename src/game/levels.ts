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
  const list = extra.map((x) => coin(x, GROUND - 70));
  for (const p of plats) list.push(coin(p.x + p.w * 0.5 - 15, p.y - 54));
  return list;
}

function spring(x: number, y: number, w = 168): Solid {
  return { x, y, w, h: 28, kind: "pillow", oneWay: true, bounce: true };
}

function shuttle(kind: SolidKind, x: number, y: number, w: number, amp: number, speed: number, phase = 0): Solid {
  return { ...plat(kind, x, y, w, true), move: { axis: "x", origin: x, amp, speed, phase } };
}

function lift(kind: SolidKind, x: number, y: number, w: number, amp: number, speed: number, phase = 0): Solid {
  return { ...plat(kind, x, y, w, true), move: { axis: "y", origin: y, amp, speed, phase } };
}

function arc(x0: number, y0: number, x1: number, y1: number, n: number, height: number): Coin[] {
  const out: Coin[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * height;
    out.push(coin(x, y));
  }
  return out;
}

function flight(x: number, y: number, n: number, rise: number, step: number): Solid[] {
  const kinds: SolidKind[] = ["pillow", "bench", "mat"];
  const out: Solid[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: x + i * step,
      y: y - i * rise,
      w: step + 40,
      h: 40,
      kind: kinds[i % 3]!,
      oneWay: false,
    });
  }
  return out;
}

export function createLevel(index: number): Level {
  if (index <= 0) return salotto();
  if (index === 1) return corridoio();
  return scale();
}

function salotto(): Level {
  const w = 4600;
  const low = [
    plat("pillow", 340, 392, 230),
    plat("bench", 720, 348, 220),
    plat("mat", 2140, 360, 250),
    plat("pillow", 2680, 318, 210),
    plat("bench", 3180, 388, 240),
    plat("mat", 3720, 340, 220),
  ];
  const high = plat("pillow", 1680, 236, 230);
  const tramp = spring(1380, 408);
  return {
    index: 0,
    name: "Il salotto",
    hint: "Salta sui cuscini. Quello a righe è una molla!",
    winTitle: "Piccolo sollievo!",
    winText: "Questo è il bagno degli ospiti. Il corridoio è più lungo.",
    theme: "salotto",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), ...low, tramp, high],
    coins: [
      ...arc(160, GROUND - 78, 620, GROUND - 78, 5, 90),
      ...arc(1400, 360, 1880, 180, 5, 30),
      ...coinsOn(low, [1100, 2480, 3480, 4300]),
      coin(1760, 170),
      coin(1840, 170),
    ],
    enemies: [
      foe("sponge", 980, 900, 1280, 42, GROUND, 52, 40),
      foe("roll", 2360, 2220, 2920, 70, GROUND, 44, 44),
      foe("duck", 3480, 3340, 4020, 46, GROUND, 46, 38),
    ],
    powers: [power("powder", 780, 348 - 58), power("heart", 2740, 318 - 60)],
    checkpoints: [{ x: 2000, floor: GROUND, got: false }],
    goal: { x: 4340, y: GROUND - 210, w: 130, h: 210 },
    spawnX: 72,
  };
}

function corridoio(): Level {
  const w = 5400;
  const rug = shuttle("mat", 980, 352, 280, 130, 0.85);
  const steps = flight(1680, 470, 4, 16, 150);
  const glidePad = plat("bench", 2480, 300, 240, false);
  const stones = [
    plat("pillow", 2860, 360, 180),
    plat("pillow", 3160, 300, 170),
    plat("bench", 3460, 250, 180),
  ];
  const elevator = lift("mat", 3920, 360, 220, 70, 0.7);
  const finale = plat("bench", 4480, 340, 260);
  return {
    index: 1,
    name: "Il corridoio",
    hint: "Il tappeto si muove. La ciambella: tieni premuto per planare.",
    winTitle: "Ancora un po'!",
    winText: "Il corridoio finisce qui. Le scale portano al bagno vero.",
    theme: "corridoio",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), rug, ...steps, glidePad, ...stones, elevator, finale],
    coins: [
      ...arc(200, GROUND - 72, 760, GROUND - 72, 4, 80),
      ...arc(1000, 300, 1360, 300, 4, 36),
      coin(steps[1]!.x + 40, steps[1]!.y - 52),
      coin(steps[3]!.x + 40, steps[3]!.y - 52),
      ...arc(2900, 300, 3600, 190, 4, 20),
      coin(4000, 250),
      coin(4080, 230),
      coin(4560, 280),
      coin(5000, GROUND - 70),
      coin(5140, GROUND - 70),
    ],
    enemies: [
      foe("roll", 360, 220, 760, 68, GROUND, 44, 44),
      foe("bubble", 2100, 1900, 2700, 36, GROUND, 44, 44, 210),
      foe("sponge", 3000, 2860, 3600, 40, GROUND, 52, 40),
      foe("duck", 4300, 4160, 4900, 48, GROUND, 46, 38),
      foe("bubble", 4700, 4520, 5200, 34, GROUND, 44, 44, 180),
    ],
    powers: [power("glide", glidePad.x + 90, glidePad.y - 62), power("powder", finale.x + 80, finale.y - 62)],
    checkpoints: [
      { x: 1560, floor: GROUND, got: false },
      { x: 4200, floor: GROUND, got: false },
    ],
    goal: { x: 5160, y: GROUND - 210, w: 130, h: 210 },
    spawnX: 70,
  };
}

function scale(): Level {
  const w = 5200;
  const a = flight(260, 478, 5, 18, 148);
  const landA = a[a.length - 1]!;
  const padA: Solid = { x: landA.x + landA.w - 10, y: landA.y, w: 460, h: 42, kind: "mat", oneWay: false };
  const b = flight(padA.x + padA.w + 20, padA.y, 5, 18, 146);
  const landB = b[b.length - 1]!;
  const padB: Solid = { x: landB.x + landB.w - 8, y: landB.y, w: 520, h: 44, kind: "bench", oneWay: false };
  const tramp = spring(padB.x + 70, padB.y - 52, 150);
  const c = flight(padB.x + padB.w + 16, padB.y, 4, 16, 150);
  const landC = c[c.length - 1]!;
  const topY = landC.y;
  const high: Solid = { x: landC.x + landC.w - 12, y: topY, w: 1680, h: 48, kind: "mat", oneWay: false };
  return {
    index: 2,
    name: "Le scale del bagno",
    hint: "Sali camminando. La molla è una scorciatoia, non è obbligatoria.",
    winTitle: "Che sollievo!",
    winText: "Orso Borotalco ce l'ha fatta. Il barattolo può riposare.",
    theme: "bagno",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), ...a, padA, ...b, padB, tramp, ...c, high],
    coins: [
      ...a.map((s) => coin(s.x + 36, s.y - 50)),
      ...b.map((s) => coin(s.x + 36, s.y - 50)),
      coin(padA.x + 180, padA.y - 56),
      coin(padA.x + 280, padA.y - 56),
      ...arc(padB.x + 180, padB.y - 70, padB.x + 420, padB.y - 160, 4, 40),
      coin(high.x + 180, topY - 58),
      coin(high.x + 420, topY - 58),
      coin(high.x + 700, topY - 58),
      coin(high.x + 980, topY - 58),
      coin(high.x + 1280, topY - 58),
      coin(220, GROUND - 70),
      coin(300, GROUND - 96),
    ],
    enemies: [
      foe("roll", 80, 40, 220, 48, GROUND, 44, 44),
      foe("duck", padA.x + 80, padA.x + 40, padA.x + padA.w - 80, 36, padA.y, 46, 38),
      foe("bubble", high.x + 300, high.x + 160, high.x + 900, 32, topY, 44, 44, topY - 130),
      foe("sponge", high.x + 980, high.x + 860, high.x + 1400, 40, topY, 52, 40),
    ],
    powers: [
      power("speed", padA.x + 200, padA.y - 62),
      power("heart", padB.x + 300, padB.y - 64),
      power("powder", high.x + 1120, topY - 64),
    ],
    checkpoints: [
      { x: padA.x + 80, floor: padA.y, got: false },
      { x: high.x + 200, floor: topY, got: false },
    ],
    goal: { x: high.x + high.w - 220, y: topY - 210, w: 140, h: 210 },
    spawnX: 64,
  };
}
