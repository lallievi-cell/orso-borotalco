import type { Coin, Enemy, EnemyKind, Level, Power, PowerKind, Secret, Solid, SolidKind } from "@/game/types";

const H = 640;
const GROUND = 500;

/* ------------------------------------------------------------------ */
/*  Mattoncini per costruire i livelli                                 */
/* ------------------------------------------------------------------ */

function ground(w: number): Solid {
  return { x: 0, y: GROUND, w, h: 220, kind: "ground", oneWay: false };
}

function plat(kind: SolidKind, x: number, y: number, w: number, oneWay = true): Solid {
  const h = kind === "mat" ? 30 : 34;
  return { x, y, w, h, kind, oneWay };
}

/** Pila di cubi giocattolo da saltare (blocca il passaggio). */
function blocks(x: number, h = 58, w = 92): Solid {
  return { x, y: GROUND - h, w, h, kind: "blocks", oneWay: false };
}

function hedge(x: number, w = 128): Solid {
  return { x, y: GROUND - 64, w, h: 64, kind: "hedge", oneWay: false };
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

function bubbleStep(x: number, y: number, phase: number, w = 190): Solid {
  return { x, y, w, h: 28, kind: "cloud", oneWay: true, pop: { period: 4.6, open: 2.9, phase } };
}

function basket(x: number, y: number, w: number, amp: number, speed: number, phase: number): Solid {
  return { x, y, w, h: 34, kind: "basket", oneWay: true, move: { axis: "y", origin: y, amp, speed, phase } };
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

function coin(x: number, y: number): Coin {
  return { x, y, w: 30, h: 30, got: false };
}

/** Fila di stelline orizzontale. */
function row(x: number, y: number, n: number, gap = 54): Coin[] {
  return Array.from({ length: n }, (_, i) => coin(x + i * gap, y));
}

/** Arco di stelline: suggerisce dove saltare. */
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

/** Stelline sopra una piattaforma. */
function on(s: Solid, n = 3, gap = 50): Coin[] {
  const total = (n - 1) * gap;
  const x0 = s.x + s.w / 2 - total / 2 - 15;
  return row(x0, s.y - 56, n, gap);
}

function power(kind: PowerKind, x: number, y: number): Power {
  return { kind, x, y, w: 42, h: 42, got: false };
}

function secret(x: number, y: number): Secret {
  return { x, y, w: 46, h: 46, got: false };
}

const SIZE: Record<EnemyKind, [number, number]> = {
  sponge: [52, 40],
  roll: [44, 44],
  bubble: [44, 44],
  duck: [46, 38],
  tomato: [48, 42],
  slipper: [56, 36],
  sock: [52, 30],
};

function foe(kind: EnemyKind, minX: number, maxX: number, speed: number, floor = GROUND, homeY?: number): Enemy {
  const [w, h] = SIZE[kind];
  const x = (minX + maxX) / 2;
  return {
    kind,
    x,
    y: kind === "bubble" ? (homeY ?? floor) : floor - h,
    w,
    h,
    minX,
    maxX,
    speed,
    dir: -1,
    vy: 0,
    stun: 0,
    phase: x * 0.01,
    hop: 0.4,
    homeY: homeY ?? floor - h,
    floor,
    fade: 0,
    bump: 0,
  };
}

function door(x: number, floor = GROUND) {
  return { x, y: floor - 210, w: 130, h: 210 };
}

export const LEVEL_COUNT = 8;

export function createLevel(index: number): Level {
  const makers = [salotto, cucina, giardino, corridoio, lavanderia, cameretta, terrazzo, bagno];
  return (makers[index] ?? bagno)();
}

/* ------------------------------------------------------------------ */
/*  1. Salotto: impara a saltare                                       */
/* ------------------------------------------------------------------ */

function salotto(): Level {
  const w = 4500;
  const c1 = plat("pillow", 1000, 400, 210);
  const c2 = plat("pillow", 1290, 320, 210);
  const c3 = plat("bench", 1590, 390, 200);
  const tramp = spring(2330, 414, 180);
  const sky = plat("pillow", 2520, 190, 260);
  const shelf = plat("bench", 3330, 370, 230);
  return {
    index: 0,
    name: "Il salotto",
    hint: "Tocca per saltare!",
    say: "Il salotto. Tocca lo schermo per saltare!",
    winTitle: "Bravissima!",
    winText: "Primo bagno trovato!",
    theme: "salotto",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), blocks(720), c1, c2, c3, tramp, sky, blocks(2980, 64, 96), shelf, blocks(3900, 52, 84)],
    coins: [
      ...row(250, GROUND - 70, 5),
      ...arc(640, GROUND - 80, 880, GROUND - 80, 4, 110),
      ...on(c1),
      ...on(c2),
      ...on(c3),
      ...arc(2340, 380, 2520, 150, 4, 30),
      ...on(sky, 5),
      ...arc(2900, GROUND - 80, 3150, GROUND - 80, 4, 120),
      ...on(shelf, 4),
      ...arc(3830, GROUND - 80, 4060, GROUND - 80, 4, 100),
      ...row(4120, GROUND - 70, 2),
    ],
    enemies: [foe("sponge", 1880, 2140, 30), foe("roll", 3500, 3800, 46)],
    powers: [power("powder", c2.x + 84, c2.y - 62), power("heart", shelf.x + 94, shelf.y - 110)],
    checkpoints: [{ x: 2220, floor: GROUND, got: false }],
    secret: secret(sky.x + sky.w - 60, sky.y - 120),
    goal: door(4260),
    spawnX: 80,
    slips: [],
    steams: [],
    gusts: [],
    finale: false,
  };
}

