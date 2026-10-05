import { createLevel } from "@/game/levels";
import { PH, PW } from "@/game/types";
import type { Flyer, Input, Level, Particle, ParticleShape, Player, PowerKind, Rect, Solid, StepEvents } from "@/game/types";

const GRAV_UP = 1120;
const GRAV_DOWN = 1580;
const GRAV_APEX = 480;
const JUMP = -680;
const JUMP_POWDER = -800;
const MAX_FALL = 620;
const RUN = 145;
const FAST = 205;
/** Camminata automatica: andatura dolce, tranquilla e pacioccona per una bimba di 5 anni. */
const AUTO_WALK = 115;
const STEP_UP = 38;
/** Distanza a cui l'orso si ferma da solo davanti a un nemico (solo camminata automatica). */
const CAUTION = 110;
const INTRO = 1.5;

type SimState = {
  levelIndex: number;
  name: string;
  hint: string;
  say: string;
  winTitle: string;
  winText: string;
  theme: Level["theme"];
  w: number;
  h: number;
  groundY: number;
  solids: Level["solids"];
  coins: Level["coins"];
  enemies: Level["enemies"];
  powers: Level["powers"];
  checkpoints: Level["checkpoints"];
  secret: Level["secret"];
  goal: Rect;
  slips: Level["slips"];
  steams: Level["steams"];
  gusts: Level["gusts"];
  finaleLevel: boolean;
  finale: number;
  player: Player;
  particles: Particle[];
  flyers: Flyer[];
  t: number;
  intro: number;
  shake: number;
  gentle: boolean;
  nextHeart: number;
  won: boolean;
  hurts: number;
};

export type Sim = SimState;

function emptyEvents(): StepEvents {
  return {
    jump: false,
    coins: 0,
    combo: 0,
    stomp: false,
    hurt: false,
    heal: false,
    power: null,
    checkpoint: false,
    win: false,
    nap: false,
    fall: false,
    bounce: false,
    bump: false,
    secret: false,
    steam: false,
  };
}

function hit(ax: number, ay: number, aw: number, ah: number, b: Rect, pad = 0) {
  return ax < b.x + b.w + pad && ax + aw > b.x - pad && ay < b.y + b.h + pad && ay + ah > b.y - pad;
}

export function puff(
  sim: SimState,
  x: number,
  y: number,
  color: string,
  n: number,
  speed: number,
  shape: ParticleShape = "dot",
  size = 1,
) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.8);
    const life = 0.45 + Math.random() * 0.45;
    sim.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 40,
      life,
      max: life,
      r: (3 + Math.random() * 4) * size,
      color,
      shape,
      spin: (Math.random() - 0.5) * 8,
      grav: shape === "bubble" ? -60 : shape === "ring" ? 0 : 300,
    });
  }
  if (sim.particles.length > 220) sim.particles.splice(0, sim.particles.length - 220);
}

function ring(sim: SimState, x: number, y: number, color: string, r = 10) {
  sim.particles.push({ x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, r, color, shape: "ring", spin: 0, grav: 0 });
}

export function solidOn(s: { pop?: { period: number; open: number; phase: number } }, t: number) {
  if (!s.pop) return true;
  const u = (((t + s.pop.phase) % s.pop.period) + s.pop.period) % s.pop.period;
  return u < s.pop.open;
}

export function gustOn(phase: number, t: number) {
  return Math.sin(t * 1.35 + phase) > 0.15;
}

export function steamOn(phase: number, t: number) {
  return Math.sin(t * 2.1 + phase) > 0.45;
}

