"use client";

import { Camera, Globe2, MapPin, Send, Users } from "lucide-react";
import dynamic from "next/dynamic";
import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  useEffect,
  useState,
} from "react";
import { suggestedPlaces, travelStops } from "@/lib/portfolio-data";
import { CaliforniaSky } from "../california-sky";
import { Reveal } from "./shared";

// Defer the globe's three.js bundle until the World section actually renders it,
// so the /world route's first paint isn't blocked on loading three.
const TravelGlobe = dynamic(() => import("../travel-globe").then((m) => m.TravelGlobe), {
  ssr: false,
});

export function WorldSection() {
  const [place, setPlace] = useState("");
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [placedPins, setPlacedPins] = useState<Array<{ label: string; x: number; y: number }>>(
    () => {
      if (typeof window === "undefined") {
        return [];
      }

      const saved = window.localStorage.getItem("portfolio-world-pins");

      if (!saved) {
        return [];
      }

      try {
        return JSON.parse(saved) as Array<{ label: string; x: number; y: number }>;
      } catch {
        return [];
      }
    },
  );
  const [recommendations, setRecommendations] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return suggestedPlaces;
    }

    const saved = window.localStorage.getItem("portfolio-place-recommendations");

    if (!saved) {
      return suggestedPlaces;
    }

    try {
      return JSON.parse(saved) as string[];
    } catch {
      return suggestedPlaces;
    }
  });

  function applyServerEntries(
    entries: Array<{ place: string; x: number | null; y: number | null }>,
  ) {
    const places = entries.map((entry) => entry.place);
    setRecommendations(places.length ? places.slice(0, 12) : suggestedPlaces);
    setPlacedPins(
      entries
        .filter((entry) => typeof entry.x === "number" && typeof entry.y === "number")
        .slice(0, 40)
        .map((entry) => ({ label: entry.place, x: entry.x as number, y: entry.y as number })),
    );
    window.localStorage.setItem("portfolio-place-recommendations", JSON.stringify(places));
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/recommendations")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("offline"))))
      .then((data) => {
        if (!cancelled && Array.isArray(data.items) && data.items.length > 0) {
          applyServerEntries(data.items);
        }
      })
      .catch(() => {
        /* keep cached / default recommendations */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitRecommendation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedPlace = place.trim();

    if (!trimmedPlace) {
      return;
    }

    const pin = pendingPin;
    const optimisticRecommendations = [trimmedPlace, ...recommendations].slice(0, 12);
    const optimisticPins = pin
      ? [{ label: trimmedPlace, x: pin.x, y: pin.y }, ...placedPins].slice(0, 40)
      : placedPins;

    setRecommendations(optimisticRecommendations);
    setPlacedPins(optimisticPins);
    setPendingPin(null);
    setPlace("");

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place: trimmedPlace, x: pin?.x ?? null, y: pin?.y ?? null }),
      });

      if (!response.ok) {
        throw new Error("save failed");
      }

      const data = await response.json();

      if (Array.isArray(data.items)) {
        applyServerEntries(data.items);
      }
    } catch {
      window.localStorage.setItem(
        "portfolio-place-recommendations",
        JSON.stringify(optimisticRecommendations),
      );
      window.localStorage.setItem("portfolio-world-pins", JSON.stringify(optimisticPins));
    }
  }

  function placePin(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const dx = x - 50;
    const dy = y - 50;

    if (dx * dx + dy * dy > 46 * 46) {
      return;
    }

    setPendingPin({ x, y });
  }

  function placeKeyboardPin(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    setPendingPin({ x: 50, y: 50 });
  }

  return (
    <section id="world" className="section world">
      <div className="shell grid gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <Reveal>
          <p className="kicker">
            <Globe2 size={14} className="-ml-1" />
            World log
          </p>
          <h2 className="display mt-5 text-4xl text-white sm:text-5xl">Places mapped like signals.</h2>
          <p className="lead mt-6 max-w-xl">
            Away from the lab I&apos;m usually chasing roads, photos, and a good horizon. Spin the
            globe, drop a pin, and tell me where I should point the camera next.
          </p>

          <form className="recommendation-form mt-10" onSubmit={submitRecommendation}>
            <label className="sr-only" htmlFor="place">
              Recommend a place
            </label>
            <input
              id="place"
              name="place"
              onChange={(event) => setPlace(event.target.value)}
              placeholder="Recommend a place"
              value={place}
            />
            <button aria-label="Submit recommendation" type="submit">
              <Send size={18} />
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            {recommendations.map((recommendation) => (
              <span className="place-chip" key={recommendation}>
                <MapPin size={14} />
                {recommendation}
              </span>
            ))}
          </div>

          <div className="others-feed mt-8">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <Users size={16} />
              Where visitors want me next
              <span className="live-dot" aria-hidden="true" />
            </div>
            <div className="mt-2">
              {recommendations.slice(0, 5).map((recommendation, index) => (
                <div className="others-row" key={`${recommendation}-${index}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{recommendation}</strong>
                  <em>
                    {placedPins.some((pin) => pin.label === recommendation) ? "Pinned" : "Suggested"}
                  </em>
                </div>
              ))}
            </div>
          </div>

          <CaliforniaSky />
        </Reveal>

        <div className="world-console">
          <div
            aria-label="Spin globe and click to place recommendation marker"
            className="world-orb world-orb-3d"
            onClick={placePin}
            onKeyDown={placeKeyboardPin}
            role="button"
            tabIndex={0}
          >
            <TravelGlobe />
            <span className="world-pin pin-one" />
            <span className="world-pin pin-two" />
            <span className="world-pin pin-three" />
            {placedPins.map((pin) => (
              <span
                className="world-pin user-pin"
                key={`${pin.label}-${pin.x}-${pin.y}`}
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                title={pin.label}
              />
            ))}
            {pendingPin ? (
              <span
                className="world-pin pending-pin"
                style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%` }}
              />
            ) : null}
            <span className="world-hint">{pendingPin ? "Marker staged" : "Click to place"}</span>
          </div>

          <div className="world-readout" aria-hidden="true">
            <span>Interactive globe</span>
            <strong>{placedPins.length + 3} visible markers</strong>
          </div>

          <div className="travel-list">
            {travelStops.map((stop, index) => (
              <article className="travel-card" key={stop.place}>
                <div className="travel-photo">
                  <Camera size={20} />
                </div>
                <div>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{stop.place}</h3>
                  <p>{stop.note}</p>
                  <em>{stop.coordinates}</em>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
