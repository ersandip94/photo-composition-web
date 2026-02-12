// src/cv/scoring.ts
import type { AnalysisPayload } from "./types";

export type RuleKey =
  | "rule_of_thirds"
  | "phi_grid"
  | "golden_spiral"
  | "leading_lines"
  | "diagonals"
  | "symmetry"
  | "horizon_on_thirds";

export type RuleScore = {
  key: RuleKey;
  score: number; // 0..100
  label: string;
  reason: string; // short human-readable explanation
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Turn raw analysis into comparable 0..100 scores and short reasons.
 * You can adjust the blend/weights to taste; these are good starters.
 */
export function computeRuleScores(a: AnalysisPayload): RuleScore[] {
  // 1) Rule of Thirds: blend subject+horizon with a slight bias to subject
  const thirds = a.thirds?.overall ?? 0; // already 0..1
  const thirdsReasonParts: string[] = [];
  if ((a.subject?.conf ?? 0) > 0.3 && a.thirds?.subjectScore != null) {
    thirdsReasonParts.push(`subject≈${a.thirds.subjectScore.toFixed(2)}`);
  }
  if (a.horizon && a.thirds?.horizonScore != null) {
    thirdsReasonParts.push(`horizon≈${a.thirds.horizonScore.toFixed(2)}`);
  }

  // 2) Phi grid: similar to thirds
  const phi = a.phi?.overall ?? 0;
  const phiReasonParts: string[] = [];
  if ((a.subject?.conf ?? 0) > 0.3 && a.phi?.subjectScore != null) {
    phiReasonParts.push(`subject≈${a.phi.subjectScore.toFixed(2)}`);
  }
  if (a.horizon && a.phi?.horizonScore != null) {
    phiReasonParts.push(`horizon≈${a.phi.horizonScore.toFixed(2)}`);
  }

  // 3) Golden spiral: edge-fit along spiral curve (0..1)
  const spiral = a.spiral?.score ?? 0;

  // 4) Leading lines: convergence (0..1) + mild symmetry bonus (lines balanced)
  const convergence = a.leading?.convergence ?? 0;
  const lineSymBonus = clamp01(a.symmetry?.score ?? 0) * 0.15; // tiny nudge
  const leading = clamp01(convergence * 0.9 + lineSymBonus);

  // 5) Diagonal method: density along best diagonal (already ~0..1)
  const diagonal = a.diagonal?.score ?? 0;

  // 6) Symmetry: IoU of edges vs flipped edges (0..1)
  const symmetry = a.symmetry?.score ?? 0;

  // 7) Horizon on thirds: alignment confidence * proximity to thirds
  const horizonThirds =
    a.horizon && a.thirds
      ? clamp01(a.horizon.conf) * clamp01(a.thirds.horizonScore)
      : 0;

  // Convert to 0..100 and craft reasons
  const items: RuleScore[] = [
    {
      key: "rule_of_thirds",
      score: Math.round(thirds * 100),
      label: "Rule of Thirds",
      reason: thirdsReasonParts.length
        ? thirdsReasonParts.join(", ")
        : "low subject/horizon confidence",
    },
    {
      key: "phi_grid",
      score: Math.round(phi * 100),
      label: "Golden Ratio (Φ grid)",
      reason: phiReasonParts.length
        ? phiReasonParts.join(", ")
        : "low subject/horizon confidence",
    },
    {
      key: "golden_spiral",
      score: Math.round(spiral * 100),
      label: "Golden Spiral",
      reason: `edge-fit≈${spiral.toFixed(2)}`,
    },
    {
      key: "leading_lines",
      score: Math.round(leading * 100),
      label: "Leading Lines",
      reason: `convergence≈${convergence.toFixed(2)}${lineSymBonus > 0 ? ` (+sym≈${lineSymBonus.toFixed(2)})` : ""}`,
    },
    {
      key: "diagonals",
      score: Math.round(diagonal * 100),
      label: "Diagonal Method",
      reason: `best=${a.diagonal?.best ?? "n/a"}, density≈${diagonal.toFixed(2)}`,
    },
    {
      key: "symmetry",
      score: Math.round(symmetry * 100),
      label: "Vertical Symmetry",
      reason: `IoU≈${symmetry.toFixed(2)}`,
    },
    {
      key: "horizon_on_thirds",
      score: Math.round(horizonThirds * 100),
      label: "Horizon on Thirds",
      reason: a.horizon
        ? `conf≈${a.horizon.conf.toFixed(2)}, align≈${(a.thirds?.horizonScore ?? 0).toFixed(2)}`
        : "no horizon",
    },
  ];

  // Stable sort (desc), tie-break by key to avoid jitter
  items.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  return items;
}

/** Optional helper: top N with a min threshold (e.g., 55/100) */
export function topMatches(items: RuleScore[], minScore = 55, max = 3) {
  return items.filter((r) => r.score >= minScore).slice(0, max);
}
