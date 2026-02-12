import { useMemo, useState } from "react";
import { Uploader } from "./components/Uploader";
import { CanvasStage } from "./components/CanvasStage";
import { Toggles } from "./components/Toggles";
import { ScoresPanel } from "./components/ScoresPanel";
import { useAnalyzeWithOpenCV } from "./hooks/useAnalyzeWithOpenCV";
import { CoachPanel } from "./components/CoachPanel";
import { suggest } from "./cv/coach";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const { ready, analyzeFile, analyzeImageData, result } =
    useAnalyzeWithOpenCV();

  const suggestions = useMemo(() => suggest(result), [result]);
  const top = suggestions[0] ?? null;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "#0b0c10",
        color: "#e5e7eb",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
          Local Photo Composition Analyzer
        </h1>
        <p style={{ opacity: 0.8, marginBottom: 16 }}>
          Guidelines + Scorecard + Coach — runs entirely in your browser.
        </p>

        {/* 2-column layout */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}
        >
          {/* LEFT column: Coach + Uploader + Canvas */}
          <div>
            {/* Coach on the LEFT */}

            <Uploader
              onFile={(f) => {
                setFile(f);
                analyzeFile(f);
              }}
            />

            <div style={{ marginTop: 16 }}>
              {file ? (
                <CanvasStage
                  file={file}
                  analysis={result}
                  coach={top}
                  onAnalyzeFrame={analyzeImageData} // re-analyze after pan/zoom/rotate
                />
              ) : (
                <div style={{ opacity: 0.6 }}>Upload an image to begin.</div>
              )}
            </div>
          </div>

          {/* RIGHT sidebar: status + toggles + scores (optional) */}
          <aside
            style={{
              background: "#111318",
              borderRadius: 12,
              padding: 16,
              display: "grid",
              gap: 16,
              border: "1px solid #273142",
              position: "sticky",
              top: 16,
              alignSelf: "start",
              height: "fit-content",
            }}
          >
            <div>
              <strong>Status:</strong> OpenCV{" "}
              {ready ? "✅ Ready" : "⏳ Loading..."}
            </div>

            <Toggles />

            <div
              style={{
                background: "#111318",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                border: "1px solid #273142",
              }}
            >
              <CoachPanel analysis={result} />
            </div>

            <ScoresPanel analysis={result} />

            <div>
              <strong>Debug (leading):</strong>
              <pre style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
                {result ? JSON.stringify(result.leading, null, 2) : "—"}
              </pre>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
