import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 15,
            height: 15,
            borderRadius: 999,
            background: "#6ea0ff",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
