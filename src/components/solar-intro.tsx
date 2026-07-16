"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { ScrambleText } from "./scramble-text";
import { useHydratedReducedMotion } from "./portfolio/shared";

const POINTS = [
  { label: "01", title: "Align the record", tag: "14 cycles of sunspot groups, one shared clock" },
  { label: "02", title: "Fit the skeleton", tag: "One number - amplitude - rebuilds a cycle's wing" },
  { label: "03", title: "Learn the residual", tag: "Score-based diffusion on what the fit misses" },
];

/** Real solar indices from NOAA SWPC (monthly observed values). Falls back to
 *  recent typical numbers if the fetch fails — never fabricated jitter. */
function SolarConsole() {
  const [data, setData] = useState<{ ssn: number; flux: number; live: boolean }>({
    ssn: 118,
    flux: 146,
    live: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json", {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((rows: Array<Record<string, unknown>>) => {
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return;
        const last = rows[rows.length - 1];
        const ssn = Number(last["ssn"]);
        const flux = Number(last["f10.7"] ?? last["f10_7"] ?? last["smoothed_f10.7"]);
        if (Number.isFinite(ssn) && Number.isFinite(flux) && ssn >= 0 && flux > 0) {
          setData({ ssn: Math.round(ssn), flux: Math.round(flux), live: true });
        }
      })
      .catch(() => {
        /* keep the fallback values */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="solar-console">
      <div className="solar-console-head">
        <span>{data.live ? "NOAA SWPC · latest monthly" : "Recent observed values"}</span>
        <strong>Cycle 25</strong>
      </div>
      <div className="solar-tele">
        <span>Sunspot №</span>
        <b>{data.ssn}</b>
        <span>F10.7 flux</span>
        <b>{data.flux} sfu</b>
        <span>Phase</span>
        <b className="solar-tele-live">
          <i aria-hidden="true" />
          DECLINING FROM MAX
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
        <h2 className="solar-title">READING THE SUN&apos;S CYCLE</h2>
        <p className="solar-lead">
          A generative model of the Sun&rsquo;s butterfly diagram — a physically motivated classical
          model rebuilds each cycle&rsquo;s sunspot wing from its amplitude alone, and a diffusion
          model learns the noisy structure the smooth fit leaves behind.
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

        <SolarConsole />

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