/* ------------------------------------------------------------------ */
/*  2. Cucina: olio che scivola, pentole che soffiano                  */
/* ------------------------------------------------------------------ */

function cucina(): Level {
  const w = 4700;
  const shelf1 = plat("bench", 1500, 330, 250);
  const shelf2 = plat("pillow", 3320, 330, 210);
  const top = plat("bench", 3600, 210, 220);
  return {
    index: 1,
    name: "La cucina",
    hint: "L'olio fa scivolare. Le pentole ti sparano in alto!",
    say: "La cucina. Attenta all'olio! Le pentole ti fanno volare.",
    winTitle: "Che profumino!",
    winText: "Fuori dalla cucina!",
    theme: "cucina",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), shelf1, blocks(2080, 60), shelf2, top],
    coins: [
      ...row(240, GROUND - 70, 4),
      ...row(640, GROUND - 60, 5, 60),
      ...arc(1060, GROUND - 80, 1320, GROUND - 80, 4, 110),
      ...arc(1430, 420, 1430, 240, 3, 0),
      ...on(shelf1, 4),
      ...arc(2010, GROUND - 80, 2250, GROUND - 80, 4, 110),
      ...row(2300, GROUND - 60, 5, 64),
      ...arc(3180, 420, 3180, 260, 3, 0),
      ...on(shelf2, 3),
      ...on(top, 3),
      ...arc(3800, GROUND - 80, 4050, GROUND - 80, 4, 110),
      ...row(4200, GROUND - 70, 3),
    ],
    enemies: [foe("tomato", 1000, 1360, 52), foe("sponge", 2720, 3060, 38), foe("tomato", 3780, 4120, 60)],
    powers: [power("powder", shelf1.x + 104, shelf1.y - 64), power("speed", top.x + 30, top.y - 64)],
    checkpoints: [{ x: 1950, floor: GROUND, got: false }],
    secret: secret(top.x + top.w - 70, top.y - 70),
    goal: door(4420),
    spawnX: 80,
    slips: [
      { x: 620, w: 320 },
      { x: 2280, w: 360 },
    ],
    steams: [
      { x: 1430, y: GROUND, phase: 0.4 },
      { x: 3180, y: GROUND, phase: 2.1 },
    ],
    gusts: [],
    finale: false,
  };
}

/* ------------------------------------------------------------------ */
/*  3. Giardino: siepi e annaffiatoi                                    */
/* ------------------------------------------------------------------ */

