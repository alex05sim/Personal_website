"use client";

import { ArrowUp } from "lucide-react";
import Link from "next/link";
import { navigationTabs, profile, socials } from "@/lib/portfolio-data";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-grid">
          <div className="footer-brand-col">
            <Link href="/" className="footer-brand">
              <span className="dot" aria-hidden="true" />
              {profile.name}
            </Link>
            <p className="footer-tag">{profile.tagline}</p>
          </div>

          <nav className="footer-nav" aria-label="Footer">
            <span className="footer-label">Navigate</span>
            {navigationTabs.map((tab) => (
              <Link key={tab.href} href={tab.href}>
                {tab.label}
              </Link>
            ))}
          </nav>

          <div className="footer-social">
            <span className="footer-label">Elsewhere</span>
            {socials.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.href.startsWith("http") ? "_blank" : undefined}
                  rel={social.href.startsWith("http") ? "noreferrer" : undefined}
                >
                  <Icon size={15} />
                  {social.label}
                </a>
              );
            })}
          </div>
        </div>

        <div className="footer-bottom">
          <span>(c) {new Date().getFullYear()} {profile.name}</span>
          <span className="footer-built">
            Next.js - R3F - Tailwind - Imagery: NASA &amp; Solar System Scope
          </span>
          <button
            type="button"
            className="footer-top-link"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Back to top
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  );
}
