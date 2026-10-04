import { createLevel } from "@/game/levels";
import { PH, PW } from "@/game/types";
import type { Input, Level, Particle, Player, PowerKind, Rect, StepEvents } from "@/game/types";

const GRAV_UP = 1380;
const GRAV_DOWN = 2500;
const GRAV_APEX = 680;
const JUMP = -820;
const JUMP_POWDER = -960;
const MAX_FALL = 820;
const RUN = 250;
const FAST = 372;
const STEP_UP = 38;

type SimState = {
  levelIndex: number;
  name: string;
  hint: string;
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
  goal: Rect;
  player: Player;
  particles: Particle[];
  t: number;
  shake: number;
  gentle: boolean;
  nextHeart: number;
  won: boolean;
};

export type Sim = SimState;

function emptyEvents(): StepEvents {
  return {
    jump: false,
    coins: 0,
    stomp: false,
    hurt: false,
    heal: false,
    power: null,
    checkpoint: false,
    win: false,
    nap: false,
    fall: false,
  };
}

function hit(ax: number, ay: number, aw: number, ah: number, b: Rect, pad = 0) {
  return ax < b.x + b.w + pad && ax + aw > b.x - pad && ay < b.y + b.h + pad && ay + ah > b.y - pad;
}

function puff(sim: SimState, x: number, y: number, color: string, n: number, speed: number) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.8);
    sim.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 30,
      life: 0.35 + Math.random() * 0.35,
      max: 0.7,
      r: 3 + Math.random() * 4,
      color,
    });
  }
  if (sim.particles.length > 120) sim.particles.splice(0, sim.particles.length - 120);
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
    p.vy += 280 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  if (sim.particles.some((p) => p.life <= 0)) {
    sim.particles = sim.particles.filter((p) => p.life > 0);
  }
}

