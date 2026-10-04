import type { Art } from "@/game/assets";
import type { Sim } from "@/game/sim";
import type { Enemy, Solid } from "@/game/types";
import { PH, PW, VIEW_H, VIEW_W } from "@/game/types";

const THEME = {
  salotto: { top: "#f6d7c6", bottom: "#e4b396", line: "rgba(255,250,243,0.55)", plat: "#f0c2b2" },
  corridoio: { top: "#f0d3a4", bottom: "#d7ae6e", line: "rgba(255,244,220,0.5)", plat: "#e6c07a" },
  bagno: { top: "#f3faf8", bottom: "#d5ebe6", line: "rgba(255,255,255,0.7)", plat: "#c5e4dc" },
} as const;

function frameAt(list: (HTMLImageElement | null)[], t: number, fps: number) {
  const ready = list.filter((img): img is HTMLImageElement => !!img);
  if (!ready.length) return null;
  const i = Math.floor(Math.max(0, t) * fps) % ready.length;
  return ready[i] ?? null;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawPlatform(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, s: Solid, fill: string) {
  ctx.fillStyle = fill;
  roundRect(ctx, s.x, s.y, s.w, s.h + 10, 12);
  ctx.fill();
  if (!img) return;
  const aspect = img.width / Math.max(1, img.height);
  const ih = Math.max(s.h + 22, 46);
  const tileW = ih * aspect;
  const iy = s.y - (ih - s.h) * 0.42;
  ctx.save();
  ctx.beginPath();
  ctx.rect(s.x - 4, iy - 2, s.w + 8, ih + 8);
  ctx.clip();
  for (let x = s.x - 4; x < s.x + s.w + 4; x += Math.max(8, tileW - 1)) {
    ctx.drawImage(img, x, iy, tileW, ih);
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
  const theme = THEME[sim.theme];
  const bg = art.bg[sim.theme];
  if (bg) {
    const iw = VIEW_H * (bg.width / bg.height);
    let x = -((camX * 0.32) % iw);
    if (x > 0) x -= iw;
    for (; x < VIEW_W + 2; x += iw - 1) ctx.drawImage(bg, x, 0, iw + 1, VIEW_H);
  } else {
    ctx.fillStyle = "#fff4e4";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  const shake = sim.gentle ? 0 : sim.shake;
  const ox = shake ? (Math.random() - 0.5) * shake : 0;
  const oy = shake ? (Math.random() - 0.5) * shake : 0;
  ctx.save();
  ctx.translate(-Math.round(camX + ox), -Math.round(camY + oy));

  const ground = sim.solids.find((s) => s.kind === "ground");
  if (ground) {
    const grad = ctx.createLinearGradient(0, ground.y, 0, ground.y + 180);
    grad.addColorStop(0, theme.top);
    grad.addColorStop(1, theme.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(ground.x, ground.y, ground.w, ground.h);
    ctx.strokeStyle = theme.line;
    ctx.lineWidth = 3;
    const left = camX - 20;
    const right = camX + VIEW_W + 20;
    for (let y = ground.y + 18; y < ground.y + 160; y += 26) {
      ctx.beginPath();
      ctx.moveTo(Math.max(ground.x, left), y);
      ctx.lineTo(Math.min(ground.x + ground.w, right), y);
      ctx.stroke();
    }
    if (sim.theme === "bagno") {
      ctx.strokeStyle = "rgba(140, 186, 178, 0.45)";
      ctx.lineWidth = 2;
      for (let x = 0; x < ground.w; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, ground.y);
        ctx.lineTo(x, ground.y + 160);
        ctx.stroke();
      }
    }
  }

  const imgFor = (s: Solid) => (s.kind === "pillow" ? art.pillow : s.kind === "bench" ? art.bench : art.mat);
  for (const s of sim.solids) {
    if (s.kind === "ground") continue;
    drawPlatform(ctx, imgFor(s), s, theme.plat);
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
    const bob = Math.sin(sim.t * 3 + i) * 4;
    const squash = 0.82 + 0.18 * Math.abs(Math.sin(sim.t * 4 + i));
    ctx.save();
    ctx.translate(c.x + 15, c.y + 15 + bob);
    ctx.scale(squash, 1);
    ctx.drawImage(art.star, -20, -20, 40, 40);
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
    const dh = 214;
    const dw = dh * (art.door.width / art.door.height);
    ctx.drawImage(art.door, sim.goal.x + sim.goal.w / 2 - dw / 2, sim.goal.y + sim.goal.h - dh, dw, dh);
  } else {
    ctx.fillStyle = "#fffaf3";
    roundRect(ctx, sim.goal.x, sim.goal.y, sim.goal.w, sim.goal.h, 16);
    ctx.fill();
  }

  for (const e of sim.enemies) {
    const img = enemyFrame(art, e, sim.t);
    if (!img) continue;
    const squash = e.stun > 0 ? 0.82 : 1;
    if (e.kind === "bubble") {
      const s = 78;
      ctx.save();
      ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
      ctx.scale(e.dir > 0 ? -1 : 1, squash);
      ctx.globalAlpha = e.stun > 0 ? 0.7 : 0.95;
      ctx.drawImage(img, -s / 2, -s / 2, s, s);
      ctx.restore();
    } else {
      const s = e.kind === "duck" ? 96 : 100;
      blit(ctx, img, e.x + e.w / 2, e.y + e.h + 8, s, e.dir > 0 ? -1 : 1, 1, squash);
    }
    if (e.stun > 0 && art.star) {
      ctx.drawImage(art.star, e.x + e.w / 2 - 8, e.y - 22 + Math.sin(sim.t * 8) * 2, 18, 18);
    }
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
    sprite = frameAt(art.run, p.anim, 9);
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