function updateMovers(sim: SimState) {
  const p = sim.player;
  for (const s of sim.solids) {
    const m = s.move;
    if (!m) continue;
    const prevX = s.x;
    const prevY = s.y;
    const wave = Math.sin(sim.t * m.speed + m.phase);
    if (m.axis === "x") s.x = m.origin + wave * m.amp;
    else s.y = m.origin + wave * m.amp;
    const feet = p.y + PH;
    const standing =
      solidOn(s, sim.t) &&
      p.grounded &&
      feet <= prevY + 8 &&
      feet >= prevY - 12 &&
      p.x + PW > prevX + 2 &&
      p.x < prevX + s.w - 2;
    if (standing) {
      p.x += s.x - prevX;
      p.y += s.y - prevY;
    }
  }
}

function updateParticles(sim: SimState, dt: number) {
  for (const p of sim.particles) {
    p.life -= dt;
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.shape === "ring") p.r += 90 * dt;
  }
  if (sim.particles.some((p) => p.life <= 0)) {
    sim.particles = sim.particles.filter((p) => p.life > 0);
  }
  for (const f of sim.flyers) f.t += dt;
  if (sim.flyers.some((f) => f.t > 0.7)) sim.flyers = sim.flyers.filter((f) => f.t <= 0.7);
  for (const s of sim.solids) if (s.squish) s.squish = Math.max(0, s.squish - dt);
}

function grantStar(sim: SimState, events: StepEvents) {
  sim.player.stars += 1;
  if (sim.player.stars >= sim.nextHeart) {
    sim.nextHeart += 10;
    if (sim.player.hearts < 5) {
      sim.player.hearts += 1;
      events.heal = true;
      puff(sim, sim.player.x + PW / 2, sim.player.y, "#f48fb1", 6, 90, "heart", 1.4);
    }
  }
}

function updateEnemies(sim: SimState, dt: number) {
  for (const e of sim.enemies) {
    if (e.fade > 0) {
      e.fade -= dt;
      if (e.fade <= 0) e.fade = -1;
      continue;
    }
    e.stun = Math.max(0, e.stun - dt);
    e.bump = Math.max(0, e.bump - dt);
    e.phase += dt;
    const push = e.bump > 0 ? e.dir * 110 * dt : 0;
    if (e.kind === "bubble") {
      if (e.stun <= 0) {
        e.x += e.dir * e.speed * dt + push;
        if (e.x < e.minX) {
          e.x = e.minX;
          e.dir = 1;
        } else if (e.x > e.maxX) {
          e.x = e.maxX;
          e.dir = -1;
        }
      }
      e.y = e.homeY + Math.sin(e.phase * 2.1) * 26;
      continue;
    }
    if (e.stun > 0) {
      e.vy = 0;
      e.y = e.floor - e.h;
      continue;
    }
    if (e.kind === "duck" || e.kind === "slipper") {
      e.hop += dt;
      e.vy = Math.min(720, e.vy + 2400 * dt);
      e.y += e.vy * dt;
      const gy = e.floor - e.h;
      if (e.y >= gy) {
        e.y = gy;
        e.vy = 0;
        if (e.hop > (e.kind === "slipper" ? 1.25 : 1.55)) {
          e.vy = e.kind === "slipper" ? -440 : -340;
          e.hop = 0;
        }
      }
    } else {
      e.y = e.floor - e.h;
    }
    e.x += e.dir * e.speed * dt + push;
    if (e.x < e.minX) {
      e.x = e.minX;
      e.dir = 1;
    } else if (e.x > e.maxX) {
      e.x = e.maxX;
      e.dir = -1;
    }
  }
  if (sim.enemies.some((e) => e.fade < 0)) sim.enemies = sim.enemies.filter((e) => e.fade >= 0);
}

