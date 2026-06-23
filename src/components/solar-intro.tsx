"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { ScrambleText } from "./scramble-text";
import { useHydratedReducedMotion } from "./portfolio/shared";

const POINTS = [
  { label: "01", title: "Ingest the record", tag: "Decades of sunspot + F10.7 series" },
  { label: "02", title: "Model the cycle", tag: "Features + regression / sequence models" },
  { label: "03", title: "Forecast activity", tag: "Where the ~11-yr cycle goes next" },
];

function SolarConsole({ reduce }: { reduce: boolean }) {
  const [ssn, setSsn] = useState(118);
  const [flux, setFlux] = useState(146);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setSsn((v) => Math.max(70, Math.min(190, v + Math.round((Math.random() - 0.5) * 9))));
      setFlux((v) => Math.max(90, Math.min(210, v + Math.round((Math.random() - 0.5) * 7))));
    }, 1300);
    return () => window.clearInterval(id);
  }, [reduce]);
  return (
    <div className="solar-console">
      <div className="solar-console-head">
        <span>Observation feed</span>
        <strong>Cycle 25</strong>
      </div>
      <div className="solar-tele">
        <span>Sunspot №</span>
        <b>{ssn}</b>
        <span>F10.7 flux</span>
        <b>{flux} sfu</b>
        <span>Phase</span>
        <b className="solar-tele-live">
          <i aria-hidden="true" />
          {reduce ? "DECLINING" : "NEAR MAXIMUM"}
        </b>
      </div>
    </div>
  );
}

export function SolarIntro() {
  const reduce = useHydratedReducedMotion();

  return (
    <section className="solar" aria-label="Solar cycle research intro">
      {/* the live 3D sun is mounted fixed (SolarPin, in ProjectDetail) so it can
          persist on scroll — on reduced motion it isn't rendered at all, so this
          section keeps the static-image fallback for that case only. */}
      {reduce ? (
        <div className="solar-stage" aria-hidden="true">
          <div className="solar-glow" />
          <div className="solar-sun">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="solar-photo" src="/sun.webp" alt="" draggable={false} />
          </div>
        </div>
      ) : null}

      <div className="solar-textscrim" aria-hidden="true" />

      <div className="solar-brief">
        <p className="solar-kicker">
          <ScrambleText as="span" text="SOLAR OBSERVATION // CYCLE 25" duration={1500} />
        </p>
        <ScrambleText as="h2" className="solar-title" text="READING THE SUN'S CYCLE" duration={1400} />
        <p className="solar-lead">
          Forecasting solar activity from decades of noisy, only-roughly-periodic time-series — sunspot
          counts and F10.7 flux, modeled to predict where the ~11-year cycle goes next.
        </p>

        <div className="solar-obj">
          <p className="solar-obj-label">Approach</p>
          {POINTS.map((p) => (
            <div className="solar-step" key={p.label}>
              <span>{p.label}</span>
              <strong>{p.title}</strong>
              <em>{p.tag}</em>
            </div>
          ))}
        </div>

        <SolarConsole reduce={reduce} />

        <a className="solar-cta" href="#case-study">
          Open the analysis
          <ArrowRight size={16} />
        </a>

        <p className="solar-credit">
          3D model: &ldquo;Solar Prominence&rdquo; by Tycho Magnetic Anomaly, via Sketchfab, licensed{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
            CC BY 4.0
          </a>
          .
        </p>
      </div>
    </section>
  );
}
