import { useCallback, useState } from "react";
import { useOpenCv } from "opencv-react";

// analyzers
import { analyzeLeading } from "../cv/analyzers/leading";
import { estimateHorizon } from "../cv/analyzers/horizon";
import { scoreThirds } from "../cv/analyzers/thirds";
import { scorePhi } from "../cv/analyzers/phi";
import { scoreSpiral } from "../cv/analyzers/spiral";
import { scoreSymmetry } from "../cv/analyzers/symmetry";
import { scoreDiagonal } from "../cv/analyzers/diagonal";
import { estimateSubject } from "../cv/analyzers/subject";

import type { AnalysisPayload } from "../cv/types";

export function useAnalyzeWithOpenCV() {
  const { loaded, cv } = useOpenCv();
  const [result, setResult] = useState<AnalysisPayload | null>(null);

  // ---- shared pipeline starting from ImageData ----
  const runPipeline = useCallback(
    (imageData: ImageData) => {
      if (!loaded || !cv) return;

      // RGBA -> GRAY
      const src = cv.matFromImageData(imageData);
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // Downscale for speed (work in "small" space)
      const targetW = 640;
      const scale = Math.min(1, targetW / gray.cols);
      const small = new cv.Mat();
      cv.resize(
        gray,
        small,
        new cv.Size(
          Math.max(1, Math.round(gray.cols * scale)),
          Math.max(1, Math.round(gray.rows * scale))
        ),
        0,
        0,
        cv.INTER_AREA
      );

      // Subject BEFORE blur/Canny
      const subject = estimateSubject(cv, small);

      // Edges (Canny on blurred copy)
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
      const spiral = scoreSpiral(edges, subject.center); // JS version: no cv arg
      const symmetry = scoreSymmetry(cv, edges);
      const diagonal = scoreDiagonal(edges); // JS version: no cv arg

      // Cleanup
      src.delete();
      gray.delete();
      small.delete();
      work.delete();
      edges.delete();

      setResult({
        scale,
        leading,
        horizon,
        thirds,
        phi,
        spiral,
        symmetry,
        diagonal,
        subject,
      });
    },
    [loaded, cv]
  );

  // ---- public: analyze ImageData (used by CanvasStage) ----
  const analyzeImageData = useCallback(
    (imageData: ImageData) => {
      if (!loaded || !cv) return;
      runPipeline(imageData);
    },
    [loaded, cv, runPipeline]
  );

  // ---- public: analyze File (upload) ----
  const analyzeFile = useCallback(
    async (file: File) => {
      if (!loaded || !cv) return;

      // Decode to ImageBitmap, then to ImageData via (Offscreen)Canvas
      const bmp = await createImageBitmap(file);
      const off =
        "OffscreenCanvas" in window
          ? new OffscreenCanvas(bmp.width, bmp.height)
          : ((() => {
              const c = document.createElement("canvas");
              c.width = bmp.width;
              c.height = bmp.height;
              return c;
            })() as HTMLCanvasElement | OffscreenCanvas);

      const ctx = (off as any).getContext("2d", {
        willReadFrequently: true,
      }) as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
      ctx.drawImage(bmp, 0, 0);

      const imageData: ImageData = ctx.getImageData(
        0,
        0,
        bmp.width,
        bmp.height
      );
      bmp.close?.();

      runPipeline(imageData);
    },
    [loaded, cv, runPipeline]
  );

  return {
    ready: !!loaded,
    result,
    analyzeFile,
    analyzeImageData,
  };
}