function resolveX(sim: SimState, x: number) {
  const p = sim.player;
  let blocked = false;
  for (const s of sim.solids) {
    if (!solidOn(s, sim.t)) continue;
    if (s.oneWay) continue;
    if (!hit(x, p.y, PW, PH, s)) continue;

    // Gradino superabile solo se si cammina (a terra e non in volo)
    const rise = p.y + PH - s.y;
    if (rise > 0 && rise <= STEP_UP && p.grounded && p.vy >= 0) {
      p.y -= rise;
      continue;
    }

    if (p.vx > 0) x = Math.min(x, s.x - PW);
    else if (p.vx < 0) x = Math.max(x, s.x + s.w);
    else {
      const penL = x + PW - s.x;
      const penR = s.x + s.w - x;
      x += penL < penR ? -penL : penR;
    }
    p.vx = 0;
    blocked = true;
  }
  if (x < 0) {
    x = 0;
    p.vx = 0;
  }
  const maxX = sim.w - PW;
  if (x > maxX) {
    x = maxX;
    p.vx = 0;
  }
  return { x, blocked };
}

function resolveY(sim: SimState, y: number, prevY: number, prevVy: number) {
  const p = sim.player;
  const prevBottom = prevY + PH;
  const prevTop = prevY;
  let grounded = false;
  let bounced: Solid | null = null;

  for (const s of sim.solids) {
    if (!solidOn(s, sim.t)) continue;
    if (!hit(p.x, y, PW, PH, s)) continue;

    if (s.oneWay) {
      if (p.drop > 0 || p.vy < 0 || prevBottom > s.y + 4) continue;
      y = s.y - PH;
      if (s.bounce && prevVy > 70) bounced = s;
      else p.vy = 0;
      grounded = true;
      continue;
    }

    // Ostacoli solidi (cubi, siepi, pavimento, piattaforme)
    const isFalling = p.vy >= 0;
    const wasAbove = prevBottom <= s.y + 14;
    const restsOnGround = s.y + s.h >= sim.groundY;

    // Se l'ostacolo poggia sul pavimento o l'orso sta atterrando/viene dall'alto: atterra sopra
    if (isFalling || wasAbove || restsOnGround) {
      y = s.y - PH;
      if (s.bounce && prevVy > 70) bounced = s;
      else p.vy = 0;
      grounded = true;
    } else if (p.vy < 0 && prevTop >= s.y + s.h - 6 && !restsOnGround) {
      // Ha battuto la testa da sotto su una piattaforma sospesa
      y = s.y + s.h;
      p.vy = 0;
    } else {
      // Fallback sicuro: atterra in cima, non spingere mai sotto terra
      y = s.y - PH;
      p.vy = 0;
      grounded = true;
    }
  }

  // Barriera invalicabile: l'orso non può mai sprofondare sotto il pavimento se c'è terra sotto di lui
  if (sim.groundY && y > sim.groundY - PH && p.x >= 0 && p.x <= sim.w) {
    const hasGround = sim.solids.some((s) => s.kind === "ground" && p.x + PW > s.x && p.x < s.x + s.w);
    if (hasGround) {
      y = sim.groundY - PH;
      p.vy = 0;
      grounded = true;
    }
  }

  return { y, grounded, bounced };
}

/** L'orso in camminata automatica deve fermarsi? (nemico davanti o getto d'acqua acceso). */
function shouldWait(sim: SimState) {
  const p = sim.player;
  const front = p.x + PW;
  for (const e of sim.enemies) {
    if (e.fade !== 0) continue;
    const gap = e.x - front;
    if (gap < -8 || gap > CAUTION) continue;
    if (e.y > p.y + PH || e.y + e.h < p.y - 30) continue;
    return true;
  }
  const mid = p.x + PW / 2;
  for (const g of sim.gusts) {
    if (!gustOn(g.phase, sim.t)) continue;
    if (mid > g.x - 80 && mid < g.x + 10 && Math.abs(p.y + PH - g.y) < 36) return true;
  }
  return false;
}

