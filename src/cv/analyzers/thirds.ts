// src/cv/analyzers/thirds.ts
const sigma = 0.12; // softness for subject→thirds points
const tau = 0.07; // softness for horizon→thirds lines

function gaussianScore(d: number, s: number) {
  return Math.exp(-(d * d) / (s * s));
}

export function scoreThirds(
  subject: [number, number] | null,
  horizonY: number | null
) {
  const thirdsPts: [number, number][] = [
    [1 / 3, 1 / 3],
    [2 / 3, 1 / 3],
    [1 / 3, 2 / 3],
    [2 / 3, 2 / 3],
  ];

  let subjectScore = 0;
  let best: [number, number] | null = null;

  if (subject) {
    let bestD = Infinity;
    for (const p of thirdsPts) {
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
    const d = Math.min(Math.abs(horizonY - 1 / 3), Math.abs(horizonY - 2 / 3));
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
