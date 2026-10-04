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
    fade: 0,
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

export const LEVEL_COUNT = 8;

export function createLevel(index: number): Level {
  const makers = [salotto, cucina, giardino, corridoio, lavanderia, cameretta, terrazzo, scale];
  return (makers[index] ?? scale)();
}

function salotto(): Level {
  const w = 5000;
  const garden = [
    plat("pillow", 360, 408, 200),
    plat("pillow", 680, 360, 190),
    plat("bench", 1040, 400, 220),
  ];
  const tramp = spring(1580, 414, 190);
  const cloud = plat("pillow", 1920, 220, 260);
  const parlor = [
    plat("mat", 2760, 372, 230),
    plat("pillow", 3220, 332, 200),
    plat("bench", 3680, 386, 240),
    plat("mat", 4180, 348, 200),
  ];
  return {
    index: 0,
    name: "Il salotto",
    hint: "Prima i cuscini, poi la molla. La porta è in fondo al tappeto.",
    winTitle: "Piccolo sollievo!",
    winText: "Bagno degli ospiti. Adesso la cucina, attento all'olio.",
    theme: "salotto",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), ...garden, tramp, cloud, ...parlor],
    coins: [
      ...arc(180, GROUND - 80, 900, 300, 6, 70),
      ...arc(1600, 360, 2140, 160, 5, 20),
      coin(2000, 150),
      coin(2080, 150),
      ...coinsOn(parlor, [1280, 2500, 4500, 4700]),
    ],
    enemies: [
      foe("sponge", 1280, 1180, 1500, 40, GROUND, 52, 40),
      foe("roll", 3000, 2860, 3500, 64, GROUND, 44, 44),
      foe("duck", 4000, 3860, 4520, 44, GROUND, 46, 38),
    ],
    powers: [power("powder", 740, 360 - 60), power("heart", 3280, 332 - 62)],
    checkpoints: [{ x: 2480, floor: GROUND, got: false }],
    goal: { x: 4740, y: GROUND - 210, w: 130, h: 210 },
    spawnX: 70,
    slips: [],
    steams: [],
    gusts: [],
    finale: false,
  };
}

function corridoio(): Level {
  const w = 5600;
  const rug = shuttle("mat", 860, 348, 300, 150, 0.8);
  const steps = flight(1900, 472, 4, 14, 156);
  const glidePad = plat("bench", 2680, 310, 230, false);
  const stones = [
    plat("pillow", 3060, 372, 180),
    plat("pillow", 3340, 328, 170),
    plat("bench", 3600, 292, 180),
  ];
  const elevator = lift("mat", 4120, 348, 230, 78, 0.65);
  const finale = plat("bench", 4680, 360, 240);
  return {
    index: 3,
    name: "Il corridoio",
    hint: "Sali sul tappeto che si muove. Poi plana, o salta i cuscini.",
    winTitle: "Ancora un po'!",
    winText: "Dopo il corridoio c'è la lavanderia.",
    theme: "corridoio",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), rug, ...steps, glidePad, ...stones, elevator, finale],
    coins: [
      ...arc(160, GROUND - 74, 700, GROUND - 74, 4, 86),
      ...arc(880, 292, 1280, 292, 5, 28),
      coin(steps[1]!.x + 30, steps[1]!.y - 52),
      coin(steps[3]!.x + 30, steps[3]!.y - 52),
      ...arc(3100, 320, 3740, 230, 4, 16),
      coin(4180, 240),
      coin(4260, 220),
      coin(4760, 292),
      coin(5200, GROUND - 72),
      coin(5360, GROUND - 72),
    ],
    enemies: [
      foe("roll", 280, 160, 640, 58, GROUND, 44, 44),
      foe("bubble", 2300, 2100, 2800, 34, GROUND, 44, 44, 200),
      foe("sponge", 3180, 3060, 3720, 38, GROUND, 52, 40),
      foe("duck", 4500, 4360, 5100, 46, GROUND, 46, 38),
    ],
    powers: [power("glide", glidePad.x + 80, glidePad.y - 62), power("powder", finale.x + 70, finale.y - 62)],
    checkpoints: [
      { x: 1720, floor: GROUND, got: false },
      { x: 4400, floor: GROUND, got: false },
    ],
    goal: { x: 5340, y: GROUND - 210, w: 140, h: 210 },
    spawnX: 64,
    slips: [],
    steams: [],
    gusts: [],
    finale: false,
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
    index: 7,
    name: "Il bagno",
    hint: "Tre rampe. In cima le piastrelle: la porta è quella giusta.",
    winTitle: "Che sollievo!",
    winText: "Porta chiusa. Orso Borotalco ce l'ha fatta.",
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
      foe("sponge", high.x + 520, high.x + 420, high.x + 820, 40, topY, 52, 40),
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
    slips: [],
    steams: [],
    gusts: [],
    finale: true,
  };
}

