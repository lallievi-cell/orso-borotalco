import { describe, expect, it } from "vitest";
import { worldToScreen, screenToWorld, getDepth } from "@/game/hub/coords";
import { createHub, interactHub } from "@/game/hub/engine";
import { stepHub, type HubInput } from "@/game/hub/physics";
import { emptySave } from "@/game/save";

describe("Hub Coordinates", () => {
  it("converts world to screen and back exactly", () => {
    const testCases = [
      { wx: 0, wy: 0 },
      { wx: 10, wy: 10 },
      { wx: 14.5, wy: 8.2 },
      { wx: 3.14, wy: 19.8 },
    ];

    const camX = 120;
    const camY = 85;

    for (const tc of testCases) {
      const { sx, sy } = worldToScreen(tc.wx, tc.wy, 0, camX, camY);
      const back = screenToWorld(sx, sy, camX, camY);
      expect(back.wx).toBeCloseTo(tc.wx, 4);
      expect(back.wy).toBeCloseTo(tc.wy, 4);
    }
  });

  it("calculates monotonic depth for isometric Y-sorting", () => {
    const d1 = getDepth(5, 5);
    const d2 = getDepth(5, 6);
    const d3 = getDepth(6, 5);
    expect(d2).toBeGreaterThan(d1);
    expect(d3).toBeGreaterThan(d1);
  });
});

