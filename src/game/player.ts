/** Il nome della bambina che gioca: usato dalla voce e nelle schermate. */
export const PLAYER_NAME = "Celeste";

const N = PLAYER_NAME;

export const CHEERS = [`Brava ${N}!`, `Bravissima ${N}!`, `Che brava, ${N}!`, `Evviva, ${N}!`, `Grande ${N}!`];

export function cheer(seed = Math.random()): string {
  return CHEERS[Math.floor(seed * CHEERS.length) % CHEERS.length]!;
}
