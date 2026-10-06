import type { HubState, PortalInfo, NpcInfo } from "@/game/hub/types";
import type { Art } from "@/game/assets";
import { worldToScreen, getDepth } from "@/game/hub/coords";
import { drawHat } from "@/game/hub/cosmetics";
import { VIEW_W, VIEW_H } from "@/game/types";

type Renderable = {
  depth: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
};

/** Renderizza l'intero diorama isometrico dell'Hub su canvas. */
export function renderHub(
  ctx: CanvasRenderingContext2D,
  hub: HubState,
  art: Art,
  equippedHat: string | null,
  dpr = 1,
) {
  ctx.save();
  // Centra la vista dell'Hub nello schermo
  const centerSx = VIEW_W / 2;
  const centerSy = VIEW_H / 2;

  const camX = hub.cam.x - centerSx;
  const camY = hub.cam.y - centerSy;

  // 1. Sfondo generale del diorama (atmosfera calda da cameretta/giardino)
  drawHubBackground(ctx);

  // 2. Disegno della pavimentazione base (parquet, prato, vialetti)
  drawGroundTiles(ctx, camX, camY);

  // 3. Raccolta di tutti gli oggetti tridimensionali per l'ordinamento Y-sorting
  const items: Renderable[] = [];

  // Portali delle stanze
  for (const portal of hub.portals) {
    items.push({
      depth: getDepth(portal.wx, portal.wy, 0),
      draw: (c) => drawPortal(c, portal, camX, camY, hub.t),
    });
  }

  // NPC
  for (const npc of hub.npcs) {
    items.push({
      depth: getDepth(npc.wx, npc.wy, 0),
      draw: (c) => drawNpc(c, npc, camX, camY, hub.t),
    });
  }

  // Oggetti di scena e giocattoli
  // Gazebo dello shop
  items.push({
    depth: getDepth(9.5, 14.5, 0),
    draw: (c) => drawShopGazebo(c, 9.5, 14.5, camX, camY, hub.t),
  });

  // Fontana centrale con paperella
  items.push({
    depth: getDepth(11.5, 11.5, 0),
    draw: (c) => drawCentralFountain(c, 11.5, 11.5, camX, camY, hub.t),
  });

  // Trampolino nel cortile
  items.push({
    depth: getDepth(hub.toys.trampoline.wx, hub.toys.trampoline.wy, 0),
    draw: (c) => drawCourtyardTrampoline(c, hub.toys.trampoline.wx, hub.toys.trampoline.wy, camX, camY, hub.t),
  });

  // Pallone da gioco
  const ball = hub.toys.ball;
  items.push({
    depth: getDepth(ball.wx, ball.wy, ball.wz),
    draw: (c) => drawBeachBall(c, ball, camX, camY),
  });

  // Alberelli e cespugli decorativi
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

  // Nuvolette di borotalco dai piedi
  for (const puff of hub.player.dustPuffs) {
    items.push({
      depth: getDepth(puff.x, puff.y, 0) - 0.05,
      draw: (c) => {
        const { sx, sy } = worldToScreen(puff.x, puff.y, 0, camX, camY);
        c.fillStyle = `rgba(255, 245, 235, ${puff.alpha * 0.7})`;
        c.beginPath();
        c.arc(sx, sy, puff.r * 24, 0, Math.PI * 2);
        c.fill();
      },
    });
  }

  // L'Orsetto protagonista
  const p = hub.player;
  items.push({
    depth: getDepth(p.wx, p.wy, p.wz) + 0.05,
    draw: (c) => drawHubBear(c, p, art, equippedHat, camX, camY, hub.t),
  });

  // Ordinamento per profondità
  items.sort((a, b) => a.depth - b.depth);

  // Esecuzione del disegno ordinato
  for (const item of items) {
    item.draw(ctx);
  }

  // 4. Indicatori di mira e Tap-to-Move a terra
  if (hub.tapTarget) {
    drawTapIndicator(ctx, hub.tapTarget, camX, camY, hub.t);
  }

  // 5. Prompt interattivi fluttuanti ("💬 PARLA", "🚪 ENTRA")
  if (hub.activePortal) {
    drawPortalPrompt(ctx, hub.activePortal, camX, camY, hub.t);
  } else if (hub.activeNpc) {
    drawNpcPrompt(ctx, hub.activeNpc, camX, camY, hub.t);
  }

  // 6. Fumetto del dialogo attivo (se un NPC sta parlando)
  if (hub.dialogue) {
    drawDialogueBubble(ctx, hub.dialogue, hub.npcs, camX, camY);
  }

  ctx.restore();
}