export function createSim(index: number): SimState {
  const level = createLevel(index);
  const spawnY = level.groundY - PH;
  const player: Player = {
    x: level.spawnX,
    y: spawnY,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    coyote: 0.12,
    buffer: 0,
    jumpCut: false,
    hearts: 5,
    stars: 0,
    invuln: 0,
    powder: 0,
    glide: 0,
    speed: 0,
    drop: 0,
    spawnX: level.spawnX,
    spawnY,
    anim: 0,
    land: 0,
    nap: 0,
    wait: 0,
    combo: 0,
    comboT: 0,
    happy: 0,
  };
  return {
    levelIndex: level.index,
    name: level.name,
    hint: level.hint,
    say: level.say,
    winTitle: level.winTitle,
    winText: level.winText,
    theme: level.theme,
    w: level.w,
    h: level.h,
    groundY: level.groundY,
    solids: level.solids,
    coins: level.coins,
    enemies: level.enemies,
    powers: level.powers,
    checkpoints: level.checkpoints,
    secret: level.secret,
    goal: level.goal,
    slips: level.slips,
    steams: level.steams,
    gusts: level.gusts,
    finaleLevel: level.finale,
    finale: 0,
    player,
    particles: [],
    flyers: [],
    t: 0,
    intro: INTRO,
    shake: 0,
    gentle: false,
    nextHeart: 10,
    won: false,
    hurts: 0,
  };
}

