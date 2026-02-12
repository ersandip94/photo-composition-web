import { computeRuleScores, topMatches } from "../cv/scoring";
import type { AnalysisPayload } from "../cv/types";

export function ScoresPanel({
  analysis,
}: {
  analysis: AnalysisPayload | null;
}) {
  if (!analysis) return <div style={{ opacity: 0.6 }}>No analysis yet.</div>;

  const scored = computeRuleScores(analysis);
  const best = topMatches(scored, 55, 3); // show top 3 above 55/100

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 700 }}>Top matches</div>
      {best.length ? (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 8,
          }}
        >
          {best.map((r) => (
            <li
              key={r.key}
              style={{
                background: "#141822",
                border: "1px solid #2a3140",
                borderRadius: 10,
                padding: "10px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{r.label}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{r.reason}</div>
              </div>
              <div
                style={{
                  minWidth: 64,
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 800,
                  color:
                    r.score >= 80
                      ? "#22c55e"
                      : r.score >= 65
                        ? "#eab308"
                        : "#60a5fa",
                }}
              >
                {r.score}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ opacity: 0.75 }}>
          No rule strongly matches (try reframing).
        </div>
      )}

      <div style={{ fontWeight: 700, marginTop: 8 }}>All scores</div>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <tbody>
          {scored.map((r) => (
            <tr key={r.key} style={{ borderTop: "1px solid #273142" }}>
              <td style={{ padding: "6px 6px 6px 0" }}>{r.label}</td>
              <td style={{ padding: "6px", opacity: 0.8 }}>{r.reason}</td>
              <td style={{ padding: "6px", textAlign: "right" }}>{r.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
