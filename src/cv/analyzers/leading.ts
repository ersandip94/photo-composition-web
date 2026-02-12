// src/cv/analyzers/leading.ts
import type { LeadingResult, Segment, PxPoint } from "../types";

export function analyzeLeading(cv: any, edges: any): LeadingResult {
  const lines = new cv.Mat();
  const kept: Segment[] = []; // strict 4-tuples

  try {
    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 60, 40, 10);

    type L = { a: number; b: number; c: number; seg: Segment };
    const arr: L[] = [];

    const data = lines.data32S;
    for (let i = 0; i < lines.rows; i++) {
      const x1 = data[i * 4 + 0];
      const y1 = data[i * 4 + 1];
      const x2 = data[i * 4 + 2];
      const y2 = data[i * 4 + 3];

      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 30) continue;

      const ang = Math.atan2(dy, dx);
      if (Math.abs(Math.sin(ang)) < 0.2) continue; // reject near-horizontal

      let a = y1 - y2,
        b = x2 - x1,
        c = x1 * y2 - x2 * y1;
      const n = Math.hypot(a, b);
      if (n < 1e-6) continue;
      a /= n;
      b /= n;
      c /= n;

      arr.push({ a, b, c, seg: [x1, y1, x2, y2] });
    }

    if (arr.length < 2) {
      return { convergence: 0, vp: null, kept: [] };
    }

    // RANSAC for VP from pairwise intersections
    let bestIn = -1;
    let bestVP: PxPoint = [edges.cols / 2, edges.rows / 2];

    const EPS = 6.0; // px
    const ITERS = 200;

    for (let it = 0; it < ITERS; it++) {
      const i = (Math.random() * arr.length) | 0;
      const j = (Math.random() * arr.length) | 0;
      if (i === j) continue;

      const li = arr[i],
        lj = arr[j];
      const det = li.a * lj.b - lj.a * li.b;
      if (Math.abs(det) < 1e-6) continue;

      const vx = (lj.b * -li.c - li.b * -lj.c) / det;
      const vy = (li.a * -lj.c - lj.a * -li.c) / det;

      let inl = 0;
      for (const L of arr) {
        const d = Math.abs(L.a * vx + L.b * vy + L.c); // a,b normalized → distance in px
        if (d <= EPS) inl++;
      }
      if (inl > bestIn) {
        bestIn = inl;
        bestVP = [vx, vy];
      }
    }

    // Keep longest segments for overlay
    arr.sort((p, q) => {
      const lp = Math.hypot(p.seg[2] - p.seg[0], p.seg[3] - p.seg[1]);
      const lq = Math.hypot(q.seg[2] - q.seg[0], q.seg[3] - q.seg[1]);
      return lq - lp;
    });
    for (let k = 0; k < Math.min(100, arr.length); k++) kept.push(arr[k].seg);

    const convergence = bestIn / arr.length;
    return { convergence, vp: bestVP, kept };
  } finally {
    lines.delete();
  }
}
