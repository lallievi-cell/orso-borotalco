import type { HubState, PortalInfo, NpcInfo } from "@/game/hub/types";
import type { Art } from "@/game/assets";
import { worldToScreen, getDepth } from "@/game/hub/coords";
import { drawHat } from "@/game/hub/cosmetics";
import { VIEW_W, VIEW_H } from "@/game/types";

type Renderable = {
  depth: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
};

/** Renderizza l'intero diorama isometrico dell'Hub su canvas con grafica e animazioni ad altissima fedeltà. */
export function renderHub(
  ctx: CanvasRenderingContext2D,
  hub: HubState,
  art: Art,
  equippedHat: string | null,
  _dpr = 1,
) {
  ctx.save();
  // Centra la vista dell'Hub nello schermo
  const centerSx = VIEW_W / 2;
  const centerSy = VIEW_H / 2;

  const camX = hub.cam.x - centerSx;
  const camY = hub.cam.y - centerSy;

  // 1. Sfondo generale del diorama (atmosfera calda e luminosa da cameretta/giardino)
  drawHubBackground(ctx);

  // 2. Disegno della pavimentazione base (parquet con assi di legno, prato con margherite, marmo, cotto)
  drawGroundTiles(ctx, camX, camY, hub.t);

  // 3. Raccolta di tutti gli oggetti tridimensionali per l'ordinamento Y-sorting
  const items: Renderable[] = [];

  // Portali delle 8 stanze con porte in legno 3D, tappetini e targhe con stelline
  for (const portal of hub.portals) {
    items.push({
      depth: getDepth(portal.wx, portal.wy, 0),
      draw: (c) => drawPortal(c, portal, art, camX, camY, hub.t),
    });
  }

  // NPC amici (Mamma Orsa, Papà Orso, Micio, Babbo Coniglio)
  for (const npc of hub.npcs) {
    if (npc.id === "paperella") continue; // La paperella d'oro è esposta con orgoglio sulla fontana centrale
    items.push({
      depth: getDepth(npc.wx, npc.wy, 0),
      draw: (c) => drawNpc(c, npc, art, camX, camY, hub.t),
    });
  }

  // Gazebo del Bazar delle stelline
  items.push({
    depth: getDepth(9.5, 14.5, 0),
    draw: (c) => drawShopGazebo(c, 9.5, 14.5, art, camX, camY, hub.t),
  });

  // Fontana centrale con l'iconica Paperella d'Oro 3D
  items.push({
    depth: getDepth(11.5, 11.5, 0),
    draw: (c) => drawCentralFountain(c, 11.5, 11.5, art, camX, camY, hub.t),
  });

  // Trampolino elastico nel cortile
  items.push({
    depth: getDepth(hub.toys.trampoline.wx, hub.toys.trampoline.wy, 0),
    draw: (c) =>
      drawCourtyardTrampoline(
        c,
        hub.toys.trampoline.wx,
        hub.toys.trampoline.wy,
        camX,
        camY,
        hub.t,
      ),
  });

  // Pallone da spiaggia rimbalzante
  const ball = hub.toys.ball;
  items.push({
    depth: getDepth(ball.wx, ball.wy, ball.wz),
    draw: (c) => drawBeachBall(c, ball, camX, camY),
  });

  // Alberi di mele e cespugli di rose fiorite
  const decorTrees = [
    { wx: 19.5, wy: 18.5, kind: "apple" },
    { wx: 16.5, wy: 19.5, kind: "bush" },
    { wx: 20.5, wy: 11.5, kind: "rose" },
    { wx: 3.5, wy: 19.5, kind: "plant" },
  ];
  for (const tree of decorTrees) {
    items.push({
      depth: getDepth(tree.wx, tree.wy, 0),
      draw: (c) => drawDecorTree(c, tree.wx, tree.wy, tree.kind, camX, camY, hub.t),
    });
  }

  // Nuvolette di borotalco dai piedini durante la camminata
  for (const puff of hub.player.dustPuffs) {
    items.push({
      depth: getDepth(puff.x, puff.y, 0) - 0.05,
      draw: (c) => {
        const { sx, sy } = worldToScreen(puff.x, puff.y, 0, camX, camY);
        c.fillStyle = `rgba(255, 245, 235, ${puff.alpha * 0.75})`;
        c.beginPath();
        c.arc(sx, sy, puff.r * 24, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = `rgba(255, 255, 255, ${puff.alpha * 0.9})`;
        c.beginPath();
        c.arc(sx - puff.r * 4, sy - puff.r * 4, puff.r * 12, 0, Math.PI * 2);
        c.fill();
      },
    });
  }

  // L'Orsetto protagonista con ciclo di animazione identico ai livelli 2D
  const p = hub.player;
  items.push({
    depth: getDepth(p.wx, p.wy, p.wz) + 0.05,
    draw: (c) => drawHubBear(c, p, art, equippedHat, camX, camY, hub.t),
  });

  // Ordinamento rigoroso per profondità isometrica (Y-sorting)
  items.sort((a, b) => a.depth - b.depth);

  // Esecuzione del disegno ordinato
  for (const item of items) {
    item.draw(ctx);
  }

  // 4. Indicatore di tocco a terra (Tap-to-Move con orma di zampina 🐾)
  if (hub.tapTarget) {
    drawTapIndicator(ctx, hub.tapTarget, camX, camY, hub.t);
  }

  // 5. Prompt interattivi fluttuanti ("💬 PARLA", "🚪 ENTRA")
  if (hub.activePortal) {
    drawPortalPrompt(ctx, hub.activePortal, camX, camY, hub.t);
  } else if (hub.activeNpc) {
    drawNpcPrompt(ctx, hub.activeNpc, camX, camY, hub.t);
  }

  // 6. Fumetto del dialogo attivo con battute per Celeste
  if (hub.dialogue) {
    drawDialogueBubble(ctx, hub.dialogue, hub.npcs, camX, camY);
  }

  ctx.restore();
}

/** Sfondo sfumato caldo da camera/cortile. */
function drawHubBackground(ctx: CanvasRenderingContext2D) {
  const bg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 80, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.85);
  bg.addColorStop(0, "#fffbf5");
  bg.addColorStop(0.55, "#faeedd");
  bg.addColorStop(1, "#ebd1b0");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

/** Pavimentazione ricca: doghe in legno, prato verde fiorito, marmo Carrara, cotto. */
function drawGroundTiles(ctx: CanvasRenderingContext2D, camX: number, camY: number, t: number) {
  for (let x = 3; x <= 20; x++) {
    for (let y = 3; y <= 20; y++) {
      const { sx, sy } = worldToScreen(x, y, 0, camX, camY);

      // Distinzione delle aree della villa
      const isCourtyard = Math.hypot(x - 11.5, y - 11.5) < 4.8;
      const isGarden = x >= 15 && y >= 10;
      const isTerrace = x >= 15 && y < 10;
      const isBedroom = x >= 10 && y <= 6;
      const isBathPlatform = x >= 9 && x <= 14 && y <= 4;

      let topColor = "#fdedd6";
      let borderColor = "#e3c79e";

      if (isBathPlatform) {
        topColor = (x + y) % 2 === 0 ? "#fdf2f8" : "#fce7f3"; // Marmo rosa del Bagno
        borderColor = "#fbcfe8";
      } else if (isCourtyard) {
        topColor = (x + y) % 2 === 0 ? "#ffeed9" : "#fbe3c7"; // Cotto caldo
        borderColor = "#e8c9a3";
      } else if (isGarden) {
        topColor = (x + y) % 2 === 0 ? "#86efac" : "#4ade80"; // Prato verde smeraldo
        borderColor = "#22c55e";
      } else if (isTerrace) {
        topColor = (x + y) % 2 === 0 ? "#e0f2fe" : "#bae6fd"; // Piastrelle azzurro cielo
        borderColor = "#7dd3fc";
      } else if (isBedroom) {
        topColor = (x + y) % 2 === 0 ? "#fed7aa" : "#fdba74"; // Parquet miele
        borderColor = "#fb923c";
      } else {
        // Parquet caldo della casa
        topColor = (x + y) % 2 === 0 ? "#fae8d0" : "#f3dcc0";
        borderColor = "#dfc299";
      }

      // Rombo base della piastrella
      ctx.fillStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 16);
      ctx.lineTo(sx + 32, sy);
      ctx.lineTo(sx, sy + 16);
      ctx.lineTo(sx - 32, sy);
      ctx.closePath();
      ctx.fill();

      // Dettagli texture sui pavimenti
      if (isGarden) {
        // Erba e fiorellini di campo
        if ((x * 7 + y * 13) % 4 === 0) {
          // Margheritina
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(sx - 4, sy - 2, 2.5, 0, Math.PI * 2);
          ctx.arc(sx + 4, sy - 2, 2.5, 0, Math.PI * 2);
          ctx.arc(sx, sy - 6, 2.5, 0, Math.PI * 2);
          ctx.arc(sx, sy + 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#facc15";
          ctx.beginPath();
          ctx.arc(sx, sy - 2, 1.8, 0, Math.PI * 2);
          ctx.fill();
        } else if ((x * 5 + y * 11) % 3 === 0) {
          // Ciuffetto d'erba
          ctx.strokeStyle = "rgba(34, 197, 94, 0.75)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(sx - 2, sy + 2);
          ctx.lineTo(sx - 5, sy - 5);
          ctx.moveTo(sx, sy + 2);
          ctx.lineTo(sx, sy - 7);
          ctx.moveTo(sx + 2, sy + 2);
          ctx.lineTo(sx + 5, sy - 5);
          ctx.stroke();
        }
      } else if (isCourtyard) {
        // Cotto caldo fiorentino con elegante rombo decorativo centrale
        ctx.strokeStyle = "rgba(194, 120, 75, 0.22)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 7);
        ctx.lineTo(sx + 14, sy);
        ctx.lineTo(sx, sy + 7);
        ctx.lineTo(sx - 14, sy);
        ctx.closePath();
        ctx.stroke();
      } else if (!isBathPlatform && !isTerrace) {
        // Venature del legno del parquet
        ctx.strokeStyle = "rgba(160, 110, 70, 0.18)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx - 16, sy - 8);
        ctx.lineTo(sx + 16, sy + 8);
        ctx.moveTo(sx - 8, sy - 12);
        ctx.lineTo(sx + 24, sy + 4);
        ctx.stroke();
      }

      // Bordo con smussatura lucida
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 16);
      ctx.lineTo(sx + 32, sy);
      ctx.lineTo(sx, sy + 16);
      ctx.lineTo(sx - 32, sy);
      ctx.closePath();
      ctx.stroke();
    }
  }
}