function cucina(): Level {
  const w = 4600;
  const shelf = [
    plat("bench", 1480, 360, 240),
    plat("pillow", 2500, 372, 200),
    plat("mat", 3600, 340, 220),
  ];
  return {
    index: 1,
    name: "La cucina",
    hint: "L'olio fa scivolare. Le pentole soffiano e ti alzano.",
    winTitle: "Via dalla cucina!",
    winText: "Adesso il giardino. Aspetta l'acqua, poi salta le siepi.",
    theme: "cucina",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), ...shelf, spring(3100, 420, 160)],
    coins: [
      ...arc(180, GROUND - 78, 620, GROUND - 78, 4, 50),
      coin(1560, 300),
      coin(1660, 292),
      ...arc(2100, GROUND - 90, 2460, GROUND - 90, 3, 30),
      coin(2580, 310),
      coin(3680, 278),
      coin(4200, GROUND - 74),
      coin(4320, GROUND - 90),
    ],
    enemies: [
      foe("tomato", 980, 860, 1320, 70, GROUND, 48, 40),
      foe("sponge", 2360, 2200, 2920, 42, GROUND, 52, 40),
      foe("tomato", 3900, 3720, 4300, 76, GROUND, 48, 40),
    ],
    powers: [power("powder", 1560, 360 - 64), power("speed", 3680, 340 - 64)],
    checkpoints: [{ x: 2000, floor: GROUND, got: false }],
    goal: { x: 4380, y: GROUND - 210, w: 130, h: 210 },
    spawnX: 70,
    slips: [
      { x: 680, w: 320 },
      { x: 1880, w: 360 },
    ],
    steams: [
      { x: 1240, y: GROUND, phase: 0.4 },
      { x: 2920, y: GROUND, phase: 2.1 },
    ],
    gusts: [],
    finale: false,
  };
}

function cameretta(): Level {
  const w = 4800;
  const bed = spring(520, 418, 220);
  const bed2 = spring(1040, 390, 200);
  const blanket = shuttle("mat", 1680, 340, 280, 130, 0.7);
  const night = [
    plat("pillow", 2680, 360, 190),
    plat("bench", 3120, 300, 210),
    plat("pillow", 3600, 360, 180),
  ];
  const dream = lift("pillow", 4100, 330, 200, 70, 0.6);
  return {
    index: 5,
    name: "La cameretta",
    hint: "I letti sono molle. La pantofola saltella: saltale sulla testa.",
    winTitle: "Shhh, si continua!",
    winText: "Sul terrazzo le bolle di sapone fanno da scalini.",
    theme: "cameretta",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), bed, bed2, blanket, ...night, dream],
    coins: [
      ...arc(200, GROUND - 76, 480, GROUND - 76, 3, 40),
      ...arc(560, 340, 900, 250, 4, 30),
      coin(1120, 250),
      ...arc(1700, 280, 2080, 280, 4, 24),
      coin(2760, 300),
      coin(3200, 240),
      coin(3680, 300),
      coin(4160, 230),
      coin(4480, GROUND - 76),
    ],
    enemies: [
      foe("slipper", 860, 760, 1400, 48, GROUND, 52, 36),
      foe("bubble", 2400, 2200, 3000, 30, GROUND, 44, 44, 210),
      foe("slipper", 3400, 3280, 3920, 44, GROUND, 52, 36),
      foe("duck", 4300, 4180, 4620, 40, GROUND, 46, 38),
    ],
    powers: [power("glide", 3200, 300 - 64), power("heart", 1140, 390 - 66)],
    checkpoints: [{ x: 1560, floor: GROUND, got: false }],
    goal: { x: 4580, y: GROUND - 210, w: 130, h: 210 },
    spawnX: 64,
    slips: [],
    steams: [],
    gusts: [],
    finale: false,
  };
}

function hedge(x: number, w = 128): Solid {
  return { x, y: GROUND - 64, w, h: 64, kind: "hedge", oneWay: false };
}

function bubbleStep(x: number, y: number, phase: number, w = 190): Solid {
  return { x, y, w, h: 28, kind: "cloud", oneWay: true, pop: { period: 4.4, open: 2.5, phase } };
}

function basket(x: number, y: number, w: number, amp: number, speed: number, phase: number): Solid {
  return { x, y, w, h: 34, kind: "basket", oneWay: true, move: { axis: "y", origin: y, amp, speed, phase } };
}