function giardino(): Level {
  const w = 4700;
  const leaf = plat("mat", 2560, 220, 230);
  const leaf2 = plat("mat", 3330, 360, 200);
  return {
    index: 2,
    name: "Il giardino",
    hint: "Se arriva l'acqua, aspetta. Poi salta la siepe.",
    say: "Il giardino. Quando arriva l'acqua, aspetta un attimo!",
    winTitle: "Che aria fresca!",
    winText: "Si torna in casa!",
    theme: "giardino",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), hedge(700), hedge(1960, 150), spring(2360, 430, 160), leaf, hedge(3000), leaf2, hedge(4000, 140)],
    coins: [
      ...row(220, GROUND - 70, 5),
      ...arc(620, GROUND - 90, 900, GROUND - 90, 5, 120),
      ...row(1060, GROUND - 70, 4, 70),
      ...arc(1880, GROUND - 90, 2180, GROUND - 90, 5, 120),
      ...arc(2380, 390, 2560, 160, 4, 40),
      ...on(leaf, 4),
      ...arc(2920, GROUND - 90, 3200, GROUND - 90, 4, 120),
      ...on(leaf2, 3),
      ...arc(3920, GROUND - 90, 4210, GROUND - 90, 5, 120),
      ...row(4300, GROUND - 70, 2),
    ],
    enemies: [foe("duck", 1460, 1820, 38), foe("sponge", 3170, 3330, 30)],
    powers: [power("heart", leaf2.x + 80, leaf2.y - 110)],
    checkpoints: [{ x: 2240, floor: GROUND, got: false }],
    secret: secret(leaf.x + leaf.w - 56, leaf.y - 120),
    goal: door(4430),
    spawnX: 80,
    slips: [],
    steams: [],
    gusts: [
      { x: 1040, w: 320, y: GROUND, dir: -1, phase: 0.2 },
      { x: 3620, w: 300, y: GROUND, dir: -1, phase: 2.2 },
    ],
    finale: false,
  };
}

/* ------------------------------------------------------------------ */
/*  4. Corridoio: tappeti che si muovono e scale                        */
/* ------------------------------------------------------------------ */

function corridoio(): Level {
  const w = 5200;
  const rug = shuttle("mat", 860, 350, 280, 140, 0.8);
  const steps = flight(1560, 474, 4, 16, 150);
  const glidePad = plat("bench", 2560, 320, 230, false);
  const stones = [plat("pillow", 2940, 372, 180), plat("pillow", 3220, 320, 170), plat("bench", 3480, 282, 180)];
  const elevator = lift("mat", 3960, 350, 220, 84, 0.65);
  const high = plat("bench", 4260, 220, 210);
  return {
    index: 3,
    name: "Il corridoio",
    hint: "Sali sul tappeto che si muove.",
    say: "Il corridoio. Salta sul tappeto volante!",
    winTitle: "Che corsa!",
    winText: "Corridoio finito!",
    theme: "corridoio",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), rug, ...steps, glidePad, ...stones, elevator, high],
    coins: [
      ...row(220, GROUND - 70, 5),
      ...arc(760, 300, 1260, 300, 6, 30),
      ...steps.map((s) => coin(s.x + 60, s.y - 56)),
      ...on(glidePad, 3),
      ...arc(2800, 260, 3000, 300, 3, 30),
      ...stones.flatMap((s) => on(s, 2)),
      ...arc(3980, 250, 4180, 160, 3, 20),
      ...on(high, 3),
      ...row(4600, GROUND - 70, 4),
    ],
    enemies: [foe("roll", 1100, 1460, 44), foe("bubble", 2140, 2520, 30, GROUND, 210), foe("sponge", 3000, 3460, 36), foe("duck", 4480, 4860, 42)],
    powers: [power("glide", glidePad.x + 94, glidePad.y - 64), power("heart", high.x + 30, high.y - 64)],
    checkpoints: [
      { x: 2420, floor: GROUND, got: false },
      { x: 3800, floor: GROUND, got: false },
    ],
    secret: secret(high.x + high.w - 60, high.y - 80),
    goal: door(4960),
    spawnX: 80,
    slips: [],
    steams: [],
    gusts: [],
    finale: false,
  };
}

/* ------------------------------------------------------------------ */
/*  5. Lavanderia: cesti ascensore e calzini veloci                     */
/* ------------------------------------------------------------------ */

