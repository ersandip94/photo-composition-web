import type { SpiralResult } from "../types";

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

function buildSpiral(orientation: 0 | 1 | 2 | 3) {
  const pts: [number, number][] = [];
  const turns = 1.1,
    K = 160,
    a = 0.12,
    b = 2.0;
  for (let i = 0; i < K; i++) {
    const t = i / (K - 1);
    const r = a * Math.exp(b * t * turns);
    const ang = Math.PI * 2 * t * turns;
    let x = 0.5 + r * Math.cos(ang);
    let y = 0.5 + r * Math.sin(ang);
    if (orientation === 1) x = 1 - x;
    if (orientation === 2) y = 1 - y;
    if (orientation === 3) {
      x = 1 - x;
      y = 1 - y;
    }
    pts.push([clamp(x, 0, 1), clamp(y, 0, 1)]);
  }
  return { pts, eye: pts[0] };
}

export function scoreSpiral(
  edges: any,
  subject: [number, number] | null
): SpiralResult {
  const W = edges.cols,
    H = edges.rows;
  let bestScore = 0,
    bestOri: 0 | 1 | 2 | 3 = 0;
  let bestEye: [number, number] | null = null;
  const orientations: Array<0 | 1 | 2 | 3> = [0, 1, 2, 3];

  for (const ori of orientations) {
    const { pts, eye } = buildSpiral(ori);
    const r = Math.max(1, Math.round(Math.min(W, H) * 0.01));
    let s = 0;

    for (const [xn, yn] of pts) {
      const x = Math.round(xn * (W - 1));
      const y = Math.round(yn * (H - 1));
      const x0 = clamp(x - r, 0, W - 1);
      const x1 = clamp(x + r, 0, W - 1);
      const y0 = clamp(y - r, 0, H - 1);
      const y1 = clamp(y + r, 0, H - 1);
      let cnt = 0,
        sum = 0;
      for (let yy = y0; yy <= y1; yy++) {
        for (let xx = x0; xx <= x1; xx++) {
          sum += edges.ucharAt(yy, xx) > 0 ? 1 : 0;
          cnt++;
        }
      }
      s += sum / cnt;
    }

    s /= pts.length;

    if (subject) {
      const dx = subject[0] - eye[0];
      const dy = subject[1] - eye[1];
      const k = 0.18;
      s *= Math.exp(-(dx * dx + dy * dy) / (k * k));
    }

    if (s > bestScore) {
      bestScore = s;
      bestOri = ori;
      bestEye = eye;
    }
  }

  return { score: clamp(bestScore, 0, 1), orientation: bestOri, eye: bestEye };
}
