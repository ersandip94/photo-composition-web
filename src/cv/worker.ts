/// <reference lib="webworker" />

import { loadOpenCVInWorker } from "./opencv-loader";
import { analyzeLeading } from "./analyzers/leading";
import { estimateHorizon } from "./analyzers/horizon";
import { scoreThirds } from "./analyzers/thirds";
import { scorePhi } from "./analyzers/phi";
import { scoreSpiral } from "./analyzers/spiral";
import { scoreSymmetry } from "./analyzers/symmetry";
import { scoreDiagonal } from "./analyzers/diagonal";
import { estimateSubject } from "./analyzers/subject";

import type { CVRequest, CVResponse, AnalysisPayload } from "./types";

let cv: any;

self.onmessage = async (e: MessageEvent<CVRequest>) => {
  const msg = e.data;

  if (msg.type === "INIT") {
    cv = await loadOpenCVInWorker(self as DedicatedWorkerGlobalScope);
    postMessage({ type: "READY" } satisfies CVResponse);
    return;
  }

  if (!cv || msg.type !== "ANALYZE") return;

  const { bitmap } = msg.payload;

  // Draw ImageBitmap → ImageData (RGBA)
  const off = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = off.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

  // RGBA → GRAY
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  // Downscale (work in "small" space)
  const targetW = 640;
  const scale = Math.min(1, targetW / gray.cols); // small = original * scale
  const smallSize = new cv.Size(
    Math.max(1, Math.round(gray.cols * scale)),
    Math.max(1, Math.round(gray.rows * scale))
  );
  const small = new cv.Mat();
  cv.resize(gray, small, smallSize, 0, 0, cv.INTER_AREA);

  // ---- SUBJECT (compute BEFORE Canny/blur) ----
  const subject = estimateSubject(cv, small); // always returns {center, conf}

  // ---- EDGES (Canny on a blurred copy) ----
  const work = new cv.Mat();
  small.copyTo(work);
  const edges = new cv.Mat();
  cv.GaussianBlur(work, work, new cv.Size(3, 3), 0);
  cv.Canny(work, edges, 80, 160, 3, true);

  // Analyses
  const leading = analyzeLeading(cv, edges);
  const horizon = estimateHorizon(cv, edges);
  const thirds = scoreThirds(subject.center, horizon?.y ?? null);
  const phi = scorePhi(subject.center, horizon?.y ?? null);
  // was: scoreDiagonal(cv, edges)
  const diagonal = scoreDiagonal(edges);

  // was: scoreSpiral(cv, edges, subject.center)
  const spiral = scoreSpiral(edges, subject.center);
  const symmetry = scoreSymmetry(cv, edges);

  // Cleanup
  src.delete();
  gray.delete();
  small.delete();
  work.delete();
  edges.delete();

  const payload: AnalysisPayload = {
    scale,
    leading,
    horizon,
    thirds,
    phi,
    spiral,
    symmetry,
    diagonal,
    subject, // now defined
  };

  postMessage({ type: "RESULT", payload } satisfies CVResponse);
};