/** Renderizza l'orsetto protagonista con lo stesso sistema di falcata e animazione dei livelli. */
function drawHubBear(
  ctx: CanvasRenderingContext2D,
  p: HubState["player"],
  art: Art,
  equippedHat: string | null,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(p.wx, p.wy, p.wz, camX, camY);

  // Ombra di contatto dinamica morbida sul pavimento
  const shadowDist = Math.max(0.3, 1 - p.wz * 0.28);
  const groundPos = worldToScreen(p.wx, p.wy, 0, camX, camY);
  ctx.fillStyle = "rgba(70, 35, 15, 0.35)";
  ctx.beginPath();
  ctx.ellipse(groundPos.sx, groundPos.sy + 2, 22 * shadowDist, 10 * shadowDist, 0, 0, Math.PI * 2);
  ctx.fill();

  const isWalking = p.moving;
  const isAirborne = p.wz > 0.05 || Math.abs(p.vz) > 0.1;

  let sprite: HTMLImageElement | null = null;
  let sxScale = 1;
  let syScale = 1;
  let rot = 0;
  let offsetY = 0;

  if (isAirborne) {
    // In volo (es. super rimbalzo dal trampolino BOING!)
    sprite = p.vz > 0.5 ? (art.jump[1] ?? art.jump[0]) : (art.jump[2] ?? art.jump[0]);
    const factor = Math.min(0.2, Math.abs(p.vz) / 10);
    syScale = 1 + factor;
    sxScale = 1 - factor * 0.5;
  } else if (isWalking) {
    // Camminata a falcata alternata perfetta (identica al platformer 2D)
    const cadence = 11.5;
    const stepCycle = t * cadence;
    const stepPhase = Math.sin(stepCycle);

    // Alterna la falcata distesa (art.run) e l'appoggio al suolo a zampe unite (art.idle)
    if (Math.abs(stepPhase) < 0.28) {
      sprite = art.idle[0] ?? art.run[0];
    } else {
      sprite = art.run[0] ?? art.idle[0];
    }

    // Oscillazione destra/sinistra alternata a ogni passo (waddle)
    const waddle = stepPhase * 0.075;
    rot = waddle;

    // Rimbalzo e sollevamento ritmico del corpo
    offsetY = -Math.abs(stepPhase) * 4.5;

    // Elasticità della pancetta ad ogni battuta di zampa
    const bounce = Math.cos(stepCycle * 2) * 0.055;
    syScale = 1 - bounce;
    sxScale = 1 + bounce * 0.7;
  } else {
    // Idle da fermo: respiro soffice e battito di ciglia
    const breath = Math.sin(t * 3.2) * 0.03;
    syScale = 1 + breath;
    sxScale = 1 - breath * 0.5;
    const blinkCycle = Math.floor(t * 0.8) % 6;
    sprite = blinkCycle === 0 ? (art.idle[1] ?? art.idle[0]) : (art.idle[0] ?? art.run[0]);
  }

  if (!sprite) return;

  ctx.save();
  const feetY = sy;
  const size = 68;

  ctx.translate(sx, feetY + offsetY);
  ctx.scale(p.flip, 1);
  ctx.rotate(rot);
  ctx.scale(sxScale, syScale);

  ctx.drawImage(sprite, -size / 2, -size + 4, size, size);

  // Cappellino o accessorio equipaggiato
  if (equippedHat) {
    const headX = 4;
    const headY = -size + 18;
    drawHat(ctx, equippedHat, headX, headY, 1, 1);
  }

  ctx.restore();
}

