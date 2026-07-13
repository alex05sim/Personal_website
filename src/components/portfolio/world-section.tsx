"use client";

import { Camera, CheckCircle2, Globe2, MapPin, Route, Send, UserRound, Users } from "lucide-react";
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

type VisitorRecommendation = {
  id?: string;
  visitorName: string;
  place: string;
  comment: string;
  x: number | null;
  y: number | null;
};

const starterRecommendations = (): VisitorRecommendation[] =>
  suggestedPlaces.map((place) => ({
    visitorName: "Community pick",
    place,
    comment: "",
    x: null,
    y: null,
  }));

export function WorldSection() {
  const [visitorName, setVisitorName] = useState("");
  const [place, setPlace] = useState("");
  const [comment, setComment] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
  const [recommendations, setRecommendations] = useState<VisitorRecommendation[]>(() => {
    if (typeof window === "undefined") {
      return starterRecommendations();
    }

    const saved = window.localStorage.getItem("portfolio-place-recommendations");

    if (!saved) {
      return starterRecommendations();
    }

    try {
      const cached = JSON.parse(saved) as unknown;
      if (!Array.isArray(cached) || !cached.every((item) => typeof item === "string")) {
        throw new Error("invalid cache");
      }
      return cached.map((item) => ({
        visitorName: "Community pick",
        place: item,
        comment: "",
        x: null,
        y: null,
      }));
    } catch {
      return starterRecommendations();
    }
  });

  function applyServerEntries(
    entries: Array<{
      id?: string;
      visitorName?: string;
      place: string;
      comment?: string;
      x: number | null;
      y: number | null;
    }>,
  ) {
    const normalized: VisitorRecommendation[] = entries.map((entry) => ({
      ...entry,
      visitorName: entry.visitorName?.trim() || "Visitor",
      comment: entry.comment ?? "",
    }));
    setRecommendations(
      normalized.length
        ? normalized.slice(0, 12)
        : starterRecommendations(),
    );
    setPlacedPins(
      entries
        .filter((entry) => typeof entry.x === "number" && typeof entry.y === "number")
        .slice(0, 40)
        .map((entry) => ({ label: entry.place, x: entry.x as number, y: entry.y as number })),
    );
    window.localStorage.setItem(
      "portfolio-place-recommendations",
      JSON.stringify(normalized.map((entry) => entry.place)),
    );
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
    const trimmedName = visitorName.trim();
    const trimmedPlace = place.trim();

    if (!trimmedName) {
      setFormStatus("Add your name (a first name is enough).");
      return;
    }
    if (!trimmedPlace) {
      setFormStatus("Add a place name.");
      return;
    }
    const trimmedComment = comment.trim();
    if (!trimmedComment) {
      setFormStatus("Add a short comment about why it is worth visiting.");
      return;
    }

    const pin = pendingPin;
    setSubmitting(true);
    setFormStatus("Saving suggestion…");

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorName: trimmedName,
          place: trimmedPlace,
          comment: trimmedComment,
          website: "",
          x: pin?.x ?? null,
          y: pin?.y ?? null,
        }),
      });

      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(failure?.error ?? "Could not save this suggestion.");
      }

      const data = await response.json();

      if (Array.isArray(data.items)) {
        applyServerEntries(data.items);
      }
      setPendingPin(null);
      setVisitorName("");
      setPlace("");
      setComment("");
      setFormStatus("Thanks — your recommendation is now on the map.");
    } catch (error) {
      setFormStatus(error instanceof Error ? error.message : "Could not save this suggestion.");
    } finally {
      setSubmitting(false);
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
            <label className="sr-only" htmlFor="visitor-name">
              Your name
            </label>
            <div className="recommendation-field">
              <UserRound aria-hidden="true" size={16} />
              <input
                autoComplete="name"
                id="visitor-name"
                maxLength={40}
                name="visitorName"
                onChange={(event) => setVisitorName(event.target.value)}
                placeholder="Your name"
                required
                value={visitorName}
              />
            </div>
            <label className="sr-only" htmlFor="place">
              Recommend a place
            </label>
            <div className="recommendation-field">
              <MapPin aria-hidden="true" size={16} />
              <input
                autoComplete="off"
                id="place"
                name="place"
                onChange={(event) => setPlace(event.target.value)}
                placeholder="City or place"
                maxLength={80}
                required
                value={place}
              />
            </div>
            <textarea
              aria-label="Comment about this place"
              maxLength={280}
              name="comment"
              onChange={(event) => setComment(event.target.value)}
              placeholder="Why should I visit? (280 characters max)"
              required
              rows={3}
              value={comment}
            />
            <input
              aria-hidden="true"
              autoComplete="off"
              className="recommendation-honeypot"
              name="website"
              tabIndex={-1}
            />
            <button aria-label="Submit recommendation" disabled={submitting} type="submit">
              <Send size={18} />
            </button>
          </form>
          <p className="recommendation-status" aria-live="polite">
            {formStatus}
          </p>
          <p className="recommendation-safety">
            First name is enough. Public posts are filtered for profanity, spam, links, and contact
            details.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {recommendations.map((recommendation, index) => (
              <span
                className="place-chip"
                key={recommendation.id ?? `${recommendation.place}-${index}`}
              >
                <MapPin size={14} />
                {recommendation.place}
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
                <div
                  className="others-row"
                  key={recommendation.id ?? `${recommendation.place}-${index}`}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="visitor-place-line">
                      <strong>{recommendation.place}</strong>
                      <span>by {recommendation.visitorName}</span>
                    </div>
                    {recommendation.comment ? <p>{recommendation.comment}</p> : null}
                  </div>
                  <em>
                    {placedPins.some((pin) => pin.label === recommendation.place)
                      ? "Pinned"
                      : "Suggested"}
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
            <div className="travel-list-head">
              <div>
                <span>Personal travel log</span>
                <h3>Places I&apos;ve been</h3>
              </div>
              <strong>
                <Route size={15} />
                {travelStops.length} stops
              </strong>
            </div>
            {travelStops.map((stop, index) => (
              <article className="travel-card" key={stop.place}>
                <div className="travel-photo">
                  <Camera size={20} />
                </div>
                <div>
                  <div className="travel-card-meta">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span className="visited-badge">
                      <CheckCircle2 size={12} /> Visited
                    </span>
                  </div>
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