function lavanderia(): Level {
  const w = 4900;
  const baskets = [
    basket(700, 400, 210, 80, 0.7, 0),
    basket(1300, 380, 200, 90, 0.85, 1.4),
    basket(1900, 370, 220, 96, 0.75, 2.6),
    basket(2620, 340, 200, 110, 0.7, 0.4),
    basket(3240, 400, 200, 86, 0.8, 0.8),
    basket(3760, 380, 210, 96, 0.7, 2),
  ];
  return {
    index: 4,
    name: "La lavanderia",
    hint: "Salta nel cesto quando è giù.",
    say: "La lavanderia. Salta nei cesti, ti portano in alto!",
    winTitle: "Tutto pulito!",
    winText: "Panni stesi!",
    theme: "lavanderia",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), ...baskets, blocks(2300, 56)],
    coins: [
      ...row(220, GROUND - 70, 5),
      ...baskets.flatMap((b) => [coin(b.x + b.w / 2 - 40, b.y - b.move!.amp - 70), coin(b.x + b.w / 2 + 10, b.y - b.move!.amp - 70)]),
      ...row(1000, GROUND - 70, 3, 70),
      ...arc(2220, GROUND - 80, 2460, GROUND - 80, 4, 110),
      ...row(2950, GROUND - 70, 4, 60),
      ...row(4300, GROUND - 70, 4),
    ],
    enemies: [foe("sock", 960, 1520, 74), foe("sock", 2420, 2980, 82), foe("bubble", 3960, 4380, 28, GROUND, 230)],
    powers: [power("glide", 1980, 370 - 96 - 70), power("heart", 3820, 380 - 96 - 70)],
    checkpoints: [{ x: 2140, floor: GROUND, got: false }],
    secret: secret(2700, 340 - 110 - 150),
    goal: door(4640),
    spawnX: 80,
    slips: [],
    steams: [],
    gusts: [],
    finale: false,
  };
}

/* ------------------------------------------------------------------ */
/*  6. Cameretta: letti che fanno rimbalzare                            */
/* ------------------------------------------------------------------ */

function cameretta(): Level {
  const w = 4900;
  const bed = spring(520, 418, 220);
  const bed2 = spring(1040, 400, 200);
  const blanket = shuttle("mat", 1820, 340, 280, 130, 0.7);
  const night = [plat("pillow", 2640, 360, 190), plat("bench", 3040, 300, 210), plat("pillow", 3440, 360, 180)];
  const bed3 = spring(3760, 420, 180);
  const dream = plat("pillow", 3960, 170, 220);
  return {
    index: 5,
    name: "La cameretta",
    hint: "I letti fanno saltare in alto!",
    say: "La cameretta. Salta sui letti, si vola!",
    winTitle: "Che salti!",
    winText: "Shhh, si continua!",
    theme: "cameretta",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), bed, bed2, blanket, ...night, bed3, dream],
    coins: [
      ...row(200, GROUND - 70, 5),
      ...arc(560, 360, 940, 260, 5, 90),
      ...arc(1080, 340, 1500, 300, 5, 120),
      ...arc(1700, 280, 2240, 280, 6, 24),
      ...night.flatMap((s) => on(s, 2)),
      ...arc(3780, 380, 3960, 130, 3, 30),
      ...on(dream, 4),
      ...row(4400, GROUND - 70, 3),
    ],
    enemies: [foe("slipper", 1340, 1720, 40), foe("bubble", 2440, 3000, 28, GROUND, 200), foe("slipper", 4220, 4520, 40)],
    powers: [power("glide", night[1]!.x + 84, night[1]!.y - 64), power("heart", 1180, 200)],
    checkpoints: [{ x: 2480, floor: GROUND, got: false }],
    secret: secret(dream.x + dream.w - 60, dream.y - 90),
    goal: door(4640),
    spawnX: 80,
    slips: [],
    steams: [],
    gusts: [],
    finale: false,
  };
}

/* ------------------------------------------------------------------ */
/*  7. Terrazzo: bolle di sapone che scoppiano                          */
/* ------------------------------------------------------------------ */

