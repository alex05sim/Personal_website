"use client";

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
          <span className="plain-nav-sep">—</span>
          <a href="/plain">home</a>
          <span className="plain-nav-sep">|</span>
          <a href="/plain/projects">projects</a>
          <span className="plain-nav-sep">|</span>
          <a href="/plain/experience">experience</a>
          <span className="plain-nav-sep">|</span>
          <a href="/plain/about">about</a>
          <span className="plain-nav-sep">|</span>
          <a href={`mailto:${profile.email}`}>contact</a>
          <span className="plain-nav-sep">|</span>
          <a href="/">← fancy version</a>
        </nav>
        {children}
      </div>
    </div>
  );
}
