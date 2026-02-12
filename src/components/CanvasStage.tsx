import { useEffect, useRef, useState, useMemo } from "react";
import type { AnalysisPayload } from "../cv/types";
import type { Suggestion, Nudge } from "../cv/coach";
import { useUI } from "../app/store";

type Props = {
  file: File | null;
  analysis: AnalysisPayload | null;
  coach?: Suggestion | null;
  onAnalyzeFrame?: (imageData: ImageData) => void;
  analyzeDebounceMs?: number;
};

export function CanvasStage({
  file,
  analysis,
  coach,
  onAnalyzeFrame,
  analyzeDebounceMs = 180,
}: Props) {
  const { show } = useUI();
  const imgRef = useRef<HTMLImageElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  // view transform state
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0); // radians
  const [pan, setPan] = useState({ x: 0, y: 0 }); // px

  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const debTimer = useRef<number | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    const img = imgRef.current,
      base = baseRef.current,
      ov = overlayRef.current;
    if (!img || !base || !ov || !url) return;
    img.onload = () => {
      base.width = img.naturalWidth;
      base.height = img.naturalHeight;
      ov.width = img.naturalWidth;
      ov.height = img.naturalHeight;
      // reset view
      setZoom(1);
      setRot(0);
      setPan({ x: 0, y: 0 });
      drawBase();
      drawOverlay();
      triggerAnalyze();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    drawOverlay();
  }, [analysis, show, coach]);

  const drawBase = () => {
    const img = imgRef.current,
      base = baseRef.current;
    if (!img || !base) return;
    const ctx = base.getContext("2d", { willReadFrequently: true })!;
    const W = base.width,
      H = base.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.translate(W / 2 + pan.x, H / 2 + pan.y);
    ctx.rotate(rot);
    ctx.scale(zoom, zoom);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  };

  const drawOverlay = () => {
    const ov = overlayRef.current;
    if (!ov) return;
    const ctx = ov.getContext("2d")!;
    ctx.clearRect(0, 0, ov.width, ov.height);
    if (!analysis) return;

    const W = ov.width,
      H = ov.height;
    const inv = 1 / (analysis.scale || 1);
    const heavy = Math.max(3, Math.round(W / 300));
    const normal = Math.max(2, Math.round(W / 400));

    // Thirds
    if (show.thirds) {
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.lineWidth = normal;
      [1 / 3, 2 / 3].forEach((t) => {
        ctx.beginPath();
        ctx.moveTo(W * t, 0);
        ctx.lineTo(W * t, H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, H * t);
        ctx.lineTo(W, H * t);
        ctx.stroke();
      });
    }
    // Phi
    if (show.phi) {
      ctx.strokeStyle = "rgba(0,200,255,.9)";
      ctx.lineWidth = normal;
      const a = 1 / 1.618,
        b = 1 - a;
      [a, b].forEach((t) => {
        ctx.beginPath();
        ctx.moveTo(W * t, 0);
        ctx.lineTo(W * t, H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, H * t);
        ctx.lineTo(W, H * t);
        ctx.stroke();
      });
    }
    // Spiral
    if (show.spiral && analysis.spiral?.eye) {
      ctx.strokeStyle = "rgba(200,150,0,.95)";
      ctx.lineWidth = heavy;
      const { orientation, eye } = analysis.spiral;
      const turns = 1.1,
        K = 100,
        a = 0.12,
        b = 2.0;
      ctx.beginPath();
      for (let i = 0; i < K; i++) {
        const t = i / (K - 1),
          r = a * Math.exp(b * t * turns),
          ang = Math.PI * 2 * t * turns;
        let x = 0.5 + r * Math.cos(ang),
          y = 0.5 + r * Math.sin(ang);
        if (orientation === 1) x = 1 - x;
        if (orientation === 2) y = 1 - y;
        if (orientation === 3) {
          x = 1 - x;
          y = 1 - y;
        }
        const px = x * W,
          py = y * H;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(200,150,0,1)";
      ctx.beginPath();
      ctx.arc(
        analysis.spiral.eye[0] * W,
        analysis.spiral.eye[1] * H,
        8,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    // Leading + VP
    if (show.leading && analysis.leading) {
      ctx.strokeStyle = "rgba(255,80,80,.95)";
      ctx.lineWidth = heavy;
      for (const [x1, y1, x2, y2] of analysis.leading.kept) {
        ctx.beginPath();
        ctx.moveTo(x1 * inv, y1 * inv);
        ctx.lineTo(x2 * inv, y2 * inv);
        ctx.stroke();
      }
      if (analysis.leading.vp) {
        const [vx, vy] = analysis.leading.vp;
        ctx.fillStyle = "rgba(255,80,80,1)";
        ctx.beginPath();
        ctx.arc(vx * inv, vy * inv, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Horizon
    if (show.horizon && analysis.horizon && analysis.horizon.conf > 0.3) {
      ctx.strokeStyle = "rgba(0,255,150,.95)";
      ctx.lineWidth = heavy;
      const y = analysis.horizon.y * H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    // Symmetry
    if (show.symmetry && analysis.symmetry && analysis.symmetry.score > 0.3) {
      ctx.strokeStyle = "rgba(80,200,255,.95)";
      ctx.lineWidth = heavy;
      const x = analysis.symmetry.axisX * W;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    // Diagonal
    if (show.diagonal && analysis.diagonal && analysis.diagonal.score > 0.25) {
      ctx.strokeStyle = "rgba(255,220,80,.95)";
      ctx.lineWidth = heavy;
      ctx.beginPath();
      analysis.diagonal.best === "TLBR"
        ? (ctx.moveTo(0, 0), ctx.lineTo(W, H))
        : (ctx.moveTo(W, 0), ctx.lineTo(0, H));
      ctx.stroke();
    }
    // Subject
    if (show.subject && analysis.subject?.conf > 0) {
      const [sx, sy] = analysis.subject.center;
      ctx.fillStyle = "rgba(255,0,255,1)";
      ctx.beginPath();
      ctx.arc(sx * W, sy * H, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Coach arrows
    if (coach) drawCoach(ctx, W, H, coach.nudges);
  };

  const triggerAnalyze = () => {
    if (!onAnalyzeFrame) return;
    const base = baseRef.current;
    if (!base) return;
    if (debTimer.current) window.clearTimeout(debTimer.current);
    debTimer.current = window.setTimeout(() => {
      try {
        const ctx = base.getContext("2d", { willReadFrequently: true })!;
        const imageData = ctx.getImageData(0, 0, base.width, base.height);
        onAnalyzeFrame(imageData);
      } catch {}
    }, analyzeDebounceMs);
  };

  // ---------- interactions ----------
  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const speedZoom = 0.0015,
      speedRot = 0.0025;
    if (e.altKey) {
      setRot((r) => {
        const next = r + e.deltaY * speedRot;
        rafRedraw();
        return next;
      });
    } else {
      setZoom((z) => {
        const factor = Math.exp(-e.deltaY * speedZoom);
        const next = clamp(z * factor, 0.1, 8);
        rafRedraw();
        return next;
      });
    }
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x,
      dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPan((p) => {
      const next = { x: p.x + dx, y: p.y + dy };
      rafRedraw();
      return next;
    });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragging.current = false;
    (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
  };
  const onDoubleClick = () => {
    setZoom(1);
    setRot(0);
    setPan({ x: 0, y: 0 });
    rafRedraw();
  };

  const rafRedraw = () => {
    requestAnimationFrame(() => {
      drawBase();
      drawOverlay();
      triggerAnalyze();
    });
  };

  // ---------- AUTO-APPLY COACH ----------
  const applyCoach = () => {
    if (!coach) return;
    const W = baseRef.current?.width || 0,
      H = baseRef.current?.height || 0;
    if (!W || !H) return;

    // Aggregate nudges into deltas
    let dPanX = 0,
      dPanY = 0,
      dRotDeg = 0,
      dZoom = 0;
    for (const n of coach.nudges) {
      if (n.kind === "pan") {
        const scalePx = Math.min(W, H) * 0.8; // same scale used in arrow
        dPanX += n.dx * scalePx;
        dPanY += n.dy * scalePx;
      } else if (n.kind === "rotate") {
        dRotDeg += n.deg;
      } else if (n.kind === "zoom") {
        dZoom += n.dz;
      }
    }
    smoothTo({
      panX: pan.x + dPanX,
      panY: pan.y + dPanY,
      rot: rot + (dRotDeg * Math.PI) / 180,
      zoom: clamp(zoom * (1 + dZoom), 0.1, 8),
      duration: 450,
    });
  };

  // Smooth animation to target transform
  const smoothTo = ({
    panX,
    panY,
    rot,
    zoom,
    duration = 450,
  }: {
    panX: number;
    panY: number;
    rot: number;
    zoom: number;
    duration?: number;
  }) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const start = performance.now();
    const z0 = zoomClamp(1 * (undefined as any)); // TS trick not needed; ignore
    const from = {
      panX: pan.x,
      panY: pan.y,
      rot: rotClamp(rot),
      zoom: clamp(zoom, 0.1, 8),
    };
    const to = { panX, panY, rot: rotClamp(rot), zoom: clamp(zoom, 0.1, 8) };
    // fix: use current state as 'from' values
    from.panX = pan.x;
    from.panY = pan.y;
    from.rot = rot;
    from.zoom = zoom;

    const ease = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const k = ease(t);
      const nx = lerp(from.panX, to.panX, k);
      const ny = lerp(from.panY, to.panY, k);
      const nr = slerpAngle(from.rot, to.rot, k);
      const nz = lerp(from.zoom, to.zoom, k);

      setPan({ x: nx, y: ny });
      setRot(nr);
      setZoom(nz);
      drawBase();
      drawOverlay();

      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        triggerAnalyze();
      }
    };
    animRef.current = requestAnimationFrame(step);
  };

  // quick controls
  const quick = useMemo(() => {
    const doZoom = (f: number) => () => {
      setZoom((z) => clamp(z * f, 0.1, 8));
      rafRedraw();
    };
    const doRotate = (deg: number) => () => {
      setRot((r) => r + (deg * Math.PI) / 180);
      rafRedraw();
    };
    const doReset = () => {
      setZoom(1);
      setRot(0);
      setPan({ x: 0, y: 0 });
      rafRedraw();
    };
    return { doZoom, doRotate, doReset };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
      {url && <img ref={imgRef} src={url} alt="" style={{ display: "none" }} />}

      <canvas
        ref={baseRef}
        style={{
          display: "block",
          width: "100%",
          touchAction: "none",
          background: "#000",
        }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
      />
      <canvas
        ref={overlayRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          width: "100%",
          height: "100%",
        }}
      />

      {/* Quick controls */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          display: "flex",
          gap: 8,
          background: "rgba(0,0,0,.5)",
          padding: 6,
          borderRadius: 10,
          backdropFilter: "blur(4px)",
        }}
      >
        <Btn onClick={quick.doZoom(1.2)}>＋</Btn>
        <Btn onClick={quick.doZoom(1 / 1.2)}>－</Btn>
        <Btn onClick={quick.doRotate(-3)}>↺</Btn>
        <Btn onClick={quick.doRotate(3)}>↻</Btn>
        <Btn onClick={quick.doReset}>⟲</Btn>
        {/* Auto-frame button */}
        <Btn onClick={applyCoach} disabled={!coach}>
          ⚡ Auto-frame
        </Btn>
      </div>
    </div>
  );
}

// ---- coach overlay helpers ----
function drawCoach(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  nudges: Nudge[]
) {
  const cx = W * 0.5,
    cy = H * 0.5;
  const pan = nudges.find((n) => n.kind === "pan") as Nudge | undefined;
  if (pan && "dx" in pan && "dy" in pan) {
    const scale = Math.min(W, H) * 0.8;
    const x2 = cx + (pan as any).dx * scale;
    const y2 = cy + (pan as any).dy * scale;
    drawArrow(ctx, cx, cy, x2, y2, "#22c55e", Math.max(4, Math.round(W / 250)));
  }
  const rot = nudges.find((n) => n.kind === "rotate") as Nudge | undefined;
  if (rot && "deg" in rot)
    drawRotateHint(
      ctx,
      W,
      H,
      ((rot as any).deg as number) > 0,
      Math.round(Math.abs((rot as any).deg as number))
    );
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  lw: number
) {
  const head = Math.max(12, lw * 3);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - head * Math.cos(ang - Math.PI / 6),
    y2 - head * Math.sin(ang - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - head * Math.cos(ang + Math.PI / 6),
    y2 - head * Math.sin(ang + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawRotateHint(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  cw: boolean,
  deg: number
) {
  const r = Math.min(W, H) * 0.12,
    cx = W * 0.85,
    cy = H * 0.15,
    start = cw ? -Math.PI * 0.25 : -Math.PI * 0.75,
    end = cw ? start + Math.PI * 0.6 : start - Math.PI * 0.6;
  const lw = Math.max(4, Math.round(W / 250));
  ctx.save();
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, end, !cw);
  ctx.stroke();
  const ax = cx + r * Math.cos(end),
    ay = cy + r * Math.sin(end);
  drawArrow(
    ctx,
    cx + r * Math.cos(end - (cw ? 0.25 : -0.25)),
    cy + r * Math.sin(end - (cw ? 0.25 : -0.25)),
    ax,
    ay,
    "#22c55e",
    lw
  );
  ctx.fillStyle = "#22c55e";
  ctx.font = `bold ${Math.max(12, Math.round(W / 60))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(
    `${cw ? "↻" : "↺"} ${deg}°`,
    cx,
    cy + r + Math.max(14, Math.round(W / 80))
  );
  ctx.restore();
}

// ---- math helpers ----
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function slerpAngle(a: number, b: number, t: number) {
  // shortest angular interpolation
  let d = ((b - a + Math.PI) % (2 * Math.PI)) - Math.PI;
  return a + d * t;
}
function rotClamp(r: number) {
  return ((r + Math.PI) % (2 * Math.PI)) - Math.PI;
}
function zoomClamp(z?: number) {
  return z ?? 1;
} // stub to keep TS happy

function Btn({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        color: disabled ? "#6b7280" : "#e5e7eb",
        background: "rgba(17,24,39,.7)",
        border: "1px solid rgba(75,85,99,.6)",
        padding: "4px 8px",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}
