import type { Art } from "@/game/assets";
import type { Sim } from "@/game/sim";
import type { Enemy, Solid, Theme } from "@/game/types";
import { PH, PW, VIEW_H, VIEW_W } from "@/game/types";

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
  ctx.globalAlpha = on ? 0.92 : 0.22;
  const bob = Math.sin(t * 3 + s.x) * 3;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2 + bob, s.w / 2, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(150,210,230,0.9)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(s.x + s.w * 0.35, s.y + 4 + bob, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlatform(ctx: CanvasRenderingContext2D, s: Solid, t: number) {
  if (s.kind === "hedge" || s.kind === "basket" || s.kind === "cloud") {
    drawSetPiece(ctx, s, t);
    return;
  }
  ctx.fillStyle = "rgba(70,42,28,0.16)";
  ctx.beginPath();
  ctx.ellipse(s.x + s.w / 2, s.y + s.h + 10, s.w * 0.46, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  if (s.move) {
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.ellipse(s.x + s.w / 2, s.y + 8, s.w * 0.62, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const squish = s.bounce ? 1 + Math.sin(t * 7 + s.x * 0.01) * 0.07 : 1;
  ctx.save();
  ctx.translate(s.x, s.y + s.h);
  ctx.scale(1, squish);
  ctx.translate(-s.x, -(s.y + s.h));

  if (s.bounce) {
    ctx.fillStyle = "#8fd4c0";
    roundRect(ctx, s.x, s.y, s.w, s.h + 10, 16);
    ctx.fill();
    ctx.fillStyle = "#fffaf3";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(s.x + 14 + i * (s.w / 4.4), s.y + 6, 10, s.h);
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(s.x + s.w / 2, s.y - 18);
    ctx.lineTo(s.x + s.w / 2 - 11, s.y - 4);
    ctx.lineTo(s.x + s.w / 2 + 11, s.y - 4);
    ctx.closePath();
    ctx.fill();
  } else if (s.kind === "bench") {
    ctx.fillStyle = "#a8683c";
    ctx.fillRect(s.x + 10, s.y + s.h - 4, 10, 16);
    ctx.fillRect(s.x + s.w - 20, s.y + s.h - 4, 10, 16);
    const wood = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.h);
    wood.addColorStop(0, "#f0b27a");
    wood.addColorStop(1, "#c9844a");
    ctx.fillStyle = wood;
    roundRect(ctx, s.x, s.y, s.w, s.h + 4, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    roundRect(ctx, s.x + 8, s.y + 4, s.w - 16, 6, 4);
    ctx.fill();
  } else if (s.kind === "mat") {
    ctx.fillStyle = "#7ec8bc";
    roundRect(ctx, s.x, s.y + 4, s.w, s.h + 4, 8);
    ctx.fill();
    ctx.fillStyle = "#f7fffc";
    for (let x = s.x + 6; x < s.x + s.w - 4; x += 14) ctx.fillRect(x, s.y + s.h - 2, 4, 8);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillRect(s.x + 8, s.y + 8, s.w - 16, 4);
  } else {
    const cush = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.h + 12);
    cush.addColorStop(0, "#ffe0d2");
    cush.addColorStop(1, "#f0a892");
    ctx.fillStyle = cush;
    roundRect(ctx, s.x, s.y, s.w, s.h + 12, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s.x + 16, s.y + s.h * 0.55);
    ctx.quadraticCurveTo(s.x + s.w / 2, s.y + 8, s.x + s.w - 16, s.y + s.h * 0.55);
    ctx.stroke();
    ctx.fillStyle = "#e07a62";
    ctx.beginPath();
    ctx.arc(s.x + s.w / 2, s.y + s.h * 0.45, 5, 0, Math.PI * 2);
    ctx.fill();
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
) {
  ctx.save();
  ctx.translate(cx, feet);
  ctx.scale(flip * sx, sy);
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
  if (!inside && p.grounded) {
    ctx.fillStyle = "rgba(90, 56, 40, 0.16)";
    ctx.beginPath();
    ctx.ellipse(p.x + PW / 2, p.y + PH, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.powder > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.42)";
    ctx.beginPath();
    ctx.ellipse(p.x + PW / 2, p.y + PH * 0.45, 48, 40, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  let sprite = frameAt(art.idle, p.anim, 3.2);
  if (!p.grounded) {
    sprite = p.vy < -160 ? frameAt(art.jump, 1, 1) : p.vy < 120 ? frameAt(art.jump, 2, 1) : frameAt(art.jump, 3, 1);
  } else if (Math.abs(p.vx) > 20) {
    const fps = p.speed > 0 ? 9.5 : 6.5;
    sprite = frameAt(art.run, p.anim, fps);
  }
  if (!inside && sprite) {
    let sx = 1;
    let sy = 1;
    if (p.land > 0) {
      sy = 0.86;
      sx = 1.12;
    } else if (!p.grounded && p.vy < 0) {
      sy = 1.08;
      sx = 0.94;
    }
    const blink = p.invuln > 0 && Math.floor(p.invuln * 10) % 2 === 0;
    ctx.save();
    ctx.globalAlpha = blink ? 0.45 : 1;
    blit(ctx, sprite, p.x + PW / 2, p.y + PH + 10, 156, p.facing, sx, sy);
    ctx.restore();
  }

  if (!inside && p.glide > 0 && art.ring) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(art.ring, p.x + PW / 2 - 18, p.y - 28, 36, 36);
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
    ctx.fillText("Tocca! 👆", bx, by);
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
