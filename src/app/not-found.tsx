import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="chip chip-mono" style={{ color: "var(--accent)" }}>
        Status: 404 - signal lost
      </span>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">This page is off the map</h1>
      <p className="mt-3 max-w-md leading-relaxed" style={{ color: "var(--muted)" }}>
        The page you were looking for doesn&apos;t exist or has moved.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link className="btn btn-primary" href="/">
          Back home
        </Link>
        <Link className="btn btn-ghost" href="/projects">
          View projects
        </Link>
      </div>
    </main>
  );
}