function drawHubBackground(ctx: CanvasRenderingContext2D) {
  // Sfumatura calda color burro e pesca della stanza
  const bg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 80, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.75);
  bg.addColorStop(0, "#fffcf7");
  bg.addColorStop(0.6, "#faeedd");
  bg.addColorStop(1, "#eed4b5");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawGroundTiles(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
  // Griglia 22x22 del diorama
  for (let x = 3; x <= 20; x++) {
    for (let y = 3; y <= 20; y++) {
      const { sx, sy } = worldToScreen(x, y, 0, camX, camY);

      // Determina il tipo di pavimento in base alla zona
      const isCourtyard = Math.hypot(x - 11.5, y - 11.5) < 4.8;
      const isGarden = x >= 15 && y >= 10;
      const isTerrace = x >= 15 && y < 10;
      const isBedroom = x >= 10 && y <= 6;
      const isBathPlatform = x >= 9 && x <= 14 && y <= 4;

      let topColor = "#fbf4e4";
      let borderColor = "#eedfc6";

      if (isBathPlatform) {
        topColor = "#fdf2f8"; // marmo rosa chic per il bagno
        borderColor = "#fbcfe8";
      } else if (isCourtyard) {
        topColor = (x + y) % 2 === 0 ? "#ffeed9" : "#fbe3c7"; // cotto caldo
        borderColor = "#e8c9a3";
      } else if (isGarden) {
        topColor = (x + y) % 2 === 0 ? "#bbf7d0" : "#86efac"; // prato verde fresco
        borderColor = "#4ade80";
      } else if (isTerrace) {
        topColor = "#e0f2fe"; // piastrelle celesti terrazzo
        borderColor = "#bae6fd";
      } else if (isBedroom) {
        topColor = (x + y) % 2 === 0 ? "#fed7aa" : "#fdba74"; // parquet miele cameretta
        borderColor = "#fb923c";
      } else {
        // Parquet naturale della casa
        topColor = (x + y) % 2 === 0 ? "#fdedd6" : "#f5dec0";
        borderColor = "#e3c79e";
      }

      // Disegna il rombo isometrico della piastrella
      ctx.fillStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 16);
      ctx.lineTo(sx + 32, sy);
      ctx.lineTo(sx, sy + 16);
      ctx.lineTo(sx - 32, sy);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
}

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

  // Ombra di contatto a terra
  const shadowScale = Math.max(0.3, 1 - p.wz * 0.35);
  ctx.fillStyle = "rgba(70, 35, 15, 0.35)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 3, 20 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Selezione sprite (idle vs run)
  const isWalking = p.moving;
  const list = isWalking ? art.run : art.idle;
  const fps = isWalking ? 9 : 4;
  const frameIdx = Math.floor(t * fps) % (list.length || 1);
  const img = list[frameIdx] ?? art.idle[0];

  if (!img) return;

  ctx.save();
  // Altezza di rendering dell'orsetto
  const feetY = sy;
  const size = 68;

  // Waddle procedurale e inclinazione del passo
  const stepPhase = isWalking ? Math.sin(t * 14) : 0;
  const waddle = stepPhase * 0.06;
  const squash = isWalking ? 1 + Math.abs(stepPhase) * 0.05 : 1 + Math.sin(t * 3) * 0.02;

  ctx.translate(sx, feetY);
  ctx.scale(p.flip, 1);
  ctx.rotate(waddle);
  ctx.scale(1 / squash, squash);

  // Disegno dello sprite dell'orsetto
  ctx.drawImage(img, -size / 2, -size + 4, size, size);

  // Disegno dell'accessorio / cappellino equipaggiato in testa
  if (equippedHat) {
    const headX = 4;
    const headY = -size + 20;
    drawHat(ctx, equippedHat, headX, headY, 1, 1);
  }

  ctx.restore();
}

