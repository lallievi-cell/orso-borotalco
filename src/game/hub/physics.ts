import type { HubState, PortalInfo, NpcInfo } from "@/game/hub/types";
import { getMapColliders } from "@/game/hub/map";
import { worldToScreen } from "@/game/hub/coords";

const PLAYER_SPEED = 5.6; // Unità mondo al secondo
const PLAYER_RADIUS = 0.55;

export type HubInput = {
  dx: number;
  dy: number;
  interact: boolean;
  tapWorld?: { wx: number; wy: number } | null;
};

export type HubStepEvent = {
  bounce?: boolean;
  kick?: boolean;
};

/** Aggiorna la simulazione fisica dell'Hub per un intervallo dt. */
export function stepHub(hub: HubState, input: HubInput, dt: number): HubStepEvent {
  const ev: HubStepEvent = {};
  hub.t += dt;
  const p = hub.player;

  // 1. Gestione Tap-to-Move
  if (input.tapWorld) {
    hub.tapTarget = { wx: input.tapWorld.wx, wy: input.tapWorld.wy, t: hub.t };
  }

  let moveX = 0;
  let moveY = 0;

  // Se viene usata la tastiera, ha priorità sul tap
  if (Math.abs(input.dx) > 0.1 || Math.abs(input.dy) > 0.1) {
    hub.tapTarget = null;
    const len = Math.hypot(input.dx, input.dy);
    moveX = (input.dx / len) * PLAYER_SPEED;
    moveY = (input.dy / len) * PLAYER_SPEED;
  } else if (hub.tapTarget) {
    const toX = hub.tapTarget.wx - p.wx;
    const toY = hub.tapTarget.wy - p.wy;
    const dist = Math.hypot(toX, toY);
    if (dist < 0.25) {
      hub.tapTarget = null;
    } else {
      moveX = (toX / dist) * PLAYER_SPEED;
      moveY = (toY / dist) * PLAYER_SPEED;
    }
  }

  // 2. Aggiornamento velocità e orientamento (flip orizzontale)
  const isMoving = Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1;
  p.moving = isMoving;

  if (isMoving) {
    // In coordinate isometriche: screenDx = (moveX - moveY) * 32
    const screenDx = moveX - moveY;
    if (screenDx > 0.2) p.flip = 1;
    else if (screenDx < -0.2) p.flip = -1;
  }

  // Accelerazione morbida
  p.vx += (moveX - p.vx) * Math.min(1, 14 * dt);
  p.vy += (moveY - p.vy) * Math.min(1, 14 * dt);

  // 3. Risoluzione collisioni con i muri
  const colliders = getMapColliders();

  // Movimento asse X con scivolamento
  const nextX = p.wx + p.vx * dt;
  if (!checkCollision(nextX, p.wy, PLAYER_RADIUS, colliders)) {
    p.wx = nextX;
  } else {
    p.vx = 0;
  }

  // Movimento asse Y con scivolamento
  const nextY = p.wy + p.vy * dt;
  if (!checkCollision(p.wx, nextY, PLAYER_RADIUS, colliders)) {
    p.wy = nextY;
  } else {
    p.vy = 0;
  }

  // 4. Salto / Gravità Z dell'orsetto
  if (p.wz > 0 || p.vz !== 0) {
    p.vz -= 18 * dt; // gravità
    p.wz += p.vz * dt;
    if (p.wz <= 0) {
      p.wz = 0;
      p.vz = 0;
    }
  }

  // 5. Polvere di borotalco dai piedini durante la camminata
  if (isMoving && p.wz === 0) {
    p.footstepTimer -= dt;
    if (p.footstepTimer <= 0) {
      p.footstepTimer = 0.14;
      p.dustPuffs.push({
        x: p.wx + (Math.random() - 0.5) * 0.2,
        y: p.wy + (Math.random() - 0.5) * 0.2,
        r: 0.15 + Math.random() * 0.15,
        alpha: 0.8,
      });
    }
  }

  // Dissolvenza delle nuvolette di borotalco
  for (let i = p.dustPuffs.length - 1; i >= 0; i--) {
    const puff = p.dustPuffs[i]!;
    puff.alpha -= dt * 2.2;
    puff.r += dt * 0.2;
    if (puff.alpha <= 0) p.dustPuffs.splice(i, 1);
  }

  // 6. Fisica del pallone da gioco
  const ball = hub.toys.ball;
  // Calcio se l'orsetto tocca la palla
  const distBall = Math.hypot(p.wx - ball.wx, p.wy - ball.wy);
  if (distBall < PLAYER_RADIUS + ball.radius && p.wz < 0.8) {
    const kickX = (ball.wx - p.wx) / (distBall || 1);
    const kickY = (ball.wy - p.wy) / (distBall || 1);
    ball.vx = kickX * 7 + p.vx * 0.6;
    ball.vy = kickY * 7 + p.vy * 0.6;
    ball.vz = 4.2;
    ev.kick = true;
  }

  // Movimento palla
  if (Math.abs(ball.vx) > 0.05 || Math.abs(ball.vy) > 0.05 || ball.wz > 0 || ball.vz !== 0) {
    ball.vz -= 16 * dt;
    ball.wz += ball.vz * dt;
    if (ball.wz <= 0) {
      ball.wz = 0;
      ball.vz = -ball.vz * 0.65; // Rimbalzo elastico
      if (Math.abs(ball.vz) < 0.5) ball.vz = 0;
    }

    ball.vx *= Math.pow(0.85, dt * 60);
    ball.vy *= Math.pow(0.85, dt * 60);

    const bNextX = ball.wx + ball.vx * dt;
    if (!checkCollision(bNextX, ball.wy, ball.radius, colliders)) ball.wx = bNextX;
    else ball.vx = -ball.vx * 0.7;

    const bNextY = ball.wy + ball.vy * dt;
    if (!checkCollision(ball.wx, bNextY, ball.radius, colliders)) ball.wy = bNextY;
    else ball.vy = -ball.vy * 0.7;

    ball.rotation += (Math.hypot(ball.vx, ball.vy) * dt) / ball.radius;
  }

  // 7. Trampolino nel cortile
  const tramp = hub.toys.trampoline;
  const distTramp = Math.hypot(p.wx - tramp.wx, p.wy - tramp.wy);
  if (distTramp < tramp.radius && p.wz <= 0.1 && p.vz <= 0) {
    p.vz = 6.8; // Super rimbalzo BOING!
    p.wz = 0.15;
    ev.bounce = true;
  }

  // 8. Rilevamento portali (porte stanze)
  let foundPortal: PortalInfo | null = null;
  for (const portal of hub.portals) {
    const d = Math.hypot(p.wx - portal.wx, p.wy - portal.wy);
    if (d < portal.radius) {
      foundPortal = portal;
      break;
    }
  }
  hub.activePortal = foundPortal;

  // 9. Rilevamento NPC e shop
  let foundNpc: NpcInfo | null = null;
  for (const npc of hub.npcs) {
    const d = Math.hypot(p.wx - npc.wx, p.wy - npc.wy);
    if (d < npc.radius) {
      foundNpc = npc;
      break;
    }
  }
  hub.activeNpc = foundNpc;
  hub.nearShop = foundNpc?.id === "coniglio";

  // 10. Movimento fluido della telecamera (insegue l'orsetto)
  const targetScreen = worldToScreen(p.wx, p.wy, p.wz);
  const camFollow = 1 - Math.exp(-6 * dt);
  hub.cam.x += (targetScreen.sx - hub.cam.x) * camFollow;
  hub.cam.y += (targetScreen.sy - hub.cam.y) * camFollow;

  return ev;
}

function checkCollision(
  x: number,
  y: number,
  r: number,
  colliders: ReturnType<typeof getMapColliders>,
): boolean {
  // Cerchi
  for (const c of colliders.circles) {
    if (Math.hypot(x - c.x, y - c.y) < r + c.r) return true;
  }
  // Rettangoli
  for (const rc of colliders.rects) {
    if (x + r > rc.x1 && x - r < rc.x2 && y + r > rc.y1 && y - r < rc.y2) {
      return true;
    }
  }
  return false;
}
