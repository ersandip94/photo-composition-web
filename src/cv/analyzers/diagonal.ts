import type { DiagonalResult } from "../types";

export function scoreDiagonal(edges: any): DiagonalResult {
  const W = edges.cols,
    H = edges.rows;
  const band = Math.max(1, Math.round(Math.min(W, H) * 0.01));

  function bandDensity(tlbr: boolean): number {
    let sum = 0,
      cnt = 0;
    const slope = H / W;
    const step = Math.max(1, Math.floor(Math.min(W, H) / 512));
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        const yDiag = tlbr ? slope * x : -slope * x + H;
        if (Math.abs(y - yDiag) <= band) {
          sum += edges.ucharAt(y, x) > 0 ? 1 : 0;
          cnt++;
        }
      }
    }
    return cnt > 0 ? sum / cnt : 0;
  }

  const sTLBR = bandDensity(true);
  const sTRBL = bandDensity(false);
  const best = sTLBR >= sTRBL ? "TLBR" : "TRBL";
  return { score: Math.max(sTLBR, sTRBL), best };
}
