import { suggest, type Suggestion } from "../cv/coach";
import type { AnalysisPayload } from "../cv/types";

export function CoachPanel({ analysis }: { analysis: AnalysisPayload | null }) {
  const suggestions: Suggestion[] = suggest(analysis);

  if (!analysis) return <div style={{ opacity: 0.6 }}>No analysis yet.</div>;
  if (!suggestions.length)
    return (
      <div style={{ opacity: 0.8 }}>
        You’re close! No high-impact nudges detected.
      </div>
    );

  const top = suggestions[0];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 700 }}>Coach</div>

      <div
        style={{
          background: "#161b26",
          border: "1px solid #2a3140",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4 }}>
          {label(top.rule)}
        </div>
        <div style={{ marginBottom: 8 }}>{top.message}</div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          est. gain <strong>{Math.round(top.estGain)}</strong> / effort{" "}
          {Math.round(top.effort)}
        </div>
      </div>

      <div style={{ fontWeight: 700, marginTop: 4 }}>More ideas</div>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gap: 8,
        }}
      >
        {suggestions.slice(1).map((s) => (
          <li
            key={s.rule}
            style={{
              background: "#121722",
              border: "1px solid #263043",
              borderRadius: 10,
              padding: "8px 10px",
            }}
          >
            <div style={{ fontWeight: 600 }}>{label(s.rule)}</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>{s.message}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function label(rule: Suggestion["rule"]) {
  switch (rule) {
    case "thirds":
      return "Rule of Thirds";
    case "phi":
      return "Golden Ratio";
    case "spiral":
      return "Golden Spiral";
    case "leading":
      return "Leading Lines";
    case "diagonal":
      return "Diagonal Method";
    case "symmetry":
      return "Symmetry";
    case "horizon":
      return "Horizon";
  }
}
