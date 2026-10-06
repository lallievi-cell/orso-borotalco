import type { HubState, PortalInfo, NpcInfo } from "@/game/hub/types";
import { getMapColliders } from "@/game/hub/map";
import { worldToScreen } from "@/game/hub/coords";
import { findPath, checkCollision } from "@/game/hub/nav";

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
  ballTramp?: boolean;
  ballCombo?: number;
  ballNpcPass?: { npcId: string; line: string };
};

/** Genera scintille colorate e stelline giocose attorno alla palla. */
function spawnBallSparks(
  ball: HubState["toys"]["ball"],
  count: number,
  colors?: string[],
) {
  const palette = colors || ["#fde047", "#60a5fa", "#f472b6", "#34d399", "#ffffff", "#fb923c"];
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 1.2 + Math.random() * 2.6;
    ball.sparks.push({
      x: ball.wx,
      y: ball.wy,
      z: ball.wz + 0.25,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      vz: 1.8 + Math.random() * 2.6,
      color: palette[Math.floor(Math.random() * palette.length)]!,
      size: 2.5 + Math.random() * 3.5,
      alpha: 1.0,
      rot: Math.random() * Math.PI * 2,
    });
  }
}

/** Aggiorna la simulazione fisica dell'Hub per un intervallo dt. */
export function stepHub(hub: HubState, input: HubInput, dt: number): HubStepEvent {
  const ev: HubStepEvent = {};
  hub.t += dt;
  const p = hub.player;

  // 1. Gestione Tap-to-Move con navigazione intelligente (evita ostacoli A*)
  const colliders = getMapColliders();
  if (input.tapWorld) {
    const path = findPath(
      p.wx,
      p.wy,
      input.tapWorld.wx,
      input.tapWorld.wy,
      PLAYER_RADIUS,
      colliders,
    );
    hub.tapTarget = {
      wx: input.tapWorld.wx,
      wy: input.tapWorld.wy,
      t: hub.t,
      path,
      waypointIndex: 0,
    };
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
    const path = hub.tapTarget.path;
    const wpIdx = hub.tapTarget.waypointIndex ?? 0;
    const currentWp = path && wpIdx < path.length ? path[wpIdx]! : { wx: hub.tapTarget.wx, wy: hub.tapTarget.wy };

    const toX = currentWp.wx - p.wx;
    const toY = currentWp.wy - p.wy;
    const dist = Math.hypot(toX, toY);

    if (dist < 0.28) {
      if (path && wpIdx + 1 < path.length) {
        hub.tapTarget.waypointIndex = wpIdx + 1;
        const nextWp = path[wpIdx + 1]!;
        const nextDist = Math.hypot(nextWp.wx - p.wx, nextWp.wy - p.wy);
        if (nextDist > 0.05) {
          moveX = ((nextWp.wx - p.wx) / nextDist) * PLAYER_SPEED;
          moveY = ((nextWp.wy - p.wy) / nextDist) * PLAYER_SPEED;
        }
      } else {
        hub.tapTarget = null;
      }
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

  // 6. Fisica e gameplay del pallone da spiaggia
  const ball = hub.toys.ball;
  const tramp = hub.toys.trampoline;

  // 6a. Calcio o colpo di testa dell'orsetto
  const distBall = Math.hypot(p.wx - ball.wx, p.wy - ball.wy);
  if (distBall < PLAYER_RADIUS + ball.radius && Math.abs(p.wz - ball.wz) < 1.1) {
    const kickX = (ball.wx - p.wx) / (distBall || 1);
    const kickY = (ball.wy - p.wy) / (distBall || 1);

    if (p.wz > 0.25) {
      // Colpo di testa / schiacciata saltando!
      ball.vx = kickX * 8.2 + p.vx * 0.7;
      ball.vy = kickY * 8.2 + p.vy * 0.7;
      ball.vz = 5.8 + Math.max(0, p.vz * 0.5);
      ball.squish = 0.52;
    } else {
      // Calcio a terra o al volo
      ball.vx = kickX * 7.2 + p.vx * 0.6;
      ball.vy = kickY * 7.2 + p.vy * 0.6;
      ball.vz = 4.2 + Math.min(2.2, Math.hypot(p.vx, p.vy) * 0.35);
      ball.squish = 0.42;
    }

    if (ball.comboTimer > 0 || ball.wz > 0.1) {
      ball.combo = (ball.combo || 0) + 1;
    } else {
      ball.combo = 1;
    }
    ball.bestCombo = Math.max(ball.bestCombo || 0, ball.combo);
    ball.comboTimer = 3.8;
    ball.comboPop = 1.0;
    ball.lastKickBy = "player";
    spawnBallSparks(ball, 7);

    ev.kick = true;
    ev.ballCombo = ball.combo;
  }

  // 6b. Super-rimbalzo del pallone sul trampolino elastico
  const distBallTramp = Math.hypot(ball.wx - tramp.wx, ball.wy - tramp.wy);
  if (distBallTramp < tramp.radius && ball.wz <= 0.25 && ball.vz <= 0) {
    ball.vz = 9.2; // Vola alto nel cielo azzurro!
    ball.wz = 0.25;
    ball.squish = 0.6;
    ball.combo = (ball.combo || 0) + 1;
    ball.bestCombo = Math.max(ball.bestCombo || 0, ball.combo);
    ball.comboTimer = 4.5;
    ball.comboPop = 1.2;
    ball.lastKickBy = "tramp";
    spawnBallSparks(ball, 10, ["#38bdf8", "#0284c7", "#facc15", "#ffffff"]);
    ev.ballTramp = true;
    ev.ballCombo = ball.combo;
  }

  // 6c. Passaggi giocosi con gli amici NPC (Papà Orso, Mamma Orsa, Micio, Paperella)
  for (const npc of hub.npcs) {
    if (npc.id === "coniglio") continue; // Babbo Coniglio resta al banco del bazar
    const dNpc = Math.hypot(ball.wx - npc.wx, ball.wy - npc.wy);
    if (dNpc < npc.radius + ball.radius + 0.35 && ball.lastKickBy !== npc.id) {
      // L'amico rilancia la palla verso l'orsetto!
      const toPlayerX = p.wx - ball.wx;
      const toPlayerY = p.wy - ball.wy;
      const distToP = Math.hypot(toPlayerX, toPlayerY) || 1;

      ball.vx = (toPlayerX / distToP) * 6.5;
      ball.vy = (toPlayerY / distToP) * 6.5;
      ball.vz = 4.8;
      ball.squish = 0.45;
      ball.combo = (ball.combo || 0) + 1;
      ball.bestCombo = Math.max(ball.bestCombo || 0, ball.combo);
      ball.comboTimer = 4.2;
      ball.comboPop = 1.0;
      ball.lastKickBy = npc.id;

      let quote = "PRENDI LA PALLA!";
      if (npc.id === "papa") quote = "PRENDI, CAMPIONCINO! BEL TIRO!";
      else if (npc.id === "mamma") quote = "ATTENTO, TESORO! CHE BEL GIOCO!";
      else if (npc.id === "micio") quote = "MIAO! ZAMPATA MAGICA!";
      else if (npc.id === "paperella") quote = "QUACK! AL VOLO!";

      ev.ballNpcPass = { npcId: npc.id, line: quote };
      ev.ballCombo = ball.combo;
      spawnBallSparks(ball, 8, ["#fb923c", "#f472b6", "#60a5fa", "#facc15"]);
      break;
    }
  }

  // 6d. Movimento, gravità Z, rimbalzi elastici e frizione del pallone
  if (Math.abs(ball.vx) > 0.04 || Math.abs(ball.vy) > 0.04 || ball.wz > 0 || ball.vz !== 0) {
    ball.vz -= 16 * dt;
    ball.wz += ball.vz * dt;
    if (ball.wz <= 0) {
      ball.wz = 0;
      if (Math.abs(ball.vz) > 0.5) {
        ball.squish = Math.min(0.55, Math.abs(ball.vz) * 0.08);
        ball.vz = -ball.vz * 0.72; // Rimbalzo elastico da pallone gonfiabile
        if (Math.abs(ball.vz) > 2.5) {
          spawnBallSparks(ball, 3, ["#fde047", "#ffffff"]);
        }
      } else {
        ball.vz = 0;
      }
    }

    // Frizione aria vs terra
    const friction = ball.wz > 0.05 ? Math.pow(0.96, dt * 60) : Math.pow(0.86, dt * 60);
    ball.vx *= friction;
    ball.vy *= friction;

    // Risoluzione collisioni asse X con ostacoli
    const bNextX = ball.wx + ball.vx * dt;
    if (!checkCollision(bNextX, ball.wy, ball.radius, colliders)) {
      ball.wx = bNextX;
    } else {
      ball.vx = -ball.vx * 0.75;
      ball.squish = Math.min(0.4, Math.abs(ball.vx) * 0.08);
    }

    // Risoluzione collisioni asse Y con ostacoli
    const bNextY = ball.wy + ball.vy * dt;
    if (!checkCollision(ball.wx, bNextY, ball.radius, colliders)) {
      ball.wy = bNextY;
    } else {
      ball.vy = -ball.vy * 0.75;
      ball.squish = Math.min(0.4, Math.abs(ball.vy) * 0.08);
    }

    // Collisione con la vasca della fontana centrale (11.5, 11.5 r=1.6)
    const distFountain = Math.hypot(ball.wx - 11.5, ball.wy - 11.5);
    if (distFountain < 1.6 + ball.radius) {
      const normX = (ball.wx - 11.5) / (distFountain || 1);
      const normY = (ball.wy - 11.5) / (distFountain || 1);
      ball.wx = 11.5 + normX * (1.6 + ball.radius);
      const dot = ball.vx * normX + ball.vy * normY;
      if (dot < 0) {
        ball.vx -= 1.8 * dot * normX;
        ball.vy -= 1.8 * dot * normY;
        ball.squish = 0.35;
        // Schizzo d'acqua azzurro
        spawnBallSparks(ball, 5, ["#38bdf8", "#7dd3fc", "#e0f2fe", "#ffffff"]);
      }
    }

    const rollSpeed = Math.hypot(ball.vx, ball.vy);
    ball.rotation += (rollSpeed * dt) / ball.radius;
    ball.rollAngleX += (ball.vx * dt) / ball.radius;
    ball.rollAngleY += (ball.vy * dt) / ball.radius;
  }

  // 6e. Timer combo palleggi e decay
  if (ball.wz === 0 && Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1) {
    ball.comboTimer = Math.max(0, ball.comboTimer - dt);
    if (ball.comboTimer <= 0) {
      ball.combo = 0;
      ball.lastKickBy = null;
    }
  } else {
    ball.comboTimer = Math.max(0, ball.comboTimer - dt * 0.35);
  }

  // 6f. Molla elastica dello squish & decadimento pop
  const springK = 80;
  const damping = 12;
  const squishAcc = -springK * ball.squish - damping * ball.squishVel;
  ball.squishVel += squishAcc * dt;
  ball.squish += ball.squishVel * dt;
  ball.comboPop = Math.max(0, ball.comboPop - dt * 2.2);

  // 6g. Aggiornamento particelle scintille
  for (let i = ball.sparks.length - 1; i >= 0; i--) {
    const s = ball.sparks[i]!;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.z += s.vz * dt;
    s.vz -= 6 * dt; // gravità soffice
    s.rot += 3.5 * dt;
    s.alpha -= dt * 1.6;
    if (s.alpha <= 0 || s.z < 0) {
      ball.sparks.splice(i, 1);
    }
  }

  // 7. Trampolino nel cortile (per l'orsetto)
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