function grantStar(sim: SimState, events: StepEvents) {
  sim.player.stars += 1;
  if (sim.player.stars >= sim.nextHeart) {
    sim.nextHeart += 10;
    if (sim.player.hearts < 5) {
      sim.player.hearts += 1;
      events.heal = true;
      puff(sim, sim.player.x + PW / 2, sim.player.y, "#f4b6c8", 8, 90);
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
    e.phase += dt;
    if (e.kind === "bubble") {
      if (e.stun <= 0) {
        e.x += e.dir * e.speed * dt;
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
    if (e.kind === "duck") {
      e.hop += dt;
      e.vy = Math.min(720, e.vy + 2400 * dt);
      e.y += e.vy * dt;
      const gy = e.floor - e.h;
      if (e.y >= gy) {
        e.y = gy;
        e.vy = 0;
        if (e.hop > 1.55) {
          e.vy = -350;
          e.hop = 0;
        }
      }
    } else {
      e.y = e.floor - e.h;
    }
    e.x += e.dir * e.speed * dt;
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
  for (const s of sim.solids) {
    if (s.oneWay) continue;
    if (!hit(x, p.y, PW, PH, s)) continue;
    const rise = p.y + PH - s.y;
    if (rise > 0 && rise <= STEP_UP + 6 && p.y < s.y) {
      if (p.vy >= 0) p.y -= rise;
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
  return x;
}

function resolveY(sim: SimState, y: number, prevBottom: number, prevVy: number) {
  const p = sim.player;
  let grounded = false;
  let bounced = false;
  for (const s of sim.solids) {
    if (!hit(p.x, y, PW, PH, s)) continue;
    if (s.oneWay) {
      if (p.drop > 0 || p.vy < 0 || prevBottom > s.y + 1) continue;
    }
    if (p.vy > 0 || prevBottom <= s.y + 2) {
      y = s.y - PH;
      if (s.bounce && prevVy > 70) bounced = true;
      else p.vy = 0;
      grounded = true;
    } else {
      y = s.y + s.h;
      p.vy = 0;
    }
  }
  return { y, grounded, bounced };
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
  };
  return {
    levelIndex: level.index,
    name: level.name,
    hint: level.hint,
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
    goal: level.goal,
    player,
    particles: [],
    t: 0,
    shake: 0,
    gentle: false,
    nextHeart: 10,
    won: false,
  };
}

export function step(sim: SimState, input: Input, dt: number): StepEvents {
  const events = emptyEvents();
  const p = sim.player;
  sim.t += dt;
  sim.shake = Math.max(0, sim.shake - dt * 30);
  p.anim += dt;
  p.land = Math.max(0, p.land - dt);

  if (p.nap > 0) {
    p.nap -= dt;
    p.vx = 0;
    p.vy = 0;
    if (p.nap <= 0) {
      p.x = p.spawnX;
      p.y = p.spawnY;
      p.hearts = 5;
      p.invuln = 1.6;
      p.grounded = true;
      p.powder = Math.max(p.powder, 1.2);
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

  p.invuln = Math.max(0, p.invuln - dt);
  p.powder = Math.max(0, p.powder - dt);
  p.glide = Math.max(0, p.glide - dt);
  p.speed = Math.max(0, p.speed - dt);
  p.drop = Math.max(0, p.drop - dt);

  const wasGrounded = p.grounded;
  if (wasGrounded) p.coyote = 0.14;
  else p.coyote = Math.max(0, p.coyote - dt);
  if (input.jumpPressed) p.buffer = 0.16;
  else p.buffer = Math.max(0, p.buffer - dt);
  if (input.down && wasGrounded) p.drop = 0.28;

  updateMovers(sim);

  if (input.x < 0) p.facing = -1;
  else if (input.x > 0) p.facing = 1;

  const max = p.speed > 0 ? FAST : RUN;
  const accel = wasGrounded ? 3400 : 2200;
  if (input.x !== 0) {
    p.vx += input.x * accel * dt;
    if (p.vx > max) p.vx = max;
    if (p.vx < -max) p.vx = -max;
  } else if (wasGrounded) {
    const f = 2200 * dt;
    if (Math.abs(p.vx) <= f) p.vx = 0;
    else p.vx -= Math.sign(p.vx) * f;
  } else {
    p.vx *= Math.max(0, 1 - 0.7 * dt);
  }

  if (p.buffer > 0 && (wasGrounded || p.coyote > 0)) {
    p.vy = p.powder > 0 ? JUMP_POWDER : JUMP;
    p.grounded = false;
    p.coyote = 0;
    p.buffer = 0;
    p.jumpCut = true;
    events.jump = true;
  }

  let g = p.vy < 0 ? GRAV_UP : GRAV_DOWN;
  if (Math.abs(p.vy) < 110) g = GRAV_APEX;
  if (p.glide > 0 && input.jumpHeld && p.vy > 0) g = 220;
  p.vy = Math.min(MAX_FALL, p.vy + g * dt);
  if (p.jumpCut && !input.jumpHeld && p.vy < 0) {
    p.vy *= 0.48;
    p.jumpCut = false;
  }
  if (p.glide > 0 && input.jumpHeld && p.vy > 55) p.vy = 55;

  p.x = resolveX(sim, p.x + p.vx * dt);
  const yBefore = p.y;
  const prevVy = p.vy;
  const moved = resolveY(sim, p.y + p.vy * dt, yBefore + PH, prevVy);
  p.y = moved.y;
  p.grounded = moved.grounded && !moved.bounced;
  if (moved.bounced) {
    p.vy = p.powder > 0 ? -1080 : -980;
    p.grounded = false;
    p.jumpCut = false;
    p.coyote = 0;
    events.jump = true;
    if (!sim.gentle) sim.shake = Math.max(sim.shake, 3);
    puff(sim, p.x + PW / 2, p.y + PH, "#9ed9c8", 8, 120);
  }
  if (!wasGrounded && p.grounded && prevVy > 240) {
    p.land = 0.12;
    puff(sim, p.x + PW / 2, p.y + PH, "#f6e3d4", 4, 50);
  }
  if (p.grounded) p.jumpCut = false;

  if (wasGrounded && p.grounded && Math.abs(p.vx) > 90 && Math.random() < dt * 10) {
    puff(sim, p.x + PW / 2, p.y + PH, "#f6e3d4", 1, 30);
  }
  if (p.powder > 0 && Math.random() < dt * 14) {
    puff(sim, p.x + PW / 2, p.y + 20, "#ffffff", 1, 40);
  }

  updateEnemies(sim, dt);

  const prevBottom = yBefore + PH;
  for (const e of sim.enemies) {
    if (e.fade !== 0) continue;
    if (!hit(p.x, p.y, PW, PH, e)) continue;
    const stomp = p.vy > 30 && prevBottom <= e.y + 16;
    if (stomp || p.powder > 0) {
      if (stomp) {
        p.vy = -540;
        p.grounded = false;
        p.jumpCut = false;
      }
      e.fade = 0.42;
      events.stomp = true;
      if (!sim.gentle) sim.shake = Math.max(sim.shake, 4);
      puff(sim, e.x + e.w / 2, e.y + e.h / 2, stomp ? "#fff6ea" : "#ffffff", 10, 140);
      continue;
    }
    if (p.invuln <= 0) {
      p.hearts -= 1;
      p.invuln = 1.35;
      p.vx = p.x + PW / 2 < e.x + e.w / 2 ? -250 : 250;
      p.vy = -340;
      p.grounded = false;
      events.hurt = true;
      if (!sim.gentle) sim.shake = Math.max(sim.shake, 8);
      puff(sim, p.x + PW / 2, p.y + 16, "#f4b6c8", 6, 90);
      if (p.hearts <= 0) {
        p.hearts = 0;
        p.nap = 1.15;
        events.nap = true;
      }
    }
  }

  for (const c of sim.coins) {
    if (c.got) continue;
    if (!hit(p.x, p.y, PW, PH, c, 10)) continue;
    c.got = true;
    events.coins += 1;
    grantStar(sim, events);
    puff(sim, c.x + 15, c.y + 15, "#e8b63a", 6, 100);
  }

  for (const item of sim.powers) {
    if (item.got) continue;
    if (!hit(p.x, p.y, PW, PH, item, 6)) continue;
    item.got = true;
    events.power = item.kind;
    if (item.kind === "powder") p.powder = 9;
    else if (item.kind === "glide") p.glide = 14;
    else if (item.kind === "speed") p.speed = 9;
    else if (p.hearts < 5) p.hearts += 1;
    else grantStar(sim, events);
    puff(sim, item.x + 20, item.y + 20, "#ffffff", 10, 120);
  }

  for (const cp of sim.checkpoints) {
    if (cp.got) continue;
    if (p.x + PW > cp.x && p.y + PH > cp.floor - 80 && p.y < cp.floor) {
      cp.got = true;
      p.spawnX = cp.x;
      p.spawnY = cp.floor - PH;
      events.checkpoint = true;
    }
  }

  if (p.y > sim.h + 40) {
    p.x = p.spawnX;
    p.y = p.spawnY;
    p.vx = 0;
    p.vy = 0;
    p.invuln = 0.7;
    p.grounded = true;
    events.fall = true;
  }

  if (!sim.won && hit(p.x, p.y, PW, PH, sim.goal, 4)) {
    sim.won = true;
    events.win = true;
    puff(sim, sim.goal.x + 50, sim.goal.y + 40, "#e8b63a", 16, 160);
    puff(sim, sim.goal.x + 60, sim.goal.y + 80, "#ffffff", 12, 140);
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

export const powerLabel: Record<PowerKind, string> = {
  powder: "Nuvoletta di borotalco!",
  glide: "Ciambella: tieni premuto il salto.",
  speed: "Spazzolino turbo!",
  heart: "Un cuoricino di cotone!",
};
