import { ImageResponse } from "next/og";

export const alt = "Alex Simpson — Security · Hardware · AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const domains = [
  { label: "Security", color: "#2bd4ee" },
  { label: "Hardware", color: "#f6a23c" },
  { label: "AI", color: "#b292ff" },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "76px",
          background: "linear-gradient(135deg, #05060c 0%, #0a0e18 55%, #05060c 100%)",
          color: "#f3f5fb",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: 18, height: 18, borderRadius: 999, background: "#6ea0ff" }} />
          <div style={{ fontSize: 26, letterSpacing: 6, color: "#aab2c6" }}>
            BERKELEY CS + DATA SCIENCE
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: 104, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>
            Alex Simpson
          </div>
          <div style={{ fontSize: 40, color: "#cfd4df" }}>
            Systems built from the board up.
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px" }}>
          {domains.map((domain) => (
            <div
              key={domain.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 22px",
                borderRadius: 999,
                border: `1px solid ${domain.color}`,
                color: domain.color,
                fontSize: 28,
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: 999, background: domain.color }} />
              {domain.label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
