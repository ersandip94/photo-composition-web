import { useUI, type ToggleKey } from "../app/store";

const ROW: ToggleKey[] = ["thirds", "phi", "spiral", "leading"];
const ROW2: ToggleKey[] = ["horizon", "symmetry", "diagonal", "subject"];

export function Toggles() {
  const { show, toggle, setAll } = useUI();

  const Chip = ({ k }: { k: ToggleKey }) => (
    <button
      onClick={() => toggle(k)}
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        border: `1px solid ${show[k] ? "#60a5fa" : "#374151"}`,
        background: show[k] ? "rgba(96,165,250,.12)" : "#1f2937",
        color: "#e5e7eb",
        cursor: "pointer",
        fontSize: 13,
        textTransform: "capitalize",
      }}
      aria-pressed={show[k]}
    >
      {k}
    </button>
  );

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ROW.map((k) => (
          <Chip key={k} k={k} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ROW2.map((k) => (
          <Chip key={k} k={k} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setAll(true)}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #374151",
            background: "#1f2937",
            color: "#e5e7eb",
          }}
        >
          Show all
        </button>
        <button
          onClick={() => setAll(false)}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #374151",
            background: "#1f2937",
            color: "#e5e7eb",
          }}
        >
          Hide all
        </button>
      </div>
    </div>
  );
}
