// src/cv/analyzers/horizon.ts
export function estimateHorizon(cv: any, edges: any) {
  const lines = new cv.Mat();
  try {
    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 60, 40, 10);
    const horiz: { y: number; w: number }[] = [];

    const data = lines.data32S;
    for (let i = 0; i < lines.rows; i++) {
      const x1 = data[i * 4 + 0];
      const y1 = data[i * 4 + 1];
      const x2 = data[i * 4 + 2];
      const y2 = data[i * 4 + 3];

      const dx = x2 - x1,
        dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 40) continue;

      const ang = Math.atan2(dy, dx);
      if (Math.abs(Math.sin(ang)) < 0.2) {
        // near-horizontal
        horiz.push({ y: (y1 + y2) / 2, w: len });
      }
    }
    if (!horiz.length) return { y: 0.5, conf: 0 };

    const sumW = horiz.reduce((s, h) => s + h.w, 0);
    const y = horiz.reduce((s, h) => s + h.y * h.w, 0) / sumW;

    const conf = Math.max(0, Math.min(1, sumW / (edges.cols * 2)));
    return { y: y / edges.rows, conf };
  } finally {
    lines.delete();
  }
}
