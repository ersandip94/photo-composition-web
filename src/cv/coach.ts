// src/cv/coach.ts
import type { AnalysisPayload } from "./types";

export type Nudge =
  | { kind: "pan"; dx: number; dy: number } // camera pan: +x=right, +y=down (as fraction of frame, e.g. 0.05 = 5%)
  | { kind: "rotate"; deg: number } // camera rotation in degrees; + = clockwise
  | { kind: "zoom"; dz: number }; // + zoom in (fraction), seldom used here

export type Suggestion = {
  rule:
    | "thirds"
    | "phi"
    | "spiral"
    | "leading"
    | "diagonal"
    | "symmetry"
    | "horizon";
  message: string;
  nudges: Nudge[];
  estGain: number; // estimated score improvement 0..100
  effort: number; // rough cost; smaller = easier
  priority: number; // estGain / effort
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const near = (v: number, tol = 0.02) => Math.abs(v) <= tol;
const cap = (v: number, m = 0.25) => Math.max(-m, Math.min(m, v)); // cap pan suggestions to ±25%

export function suggest(analysis: AnalysisPayload | null): Suggestion[] {
  if (!analysis) return [];
  const out: Suggestion[] = [];

  // ---- Subject → nearest thirds point ----
  if (analysis.subject?.conf > 0.3) {
    const [sx, sy] = analysis.subject.center;
    const targets: [number, number][] = [
      [1 / 3, 1 / 3],
      [2 / 3, 1 / 3],
      [1 / 3, 2 / 3],
      [2 / 3, 2 / 3],
    ];
    let T = targets[0],
      bestD = 9;
    for (const p of targets) {
      const d = Math.hypot(sx - p[0], sy - p[1]);
      if (d < bestD) {
        bestD = d;
        T = p;
      }
    }
    const dx = T[0] - sx;
    const dy = T[1] - sy;
    if (!near(dx, 0.01) || !near(dy, 0.01)) {
      const movePct = 0.5; // push halfway toward target
      const pan: Nudge = {
        kind: "pan",
        dx: cap(-dx * movePct),
        dy: cap(-dy * movePct),
      }; // camera pan is opposite subject move
      const estGain = (1 - Math.exp(-(bestD * bestD) / 0.04)) * 100;
      const effort = Math.hypot(dx, dy) * 100;
      out.push({
        rule: "thirds",
        message: phrasePan(dx, dy, "Place the subject on the nearest third"),
        nudges: [pan],
        estGain,
        effort,
        priority: safeRatio(estGain, effort),
      });
    }
  }

  // ---- Horizon → closest third (if detected) ----
  if (analysis.horizon && analysis.horizon.conf > 0.3) {
    const y = analysis.horizon.y;
    const ty = Math.abs(y - 1 / 3) < Math.abs(y - 2 / 3) ? 1 / 3 : 2 / 3;
    const dy = ty - y;
    if (!near(dy, 0.015)) {
      const panY: Nudge = { kind: "pan", dx: 0, dy: cap(-dy * 0.6) };
      out.push({
        rule: "horizon",
        message: `${dy < 0 ? "Tilt up" : "Tilt down"} to bring the horizon to the ${ty === 1 / 3 ? "upper" : "lower"} third`,
        nudges: [panY],
        estGain: Math.min(100, Math.abs(dy) * 220),
        effort: Math.abs(dy) * 100,
        priority: safeRatio(Math.abs(dy) * 220, Math.abs(dy) * 100),
      });
    }
  }

  // ---- Diagonals → small rotation toward best ----
  if (analysis.diagonal) {
    const rot = analysis.diagonal.best === "TLBR" ? -3 : 3; // heuristic
    if (analysis.diagonal.score < 0.85) {
      out.push({
        rule: "diagonal",
        message: `Rotate ${rot > 0 ? "clockwise" : "counter-clockwise"} ~${Math.abs(rot)}° to align edges with the diagonals`,
        nudges: [{ kind: "rotate", deg: rot }],
        estGain: 20 + (1 - (analysis.diagonal.score || 0)) * 50,
        effort: Math.abs(rot),
        priority:
          (20 + (1 - (analysis.diagonal.score || 0)) * 50) /
          Math.max(1, Math.abs(rot)),
      });
    }
  }

  // ---- Symmetry → center axisX ----
  if (analysis.symmetry && analysis.symmetry.score > 0.4) {
    const dx = 0.5 - analysis.symmetry.axisX;
    if (!near(dx, 0.015)) {
      out.push({
        rule: "symmetry",
        message: `Slide ${dx > 0 ? "right" : "left"} to center the symmetry`,
        nudges: [{ kind: "pan", dx: cap(dx * 0.6), dy: 0 }],
        estGain: Math.min(100, Math.abs(dx) * 200),
        effort: Math.abs(dx) * 100,
        priority: safeRatio(Math.abs(dx) * 200, Math.abs(dx) * 100),
      });
    }
  }

  // ---- Spiral → move toward eye + small rotation ----
  if (analysis.spiral?.eye) {
    const [sx, sy] = analysis.subject.center;
    const [ex, ey] = analysis.spiral.eye;
    const dx = ex - sx,
      dy = ey - sy;
    const pan: Nudge = { kind: "pan", dx: cap(-dx * 0.5), dy: cap(-dy * 0.5) };
    const rot: Nudge = {
      kind: "rotate",
      deg:
        analysis.spiral.orientation === 0 || analysis.spiral.orientation === 2
          ? -2
          : 2,
    };
    const dist = Math.hypot(dx, dy);
    if (dist > 0.03 || (analysis.spiral.score ?? 0) < 0.75) {
      out.push({
        rule: "spiral",
        message: `Nudge framing toward the spiral eye and rotate ~${Math.abs((rot as any).deg)}°`,
        nudges: [pan, rot],
        estGain: 30 + clamp01(1 - (analysis.spiral.score ?? 0)) * 50,
        effort: Math.hypot(pan.dx, pan.dy) * 100 + Math.abs((rot as any).deg),
        priority:
          (30 + clamp01(1 - (analysis.spiral.score ?? 0)) * 50) /
          Math.max(
            1,
            Math.hypot(pan.dx, pan.dy) * 100 + Math.abs((rot as any).deg)
          ),
      });
    }
  }

  // ---- Leading lines → bring VP inside/upper third ----
  if (analysis.leading?.vp) {
    const inv = 1 / (analysis.scale || 1);
    // vp is in "small" px; normalize to the original frame using ov size on draw, but here approximate:
    // assume vp normalized roughly by small dims (we use heuristic: encourage upward/center)
    const [vx, vy] = analysis.leading.vp;
    // Heuristic deltas toward x=0.5, y≈0.3 (upper third)
    const pan: Nudge = { kind: "pan", dx: 0, dy: -0.04 }; // tilt down slightly (brings VP up)
    out.push({
      rule: "leading",
      message:
        "Tilt down a little to bring the vanishing point toward the upper third",
      nudges: [pan],
      estGain: (analysis.leading.convergence ?? 0) < 0.8 ? 25 : 12,
      effort: Math.abs(pan.dy) * 100,
      priority: safeRatio(
        (analysis.leading.convergence ?? 0) < 0.8 ? 25 : 12,
        Math.abs(pan.dy) * 100
      ),
    });
  }

  // Sort and keep top 3
  return out.sort((a, b) => b.priority - a.priority).slice(0, 3);
}

function safeRatio(g: number, e: number) {
  const denom = Math.max(1, e);
  return g / denom;
}

function phrasePan(dx: number, dy: number, base: string) {
  const parts: string[] = [];
  if (Math.abs(dx) > 0.02) parts.push(dx > 0 ? "pan left" : "pan right"); // remember: subject move dx>0 means camera pan left
  if (Math.abs(dy) > 0.02) parts.push(dy > 0 ? "tilt up" : "tilt down");
  if (!parts.length) return base;
  return `${capFirst(parts.join(" and "))} – ${base}`;
}

function capFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
