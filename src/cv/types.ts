export type Point = [number, number]; // normalized 0..1 unless noted
export type Segment = [number, number, number, number]; // x1,y1,x2,y2 (px, small-space)

export type PxPoint = [number, number]; // pixel coordinates in "small" image
export interface LeadingResult {
  convergence: number; // 0..1 (inliers / total)
  vp: PxPoint | null; // vanishing point IN PIXELS (small image space)
  kept: Segment[]; // segments IN PIXELS (small image space)
}

export interface HorizonResult {
  y: number; // normalized 0..1
  conf: number; // 0..1
}

export interface GridScoreResult {
  subjectScore: number; // 0..1
  horizonScore: number; // 0..1
  overall: number; // 0..1
  best: Point | null; // normalized
}

export interface SpiralResult {
  score: number; // 0..1
  orientation: 0 | 1 | 2 | 3;
  eye: Point | null; // normalized
}

export interface SymmetryResult {
  score: number; // 0..1
  axisX: number; // normalized 0..1
}

export type DiagonalBest = "TLBR" | "TRBL";
export interface DiagonalResult {
  score: number; // 0..1
  best: DiagonalBest;
}

export interface SubjectResult {
  center: Point; // normalized (0..1)
  conf: number; // 0..1
}

export type AnalysisPayload = {
  // small = original * scale; multiply small coords by (1/scale) to draw on original canvas
  scale: number;

  leading: LeadingResult;
  horizon?: HorizonResult;

  thirds: GridScoreResult;
  phi: GridScoreResult;
  spiral: SpiralResult;

  symmetry: SymmetryResult;
  diagonal: DiagonalResult;

  subject: SubjectResult; // now REQUIRED
};

export type CVRequest =
  | { type: "INIT" }
  | { type: "ANALYZE"; payload: { bitmap: ImageBitmap } };

export type CVResponse =
  | { type: "READY" }
  | { type: "RESULT"; payload: AnalysisPayload };
