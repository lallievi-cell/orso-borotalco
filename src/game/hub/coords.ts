export const TILE_W = 64;
export const TILE_H = 32;

/** Converte coordinate mondo (wx, wy, wz) in coordinate schermo (sx, sy). */
export function worldToScreen(
  wx: number,
  wy: number,
  wz = 0,
  camX = 0,
  camY = 0,
): { sx: number; sy: number } {
  const sx = (wx - wy) * (TILE_W / 2) - camX;
  const sy = (wx + wy) * (TILE_H / 2) - wz - camY;
  return { sx, sy };
}

/** Converte coordinate schermo (sx, sy) nel piano del mondo (wx, wy) a wz = 0. */
export function screenToWorld(
  sx: number,
  sy: number,
  camX = 0,
  camY = 0,
): { wx: number; wy: number } {
  const relX = sx + camX;
  const relY = sy + camY;
  // relX = (wx - wy) * 32  => wx - wy = relX / 32
  // relY = (wx + wy) * 16  => wx + wy = relY / 16
  const wx = relX / 64 + relY / 32;
  const wy = relY / 32 - relX / 64;
  return { wx, wy };
}

/** Calcola la profondità di rendering per l'ordinamento Y-sorting. */
export function getDepth(wx: number, wy: number, wz = 0): number {
  return wx + wy + wz * 0.001;
}