function giardino(): Level {
  const w = 4500;
  const bushes = [hedge(860), hedge(1680, 150), hedge(2620), hedge(3480, 140)];
  return {
    index: 2,
    name: "Il giardino",
    hint: "Se arriva l'acqua, aspetta. Poi salta la siepe.",
    winTitle: "Che aria!",
    winText: "Si torna in casa: il corridoio.",
    theme: "giardino",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), ...bushes, spring(2100, 430, 150)],
    coins: [
      ...arc(200, GROUND - 74, 700, GROUND - 74, 4, 40),
      coin(900, GROUND - 140),
      coin(1720, GROUND - 150),
      coin(2140, 360),
      coin(2660, GROUND - 140),
      coin(3520, GROUND - 150),
      coin(4100, GROUND - 74),
      coin(4220, GROUND - 90),
    ],
    enemies: [
      foe("duck", 1280, 1120, 1560, 40, GROUND, 46, 38),
      foe("sponge", 3000, 2860, 3360, 36, GROUND, 52, 40),
    ],
    powers: [power("powder", 2140, 430 - 64)],
    checkpoints: [{ x: 1960, floor: GROUND, got: false }],
    goal: { x: 4280, y: GROUND - 210, w: 130, h: 210 },
    spawnX: 64,
    slips: [],
    steams: [],
    gusts: [
      { x: 1180, w: 340, y: GROUND, dir: -1, phase: 0.2 },
      { x: 2200, w: 320, y: GROUND, dir: -1, phase: 2.2 },
    ],
    finale: false,
  };
}

function lavanderia(): Level {
  const w = 4700;
  const baskets = [
    basket(720, 400, 210, 86, 0.7, 0),
    basket(1280, 390, 200, 96, 0.85, 1.4),
    basket(1960, 370, 220, 100, 0.75, 2.6),
    basket(2920, 400, 200, 90, 0.8, 0.8),
    basket(3600, 380, 210, 100, 0.7, 2),
  ];
  return {
    index: 4,
    name: "La lavanderia",
    hint: "Sali nel cesto quando è basso. Il calzino scivola.",
    winTitle: "Panni stesi!",
    winText: "Adesso la cameretta, in punta di piedi.",
    theme: "lavanderia",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), ...baskets],
    coins: [
      coin(780, 250),
      coin(1360, 220),
      coin(2040, 200),
      coin(3000, 240),
      coin(3680, 210),
      ...arc(240, GROUND - 72, 560, GROUND - 72, 3, 36),
      coin(4300, GROUND - 74),
      coin(4420, GROUND - 90),
    ],
    enemies: [
      foe("sock", 1100, 980, 1700, 92, GROUND, 48, 28),
      foe("sock", 2500, 2300, 3200, 100, GROUND, 48, 28),
      foe("bubble", 4000, 3800, 4500, 28, GROUND, 44, 44, 220),
    ],
    powers: [power("glide", 2000, 370 - 70), power("heart", 3640, 380 - 68)],
    checkpoints: [{ x: 1760, floor: GROUND, got: false }],
    goal: { x: 4480, y: GROUND - 210, w: 130, h: 210 },
    spawnX: 64,
    slips: [],
    steams: [],
    gusts: [],
    finale: false,
  };
}

function terrazzo(): Level {
  const w = 4800;
  const clouds = [
    bubbleStep(900, 400, 0),
    bubbleStep(1160, 340, 1.1),
    bubbleStep(1420, 280, 2.2),
    bubbleStep(1680, 340, 0.4),
    bubbleStep(2500, 390, 1.8),
    bubbleStep(2760, 320, 0.6),
    bubbleStep(3020, 260, 2.8),
    bubbleStep(3280, 320, 1.3),
    bubbleStep(3900, 380, 0.2),
    bubbleStep(4160, 310, 1.6),
  ];
  return {
    index: 6,
    name: "Il terrazzo",
    hint: "Le bolle reggono solo un momento. Salta sulla prossima.",
    winTitle: "Che vista!",
    winText: "L'ultima porta è il bagno.",
    theme: "terrazzo",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), ...clouds, plat("bench", 2000, 420, 240, false)],
    coins: [
      coin(960, 340),
      coin(1220, 270),
      coin(1480, 210),
      coin(1740, 270),
      coin(2560, 320),
      coin(2820, 250),
      coin(3080, 190),
      coin(3340, 250),
      coin(3960, 310),
      coin(4220, 240),
      coin(2080, 350),
      coin(4500, GROUND - 74),
    ],
    enemies: [
      foe("bubble", 2100, 1900, 2500, 32, GROUND, 44, 44, 180),
      foe("duck", 3600, 3460, 4000, 40, GROUND, 46, 38),
    ],
    powers: [power("powder", 2080, 420 - 64)],
    checkpoints: [{ x: 1880, floor: GROUND, got: false }],
    goal: { x: 4560, y: GROUND - 210, w: 130, h: 210 },
    spawnX: 64,
    slips: [],
    steams: [],
    gusts: [],
    finale: false,
  };
}