function terrazzo(): Level {
  const w = 5000;
  const g1 = [bubbleStep(820, 400, 0), bubbleStep(1080, 340, 1.1), bubbleStep(1340, 280, 2.2), bubbleStep(1600, 340, 0.4)];
  const bench = plat("bench", 2000, 420, 240, false);
  const g2 = [bubbleStep(2640, 390, 1.8), bubbleStep(2900, 320, 0.6), bubbleStep(3160, 250, 2.8), bubbleStep(3420, 320, 1.3)];
  const tramp = spring(3820, 420, 170);
  return {
    index: 6,
    name: "Il terrazzo",
    hint: "Le bolle scoppiano: salta presto sulla prossima!",
    say: "Il terrazzo. Salta sulle bolle prima che scoppino!",
    winTitle: "Che vista!",
    winText: "Manca solo il bagno!",
    theme: "terrazzo",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), ...g1, bench, ...g2, tramp],
    coins: [
      ...row(220, GROUND - 70, 5),
      ...g1.flatMap((s) => on(s, 2, 56)),
      ...on(bench, 3),
      ...g2.flatMap((s) => on(s, 2, 56)),
      ...arc(3840, 380, 4220, 300, 6, 200),
      ...row(4400, GROUND - 70, 4),
    ],
    enemies: [foe("duck", 2300, 2620, 38), foe("tomato", 3560, 3760, 40), foe("duck", 4100, 4500, 40)],
    powers: [power("powder", bench.x + 100, bench.y - 64)],
    checkpoints: [{ x: 1900, floor: GROUND, got: false }],
    secret: secret(g2[2]!.x + 72, g2[2]!.y - 130),
    goal: door(4740),
    spawnX: 80,
    slips: [],
    steams: [],
    gusts: [],
    finale: false,
  };
}

/* ------------------------------------------------------------------ */
/*  8. Bagno: tre rampe e la porta giusta                               */
/* ------------------------------------------------------------------ */

function bagno(): Level {
  const w = 5300;
  const a = flight(360, 478, 5, 18, 148);
  const landA = a[a.length - 1]!;
  const padA: Solid = { x: landA.x + landA.w - 10, y: landA.y, w: 460, h: 42, kind: "mat", oneWay: false };
  const b = flight(padA.x + padA.w + 20, padA.y, 5, 18, 146);
  const landB = b[b.length - 1]!;
  const padB: Solid = { x: landB.x + landB.w - 8, y: landB.y, w: 520, h: 44, kind: "bench", oneWay: false };
  const tramp = spring(padB.x + 70, padB.y - 52, 150);
  const c = flight(padB.x + padB.w + 16, padB.y, 4, 16, 150);
  const landC = c[c.length - 1]!;
  const topY = landC.y;
  const high: Solid = { x: landC.x + landC.w - 12, y: topY, w: 1700, h: 48, kind: "mat", oneWay: false };
  return {
    index: 7,
    name: "Il bagno",
    hint: "Su per le scale! In cima c'è il bagno.",
    say: "Il bagno! Su per le scale, ci siamo quasi!",
    winTitle: "Che sollievo!",
    winText: "Orso Borotalco ce l'ha fatta!",
    theme: "bagno",
    w,
    h: H,
    groundY: GROUND,
    solids: [ground(w), ...a, padA, ...b, padB, tramp, ...c, high],
    coins: [
      ...row(120, GROUND - 70, 4),
      ...a.map((s) => coin(s.x + 40, s.y - 54)),
      ...b.map((s) => coin(s.x + 40, s.y - 54)),
      ...c.map((s) => coin(s.x + 40, s.y - 54)),
      coin(padA.x + 300, padA.y - 56),
      coin(padA.x + 360, padA.y - 56),
      ...arc(padB.x + 120, padB.y - 90, padB.x + 440, padB.y - 160, 5, 120),
      ...row(high.x + 160, topY - 58, 3, 54),
      ...row(high.x + 700, topY - 58, 3, 54),
      ...row(high.x + 1180, topY - 58, 3, 54),
    ],
    enemies: [
      foe("duck", padA.x + 90, padA.x + padA.w - 80, 34, padA.y),
      foe("bubble", high.x + 300, high.x + 900, 30, topY, topY - 140),
      foe("sponge", high.x + 940, high.x + 1120, 36, topY),
    ],
    powers: [
      power("speed", padA.x + 200, padA.y - 62),
      power("heart", padB.x + 330, padB.y - 64),
      power("powder", high.x + 560, topY - 64),
    ],
    checkpoints: [
      { x: padA.x + 60, floor: padA.y, got: false },
      { x: high.x + 120, floor: topY, got: false },
    ],
    secret: secret(tramp.x + 50, padB.y - 270),
    goal: door(high.x + high.w - 240, topY),
    spawnX: 80,
    slips: [],
    steams: [],
    gusts: [],
    finale: true,
  };
}
