// src/cv/analyzers/symmetry.ts
import type { SymmetryResult } from "../types";

export function scoreSymmetry(cv: any, edges: any): SymmetryResult {
  const W = edges.cols,
    H = edges.rows;

  // Downscale a bit for speed
  const down = Math.max(1, Math.round(Math.min(W, H) / 320));
  const small = new cv.Mat();
  cv.resize(
    edges,
    small,
    new cv.Size(Math.floor(W / down), Math.floor(H / down)),
    0,
    0,
    cv.INTER_AREA
  );

  // Try a few vertical axes around center (±5%)
  const candidates = [-0.05, -0.025, 0, 0.025, 0.05];
  let best: SymmetryResult = { score: 0, axisX: 0.5 };

  const flipped = new cv.Mat();
  cv.flip(small, flipped, 1); // horizontal flip around image center

  try {
    for (const off of candidates) {
      const axisNorm = 0.5 + off; // normalized axis (0..1)
      const axis = Math.round(axisNorm * small.cols);
      const centerAxis = Math.floor(small.cols / 2);
      const shift = axis - centerAxis;

      const rolled = rollCols(cv, flipped, shift); // align flip around desired axis

      // IoU on binary edge maps
      const and = new cv.Mat(),
        or = new cv.Mat();
      cv.bitwise_and(small, rolled, and);
      cv.bitwise_or(small, rolled, or);

      const sAnd = cv.countNonZero(and);
      const sOr = cv.countNonZero(or);
      const score = sOr > 0 ? Math.min(1, sAnd / sOr) : 0;

      if (score > best.score) best = { score, axisX: axisNorm };

      and.delete();
      or.delete();
      rolled.delete();
    }
  } finally {
    small.delete();
    flipped.delete();
  }

  return best;
}

/**
 * Shift image columns by k pixels (positive = right), wrapping around.
 * Implemented via ROI copy to avoid MatVector/hconcat pitfalls in OpenCV.js.
 */
function rollCols(cv: any, src: any, k: number) {
  if (k === 0) return src.clone();
  const w = src.cols,
    h = src.rows;
  const kMod = ((k % w) + w) % w; // wrap to [0..w-1]

  const dst = new cv.Mat(h, w, src.type());

  // Left block of dst: the last kMod columns of src
  const srcTail = src.roi(new cv.Rect(w - kMod, 0, kMod, h));
  const dstLeft = dst.roi(new cv.Rect(0, 0, kMod, h));
  srcTail.copyTo(dstLeft);

  // Right block of dst: the first (w - kMod) columns of src
  const srcHead = src.roi(new cv.Rect(0, 0, w - kMod, h));
  const dstRight = dst.roi(new cv.Rect(kMod, 0, w - kMod, h));
  srcHead.copyTo(dstRight);

  // Cleanup ROIs
  srcTail.delete();
  dstLeft.delete();
  srcHead.delete();
  dstRight.delete();

  return dst;
}
