// src/cv/analyzers/subject.ts
import type { SubjectResult } from "../types";

/**
 * Estimate a subject center using gradient magnitude saliency on the
 * *downscaled grayscale* image (small space). No ML required.
 */
export function estimateSubject(cv: any, smallGray: any): SubjectResult {
  // Sobel → magnitude
  const sobelx = new cv.Mat();
  const sobely = new cv.Mat();
  const mag = new cv.Mat();
  const smallMag = new cv.Mat();
  try {
    cv.Sobel(smallGray, sobelx, cv.CV_32F, 1, 0, 3, 1, 0, cv.BORDER_DEFAULT);
    cv.Sobel(smallGray, sobely, cv.CV_32F, 0, 1, 3, 1, 0, cv.BORDER_DEFAULT);
    cv.magnitude(sobelx, sobely, mag);

    // Downsample for stability and speed
    const size = new cv.Size(
      Math.max(1, Math.round(smallGray.cols / 8)),
      Math.max(1, Math.round(smallGray.rows / 8))
    );
    cv.resize(mag, smallMag, size, 0, 0, cv.INTER_AREA);

    const mm = cv.minMaxLoc(smallMag);
    const cx = (mm.maxLoc.x + 0.5) / smallMag.cols;
    const cy = (mm.maxLoc.y + 0.5) / smallMag.rows;

    // Confidence: contrast of peak vs mean, squashed to 0..1
    const meanScalar = cv.mean(smallMag)[0] || 1e-3;
    const ratio = Math.max(0, mm.maxVal / meanScalar - 1);
    const conf = Math.tanh(ratio / 4); // softer scale

    return { center: [cx, cy], conf };
  } catch {
    // Fallback to center if anything goes wrong
    return { center: [0.5, 0.5], conf: 0 };
  } finally {
    sobelx.delete();
    sobely.delete();
    mag.delete();
    smallMag.delete();
  }
}
