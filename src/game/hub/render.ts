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
        hub.player,
        hub.toys.trampoline.radius,
      ),
  });

  // Pallone da spiaggia rimbalzante
  const ball = hub.toys.ball;
  const tramp = hub.toys.trampoline;
  const distBallTramp = Math.hypot(ball.wx - tramp.wx, ball.wy - tramp.wy);
  const isBallOnTramp = distBallTramp < tramp.radius * 1.35;
  const ballDepth = isBallOnTramp
    ? getDepth(tramp.wx, tramp.wy, 0) + 0.55 + ball.wz * 0.01
    : getDepth(ball.wx, ball.wy, ball.wz);

  items.push({
    depth: ballDepth,
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

  // Risoluzione intelligente profondità Z-index:
  // Se l'orsetto è sul trampolino o sta saltando sopra di esso, DEVE essere disegnato DAVANTI al trampolino!
  const distTramp = Math.hypot(p.wx - tramp.wx, p.wy - tramp.wy);
  const isInteractingWithTrampoline =
    distTramp < tramp.radius * 1.35 ||
    (distTramp < tramp.radius * 1.85 && (p.wz > 0.05 || Math.abs(p.vz) > 0.1));

  const playerDepth = isInteractingWithTrampoline
    ? getDepth(tramp.wx, tramp.wy, 0) + 0.6 + p.wz * 0.01
    : getDepth(p.wx, p.wy, 0) + 0.05;

  items.push({
    depth: playerDepth,
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

/**
 * Disegna un'ombra realistica e morbida con caduta radiale graduale (penombra),
 * zero bordi netti, sfumatura naturale a zero e colorazione armonizzata al terreno (prato, cotto, legno, terrazzo).
 */
export function drawSoftShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  options: {
    maxAlpha?: number;
    tone?: "grass" | "warm" | "cool";
    contactRatio?: number;
    contactAlpha?: number;
  } = {},
) {
  if (rx <= 0 || ry <= 0) return;
  const maxAlpha = options.maxAlpha ?? 0.32;
  const tone = options.tone ?? "warm";
  const contactRatio = options.contactRatio ?? 0.45;
  const contactAlpha = options.contactAlpha ?? 0.22;

  // Tonalità calda e naturale specifica per il tipo di pavimentazione:
  // - grass: verde sottobosco profondo, naturale e rigoglioso (mai più buchi neri o macchie scure sul prato!)
  // - cool: ardesia e indaco per piastrelle azzurre del terrazzo
  // - warm: terra d'ombra bruciata e noce per cotto toscano e parquet in legno
  let rgb = "52, 28, 12";
  if (tone === "grass") {
    rgb = "18, 52, 24";
  } else if (tone === "cool") {
    rgb = "25, 42, 65";
  }

  ctx.save();
  ctx.translate(cx, cy);
  // Trasforma il cerchio radiale in ellisse isometrica con perfetta proporzione d'aspetto
  ctx.scale(1, ry / rx);

  // 1. Penombra diffusa ampia con decadimento dolce a zero
  const grad = ctx.createRadialGradient(0, 0, rx * 0.08, 0, 0, rx);
  grad.addColorStop(0, `rgba(${rgb}, ${maxAlpha})`);
  grad.addColorStop(0.35, `rgba(${rgb}, ${maxAlpha * 0.72})`);
  grad.addColorStop(0.7, `rgba(${rgb}, ${maxAlpha * 0.3})`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();

  // 2. Micro-occlusione di contatto soffusa al centro (ancora l'oggetto al suolo senza macchie dure)
  if (contactRatio > 0 && contactAlpha > 0) {
    const cr = rx * contactRatio;
    const cGrad = ctx.createRadialGradient(0, 0, cr * 0.05, 0, 0, cr);
    cGrad.addColorStop(0, `rgba(${rgb}, ${contactAlpha})`);
    cGrad.addColorStop(0.5, `rgba(${rgb}, ${contactAlpha * 0.5})`);
    cGrad.addColorStop(1, `rgba(${rgb}, 0)`);

    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.arc(0, 0, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Disegna una targhetta / pill badge in stile cartoon 3D per porte, NPC e bazar.
 * Dotata di ombra soffusa fluttuante, gradiente smaltato, bordo dorato o a tema,
 * icona dedicata in cerchietto, testo chiaro in stampatello e stelline opzionali integrate.
 */
function drawHubPillBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  title: string,
  icon?: string,
  options: {
    theme?: "gold" | "pink" | "blue" | "purple" | "locked" | "cyan";
    stars?: number;
    hasDuck?: boolean;
    art?: Art;
    scale?: number;
  } = {},
) {
  const { theme = "gold", stars, hasDuck, art, scale = 1 } = options;

  ctx.save();
  ctx.translate(x, y);
  if (scale !== 1) ctx.scale(scale, scale);

  ctx.font = '900 11.5px "Fredoka", "Nunito", sans-serif';
  const textMetrics = ctx.measureText(title);
  const textW = textMetrics.width;

  const iconW = icon ? 22 : 0;
  const paddingX = 13;
  const pillW = Math.max(76, textW + iconW + paddingX * 2);
  const pillH = 26;
  const r = 13;

  // 1. Ombra soffusa fluttuante della targhetta
  ctx.shadowColor = "rgba(45, 20, 10, 0.22)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2.5;

  // 2. Colori tema e gradiente sfumato morbido
  let gradTop = "#ffffff";
  let gradBottom = "#fffbeb";
  let borderColor = "#f59e0b";
  let textColor = "#451a03";
  let iconBg = "rgba(254, 243, 199, 0.9)";

  if (theme === "pink") {
    gradBottom = "#fdf2f8";
    borderColor = "#f472b6";
    textColor = "#831843";
    iconBg = "rgba(252, 231, 243, 0.95)";
  } else if (theme === "blue") {
    gradBottom = "#eff6ff";
    borderColor = "#60a5fa";
    textColor = "#1e3a8a";
    iconBg = "rgba(219, 234, 254, 0.95)";
  } else if (theme === "purple") {
    gradBottom = "#faf5ff";
    borderColor = "#c084fc";
    textColor = "#581c87";
    iconBg = "rgba(243, 232, 255, 0.95)";
  } else if (theme === "cyan") {
    gradTop = "#38bdf8";
    gradBottom = "#0284c7";
    borderColor = "#ffffff";
    textColor = "#ffffff";
    iconBg = "rgba(255, 255, 255, 0.25)";
  } else if (theme === "locked") {
    gradTop = "#f9fafb";
    gradBottom = "#e5e7eb";
    borderColor = "#9ca3af";
    textColor = "#4b5563";
    iconBg = "rgba(209, 213, 219, 0.95)";
  }

  const grad = ctx.createLinearGradient(0, -pillH / 2, 0, pillH / 2);
  grad.addColorStop(0, gradTop);
  grad.addColorStop(1, gradBottom);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-pillW / 2, -pillH / 2, pillW, pillH, r);
  ctx.fill();

  // Reset ombra per il bordo e i testi
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Bordo lucido
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Highlight bianco superiore (effetto rilievo 3D smaltato)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-pillW / 2 + 1.5, -pillH / 2 + 1.5, pillW - 3, pillH / 2, [r, r, 0, 0]);
  ctx.stroke();

  // Icona circolare dedicata
  let textStartX = -pillW / 2 + paddingX;
  if (icon) {
    const iconCx = -pillW / 2 + 14;
    ctx.fillStyle = iconBg;
    ctx.beginPath();
    ctx.arc(iconCx, 0, 9.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '12px sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(icon, iconCx, 0.5);

    textStartX = iconCx + 13;
  }

  // Testo in stampatello ad alta leggibilità
  ctx.font = '900 11.5px "Fredoka", "Nunito", sans-serif';
  ctx.textAlign = icon ? "left" : "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = textColor;
  ctx.fillText(title, icon ? textStartX : 0, 0.5);

  // Stelline per i livelli delle stanze (archetto o pill sopra la targhetta)
  if (stars !== undefined && theme !== "locked") {
    const starY = -pillH / 2 - 9;
    const starSpacing = 13;
    const totalW = 2 * starSpacing;
    const startX = -totalW / 2;

    for (let s = 0; s < 3; s++) {
      const sx = startX + s * starSpacing;
      const got = s < stars;
      if (got && art?.star) {
        ctx.drawImage(art.star, sx - 6, starY - 6, 12, 12);
      } else {
        ctx.font = '10px sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(got ? "⭐" : "▫️", sx, starY);
      }
    }

    if (hasDuck && art?.goldduck) {
      ctx.drawImage(art.goldduck, pillW / 2 + 3, -11, 20, 20);
    }
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
    drawSoftShadow(ctx, sx, sy + slabH + 8, 38, 14, {
      tone: "warm",
      maxAlpha: 0.16,
      contactRatio: 0,
    });
  }
  for (let y = minY; y <= maxY; y++) {
    const { sx, sy } = worldToScreen(maxX, y, 0, camX, camY);
    drawSoftShadow(ctx, sx, sy + slabH + 8, 38, 14, {
      tone: "warm",
      maxAlpha: 0.16,
      contactRatio: 0,
    });
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

  // Ombra morbida e soffusa ad alta fedeltà con tonalità armonizzata al terreno
  const shadowDist = Math.max(0.28, 1 - p.wz * 0.28);
  const groundPos = worldToScreen(p.wx, p.wy, 0, camX, camY);
  const bearTone: "grass" | "warm" | "cool" =
    p.wx >= 11.5 && p.wy >= 11.5
      ? "grass"
      : p.wx >= 12 && p.wy < 8.5
      ? "cool"
      : "warm";

  drawSoftShadow(
    ctx,
    groundPos.sx,
    groundPos.sy + 3,
    26 * shadowDist,
    11 * shadowDist,
    {
      tone: bearTone,
      maxAlpha: 0.36 * shadowDist,
      contactRatio: 0.48,
      contactAlpha: 0.22 * shadowDist,
    },
  );

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

  // 0. Ombra soffusa a terra del portale e soglia in pietra scolpita
  const portalTone: "cool" | "warm" = portal.index === 6 ? "cool" : "warm";
  drawSoftShadow(ctx, sx, sy + 3, 34, 14, {
    tone: portalTone,
    maxAlpha: 0.32,
    contactRatio: 0.52,
    contactAlpha: 0.2,
  });

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

    // Ombra morbida sotto il trono dorato del water
    drawSoftShadow(ctx, tx + tw / 2, ty, 18, 8, {
      tone: "warm",
      maxAlpha: 0.35,
      contactRatio: 0.45,
    });

    const bob = Math.sin(t * 3.5) * 1.5;
    ctx.drawImage(art.toilet, tx, ty - th + bob, tw, th);
  }

  // 2. Insegna cartoon 3D a pillola elegante per la stanza
  const badgeY = sy - archH - 14;
  drawHubPillBadge(ctx, sx, badgeY, portal.name, portal.icon, {
    theme: portal.locked ? "locked" : "gold",
    stars: portal.stars,
    hasDuck: portal.duck,
    art,
  });

  if (portal.locked) {
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

  // 1. Ombra soffusa a terra armonizzata alla pavimentazione (prato per Papà Orso, cotto per Mamma e Micio)
  const npcTone: "grass" | "warm" =
    npc.wx >= 11.5 && npc.wy >= 11.5 ? "grass" : "warm";

  drawSoftShadow(ctx, sx, sy + 3, 28, 12, {
    tone: npcTone,
    maxAlpha: 0.35,
    contactRatio: 0.5,
    contactAlpha: 0.22,
  });

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
    drawHubPillBadge(ctx, 0, -h - 18, "MAMMA ORSA", "🌸", { theme: "pink" });
  } else if (npc.id === "papa") {
    // 🧸 PAPÀ ORSO: Sprite 3D illustrato con gilet blu in lana e occhialetti da lettura
    const img = art.hub.papa;
    const h = 96;
    if (img) {
      const w = h * (img.width / img.height);
      ctx.drawImage(img, -w / 2, -h, w, h);
    }
    drawHubPillBadge(ctx, 0, -h - 18, "PAPÀ ORSO", "👓", { theme: "blue" });
  } else if (npc.id === "micio") {
    // 🐱 MICIO IL GATTO: Sprite 3D addormentato sul soffice cuscino rosa (art.pillow)
    if (art.pillow) {
      const pw = 68;
      const ph = pw * (art.pillow.height / art.pillow.width);
      ctx.drawImage(art.pillow, -pw / 2, -ph + 4, pw, ph);
    }
    const catImg = art.hub.micio;
    const cw = 56;
    let ch = 40;
    if (catImg) {
      ch = cw * (catImg.height / catImg.width);
      ctx.drawImage(catImg, -cw / 2, -ch - 2, cw, ch);
    }

    // Nuvoletta Zzz fluttuante
    ctx.font = '800 13px "Fredoka", sans-serif';
    ctx.fillStyle = "rgba(168, 85, 247, 0.9)";
    ctx.fillText("Zzz...", 20, -44 + Math.sin(t * 2) * 3);
    drawHubPillBadge(ctx, 0, -ch - 24, "MICIO IL GATTO", "🐾", { theme: "purple" });
  } else {
    drawHubPillBadge(ctx, 0, labelY, npc.name, "⭐", { theme: "gold" });
  }

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

  // 1. Ombra della vasca circolare in marmo:
  // L'impronta della base sul pavimento in cotto è centrata a (sx, sy - 8).
  // Non sborda in avanti (elimina completamente l'effetto fluttuante/staccato da terra).
  drawSoftShadow(ctx, sx, sy - 8, 54, 18, {
    tone: "warm",
    maxAlpha: 0.38,
    contactRatio: 0.58,
    contactAlpha: 0.28,
  });

  // 2. Micro-occlusione di contatto marcata e stretta lungo il bordo inferiore della vasca
  // che tocca terra a sy + 3: salda fisicamente la vasca in marmo alle mattonelle di cotto.
  ctx.save();
  ctx.translate(sx, sy + 3);
  ctx.scale(1, 0.24);
  const contactGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 48);
  contactGrad.addColorStop(0, "rgba(52, 28, 12, 0.55)");
  contactGrad.addColorStop(0.65, "rgba(52, 28, 12, 0.25)");
  contactGrad.addColorStop(1, "rgba(52, 28, 12, 0)");
  ctx.fillStyle = contactGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

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

  // 1. Ombra diffusa proiettata sotto il bancone in legno, centrata nell'area di appoggio (sx + 2, sy - 12)
  // Non sborda MAI in avanti oltre i piedini anteriori sul pavimento!
  drawSoftShadow(ctx, sx + 2, sy - 12, 44, 18, {
    tone: "warm",
    maxAlpha: 0.38,
    contactRatio: 0.55,
    contactAlpha: 0.25,
  });

  // 2. Ombre di contatto dedicate e nette sotto ciascuno dei 4 piedini in legno della bancarella:
  // - Zampa anteriore destra (la più avanzata a destra): (sx + 20, sy + 5)
  // - Zampa anteriore sinistra: (sx - 34, sy - 17)
  // - Zampa laterale destra: (sx + 38, sy - 7)
  // - Zampa posteriore sinistra: (sx - 17, sy - 29)
  const legs = [
    { x: sx + 20, y: sy + 5, rx: 11, ry: 5.5, alpha: 0.52 },
    { x: sx - 34, y: sy - 17, rx: 10, ry: 5.0, alpha: 0.44 },
    { x: sx + 38, y: sy - 7, rx: 10, ry: 5.0, alpha: 0.44 },
    { x: sx - 17, y: sy - 29, rx: 8, ry: 4.0, alpha: 0.36 },
  ];

  for (const leg of legs) {
    drawSoftShadow(ctx, leg.x, leg.y, leg.rx, leg.ry, {
      tone: "warm",
      maxAlpha: leg.alpha,
      contactRatio: 0.68,
      contactAlpha: leg.alpha * 0.75,
    });
  }

  const img = art.hub.bazar;
  const bw = 120;
  if (img) {
    const bh = bw * (img.height / img.width);
    ctx.drawImage(img, sx - bw / 2, sy - bh + 6, bw, bh);
  }

  // Insegna cartoon 3D a pillola elegante sopra il bazar
  const tagY = sy - 116;
  drawHubPillBadge(ctx, sx, tagY, "BAZAR", "🛍️", { theme: "gold" });
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
  player: HubState["player"],
  radius: number,
) {
  const { sx, sy } = worldToScreen(wx, wy, 0, camX, camY);

  // Ombra soffusa botanica ad alta fedeltà sotto il tappeto elastico centrata sotto l'anello circolare:
  drawSoftShadow(ctx, sx, sy - 6, 38, 16, {
    tone: "grass",
    maxAlpha: 0.38,
    contactRatio: 0.52,
    contactAlpha: 0.22,
  });

  // Micro-occlusione di contatto per il piedino anteriore a terra (sx, sy + 3)
  drawSoftShadow(ctx, sx, sy + 3, 12, 5, {
    tone: "grass",
    maxAlpha: 0.48,
    contactRatio: 0.68,
    contactAlpha: 0.32,
  });

  const img = art.hub.trampoline;
  const trW = 78;
  if (img) {
    const trH = trW * (img.height / img.width);
    ctx.drawImage(img, sx - trW / 2, sy - trH + 6, trW, trH);
  }

  // Se l'orsetto è sul trampolino o sta rimbalzando in volo: NASCONDI la scritta statica!
  const dist = Math.hypot(player.wx - wx, player.wy - wy);
  const isInteracting =
    dist < radius * 1.35 ||
    (dist < radius * 1.85 && (player.wz > 0.05 || Math.abs(player.vz) > 0.1));

  if (!isInteracting) {
    // Indicatore invitante prima di salirci sopra: elegante targhetta cartoon che fluttua
    const arrowBob = Math.sin(t * 6) * 3;
    drawHubPillBadge(ctx, sx, sy - 60 + arrowBob, "BOING!", "⬆️", { theme: "cyan" });
  } else {
    // Quando ci salti sopra: NESSUNA SCRITTA che copre l'orsetto!
    // Solo un effetto cartoon di onda elastica dinamica sul tappeto
    const ripple = (t * 4) % 1;
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.75 * (1 - ripple)})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(sx, sy - 16, 16 + ripple * 16, 8 + ripple * 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Pallone da spiaggia gonfiabile con modellazione sferica volumetrica 3D, riflessi vinilici e keepy-uppy. */
function drawBeachBall(
  ctx: CanvasRenderingContext2D,
  ball: HubState["toys"]["ball"],
  camX: number,
  camY: number,
) {
  const { sx, sy } = worldToScreen(ball.wx, ball.wy, ball.wz, camX, camY);

  // 1. Scintille e stelline magiche (disegnate attorno al pallone)
  if (ball.sparks && ball.sparks.length > 0) {
    for (const spark of ball.sparks) {
      const spScreen = worldToScreen(spark.x, spark.y, spark.z, camX, camY);
      ctx.save();
      ctx.translate(spScreen.sx, spScreen.sy);
      ctx.rotate(spark.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, spark.alpha));
      ctx.fillStyle = spark.color;

      const ss = spark.size;
      ctx.beginPath();
      ctx.moveTo(0, -ss);
      ctx.quadraticCurveTo(0, 0, ss, 0);
      ctx.quadraticCurveTo(0, 0, 0, ss);
      ctx.quadraticCurveTo(0, 0, -ss, 0);
      ctx.quadraticCurveTo(0, 0, 0, -ss);
      ctx.fill();

      // Centro luminoso bianco
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, ss * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 2. Ombra a terra del pallone soffusa e scalata con l'altezza
  const shadowDist = Math.max(0.18, 1 - ball.wz * 0.22);
  const groundPos = worldToScreen(ball.wx, ball.wy, 0, camX, camY);
  const ballTone: "grass" | "warm" =
    ball.wx >= 11.5 && ball.wy >= 11.5 ? "grass" : "warm";

  const squish = Math.max(-0.4, Math.min(0.65, ball.squish || 0));
  const groundSquishX = 1 + squish * 0.35;
  const groundSquishY = 1 - squish * 0.25;

  drawSoftShadow(
    ctx,
    groundPos.sx,
    groundPos.sy + 2,
    22 * shadowDist * groundSquishX,
    11 * shadowDist * groundSquishY,
    {
      tone: ballTone,
      maxAlpha: 0.38 * shadowDist,
      contactRatio: 0.45,
      contactAlpha: 0.22 * shadowDist,
    },
  );

  // 3. Deformazione elastica Squash & Stretch
  const r = ball.radius * 30; // Raggio sferico generoso e ben visibile
  const scaleX = 1 + squish * 0.42;
  const scaleY = 1 - squish * 0.36;

  // 4. Rendering volumetrico 3D della sfera gonfiabile
  ctx.save();
  ctx.translate(sx, sy);

  // Maschera circolare / ellittica con squish
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * scaleX, r * scaleY, 0, 0, Math.PI * 2);
  ctx.clip();

  // Spicchi longitudinali gonfiabili (6 colori estivi vivaci alternati)
  const PANELS = [
    { top: "#ff4d4f", bot: "#cf1322" }, // Rosso corallo vivace
    { top: "#ffd666", bot: "#d48806" }, // Giallo sole caldo
    { top: "#4096ff", bot: "#0958d9" }, // Blu cielo intenso
    { top: "#ffffff", bot: "#d9d9d9" }, // Bianco vinile perlato
    { top: "#52c41a", bot: "#237804" }, // Verde smeraldo brillante
    { top: "#ff9c6e", bot: "#d4380d" }, // Arancione mandarino
  ];

  // Polo superiore inclinato per prospettiva isometrica (~35 gradi verso la camera)
  const poleX = 0;
  const poleY = -r * 0.28 * scaleY;

  // Disegno dei 6 settori curvi dalla calotta polare al perimetro
  const panelStep = (Math.PI * 2) / 6;
  for (let i = 0; i < 6; i++) {
    const theta0 = ball.rotation + i * panelStep;
    const theta1 = theta0 + panelStep;

    ctx.beginPath();
    ctx.moveTo(poleX, poleY);

    // Bordo curvo perimetrale
    const steps = 8;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const ang = theta0 + (theta1 - theta0) * t;
      const px = Math.cos(ang) * (r * 1.08 * scaleX);
      const py = Math.sin(ang) * (r * 1.08 * scaleY);
      ctx.lineTo(px, py);
    }
    ctx.closePath();

    // Gradiente radiale dal polo verso il bordo per dare luce e consistenza ai pannelli
    const panelGrad = ctx.createRadialGradient(poleX, poleY, r * 0.08, 0, 0, r * 1.15);
    panelGrad.addColorStop(0, PANELS[i]!.top);
    panelGrad.addColorStop(1, PANELS[i]!.bot);
    ctx.fillStyle = panelGrad;
    ctx.fill();
  }

  // Saldature bianche a caldo tra i pannelli di plastica
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 6; i++) {
    const ang = ball.rotation + i * panelStep;
    const px = Math.cos(ang) * (r * 1.08 * scaleX);
    const py = Math.sin(ang) * (r * 1.08 * scaleY);
    ctx.beginPath();
    ctx.moveTo(poleX, poleY);
    ctx.lineTo(px, py);
    ctx.stroke();
  }

  // Calotta polare superiore in vinile bianco (patch di rinforzo classica)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(poleX, poleY, r * 0.24 * scaleX, r * 0.16 * scaleY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(203, 213, 225, 0.9)";
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // Valvola di gonfiaggio trasparente con tappino
  ctx.fillStyle = "rgba(241, 245, 249, 0.95)";
  ctx.beginPath();
  ctx.ellipse(poleX + 1.2, poleY - 1, r * 0.09 * scaleX, r * 0.06 * scaleY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(100, 116, 139, 0.8)";
  ctx.beginPath();
  ctx.arc(poleX + 1.2, poleY - 1, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Ombreggiatura volumetrica 3D della sfera (luce solare in alto a sinistra, ombra in basso a destra)
  const lightX = -r * 0.35 * scaleX;
  const lightY = -r * 0.35 * scaleY;
  const sphereShade = ctx.createRadialGradient(lightX, lightY, r * 0.15, 0, 0, r * 1.05);
  sphereShade.addColorStop(0, "rgba(255, 255, 255, 0.36)");
  sphereShade.addColorStop(0.48, "rgba(255, 255, 255, 0.0)");
  sphereShade.addColorStop(0.78, "rgba(15, 10, 30, 0.22)");
  sphereShade.addColorStop(1, "rgba(15, 10, 25, 0.58)");
  ctx.fillStyle = sphereShade;
  ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);

  // Riflesso speculare lucido in vinile plastico (highlight a lente)
  ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
  ctx.beginPath();
  ctx.ellipse(
    -r * 0.36 * scaleX,
    -r * 0.36 * scaleY,
    r * 0.34 * scaleX,
    r * 0.20 * scaleY,
    -0.62,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Punto luce brillio diamante nel riflesso
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-r * 0.44 * scaleX, -r * 0.44 * scaleY, r * 0.09, 0, Math.PI * 2);
  ctx.fill();

  // Rimbalzo di luce calda riflessa da terra sul bordo inferiore
  const bounceRim = ctx.createRadialGradient(
    0,
    r * 0.82 * scaleY,
    0,
    0,
    r * 0.82 * scaleY,
    r * 0.45,
  );
  bounceRim.addColorStop(0, "rgba(255, 235, 190, 0.28)");
  bounceRim.addColorStop(1, "rgba(255, 235, 190, 0.0)");
  ctx.fillStyle = bounceRim;
  ctx.fillRect(-r * 1.2, 0, r * 2.4, r * 1.2);

  // Chiusura maschera
  ctx.restore();

  // Bordo esterno smussato in vinile trasparente
  ctx.beginPath();
  ctx.ellipse(0, 0, r * scaleX, r * scaleY, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.restore();

  // 5. Targhetta fluttuante per il minigioco "Keepy-Uppy / Palleggi"
  if (ball.combo && ball.combo > 0) {
    const pop = ball.comboPop || 0;
    const badgeY = sy - r * scaleY - 24 - pop * 6;

    let comboTitle = "1 PALLEGGIO";
    let comboIcon = "⚽";
    let comboTheme: "blue" | "cyan" | "gold" | "pink" = "blue";

    if (ball.combo === 2) {
      comboTitle = "2 PALLEGGI!";
      comboIcon = "⭐";
      comboTheme = "cyan";
    } else if (ball.combo === 3) {
      comboTitle = "TRIPLETTA!";
      comboIcon = "🌟";
      comboTheme = "gold";
    } else if (ball.combo === 4) {
      comboTitle = "SUPER PALLEGGIO!";
      comboIcon = "🔥";
      comboTheme = "pink";
    } else if (ball.combo >= 5) {
      comboTitle = `${ball.combo} CAMPIONE!`;
      comboIcon = "👑";
      comboTheme = "gold";
    }

    const badgeScale = (1 + pop * 0.26) * Math.min(1, (ball.comboTimer || 1) * 2);
    if (badgeScale > 0.1) {
      drawHubPillBadge(ctx, sx, badgeY, comboTitle, comboIcon, {
        theme: comboTheme,
        scale: badgeScale,
      });
    }
  }
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
  const isGrass = wx >= 11.5 && wy >= 11.5;
  const treeTone: "grass" | "warm" = isGrass ? "grass" : "warm";

  if (kind === "apple") {
    // Ombra diffusa e soffusa alla base del tronco (mai più buchi neri sul prato!)
    drawSoftShadow(ctx, sx, sy + 4, 34, 16, {
      tone: treeTone,
      maxAlpha: 0.35,
      contactRatio: 0.45,
      contactAlpha: 0.22,
    });

    const img = art.hub.tree;
    const tw = 92;
    if (img) {
      const th = tw * (img.height / img.width);
      ctx.drawImage(img, sx - tw / 2, sy - th + 8, tw, th);
    }
  } else {
    // Cespuglio di rose fiorite
    drawSoftShadow(ctx, sx, sy + 3, 26, 12, {
      tone: treeTone,
      maxAlpha: 0.32,
      contactRatio: 0.4,
      contactAlpha: 0.2,
    });

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

  // Ombra soffusa staccionata sul terrazzo
  drawSoftShadow(ctx, sx, sy + 3, 28, 12, {
    tone: "cool",
    maxAlpha: 0.28,
    contactRatio: 0.4,
    contactAlpha: 0.16,
  });

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
  // Tracciato intelligente a zampine dorate tratteggiate verso la meta
  if (target.path && target.path.length > 0) {
    const startIdx = target.waypointIndex ?? 0;
    ctx.save();
    ctx.strokeStyle = "rgba(251, 191, 36, 0.45)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    for (let i = startIdx; i < target.path.length; i++) {
      const pt = target.path[i]!;
      const pos = worldToScreen(pt.wx, pt.wy, 0, camX, camY);
      if (i === startIdx) ctx.moveTo(pos.sx, pos.sy);
      else ctx.lineTo(pos.sx, pos.sy);
    }
    ctx.stroke();

    // Piccoli puntini dorati lungo i waypoint
    ctx.setLineDash([]);
    for (let i = startIdx; i < target.path.length; i++) {
      const pt = target.path[i]!;
      const pos = worldToScreen(pt.wx, pt.wy, 0, camX, camY);
      ctx.fillStyle = "rgba(251, 191, 36, 0.75)";
      ctx.beginPath();
      ctx.arc(pos.sx, pos.sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const { sx, sy } = worldToScreen(target.wx, target.wy, 0, camX, camY);
  const pulse = Math.sin(t * 8) * 3;

  ctx.strokeStyle = "rgba(251, 191, 36, 0.9)";
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 20 + pulse, 10 + pulse * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Impronta zampina d'orso centrale
  ctx.font = "16px sans-serif";
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
