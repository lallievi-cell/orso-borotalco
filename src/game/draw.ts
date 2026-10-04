import type { Art } from "@/game/assets";
import type { Sim } from "@/game/sim";
import type { Enemy, Solid } from "@/game/types";
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
} as const;

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

function drawBackdrop(ctx: CanvasRenderingContext2D, sim: Sim, camX: number, camY: number) {
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

function drawRoom(ctx: CanvasRenderingContext2D, sim: Sim, camX: number) {
  const theme = THEME[sim.theme];
  const y = sim.groundY;
  ctx.fillStyle = theme.wainscot;
  ctx.fillRect(0, y - 118, sim.w, 118);
  ctx.fillStyle = "rgba(255,250,244,0.7)";
  ctx.fillRect(0, y - 112, sim.w, 6);

  const left = Math.max(0, camX - 80);
  const right = Math.min(sim.w, camX + VIEW_W + 80);
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
  } else if (sim.theme === "corridoio") {
    ctx.fillStyle = "rgba(255,250,244,0.28)";
    for (let x = 160; x < sim.w; x += 360) {
      if (x < left - 40 || x > right) continue;
      roundRect(ctx, x, y - 230, 22, 90, 8);
      ctx.fill();
    }
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

function drawPlatform(ctx: CanvasRenderingContext2D, s: Solid, t: number) {
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
  const list = art[e.kind];
  const fps = e.stun > 0 ? 3 : e.kind === "bubble" ? 6 : 8;
  return frameAt(list, e.stun > 0 ? t * 0.5 : t + e.phase, fps);
}

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  sim: Sim,
  art: Art,
  camX: number,
  camY: number,
) {
  drawBackdrop(ctx, sim, camX, camY);

  const shake = sim.gentle ? 0 : sim.shake;
  const ox = shake ? (Math.random() - 0.5) * shake : 0;
  const oy = shake ? (Math.random() - 0.5) * shake : 0;
  ctx.save();
  ctx.translate(-Math.round(camX + ox), -Math.round(camY + oy));
  drawRoom(ctx, sim, camX);

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
  } else {
    ctx.fillStyle = "#fffaf3";
    roundRect(ctx, sim.goal.x, sim.goal.y, sim.goal.w, sim.goal.h, 16);
    ctx.fill();
  }

  for (const e of sim.enemies) {
    if (e.fade < 0) continue;
    const img = enemyFrame(art, e, sim.t);
    if (!img) continue;
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
    } else {
      const s = (e.kind === "duck" ? 96 : 100) * (fading ? 0.75 + 0.25 * alpha : 1);
      blit(ctx, img, e.x + e.w / 2, e.y + e.h + 8, s, e.dir > 0 ? -1 : 1, 1, squash);
    }
    ctx.restore();
  }

  const p = sim.player;
  if (p.grounded) {
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
  } else if (Math.abs(p.vx) > 24) {
    const fps = p.speed > 0 ? 13 : 10;
    sprite = frameAt(art.run, p.anim, fps);
  }
  if (sprite) {
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

  if (p.glide > 0 && art.ring) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(art.ring, p.x + PW / 2 - 18, p.y - 28, 36, 36);
    ctx.restore();
  }

  if (sim.levelIndex === 0 && sim.t < 8 && p.x < 420) {
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

  for (const part of sim.particles) {
    ctx.globalAlpha = Math.max(0, part.life / part.max);
    ctx.fillStyle = part.color;
    ctx.beginPath();
    ctx.arc(part.x, part.y, part.r, 0, Math.PI * 2);
    ctx.fill();
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