export function step(sim: SimState, input: Input, dt: number): StepEvents {
  const events = emptyEvents();
  const p = sim.player;
  sim.t += dt;
  sim.shake = Math.max(0, sim.shake - dt * 30);
  p.anim += dt;
  p.land = Math.max(0, p.land - dt);
  p.happy = Math.max(0, p.happy - dt);

  if (sim.intro > 0) {
    sim.intro -= dt;
    updateParticles(sim, dt);
    return events;
  }

  if (p.nap > 0) {
    p.nap -= dt;
    p.vx = 0;
    p.vy = 0;
    if (p.nap <= 0) {
      p.x = p.spawnX;
      p.y = p.spawnY;
      p.hearts = 5;
      p.invuln = 2;
      p.grounded = true;
      p.powder = Math.max(p.powder, 1.5);
      puff(sim, p.x + PW / 2, p.y + PH / 2, "#ffffff", 12, 110, "star");
    }
    updateParticles(sim, dt);
    return events;
  }

  if (sim.won) {
    p.vx = 0;
    updateParticles(sim, dt);
    updateEnemies(sim, dt);
    return events;
  }

  if (sim.finale > 0) {
    sim.finale -= dt;
    const doorX = sim.goal.x + 24;
    p.facing = 1;
    p.grounded = true;
    p.vy = 0;
    p.vx = 90;
    if (p.x < doorX) p.x = Math.min(doorX, p.x + 90 * dt);
    if (sim.finale < 0.85 && sim.finale + dt >= 0.85) {
      puff(sim, sim.goal.x + 60, sim.goal.y + 40, "#fff6ea", 14, 90, "bubble", 1.4);
      puff(sim, sim.goal.x + 70, sim.goal.y + 20, "#f5c542", 10, 140, "star", 1.3);
    }
    if (sim.finale <= 0) {
      sim.finale = 0;
      sim.won = true;
      events.win = true;
    }
    updateParticles(sim, dt);
    return events;
  }

  p.invuln = Math.max(0, p.invuln - dt);
  p.powder = Math.max(0, p.powder - dt);
  p.glide = Math.max(0, p.glide - dt);
  p.speed = Math.max(0, p.speed - dt);
  p.drop = Math.max(0, p.drop - dt);
  p.wait = Math.max(0, p.wait - dt);
  p.comboT = Math.max(0, p.comboT - dt);
  if (p.comboT <= 0) p.combo = 0;

  const wasGrounded = p.grounded;
  if (wasGrounded) p.coyote = 0.14;
  else p.coyote = Math.max(0, p.coyote - dt);
  if (input.jumpPressed) p.buffer = 0.18;
  else p.buffer = Math.max(0, p.buffer - dt);
  if (input.down && wasGrounded) p.drop = 0.28;

  updateMovers(sim);

  let ix = input.x;
  if (input.auto && ix > 0 && wasGrounded && p.buffer <= 0 && shouldWait(sim)) {
    ix = 0;
    p.wait = 0.3;
  }

  if (ix < 0) p.facing = -1;
  else if (ix > 0) p.facing = 1;

  const mid = p.x + PW / 2;
  const sliding =
    wasGrounded &&
    Math.abs(p.y + PH - sim.groundY) < 28 &&
    sim.slips.some((s) => mid > s.x && mid < s.x + s.w);
  const cap = p.speed > 0 ? FAST : input.auto ? AUTO_WALK : RUN;
  const targetVx = ix * cap;

  if (sliding) {
    if (ix !== 0) {
      p.vx += ix * 280 * dt;
      p.vx = Math.max(-cap, Math.min(cap, p.vx));
    } else {
      p.vx *= Math.max(0, 1 - 0.35 * dt);
    }
  } else if (ix !== 0) {
    const accel = wasGrounded ? 2200 : 1400;
    if (p.vx < targetVx) {
      p.vx = Math.min(targetVx, p.vx + accel * dt);
    } else if (p.vx > targetVx) {
      p.vx = Math.max(targetVx, p.vx - accel * dt);
    }
  } else if (wasGrounded) {
    const f = 2000 * dt;
    if (Math.abs(p.vx) <= f) p.vx = 0;
    else p.vx -= Math.sign(p.vx) * f;
  } else {
    p.vx *= Math.max(0, 1 - 0.7 * dt);
  }

  let gustDir = 0;
  for (const gust of sim.gusts) {
    if (!gustOn(gust.phase, sim.t) || !wasGrounded) continue;
    if (mid < gust.x || mid > gust.x + gust.w) continue;
    if (Math.abs(p.y + PH - gust.y) > 36) continue;
    gustDir = gust.dir;
  }
  if (gustDir !== 0) p.vx = gustDir * 150;

  if (p.buffer > 0 && (wasGrounded || p.coyote > 0)) {
    p.vy = p.powder > 0 ? JUMP_POWDER : JUMP;
    p.grounded = false;
    p.coyote = 0;
    p.buffer = 0;
    p.jumpCut = true;
    p.wait = 0;
    events.jump = true;
    puff(sim, p.x + PW / 2, p.y + PH, "#fff3e6", 4, 60);
  }

  let g = p.vy < 0 ? GRAV_UP : GRAV_DOWN;
  if (Math.abs(p.vy) < 110) g = GRAV_APEX;
  if (p.glide > 0 && input.jumpHeld && p.vy > 0) g = 220;
  p.vy = Math.min(MAX_FALL, p.vy + g * dt);
  if (p.jumpCut && !input.jumpHeld && p.vy < 0) {
    p.vy *= 0.5;
    p.jumpCut = false;
  }
  if (p.glide > 0 && input.jumpHeld && p.vy > 55) p.vy = 55;

  const movedX = resolveX(sim, p.x + p.vx * dt);
  p.x = movedX.x;
  if (movedX.blocked && input.auto && ix > 0 && wasGrounded) p.wait = 0.3;

  const yBefore = p.y;
  const prevVy = p.vy;
  const moved = resolveY(sim, p.y + p.vy * dt, yBefore, prevVy);
  p.y = moved.y;
  p.grounded = moved.grounded && !moved.bounced;
  if (moved.bounced) {
    p.vy = p.powder > 0 ? -1080 : -980;
    p.grounded = false;
    p.jumpCut = false;
    p.coyote = 0;
    moved.bounced.squish = 0.4;
    events.bounce = true;
    if (!sim.gentle) sim.shake = Math.max(sim.shake, 3);
    puff(sim, p.x + PW / 2, p.y + PH, "#9ed9c8", 8, 120, "star", 0.9);
  }
  if (!wasGrounded && p.grounded && prevVy > 240) {
    p.land = 0.12;
    puff(sim, p.x + PW / 2, p.y + PH, "#f6e3d4", 5, 60);
  }
  if (p.grounded) p.jumpCut = false;

  if (wasGrounded && p.grounded && Math.abs(p.vx) > 30) {
    if (Math.random() < dt * 5) {
      sim.particles.push({
        x: p.x + PW / 2 - p.facing * 12,
        y: p.y + PH - 3,
        vx: 0,
        vy: 0,
        life: 2.8,
        max: 2.8,
        r: 5.5,
        color: p.powder > 0 ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 246, 236, 0.65)",
        shape: "paw",
        spin: 0,
        grav: 0,
      });
    }
  }
  if (p.powder > 0 && Math.random() < dt * 16) {
    puff(sim, p.x + PW / 2, p.y + 20, "#ffffff", 1, 40, Math.random() < 0.3 ? "star" : "dot");
  }
  if (p.speed > 0 && p.grounded && Math.abs(p.vx) > 130 && Math.random() < dt * 20) {
    puff(sim, p.x + PW / 2 - p.facing * 20, p.y + PH - 10, "#bfe6ff", 1, 30);
  }

  updateEnemies(sim, dt);

  const prevBottom = yBefore + PH;
  const still = Math.abs(p.vx) < 40 && p.grounded;
  for (const e of sim.enemies) {
    if (e.fade !== 0) continue;
    if (!hit(p.x + 4, p.y, PW - 8, PH, e)) continue;
    const stomp = p.vy > 0 && prevBottom <= e.y + 26;
    if (stomp || p.powder > 0) {
      if (stomp) {
        p.vy = input.jumpHeld ? -620 : -480;
        p.grounded = false;
        p.jumpCut = false;
      }
      e.fade = 0.42;
      events.stomp = true;
      p.happy = 0.8;
      if (!sim.gentle) sim.shake = Math.max(sim.shake, 3);
      puff(sim, e.x + e.w / 2, e.y + e.h / 2, "#fff6ea", 10, 150, "star", 1.1);
      ring(sim, e.x + e.w / 2, e.y + e.h / 2, "#ffffff", 14);
      continue;
    }
    // Gentilezza: se l'orso è fermo che aspetta, il nemico rimbalza indietro senza fargli male.
    if ((input.auto && still) || p.wait > 0) {
      e.dir = e.x + e.w / 2 > p.x + PW / 2 ? 1 : -1;
      e.bump = 0.35;
      events.bump = true;
      continue;
    }
    if (p.invuln <= 0) {
      p.hearts -= 1;
      sim.hurts += 1;
      p.invuln = 2.2; // Più tempo di sicurezza per la bambina
      p.vx = p.x + PW / 2 < e.x + e.w / 2 ? -130 : 130; // Rimbalzo morbido
      p.vy = -260;
      p.grounded = false;
      events.hurt = true;
      if (!sim.gentle) sim.shake = Math.max(sim.shake, 4);
      puff(sim, p.x + PW / 2, p.y + 16, "#f4b6c8", 8, 90, "heart");
      e.dir = e.x + e.w / 2 > p.x + PW / 2 ? 1 : -1;
      e.bump = 0.4;
      if (p.hearts <= 0) {
        p.hearts = 0;
        p.nap = 1.3;
        events.nap = true;
      }
    }
  }

  for (const c of sim.coins) {
    if (c.got) continue;
    if (!hit(p.x, p.y, PW, PH, c, 12)) continue;
    c.got = true;
    events.coins += 1;
    p.combo = Math.min(12, p.combo + 1);
    p.comboT = 0.7;
    events.combo = p.combo;
    grantStar(sim, events);
    sim.flyers.push({ x: c.x + 15, y: c.y + 15, t: 0 });
    puff(sim, c.x + 15, c.y + 15, "#f5c542", 5, 100, "star", 0.7);
  }

  if (sim.secret && !sim.secret.got && hit(p.x, p.y, PW, PH, sim.secret, 8)) {
    sim.secret.got = true;
    events.secret = true;
    p.happy = 1.2;
    const sx = sim.secret.x + sim.secret.w / 2;
    const sy = sim.secret.y + sim.secret.h / 2;
    puff(sim, sx, sy, "#f5c542", 18, 200, "star", 1.4);
    puff(sim, sx, sy, "#ffffff", 10, 140, "star", 1);
    ring(sim, sx, sy, "#f5c542", 20);
  }

  for (const item of sim.powers) {
    if (item.got) continue;
    if (!hit(p.x, p.y, PW, PH, item, 8)) continue;
    item.got = true;
    events.power = item.kind;
    if (item.kind === "powder") p.powder = 9;
    else if (item.kind === "glide") p.glide = 14;
    else if (item.kind === "speed") p.speed = 9;
    else if (p.hearts < 5) p.hearts += 1;
    else grantStar(sim, events);
    p.happy = 0.6;
    puff(sim, item.x + 20, item.y + 20, item.kind === "heart" ? "#f48fb1" : "#ffffff", 12, 130, item.kind === "heart" ? "heart" : "star");
    ring(sim, item.x + 21, item.y + 21, "#ffffff", 16);
  }

  for (const vent of sim.steams) {
    if (!steamOn(vent.phase, sim.t)) continue;
    const over = p.x + PW > vent.x - 28 && p.x < vent.x + 36 && p.y + PH > vent.y - 70 && p.y + PH < vent.y + 16;
    if (over && p.vy > -180) {
      p.vy = -720;
      p.grounded = false;
      p.jumpCut = false;
      events.steam = true;
      puff(sim, vent.x, vent.y - 20, "#fffaf3", 6, 80, "bubble");
    }
  }

  for (const cp of sim.checkpoints) {
    if (cp.got) continue;
    if (p.x + PW > cp.x && p.y + PH > cp.floor - 80 && p.y < cp.floor) {
      cp.got = true;
      p.spawnX = cp.x;
      p.spawnY = cp.floor - PH;
      events.checkpoint = true;
      p.happy = 0.6;
      if (p.hearts < 5) {
        p.hearts = 5;
        events.heal = true;
      }
      puff(sim, cp.x, cp.floor - 70, "#ffe08a", 12, 120, "star");
    }
  }

  if (p.y > sim.h + 40) {
    p.x = p.spawnX;
    p.y = p.spawnY;
    p.vx = 0;
    p.vy = 0;
    p.invuln = 1;
    p.grounded = true;
    events.fall = true;
  }

  if (!sim.won && sim.finale <= 0 && hit(p.x, p.y, PW, PH, sim.goal, 4)) {
    if (sim.finaleLevel) {
      sim.finale = 2.4;
      p.vx = 90;
    } else {
      sim.won = true;
      events.win = true;
      p.happy = 3;
      puff(sim, sim.goal.x + 65, sim.goal.y + 40, "#f5c542", 18, 180, "star", 1.2);
      puff(sim, sim.goal.x + 65, sim.goal.y + 80, "#ffffff", 12, 140, "bubble", 1.2);
    }
  }

  updateParticles(sim, dt);
  return events;
}

export function coinTotal(sim: SimState) {
  return sim.coins.length;
}

export function coinsLeft(sim: SimState) {
  let n = 0;
  for (const c of sim.coins) if (!c.got) n += 1;
  return n;
}

/** Valutazione a 3 stelle: arrivare, raccogliere quasi tutte le stelline, trovare la paperella. */
export function rating(sim: SimState) {
  const total = coinTotal(sim);
  const got = total - coinsLeft(sim);
  let r = 1;
  if (total === 0 || got / total >= 0.8) r += 1;
  if (sim.secret?.got) r += 1;
  return r;
}

export const powerLabel: Record<PowerKind, string> = {
  powder: "Nuvoletta di borotalco!",
  glide: "Ciambella: tieni premuto per volare.",
  speed: "Spazzolino turbo!",
  heart: "Un cuoricino in più!",
};
