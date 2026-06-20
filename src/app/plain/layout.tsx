"use client";

import Link from "next/link";
import { useEffect } from "react";
import { profile } from "@/lib/portfolio-data";

export default function PlainLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add("plain-mode");
    return () => document.body.classList.remove("plain-mode");
  }, []);

  return (
    <div className="plain-overlay">
      <div className="plain-inner">
        <nav className="plain-nav">
          <span className="plain-nav-title">{profile.name}</span>
          <span className="plain-nav-sep">-</span>
          <Link href="/plain">home</Link>
          <span className="plain-nav-sep">|</span>
          <Link href="/plain/projects">projects</Link>
          <span className="plain-nav-sep">|</span>
          <Link href="/plain/experience">experience</Link>
          <span className="plain-nav-sep">|</span>
          <Link href="/plain/about">about</Link>
          <span className="plain-nav-sep">|</span>
          <a href={`mailto:${profile.email}`}>contact</a>
          <span className="plain-nav-sep">|</span>
          <Link href="/">&lt;- fancy version</Link>
        </nav>
        {children}
      </div>
    </div>
  );
}
