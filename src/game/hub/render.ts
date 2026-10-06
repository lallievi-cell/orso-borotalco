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

  // 1. Sfondo fiabesco luminoso con cielo, nuvole animate, mongolfiera e raggi solari
  drawHubBackground(ctx, hub.t);

  // 2. Disegno della pavimentazione base con spessore 3D del diorama (pedistallo in legno, cotto, prato, parquet)
  drawGroundTiles(ctx, art, camX, camY, hub.t);

  // 2b. Pareti a L della stanza (Parete Nord-Ovest e Parete Nord-Est con boiserie, finestre ad arco e quadri)
  drawHubWalls(ctx, art, camX, camY, hub.t);

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

  // 4 Lampioni vittoriani in ferro battuto con luce accesa e alone caldo a terra
  const lampposts = [
    { wx: 9.5, wy: 9.5 },
    { wx: 13.5, wy: 9.5 },
    { wx: 9.5, wy: 17.5 },
    { wx: 17.5, wy: 17.5 },
  ];
  for (const lp of lampposts) {
    items.push({
      depth: getDepth(lp.wx, lp.wy, 0),
      draw: (c) => drawLamppost(c, lp.wx, lp.wy, camX, camY, hub.t),
    });
  }

  // 2 Panchine del parco in legno noce lucido
  const benches = [
    { wx: 6.5, wy: 11.5, rot: "SE" as const },
    { wx: 15.5, wy: 11.5, rot: "SW" as const },
  ];
  for (const b of benches) {
    items.push({
      depth: getDepth(b.wx, b.wy, 0),
      draw: (c) => drawParkBench(c, b.wx, b.wy, b.rot, camX, camY),
    });
  }

  // Tavolino bistrot con ombrellone a spicchi pastello e servizio da tè
  items.push({
    depth: getDepth(6.5, 15.5, 0),
    draw: (c) => drawBistroTable(c, 6.5, 15.5, camX, camY, hub.t),
  });

  // Canestro da basket giocattolo con retina animata e score
  const hoop = hub.toys.hoop;
  if (hoop) {
    items.push({
      depth: getDepth(hoop.wx, hoop.wy, 0),
      draw: (c) => drawBasketballHoop(c, hoop, camX, camY, hub.t),
    });
  }

  // Cannocchiale panoramico in ottone sul terrazzo belvedere
  const tel = hub.toys.telescope;
  if (tel) {
    items.push({
      depth: getDepth(tel.wx, tel.wy, 0),
      draw: (c) => drawTelescope(c, tel, camX, camY, hub.t),
    });
  }

  // Stelline dorate 3D in volo sopra il trampolino elastico
  for (const s of hub.toys.trampStars) {
    if (!s.collected) {
      items.push({
        depth: getDepth(s.wx, s.wy, s.wz),
        draw: (c) => drawAerialStar(c, s, camX, camY, hub.t),
      });
    }
  }

  // Alberi di mele interattivi scuotibili e mele cadenti
  for (const tree of hub.toys.appleTrees) {
    items.push({
      depth: getDepth(tree.wx, tree.wy, 0),
      draw: (c) => drawInteractiveAppleTree(c, tree, art, camX, camY, hub.t),
    });
    for (const apple of tree.fallingApples) {
      items.push({
        depth: getDepth(apple.wx, apple.wy, apple.wz),
        draw: (c) => drawFallingApple(c, apple, camX, camY),
      });
    }
  }

  // Cespugli di rose fiorite nel parco
  const extraBushes = [
    { wx: 16.5, wy: 19.5 },
    { wx: 20.5, wy: 11.5 },
    { wx: 22.5, wy: 16.5 },
    { wx: 13.5, wy: 21.5 },
  ];
  for (const b of extraBushes) {
    items.push({
      depth: getDepth(b.wx, b.wy, 0),
      draw: (c) => drawDecorTree(c, b.wx, b.wy, "bush", art, camX, camY, hub.t),
    });
  }

  // Staccionate in legno bianco sul terrazzo belvedere (incorniciano la passerella a x: 18.0)
  const fences = [
    { wx: 16.8, wy: 7.2 },
    { wx: 16.8, wy: 9.8 },
    { wx: 22.5, wy: 6.5 },
    { wx: 22.5, wy: 8.5 },
  ];
  for (const f of fences) {
    items.push({
      depth: getDepth(f.wx, f.wy, 0),
      draw: (c) => drawGardenFence(c, f.wx, f.wy, art, camX, camY),
    });
  }

  // Aura magica arcobaleno della Fontana dei Desideri
  if (hub.toys.wishingFountain.auraT > 0) {
    items.push({
      depth: getDepth(11.5, 11.5, 0) + 0.02,
      draw: (c) => drawWishingAura(c, 11.5, 11.5, hub.toys.wishingFountain.auraT, camX, camY, hub.t),
    });
  }

  // Cuoricini svolazzanti delle coccole di Micio
  for (const heart of hub.toys.micioPet.hearts) {
    items.push({
      depth: getDepth(heart.wx, heart.wy, heart.wz),
      draw: (c) => drawPetHeart(c, heart, camX, camY),
    });
  }

  // Messaggi fluttuanti dinamici ("CANESTRO! +2 ⭐", "GNAM! 🍎 +1 ⭐", ecc)
  for (const msg of hub.floatingMessages) {
    items.push({
      depth: getDepth(msg.wx, msg.wy, msg.wz) + 0.8,
      draw: (c) => drawFloatingMessage(c, msg, camX, camY),
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

  // 5. Prompt interattivi fluttuanti ("💬 PARLA", "🚪 ENTRA", "🛍️ APRI BAZAR")
  if (hub.activePortal) {
    drawPortalPrompt(ctx, hub.activePortal, camX, camY, hub.t);
  } else if (hub.nearShop) {
    const coniglio = hub.npcs.find((n) => n.id === "coniglio") ?? {
      wx: 9.5,
      wy: 14.5,
      id: "coniglio",
      name: "BABBO CONIGLIO",
      radius: 2.6,
      color: "#f59e0b",
      lines: [],
    };
    drawNpcPrompt(ctx, coniglio, camX, camY, hub.t);
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

/**
 * Medaglione circolare compatto illustrato per i bambini:
 * Sostituisce i vecchi cartelli di testo con un elegante stemma rotondo
 * con la grande icona della stanza (padella, water, peluche...) e le stelline d'oro.
 */
function drawPortalMedallion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  portal: PortalInfo,
  art: Art,
  t: number,
) {
  ctx.save();
  const floatY = Math.sin(t * 3.5 + portal.index) * 2;
  ctx.translate(x, y + floatY);

  const r = 16; // Diametro 32px: compatto e pulito

  // 1. Ombra soffusa a goccia del medaglione
  ctx.shadowColor = "rgba(45, 20, 10, 0.28)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2.5;

  // 2. Cerchio di base smaltato
  const grad = ctx.createLinearGradient(0, -r, 0, r);
  if (portal.locked) {
    grad.addColorStop(0, "#f3f4f6");
    grad.addColorStop(1, "#d1d5db");
  } else {
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(1, "#fef3c7");
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Reset ombra
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 3. Cornice dorata o metallica
  ctx.strokeStyle = portal.locked ? "#9ca3af" : "#f59e0b";
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Highlight superiore lucido
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -1, r - 1.5, Math.PI * 0.8, Math.PI * 0.2, true);
  ctx.stroke();

  // 4. Icona della stanza grande, intuitiva e visiva per bambini
  ctx.font = "18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(portal.icon, 0, 1);

  // 5. Stelline sopra il medaglione (se sbloccato)
  if (!portal.locked) {
    const starY = -r - 7;
    const spacing = 10;
    for (let s = -1; s <= 1; s++) {
      const sx = s * spacing;
      const got = (s + 1) < portal.stars;
      if (got && art?.star) {
        ctx.drawImage(art.star, sx - 5, starY - 5, 10, 10);
      } else {
        ctx.font = "8px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(got ? "⭐" : "▫️", sx, starY);
      }
    }

    // Paperella d'oro se trovata
    if (portal.duck && art?.goldduck) {
      ctx.drawImage(art.goldduck, r - 5, -r - 3, 14, 14);
    }
  } else {
    // Lucchetto in basso se bloccato
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🔒", r - 5, r - 3);
  }

  ctx.restore();
}

/**
 * Sfondo fiabesco, luminoso e dinamico per il diorama:
 * Cielo mattutino sfumato con morbide nuvole animate, raggi di luce dorata,
 * mongolfiera pastello all'orizzonte e particelle scintillanti di borotalco.
 */
function drawHubBackground(ctx: CanvasRenderingContext2D, t: number) {
  // 1. Gradiente atmosferico cielo mattutino sereno & luce calda della nursery
  const skyGrad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  skyGrad.addColorStop(0, "#bae6fd");     // Azzurro pastello cielo sereno
  skyGrad.addColorStop(0.35, "#e0f2fe");  // Celeste chiaro luminoso
  skyGrad.addColorStop(0.62, "#fef3c7");  // Bagliore dorato caldo all'orizzonte
  skyGrad.addColorStop(0.85, "#fed7aa");  // Pesca ambrata calda
  skyGrad.addColorStop(1, "#faebd7");     // Base morbida e accogliente
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // 2. Raggi di sole morbidi (God Rays) dall'angolo superiore sinistro
  ctx.save();
  const sunRays = ctx.createRadialGradient(80, -40, 40, 320, 260, 680);
  sunRays.addColorStop(0, "rgba(255, 250, 220, 0.22)");
  sunRays.addColorStop(0.4, "rgba(255, 245, 200, 0.08)");
  sunRays.addColorStop(1, "rgba(255, 245, 200, 0)");
  ctx.fillStyle = sunRays;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();

  // 3. Nuvole soffici animate in parallasse orizzontale
  const clouds = [
    { baseY: 55, speed: 7, scale: 0.95, offset: 60, alpha: 0.88 },
    { baseY: 110, speed: 12, scale: 1.25, offset: 380, alpha: 0.95 },
    { baseY: 40, speed: 5, scale: 0.75, offset: 740, alpha: 0.82 },
    { baseY: 135, speed: 10, scale: 1.1, offset: 1020, alpha: 0.9 },
  ];

  for (const c of clouds) {
    const loopW = VIEW_W + 320;
    const cx = ((t * c.speed + c.offset) % loopW) - 160;
    const cy = c.baseY + Math.sin(t * 0.8 + c.offset) * 3;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(c.scale, c.scale);
    ctx.globalAlpha = c.alpha;

    // Ombra soffusa della nuvoletta
    ctx.fillStyle = "rgba(224, 231, 255, 0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 14, 58, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo nuvola con lobi sovrapposti soffici e bianchi
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, -6, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-26, 4, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(26, 4, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 8, 44, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Riflesso dorato solare sul bordo superiore della nuvola
    ctx.fillStyle = "rgba(254, 240, 138, 0.45)";
    ctx.beginPath();
    ctx.arc(-4, -14, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 4. Mongolfiera pastello lontana da fiaba che fluttua all'orizzonte
  const balloonX = VIEW_W - 140 + Math.sin(t * 0.4) * 12;
  const balloonY = 95 + Math.sin(t * 1.2) * 6;
  ctx.save();
  ctx.translate(balloonX, balloonY);
  ctx.scale(0.85, 0.85);

  // Pallone a strisce pastello (rosa, giallo, celeste)
  const bGrad = ctx.createLinearGradient(-16, -26, 16, 10);
  bGrad.addColorStop(0, "#f472b6");
  bGrad.addColorStop(0.5, "#fde047");
  bGrad.addColorStop(1, "#38bdf8");
  ctx.fillStyle = bGrad;
  ctx.beginPath();
  ctx.ellipse(0, -10, 18, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Riflesso lucido sul pallone
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.beginPath();
  ctx.ellipse(-6, -16, 7, 12, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Corde e cestino in vimini
  ctx.strokeStyle = "rgba(120, 53, 15, 0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, 10);
  ctx.lineTo(-4, 18);
  ctx.moveTo(6, 10);
  ctx.lineTo(4, 18);
  ctx.stroke();

  // Cestino
  ctx.fillStyle = "#b45309";
  ctx.fillRect(-5, 18, 10, 7);
  ctx.restore();

  // 5. Particelle magiche fluttuanti (stelline ⭐ e sfere di borotalco luminose)
  for (let i = 0; i < 9; i++) {
    const px = ((i * 149 + t * 14) % (VIEW_W + 60)) - 30;
    const py = 50 + ((i * 73 + t * 9) % (VIEW_H * 0.75));
    const sparkle = (Math.sin(t * 3.5 + i * 1.7) + 1) * 0.5;

    ctx.save();
    ctx.translate(px, py);
    ctx.globalAlpha = 0.25 + sparkle * 0.55;

    if (i % 2 === 0) {
      // Stellina a 4 punte
      const size = 3 + sparkle * 2.5;
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.quadraticCurveTo(0, 0, size, 0);
      ctx.quadraticCurveTo(0, 0, 0, size);
      ctx.quadraticCurveTo(0, 0, -size, 0);
      ctx.quadraticCurveTo(0, 0, 0, -size);
      ctx.fill();
    } else {
      // Sfera morbida di borotalco
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.beginPath();
      ctx.arc(0, 0, 2.5 + sparkle * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 6. Grande ombra d'atmosfera sotto il basamento del diorama (isola galleggiante)
  const islandShadow = ctx.createRadialGradient(
    VIEW_W / 2,
    VIEW_H * 0.78,
    60,
    VIEW_W / 2,
    VIEW_H * 0.82,
    VIEW_W * 0.55,
  );
  islandShadow.addColorStop(0, "rgba(52, 28, 12, 0.2)");
  islandShadow.addColorStop(0.5, "rgba(52, 28, 12, 0.08)");
  islandShadow.addColorStop(1, "rgba(52, 28, 12, 0)");
  ctx.fillStyle = islandShadow;
  ctx.fillRect(0, VIEW_H * 0.45, VIEW_W, VIEW_H * 0.55);
}

/** Disegna una finestra ad arco con tendine arricciate, vista sul cielo azzurro e fioriera. */
function drawArchedWallWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  curtainColor: "yellow" | "blue",
) {
  const w = 46;
  const h = 60;
  ctx.save();
  ctx.translate(x, y);

  // Ombra della finestra sul muro
  ctx.fillStyle = "rgba(45, 20, 10, 0.18)";
  ctx.beginPath();
  ctx.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, [18, 18, 2, 2]);
  ctx.fill();

  // Cornice in legno bianco modanato
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, [18, 18, 2, 2]);
  ctx.fill();
  ctx.stroke();

  // Vetro con cielo azzurro sereno e nuvoletta all'esterno
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, [14, 14, 2, 2]);
  ctx.clip();

  const glassGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  glassGrad.addColorStop(0, "#38bdf8");
  glassGrad.addColorStop(0.65, "#bae6fd");
  glassGrad.addColorStop(1, "#86efac");
  ctx.fillStyle = glassGrad;
  ctx.fillRect(-w / 2, -h / 2, w, h);

  // Nuvoletta fuori dalla finestra
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.beginPath();
  ctx.arc(-4, -12, 8, 0, Math.PI * 2);
  ctx.arc(6, -10, 6, 0, Math.PI * 2);
  ctx.arc(12, -8, 5, 0, Math.PI * 2);
  ctx.fill();

  // Riflesso solare obliquo sul vetro
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2 + 10);
  ctx.lineTo(-w / 2 + 16, -h / 2);
  ctx.lineTo(-w / 2 + 28, -h / 2);
  ctx.lineTo(-w / 2, -h / 2 + 28);
  ctx.closePath();
  ctx.fill();

  // Crociera in legno bianco (muntin bars)
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2 + 4);
  ctx.lineTo(0, h / 2 - 4);
  ctx.moveTo(-w / 2 + 4, 0);
  ctx.lineTo(w / 2 - 4, 0);
  ctx.stroke();

  ctx.restore();

  // Tendine laterali con fiocchetto
  const curtainC = curtainColor === "yellow" ? "#fde047" : "#93c5fd";
  const drapeC = curtainColor === "yellow" ? "#facc15" : "#60a5fa";

  // Tendina sinistra
  ctx.fillStyle = curtainC;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 3, -h / 2 + 6);
  ctx.quadraticCurveTo(-w / 2 + 14, -h / 2 + 12, -w / 2 + 5, h / 2 - 6);
  ctx.lineTo(-w / 2 + 3, h / 2 - 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = drapeC;
  ctx.fillRect(-w / 2 + 3, 2, 8, 3);

  // Tendina destra
  ctx.fillStyle = curtainC;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 3, -h / 2 + 6);
  ctx.quadraticCurveTo(w / 2 - 14, -h / 2 + 12, w / 2 - 5, h / 2 - 6);
  ctx.lineTo(w / 2 - 3, h / 2 - 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = drapeC;
  ctx.fillRect(w / 2 - 11, 2, 8, 3);

  // Davanzale in legno
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(-w / 2 - 4, h / 2 - 2, w + 8, 5);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.strokeRect(-w / 2 - 4, h / 2 - 2, w + 8, 5);

  // Fioriera in legno con fiorellini colorati sul davanzale
  ctx.fillStyle = "#b45309";
  ctx.fillRect(-w / 2, h / 2 + 3, w, 6);
  ctx.fillStyle = "#4ade80"; // Foglioline verdi
  for (let fx = -w / 2 + 4; fx <= w / 2 - 4; fx += 8) {
    ctx.beginPath();
    ctx.arc(fx, h / 2 + 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fiorellini pastello
  const flowerCols = ["#f472b6", "#fde047", "#ffffff", "#f472b6", "#60a5fa"];
  flowerCols.forEach((fc, idx) => {
    ctx.fillStyle = fc;
    ctx.beginPath();
    ctx.arc(-w / 2 + 6 + idx * 8, h / 2 + 2, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

/** Applique decorativa da parete in ottone con alone caldo. */
function drawWallSconce(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);

  // Alone luminoso caldo dell'applique
  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 22);
  glow.addColorStop(0, "rgba(254, 240, 138, 0.45)");
  glow.addColorStop(0.5, "rgba(253, 224, 71, 0.15)");
  glow.addColorStop(1, "rgba(253, 224, 71, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();

  // Supporto applique in ottone
  ctx.fillStyle = "#b45309";
  ctx.fillRect(-2.5, -2, 5, 8);
  ctx.fillStyle = "#d97706";
  ctx.beginPath();
  ctx.arc(0, 6, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Paralume a campana in vetro opalino
  ctx.fillStyle = "#fef9c3";
  ctx.beginPath();
  ctx.ellipse(0, -3, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

/** Quadretto con cornice dorata appeso alla parete. */
function drawWallPainting(ctx: CanvasRenderingContext2D, x: number, y: number, icon: string) {
  ctx.save();
  ctx.translate(x, y);

  // Ombra del quadretto
  ctx.fillStyle = "rgba(45, 20, 10, 0.2)";
  ctx.fillRect(-15, -15, 30, 30);

  // Cornice in legno noce con filo dorato
  ctx.fillStyle = "#78350f";
  ctx.fillRect(-14, -14, 28, 28);
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-12, -12, 24, 24);

  // Tela panna
  ctx.fillStyle = "#fffbeb";
  ctx.fillRect(-10, -10, 20, 20);

  // Icona
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(icon, 0, 1);

  // Chiodo e cordino
  ctx.strokeStyle = "#b45309";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(-8, -14);
  ctx.moveTo(0, -18);
  ctx.lineTo(8, -14);
  ctx.stroke();
  ctx.fillStyle = "#d97706";
  ctx.beginPath();
  ctx.arc(0, -18, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Orologio da parete a cucù in legno con pendolo oscillante. */
function drawWallCuckooClock(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);

  // Ombra
  ctx.fillStyle = "rgba(45, 20, 10, 0.2)";
  ctx.fillRect(-13, -15, 26, 30);

  // Casetta dell'orologio
  ctx.fillStyle = "#92400e";
  ctx.fillRect(-12, -14, 24, 28);

  // Tetto a capanna
  ctx.fillStyle = "#78350f";
  ctx.beginPath();
  ctx.moveTo(-16, -13);
  ctx.lineTo(0, -23);
  ctx.lineTo(16, -13);
  ctx.closePath();
  ctx.fill();

  // Quadrante rotondo
  ctx.fillStyle = "#fffbeb";
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Lancette
  ctx.strokeStyle = "#1c1917";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -5);
  ctx.moveTo(0, 0);
  ctx.lineTo(4, 0);
  ctx.stroke();

  // Pendolo oscillante
  const pendAngle = Math.sin(t * 3.2) * 0.22;
  ctx.save();
  ctx.translate(0, 14);
  ctx.rotate(pendAngle);
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 10);
  ctx.stroke();
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(0, 10, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/**
 * Renderizza le due pareti a L della stanza (Parete Nord-Ovest e Parete Nord-Est)
 * con boiserie in legno caldo, carta da parati pastello, modanatura superiore con spessore 3D,
 * finestre ad arco panoramiche, applique dorate luminose e quadretti decorativi.
 */
function drawHubWalls(
  ctx: CanvasRenderingContext2D,
  _art: Art,
  camX: number,
  camY: number,
  t: number,
) {
  // Punti geometrici della base sul pavimento perfettamente a filo con le piastrelle del diorama
  const apexTile = worldToScreen(3.5, 3.5, 0, camX, camY);
  const apexX = apexTile.sx;
  const apexY = apexTile.sy;

  const westTile = worldToScreen(3.5, 23.5, 0, camX, camY);
  const westX = westTile.sx;
  const westY = westTile.sy;

  const eastTile = worldToScreen(23.5, 3.5, 0, camX, camY);
  const eastX = eastTile.sx;
  const eastY = eastTile.sy;

  const wallH = 108; // Altezza verticale elegante che incornicia i portali senza coprire l'interfaccia
  const wallThick = 12; // Spessore 3D del bordo superiore

  // -------------------------------------------------------------
  // 1. SPESSORE SUPERIORE E FIANCHI ESTERNI DEI MURI (Spessore 3D)
  // -------------------------------------------------------------
  // Faccia superiore della parete Nord-Ovest (bordo cornice)
  ctx.fillStyle = "#fef3c7";
  ctx.beginPath();
  ctx.moveTo(westX, westY - wallH);
  ctx.lineTo(westX - wallThick, westY - wallH - wallThick * 0.5);
  ctx.lineTo(apexX, apexY - wallH - wallThick);
  ctx.lineTo(apexX, apexY - wallH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Faccia superiore della parete Nord-Est (bordo cornice in ombra)
  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.moveTo(apexX, apexY - wallH);
  ctx.lineTo(apexX, apexY - wallH - wallThick);
  ctx.lineTo(eastX + wallThick, eastY - wallH - wallThick * 0.5);
  ctx.lineTo(eastX, eastY - wallH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b45309";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Fianco esterno a Ovest (sezione della parete)
  ctx.fillStyle = "#78350f";
  ctx.beginPath();
  ctx.moveTo(westX, westY - wallH);
  ctx.lineTo(westX - wallThick, westY - wallH - wallThick * 0.5);
  ctx.lineTo(westX - wallThick, westY);
  ctx.lineTo(westX, westY);
  ctx.closePath();
  ctx.fill();

  // Fianco esterno a Est (sezione della parete)
  ctx.fillStyle = "#592b0c";
  ctx.beginPath();
  ctx.moveTo(eastX, eastY - wallH);
  ctx.lineTo(eastX + wallThick, eastY - wallH - wallThick * 0.5);
  ctx.lineTo(eastX + wallThick, eastY);
  ctx.lineTo(eastX, eastY);
  ctx.closePath();
  ctx.fill();

  // -------------------------------------------------------------
  // 2. PARETE NORD-OVEST (Sinistra, esposta al sole caldo del mattino)
  // -------------------------------------------------------------
  ctx.save();
  // Maschera della parete NO
  ctx.beginPath();
  ctx.moveTo(westX, westY - wallH);
  ctx.lineTo(apexX, apexY - wallH);
  ctx.lineTo(apexX, apexY);
  ctx.lineTo(westX, westY);
  ctx.closePath();
  ctx.clip();

  // Sfondo carta da parati calda crema / vaniglia
  const wallGradNO = ctx.createLinearGradient(apexX, apexY - wallH, westX, westY);
  wallGradNO.addColorStop(0, "#fffdfa");
  wallGradNO.addColorStop(0.5, "#fff8eb");
  wallGradNO.addColorStop(1, "#fef3c7");
  ctx.fillStyle = wallGradNO;
  ctx.fillRect(westX - 20, apexY - wallH - 10, apexX - westX + 40, westY - apexY + wallH + 20);

  // Strisce verticali delicate della carta da parati
  ctx.fillStyle = "rgba(217, 119, 6, 0.04)";
  for (let x = westX; x <= apexX; x += 18) {
    ctx.fillRect(x, apexY - wallH - 20, 8, westY - apexY + wallH + 40);
  }

  // Boiserie in legno caldo nella metà inferiore (altezza 40px dal suolo)
  const boiH = 40;
  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.moveTo(westX, westY);
  ctx.lineTo(apexX, apexY);
  ctx.lineTo(apexX, apexY - boiH);
  ctx.lineTo(westX, westY - boiH);
  ctx.closePath();
  ctx.fill();

  // Pannelli e doghe verticali della boiserie
  for (let step = 0; step < 16; step++) {
    const tSeg = step / 16;
    const px = apexX + (westX - apexX) * tSeg;
    const py = apexY + (westY - apexY) * tSeg;

    ctx.strokeStyle = "rgba(180, 83, 9, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - boiH);
    ctx.stroke();

    if (step % 2 === 0 && step < 15) {
      const pNextX = apexX + (westX - apexX) * ((step + 1) / 16);
      ctx.strokeStyle = "rgba(245, 158, 11, 0.65)";
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 4, py - boiH + 8, (pNextX - px) - 8, boiH - 16);
    }
  }

  // Cimasa modanata divisoria (chair rail) tra carta da parati e boiserie
  ctx.strokeStyle = "#b45309";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(westX, westY - boiH);
  ctx.lineTo(apexX, apexY - boiH);
  ctx.stroke();
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(westX, westY - boiH - 1.5);
  ctx.lineTo(apexX, apexY - boiH - 1.5);
  ctx.stroke();

  // Battiscopa in legno scuro noce lungo il pavimento
  ctx.fillStyle = "#78350f";
  ctx.beginPath();
  ctx.moveTo(westX, westY);
  ctx.lineTo(apexX, apexY);
  ctx.lineTo(apexX, apexY - 8);
  ctx.lineTo(westX, westY - 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(westX, westY - 8);
  ctx.lineTo(apexX, apexY - 8);
  ctx.stroke();

  // Cornice superiore modanata in gesso bianco
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(westX, westY - wallH);
  ctx.lineTo(apexX, apexY - wallH);
  ctx.lineTo(apexX, apexY - wallH + 10);
  ctx.lineTo(westX, westY - wallH + 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(217, 119, 6, 0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();

  // -------------------------------------------------------------
  // 3. PARETE NORD-EST (Destra, in luce d'ambiente più morbida)
  // -------------------------------------------------------------
  ctx.save();
  // Maschera della parete NE
  ctx.beginPath();
  ctx.moveTo(apexX, apexY - wallH);
  ctx.lineTo(eastX, eastY - wallH);
  ctx.lineTo(eastX, eastY);
  ctx.lineTo(apexX, apexY);
  ctx.closePath();
  ctx.clip();

  // Sfondo carta da parati calda crema / latte
  const wallGradNE = ctx.createLinearGradient(apexX, apexY - wallH, eastX, eastY);
  wallGradNE.addColorStop(0, "#f8ebd9");
  wallGradNE.addColorStop(0.5, "#f3dfc6");
  wallGradNE.addColorStop(1, "#ebd1b0");
  ctx.fillStyle = wallGradNE;
  ctx.fillRect(apexX - 20, apexY - wallH - 10, eastX - apexX + 40, eastY - apexY + wallH + 20);

  // Strisce verticali delicate
  ctx.fillStyle = "rgba(146, 64, 14, 0.04)";
  for (let x = apexX; x <= eastX; x += 18) {
    ctx.fillRect(x, apexY - wallH - 20, 8, eastY - apexY + wallH + 40);
  }

  // Boiserie in legno nella metà inferiore
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.moveTo(apexX, apexY);
  ctx.lineTo(eastX, eastY);
  ctx.lineTo(eastX, eastY - boiH);
  ctx.lineTo(apexX, apexY - boiH);
  ctx.closePath();
  ctx.fill();

  // Pannelli e doghe verticali della parete destra
  for (let step = 0; step < 16; step++) {
    const tSeg = step / 16;
    const px = apexX + (eastX - apexX) * tSeg;
    const py = apexY + (eastY - apexY) * tSeg;

    ctx.strokeStyle = "rgba(146, 64, 14, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - boiH);
    ctx.stroke();

    if (step % 2 === 0 && step < 15) {
      const pNextX = apexX + (eastX - apexX) * ((step + 1) / 16);
      ctx.strokeStyle = "rgba(217, 119, 6, 0.65)";
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 4, py - boiH + 8, (pNextX - px) - 8, boiH - 16);
    }
  }

  // Cimasa divisoria (chair rail) parete destra
  ctx.strokeStyle = "#92400e";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(apexX, apexY - boiH);
  ctx.lineTo(eastX, eastY - boiH);
  ctx.stroke();
  ctx.strokeStyle = "#fef3c7";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(apexX, apexY - boiH - 1.5);
  ctx.lineTo(eastX, eastY - boiH - 1.5);
  ctx.stroke();

  // Battiscopa parete destra
  ctx.fillStyle = "#592b0c";
  ctx.beginPath();
  ctx.moveTo(apexX, apexY);
  ctx.lineTo(eastX, eastY);
  ctx.lineTo(eastX, eastY - 8);
  ctx.lineTo(apexX, apexY - 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b45309";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(apexX, apexY - 8);
  ctx.lineTo(eastX, eastY - 8);
  ctx.stroke();

  // Cornice superiore modanata parete destra
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.moveTo(apexX, apexY - wallH);
  ctx.lineTo(eastX, eastY - wallH);
  ctx.lineTo(eastX, eastY - wallH + 10);
  ctx.lineTo(apexX, apexY - wallH + 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(180, 83, 9, 0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();

  // -------------------------------------------------------------
  // 4. OMBRA DELL'ANGOLO INTERNO AD L (Spigolo verticale centrale)
  // -------------------------------------------------------------
  ctx.save();
  const cornerShadow = ctx.createLinearGradient(apexX - 24, 0, apexX + 24, 0);
  cornerShadow.addColorStop(0, "rgba(45, 20, 10, 0)");
  cornerShadow.addColorStop(0.38, "rgba(45, 20, 10, 0.22)");
  cornerShadow.addColorStop(0.5, "rgba(45, 20, 10, 0.45)");
  cornerShadow.addColorStop(0.62, "rgba(45, 20, 10, 0.22)");
  cornerShadow.addColorStop(1, "rgba(45, 20, 10, 0)");
  ctx.fillStyle = cornerShadow;
  ctx.fillRect(apexX - 24, apexY - wallH, 48, wallH);
  ctx.restore();

  // -------------------------------------------------------------
  // 5. DETTAGLI ARCHITETTONICI INTEGRATI NELLE PARETI
  // -------------------------------------------------------------
  // Parete Nord-Ovest:
  // - Quadretto dorato tra Apex e Salotto
  const pStar = worldToScreen(3.5, 6.0, 0, camX, camY);
  drawWallPainting(ctx, pStar.sx, pStar.sy - 54, "⭐");

  // - Finestra panoramica 1 tra Salotto e Cucina
  const pWin1 = worldToScreen(3.5, 11.0, 0, camX, camY);
  drawArchedWallWindow(ctx, pWin1.sx, pWin1.sy - 52, "yellow");

  // - Finestra panoramica 2 tra Cucina e Lavanderia
  const pWin2 = worldToScreen(3.5, 16.0, 0, camX, camY);
  drawArchedWallWindow(ctx, pWin2.sx, pWin2.sy - 52, "blue");

  // - Finestra panoramica 3 verso il giardino sud-ovest
  const pWinExt = worldToScreen(3.5, 21.0, 0, camX, camY);
  drawArchedWallWindow(ctx, pWinExt.sx, pWinExt.sy - 52, "yellow");

  // - Applique luminose dorate lungo la parete NO
  const pSc1 = worldToScreen(3.5, 8.5, 0, camX, camY);
  drawWallSconce(ctx, pSc1.sx + 4, pSc1.sy - 66);
  const pSc2 = worldToScreen(3.5, 13.5, 0, camX, camY);
  drawWallSconce(ctx, pSc2.sx + 4, pSc2.sy - 66);
  const pScExt = worldToScreen(3.5, 18.5, 0, camX, camY);
  drawWallSconce(ctx, pScExt.sx + 4, pScExt.sy - 66);

  // Parete Nord-Est:
  // - Orologio a cucù con pendolo tra Apex e Corridoio
  const pClock = worldToScreen(6.0, 3.5, 0, camX, camY);
  drawWallCuckooClock(ctx, pClock.sx, pClock.sy - 54, t);

  // - Quadretto con corona reale tra Corridoio e Bagno
  const pCrown = worldToScreen(10.0, 3.5, 0, camX, camY);
  drawWallPainting(ctx, pCrown.sx, pCrown.sy - 54, "👑");

  // - Quadretto con orsetto tra Bagno e Cameretta
  const pTeddy = worldToScreen(13.0, 3.5, 0, camX, camY);
  drawWallPainting(ctx, pTeddy.sx, pTeddy.sy - 54, "🧸");

  // - Finestra panoramica 4 tra Cameretta e terrazzo
  const pWin3 = worldToScreen(17.5, 3.5, 0, camX, camY);
  drawArchedWallWindow(ctx, pWin3.sx, pWin3.sy - 52, "blue");

  // - Quadretto trofeo d'oro verso il terrazzo est
  const pTrophy = worldToScreen(21.0, 3.5, 0, camX, camY);
  drawWallPainting(ctx, pTrophy.sx, pTrophy.sy - 54, "🏆");

  // - Applique luminose dorate lungo la parete NE
  const pSc3 = worldToScreen(8.5, 3.5, 0, camX, camY);
  drawWallSconce(ctx, pSc3.sx - 4, pSc3.sy - 66);
  const pSc4 = worldToScreen(14.5, 3.5, 0, camX, camY);
  drawWallSconce(ctx, pSc4.sx - 4, pSc4.sy - 66);
  const pScExtE = worldToScreen(19.0, 3.5, 0, camX, camY);
  drawWallSconce(ctx, pScExtE.sx - 4, pScExtE.sy - 66);
}

/** Pavimentazione ricca: piedistallo 3D del diorama, cotto caldo, prato smeraldo, parquet e marmo. */
function drawGroundTiles(
  ctx: CanvasRenderingContext2D,
  art: Art,
  camX: number,
  camY: number,
  _t: number,
) {
  const minX = 4;
  const maxX = 23;
  const minY = 4;
  const maxY = 23;

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

  // 2. Piastrelle superiori della superficie organizzate in quartieri tematici con grandi viali
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const { sx, sy } = worldToScreen(x, y, 0, camX, camY);

      // Distinzione delle zone della villa e dei grandi viali di raccordo
      const isCourtyard = Math.hypot(x - 11.5, y - 11.5) < 4.8;
      // Viale Reale Nord-Sud (Corso Principale da nord a sud)
      const isAvenueNS = (x === 11 || x === 12);
      // Viale Ovest-Est (Strada del Bazar e della Fontana)
      const isAvenueWE = (y === 14 || y === 15);
      const isStreet = isAvenueNS || isAvenueWE;

      // Parco Giardino Botanico a Sud-Est
      const isGarden = x >= 14 && y >= 11 && !isStreet;
      // Terrazzo Belvedere a Nord-Est
      const isTerrace = x >= 14 && y < 11 && !isStreet;
      // Soglia e marmo del Bagno d'Oro
      const isBathThreshold = (x === 11 || x === 12) && y === 4;
      // Xilofono / Passerella musicale sul terrazzo
      const isMusicTile = x === 18 && y >= 6 && y <= 10;
      // Ciottoli del sentiero nel prato (stepping stones)
      const isSteppingStone =
        (x === 15 && y === 16) ||
        (x === 16 && y === 16) ||
        (x === 15 && y === 18) ||
        (x === 14 && y === 19);

      let topColor = "#fae8d0";
      let borderColor = "#dfc299";
      let tileImg: HTMLImageElement | null = null;
      const tiles = art.hub?.tiles;

      if (isBathThreshold) {
        topColor = (x + y) % 2 === 0 ? "#fdf2f8" : "#fce7f3"; // Marmo rosa della soglia del Bagno
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
      } else if (isCourtyard || isStreet) {
        topColor = (x + y) % 2 === 0 ? "#ffeed9" : "#fbe3c7"; // Cotto caldo fiorentino
        borderColor = "#e8c9a3";
        tileImg = tiles?.cotto ?? null;
      } else {
        // Parquet caldo miele della casa
        topColor = (x + y) % 2 === 0 ? "#fae8d0" : "#f3dcc0";
        borderColor = "#dfc299";
        tileImg = tiles?.wood ?? null;
      }

      // 1. Sottofondo cromatico (evita fessure tra tessere)
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

      // 3. Cordoli in pietra (stone curbs) che delimitano le strade
      if (isStreet && !isCourtyard) {
        ctx.strokeStyle = "rgba(226, 232, 240, 0.85)";
        ctx.lineWidth = 1.6;
        if (isAvenueNS) {
          if (x === 11) {
            ctx.beginPath();
            ctx.moveTo(sx - 32, sy);
            ctx.lineTo(sx, sy + 16);
            ctx.stroke();
          }
          if (x === 12) {
            ctx.beginPath();
            ctx.moveTo(sx, sy - 16);
            ctx.lineTo(sx + 32, sy);
            ctx.stroke();
          }
        }
        if (isAvenueWE) {
          if (y === 14) {
            ctx.beginPath();
            ctx.moveTo(sx - 32, sy);
            ctx.lineTo(sx, sy - 16);
            ctx.stroke();
          }
          if (y === 15) {
            ctx.beginPath();
            ctx.moveTo(sx, sy + 16);
            ctx.lineTo(sx + 32, sy);
            ctx.stroke();
          }
        }
      }

      // 4. Ciottolo naturale nel prato (stepping stone)
      if (isSteppingStone) {
        ctx.fillStyle = "rgba(241, 245, 249, 0.9)";
        ctx.beginPath();
        ctx.ellipse(sx, sy, 14, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.beginPath();
        ctx.ellipse(sx - 2, sy - 1.5, 8, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Tappeto reale rosso verso il Bagno d'Oro al centro
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
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // 6. Piastrella dello xilofono musicale sul terrazzo
      if (isMusicTile) {
        const musicColors = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#38bdf8"];
        const noteNames = ["DO", "RE", "MI", "FA", "SOL"];
        const noteIdx = y - 6;
        const color = musicColors[noteIdx] ?? "#fde047";
        const noteName = noteNames[noteIdx] ?? "DO";

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 14);
        ctx.lineTo(sx + 28, sy);
        ctx.lineTo(sx, sy + 14);
        ctx.lineTo(sx - 28, sy);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.0;
        ctx.stroke();

        ctx.font = '900 11px "Fredoka", sans-serif';
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(noteName, sx, sy);
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

  // 2. Medaglione circolare illustrato per la stanza (adatto a bimbi: zero scritte ingombranti!)
  const badgeY = sy - archH - 10;
  drawPortalMedallion(ctx, sx, badgeY, portal, art, t);

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
  } else if (npc.id === "papa") {
    // 🧸 PAPÀ ORSO: Sprite 3D illustrato con gilet blu in lana e occhialetti da lettura
    const img = art.hub.papa;
    const h = 96;
    if (img) {
      const w = h * (img.width / img.height);
      ctx.drawImage(img, -w / 2, -h, w, h);
    }
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

  // Se l'orsetto ci salta sopra: effetto cartoon di onda elastica dinamica sul tappeto
  if (isInteracting) {
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

/** Fumetto circolare compatto con icona quando sei vicino alla porta. */
function drawPortalPrompt(
  ctx: CanvasRenderingContext2D,
  portal: PortalInfo,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(portal.wx, portal.wy, 0, camX, camY);
  const floatY = Math.sin(t * 6) * 3;
  const btnY = sy - 96 + floatY;

  ctx.save();
  ctx.translate(sx, btnY);
  ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = portal.locked ? "#ef4444" : "#10b981";
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.2;
  ctx.stroke();

  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(portal.locked ? "🔒" : "▶", 0, 0.5);
  ctx.restore();
}

/** Fumetto circolare compatto con icona quando sei vicino a un amico o al Bazar. */
function drawNpcPrompt(
  ctx: CanvasRenderingContext2D,
  npc: NpcInfo,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(npc.wx, npc.wy, 0, camX, camY);
  const floatY = Math.sin(t * 6) * 3;
  const isShop = npc.id === "coniglio";
  const btnY = (isShop ? sy - 92 : sy - 84) + floatY;

  ctx.save();
  ctx.translate(sx, btnY);
  ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = isShop ? "#f59e0b" : "#3b82f6";
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.2;
  ctx.stroke();

  ctx.font = "15px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(isShop ? "🛍️" : "💬", 0, 0.5);
  ctx.restore();
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

/** Lampione vittoriano in ferro battuto con lanterna esagonale e alone di luce proiettato sul suolo. */
function drawLamppost(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(wx, wy, 0, camX, camY);

  // 1. Grande alone caldo e luminoso proiettato sul selciato
  const lightGlow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 52);
  lightGlow.addColorStop(0, "rgba(254, 240, 138, 0.38)");
  lightGlow.addColorStop(0.5, "rgba(253, 224, 71, 0.15)");
  lightGlow.addColorStop(1, "rgba(253, 224, 71, 0)");
  ctx.fillStyle = lightGlow;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 52, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Ombra soffusa alla base del basamento
  drawSoftShadow(ctx, sx, sy + 2, 16, 7, {
    maxAlpha: 0.45,
    contactRatio: 0.65,
    tone: wx >= 11.5 && wy >= 11.5 ? "grass" : "warm",
  });

  ctx.save();
  ctx.translate(sx, sy);

  // Basamento in ghisa sagomato
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#334155";
  ctx.fillRect(-6, -7, 12, 7);

  // Asta del lampione con anelli ornamentali in ottone
  const poleH = 72;
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(-2.5, -poleH, 5, poleH - 7);
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(-3.5, -24, 7, 3);
  ctx.fillRect(-3.5, -48, 7, 3);

  // Braccetti a voluta della lanterna
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -poleH + 4);
  ctx.quadraticCurveTo(0, -poleH + 8, 6, -poleH + 4);
  ctx.stroke();

  // Lanterna esagonale
  const ly = -poleH - 12;
  const lw = 16;
  const lh = 20;

  // Fondo lanterna
  ctx.fillStyle = "#334155";
  ctx.fillRect(-lw / 2 + 2, ly + lh - 3, lw - 4, 3);

  // Vetro luminoso con luce dorata calda
  const flicker = 1 + Math.sin(t * 7.5 + wx) * 0.08;
  const glassGlow = ctx.createLinearGradient(0, ly, 0, ly + lh);
  glassGlow.addColorStop(0, `rgba(254, 240, 138, ${0.9 * flicker})`);
  glassGlow.addColorStop(0.5, `rgba(253, 224, 71, ${0.95 * flicker})`);
  glassGlow.addColorStop(1, `rgba(251, 146, 60, ${0.85 * flicker})`);
  ctx.fillStyle = glassGlow;
  ctx.fillRect(-lw / 2 + 1, ly, lw - 2, lh - 3);

  // Cornice e montanti della lanterna
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-lw / 2 + 1, ly, lw - 2, lh - 3);
  ctx.beginPath();
  ctx.moveTo(0, ly);
  ctx.lineTo(0, ly + lh - 3);
  ctx.stroke();

  // Tettuccio a cuspide della lanterna con puntale dorato
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.moveTo(-lw / 2 - 2, ly);
  ctx.lineTo(0, ly - 9);
  ctx.lineTo(lw / 2 + 2, ly);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(0, ly - 9, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Panchina del parco in legno noce lucido con braccioli in ferro battuto. */
function drawParkBench(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  rot: "SE" | "SW",
  camX: number,
  camY: number,
) {
  const { sx, sy } = worldToScreen(wx, wy, 0, camX, camY);
  const flip = rot === "SW" ? -1 : 1;

  // Ombra a terra
  drawSoftShadow(ctx, sx, sy + 3, 30, 13, {
    tone: "warm",
    maxAlpha: 0.36,
    contactRatio: 0.5,
  });

  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(flip, 1);

  // Piedi in ghisa
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-20, 2);
  ctx.lineTo(-14, -12);
  ctx.lineTo(-10, -3);
  ctx.moveTo(14, 8);
  ctx.lineTo(20, -6);
  ctx.lineTo(24, 3);
  ctx.stroke();

  // Doghe della seduta (legno noce caldo)
  const slats = [
    { y: -10, col: "#92400e" },
    { y: -7, col: "#b45309" },
    { y: -4, col: "#d97706" },
  ];
  for (const s of slats) {
    ctx.fillStyle = s.col;
    ctx.beginPath();
    ctx.moveTo(-22, s.y);
    ctx.lineTo(20, s.y + 10);
    ctx.lineTo(22, s.y + 13);
    ctx.lineTo(-20, s.y + 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Schienale
  for (let bi = 0; bi < 2; bi++) {
    const by = -20 + bi * 4;
    ctx.fillStyle = bi === 0 ? "#b45309" : "#d97706";
    ctx.beginPath();
    ctx.moveTo(-22, by);
    ctx.lineTo(20, by + 10);
    ctx.lineTo(20, by + 13);
    ctx.lineTo(-22, by + 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Bracciolo decorativo
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(-16, -14, 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/** Tavolino bistrot da tè con ombrellone pastello a spicchi. */
function drawBistroTable(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(wx, wy, 0, camX, camY);

  // Ombra a terra del tavolino e dell'ombrellone
  drawSoftShadow(ctx, sx, sy + 3, 34, 15, {
    tone: "warm",
    maxAlpha: 0.38,
    contactRatio: 0.52,
  });

  ctx.save();
  ctx.translate(sx, sy);

  // Sedie da bistrot in ferro battuto bianco (2 sedie)
  // Sedia 1 (sinistra)
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(-22, -18);
  ctx.arc(-22, -22, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#fde047";
  ctx.fillRect(-26, -10, 9, 3);

  // Sedia 2 (destra)
  ctx.beginPath();
  ctx.moveTo(22, 6);
  ctx.lineTo(22, -12);
  ctx.arc(22, -16, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#f472b6";
  ctx.fillRect(17, -4, 9, 3);

  // Gamba centrale del tavolo in ferro
  ctx.fillStyle = "#64748b";
  ctx.fillRect(-2, -22, 4, 22);
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Piano rotondo del tavolo smaltato bianco
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(0, -22, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Servizio da tè: tazzina fumante e piattino con biscotti
  ctx.fillStyle = "#f472b6";
  ctx.fillRect(-8, -27, 6, 5); // Tazzina rosa
  ctx.fillStyle = "#fde047";
  ctx.fillRect(-10, -22, 10, 2); // Piattino
  // Vapore che sale
  const steamY = Math.sin(t * 3.5) * 3;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-5, -29);
  ctx.quadraticCurveTo(-7, -33 + steamY, -5, -37 + steamY);
  ctx.stroke();

  // Biscottini dorati sul piatto destro
  ctx.fillStyle = "#b45309";
  ctx.beginPath();
  ctx.arc(6, -24, 2.5, 0, Math.PI * 2);
  ctx.arc(10, -23, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Palo centrale dell'ombrellone
  const umbrellaH = 88;
  ctx.fillStyle = "#78350f";
  ctx.fillRect(-2.5, -umbrellaH, 5, umbrellaH - 22);

  // Calotta dell'ombrellone da sole pastello a spicchi (giallo e rosa pastello)
  const uy = -umbrellaH;
  const uw = 52;
  const uh = 26;
  const segments = [
    { c: "#fde047" },
    { c: "#f472b6" },
    { c: "#fde047" },
    { c: "#f472b6" },
    { c: "#fde047" },
  ];

  ctx.save();
  ctx.translate(0, uy);
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    const segW = uw / segments.length;
    const x0 = -uw / 2 + i * segW;
    const x1 = x0 + segW;

    ctx.fillStyle = seg.c;
    ctx.beginPath();
    ctx.moveTo(0, -uh);
    ctx.lineTo(x0, 0);
    ctx.quadraticCurveTo((x0 + x1) / 2, 4, x1, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Puntale in ottone in cima all'ombrellone
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(0, -uh - 2, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/** Canestro da basket giocattolo con tabellone, anello, retina animata e score. */
function drawBasketballHoop(
  ctx: CanvasRenderingContext2D,
  hoop: HubState["toys"]["hoop"],
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(hoop.wx, hoop.wy, 0, camX, camY);

  // Ombra a terra del basamento e del canestro
  drawSoftShadow(ctx, sx, sy + 3, 32, 14, {
    tone: "grass",
    maxAlpha: 0.42,
    contactRatio: 0.6,
  });

  ctx.save();
  ctx.translate(sx, sy);

  // Basamento imbottito blu
  ctx.fillStyle = "#1e3a8a";
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(-10, -12, 20, 12);
  ctx.strokeStyle = "#1d4ed8";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-10, -12, 20, 12);

  // Asta ricurva in acciaio (sale fino a 95px e si piega in avanti)
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(0, -78);
  ctx.quadraticCurveTo(0, -96, -14, -96);
  ctx.stroke();

  // Tabellone trasparente con bordo rosso brillante
  const bbX = -18;
  const bbY = -120;
  const bbW = 46;
  const bbH = 34;

  ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
  ctx.fillRect(bbX - bbW / 2, bbY, bbW, bbH);
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(bbX - bbW / 2, bbY, bbW, bbH);

  // Bersaglio rettangolare interno
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 1.8;
  ctx.strokeRect(bbX - 10, bbY + 16, 20, 14);

  // Anello in metallo arancione (ferro)
  const rimX = bbX;
  const rimY = bbY + 30;
  const rimRx = 14;
  const rimRy = 6;

  ctx.strokeStyle = "#ea580c";
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.ellipse(rimX, rimY, rimRx, rimRy, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Retina animata (effetto swish se fatto canestro di recente!)
  const isSwishing = hoop.swishT > 0 && t - hoop.swishT < 0.75;
  const swishWave = isSwishing ? Math.sin((t - hoop.swishT) * 18) * 6 : Math.sin(t * 3) * 1.5;
  const netH = 22;

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let fi = -rimRx + 2; fi <= rimRx - 2; fi += 4) {
    const bottomFi = fi * 0.55 + (isSwishing ? swishWave * (fi > 0 ? 1 : -1) : swishWave * 0.3);
    ctx.moveTo(rimX + fi, rimY);
    ctx.lineTo(rimX + bottomFi, rimY + netH);
  }
  for (let ri = 1; ri <= 3; ri++) {
    const ny = rimY + (netH * ri) / 3;
    const rScale = 1 - ri * 0.15 + (isSwishing ? 0.3 : 0);
    ctx.moveTo(rimX - rimRx * rScale, ny);
    ctx.lineTo(rimX + rimRx * rScale, ny);
  }
  ctx.stroke();

  // Se ci sono punti a canestro, mostra solo un numerino elegante sul tabellone
  if (hoop.score > 0) {
    ctx.font = '900 13px "Fredoka", sans-serif';
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${hoop.score}`, bbX, bbY - 2);
  }

  ctx.restore();
}

/** Cannocchiale panoramico in ottone sul terrazzo belvedere. */
function drawTelescope(
  ctx: CanvasRenderingContext2D,
  tel: HubState["toys"]["telescope"],
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(tel.wx, tel.wy, 0, camX, camY);

  // Ombra a terra
  drawSoftShadow(ctx, sx, sy + 3, 24, 11, {
    tone: "cool",
    maxAlpha: 0.35,
    contactRatio: 0.55,
  });

  ctx.save();
  ctx.translate(sx, sy);

  // Treppiede in legno mogano lucido
  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.lineTo(-12, 0);
  ctx.moveTo(0, -32);
  ctx.lineTo(12, 3);
  ctx.moveTo(0, -32);
  ctx.lineTo(0, 5);
  ctx.stroke();

  // Snodo e montante in ottone dorato
  ctx.fillStyle = "#d97706";
  ctx.beginPath();
  ctx.arc(0, -34, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Tubo ottico del cannocchiale in ottone lucido puntato verso l'alto-destra
  ctx.save();
  ctx.translate(0, -34);
  ctx.rotate(-0.48);

  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(-18, -4, 38, 8);
  ctx.strokeStyle = "#b45309";
  ctx.lineWidth = 1;
  ctx.strokeRect(-18, -4, 38, 8);

  // Lente obiettiva anteriore larga
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(20, -5.5, 5, 11);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(21, -3, 2, 4);

  // Oculare posteriore
  ctx.fillStyle = "#78350f";
  ctx.fillRect(-22, -2.5, 5, 5);

  ctx.restore();

  // Scintilla brillante sulla lente
  const glint = (Math.sin(t * 4) + 1) * 0.5;
  ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * glint})`;
  ctx.beginPath();
  ctx.arc(16, -42, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Stellina dorata 3D fluttuante a quota wz sopra il trampolino. */
function drawAerialStar(
  ctx: CanvasRenderingContext2D,
  s: HubState["toys"]["trampStars"][0],
  camX: number,
  camY: number,
  t: number,
) {
  const bob = Math.sin(t * 4.5 + s.id) * 3;
  const { sx, sy } = worldToScreen(s.wx, s.wy, s.wz, camX, camY);
  const groundPos = worldToScreen(s.wx, s.wy, 0, camX, camY);

  // Ombra a terra proporzionata all'altitudine
  const shadowDist = Math.max(0.15, 1 - s.wz * 0.28);
  drawSoftShadow(ctx, groundPos.sx, groundPos.sy + 2, 16 * shadowDist, 7 * shadowDist, {
    tone: "grass",
    maxAlpha: 0.25 * shadowDist,
  });

  ctx.save();
  ctx.translate(sx, sy + bob);

  // Alone luminoso attorno alla stella
  const starGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
  starGlow.addColorStop(0, "rgba(254, 240, 138, 0.75)");
  starGlow.addColorStop(0.5, "rgba(250, 204, 21, 0.25)");
  starGlow.addColorStop(1, "rgba(250, 204, 21, 0)");
  ctx.fillStyle = starGlow;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();

  // Stella 3D a 5 punte
  ctx.rotate(t * 1.8 + s.id);
  const spikes = 5;
  const outerR = 12;
  const innerR = 5.5;
  ctx.fillStyle = "#facc15";
  ctx.strokeStyle = "#eab308";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / spikes;
    const x = Math.sin(a) * r;
    const y = -Math.cos(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Punto luce lucido
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-2, -3, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Albero di mele interattivo con frutti pendenti e scuotimento. */
function drawInteractiveAppleTree(
  ctx: CanvasRenderingContext2D,
  tree: HubState["toys"]["appleTrees"][0],
  art: Art,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(tree.wx, tree.wy, 0, camX, camY);
  const isGrass = tree.wx >= 11.5 && tree.wy >= 11.5;
  const treeTone: "grass" | "warm" = isGrass ? "grass" : "warm";

  // Ombra diffusa alla base del tronco
  drawSoftShadow(ctx, sx, sy + 4, 34, 16, {
    tone: treeTone,
    maxAlpha: 0.35,
    contactRatio: 0.45,
    contactAlpha: 0.22,
  });

  ctx.save();
  const isShaking = tree.shakeT > 0 && t - tree.shakeT < 0.6;
  const shakeOffX = isShaking ? Math.sin((t - tree.shakeT) * 32) * (0.6 - (t - tree.shakeT)) * 8 : 0;
  ctx.translate(sx + shakeOffX, sy);

  const img = art.hub.tree;
  const tw = 94;
  if (img) {
    const th = tw * (img.height / img.width);
    ctx.drawImage(img, -tw / 2, -th + 8, tw, th);
  }

  // Mele rimaste sui rami dell'albero
  const applePositions = [
    { x: -18, y: -64 },
    { x: 12, y: -72 },
    { x: -4, y: -82 },
  ];
  for (let i = 0; i < tree.apples; i++) {
    const ap = applePositions[i];
    if (!ap) continue;
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(ap.x, ap.y, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b91c1c";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ap.x - 1.5, ap.y - 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#22c55e";
    ctx.fillRect(ap.x - 0.5, ap.y - 7, 1.5, 2.5);
  }

  ctx.restore();
}

/** Mela caduta a terra con fisica e rotolamento. */
function drawFallingApple(
  ctx: CanvasRenderingContext2D,
  apple: HubState["toys"]["appleTrees"][0]["fallingApples"][0],
  camX: number,
  camY: number,
) {
  const { sx, sy } = worldToScreen(apple.wx, apple.wy, apple.wz, camX, camY);
  const groundPos = worldToScreen(apple.wx, apple.wy, 0, camX, camY);

  // Ombra a terra
  const shadowDist = Math.max(0.2, 1 - apple.wz * 0.35);
  drawSoftShadow(ctx, groundPos.sx, groundPos.sy + 2, 9 * shadowDist, 4.5 * shadowDist, {
    tone: "grass",
    maxAlpha: 0.35 * shadowDist,
  });

  ctx.save();
  ctx.translate(sx, sy);
  ctx.globalAlpha = Math.max(0, Math.min(1, apple.alpha));

  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b91c1c";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-1.8, -1.8, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#15803d";
  ctx.fillRect(-0.5, -8, 1.5, 2.5);

  ctx.restore();
}

/** Aura arcobaleno incantata della Fontana dei Desideri della Paperella. */
function drawWishingAura(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  auraT: number,
  camX: number,
  camY: number,
  t: number,
) {
  const { sx, sy } = worldToScreen(wx, wy, 0, camX, camY);
  const alpha = Math.min(1, auraT * 0.4);

  ctx.save();
  ctx.translate(sx, sy);

  const rainbowColors = [
    "rgba(244, 114, 182, ",
    "rgba(250, 204, 21, ",
    "rgba(56, 189, 248, ",
    "rgba(74, 222, 128, ",
  ];

  for (let i = 0; i < rainbowColors.length; i++) {
    const rBase = 48 + i * 16 + Math.sin(t * 3 + i) * 6;
    ctx.strokeStyle = `${rainbowColors[i]}${0.45 * alpha})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(0, -6, rBase, rBase * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let p = 0; p < 8; p++) {
    const px = Math.sin(t * 4 + p * 1.2) * 36;
    const py = -20 - ((t * 24 + p * 18) % 65);
    ctx.fillStyle = `rgba(250, 204, 21, ${0.85 * alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Cuoricino fluttuante delle coccole di Micio. */
function drawPetHeart(
  ctx: CanvasRenderingContext2D,
  h: HubState["toys"]["micioPet"]["hearts"][0],
  camX: number,
  camY: number,
) {
  const { sx, sy } = worldToScreen(h.wx, h.wy, h.wz, camX, camY);

  ctx.save();
  ctx.translate(sx, sy);
  ctx.globalAlpha = Math.max(0, Math.min(1, h.alpha));

  ctx.fillStyle = "#ec4899";
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-5, -4, -10, -2, -10, -6);
  ctx.bezierCurveTo(-10, -11, -4, -11, 0, -6);
  ctx.bezierCurveTo(4, -11, 10, -11, 10, -6);
  ctx.bezierCurveTo(10, -2, 5, -4, 0, 3);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-4, -8, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Messaggio fluttuante pop dinamico ("CANESTRO! +2 ⭐", "GNAM! 🍎 +1 ⭐", ecc). */
function drawFloatingMessage(
  ctx: CanvasRenderingContext2D,
  msg: HubState["floatingMessages"][0],
  camX: number,
  camY: number,
) {
  const { sx, sy } = worldToScreen(msg.wx, msg.wy, msg.wz, camX, camY);

  ctx.save();
  ctx.translate(sx, sy);

  const text = msg.text;
  ctx.font = '900 13px "Fredoka", "Nunito", sans-serif';
  const textW = ctx.measureText(text).width;
  const pillW = textW + 28;
  const pillH = 26;

  ctx.fillStyle = "rgba(45, 20, 10, 0.28)";
  ctx.beginPath();
  ctx.roundRect(-pillW / 2 + 2, -pillH / 2 + 2, pillW, pillH, 13);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(-pillW / 2, -pillH / 2, pillW, pillH, 13);
  ctx.fill();
  ctx.strokeStyle = msg.color;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.fillStyle = "#1e293b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0.5);

  ctx.restore();
}
