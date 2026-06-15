"use client";

import { Moon, SunMedium } from "lucide-react";
import SunCalc from "suncalc";
import { useEffect, useMemo, useState } from "react";

const CALIFORNIA_VIEWPOINT = {
  label: "California viewpoint",
  latitude: 36.7783,
  longitude: -119.4179,
  timeZone: "America/Los_Angeles",
};

function degrees(value: number) {
  return Math.round((value * 180) / Math.PI);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: CALIFORNIA_VIEWPOINT.timeZone,
  }).format(date);
}

function formatRiseSet(date?: Date) {
  if (!date) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CALIFORNIA_VIEWPOINT.timeZone,
  }).format(date);
}

function phaseName(phase: number) {
  if (phase < 0.03 || phase > 0.97) return "New moon";
  if (phase < 0.22) return "Waxing crescent";
  if (phase < 0.28) return "First quarter";
  if (phase < 0.47) return "Waxing gibbous";
  if (phase < 0.53) return "Full moon";
  if (phase < 0.72) return "Waning gibbous";
  if (phase < 0.78) return "Last quarter";

  return "Waning crescent";
}

function orbitStyle(altitude: number, azimuth: number) {
  const visibleAltitude = Math.max(-18, Math.min(72, degrees(altitude)));
  const x = 50 + Math.sin(azimuth) * 38;
  const y = 78 - ((visibleAltitude + 18) / 90) * 62;

  return {
    left: `${Math.max(8, Math.min(92, x))}%`,
    top: `${Math.max(12, Math.min(86, y))}%`,
  };
}

export function CaliforniaSky() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setNow(new Date()), 0);
    const interval = window.setInterval(() => setNow(new Date()), 1000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  const sky = useMemo(() => {
    if (!now) {
      return null;
    }

    const sunPosition = SunCalc.getPosition(
      now,
      CALIFORNIA_VIEWPOINT.latitude,
      CALIFORNIA_VIEWPOINT.longitude,
    );
    const moonPosition = SunCalc.getMoonPosition(
      now,
      CALIFORNIA_VIEWPOINT.latitude,
      CALIFORNIA_VIEWPOINT.longitude,
    );
    const sunTimes = SunCalc.getTimes(
      now,
      CALIFORNIA_VIEWPOINT.latitude,
      CALIFORNIA_VIEWPOINT.longitude,
    );
    const moonTimes = SunCalc.getMoonTimes(
      now,
      CALIFORNIA_VIEWPOINT.latitude,
      CALIFORNIA_VIEWPOINT.longitude,
    );
    const moonIllumination = SunCalc.getMoonIllumination(now);

    return {
      moon: {
        altitude: degrees(moonPosition.altitude),
        azimuth: degrees(moonPosition.azimuth),
        phase: phaseName(moonIllumination.phase),
        style: orbitStyle(moonPosition.altitude, moonPosition.azimuth),
      },
      moonTimes,
      sun: {
        altitude: degrees(sunPosition.altitude),
        azimuth: degrees(sunPosition.azimuth),
        style: orbitStyle(sunPosition.altitude, sunPosition.azimuth),
      },
      sunTimes,
    };
  }, [now]);

  if (!now || !sky) {
    return (
      <section className="california-sky" aria-label="Live California sun and moon">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Live sky / California
          </p>
          <h3>--:--:--</h3>
          <p>
            {CALIFORNIA_VIEWPOINT.label}: {CALIFORNIA_VIEWPOINT.latitude.toFixed(2)}N /{" "}
            {Math.abs(CALIFORNIA_VIEWPOINT.longitude).toFixed(2)}W
          </p>
        </div>

        <div className="sky-stage">
          <div className="sky-arc" />
          <div className="sky-horizon" />
        </div>

        <div className="sky-readouts">
          <div>
            <span>Sun</span>
            <strong>-- deg alt</strong>
            <em>Rise -- / Set --</em>
          </div>
          <div>
            <span>Moon</span>
            <strong>--</strong>
            <em>Rise -- / Set --</em>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="california-sky" aria-label="Live California sun and moon">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Live sky / California
        </p>
        <h3>{formatTime(now)}</h3>
        <p>
          {CALIFORNIA_VIEWPOINT.label}: {CALIFORNIA_VIEWPOINT.latitude.toFixed(2)}N /{" "}
          {Math.abs(CALIFORNIA_VIEWPOINT.longitude).toFixed(2)}W
        </p>
      </div>

      <div className="sky-stage">
        <div className="sky-arc" />
        <span className="sky-body sky-sun" style={sky.sun.style}>
          <SunMedium size={22} />
        </span>
        <span className="sky-body sky-moon" style={sky.moon.style}>
          <Moon size={18} />
        </span>
        <div className="sky-horizon" />
      </div>

      <div className="sky-readouts">
        <div>
          <span>Sun</span>
          <strong>{sky.sun.altitude} deg alt</strong>
          <em>Rise {formatRiseSet(sky.sunTimes.sunrise)} / Set {formatRiseSet(sky.sunTimes.sunset)}</em>
        </div>
        <div>
          <span>Moon</span>
          <strong>{sky.moon.phase}</strong>
          <em>Rise {formatRiseSet(sky.moonTimes.rise)} / Set {formatRiseSet(sky.moonTimes.set)}</em>
        </div>
      </div>
    </section>
  );
}
