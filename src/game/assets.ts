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
  bg: {
    salotto: HTMLImageElement | null;
    corridoio: HTMLImageElement | null;
    bagno: HTMLImageElement | null;
  };
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
  const [idle, run, jump, sponge, roll, bubble, duck, star, powder, ring, brush, heart, door, lamp, pillow, bench, mat, salotto, corridoio, bagno] =
    await Promise.all([
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
      load("/bg/salotto.jpg"),
      load("/bg/corridoio.jpg"),
      load("/bg/bagno.jpg"),
    ]);
  return {
    idle,
    run,
    jump,
    sponge,
    roll,
    bubble,
    duck,
    star,
    powder,
    ring,
    brush,
    heart,
    door,
    lamp,
    pillow,
    bench,
    mat,
    bg: { salotto, corridoio, bagno },
  };
}
