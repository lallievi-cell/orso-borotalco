import type { Art } from "@/game/assets";
import type { Sim } from "@/game/sim";
import type { Enemy, Solid, Theme } from "@/game/types";
import { PH, PW, VIEW_H, VIEW_W } from "@/game/types";
import { drawHat } from "@/game/hub/cosmetics";

const THEME = {
  salotto: {
    sky0: "#ffe7d4",
    sky1: "#f3b89a",
    wall: "#f6c7ae",
    wainscot: "#e7a88c",
    floor0: "#e7b89a",
    floor1: "#c9846a",
    line: "rgba(255,248,240,0.35)",
    rug: "rgba(214,92,92,0.28)",
    wood: "#d9916a",
  },
  corridoio: {
    sky0: "#fff1d4",
    sky1: "#e7c07a",
    wall: "#f3ddb0",
    wainscot: "#e2c48a",
    floor0: "#e6c48a",
    floor1: "#c4964e",
    line: "rgba(255,248,230,0.4)",
    rug: "rgba(196,92,60,0.22)",
    wood: "#c9843a",
  },
  cucina: {
    sky0: "#fff4d8",
    sky1: "#f0c48a",
    wall: "#f7e2b8",
    wainscot: "#e7c48a",
    floor0: "#f0d2a4",
    floor1: "#c99258",
    line: "rgba(255,248,230,0.4)",
    rug: "rgba(90,150,90,0.2)",
    wood: "#d08a45",
  },
  cameretta: {
    sky0: "#f6e9ff",
    sky1: "#e7c4ea",
    wall: "#f8e4f4",
    wainscot: "#e7c0d8",
    floor0: "#f0d0c4",
    floor1: "#d09a8c",
    line: "rgba(255,250,250,0.4)",
    rug: "rgba(140,110,200,0.2)",
    wood: "#c984a8",
  },
  giardino: {
    sky0: "#e7f6d8",
    sky1: "#b7dd8a",
    wall: "#d7efb4",
    wainscot: "#8fbf6a",
    floor0: "#c6e39a",
    floor1: "#7eaa55",
    line: "rgba(255,255,255,0.35)",
    rug: "rgba(70,140,60,0.18)",
    wood: "#6e9a48",
  },
  lavanderia: {
    sky0: "#eef6ff",
    sky1: "#c5dff5",
    wall: "#e4f0fa",
    wainscot: "#b9d4ea",
    floor0: "#d5e4f2",
    floor1: "#8fb0c8",
    line: "rgba(255,255,255,0.45)",
    rug: "rgba(120,170,210,0.2)",
    wood: "#7ea4c0",
  },
  terrazzo: {
    sky0: "#dff4ff",
    sky1: "#f8d9b0",
    wall: "#f7e7cf",
    wainscot: "#e7c8a0",
    floor0: "#f0d2b0",
    floor1: "#c99262",
    line: "rgba(255,255,255,0.4)",
    rug: "rgba(255,255,255,0.25)",
    wood: "#d08a55",
  },
  bagno: {
    sky0: "#eef8f6",
    sky1: "#c5e4dc",
    wall: "#e4f4f0",
    wainscot: "#b7ddd4",
    floor0: "#d5eeea",
    floor1: "#8ec9be",
    line: "rgba(255,255,255,0.55)",
    rug: "rgba(255,255,255,0.35)",
    wood: "#7eb8ae",
  },
} as const satisfies Record<Theme, unknown>;

function frameAt(list: (HTMLImageElement | null)[], t: number, fps: number) {
  const ready = list.filter((img): img is HTMLImageElement => !!img);
  if (!ready.length) return null;
  const i = Math.floor(Math.max(0, t) * fps) % ready.length;
  return ready[i] ?? null;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}

