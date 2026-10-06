import type { HubState, PortalInfo, NpcInfo } from "@/game/hub/types";
import type { Art } from "@/game/assets";
import { worldToScreen, getDepth } from "@/game/hub/coords";
import { drawHat } from "@/game/hub/cosmetics";
import { VIEW_W, VIEW_H } from "@/game/types";

type Renderable = {
  depth: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
};

/** Renderizza l'intero diorama isometrico dell'Hub su canvas con sprite 3D illustrati ad altissima fedeltà. */
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

  // 1. Sfondo generale del diorama (atmosfera calda e accogliente da cameretta/nursery)
  drawHubBackground(ctx);

  // 2. Disegno della pavimentazione base con spessore 3D del diorama (pedistallo in legno, cotto, prato, parquet)
  drawGroundTiles(ctx, art, camX, camY, hub.t);

  // 3. Raccolta di tutti gli oggetti tridimensionali per l'ordinamento Y-sorting
  const items: Renderable[] = [];

  // Portali delle 8 stanze con archi in pietra e rose rampicanti (art.hub.arch)
  for (const portal of hub.portals) {
    items.push({
      depth: getDepth(portal.wx, portal.wy, 0),
      draw: (c) => drawPortal(c, portal, art, camX, camY, hub.t),
    });
  }

  // NPC amici (Mamma Orsa, Papà Orso, Micio il Gatto)
  for (const npc of hub.npcs) {
    // La paperella è sulla fontana e il coniglio è nel gazebo del bazar
    if (npc.id === "paperella" || npc.id === "coniglio") continue;
    items.push({
      depth: getDepth(npc.wx, npc.wy, 0),
      draw: (c) => drawNpc(c, npc, art, camX, camY, hub.t),
    });
  }

  // Gazebo del Bazar delle stelline con Babbo Coniglio illustrato (art.hub.bazar)
  items.push({
    depth: getDepth(9.5, 14.5, 0),
    draw: (c) => drawShopGazebo(c, 9.5, 14.5, art, camX, camY, hub.t),
  });

  // Fontana centrale con l'iconica Paperella d'Oro 3D (art.hub.fountain)
  items.push({
    depth: getDepth(11.5, 11.5, 0),
    draw: (c) => drawCentralFountain(c, 11.5, 11.5, art, camX, camY, hub.t),
  });

  // Trampolino elastico giocattolo nel prato (art.hub.trampoline)
  items.push({
    depth: getDepth(hub.toys.trampoline.wx, hub.toys.trampoline.wy, 0),
    draw: (c) =>
      drawCourtyardTrampoline(
        c,
        hub.toys.trampoline.wx,
        hub.toys.trampoline.wy,
        art,
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

  // Alberi di mele e cespugli di rose fiorite illustrati (art.hub.tree, art.hub.bush)
  const decorTrees = [
    { wx: 19.5, wy: 18.5, kind: "apple" },
    { wx: 16.5, wy: 19.5, kind: "bush" },
    { wx: 20.5, wy: 11.5, kind: "bush" },
    { wx: 3.5, wy: 19.5, kind: "apple" },
  ];
  for (const tree of decorTrees) {
    items.push({
      depth: getDepth(tree.wx, tree.wy, 0),
      draw: (c) => drawDecorTree(c, tree.wx, tree.wy, tree.kind, art, camX, camY, hub.t),
    });
  }

  // Sezioni di staccionata in legno bianco con fiori rampicanti sul terrazzo (art.hub.fence)
  const fences = [
    { wx: 18.5, wy: 7.2 },
    { wx: 18.5, wy: 9.8 },
  ];
  for (const f of fences) {
    items.push({
      depth: getDepth(f.wx, f.wy, 0),
      draw: (c) => drawGardenFence(c, f.wx, f.wy, art, camX, camY),
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

/** Sfondo caldo e sfumato da camera/nursery con morbida vignettatura. */
function drawHubBackground(ctx: CanvasRenderingContext2D) {
  const bg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 80, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.85);
  bg.addColorStop(0, "#fffbf5");
  bg.addColorStop(0.55, "#faeedd");
  bg.addColorStop(1, "#ebd1b0");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

/** Pavimentazione ricca: piedistallo 3D del diorama, cotto caldo, prato smeraldo, parquet e marmo. */
function drawGroundTiles(
  ctx: CanvasRenderingContext2D,
  art: Art,
  camX: number,
  camY: number,
  _t: number,
) {
  const minX = 3;
  const maxX = 20;
  const minY = 3;
  const maxY = 20;

  // 1. Spessore 3D volumetrico del basamento perimetrale in legno noce pregiato
  const slabH = 18;

  // Ombra morbida diffusa sotto la base del diorama
  for (let x = minX; x <= maxX; x++) {
    const { sx, sy } = worldToScreen(x, maxY, 0, camX, camY);
    ctx.fillStyle = "rgba(60, 30, 15, 0.18)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + slabH + 8, 36, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let y = minY; y <= maxY; y++) {
    const { sx, sy } = worldToScreen(maxX, y, 0, camX, camY);
    ctx.fillStyle = "rgba(60, 30, 15, 0.18)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + slabH + 8, 36, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Faccia 3D sinistra (rivolta verso SO) per tutte le colonne sul bordo sud (y = maxY)
  for (let x = minX; x <= maxX; x++) {
    const { sx, sy } = worldToScreen(x, maxY, 0, camX, camY);

    // Faccia sud-ovest (esposta a luce calda)
    const gLeft = ctx.createLinearGradient(sx - 32, sy, sx, sy + slabH);
    gLeft.addColorStop(0, "#92400e");
    gLeft.addColorStop(0.5, "#78350f");
    gLeft.addColorStop(1, "#592b0c");
    ctx.fillStyle = gLeft;
    ctx.beginPath();
    ctx.moveTo(sx - 32, sy);
    ctx.lineTo(sx, sy + 16);
    ctx.lineTo(sx, sy + 16 + slabH);
    ctx.lineTo(sx - 32, sy + slabH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Modanatura in ottone sul bordo inferiore
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx - 32, sy + slabH);
    ctx.lineTo(sx, sy + 16 + slabH);
    ctx.stroke();

    // Faccia sud-est (in rientranza tra le tessere)
    const gRight = ctx.createLinearGradient(sx, sy, sx + 32, sy + slabH);
    gRight.addColorStop(0, "#713f12");
    gRight.addColorStop(0.5, "#592b0c");
    gRight.addColorStop(1, "#3c1a05");
    ctx.fillStyle = gRight;
    ctx.beginPath();
    ctx.moveTo(sx, sy + 16);
    ctx.lineTo(sx + 32, sy);
    ctx.lineTo(sx + 32, sy + slabH);
    ctx.lineTo(sx, sy + 16 + slabH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#291002";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy + 16 + slabH);
    ctx.lineTo(sx + 32, sy + slabH);
    ctx.stroke();
  }

  // Faccia 3D destra (rivolta verso SE) per tutte le colonne sul bordo est (x = maxX)
  for (let y = minY; y < maxY; y++) {
    const { sx, sy } = worldToScreen(maxX, y, 0, camX, camY);

    const gRight = ctx.createLinearGradient(sx, sy, sx + 32, sy + slabH);
    gRight.addColorStop(0, "#713f12");
    gRight.addColorStop(0.5, "#592b0c");
    gRight.addColorStop(1, "#3c1a05");
    ctx.fillStyle = gRight;
    ctx.beginPath();
    ctx.moveTo(sx, sy + 16);
    ctx.lineTo(sx + 32, sy);
    ctx.lineTo(sx + 32, sy + slabH);
    ctx.lineTo(sx, sy + 16 + slabH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#291002";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy + 16 + slabH);
    ctx.lineTo(sx + 32, sy + slabH);
    ctx.stroke();
  }

  // 2. Piastrelle superiori della superficie
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const { sx, sy } = worldToScreen(x, y, 0, camX, camY);

      // Distinzione delle aree della villa
      const isCourtyard = Math.hypot(x - 11.5, y - 11.5) < 4.8;
      const isGarden = x >= 15 && y >= 10;
      const isTerrace = x >= 15 && y < 10;
      const isBedroom = x >= 10 && y <= 6;
      const isBathPlatform = x >= 9 && x <= 14 && y <= 4;

      let topColor = "#fdedd6";
      let borderColor = "#e3c79e";
      let tileImg: HTMLImageElement | null = null;
      const tiles = art.hub?.tiles;

      if (isBathPlatform) {
        topColor = (x + y) % 2 === 0 ? "#fdf2f8" : "#fce7f3"; // Marmo rosa del Bagno
        borderColor = "#fbcfe8";
        tileImg = tiles?.marble ?? null;
      } else if (isGarden) {
        topColor = (x + y) % 2 === 0 ? "#86efac" : "#4ade80"; // Prato verde smeraldo
        borderColor = "#22c55e";
        tileImg = tiles?.grass ?? null;
      } else if (isTerrace) {
        topColor = (x + y) % 2 === 0 ? "#e0f2fe" : "#bae6fd"; // Piastrelle azzurro cielo
        borderColor = "#7dd3fc";
        tileImg = tiles?.terrace ?? null;
      } else if (isCourtyard) {
        topColor = (x + y) % 2 === 0 ? "#ffeed9" : "#fbe3c7"; // Cotto caldo fiorentino
        borderColor = "#e8c9a3";
        tileImg = tiles?.cotto ?? null;
      } else if (isBedroom) {
        topColor = (x + y) % 2 === 0 ? "#fed7aa" : "#fdba74"; // Parquet miele
        borderColor = "#fb923c";
        tileImg = tiles?.wood ?? null;
      } else {
        // Parquet caldo della casa
        topColor = (x + y) % 2 === 0 ? "#fae8d0" : "#f3dcc0";
        borderColor = "#dfc299";
        tileImg = tiles?.wood ?? null;
      }

      // 1. Sottofondo cromatico (evita buchi tra piastrelle ad alta risoluzione)
      ctx.fillStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 16);
      ctx.lineTo(sx + 32, sy);
      ctx.lineTo(sx, sy + 16);
      ctx.lineTo(sx - 32, sy);
      ctx.closePath();
      ctx.fill();

      // 2. Sprite 3D illustrato autentico della pavimentazione
      if (tileImg) {
        ctx.drawImage(tileImg, sx - 32, sy - 16, 64.5, 32.5);
      } else {
        // Fallback vettoriale con bordo smussato
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

      // Tappeto reale rosso verso il Bagno d'Oro al centro
      const isRedCarpet = (x === 11 || x === 12) && y >= 5 && y <= 9;
      if (isRedCarpet) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "rgba(185, 28, 28, 0.88)" : "rgba(153, 27, 27, 0.88)";
        ctx.beginPath();
        ctx.moveTo(sx, sy - 16);
        ctx.lineTo(sx + 32, sy);
        ctx.lineTo(sx, sy + 16);
        ctx.lineTo(sx - 32, sy);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "rgba(251, 191, 36, 0.85)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}

/** Renderizza l'orsetto protagonista con falcata alternata, dondolio e squish & stretch. */
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

  // Ombra a doppio strato: occlusione di contatto profonda sotto le zampine + ombra diffusa a terra
  const shadowDist = Math.max(0.3, 1 - p.wz * 0.28);
  const groundPos = worldToScreen(p.wx, p.wy, 0, camX, camY);

  // 1. Ombra diffusa del corpo a terra
  ctx.fillStyle = `rgba(60, 30, 15, ${0.35 * shadowDist})`;
  ctx.beginPath();
  ctx.ellipse(groundPos.sx, groundPos.sy + 3, 24 * shadowDist, 10 * shadowDist, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Occlusione di contatto scura direttamente sotto le zampine (non vola mai!)
  ctx.fillStyle = `rgba(20, 10, 5, ${0.75 * shadowDist})`;
  ctx.beginPath();
  ctx.ellipse(groundPos.sx, groundPos.sy + 3, 14 * shadowDist, 5 * shadowDist, 0, 0, Math.PI * 2);
  ctx.fill();

  const isWalking = p.moving;
  const isAirborne = p.wz > 0.05 || Math.abs(p.vz) > 0.1;

  let sprite: HTMLImageElement | null = null;
  let sxScale = 1;
  let syScale = 1;
  let rot = 0;
  let offsetY = 0;

  if (isAirborne) {
    // In volo (rimbalzo dal trampolino BOING!)
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

    // Oscillazione ritmica (waddle)
    rot = stepPhase * 0.075;

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

/** Renderizza un portale stanza con il maestoso arco in pietra 3D orientato in asse con il muro del livello. */
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
  const flip = portal.flip ?? 1;

  // 0. Ombra a terra del portale e soglia in pietra scolpita (non vola mai!)
  // Ombra diffusa a terra
  ctx.fillStyle = "rgba(45, 20, 10, 0.4)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 3, 32, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Occlusione di contatto profonda alla base dei due pilastri dell'arco
  ctx.fillStyle = "rgba(20, 10, 5, 0.75)";
  ctx.beginPath();
  ctx.ellipse(sx - 18 * flip, sy + 2, 8, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(sx + 18 * flip, sy + 2, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Zerbino / soglia d'ingresso in pietra
  ctx.fillStyle = portal.locked ? "rgba(156, 163, 175, 0.3)" : "rgba(217, 119, 6, 0.35)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 2, 22, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // 1. Struttura portale: arco in pietra scolpita orientato in asse con il rispettivo muro
  const archImg = art.hub.arch;
  const archH = 98;

  if (archImg) {
    const archW = archH * (archImg.width / archImg.height);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(flip, 1);
    if (portal.locked) {
      // Porta chiusa: ombra più scura
      ctx.filter = "brightness(0.72) saturate(0.85)";
    }
    ctx.drawImage(archImg, -archW / 2, -archH + 6, archW, archH);
    ctx.restore();

    // Se aperta: luce calda ambrata brillante che fuoriesce dalla soglia
    if (!portal.locked) {
      const glow = ctx.createRadialGradient(sx, sy - 44, 4, sx, sy - 44, 32);
      glow.addColorStop(0, "rgba(254, 240, 138, 0.5)");
      glow.addColorStop(1, "rgba(254, 240, 138, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(sx, sy - 44, 24, 32, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (art.door) {
    const doorH = 74;
    const doorW = doorH * (art.door.width / art.door.height);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(flip, 1);
    if (portal.locked) ctx.filter = "brightness(0.65) saturate(0.8)";
    ctx.drawImage(art.door, -doorW / 2, -doorH, doorW, doorH);
    ctx.restore();
  }

  // Se è il Bagno d'Oro: posiziona la tazza del water scintillante con ombra a terra (non volante!)
  if (isGoal && art.toilet) {
    const th = 48;
    const tw = th * (art.toilet.width / art.toilet.height);
    const tx = sx + 34;
    const ty = sy + 2;

    // Ombra di contatto sotto il trono dorato del water
    ctx.fillStyle = "rgba(40, 20, 10, 0.55)";
    ctx.beginPath();
    ctx.ellipse(tx + tw / 2, ty, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const bob = Math.sin(t * 3.5) * 1.5;
    ctx.drawImage(art.toilet, tx, ty - th + bob, tw, th);
  }

  // 2. Insegna elegante in legno con Nome Stanza & Icona (sempre orizzontale e leggibile)
  const badgeY = sy - archH - 10;
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

  // 3. Stelline d'oro guadagnate
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

    // Se trovata la Paperella d'Oro segreta: mostra il trofeo d'arte
    if (portal.duck) {
      if (art.goldduck) {
        ctx.drawImage(art.goldduck, sx + 36, badgeY - 12, 22, 22);
      }
    }
  } else {
    // Lucchetto d'ottone al centro dell'arco chiuso
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🔒", sx, sy - 42);
  }
}

/** Renderizza gli amici NPC usando gli sprite 3D illustrati originali saldati al terreno. */
function drawNpc(
  ctx: CanvasRenderingContext2D,
  npc: NpcInfo,
  art: Art,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(npc.wx, npc.wy, 0, camX, camY);

  // 1. Ombra a doppio strato: diffusa a terra + occlusione di contatto profonda sotto le zampe
  ctx.fillStyle = "rgba(60, 30, 15, 0.35)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 3, 26, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(20, 10, 5, 0.75)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 3, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  // Piedini sempre saldati a terra (sy + 4), respiro naturale con leggera oscillazione volumetrica
  const breath = Math.sin(t * 2.8 + (npc.wx % 4)) * 0.025;
  ctx.translate(sx, sy + 4);
  ctx.scale(1 - breath * 0.4, 1 + breath);

  let labelY = -80;

  if (npc.id === "mamma") {
    // 🐻 MAMMA ORSA: Sprite 3D illustrato con grembiule floreale e cuffietta bianca
    const img = art.hub.mamma;
    const h = 88;
    if (img) {
      const w = h * (img.width / img.height);
      ctx.drawImage(img, -w / 2, -h, w, h);
    }
    labelY = -h - 8;
  } else if (npc.id === "papa") {
    // 🧸 PAPÀ ORSO: Sprite 3D illustrato con gilet blu in lana e occhialetti da lettura
    const img = art.hub.papa;
    const h = 96;
    if (img) {
      const w = h * (img.width / img.height);
      ctx.drawImage(img, -w / 2, -h, w, h);
    }
    labelY = -h - 8;
  } else if (npc.id === "micio") {
    // 🐱 MICIO IL GATTO: Sprite 3D addormentato sul soffice cuscino rosa (art.pillow)
    if (art.pillow) {
      const pw = 68;
      const ph = pw * (art.pillow.height / art.pillow.width);
      ctx.drawImage(art.pillow, -pw / 2, -ph + 4, pw, ph);
    }
    const catImg = art.hub.micio;
    const cw = 56;
    if (catImg) {
      const ch = cw * (catImg.height / catImg.width);
      ctx.drawImage(catImg, -cw / 2, -ch - 2, cw, ch);
    }

    // Nuvoletta Zzz fluttuante
    ctx.font = '800 13px "Fredoka", sans-serif';
    ctx.fillStyle = "rgba(168, 85, 247, 0.9)";
    ctx.fillText("Zzz...", 20, -44 + Math.sin(t * 2) * 3);
    labelY = -62;
  }

  // Nome sopra l'NPC in stampatello chiaro
  ctx.font = '800 12px "Fredoka", "Nunito", sans-serif';
  ctx.textAlign = "center";
  ctx.fillStyle = "#451a03";
  ctx.fillText(npc.name, 0, labelY);

  ctx.restore();
}

/** Fontana monumentale in marmo con Paperella d'Oro 3D illustrata (art.hub.fountain). */
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

  // Ombra monumentale a terra a doppio strato
  ctx.fillStyle = "rgba(60, 30, 15, 0.38)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 6, 56, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Occlusione di contatto profonda sotto il basamento in pietra
  ctx.fillStyle = "rgba(20, 10, 5, 0.75)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 6, 44, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  const img = art.hub.fountain;
  const fw = 118;
  if (img) {
    const fh = fw * (img.height / img.width);
    ctx.drawImage(img, sx - fw / 2, sy - fh + 8, fw, fh);
  }

  // Scintille d'oro magiche fluttuanti dall'acqua
  for (let s = 0; s < 4; s++) {
    const spX = sx + Math.sin(t * 3 + s * 1.8) * 30;
    const spY = sy - 42 - ((t * 20 + s * 15) % 38);
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(spX, spY, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(spX - 0.5, spY - 0.5, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Gazebo del Bazar delle Stelline con Babbo Coniglio illustrato (art.hub.bazar). */
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

  // 1. Ombra diffusa sotto l'intero gazebo del bazar
  ctx.fillStyle = "rgba(60, 30, 15, 0.35)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 6, 54, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Occlusione di contatto profonda sotto i piedi d'appoggio in legno
  ctx.fillStyle = "rgba(20, 10, 5, 0.75)";
  ctx.beginPath();
  ctx.ellipse(sx - 26, sy + 5, 10, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(sx + 26, sy + 5, 10, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(sx, sy + 6, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const img = art.hub.bazar;
  const bw = 120;
  if (img) {
    const bh = bw * (img.height / img.width);
    ctx.drawImage(img, sx - bw / 2, sy - bh + 6, bw, bh);
  }

  // Insegna fluttuante sopra il bazar
  const tagY = sy - 114;
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.beginPath();
  ctx.roundRect(sx - 44, tagY - 12, 88, 24, 12);
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.font = '800 11px "Fredoka", "Nunito", sans-serif';
  ctx.fillStyle = "#713f12";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🛍️ BAZAR", sx, tagY);
}

/** Trampolino elastico giocattolo 3D illustrato (art.hub.trampoline). */
function drawCourtyardTrampoline(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  art: Art,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(wx, wy, 0, camX, camY);

  // 1. Ombra diffusa a terra sotto il tappeto elastico
  ctx.fillStyle = "rgba(50, 25, 10, 0.32)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 5, 38, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Occlusione di contatto profonda sotto le gambe in acciaio
  ctx.fillStyle = "rgba(15, 10, 5, 0.75)";
  ctx.beginPath();
  ctx.ellipse(sx - 22, sy + 5, 6, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(sx + 22, sy + 5, 6, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(sx, sy + 6, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  const img = art.hub.trampoline;
  const trW = 78;
  if (img) {
    const trH = trW * (img.height / img.width);
    ctx.drawImage(img, sx - trW / 2, sy - trH + 6, trW, trH);
  }

  // Freccia e indicatore di salto BOING!
  const arrowBob = Math.sin(t * 6) * 3;
  ctx.fillStyle = "#0284c7";
  ctx.beginPath();
  ctx.roundRect(sx - 36, sy - 54 + arrowBob, 72, 22, 11);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.font = '800 11px "Fredoka", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⬆️ BOING!", sx, sy - 43 + arrowBob);
}

/** Pallone da spiaggia con rendering volumetrico 3D. */
function drawBeachBall(
  ctx: CanvasRenderingContext2D,
  ball: HubState["toys"]["ball"],
  camX: number,
  camY: number,
) {
  const { sx, sy } = worldToScreen(ball.wx, ball.wy, ball.wz, camX, camY);

  // Ombra a terra del pallone
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
  ctx.fillStyle = "#eab308";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, 0, Math.PI * 0.65);
  ctx.closePath();
  ctx.fill();

  // Spicchio blu
  ctx.fillStyle = "#3b82f6";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, Math.PI * 0.65, Math.PI * 1.35);
  ctx.closePath();
  ctx.fill();

  // Giunzioni bianche
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Riflesso speculare lucido
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.35, r * 0.22, -0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Alberi di mele e cespugli di rose illustrati (art.hub.tree, art.hub.bush). */
function drawDecorTree(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  kind: string,
  art: Art,
  camX: number,
  camY: number,
  _t: number,
) {
  const { sx, sy } = worldToScreen(wx, wy, 0, camX, camY);

  if (kind === "apple") {
    // Ombra diffusa albero
    ctx.fillStyle = "rgba(60, 30, 15, 0.35)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 4, 30, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Occlusione di contatto profonda sotto il tronco
    ctx.fillStyle = "rgba(20, 10, 5, 0.75)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 4, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const img = art.hub.tree;
    const tw = 92;
    if (img) {
      const th = tw * (img.height / img.width);
      ctx.drawImage(img, sx - tw / 2, sy - th + 8, tw, th);
    }
  } else {
    // Cespuglio di rose fiorite
    ctx.fillStyle = "rgba(60, 30, 15, 0.3)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 3, 24, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(20, 10, 5, 0.7)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 3, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const img = art.hub.bush;
    const bw = 58;
    if (img) {
      const bh = bw * (img.height / img.width);
      ctx.drawImage(img, sx - bw / 2, sy - bh + 6, bw, bh);
    }
  }
}

/** Staccionata in legno bianco con fiori rampicanti (art.hub.fence). */
function drawGardenFence(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  art: Art,
  camX: number,
  camY: number,
) {
  const { sx, sy } = worldToScreen(wx, wy, 0, camX, camY);

  // Ombra diffusa staccionata
  ctx.fillStyle = "rgba(60, 30, 15, 0.28)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 3, 26, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Occlusione di contatto sotto i paletti
  ctx.fillStyle = "rgba(20, 10, 5, 0.65)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 3, 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const img = art.hub.fence;
  const fw = 60;
  if (img) {
    const fh = fw * (img.height / img.width);
    ctx.drawImage(img, sx - fw / 2, sy - fh + 6, fw, fh);
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
