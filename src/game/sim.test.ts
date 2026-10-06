import { describe, expect, it } from "vitest";
import { LEVEL_COUNT } from "@/game/levels";
import { createSim, step, type Sim } from "@/game/sim";
import { PH, type Input } from "@/game/types";

const DT = 1 / 60;

/**
 * Un "bambino robot": cammina sempre in avanti (come sul tablet) e salta a ritmo regolare,
 * tenendo premuto un po' per fare il salto alto.
 */
function botInput(frame: number): Input {
  const phase = frame % 40;
  return {
    x: 1,
    auto: true,
    jumpPressed: phase === 0,
    jumpHeld: phase < 24,
    down: false,
  };
}

type RunReport = {
  won: boolean;
  seconds: number;
  falls: number;
  maxSpeedNoTurbo: number;
  maxSpeed: number;
  sunk: boolean;
};

function runLevel(index: number, maxSeconds: number, input: (frame: number, sim: Sim) => Input): RunReport {
  const sim = createSim(index);
  const report: RunReport = { won: false, seconds: 0, falls: 0, maxSpeedNoTurbo: 0, maxSpeed: 0, sunk: false };
  const frames = Math.round(maxSeconds / DT);
  let sinceTurbo = 99;
  for (let f = 0; f < frames; f++) {
    const ev = step(sim, input(f, sim), DT);
    const p = sim.player;
    const speed = Math.abs(p.vx);
    report.maxSpeed = Math.max(report.maxSpeed, speed);
    sinceTurbo = p.speed > 0 ? 0 : sinceTurbo + DT;
    // Dopo lo spazzolino serve qualche fotogramma per rallentare: si misura solo a turbo spento da 0,5 s.
    if (sinceTurbo > 0.5) report.maxSpeedNoTurbo = Math.max(report.maxSpeedNoTurbo, speed);
    if (ev.fall) report.falls += 1;
    // Il pavimento copre tutto il livello: l'orso non deve mai finire sotto.
    if (p.y + PH > sim.groundY + 2) report.sunk = true;
    if (ev.win || sim.won) {
      report.won = true;
      report.seconds = f * DT;
      break;
    }
  }
  return report;
}

const levels = Array.from({ length: LEVEL_COUNT }, (_, i) => i);

describe("velocità dell'orso", () => {
  it.each(levels)("livello %i: camminata automatica senza turbo resta tranquilla", (i) => {
    const r = runLevel(i, 120, botInput);
    // 115 camminata, 130 rimbalzo morbido, 150 soffio delle pentole: mai oltre.
    expect(r.maxSpeedNoTurbo).toBeLessThanOrEqual(150.5);
    // Con lo spazzolino turbo il massimo è 205.
    expect(r.maxSpeed).toBeLessThanOrEqual(205.5);
  });

  it("non accelera all'infinito tenendo premuto avanti per 3 minuti", () => {
    const sim = createSim(0);
    sim.powers = [];
    sim.gusts = [];
    sim.slips = [];
    sim.enemies = [];
    let max = 0;
    for (let f = 0; f < 180 * 60; f++) {
      step(sim, { x: 1, auto: true, jumpPressed: f % 50 === 0, jumpHeld: f % 50 < 20, down: false }, DT);
      max = Math.max(max, Math.abs(sim.player.vx));
    }
    expect(max).toBeLessThanOrEqual(115.5);
  });
});

describe("pavimento e teletrasporto", () => {
  it.each(levels)("livello %i: saltando in avanti non si finisce mai sotto il pavimento", (i) => {
    const r = runLevel(i, 120, botInput);
    expect(r.sunk).toBe(false);
    // Ogni livello ha il pavimento intero: una "caduta" vorrebbe dire il vecchio bug del teletrasporto.
    expect(r.falls).toBe(0);
  });
});

describe("si può finire ogni livello", () => {
  it.each(levels)("livello %i: il bambino robot arriva al bagno", (i) => {
    const r = runLevel(i, 420, botInput);
    expect(r.won, `livello ${i} non completato in 7 minuti`).toBe(true);
  });
});