describe("Hub Engine and Simulation", () => {
  it("initializes hub with 8 room portals and 5 npcs", () => {
    const save = emptySave();
    const hub = createHub(save);

    expect(hub.portals.length).toBe(8);
    expect(hub.portals[0].name).toBe("SALOTTO");
    expect(hub.portals[0].locked).toBe(false);
    expect(hub.npcs.length).toBeGreaterThanOrEqual(4);
    expect(hub.player.wx).toBeGreaterThan(0);
    expect(hub.player.wy).toBeGreaterThan(0);
  });

  it("moves player in 8 directions with velocity smoothing", () => {
    const save = emptySave();
    const hub = createHub(save);

    const initialX = hub.player.wx;
    const initialY = hub.player.wy;

    // Move East (dx > 0)
    const input: HubInput = { dx: 1, dy: 0, interact: false };
    stepHub(hub, input, 0.1);

    expect(hub.player.moving).toBe(true);
    expect(hub.player.vx).toBeGreaterThan(0);
    expect(hub.player.wx).toBeGreaterThan(initialX);
  });

  it("supports tap-to-move pathing towards target", () => {
    const save = emptySave();
    const hub = createHub(save);

    const targetWx = hub.player.wx + 2;
    const targetWy = hub.player.wy + 2;

    // Simulate tap on ground
    const input: HubInput = {
      dx: 0,
      dy: 0,
      interact: false,
      tapWorld: { wx: targetWx, wy: targetWy },
    };

    stepHub(hub, input, 0.1);

    expect(hub.tapTarget).not.toBeNull();
    expect(hub.player.moving).toBe(true);
    expect(hub.player.wx).toBeGreaterThan(11.5);
    expect(hub.player.wy).toBeGreaterThan(14.0);
  });

  it("interacts with active portal to enter level", () => {
    const save = emptySave();
    const hub = createHub(save);

    // Place player right in front of portal 0 (Salotto)
    hub.player.wx = hub.portals[0].wx;
    hub.player.wy = hub.portals[0].wy + 0.5;

    const input: HubInput = { dx: 0, dy: 0, interact: false };
    stepHub(hub, input, 0.05);

    expect(hub.activePortal).not.toBeNull();
    expect(hub.activePortal?.index).toBe(0);

    const action = interactHub(hub, null);
    expect(action.enterLevel).toBe(0);
  });

  it("intelligently navigates around the central fountain obstacle", () => {
    const save = emptySave();
    const hub = createHub(save);

    // Posiziona l'orsetto a nord della fontana centrale (11.5, 11.5 r=1.6)
    hub.player.wx = 11.5;
    hub.player.wy = 8.5;

    // Tocco a sud della fontana (11.5, 14.5) - in linea retta c'è la fontana!
    const input: HubInput = {
      dx: 0,
      dy: 0,
      interact: false,
      tapWorld: { wx: 11.5, wy: 14.5 },
    };

    stepHub(hub, input, 0.05);

    expect(hub.tapTarget).not.toBeNull();
    expect(hub.tapTarget?.path).toBeDefined();
    // Il percorso intelligente deve avere waypoints intermedi per deviare attorno all'ostacolo
    expect(hub.tapTarget!.path!.length).toBeGreaterThanOrEqual(1);

    // Simula 4 secondi di camminata autonoma lungo il percorso deviato
    for (let step = 0; step < 80; step++) {
      stepHub(hub, { dx: 0, dy: 0, interact: false }, 0.05);
      // L'orsetto non deve MAI entrare dentro il cerchio solido della fontana
      const distFountain = Math.hypot(hub.player.wx - 11.5, hub.player.wy - 11.5);
      expect(distFountain).toBeGreaterThan(1.5);
    }

    // L'orsetto ha raggiunto con successo il lato sud aggirando l'ostacolo
    expect(hub.player.wy).toBeGreaterThan(13.0);
  });

  it("super-bounces on trampoline with positive vertical velocity", () => {
    const save = emptySave();
    const hub = createHub(save);

    // Posiziona l'orsetto sopra il trampolino elastico
    const tramp = hub.toys.trampoline;
    hub.player.wx = tramp.wx;
    hub.player.wy = tramp.wy;
    hub.player.wz = 0;
    hub.player.vz = 0;

    const ev = stepHub(hub, { dx: 0, dy: 0, interact: false }, 0.02);

    expect(ev.bounce).toBe(true);
    expect(hub.player.vz).toBeGreaterThan(5);
    expect(hub.player.wz).toBeGreaterThan(0);
  });

  it("kicks beach ball, accumulating keepy-uppy combo, squish, and sparks", () => {
    const save = emptySave();
    const hub = createHub(save);

    // Posiziona l'orsetto a contatto col pallone da spiaggia
    const ball = hub.toys.ball;
    hub.player.wx = ball.wx - 0.5;
    hub.player.wy = ball.wy;
    hub.player.wz = 0;

    const ev = stepHub(hub, { dx: 1, dy: 0, interact: false }, 0.05);

    expect(ev.kick).toBe(true);
    expect(ball.vx).toBeGreaterThan(0);
    expect(ball.vz).toBeGreaterThan(0);
    expect(ball.squish).toBeGreaterThan(0.2);
    expect(ball.combo).toBeGreaterThanOrEqual(1);
    expect(ball.sparks.length).toBeGreaterThan(0);
  });

  it("super-bounces beach ball on trampoline with vertical boost", () => {
    const save = emptySave();
    const hub = createHub(save);

    const tramp = hub.toys.trampoline;
    const ball = hub.toys.ball;
    ball.wx = tramp.wx;
    ball.wy = tramp.wy;
    ball.wz = 0;
    ball.vz = -1;

    const ev = stepHub(hub, { dx: 0, dy: 0, interact: false }, 0.03);

    expect(ev.ballTramp).toBe(true);
    expect(ball.vz).toBeGreaterThan(7.0);
    expect(ball.squish).toBeGreaterThan(0.4);
    expect(ball.combo).toBeGreaterThan(0);
  });

  it("triggers friendly NPC pass when ball rolls close to Papa Orso", () => {
    const save = emptySave();
    const hub = createHub(save);

    // Trova Papà Orso
    const papa = hub.npcs.find((n) => n.id === "papa")!;
    expect(papa).toBeDefined();

    const ball = hub.toys.ball;
    ball.wx = papa.wx + 0.4;
    ball.wy = papa.wy;
    ball.lastKickBy = null;

    const ev = stepHub(hub, { dx: 0, dy: 0, interact: false }, 0.03);

    expect(ev.ballNpcPass).toBeDefined();
    expect(ev.ballNpcPass?.npcId).toBe("papa");
    expect(ball.vz).toBeGreaterThan(3.0);
    expect(ball.combo).toBeGreaterThan(0);
    expect(ball.lastKickBy).toBe("papa");
  });
});
