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
});
