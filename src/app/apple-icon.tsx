import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05060c",
        }}
      >
        <div style={{ width: 96, height: 96, borderRadius: 999, background: "#6ea0ff" }} />
      </div>
    ),
    { ...size },
  );
}
