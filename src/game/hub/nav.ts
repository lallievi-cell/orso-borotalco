import { getMapColliders } from "@/game/hub/map";

export type NavPoint = { wx: number; wy: number };

type Colliders = ReturnType<typeof getMapColliders>;

/** Verifica se un punto con raggio r collide con ostacoli della mappa. */
export function checkCollision(x: number, y: number, r: number, colliders: Colliders): boolean {
  // Cerchi
  for (const c of colliders.circles) {
    if (Math.hypot(x - c.x, y - c.y) < r + c.r) return true;
  }
  // Rettangoli
  for (const rc of colliders.rects) {
    if (x + r > rc.x1 && x - r < rc.x2 && y + r > rc.y1 && y - r < rc.y2) {
      return true;
    }
  }
  return false;
}

/** Verifica se esiste linea di vista libera (line-of-sight) tra p1 e p2. */
export function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number,
  colliders: Colliders,
): boolean {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  if (dist < 0.05) return true;
  const steps = Math.max(3, Math.ceil(dist / 0.2));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const sx = x1 + (x2 - x1) * t;
    const sy = y1 + (y2 - y1) * t;
    if (checkCollision(sx, sy, r, colliders)) return false;
  }
  return true;
}

/** Trova il punto calpestabile più vicino se il bersaglio cade dentro un ostacolo. */
export function findNearestWalkable(
  targetX: number,
  targetY: number,
  r: number,
  colliders: Colliders,
): NavPoint {
  // Se già calpestabile, ritorna il bersaglio intatto
  if (!checkCollision(targetX, targetY, r, colliders)) {
    return { wx: targetX, wy: targetY };
  }

  // Spirale concentrica di ricerca (passo 0.25 unità fino a 2.5 unità)
  for (let dist = 0.25; dist <= 2.5; dist += 0.25) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const px = targetX + Math.cos(angle) * dist;
      const py = targetY + Math.sin(angle) * dist;
      if (!checkCollision(px, py, r, colliders)) {
        return { wx: px, wy: py };
      }
    }
  }
  return { wx: targetX, wy: targetY };
}

/** Semplifica il percorso con string-pulling lineare (line-of-sight), ritornando solo i waypoint futuri. */
export function smoothPath(
  startX: number,
  startY: number,
  rawWaypoints: NavPoint[],
  r: number,
  colliders: Colliders,
): NavPoint[] {
  const full: NavPoint[] = [{ wx: startX, wy: startY }, ...rawWaypoints];
  if (full.length <= 1) return rawWaypoints;

  const smoothed: NavPoint[] = [];
  let currIdx = 0;

  while (currIdx < full.length - 1) {
    let nextIdx = full.length - 1;
    while (nextIdx > currIdx + 1) {
      const from = full[currIdx]!;
      const to = full[nextIdx]!;
      if (hasLineOfSight(from.wx, from.wy, to.wx, to.wy, r, colliders)) {
        break;
      }
      nextIdx--;
    }
    smoothed.push(full[nextIdx]!);
    currIdx = nextIdx;
  }

  return smoothed.length > 0 ? smoothed : rawWaypoints;
}

/** Calcola il percorso intelligente A* attorno a fontana, bazar, alberi e muri. */
export function findPath(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  r: number,
  colliders: Colliders,
): NavPoint[] {
  const goal = findNearestWalkable(targetX, targetY, r, colliders);

  // Se c'è già linea retta libera, ritorna direttamente il punto bersaglio!
  if (hasLineOfSight(startX, startY, goal.wx, goal.wy, r, colliders)) {
    return [goal];
  }

  // Configurazione griglia A*
  const res = 0.5; // risoluzione nodi griglia mondo
  const minG = 2.5;
  const maxG = 21.5;

  const sNodeX = Math.round(startX / res) * res;
  const sNodeY = Math.round(startY / res) * res;
  const gNodeX = Math.round(goal.wx / res) * res;
  const gNodeY = Math.round(goal.wy / res) * res;

  const startKey = `${sNodeX.toFixed(1)},${sNodeY.toFixed(1)}`;
  const goalKey = `${gNodeX.toFixed(1)},${gNodeY.toFixed(1)}`;

  type Node = { x: number; y: number; key: string; cost: number; f: number };
  const frontier: Node[] = [
    {
      x: sNodeX,
      y: sNodeY,
      key: startKey,
      cost: 0,
      f: Math.hypot(gNodeX - sNodeX, gNodeY - sNodeY),
    },
  ];

  const cameFrom = new Map<string, NavPoint>();
  const costSoFar = new Map<string, number>();
  costSoFar.set(startKey, 0);

  const directions = [
    { dx: -res, dy: 0, cost: res },
    { dx: res, dy: 0, cost: res },
    { dx: 0, dy: -res, cost: res },
    { dx: 0, dy: res, cost: res },
    { dx: -res, dy: -res, cost: res * 1.414 },
    { dx: -res, dy: res, cost: res * 1.414 },
    { dx: res, dy: -res, cost: res * 1.414 },
    { dx: res, dy: res, cost: res * 1.414 },
  ];

  let found = false;
  let iterations = 0;
  let lastNode: Node | null = null;
  const maxIterations = 800; // Limite di sicurezza reattivo

  while (frontier.length > 0 && iterations++ < maxIterations) {
    // Estrai il nodo con minor f
    frontier.sort((a, b) => a.f - b.f);
    const current = frontier.shift()!;

    if (current.key === goalKey || Math.hypot(current.x - goal.wx, current.y - goal.wy) < 0.6) {
      found = true;
      lastNode = current;
      break;
    }

    for (const dir of directions) {
      const nx = Math.round((current.x + dir.dx) / res) * res;
      const ny = Math.round((current.y + dir.dy) / res) * res;

      if (nx < minG || nx > maxG || ny < minG || ny > maxG) continue;
      if (checkCollision(nx, ny, r, colliders)) continue;

      const nKey = `${nx.toFixed(1)},${ny.toFixed(1)}`;
      const newCost = current.cost + dir.cost;

      if (!costSoFar.has(nKey) || newCost < costSoFar.get(nKey)!) {
        costSoFar.set(nKey, newCost);
        const h = Math.hypot(goal.wx - nx, goal.wy - ny);
        frontier.push({
          x: nx,
          y: ny,
          key: nKey,
          cost: newCost,
          f: newCost + h,
        });
        cameFrom.set(nKey, { wx: current.x, wy: current.y });
      }
    }
  }

  if (!found || !lastNode) {
    // Fallback: vai direttamente al bersaglio regolato
    return [goal];
  }

  // Ricostruisci il percorso a ritroso partendo dal nodo terminale raggiunto
  const rawPath: NavPoint[] = [goal];
  let currKey = lastNode.key;
  if (Math.hypot(lastNode.x - goal.wx, lastNode.y - goal.wy) > 0.15) {
    rawPath.push({ wx: lastNode.x, wy: lastNode.y });
  }
  while (cameFrom.has(currKey)) {
    const prev = cameFrom.get(currKey)!;
    rawPath.push(prev);
    currKey = `${prev.wx.toFixed(1)},${prev.wy.toFixed(1)}`;
  }
  rawPath.reverse();

  // Applica string pulling (line-of-sight smoothing)
  return smoothPath(startX, startY, rawPath, r, colliders);
}
