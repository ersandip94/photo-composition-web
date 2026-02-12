// src/cv/analyzers/phi.ts
const GOLDEN = (1 + Math.sqrt(5)) / 2; // 1.618...
const sigma = 0.12;
const tau = 0.07;

function gaussianScore(d: number, s: number) {
  return Math.exp(-(d * d) / (s * s));
}

export function scorePhi(
  subject: [number, number] | null,
  horizonY: number | null
) {
  const a = 1 / GOLDEN; // ≈ 0.618
  const b = 1 - 1 / GOLDEN; // ≈ 0.382
  const phiPts: [number, number][] = [
    [a, a],
    [a, b],
    [b, a],
    [b, b],
  ];

  let subjectScore = 0;
  let best: [number, number] | null = null;

  if (subject) {
    let bestD = Infinity;
    for (const p of phiPts) {
      const d = Math.hypot(subject[0] - p[0], subject[1] - p[1]);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    subjectScore = gaussianScore(
      best ? Math.hypot(subject[0] - best[0], subject[1] - best[1]) : 1,
      sigma
    );
  }

  let horizonScore = 0;
  if (horizonY != null) {
    const targets = [a, b];
    const d = Math.min(
      Math.abs(horizonY - targets[0]),
      Math.abs(horizonY - targets[1])
    );
    horizonScore = gaussianScore(d, tau);
  }

  const haveBoth = subject != null && horizonY != null;
  const overall = haveBoth
    ? 0.6 * subjectScore + 0.4 * horizonScore
    : subject != null
      ? subjectScore
      : horizonScore;

  return { subjectScore, horizonScore, overall, best };
}