function drawStar5(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
    const d = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeartShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.4);
  ctx.bezierCurveTo(cx - r, cy - r * 0.3, cx - r * 0.5, cy - r, cx, cy - r * 0.5);
  ctx.bezierCurveTo(cx + r * 0.5, cy - r, cx + r, cy - r * 0.3, cx, cy + r * 0.4);
  ctx.closePath();
  ctx.fill();
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  sim: Sim,
  art: Art,
  camX: number,
  camY: number,
) {
  const bg = art.bg[sim.theme];
  if (bg && bg.complete && bg.naturalWidth > 0) {
    const iw = VIEW_H * (bg.width / bg.height);
    let x = -((camX * 0.28) % iw);
    if (x > 0) x -= iw;
    const yOff = -Math.round(camY * 0.12);
    for (; x < VIEW_W + 2; x += iw - 1) {
      ctx.drawImage(bg, Math.floor(x), yOff, Math.ceil(iw + 1), VIEW_H);
    }
    // Very gentle ambient wash for maximum contrast of gameplay platforms and bear
    const wash = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    wash.addColorStop(0, "rgba(255,255,255,0.04)");
    wash.addColorStop(0.7, "rgba(255,255,255,0.12)");
    wash.addColorStop(1, "rgba(255,255,255,0.32)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    return;
  }

  const theme = THEME[sim.theme];
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, theme.sky0);
  sky.addColorStop(1, theme.sky1);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  ctx.translate(0, -camY * 0.12);
  const sunX = VIEW_W * 0.72 - camX * 0.04;
  const glow = ctx.createRadialGradient(sunX, 70, 10, sunX, 90, 220);
  glow.addColorStop(0, "rgba(255,244,214,0.9)");
  glow.addColorStop(1, "rgba(255,244,214,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW_W, 320);

  const par = camX * (sim.theme === "corridoio" ? 0.28 : 0.18);
  if (sim.theme === "salotto") {
    for (let i = 0; i < 4; i++) {
      const x = 80 + i * 280 - (par % 280);
      ctx.fillStyle = "rgba(255,250,244,0.55)";
      roundRect(ctx, x, 78, 110, 132, 12);
      ctx.fill();
      ctx.fillStyle = "rgba(186,214,232,0.55)";
      ctx.fillRect(x + 10, 90, 90, 78);
      ctx.fillStyle = "rgba(232,120,120,0.35)";
      ctx.fillRect(x, 78, 16, 132);
      ctx.fillRect(x + 94, 78, 16, 132);
    }
  } else if (sim.theme === "cucina") {
    for (let i = 0; i < 5; i++) {
      const x = 40 + i * 200 - (par % 200);
      ctx.fillStyle = "rgba(90,70,50,0.18)";
      ctx.fillRect(x + 40, 70, 4, 36);
      ctx.fillStyle = "rgba(70,70,78,0.35)";
      ctx.beginPath();
      ctx.ellipse(x + 42, 118, 22, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(70,70,78,0.45)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x + 18, 112, 16, 0.2, Math.PI * 1.2);
      ctx.stroke();
    }
  } else if (sim.theme === "cameretta") {
    for (let i = 0; i < 6; i++) {
      const x = 70 + i * 160 - (par % 160);
      ctx.fillStyle = i % 2 ? "rgba(244,160,186,0.45)" : "rgba(168,196,240,0.45)";
      ctx.beginPath();
      ctx.moveTo(x, 150);
      ctx.lineTo(x + 28, 118);
      ctx.lineTo(x + 56, 150);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,244,210,0.85)";
    ctx.beginPath();
    ctx.arc(VIEW_W * 0.2, 86, 22, 0, Math.PI * 2);
    ctx.fill();
  } else if (sim.theme === "corridoio") {
    for (let i = -1; i < 8; i++) {
      const x = i * 220 - (par % 220);
      ctx.fillStyle = "rgba(255,248,236,0.45)";
      ctx.beginPath();
      ctx.moveTo(x, 250);
      ctx.lineTo(x, 120);
      ctx.quadraticCurveTo(x + 70, 60, x + 140, 120);
      ctx.lineTo(x + 140, 250);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(120,86,48,0.12)";
      roundRect(ctx, x + 48, 140, 44, 70, 6);
      ctx.fill();
    }
  } else if (sim.theme === "giardino") {
    for (let i = 0; i < 5; i++) {
      const x = 30 + i * 220 - (par % 220);
      ctx.fillStyle = "rgba(70,140,70,0.28)";
      ctx.beginPath();
      ctx.arc(x + 40, 150, 34, 0, Math.PI * 2);
      ctx.arc(x + 70, 140, 28, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (sim.theme === "lavanderia") {
    ctx.strokeStyle = "rgba(90,110,130,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 120);
    ctx.lineTo(VIEW_W, 120);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 150 - (par % 150);
      ctx.fillStyle = i % 2 ? "rgba(244,176,196,0.8)" : "rgba(180,214,240,0.85)";
      ctx.fillRect(x, 122, 36, 28);
    }
  } else if (sim.theme === "terrazzo") {
    ctx.strokeStyle = "rgba(120,90,60,0.28)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 210);
    ctx.lineTo(VIEW_W, 210);
    ctx.stroke();
    for (let x = -((par * 0.4) % 48); x < VIEW_W; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 188);
      ctx.lineTo(x, 232);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 2;
    for (let x = -((par * 0.5) % 48); x < VIEW_W; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, 250);
      ctx.stroke();
    }
    for (let y = 40; y < 250; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_W, y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.beginPath();
    ctx.arc(VIEW_W * 0.78 - camX * 0.05, 130, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#9fd0c6";
    ctx.lineWidth = 6;
    ctx.stroke();
  }
  ctx.restore();
}

function drawRoom(ctx: CanvasRenderingContext2D, sim: Sim, art: Art, camX: number) {
  const theme = THEME[sim.theme];
  const y = sim.groundY;
  const hasBg = !!(art.bg[sim.theme] && art.bg[sim.theme]!.complete && art.bg[sim.theme]!.naturalWidth > 0);

  const left = Math.max(0, camX - 80);
  const right = Math.min(sim.w, camX + VIEW_W + 80);

  if (!hasBg) {
    ctx.fillStyle = theme.wainscot;
    ctx.fillRect(0, y - 118, sim.w, 118);
    ctx.fillStyle = "rgba(255,250,244,0.7)";
    ctx.fillRect(0, y - 112, sim.w, 6);

    if (sim.theme === "salotto") {
      for (let x = 260; x < sim.w; x += 820) {
        if (x < left - 100 || x > right) continue;
        ctx.fillStyle = "#5c4032";
        ctx.fillRect(x + 18, y - 250, 8, 150);
        ctx.fillStyle = "#3f6b45";
        ctx.beginPath();
        ctx.arc(x + 22, y - 250, 28, 0, Math.PI * 2);
        ctx.arc(x + 4, y - 232, 18, 0, Math.PI * 2);
        ctx.arc(x + 40, y - 228, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#c4784a";
        roundRect(ctx, x, y - 108, 48, 36, 6);
        ctx.fill();
      }
    } else if (sim.theme === "cucina") {
      for (let x = 220; x < sim.w; x += 520) {
        if (x < left - 80 || x > right) continue;
        ctx.fillStyle = "#f7f1e6";
        roundRect(ctx, x, y - 168, 70, 56, 8);
        ctx.fill();
        ctx.fillStyle = "#e23b3b";
        ctx.beginPath();
        ctx.arc(x + 22, y - 140, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f2c14e";
        ctx.beginPath();
        ctx.arc(x + 46, y - 136, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (sim.theme === "cameretta") {
      for (let x = 300; x < sim.w; x += 700) {
        if (x < left - 80 || x > right) continue;
        ctx.fillStyle = "rgba(255,250,244,0.7)";
        roundRect(ctx, x, y - 210, 90, 70, 8);
        ctx.fill();
        ctx.fillStyle = "rgba(186,214,232,0.65)";
        ctx.fillRect(x + 8, y - 202, 74, 46);
        ctx.fillStyle = "#e7a0b8";
        roundRect(ctx, x + 120, y - 96, 54, 28, 8);
        ctx.fill();
      }
    } else if (sim.theme === "corridoio") {
      ctx.fillStyle = "rgba(255,250,244,0.28)";
      for (let x = 160; x < sim.w; x += 360) {
        if (x < left - 40 || x > right) continue;
        roundRect(ctx, x, y - 230, 22, 90, 8);
        ctx.fill();
      }
    }
  } else {
    // Elegant skirting board (battiscopa) at wall base
    ctx.fillStyle = theme.wainscot;
    ctx.fillRect(0, y - 16, sim.w, 16);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(0, y - 16, sim.w, 4);
    ctx.fillStyle = "rgba(70,40,20,0.12)";
    ctx.fillRect(0, y - 2, sim.w, 2);
  }

  const floor = ctx.createLinearGradient(0, y, 0, y + 180);
  floor.addColorStop(0, theme.floor0);
  floor.addColorStop(1, theme.floor1);
  ctx.fillStyle = floor;
  ctx.fillRect(0, y, sim.w, 220);
  ctx.fillStyle = "rgba(255,250,244,0.8)";
  ctx.fillRect(0, y, sim.w, 8);

  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 2;
  if (sim.theme === "bagno") {
    for (let x = Math.floor(left / 46) * 46; x < right; x += 46) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 170);
      ctx.stroke();
    }
    for (let row = y + 28; row < y + 170; row += 46) {
      ctx.beginPath();
      ctx.moveTo(left, row);
      ctx.lineTo(right, row);
      ctx.stroke();
    }
  } else {
    for (let x = Math.floor(left / 74) * 74; x < right; x += 74) {
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.lineTo(x + 10, y + 170);
      ctx.stroke();
    }
  }

  ctx.fillStyle = theme.rug;
  roundRect(ctx, 120, y - 6, Math.max(200, sim.w - 360), 16, 8);
  ctx.fill();
}

function pieceOn(s: Solid, t: number) {
  if (!s.pop) return true;
  const u = (((t + s.pop.phase) % s.pop.period) + s.pop.period) % s.pop.period;
  return u < s.pop.open;
}

function drawSetPiece(ctx: CanvasRenderingContext2D, s: Solid, t: number) {
  if (s.kind === "hedge") {
    ctx.fillStyle = "#2f7a45";
    ctx.beginPath();
    ctx.ellipse(s.x + s.w * 0.3, s.y + s.h * 0.45, s.w * 0.28, s.h * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(s.x + s.w * 0.62, s.y + s.h * 0.4, s.w * 0.32, s.h * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3f9a58";
    ctx.beginPath();
    ctx.ellipse(s.x + s.w * 0.48, s.y + 16, s.w * 0.22, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f2c14e";
    ctx.beginPath();
    ctx.arc(s.x + 24, s.y + 22, 4, 0, Math.PI * 2);
    ctx.arc(s.x + s.w - 28, s.y + 18, 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (s.kind === "basket") {
    ctx.fillStyle = "#c9843a";
    roundRect(ctx, s.x, s.y, s.w, s.h + 8, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,50,20,0.35)";
    ctx.lineWidth = 2;
    for (let x = s.x + 10; x < s.x + s.w; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, s.y + 4);
      ctx.lineTo(x, s.y + s.h);
      ctx.stroke();
    }
    ctx.strokeStyle = "#8a5a28";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(s.x + 16, s.y + 6);
    ctx.quadraticCurveTo(s.x + s.w / 2, s.y - 22, s.x + s.w - 16, s.y + 6);
    ctx.stroke();
    return;
  }
  const on = pieceOn(s, t);
  ctx.save();
  ctx.globalAlpha = on ? 0.94 : 0.22;
  const bob = Math.sin(t * 3 + s.x) * 3;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2 + bob, s.w / 2, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(150,210,230,0.9)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Faccina sorridente e simpatica sulle bolle
  if (on) {
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2 + bob;
    ctx.strokeStyle = "#5a9ab8";
    ctx.lineWidth = 2;
    // Occhietti sorridenti ^ ^
    ctx.beginPath();
    ctx.arc(cx - 16, cy - 2, 4, Math.PI, 0);
    ctx.arc(cx + 16, cy - 2, 4, Math.PI, 0);
    ctx.stroke();
    // Boccuccia
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 5, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // Guanciotte rosa
    ctx.fillStyle = "rgba(255, 170, 190, 0.55)";
    ctx.beginPath();
    ctx.arc(cx - 24, cy + 2, 3.5, 0, Math.PI * 2);
    ctx.arc(cx + 24, cy + 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawToyBlocks(ctx: CanvasRenderingContext2D, s: Solid, _t: number) {
  // Proporzione cubica: calcola il numero di blocchi in modo che ciascuno sia un vero cubo compatto (1:1)
  const cubeTargetW = Math.max(38, s.h * 0.78);
  const n = Math.max(1, Math.round(s.w / cubeTargetW));
  const bw = s.w / n;

  // Tavolozza pastello ricca e calda (stile giocattoli in legno artigianali Montessori / Melissa & Doug)
  const palettes = [
    { top: "#ffaec2", bottom: "#f186a1", border: "#de6484" }, // Rosa confetto
    { top: "#9de0ce", bottom: "#6bc4ac", border: "#46a58d" }, // Menta salvia
    { top: "#ffe589", bottom: "#f7c74c", border: "#dba01f" }, // Miele dorato
    { top: "#a5d9fe", bottom: "#70bcf4", border: "#479bda" }, // Celeste fiordaliso
    { top: "#dfc6fc", bottom: "#bd99f6", border: "#9f71da" }, // Lilla lavanda
    { top: "#ffd4ab", bottom: "#faa870", border: "#e48443" }, // Pesca caldo
  ];

  // Le lettere compongono "C - E - L - E - S - T - E" in chiaro stampatello per la bimba
  const labels = ["C", "E", "L", "E", "S", "T", "E", "★", "♥", "A", "B", "1", "2"];

  // Indice base ordinato: il primo blocco del gioco (x=720) parte da "C" ed "E" (l'inizio di CELESTE!)
  const blockOrder = Math.max(0, Math.floor((s.x - 500) / 1000));
  const baseIdx = (blockOrder * 2) % labels.length;

  for (let i = 0; i < n; i++) {
    const gap = 3;
    const bx = s.x + i * bw + gap * 0.5;
    const bWidth = bw - gap;
    const by = s.y;
    const bHeight = s.h;

    // Altezza della faccia superiore 3D in prospettiva zenitale
    const topH = Math.round(Math.min(13, bHeight * 0.22));
    const frontY = by + topH;
    const frontH = bHeight - topH;

    const pal = palettes[(baseIdx + i) % palettes.length]!;
    const lbl = labels[(baseIdx + i) % labels.length]!;

    ctx.save();

    // 1. OMBRA DI CONTATTO A TERRA (sagomata morbida proprio sotto la base del cubo sul pavimento)
    const shadowGrad = ctx.createRadialGradient(
      bx + bWidth * 0.5, by + bHeight + 2, 2,
      bx + bWidth * 0.5, by + bHeight + 2, bWidth * 0.65
    );
    shadowGrad.addColorStop(0, "rgba(55, 26, 12, 0.40)");
    shadowGrad.addColorStop(0.5, "rgba(75, 36, 16, 0.18)");
    shadowGrad.addColorStop(1, "rgba(75, 36, 16, 0)");
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(bx + bWidth * 0.5, by + bHeight + 2, bWidth * 0.56, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. CORPO PRINCIPALE IN LEGNO MASSELLO (faggio/acero naturale levigato e smussato)
    const woodFront = ctx.createLinearGradient(bx, frontY, bx, by + bHeight);
    woodFront.addColorStop(0, "#f8eedc"); // faggio chiaro
    woodFront.addColorStop(0.3, "#ebd3ab");
    woodFront.addColorStop(0.7, "#debc88");
    woodFront.addColorStop(1, "#c3965d"); // ombra calda alla base
    ctx.fillStyle = woodFront;
    roundRect(ctx, bx, frontY, bWidth, frontH, 7);
    ctx.fill();

    // Sottile venatura e bordo del legno
    ctx.strokeStyle = "rgba(160, 110, 55, 0.35)";
    ctx.lineWidth = 1;
    roundRect(ctx, bx, frontY, bWidth, frontH, 7);
    ctx.stroke();

    // 3. FACCIA SUPERIORE 3D (prospettiva zenitale: la superficie calpestabile dove l'orsetto atterra)
    const woodTop = ctx.createLinearGradient(bx, by, bx, frontY);
    woodTop.addColorStop(0, "#fffcf2"); // luce zenitale pura
    woodTop.addColorStop(0.5, "#f5e4c0");
    woodTop.addColorStop(1, "#ebd1a4");
    ctx.fillStyle = woodTop;

    ctx.beginPath();
    ctx.moveTo(bx + 5, by + 1);
    ctx.lineTo(bx + bWidth - 5, by + 1);
    ctx.quadraticCurveTo(bx + bWidth - 0.5, by + 1, bx + bWidth - 0.5, by + 4);
    ctx.lineTo(bx + bWidth, frontY);
    ctx.lineTo(bx, frontY);
    ctx.lineTo(bx + 0.5, by + 4);
    ctx.quadraticCurveTo(bx + 0.5, by + 1, bx + 5, by + 1);
    ctx.closePath();
    ctx.fill();

    // Riflesso brillante sullo spigolo superiore (chamfer highlight)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx + 2, frontY);
    ctx.lineTo(bx + bWidth - 2, frontY);
    ctx.stroke();

    // Solco d'ombra naturale sotto lo spigolo frontale
    ctx.strokeStyle = "rgba(110, 65, 25, 0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + 1, frontY + 1);
    ctx.lineTo(bx + bWidth - 1, frontY + 1);
    ctx.stroke();

    // Delicato intaglio a stella giocattolo sulla superficie superiore in prospettiva
    ctx.save();
    ctx.translate(bx + bWidth * 0.5, by + topH * 0.5);
    ctx.scale(1, 0.52);
    ctx.fillStyle = "rgba(170, 115, 55, 0.28)";
    drawStar5(ctx, 0, 0, topH * 0.45);
    ctx.fill();
    ctx.restore();

    // 4. PANNELLO FRONTALE INCASSATO E LACCATO (vernice pastello satinata)
    const pad = 4;
    const px = bx + pad;
    const py = frontY + pad;
    const pw = bWidth - pad * 2;
    const ph = frontH - pad * 2;
    const pr = 5.5;

    // Scanalatura d'incasso nel legno (profondità 3D)
    ctx.fillStyle = "rgba(90, 45, 15, 0.22)";
    roundRect(ctx, px, py - 0.5, pw, ph + 1.5, pr);
    ctx.fill();

    // Sfondo pastello sfumato
    const panelGrad = ctx.createLinearGradient(px, py, px, py + ph);
    panelGrad.addColorStop(0, pal.top);
    panelGrad.addColorStop(1, pal.bottom);
    ctx.fillStyle = panelGrad;
    roundRect(ctx, px, py, pw, ph, pr);
    ctx.fill();

    // Cornice laccata rifinita
    ctx.strokeStyle = pal.border;
    ctx.lineWidth = 1.2;
    roundRect(ctx, px, py, pw, ph, pr);
    ctx.stroke();

    // Bagliore satinato bombato in alto
    const sheen = ctx.createLinearGradient(px, py, px, py + ph * 0.42);
    sheen.addColorStop(0, "rgba(255, 255, 255, 0.52)");
    sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = sheen;
    roundRect(ctx, px + 1, py + 1, pw - 2, ph * 0.42, pr - 1);
    ctx.fill();

    // Spigolo luminoso interno sul bordo inferiore del pannello
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 3, py + ph - 1.5);
    ctx.lineTo(px + pw - 3, py + ph - 1.5);
    ctx.stroke();

    // Smussature laterali 3D: spigolo di luce a sinistra, ombra di spessore a destra
    const bevelLeft = ctx.createLinearGradient(bx, frontY, bx + 3, frontY);
    bevelLeft.addColorStop(0, "rgba(255, 255, 255, 0.4)");
    bevelLeft.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = bevelLeft;
    roundRect(ctx, bx, frontY + 2, 3, frontH - 4, 3);
    ctx.fill();

    const bevelRight = ctx.createLinearGradient(bx + bWidth - 3, frontY, bx + bWidth, frontY);
    bevelRight.addColorStop(0, "rgba(0, 0, 0, 0)");
    bevelRight.addColorStop(1, "rgba(80, 40, 15, 0.2)");
    ctx.fillStyle = bevelRight;
    roundRect(ctx, bx + bWidth - 3, frontY + 2, 3, frontH - 4, 3);
    ctx.fill();

    // 5. LETTERA O SIMBOLO SCOLPITO IN 3D A FORTE RILIEVO (stampatello chiaro)
    const cx = px + pw * 0.5;
    const cy = py + ph * 0.5 + 0.5;
    const fontSize = Math.max(19, Math.min(28, Math.round(ph * 0.62)));

    ctx.font = `800 ${fontSize}px "Nunito", "Fredoka", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // a) Ombra profonda d'incisione/bassorilievo (verso il basso)
    ctx.fillStyle = "rgba(45, 15, 20, 0.38)";
    ctx.fillText(lbl, cx, cy + 2.2);

    // b) Ombra intermedia
    ctx.fillStyle = "rgba(65, 25, 30, 0.22)";
    ctx.fillText(lbl, cx, cy + 1.2);

    // c) Spigolo inferiore in forte luce (rilievo bianco splendente)
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillText(lbl, cx, cy + 0.8);

    // d) Ombra interna superiore di scavo
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.fillText(lbl, cx, cy - 0.7);

    // e) Superficie principale della lettera (bianco latte caldo brillante)
    ctx.fillStyle = "#ffffff";
    ctx.fillText(lbl, cx, cy);

    // f) Riflesso satinato centrale superiore
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.fillText(lbl, cx, cy - 0.3);

    // 6. BORDO LATERALE DESTRO 3D TRA CUBI ADIACENTI
    if (i < n - 1) {
      const seamGrad = ctx.createLinearGradient(bx + bWidth, frontY, bx + bWidth + gap, frontY);
      seamGrad.addColorStop(0, "rgba(80, 40, 15, 0.30)");
      seamGrad.addColorStop(1, "rgba(80, 40, 15, 0)");
      ctx.fillStyle = seamGrad;
      ctx.fillRect(bx + bWidth - 0.5, frontY, gap + 1, frontH);
    }

    ctx.restore();
  }
}

function drawTrampoline(ctx: CanvasRenderingContext2D, s: Solid, t: number) {
  // 1. Gambe tubolari metalliche curve con piedini antiscivolo in gomma
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  // Gamba sinistra
  ctx.beginPath();
  ctx.moveTo(s.x + 22, s.y + s.h - 2);
  ctx.quadraticCurveTo(s.x + 14, s.y + s.h + 10, s.x + 24, s.y + s.h + 14);
  ctx.stroke();
  // Gamba destra
  ctx.beginPath();
  ctx.moveTo(s.x + s.w - 22, s.y + s.h - 2);
  ctx.quadraticCurveTo(s.x + s.w - 14, s.y + s.h + 10, s.x + s.w - 24, s.y + s.h + 14);
  ctx.stroke();
  // Piedini in gomma nera
  ctx.fillStyle = "#1e293b";
  roundRect(ctx, s.x + 17, s.y + s.h + 11, 14, 5, 2.5);
  ctx.fill();
  roundRect(ctx, s.x + s.w - 31, s.y + s.h + 11, 14, 5, 2.5);
  ctx.fill();

  // 2. Cuscino toroidale di sicurezza perimetrale (turchese/menta lucido con finitura bombata)
  const padGrad = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.h);
  padGrad.addColorStop(0, "#7ee0ca"); // luce zenitale satinata
  padGrad.addColorStop(0.4, "#48bba0");
  padGrad.addColorStop(1, "#277a67"); // ombra inferiore
  ctx.fillStyle = padGrad;
  roundRect(ctx, s.x, s.y, s.w, s.h + 4, 14);
  ctx.fill();

  // Spigolo di luce curva in cima
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(s.x + 16, s.y + 2);
  ctx.lineTo(s.x + s.w - 16, s.y + 2);
  ctx.stroke();

  // Bordo di cucitura perimetrale
  ctx.strokeStyle = "rgba(20, 80, 65, 0.4)";
  ctx.lineWidth = 1.2;
  roundRect(ctx, s.x + 1, s.y + 1, s.w - 2, s.h + 2, 13);
  ctx.stroke();

  // 3. Telo elastico centrale di rimbalzo (tessuto tecnico teso)
  const matW = s.w - 44;
  const matX = s.x + 22;
  const matY = s.y + 4;
  const matH = s.h - 4;
  const matGrad = ctx.createLinearGradient(matX, matY, matX, matY + matH);
  matGrad.addColorStop(0, "#334155");
  matGrad.addColorStop(1, "#1e293b");
  ctx.fillStyle = matGrad;
  roundRect(ctx, matX, matY, matW, matH, 8);
  ctx.fill();

  // Mirino/stella elastica al centro del telo
  ctx.strokeStyle = "rgba(255, 220, 100, 0.65)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(s.x + s.w / 2, matY + matH / 2, 7.5, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Molle di tensione visibili ai lati (spirali in metallo cromato)
  for (let i = 0; i < 2; i++) {
    const sx = i === 0 ? s.x + 9 : s.x + s.w - 21;
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.8;
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.arc(sx + 6, s.y + 7 + j * 6, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 5. Indicatore "BOING!" dinamico: freccia dorata che pulsa + stelline
  const bounceY = Math.sin(t * 6 + s.x * 0.01) * 3.5;
  const arrowCx = s.x + s.w / 2;
  const arrowCy = s.y - 12 + bounceY;

  // Freccia verso l'alto con gradiente dorato
  const arrowGrad = ctx.createLinearGradient(arrowCx, arrowCy - 9, arrowCx, arrowCy + 7);
  arrowGrad.addColorStop(0, "#ffe066");
  arrowGrad.addColorStop(1, "#f77f00");
  ctx.fillStyle = arrowGrad;
  ctx.beginPath();
  ctx.moveTo(arrowCx, arrowCy - 9);
  ctx.lineTo(arrowCx + 8.5, arrowCy + 0.5);
  ctx.lineTo(arrowCx + 3.5, arrowCy + 0.5);
  ctx.lineTo(arrowCx + 3.5, arrowCy + 7);
  ctx.lineTo(arrowCx - 3.5, arrowCy + 7);
  ctx.lineTo(arrowCx - 3.5, arrowCy + 0.5);
  ctx.lineTo(arrowCx - 8.5, arrowCy + 0.5);
  ctx.closePath();
  ctx.fill();

  // Contorno bianco puro e brillante
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Stelline gioiose ai lati
  ctx.fillStyle = "rgba(255, 225, 110, 0.85)";
  drawStar5(ctx, arrowCx - 16, arrowCy + 1 - bounceY * 0.4, 3.2);
  ctx.fill();
  drawStar5(ctx, arrowCx + 16, arrowCy + 1 - bounceY * 0.4, 3.2);
  ctx.fill();
}

function drawCushion(ctx: CanvasRenderingContext2D, s: Solid, _t: number) {
  // 1. Volant smerlato morbido sul retro (pizzo da nursery rétro)
  ctx.fillStyle = "rgba(255, 238, 230, 0.70)";
  const ruffStep = 13;
  for (let rx = s.x + 8; rx < s.x + s.w - 6; rx += ruffStep) {
    ctx.beginPath();
    ctx.arc(rx, s.y + s.h + 2, 6.5, 0, Math.PI);
    ctx.fill();
  }

  // 2. Corpo principale bombato in velluto di cotone trapuntato
  const cushGrad = ctx.createLinearGradient(s.x, s.y - 2, s.x, s.y + s.h + 8);
  cushGrad.addColorStop(0, "#ffe8df"); // riflesso superiore caldo
  cushGrad.addColorStop(0.3, "#fcaea0"); // velluto rosa pesca
  cushGrad.addColorStop(0.75, "#e8806e");
  cushGrad.addColorStop(1, "#c45846"); // ombra inferiore d'appoggio
  ctx.fillStyle = cushGrad;
  roundRect(ctx, s.x, s.y, s.w, s.h + 6, 16);
  ctx.fill();

  // Cordonetto perimetrale (piping border sartoriale di pregio)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.70)";
  ctx.lineWidth = 2;
  roundRect(ctx, s.x + 2, s.y + 2, s.w - 4, s.h + 2, 14);
  ctx.stroke();

  // Cresta morbida di luce satinata in alto
  const sheen = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.h * 0.45);
  sheen.addColorStop(0, "rgba(255, 255, 255, 0.60)");
  sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = sheen;
  roundRect(ctx, s.x + 8, s.y + 2, s.w - 16, s.h * 0.4, 10);
  ctx.fill();

  // 3. Trapuntatura sartoriale con bottoni rivestiti e pieghe di tensione a raggiera
  const btnCount = Math.max(2, Math.round(s.w / 80));
  const btnSpacing = s.w / (btnCount + 1);
  for (let b = 1; b <= btnCount; b++) {
    const bx = s.x + b * btnSpacing;
    const by = s.y + s.h * 0.52;

    // Linee di tensione del tessuto trapuntato (pieghe morbide a raggiera)
    ctx.strokeStyle = "rgba(150, 50, 38, 0.28)";
    ctx.lineWidth = 1.3;
    // Piega sinistra
    ctx.beginPath();
    ctx.moveTo(bx - 17, by - 1);
    ctx.quadraticCurveTo(bx - 8, by - 2.5, bx - 4, by);
    ctx.stroke();
    // Piega destra
    ctx.beginPath();
    ctx.moveTo(bx + 17, by - 1);
    ctx.quadraticCurveTo(bx + 8, by - 2.5, bx + 4, by);
    ctx.stroke();
    // Pieghe superiori verso gli angoli
    ctx.beginPath();
    ctx.moveTo(bx - 10, by - 7);
    ctx.quadraticCurveTo(bx - 5, by - 4, bx - 2, by - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + 10, by - 7);
    ctx.quadraticCurveTo(bx + 5, by - 4, bx + 2, by - 2);
    ctx.stroke();

    // Riflesso chiaro accanto alle pieghe (luce sulla piega)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx - 16, by);
    ctx.quadraticCurveTo(bx - 8, by - 1.5, bx - 4, by + 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + 16, by);
    ctx.quadraticCurveTo(bx + 8, by - 1.5, bx + 4, by + 1);
    ctx.stroke();

    // Scanalatura d'incavo del bottone (ombra profonda)
    ctx.fillStyle = "rgba(130, 40, 30, 0.38)";
    ctx.beginPath();
    ctx.arc(bx, by + 1, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Bottone bombato rivestito in tessuto
    const btnGrad = ctx.createLinearGradient(bx - 4, by - 4, bx + 4, by + 4);
    btnGrad.addColorStop(0, "#ffe2d8");
    btnGrad.addColorStop(0.5, "#f48c78");
    btnGrad.addColorStop(1, "#b53e2e");
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.arc(bx, by, 5, 0, Math.PI * 2);
    ctx.fill();

    // Punto luce brillante sul bottone
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.beginPath();
    ctx.arc(bx - 1.5, by - 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBench(ctx: CanvasRenderingContext2D, s: Solid, _t: number) {
  // 1. Gambe tornite in legno massello con staffe di raccordo
  const legGrad = ctx.createLinearGradient(s.x, s.y + s.h - 4, s.x, s.y + s.h + 16);
  legGrad.addColorStop(0, "#8a4f25");
  legGrad.addColorStop(1, "#5c3012");
  ctx.fillStyle = legGrad;

  // Gamba sinistra sagomata
  roundRect(ctx, s.x + 10, s.y + s.h - 4, 12, 18, 3);
  ctx.fill();
  // Gamba destra sagomata
  roundRect(ctx, s.x + s.w - 22, s.y + s.h - 4, 12, 18, 3);
  ctx.fill();

  // Traversa orizzontale di collegamento tra le gambe
  ctx.fillStyle = "#703e1a";
  ctx.fillRect(s.x + 16, s.y + s.h + 4, s.w - 32, 5);

  // 2. Tavola superiore della panca in rovere/faggio levigato (spessore 3D)
  const woodTop = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.h + 4);
  woodTop.addColorStop(0, "#f9cb94"); // faggio chiaro cerato
  woodTop.addColorStop(0.4, "#e09d57");
  woodTop.addColorStop(1, "#ab642a"); // ombra calda alla base della tavola
  ctx.fillStyle = woodTop;
  roundRect(ctx, s.x, s.y, s.w, s.h + 4, 7);
  ctx.fill();

  // Scanalatura tra le doghe di legno (2 doghe orizzontali)
  ctx.strokeStyle = "rgba(90, 42, 12, 0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(s.x + 6, s.y + s.h * 0.52);
  ctx.lineTo(s.x + s.w - 6, s.y + s.h * 0.52);
  ctx.stroke();

  // Spigolo superiore di luce cerata
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(s.x + 6, s.y + 2);
  ctx.lineTo(s.x + s.w - 6, s.y + 2);
  ctx.stroke();

  // Bordo perimetrale rifinito
  ctx.strokeStyle = "rgba(120, 60, 20, 0.4)";
  ctx.lineWidth = 1;
  roundRect(ctx, s.x, s.y, s.w, s.h + 4, 7);
  ctx.stroke();

  // Bulloni o chiodi in ottone dorato sui montanti
  ctx.fillStyle = "#d4af37";
  ctx.beginPath();
  ctx.arc(s.x + 16, s.y + s.h * 0.52, 2.5, 0, Math.PI * 2);
  ctx.arc(s.x + s.w - 16, s.y + s.h * 0.52, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.beginPath();
  ctx.arc(s.x + 15.5, s.y + s.h * 0.52 - 0.7, 0.9, 0, Math.PI * 2);
  ctx.arc(s.x + s.w - 16.5, s.y + s.h * 0.52 - 0.7, 0.9, 0, Math.PI * 2);
  ctx.fill();
}

function drawMat(ctx: CanvasRenderingContext2D, s: Solid, _t: number) {
  // 1. Frange morbide di cotone chiaro ritorto che pendono dal fondo
  ctx.strokeStyle = "rgba(255, 252, 245, 0.85)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (let x = s.x + 6; x < s.x + s.w - 4; x += 6) {
    const wave = Math.sin(x * 0.3) * 2;
    ctx.beginPath();
    ctx.moveTo(x, s.y + s.h + 2);
    ctx.lineTo(x + wave * 0.5, s.y + s.h + 9 + Math.abs(wave));
    ctx.stroke();
  }

  // 2. Base del tappeto in cotone verde salvia/tiffany intrecciato
  const matGrad = ctx.createLinearGradient(s.x, s.y + 2, s.x, s.y + s.h + 4);
  matGrad.addColorStop(0, "#8ed4c7");
  matGrad.addColorStop(0.5, "#68beaF");
  matGrad.addColorStop(1, "#449486");
  ctx.fillStyle = matGrad;
  roundRect(ctx, s.x, s.y + 2, s.w, s.h + 2, 7);
  ctx.fill();

  // Bordo di cucitura perimetrale (punto festone)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 1.2;
  roundRect(ctx, s.x + 3, s.y + 4, s.w - 6, s.h - 2, 5);
  ctx.stroke();

  // 3. Motivo decorativo a rombi / chevron berbero bianco morbido
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const step = 20;
  for (let x = s.x + 12; x < s.x + s.w - 12; x += step) {
    ctx.moveTo(x, s.y + s.h * 0.7);
    ctx.lineTo(x + step * 0.5, s.y + s.h * 0.35);
    ctx.lineTo(x + step, s.y + s.h * 0.7);
  }
  ctx.stroke();

  // Spigolo di luce superiore
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.fillRect(s.x + 6, s.y + 3, s.w - 12, 2.5);
}

function drawPlatform(ctx: CanvasRenderingContext2D, s: Solid, t: number) {
  if (s.kind === "hedge" || s.kind === "basket" || s.kind === "cloud") {
    drawSetPiece(ctx, s, t);
    return;
  }
  if (s.kind === "blocks") {
    drawToyBlocks(ctx, s, t);
    return;
  }
  ctx.fillStyle = "rgba(70,42,28,0.16)";
  ctx.beginPath();
  ctx.ellipse(s.x + s.w / 2, s.y + s.h + 10, s.w * 0.46, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  if (s.move) {
    // Delicata scia magica di movimento sotto la piattaforma mobile
    const auraBob = Math.sin(t * 4 + s.x * 0.02) * 2;
    ctx.fillStyle = "rgba(255, 230, 180, 0.22)";
    ctx.beginPath();
    ctx.ellipse(s.x + s.w / 2, s.y + s.h + 8 + auraBob, s.w * 0.52, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Piccole lucciole fatate di movimento
    ctx.fillStyle = "rgba(255, 245, 200, 0.75)";
    const spark1 = (t * 24 + s.x) % s.w;
    const spark2 = (t * 18 + s.x + s.w * 0.5) % s.w;
    ctx.beginPath();
    ctx.arc(s.x + spark1, s.y + s.h + 4 + Math.sin(t * 5 + spark1) * 3, 1.8, 0, Math.PI * 2);
    ctx.arc(s.x + spark2, s.y + s.h + 5 + Math.cos(t * 6 + spark2) * 3, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const squish = s.bounce ? 1 + Math.sin(t * 7 + s.x * 0.01) * 0.07 : 1;
  ctx.save();
  ctx.translate(s.x, s.y + s.h);
  ctx.scale(1, squish);
  ctx.translate(-s.x, -(s.y + s.h));

  if (s.bounce) {
    drawTrampoline(ctx, s, t);
  } else if (s.kind === "bench") {
    drawBench(ctx, s, t);
  } else if (s.kind === "mat") {
    drawMat(ctx, s, t);
  } else {
    drawCushion(ctx, s, t);
  }

  ctx.restore();
}

function blit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  feet: number,
  size: number,
  flip: number,
  sx = 1,
  sy = 1,
  rot = 0,
) {
  ctx.save();
  ctx.translate(cx, feet);
  ctx.scale(flip, 1);
  if (rot !== 0) ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.drawImage(img, -size / 2, -size, size, size);
  ctx.restore();
}

function enemyFrame(art: Art, e: Enemy, t: number) {
  if (e.kind === "tomato" && art.tomato) return art.tomato;
  if (e.kind === "slipper" && art.slipper) return art.slipper;
  if (e.kind === "sock" && art.sock) return art.sock;
  if (e.kind === "tomato" || e.kind === "slipper" || e.kind === "sock") return null;
  const list = art[e.kind];
  const fps = e.stun > 0 ? 3 : e.kind === "bubble" ? 6 : 8;
  return frameAt(list, e.stun > 0 ? t * 0.5 : t + e.phase, fps);
}

function drawFloorTricks(ctx: CanvasRenderingContext2D, sim: Sim) {
  for (const s of sim.slips) {
    ctx.fillStyle = "rgba(232, 196, 64, 0.45)";
    ctx.beginPath();
    ctx.ellipse(s.x + s.w / 2, sim.groundY + 6, s.w / 2, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.ellipse(s.x + s.w * 0.35, sim.groundY + 2, 18, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const vent of sim.steams) {
    const puffOn = Math.sin(sim.t * 2.1 + vent.phase) > 0.45;
    ctx.fillStyle = "#6b5344";
    roundRect(ctx, vent.x - 22, vent.y - 28, 44, 30, 8);
    ctx.fill();
    ctx.fillStyle = "#3d3a44";
    ctx.fillRect(vent.x - 26, vent.y - 34, 52, 8);
    if (puffOn) {
      ctx.fillStyle = "rgba(255,250,244,0.82)";
      ctx.beginPath();
      ctx.arc(vent.x, vent.y - 58, 16, 0, Math.PI * 2);
      ctx.arc(vent.x - 12, vent.y - 78, 12, 0, Math.PI * 2);
      ctx.arc(vent.x + 10, vent.y - 84, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const gust of sim.gusts) {
    const on = Math.sin(sim.t * 1.35 + gust.phase) > 0.15;
    const can = gust.dir < 0 ? gust.x + gust.w : gust.x;
    ctx.fillStyle = "#6aa2d0";
    roundRect(ctx, can - 14, gust.y - 36, 28, 22, 6);
    ctx.fill();
    ctx.strokeStyle = "#3d6d96";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(can, gust.y - 36);
    ctx.quadraticCurveTo(can + 16, gust.y - 58, can - 4, gust.y - 62);
    ctx.stroke();
    if (!on) continue;
    ctx.strokeStyle = "rgba(120,190,230,0.85)";
    const dir = gust.dir < 0 ? -1 : 1;
    for (let i = 0; i < 4; i++) {
      const y = gust.y - 18 - i * 6;
      ctx.beginPath();
      ctx.moveTo(can + dir * 16, y);
      ctx.lineTo(can + dir * (50 + i * 36), y - 4);
      ctx.stroke();
    }
  }
}

function drawCritter(ctx: CanvasRenderingContext2D, e: Enemy, t: number) {
  const fading = e.fade > 0;
  const alpha = fading ? Math.max(0, e.fade / 0.42) : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(e.x + e.w / 2, e.y + e.h / 2 + Math.sin(t * 5 + e.phase) * 1.5);
  ctx.scale((e.dir > 0 ? 1 : -1) * (fading ? 0.7 : 1), fading ? 0.7 : 1);
  if (e.kind === "tomato") {
    ctx.fillStyle = "#e23b3b";
    ctx.beginPath();
    ctx.ellipse(0, 4, 24, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3f8f45";
    ctx.beginPath();
    ctx.ellipse(-6, -14, 8, 5, -0.7, 0, Math.PI * 2);
    ctx.ellipse(6, -15, 7, 4, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fffaf3";
    ctx.beginPath();
    ctx.arc(-8, 2, 4, 0, Math.PI * 2);
    ctx.arc(8, 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a241c";
    ctx.beginPath();
    ctx.arc(-7, 3, 1.8, 0, Math.PI * 2);
    ctx.arc(9, 3, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#9a2424";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 10, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else if (e.kind === "sock") {
    ctx.fillStyle = "#f4f7fb";
    ctx.beginPath();
    ctx.ellipse(6, 8, 22, 12, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7eb8e8";
    roundRect(ctx, -16, -8, 20, 16, 6);
    ctx.fill();
    ctx.fillStyle = "#5c3a32";
    ctx.beginPath();
    ctx.arc(14, 4, 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const hop = Math.max(0, -e.vy) / 500;
    ctx.translate(0, -hop * 6);
    ctx.fillStyle = "#f2b5c4";
    ctx.beginPath();
    ctx.ellipse(8, 6, 28, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e089a4";
    ctx.beginPath();
    ctx.ellipse(-10, 0, 16, 12, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(16, 2, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5c3a32";
    ctx.beginPath();
    ctx.arc(16, 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 4);
    ctx.quadraticCurveTo(8, 14, 24, 6);
    ctx.stroke();
  }
  ctx.restore();
}

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  sim: Sim,
  art: Art,
  camX: number,
  camY: number,
  equippedHat?: string | null,
  equippedPowder?: string | null,
) {
  drawBackdrop(ctx, sim, art, camX, camY);

  const shake = sim.gentle ? 0 : sim.shake;
  const ox = shake ? (Math.random() - 0.5) * shake : 0;
  const oy = shake ? (Math.random() - 0.5) * shake : 0;
  ctx.save();
  ctx.translate(-Math.round(camX + ox), -Math.round(camY + oy));
  drawRoom(ctx, sim, art, camX);
  drawFloorTricks(ctx, sim);

  for (const s of sim.solids) {
    if (s.kind === "ground") continue;
    drawPlatform(ctx, s, sim.t);
  }

  for (const cp of sim.checkpoints) {
    if (art.lamp) {
      const lh = 86;
      const lw = lh * (art.lamp.width / art.lamp.height);
      ctx.drawImage(art.lamp, cp.x - lw / 2, cp.floor - lh + 6, lw, lh);
    }
    if (cp.got) {
      ctx.fillStyle = "rgba(232, 182, 58, 0.35)";
      ctx.beginPath();
      ctx.ellipse(cp.x, cp.floor - 4, 22, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  sim.coins.forEach((c, i) => {
    if (c.got || !art.star) return;
    const bob = Math.sin(sim.t * 3.4 + i) * 5;
    const squash = 0.86 + 0.14 * Math.abs(Math.sin(sim.t * 5 + i));
    ctx.save();
    ctx.translate(c.x + 15, c.y + 15 + bob);
    ctx.rotate(Math.sin(sim.t * 2 + i) * 0.12);
    ctx.scale(squash, 1);
    ctx.drawImage(art.star, -22, -22, 44, 44);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(10, -16, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  for (const item of sim.powers) {
    if (item.got) continue;
    const img =
      item.kind === "powder" ? art.powder : item.kind === "glide" ? art.ring : item.kind === "speed" ? art.brush : art.heart;
    const bob = Math.sin(sim.t * 2.4 + item.x) * 5;
    if (!img) continue;
    const ih = 52;
    const iw = ih * (img.width / img.height);
    ctx.drawImage(img, item.x + 21 - iw / 2, item.y + bob, iw, ih);
  }

  /* ── Secret collectible (Golden Duck) ── */
  if (sim.secret && !sim.secret.got) {
    const sc = sim.secret;
    const bob = Math.sin(sim.t * 3.2 + sc.x * 0.1) * 4;
    const glow = 0.55 + 0.3 * Math.sin(sim.t * 4);
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.fillStyle = "rgba(255,215,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(sc.x + sc.w / 2, sc.y + sc.h / 2 + bob, 32, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (art.goldduck) {
      const dh = 54;
      const dw = dh * (art.goldduck.width / art.goldduck.height);
      ctx.drawImage(art.goldduck, sc.x + sc.w / 2 - dw / 2, sc.y + bob, dw, dh);
    } else {
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(sc.x + sc.w / 2, sc.y + sc.h / 2 + bob, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (art.door) {
    const dx = sim.goal.x + sim.goal.w / 2;
    const dy = sim.goal.y + sim.goal.h;
    ctx.fillStyle = "rgba(90,56,40,0.18)";
    ctx.beginPath();
    ctx.ellipse(dx, dy - 4, 70, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sim.theme === "bagno" ? "#d7f3ee" : "#fff6ec";
    ctx.beginPath();
    ctx.moveTo(dx - 78, dy);
    ctx.lineTo(dx - 78, dy - 168);
    ctx.quadraticCurveTo(dx, dy - 250, dx + 78, dy - 168);
    ctx.lineTo(dx + 78, dy);
    ctx.closePath();
    ctx.fill();
    const near = Math.abs(sim.player.x - sim.goal.x) < 340;
    if (near) {
      ctx.save();
      ctx.globalAlpha = 0.2 + Math.sin(sim.t * 4) * 0.1;
      ctx.fillStyle = "#e8b63a";
      ctx.beginPath();
      ctx.ellipse(dx, dy - 8, 58, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const dh = 200;
    const dw = dh * (art.door.width / art.door.height);
    ctx.drawImage(art.door, sim.goal.x + sim.goal.w / 2 - dw / 2, sim.goal.y + sim.goal.h - dh, dw, dh);

    if ((sim.theme === "bagno" || sim.finaleLevel) && art.toilet) {
      const th = 130;
      const tw = th * (art.toilet.width / art.toilet.height);
      const tx = sim.goal.x + sim.goal.w + 14;
      const ty = dy - th;
      ctx.drawImage(art.toilet, tx, ty, tw, th);
      const bob = Math.sin(sim.t * 3.5) * 3;
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.arc(tx + tw * 0.45, ty + 18 + bob, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (sim.finale > 0 && sim.finale < 1.4) {
      const k = Math.min(1, (1.4 - sim.finale) / 0.7);
      ctx.fillStyle = sim.theme === "bagno" ? "#d7f3ee" : "#f6efe4";
      ctx.fillRect(dx - 62, dy - 188, 124 * k, 188);
      ctx.fillStyle = "#c9843a";
      ctx.beginPath();
      ctx.arc(dx - 62 + 124 * k - 14, dy - 96, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "#fffaf3";
    roundRect(ctx, sim.goal.x, sim.goal.y, sim.goal.w, sim.goal.h, 16);
    ctx.fill();
  }

  for (const e of sim.enemies) {
    if (e.fade < 0) continue;
    const img = enemyFrame(art, e, sim.t);
    if (!img) {
      drawCritter(ctx, e, sim.t);
      continue;
    }
    const fading = e.fade > 0;
    const alpha = fading ? Math.max(0, e.fade / 0.42) : 1;
    const squash = fading ? 0.35 + 0.65 * alpha : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (e.kind === "bubble") {
      const s = 78 * (fading ? 0.7 + 0.3 * alpha : 1);
      ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
      ctx.scale((e.dir > 0 ? -1 : 1) * squash, squash);
      ctx.drawImage(img, -s / 2, -s / 2, s, s);
    } else if (e.kind === "tomato" || e.kind === "slipper" || e.kind === "sock") {
      const s = 68 * (fading ? 0.75 + 0.25 * alpha : 1);
      const bob = Math.sin(sim.t * 5 + e.phase) * 1.5;
      blit(ctx, img, e.x + e.w / 2, e.y + e.h + 4 + bob, s, e.dir > 0 ? -1 : 1, 1, squash);
    } else {
      const s = (e.kind === "duck" ? 96 : 100) * (fading ? 0.75 + 0.25 * alpha : 1);
      blit(ctx, img, e.x + e.w / 2, e.y + e.h + 8, s, e.dir > 0 ? -1 : 1, 1, squash);
    }
    ctx.restore();
  }

  const p = sim.player;
  const inside = sim.finale > 0 && sim.finale < 1.05;
  if (!inside) {
    // Ombra morbida dinamica sul pavimento: sfuma e si rimpicciolisce con l'altezza
    const distToFloor = Math.max(0, sim.groundY - (p.y + PH));
    const shadowScale = Math.max(0.38, 1 - distToFloor / 380);
    const shadowAlpha = Math.max(0.06, 0.22 * shadowScale);
    ctx.fillStyle = `rgba(90, 56, 40, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(p.x + PW / 2, Math.min(sim.groundY, p.y + PH + 2), 22 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.powder > 0) {
    let cloudColor = "rgba(255,255,255,0.42)";
    if (equippedPowder === "powder_rose") cloudColor = "rgba(254,205,211,0.55)";
    else if (equippedPowder === "powder_gold") cloudColor = "rgba(254,240,138,0.6)";
    else if (equippedPowder === "powder_rainbow") {
      const hue = Math.floor((sim.t * 120) % 360);
      cloudColor = `hsla(${hue}, 80%, 75%, 0.55)`;
    }
    ctx.fillStyle = cloudColor;
    ctx.beginPath();
    ctx.ellipse(p.x + PW / 2, p.y + PH * 0.45, 48, 40, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  let sprite = frameAt(art.idle, p.anim, 3.2);
  let rot = 0;
  if (!p.grounded) {
    sprite = p.vy < -160 ? frameAt(art.jump, 1, 1) : p.vy < 120 ? frameAt(art.jump, 2, 1) : frameAt(art.jump, 3, 1);
  } else if (Math.abs(p.vx) > 20) {
    const cadence = p.speed > 0 ? 14 : 10.5;
    const stepCycle = p.anim * cadence;
    const stepPhase = Math.sin(stepCycle);

    // Passo alternato: alterna la falcata distesa (art.run) e l'appoggio al suolo a zampe unite (art.idle)
    if (Math.abs(stepPhase) < 0.28) {
      sprite = art.idle[0] ?? art.run[0];
    } else {
      sprite = art.run[0] ?? art.idle[0];
    }
  }

  if (!inside && sprite) {
    let sx = 1;
    let sy = 1;
    let offsetY = 0;

    if (p.land > 0) {
      // Atterraggio: squash morbido elastico che si distende
      const progress = p.land / 0.12;
      sy = 1 - 0.22 * progress;
      sx = 1 + 0.22 * progress;
      offsetY = 4 * progress;
    } else if (!p.grounded) {
      if (p.vy < -100) {
        // Salita nel salto: stretch verticale proporzionale allo slancio
        const factor = Math.min(0.22, -p.vy / 2600);
        sy = 1 + factor;
        sx = 1 - factor * 0.6;
        rot = p.vx > 0 ? 0.05 : p.vx < 0 ? -0.05 : 0;
      } else if (p.vy > 200) {
        // Discesa veloce: allungamento dolce verso il basso
        const factor = Math.min(0.15, p.vy / 3200);
        sy = 1 + factor;
        sx = 1 - factor * 0.5;
      }
    } else if (Math.abs(p.vx) > 20) {
      // Corsa: ritmo vivo con oscillazione d'anca (waddle), rimbalzo del passo e inclinazione
      const cadence = p.speed > 0 ? 14 : 10.5;
      const stepCycle = p.anim * cadence;
      const stepPhase = Math.sin(stepCycle);

      // Oscillazione destra/sinistra alternata a ogni falcata
      const waddle = stepPhase * 0.09;
      // Inclinazione in avanti del corpo proporzionale alla velocità di corsa
      const lean = Math.min(0.08, Math.abs(p.vx) / 1600);
      rot = lean + waddle;

      // Sollevamento e caduta ritmica del corpo durante il passo
      offsetY = -Math.abs(stepPhase) * 4.2;

      // Elasticità della pancetta a ogni battuta di zampa
      const bounce = Math.cos(stepCycle * 2) * 0.06;
      sy = 1 - bounce;
      sx = 1 + bounce * 0.7;
    }

    const blink = p.invuln > 0 && Math.floor(p.invuln * 10) % 2 === 0;
    ctx.save();
    ctx.globalAlpha = blink ? 0.45 : 1;
    blit(ctx, sprite, p.x + PW / 2, p.y + PH + 10 + offsetY, 156, p.facing, sx, sy, rot);

    if (equippedHat) {
      const headX = p.x + PW / 2 + 8 * p.facing;
      const headY = p.y + PH + 10 + offsetY - 108 * sy;
      drawHat(ctx, equippedHat, headX, headY, p.facing, sx * 1.35);
    }

    ctx.restore();
  }

  if (!inside && p.glide > 0 && art.ring) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(art.ring, p.x + PW / 2 - 18, p.y - 28, 36, 36);
    ctx.restore();
  }

  /* ── Happy reaction (cuoricino felice quando prende stelline/salta) ── */
  if (!inside && p.happy > 0) {
    const hx = p.x + PW / 2;
    const hy = p.y - 32 - (1 - Math.min(1, p.happy / 0.8)) * 14;
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.happy * 2.2);
    ctx.fillStyle = "#ff6584";
    drawHeartShape(ctx, hx, hy, 11);
    ctx.restore();
  }

  if (!inside && sim.levelIndex === 0 && sim.t < 8 && p.x < 420) {
    const ax = p.x + 110;
    const ay = p.y + 8 + Math.sin(sim.t * 6) * 6;
    ctx.fillStyle = "#f3a073";
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + 28, ay + 12);
    ctx.lineTo(ax, ay + 24);
    ctx.closePath();
    ctx.fill();
  }

  /* ── Wait indicator: "Tocca!" when bear pauses before danger ── */
  if (!inside && p.wait > 0.6) {
    const bx = p.x + PW / 2;
    const by = p.y - 44 + Math.sin(sim.t * 7) * 5;
    const fade = Math.min(1, (p.wait - 0.6) * 3);
    ctx.save();
    ctx.globalAlpha = fade * (0.7 + 0.3 * Math.sin(sim.t * 5));
    ctx.fillStyle = "rgba(255,250,240,0.92)";
    roundRect(ctx, bx - 42, by - 16, 84, 32, 14);
    ctx.fill();
    ctx.strokeStyle = "#e8904a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#d06020";
    ctx.font = '700 17px "Nunito","Fredoka One",sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SALTA! 👆", bx, by);
    ctx.restore();
  }

  /* ── Combo indicator ── */
  if (!inside && p.combo >= 3 && p.comboT > 0) {
    const cx = p.x + PW / 2;
    const cy = p.y - 60;
    const alpha = Math.min(1, p.comboT * 3);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ff8c00";
    ctx.font = '900 22px "Nunito","Fredoka One",sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`x${p.combo}!`, cx, cy - 6);
    ctx.restore();
  }

  for (const part of sim.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, part.life / part.max);
    ctx.fillStyle = part.color;
    ctx.translate(part.x, part.y);
    if (part.spin) ctx.rotate(part.spin * sim.t);
    if (part.shape === "star") {
      drawStar5(ctx, 0, 0, part.r);
    } else if (part.shape === "heart") {
      drawHeartShape(ctx, 0, 0, part.r);
    } else if (part.shape === "ring") {
      ctx.strokeStyle = part.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, part.r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (part.shape === "bubble") {
      ctx.globalAlpha *= 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, part.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(-part.r * 0.25, -part.r * 0.3, part.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (part.shape === "paw") {
      // Impronta di zampetta di borotalco soffice
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, part.r, part.r * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-part.r * 0.65, -part.r * 0.75, part.r * 0.34, 0, Math.PI * 2);
      ctx.arc(0, -part.r * 1.05, part.r * 0.36, 0, Math.PI * 2);
      ctx.arc(part.r * 0.65, -part.r * 0.75, part.r * 0.34, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, part.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  const shade = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  shade.addColorStop(0, "rgba(255,255,255,0.05)");
  shade.addColorStop(0.55, "rgba(255,255,255,0)");
  shade.addColorStop(1, sim.theme === "bagno" ? "rgba(80,140,130,0.12)" : "rgba(120,60,40,0.1)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const vig = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.28, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.72);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(80,40,30,0.16)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  for (let i = 0; i < 10; i++) {
    const x = (i * 149 + sim.t * (10 + (i % 3) * 7)) % VIEW_W;
    const y = (80 + i * 46 + Math.sin(sim.t * 0.7 + i) * 16) % VIEW_H;
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#fffaf3";
    ctx.beginPath();
    ctx.arc(x, y, 1.4 + (i % 3) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function renderTitle(ctx: CanvasRenderingContext2D, art: Art, t: number) {
  const bg = art.bg.salotto;
  if (!bg) {
    ctx.fillStyle = "#fff4e4";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    return;
  }
  const iw = VIEW_H * (bg.width / bg.height);
  let x = -((t * 18) % iw);
  if (x > 0) x -= iw;
  for (; x < VIEW_W + 2; x += iw - 1) ctx.drawImage(bg, x, 0, iw + 1, VIEW_H);
  const wash = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  wash.addColorStop(0, "rgba(255,244,228,0.05)");
  wash.addColorStop(0.45, "rgba(255,244,228,0.2)");
  wash.addColorStop(1, "rgba(255,244,228,0.88)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}
