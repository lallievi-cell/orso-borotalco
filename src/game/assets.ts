import type { Theme } from "@/game/types";

export type Art = {
  idle: (HTMLImageElement | null)[];
  run: (HTMLImageElement | null)[];
  jump: (HTMLImageElement | null)[];
  sponge: (HTMLImageElement | null)[];
  roll: (HTMLImageElement | null)[];
  bubble: (HTMLImageElement | null)[];
  duck: (HTMLImageElement | null)[];
  star: HTMLImageElement | null;
  powder: HTMLImageElement | null;
  ring: HTMLImageElement | null;
  brush: HTMLImageElement | null;
  heart: HTMLImageElement | null;
  door: HTMLImageElement | null;
  lamp: HTMLImageElement | null;
  pillow: HTMLImageElement | null;
  bench: HTMLImageElement | null;
  mat: HTMLImageElement | null;
  tomato: HTMLImageElement | null;
  slipper: HTMLImageElement | null;
  sock: HTMLImageElement | null;
  goldduck: HTMLImageElement | null;
  toilet: HTMLImageElement | null;
  hub: {
    mamma: HTMLImageElement | null;
    papa: HTMLImageElement | null;
    micio: HTMLImageElement | null;
    bazar: HTMLImageElement | null;
    fountain: HTMLImageElement | null;
    tree: HTMLImageElement | null;
    bush: HTMLImageElement | null;
    trampoline: HTMLImageElement | null;
    arch: HTMLImageElement | null;
    fence: HTMLImageElement | null;
    tiles: {
      cotto: HTMLImageElement | null;
      grass: HTMLImageElement | null;
      wood: HTMLImageElement | null;
      terrace: HTMLImageElement | null;
      marble: HTMLImageElement | null;
    };
  };
  boss: {
    kingPillow: HTMLImageElement | null;
    kingPillowLaugh: HTMLImageElement | null;
  };
  bg: Record<Theme, HTMLImageElement | null>;
};

export function asset(src: string) {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}${src.replace(/^\//, "")}`;
}

function load(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = asset(src);
  });
}

function seq(prefix: string, name: string, n = 4) {
  return Promise.all(Array.from({ length: n }, (_, i) => load(`${prefix}/${name}-${i + 1}.png`)));
}

export async function loadArt(): Promise<Art> {
  const [
    idle, run, jump,
    sponge, roll, bubble, duck,
    star, powder, ring, brush, heart, door, lamp, pillow, bench, mat,
    tomato, slipper, sock, goldduck, toilet,
    salotto, corridoio, bagno, cucina, giardino, lavanderia, cameretta, terrazzo,
    hubMamma, hubPapa, hubMicio, hubBazar, hubFountain, hubTree, hubBush, hubTrampoline, hubArch, hubFence,
    tileCotto, tileGrass, tileWood, tileTerrace, tileMarble,
    bossKingPillow, bossKingPillowLaugh,
  ] = await Promise.all([
    seq("/sprites/bear", "idle"),
    seq("/sprites/bear", "run"),
    seq("/sprites/bear", "jump"),
    seq("/sprites/sponge", "sponge"),
    seq("/sprites/roll", "roll"),
    seq("/sprites/bubble", "bubble"),
    seq("/sprites/duck", "duck"),
    load("/sprites/star.png"),
    load("/sprites/powder.png"),
    load("/sprites/ring.png"),
    load("/sprites/brush.png"),
    load("/sprites/heart.png"),
    load("/sprites/door.png"),
    load("/sprites/lamp.png"),
    load("/sprites/pillow.png"),
    load("/sprites/bench.png"),
    load("/sprites/mat.png"),
    load("/sprites/tomato.png"),
    load("/sprites/slipper.png"),
    load("/sprites/sock.png"),
    load("/sprites/goldduck.png"),
    load("/sprites/toilet.png"),
    load("/bg/salotto.jpg"),
    load("/bg/corridoio.jpg"),
    load("/bg/bagno.jpg"),
    load("/bg/cucina.jpg"),
    load("/bg/giardino.jpg"),
    load("/bg/lavanderia.jpg"),
    load("/bg/cameretta.jpg"),
    load("/bg/terrazzo.jpg"),
    load("/sprites/hub/mamma.png"),
    load("/sprites/hub/papa.png"),
    load("/sprites/hub/micio.png"),
    load("/sprites/hub/bazar.png"),
    load("/sprites/hub/fountain.png"),
    load("/sprites/hub/tree.png"),
    load("/sprites/hub/bush.png"),
    load("/sprites/hub/trampoline.png"),
    load("/sprites/hub/arch.png"),
    load("/sprites/hub/fence.png"),
    load("/sprites/hub/tiles/cotto.png"),
    load("/sprites/hub/tiles/grass.png"),
    load("/sprites/hub/tiles/wood.png"),
    load("/sprites/hub/tiles/terrace.png"),
    load("/sprites/hub/tiles/marble.png"),
    load("/sprites/boss/king_pillow.png"),
    load("/sprites/boss/king_pillow_laugh.png"),
  ]);
  return {
    idle, run, jump,
    sponge, roll, bubble, duck,
    star, powder, ring, brush, heart, door, lamp, pillow, bench, mat,
    tomato, slipper, sock, goldduck, toilet,
    hub: {
      mamma: hubMamma,
      papa: hubPapa,
      micio: hubMicio,
      bazar: hubBazar,
      fountain: hubFountain,
      tree: hubTree,
      bush: hubBush,
      trampoline: hubTrampoline,
      arch: hubArch,
      fence: hubFence,
      tiles: {
        cotto: tileCotto,
        grass: tileGrass,
        wood: tileWood,
        terrace: tileTerrace,
        marble: tileMarble,
      },
    },
    boss: {
      kingPillow: bossKingPillow,
      kingPillowLaugh: bossKingPillowLaugh,
    },
    bg: { salotto, corridoio, bagno, cucina, giardino, lavanderia, cameretta, terrazzo },
  };
}
