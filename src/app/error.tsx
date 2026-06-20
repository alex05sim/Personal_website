"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-segment error boundary. Catches render/runtime errors thrown anywhere in
 * the page tree below the root layout and shows a themed recovery screen instead
 * of a blank page. Wire `error.digest` to a real logger in production.
 */
export default function Error({
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
    <main
      className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center"
    >
      <span className="chip chip-mono" style={{ color: "var(--accent)" }}>
        Status: System fault
      </span>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">Something went sideways</h1>
      <p className="mt-3 max-w-md leading-relaxed" style={{ color: "var(--muted)" }}>
        An unexpected error interrupted this page. You can retry, or head back to the start.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link className="btn btn-ghost" href="/">
          Go home
        </Link>
      </div>
      {error?.digest ? (
        <p
          className="mt-6"
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "0.7rem",
            color: "var(--muted-2)",
          }}
        >
          ref: {error.digest}
        </p>
      ) : null}
    </main>
  );
}