/** Renderizza un portale stanza con la porta d'arte 3D originale, zerbino e targa con stelline. */
function drawPortal(
  ctx: CanvasRenderingContext2D,
  portal: PortalInfo,
  art: Art,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(portal.wx, portal.wy, 0, camX, camY);
  const isGoal = portal.index === 7;

  // 1. Zerbino di benvenuto davanti alla porta
  if (art.mat) {
    const mw = 48;
    const mh = mw * (art.mat.height / art.mat.width);
    ctx.drawImage(art.mat, sx - mw / 2, sy - mh / 2 + 6, mw, mh);
  } else {
    ctx.fillStyle = portal.locked ? "rgba(180, 160, 150, 0.45)" : "rgba(255, 215, 120, 0.65)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 4, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Luce calda accogliente che filtra dall'interno della stanza se aperta
  if (!portal.locked) {
    const glow = ctx.createRadialGradient(sx, sy - 28, 2, sx, sy - 28, 36);
    glow.addColorStop(0, "rgba(254, 240, 138, 0.85)");
    glow.addColorStop(1, "rgba(254, 240, 138, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(sx, sy - 28, 38, 48, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Struttura porta con sprite door originale
  const doorH = 74;
  if (art.door) {
    const doorW = doorH * (art.door.width / art.door.height);
    ctx.save();
    if (portal.locked) {
      // Porta chiusa: ombra più scura
      ctx.filter = "brightness(0.65) saturate(0.8)";
    }
    ctx.drawImage(art.door, sx - doorW / 2, sy - doorH, doorW, doorH);
    ctx.restore();
  } else {
    // Fallback procedurale elegante
    const woodGrad = ctx.createLinearGradient(sx, sy - doorH, sx, sy);
    woodGrad.addColorStop(0, isGoal ? "#fde68a" : "#d97706");
    woodGrad.addColorStop(1, isGoal ? "#b45309" : "#78350f");
    ctx.fillStyle = woodGrad;
    ctx.beginPath();
    ctx.roundRect(sx - 24, sy - doorH, 48, doorH, [16, 16, 2, 2]);
    ctx.fill();
  }

  // Se è il Bagno d'Oro: posiziona la tazza del water scintillante accanto alla porta!
  if (isGoal && art.toilet) {
    const th = 46;
    const tw = th * (art.toilet.width / art.toilet.height);
    const bob = Math.sin(t * 3.5) * 2;
    ctx.drawImage(art.toilet, sx + 24, sy - th - 2 + bob, tw, th);
  }

  // 4. Insegna in legno pregiato con Nome Stanza & Icona
  const badgeY = sy - doorH - 12;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(sx - 48, badgeY - 13, 96, 26, 13);
  ctx.fill();
  ctx.strokeStyle = portal.locked ? "#9ca3af" : "#f59e0b";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '800 11px "Fredoka", "Nunito", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#451a03";
  ctx.fillText(`${portal.icon} ${portal.name}`, sx, badgeY);

  // 5. Stelline d'oro guadagnate (usando art.star o rendering vettoriale d'oro)
  if (!portal.locked) {
    const starsY = badgeY - 15;
    for (let s = 0; s < 3; s++) {
      const starX = sx - 16 + s * 16;
      const got = s < portal.stars;
      if (got && art.star) {
        ctx.drawImage(art.star, starX - 7, starsY - 7, 14, 14);
      } else {
        ctx.font = "12px sans-serif";
        ctx.fillText(got ? "⭐" : "▫️", starX, starsY);
      }
    }

    // Se trovata la Paperella d'Oro segreta nella stanza: mostra il trofeo d'arte accanto alla porta!
    if (portal.duck) {
      if (art.goldduck) {
        ctx.drawImage(art.goldduck, sx + 34, badgeY - 12, 20, 20);
      } else {
        ctx.font = "15px sans-serif";
        ctx.fillText("🦆", sx + 42, badgeY);
      }
    }
  } else {
    // Lucchetto d'ottone con catenella
    ctx.font = "18px sans-serif";
    ctx.fillText("🔒", sx, sy - 34);
  }
}

/** Renderizza i personaggi amici nel loro stile ad alta fedeltà. */
function drawNpc(
  ctx: CanvasRenderingContext2D,
  npc: NpcInfo,
  art: Art,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(npc.wx, npc.wy, 0, camX, camY);

  // Ombra morbida di contatto a terra
  ctx.fillStyle = "rgba(70, 35, 15, 0.32)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 3, 20, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  const bob = Math.sin(t * 3 + npc.wx) * 1.5;
  ctx.translate(sx, sy + bob);

  if (npc.id === "mamma") {
    // 🐻 MAMMA ORSA: Disegnata con lo stesso sprite d'arte dell'Orso, con grembiule rosa a cuore e fiore tra i capelli
    const sprite = art.idle[0];
    const size = 68;
    if (sprite) {
      ctx.drawImage(sprite, -size / 2, -size + 4, size, size);
    }

    // Grembiulino rosa con volant
    ctx.fillStyle = "rgba(244, 114, 182, 0.85)";
    ctx.beginPath();
    ctx.roundRect(-16, -38, 32, 24, 6);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Cuoricino rosso sul grembiule
    ctx.fillStyle = "#ef4444";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("❤️", 0, -24);

    // Fiorellino rosa/giallo all'orecchio
    ctx.fillStyle = "#fb7185";
    ctx.beginPath();
    ctx.arc(14, -58, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(14, -58, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Guanciotte rosee da mamma
    ctx.fillStyle = "rgba(244, 114, 182, 0.45)";
    ctx.beginPath();
    ctx.arc(-14, -40, 5, 0, Math.PI * 2);
    ctx.arc(14, -40, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (npc.id === "papa") {
    // 🧸 PAPÀ ORSO: Più alto e robusto, con gilet blu e bottoni d'oro e occhialetti da lettura
    const sprite = art.idle[0];
    const size = 76; // Scala più grande per papà
    ctx.save();
    ctx.scale(1.12, 1.12);
    if (sprite) {
      ctx.drawImage(sprite, -size / 2, -size + 4, size, size);
    }

    // Gilet blu elegante
    ctx.fillStyle = "rgba(37, 99, 235, 0.85)";
    ctx.beginPath();
    ctx.roundRect(-18, -42, 36, 26, 6);
    ctx.fill();
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Bottoncini dorati del gilet
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(0, -36, 2, 0, Math.PI * 2);
    ctx.arc(0, -28, 2, 0, Math.PI * 2);
    ctx.fill();

    // Occhiali da lettura simpatici
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(-8, -48, 4.5, 0, Math.PI * 2);
    ctx.arc(8, -48, 4.5, 0, Math.PI * 2);
    ctx.moveTo(-3.5, -48);
    ctx.lineTo(3.5, -48);
    ctx.stroke();
    ctx.restore();
  } else if (npc.id === "micio") {
    // 🐱 MICIO IL GATTO: Adagiato morbidamente sul vero Cuscino (art.pillow) con fusa e coda animata
    if (art.pillow) {
      const pw = 48;
      const ph = pw * (art.pillow.height / art.pillow.width);
      ctx.drawImage(art.pillow, -pw / 2, -ph / 2 - 4, pw, ph);
    } else {
      ctx.fillStyle = "#a855f7";
      ctx.beginPath();
      ctx.ellipse(0, -4, 24, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gatto tigrato arancio che dorme beato
    ctx.fillStyle = "#fb923c";
    ctx.beginPath();
    ctx.ellipse(0, -18, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Strisce del pelo
    ctx.strokeStyle = "#c2410c";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-6, -26);
    ctx.lineTo(-4, -20);
    ctx.moveTo(0, -28);
    ctx.lineTo(0, -20);
    ctx.moveTo(6, -26);
    ctx.lineTo(4, -20);
    ctx.stroke();

    // Orecchie a punta
    ctx.fillStyle = "#fb923c";
    ctx.beginPath();
    ctx.moveTo(-11, -26);
    ctx.lineTo(-5, -34);
    ctx.lineTo(-1, -26);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(1, -26);
    ctx.lineTo(5, -34);
    ctx.lineTo(11, -26);
    ctx.fill();

    // Occhietti chiusi che sorridono ^ ^
    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(-5, -17, 3, Math.PI, 0);
    ctx.arc(5, -17, 3, Math.PI, 0);
    ctx.stroke();

    // Coda che si muove lentamente
    const tailAngle = Math.sin(t * 3) * 6;
    ctx.strokeStyle = "#fb923c";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(12, -15);
    ctx.quadraticCurveTo(20 + tailAngle, -24, 18 + tailAngle, -30);
    ctx.stroke();

    // Nuvoletta Zzz se dorme
    ctx.font = '800 12px "Fredoka", sans-serif';
    ctx.fillStyle = "rgba(168, 85, 247, 0.85)";
    ctx.fillText("Zzz...", 16, -34 + Math.sin(t * 2) * 3);
  } else if (npc.id === "coniglio") {
    // 🐰 BABBO CONIGLIO: Commerciante dietro al bancone con lunghe orecchie mobili e papillon
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(0, -26, 18, 0, Math.PI * 2);
    ctx.fill();

    // Lunghe orecchie da coniglio che oscillano
    const earWiggle = Math.sin(t * 4) * 2;
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.roundRect(-12 + earWiggle, -56, 8, 28, 4);
    ctx.roundRect(4 - earWiggle, -56, 8, 28, 4);
    ctx.fill();
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.roundRect(-10 + earWiggle, -52, 4, 22, 2);
    ctx.roundRect(6 - earWiggle, -52, 4, 22, 2);
    ctx.fill();

    // Papillon viola con gemma dorata
    ctx.fillStyle = "#8b5cf6";
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(-7, -19);
    ctx.lineTo(-7, -9);
    ctx.closePath();
    ctx.moveTo(0, -14);
    ctx.lineTo(7, -19);
    ctx.lineTo(7, -9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(0, -14, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Faccina dolce con nasino rosa
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(-5, -28, 2, 0, Math.PI * 2);
    ctx.arc(5, -28, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.arc(0, -24, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nome sopra l'NPC in stampatello chiaro
  ctx.font = '800 12px "Fredoka", "Nunito", sans-serif';
  ctx.textAlign = "center";
  ctx.fillStyle = "#451a03";
  ctx.fillText(npc.name, 0, -56);

  ctx.restore();
}

/** Fontana centrale monumentale con la Paperella d'Oro 3D originale. */
function drawCentralFountain(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  art: Art,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(wx, wy, 0, camX, camY);

  // Bordo monumentale in pietra scolpita con modanatura
  ctx.fillStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.ellipse(sx, sy, 48, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Bacino d'acqua turchese brillante
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.ellipse(sx, sy, 40, 19, 0, 0, Math.PI * 2);
  ctx.fill();

  // Onde concentriche animate
  for (let w = 0; w < 3; w++) {
    const waveR = ((t * 18 + w * 12) % 36) + 4;
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, 0.6 - waveR / 40)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(sx, sy, waveR, waveR * 0.46, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Piedistallo centrale in marmo
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.ellipse(sx, sy - 6, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Statua della Paperella d'Oro originale con aura luccicante
  const duckBob = Math.sin(t * 4) * 2.5;
  if (art.goldduck) {
    const dw = 38;
    const dh = dw * (art.goldduck.height / art.goldduck.width);
    // Bagliore d'oro intorno alla paperella
    const glow = ctx.createRadialGradient(sx, sy - 18 + duckBob, 2, sx, sy - 18 + duckBob, 28);
    glow.addColorStop(0, "rgba(254, 240, 138, 0.75)");
    glow.addColorStop(1, "rgba(254, 240, 138, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy - 18 + duckBob, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.drawImage(art.goldduck, sx - dw / 2, sy - dh - 8 + duckBob, dw, dh);
  } else {
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🦆", sx, sy - 16 + duckBob);
  }

  // Scintille d'oro che salgono
  for (let s = 0; s < 3; s++) {
    const spX = sx + Math.sin(t * 3 + s * 2) * 20;
    const spY = sy - 24 - ((t * 22 + s * 16) % 26);
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(spX, spY, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Gazebo del Bazar con tendone a righe e banco accessori. */
function drawShopGazebo(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  art: Art,
  camX: number,
  camY: number,
  _t: number,
) {
  const { sx, sy } = worldToScreen(wx, wy, 0, camX, camY);

  // Ombra gazebo
  ctx.fillStyle = "rgba(70, 35, 15, 0.35)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 4, 38, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Banco di legno nobile del negozio
  const woodGrad = ctx.createLinearGradient(sx - 36, sy - 26, sx + 36, sy);
  woodGrad.addColorStop(0, "#92400e");
  woodGrad.addColorStop(1, "#78350f");
  ctx.fillStyle = woodGrad;
  ctx.beginPath();
  ctx.roundRect(sx - 36, sy - 26, 72, 24, 5);
  ctx.fill();
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Bottiglie di borotalco e stelline esposte sul banco
  if (art.powder) {
    ctx.drawImage(art.powder, sx - 28, sy - 34, 16, 16);
  }
  if (art.star) {
    ctx.drawImage(art.star, sx + 14, sy - 33, 14, 14);
  }

  // Pali di sostegno del tendone
  ctx.fillStyle = "#b45309";
  ctx.fillRect(sx - 38, sy - 64, 4, 40);
  ctx.fillRect(sx + 34, sy - 64, 4, 40);

  // Tendone a strisce festose (rosso carminio e crema)
  const canopyW = 82;
  const canopyH = 34;
  const canY = sy - 66;

  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(sx - canopyW / 2, canY);
  ctx.lineTo(sx + canopyW / 2, canY);
  ctx.lineTo(sx + canopyW / 2 + 6, canY + canopyH);
  ctx.lineTo(sx - canopyW / 2 - 6, canY + canopyH);
  ctx.closePath();
  ctx.fill();

  // Strisce crema e smerlature
  ctx.fillStyle = "#fffbeb";
  for (let s = 0; s < 4; s++) {
    const stX = sx - canopyW / 2 + 6 + s * 19;
    ctx.fillRect(stX, canY, 9, canopyH);
  }

  // Insegna festosa "🛍️ BAZAR DELLE STELLINE"
  ctx.fillStyle = "#fef08a";
  ctx.beginPath();
  ctx.roundRect(sx - 34, canY - 15, 68, 20, 10);
  ctx.fill();
  ctx.strokeStyle = "#eab308";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '800 11px "Fredoka", "Nunito", sans-serif';
  ctx.fillStyle = "#713f12";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🛍️ BAZAR", sx, canY - 4);
}

/** Trampolino elastico con molle e pedana cyan. */
function drawCourtyardTrampoline(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(wx, wy, 0, camX, camY);

  // Telaio metallico in acciaio e molle
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.ellipse(sx, sy, 34, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Bordo di protezione e bersaglio cyan
  ctx.fillStyle = "#0284c7";
  ctx.beginPath();
  ctx.ellipse(sx, sy, 22, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Freccia e indicatore di salto BOING!
  const arrowBob = Math.sin(t * 6) * 3;
  ctx.font = '800 13px "Fredoka", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⬆️ BOING!", sx, sy - 14 + arrowBob);
}

/** Pallone da spiaggia con rendering volumetrico 3D. */
function drawBeachBall(
  ctx: CanvasRenderingContext2D,
  ball: HubState["toys"]["ball"],
  camX: number,
  camY: number,
) {
  const { sx, sy } = worldToScreen(ball.wx, ball.wy, ball.wz, camX, camY);

  // Ombra a terra del pallone che si riduce e sfuma quando vola in alto
  const shadowDist = Math.max(0.25, 1 - ball.wz * 0.25);
  const groundPos = worldToScreen(ball.wx, ball.wy, 0, camX, camY);
  ctx.fillStyle = `rgba(70, 35, 15, ${0.4 * shadowDist})`;
  ctx.beginPath();
  ctx.ellipse(groundPos.sx, groundPos.sy + 2, 16 * shadowDist, 8 * shadowDist, 0, 0, Math.PI * 2);
  ctx.fill();

  const r = ball.radius * 28;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(ball.rotation);

  // Sfera di base rossa
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Spicchio giallo
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 0.65);
  ctx.lineTo(0, 0);
  ctx.fill();

  // Spicchio blu
  ctx.fillStyle = "#3b82f6";
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, Math.PI * 1.65);
  ctx.lineTo(0, 0);
  ctx.fill();

  // Giunzioni bianche
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Riflesso speculare lucido sul pallone
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.35, r * 0.22, -0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Alberi di mele e cespugli di rose curati in volume e sfumatura. */
function drawDecorTree(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  kind: string,
  camX: number,
  camY: number,
  _t: number,
) {
  const { sx, sy } = worldToScreen(wx, wy, 0, camX, camY);

  // Ombra alla base
  ctx.fillStyle = "rgba(70, 35, 15, 0.28)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 3, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  if (kind === "apple") {
    // Tronco in legno nodoso
    ctx.fillStyle = "#78350f";
    ctx.fillRect(sx - 4.5, sy - 26, 9, 26);

    // Chioma volumetrica sfumata
    const leafGrad = ctx.createRadialGradient(sx - 6, sy - 44, 4, sx, sy - 40, 26);
    leafGrad.addColorStop(0, "#4ade80");
    leafGrad.addColorStop(1, "#15803d");
    ctx.fillStyle = leafGrad;
    ctx.beginPath();
    ctx.arc(sx, sy - 40, 24, 0, Math.PI * 2);
    ctx.fill();

    // Mele rosse lucide
    const apples = [
      { x: sx - 10, y: sy - 46 },
      { x: sx + 12, y: sy - 40 },
      { x: sx - 2, y: sy - 30 },
      { x: sx + 4, y: sy - 52 },
    ];
    for (const a of apples) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(a.x, a.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.beginPath();
      ctx.arc(a.x - 1.2, a.y - 1.2, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Cespuglio di rose in fiore
    const bushGrad = ctx.createRadialGradient(sx - 4, sy - 18, 2, sx, sy - 14, 18);
    bushGrad.addColorStop(0, "#22c55e");
    bushGrad.addColorStop(1, "#14532d");
    ctx.fillStyle = bushGrad;
    ctx.beginPath();
    ctx.arc(sx, sy - 14, 18, 0, Math.PI * 2);
    ctx.fill();

    // Fiori di rosa carminio
    const roses = [
      { x: sx - 7, y: sy - 18 },
      { x: sx + 8, y: sy - 14 },
      { x: sx, y: sy - 8 },
    ];
    for (const r of roses) {
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(r.x, r.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fda4af";
      ctx.beginPath();
      ctx.arc(r.x - 1, r.y - 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Indicatore di tocco con cerchio d'oro pulsante e impronta 🐾. */
function drawTapIndicator(
  ctx: CanvasRenderingContext2D,
  target: NonNullable<HubState["tapTarget"]>,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(target.wx, target.wy, 0, camX, camY);
  const pulse = Math.sin(t * 8) * 4;

  ctx.strokeStyle = "rgba(251, 191, 36, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 22 + pulse, 11 + pulse * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Impronta zampina d'orso centrale
  ctx.font = "18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🐾", sx, sy);
}

/** Pulsante fluttuante d'ingresso porta. */
function drawPortalPrompt(
  ctx: CanvasRenderingContext2D,
  portal: PortalInfo,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(portal.wx, portal.wy, 0, camX, camY);
  const floatY = Math.sin(t * 6) * 3;

  const btnY = sy - 110 + floatY;
  ctx.fillStyle = portal.locked ? "#ef4444" : "#10b981";
  ctx.beginPath();
  ctx.roundRect(sx - 52, btnY - 15, 104, 30, 15);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = '800 13px "Fredoka", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(portal.locked ? "🔒 CHIUSO" : "🚪 ENTRA!", sx, btnY + 1);
}

/** Pulsante fluttuante per parlare con gli amici. */
function drawNpcPrompt(
  ctx: CanvasRenderingContext2D,
  npc: NpcInfo,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(npc.wx, npc.wy, 0, camX, camY);
  const floatY = Math.sin(t * 6) * 3;

  const btnY = sy - 78 + floatY;
  ctx.fillStyle = "#3b82f6";
  ctx.beginPath();
  ctx.roundRect(sx - 46, btnY - 14, 92, 28, 14);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.2;
  ctx.stroke();

  ctx.font = '800 12px "Fredoka", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("💬 PARLA", sx, btnY + 1);
}

/** Fumetto del dialogo in chiaro stampatello per Celeste. */
function drawDialogueBubble(
  ctx: CanvasRenderingContext2D,
  dlg: NonNullable<HubState["dialogue"]>,
  npcs: NpcInfo[],
  camX: number,
  camY: number,
) {
  const speakerNpc = npcs.find((n) => n.id === dlg.npcId);
  const wx = speakerNpc?.wx ?? 12;
  const wy = speakerNpc?.wy ?? 12;
  const { sx, sy } = worldToScreen(wx, wy, 0, camX, camY);

  const bubbleW = Math.min(VIEW_W - 48, 460);
  const bubbleH = 100;
  const bx = Math.max(24, Math.min(VIEW_W - bubbleW - 24, sx - bubbleW / 2));
  const by = Math.max(20, sy - 185);

  // Ombra fumetto
  ctx.fillStyle = "rgba(70, 35, 15, 0.3)";
  ctx.beginPath();
  ctx.roundRect(bx + 4, by + 4, bubbleW, bubbleH, 22);
  ctx.fill();

  // Corpo fumetto (crema caldo e luminoso)
  ctx.fillStyle = "#fffdfa";
  ctx.beginPath();
  ctx.roundRect(bx, by, bubbleW, bubbleH, 22);
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Coda del fumetto verso il personaggio
  ctx.fillStyle = "#fffdfa";
  ctx.beginPath();
  ctx.moveTo(sx - 10, by + bubbleH - 1);
  ctx.lineTo(sx, by + bubbleH + 15);
  ctx.lineTo(sx + 10, by + bubbleH - 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.stroke();

  // Nome oratore
  ctx.font = '800 14px "Fredoka", sans-serif';
  ctx.fillStyle = "#b45309";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(dlg.speaker.toUpperCase(), bx + 20, by + 16);

  // Testo in stampatello maiuscolo grande e nitido
  ctx.font = '800 16px "Fredoka", "Nunito", sans-serif';
  ctx.fillStyle = "#1f2937";
  const currentLine = dlg.lines[dlg.lineIndex] ?? "";
  ctx.fillText(currentLine, bx + 20, by + 42);

  // Indicatore tocca per continuare
  ctx.font = '800 11px "Fredoka", sans-serif';
  ctx.fillStyle = "#9ca3af";
  ctx.textAlign = "right";
  ctx.fillText("TOCCA PER CONTINUARE ❯❯", bx + bubbleW - 20, by + 76);
}