function drawPortal(
  ctx: CanvasRenderingContext2D,
  portal: PortalInfo,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(portal.wx, portal.wy, 0, camX, camY);

  // 1. Tappeto d'ingresso accogliente
  ctx.fillStyle = portal.locked ? "rgba(180, 160, 150, 0.4)" : "rgba(255, 215, 120, 0.55)";
  ctx.beginPath();
  ctx.ellipse(sx, sy, 28, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Struttura della porta ad arco (legno nobile o marmo dorato)
  const isGoal = portal.index === 7;
  const archW = 46;
  const archH = 68;

  const woodGrad = ctx.createLinearGradient(sx, sy - archH, sx, sy);
  if (isGoal) {
    woodGrad.addColorStop(0, "#ffe066");
    woodGrad.addColorStop(0.5, "#f59e0b");
    woodGrad.addColorStop(1, "#b45309");
  } else {
    woodGrad.addColorStop(0, "#fde68a");
    woodGrad.addColorStop(0.5, "#d97706");
    woodGrad.addColorStop(1, "#92400e");
  }

  // Battente e stipiti
  ctx.fillStyle = woodGrad;
  ctx.beginPath();
  ctx.roundRect(sx - archW / 2, sy - archH, archW, archH, [18, 18, 4, 4]);
  ctx.fill();
  ctx.strokeStyle = isGoal ? "#ffffff" : "#78350f";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Interno porta (buio accogliente con luce calda)
  ctx.fillStyle = portal.locked ? "#374151" : "#451a03";
  ctx.beginPath();
  ctx.roundRect(sx - archW / 2 + 5, sy - archH + 6, archW - 10, archH - 6, [14, 14, 2, 2]);
  ctx.fill();

  if (!portal.locked) {
    // Luce calda che filtra dall'interno della stanza
    const glow = ctx.createRadialGradient(sx, sy - 20, 2, sx, sy - 20, 26);
    glow.addColorStop(0, "rgba(254, 240, 138, 0.8)");
    glow.addColorStop(1, "rgba(254, 240, 138, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.roundRect(sx - archW / 2 + 5, sy - archH + 6, archW - 10, archH - 6, [14, 14, 2, 2]);
    ctx.fill();
  }

  // 3. Targa con Nome Stanza & Icona
  const badgeY = sy - archH - 12;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(sx - 48, badgeY - 14, 96, 26, 13);
  ctx.fill();
  ctx.strokeStyle = portal.locked ? "#9ca3af" : "#f59e0b";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Testo in stampatello e icona
  ctx.font = '800 11px "Fredoka", "Nunito", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#451a03";
  ctx.fillText(`${portal.icon} ${portal.name}`, sx, badgeY - 1);

  // 4. Stelline e Paperella d'Oro sopra la porta
  if (!portal.locked) {
    const starsY = badgeY - 16;
    for (let s = 0; s < 3; s++) {
      const starX = sx - 16 + s * 16;
      const got = s < portal.stars;
      ctx.font = "13px sans-serif";
      ctx.fillText(got ? "⭐" : "▫️", starX, starsY);
    }
    if (portal.duck) {
      ctx.font = "14px sans-serif";
      ctx.fillText("🦆", sx + 32, badgeY - 2);
    }
  } else {
    // Catenella e lucchetto se la porta è chiusa
    ctx.font = "18px sans-serif";
    ctx.fillText("🔒", sx, sy - 26);
  }
}

function drawNpc(
  ctx: CanvasRenderingContext2D,
  npc: NpcInfo,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(npc.wx, npc.wy, 0, camX, camY);

  // Ombra morbida dell'NPC
  ctx.fillStyle = "rgba(70, 35, 15, 0.3)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 2, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Animazione respiro
  const bob = Math.sin(t * 3 + npc.wx) * 2;

  ctx.save();
  ctx.translate(sx, sy + bob);

  if (npc.id === "mamma") {
    // 🐻 Mamma Orsa con vestitino rosa
    // Corpo
    ctx.fillStyle = "#d4a373";
    ctx.beginPath();
    ctx.arc(0, -28, 20, 0, Math.PI * 2);
    ctx.fill();
    // Grembiule rosa a fiori
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.roundRect(-14, -24, 28, 22, 6);
    ctx.fill();
    // Musetto e occhietti
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, -32, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.arc(0, -34, 3, 0, Math.PI * 2);
    ctx.arc(-6, -38, 2, 0, Math.PI * 2);
    ctx.arc(6, -38, 2, 0, Math.PI * 2);
    ctx.fill();
    // Orecchie con fiocchetto
    ctx.fillStyle = "#d4a373";
    ctx.beginPath();
    ctx.arc(-14, -46, 6, 0, Math.PI * 2);
    ctx.arc(14, -46, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ec4899";
    ctx.beginPath();
    ctx.arc(14, -46, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (npc.id === "papa") {
    // 🧸 Papà Orso con gilet azzurro
    ctx.fillStyle = "#b08968";
    ctx.beginPath();
    ctx.arc(0, -30, 22, 0, Math.PI * 2);
    ctx.fill();
    // Gilet blu
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.roundRect(-16, -26, 32, 24, 6);
    ctx.fill();
    // Musetto e baffetti
    ctx.fillStyle = "#faedcd";
    ctx.beginPath();
    ctx.arc(0, -33, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2d1606";
    ctx.beginPath();
    ctx.arc(0, -35, 3.5, 0, Math.PI * 2);
    ctx.arc(-7, -40, 2.2, 0, Math.PI * 2);
    ctx.arc(7, -40, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Orecchie
    ctx.fillStyle = "#b08968";
    ctx.beginPath();
    ctx.arc(-16, -48, 6.5, 0, Math.PI * 2);
    ctx.arc(16, -48, 6.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (npc.id === "micio") {
    // 🐱 Micio il Gatto su un cuscino di velluto
    // Cuscino viola sotto
    ctx.fillStyle = "#a855f7";
    ctx.beginPath();
    ctx.ellipse(0, -4, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Gatto bianco/arancio appallottolato
    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(0, -16, 14, 0, Math.PI * 2);
    ctx.fill();
    // Orecchie a punta
    ctx.fillStyle = "#fb923c";
    ctx.beginPath();
    ctx.moveTo(-10, -26);
    ctx.lineTo(-4, -36);
    ctx.lineTo(2, -26);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(6, -36);
    ctx.lineTo(12, -26);
    ctx.fill();
    // Occhietti sorridenti ^ ^ e nasino
    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-4, -18, 3, Math.PI, 0);
    ctx.arc(4, -18, 3, Math.PI, 0);
    ctx.stroke();
    // Coda che scodinzola
    const tailWag = Math.sin(t * 6) * 6;
    ctx.strokeStyle = "#fb923c";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(12, -14);
    ctx.quadraticCurveTo(20 + tailWag, -22, 18 + tailWag, -30);
    ctx.stroke();
  } else if (npc.id === "coniglio") {
    // 🐰 Babbo Coniglio
    ctx.fillStyle = "#f3f4f6";
    ctx.beginPath();
    ctx.arc(0, -26, 18, 0, Math.PI * 2);
    ctx.fill();
    // Lunghe orecchie da coniglio
    ctx.fillStyle = "#f3f4f6";
    ctx.beginPath();
    ctx.roundRect(-12, -54, 8, 26, 4);
    ctx.roundRect(4, -54, 8, 26, 4);
    ctx.fill();
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.roundRect(-10, -50, 4, 20, 2);
    ctx.roundRect(6, -50, 4, 20, 2);
    ctx.fill();
    // Papillon viola
    ctx.fillStyle = "#8b5cf6";
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(-6, -18);
    ctx.lineTo(-6, -10);
    ctx.closePath();
    ctx.moveTo(0, -14);
    ctx.lineTo(6, -18);
    ctx.lineTo(6, -10);
    ctx.closePath();
    ctx.fill();
    // Faccina dolce
    ctx.fillStyle = "#1f2937";
    ctx.beginPath();
    ctx.arc(-5, -28, 2, 0, Math.PI * 2);
    ctx.arc(5, -28, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.arc(0, -24, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nome sopra l'NPC
  ctx.font = '800 11px "Fredoka", "Nunito", sans-serif';
  ctx.textAlign = "center";
  ctx.fillStyle = "#374151";
  ctx.fillText(npc.name, 0, -52);

  ctx.restore();
}

function drawCentralFountain(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(wx, wy, 0, camX, camY);

  // Vasca della fontana in pietra
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.ellipse(sx, sy, 46, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Acqua azzurra limpida
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.ellipse(sx, sy, 38, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  // Onde concentriche
  const wave = (t * 20) % 28;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(sx, sy, wave, wave * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Statua della Paperella d'Oro al centro
  const duckBob = Math.sin(t * 4) * 2;
  ctx.font = "26px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🦆", sx, sy - 14 + duckBob);
}

function drawShopGazebo(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  camX: number,
  camY: number,
  _t: number,
) {
  const { sx, sy } = worldToScreen(wx, wy, 0, camX, camY);

  // Banco di legno dello shop
  ctx.fillStyle = "#92400e";
  ctx.beginPath();
  ctx.roundRect(sx - 34, sy - 24, 68, 22, 4);
  ctx.fill();

  // Tenda a strisce colorate (rosso e crema)
  const canopyW = 76;
  const canopyH = 32;
  const canY = sy - 58;

  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(sx - canopyW / 2, canY);
  ctx.lineTo(sx + canopyW / 2, canY);
  ctx.lineTo(sx + canopyW / 2 + 6, canY + canopyH);
  ctx.lineTo(sx - canopyW / 2 - 6, canY + canopyH);
  ctx.closePath();
  ctx.fill();

  // Strisce bianche
  ctx.fillStyle = "#ffffff";
  for (let s = 0; s < 4; s++) {
    const stX = sx - canopyW / 2 + 6 + s * 18;
    ctx.fillRect(stX, canY, 9, canopyH);
  }

  // Insegna "BAZAR"
  ctx.fillStyle = "#fef08a";
  ctx.beginPath();
  ctx.roundRect(sx - 28, canY - 14, 56, 18, 9);
  ctx.fill();
  ctx.strokeStyle = "#ca8a04";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = '800 11px "Fredoka", sans-serif';
  ctx.fillStyle = "#713f12";
  ctx.textAlign = "center";
  ctx.fillText("🛍️ BAZAR", sx, canY - 4);
}

function drawCourtyardTrampoline(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(wx, wy, 0, camX, camY);

  // Trampolino circolare nel cortile
  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.ellipse(sx, sy, 32, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Freccia rimbalzo
  const arrowBob = Math.sin(t * 6) * 3;
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("⬆️", sx, sy - 12 + arrowBob);
}

function drawBeachBall(
  ctx: CanvasRenderingContext2D,
  ball: HubState["toys"]["ball"],
  camX: number,
  camY: number,
) {
  const { sx, sy } = worldToScreen(ball.wx, ball.wy, ball.wz, camX, camY);

  // Ombra a terra del pallone
  const shadowDist = Math.max(0.3, 1 - ball.wz * 0.25);
  const groundPos = worldToScreen(ball.wx, ball.wy, 0, camX, camY);
  ctx.fillStyle = "rgba(70, 35, 15, 0.35)";
  ctx.beginPath();
  ctx.ellipse(groundPos.sx, groundPos.sy + 2, 14 * shadowDist, 7 * shadowDist, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sfera del pallone con strisce rotanti
  const r = ball.radius * 28;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(ball.rotation);

  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Spicchi giallo e blu
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 0.65);
  ctx.lineTo(0, 0);
  ctx.fill();

  ctx.fillStyle = "#3b82f6";
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, Math.PI * 1.65);
  ctx.lineTo(0, 0);
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

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
  ctx.fillStyle = "rgba(70, 35, 15, 0.25)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 2, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  if (kind === "apple") {
    // Tronco
    ctx.fillStyle = "#78350f";
    ctx.fillRect(sx - 4, sy - 24, 8, 24);
    // Chioma
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(sx, sy - 38, 22, 0, Math.PI * 2);
    ctx.fill();
    // Mele rosse
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(sx - 8, sy - 42, 3.5, 0, Math.PI * 2);
    ctx.arc(sx + 10, sy - 36, 3.5, 0, Math.PI * 2);
    ctx.arc(sx - 2, sy - 28, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Cespuglio di rose
    ctx.fillStyle = "#15803d";
    ctx.beginPath();
    ctx.arc(sx, sy - 14, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(sx - 6, sy - 16, 4, 0, Math.PI * 2);
    ctx.arc(sx + 6, sy - 12, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTapIndicator(
  ctx: CanvasRenderingContext2D,
  target: NonNullable<HubState["tapTarget"]>,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(target.wx, target.wy, 0, camX, camY);
  const pulse = Math.sin(t * 8) * 4;

  ctx.strokeStyle = "rgba(251, 191, 36, 0.85)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 22 + pulse, 11 + pulse * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Zampina centrale
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🐾", sx, sy - 2);
}

function drawPortalPrompt(
  ctx: CanvasRenderingContext2D,
  portal: PortalInfo,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(portal.wx, portal.wy, 0, camX, camY);
  const floatY = Math.sin(t * 6) * 3;

  const btnY = sy - 105 + floatY;
  ctx.fillStyle = portal.locked ? "#ef4444" : "#10b981";
  ctx.beginPath();
  ctx.roundRect(sx - 48, btnY - 14, 96, 28, 14);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '800 12px "Fredoka", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(portal.locked ? "🔒 CHIUSO" : "🚪 ENTRA!", sx, btnY + 2);
}

function drawNpcPrompt(
  ctx: CanvasRenderingContext2D,
  npc: NpcInfo,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(npc.wx, npc.wy, 0, camX, camY);
  const floatY = Math.sin(t * 6) * 3;

  const btnY = sy - 72 + floatY;
  ctx.fillStyle = "#3b82f6";
  ctx.beginPath();
  ctx.roundRect(sx - 42, btnY - 12, 84, 24, 12);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.font = '800 11px "Fredoka", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText("💬 PARLA", sx, btnY + 2);
}

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

  const bubbleW = Math.min(VIEW_W - 48, 440);
  const bubbleH = 96;
  const bx = Math.max(24, Math.min(VIEW_W - bubbleW - 24, sx - bubbleW / 2));
  const by = Math.max(20, sy - 180);

  // Ombra fumetto
  ctx.fillStyle = "rgba(70, 35, 15, 0.25)";
  ctx.beginPath();
  ctx.roundRect(bx + 4, by + 4, bubbleW, bubbleH, 20);
  ctx.fill();

  // Corpo fumetto (crema chiaro caldo)
  ctx.fillStyle = "#fffdfa";
  ctx.beginPath();
  ctx.roundRect(bx, by, bubbleW, bubbleH, 20);
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Coda del fumetto verso l'NPC
  ctx.fillStyle = "#fffdfa";
  ctx.beginPath();
  ctx.moveTo(sx - 10, by + bubbleH - 1);
  ctx.lineTo(sx, by + bubbleH + 14);
  ctx.lineTo(sx + 10, by + bubbleH - 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.stroke();

  // Nome dell'oratore
  ctx.font = '800 13px "Fredoka", sans-serif';
  ctx.fillStyle = "#b45309";
  ctx.textAlign = "left";
  ctx.fillText(dlg.speaker.toUpperCase(), bx + 18, by + 22);

  // Testo in stampatello maiuscolo grande e chiaro per Celeste
  ctx.font = '800 15px "Fredoka", "Nunito", sans-serif';
  ctx.fillStyle = "#374151";
  const currentLine = dlg.lines[dlg.lineIndex] ?? "";
  ctx.fillText(currentLine, bx + 18, by + 50);

  // Istruzione tocca per continuare
  ctx.font = '700 11px "Fredoka", sans-serif';
  ctx.fillStyle = "#9ca3af";
  ctx.textAlign = "right";
  ctx.fillText("TOCCA PER CONTINUARE ❯❯", bx + bubbleW - 18, by + 78);
}
