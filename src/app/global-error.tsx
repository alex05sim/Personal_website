"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for failures in the root layout itself. It replaces the
 * entire document, so globals.css is NOT loaded here — all styles are inlined and
 * self-contained on purpose.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "2rem",
          textAlign: "center",
          background: "#05060c",
          color: "#f3f5fb",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        }}
      >
        <p
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "0.72rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6ea0ff",
          }}
        >
          ● Critical fault
        </p>
        <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 600 }}>The site failed to load</h1>
        <p style={{ margin: 0, maxWidth: "28rem", lineHeight: 1.6, color: "#aab2c6" }}>
          A fault occurred before the page could render. Please reload.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "0.75rem",
            minHeight: "3rem",
            padding: "0 1.4rem",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: 600,
            background: "linear-gradient(180deg, #ffffff, #d7dbe4)",
            color: "#06070d",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
