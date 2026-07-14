"use client";

import {
  Camera,
  CheckCircle2,
  Globe2,
  MapPin,
  Maximize2,
  Route,
  Send,
  UserRound,
  Users,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { suggestedPlaces, travelStops } from "@/lib/portfolio-data";
import { CaliforniaSky } from "../california-sky";
import { Reveal } from "./shared";

// Defer the globe's three.js bundle until the World section actually renders it,
// so the /world route's first paint isn't blocked on loading three.
const TravelGlobe = dynamic(() => import("../travel-globe").then((m) => m.TravelGlobe), {
  ssr: false,
});

type GlobeFocus = { lat: number; lon: number; seq: number };
type GlobePin = { lat: number; lon: number };

const globeStops = travelStops.map((stop) => ({
  place: stop.place,
  lat: stop.lat,
  lon: stop.lon,
  home: stop.home,
}));

type VisitorRecommendation = {
  id?: string;
  visitorName: string;
  place: string;
  comment: string;
  lat: number | null;
  lon: number | null;
};

const starterRecommendations = (): VisitorRecommendation[] =>
  suggestedPlaces.map((place) => ({
    visitorName: "Community pick",
    place,
    comment: "",
    lat: null,
    lon: null,
  }));

/** A travel-log photo that gracefully falls back to the camera placeholder
 *  until the image file exists under public/travel/. Once loaded it gains an
 *  enlarge button (the card itself flies the globe, so zoom is its own hit). */
function TravelPhoto({ src, alt, onZoom }: { src?: string; alt: string; onZoom?: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <div className={`travel-photo ${loaded ? "has-photo" : ""}`}>
      {!loaded ? <Camera size={20} /> : null}
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          style={{ display: loaded ? "block" : "none" }}
        />
      ) : null}
      {loaded && onZoom ? (
        <button
          aria-label={`Enlarge photo of ${alt}`}
          className="travel-photo-zoom"
          onClick={(event) => {
            event.stopPropagation();
            onZoom();
          }}
          type="button"
        >
          <Maximize2 size={13} />
        </button>
      ) : null}
    </div>
  );
}

export function WorldSection() {
  const [visitorName, setVisitorName] = useState("");
  const [place, setPlace] = useState("");
  const [comment, setComment] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [globeFocus, setGlobeFocus] = useState<GlobeFocus | null>(null);
  const [activeStop, setActiveStop] = useState<string | null>(null);
  const [zoomPhoto, setZoomPhoto] = useState<{ src: string; caption: string } | null>(null);
  const [iss, setIss] = useState<{ lat: number; lon: number } | null | undefined>(undefined);
  const [pendingPin, setPendingPin] = useState<GlobePin | null>(null);

  useEffect(() => {
    if (!zoomPhoto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomPhoto(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [zoomPhoto]);
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
        lat: null,
        lon: null,
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
      lat?: number | null;
      lon?: number | null;
    }>,
  ) {
    const normalized: VisitorRecommendation[] = entries.map((entry) => ({
      id: entry.id,
      place: entry.place,
      visitorName: entry.visitorName?.trim() || "Visitor",
      comment: entry.comment ?? "",
      lat: typeof entry.lat === "number" ? entry.lat : null,
      lon: typeof entry.lon === "number" ? entry.lon : null,
    }));
    setRecommendations(
      normalized.length
        ? normalized.slice(0, 12)
        : starterRecommendations(),
    );
    window.localStorage.setItem(
      "portfolio-place-recommendations",
      JSON.stringify(normalized.map((entry) => entry.place)),
    );
  }

  const visitorPins = recommendations
    .filter((entry): entry is VisitorRecommendation & GlobePin =>
      typeof entry.lat === "number" && typeof entry.lon === "number",
    )
    .slice(0, 40)
    .map((entry) => ({ place: entry.place, lat: entry.lat, lon: entry.lon }));

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
          lat: pin?.lat ?? null,
          lon: pin?.lon ?? null,
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
                  <em>{typeof recommendation.lat === "number" ? "Pinned" : "Suggested"}</em>
                </div>
              ))}
            </div>
          </div>

          <CaliforniaSky />
        </Reveal>

        <div className="world-console">
          <div className="world-orb world-orb-3d">
            <TravelGlobe
              stops={globeStops}
              focus={globeFocus}
              visitorPins={visitorPins}
              pendingPin={pendingPin}
              onGlobePick={(pin) => setPendingPin(pin)}
              onIssUpdate={setIss}
            />
            <span className="world-hint">
              {pendingPin ? (
                <>
                  Pin staged at {Math.abs(pendingPin.lat).toFixed(1)}°
                  {pendingPin.lat >= 0 ? "N" : "S"} / {Math.abs(pendingPin.lon).toFixed(1)}°
                  {pendingPin.lon >= 0 ? "E" : "W"}
                  <button
                    aria-label="Clear staged pin"
                    className="world-hint-clear"
                    onClick={() => setPendingPin(null)}
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                "Drag to spin · click to drop a pin"
              )}
            </span>
          </div>

          <div className="world-readout" aria-hidden="true">
            <span>Interactive globe</span>
            <strong>{visitorPins.length + travelStops.length} live markers</strong>
          </div>
          <div className="world-readout world-readout-iss">
            <span>ISS ground track</span>
            <strong>
              <span className="live-dot" aria-hidden="true" />
              {iss === undefined
                ? "Acquiring signal…"
                : iss === null
                  ? "Signal lost"
                  : `${Math.abs(iss.lat).toFixed(1)}°${iss.lat >= 0 ? "N" : "S"} / ${Math.abs(iss.lon).toFixed(1)}°${iss.lon >= 0 ? "E" : "W"}`}
            </strong>
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
            <p className="travel-hint">Click a stop to swing the globe to it.</p>
            {travelStops.map((stop, index) => {
              const flyTo = () => {
                setActiveStop(stop.place);
                setGlobeFocus((prev) => ({
                  lat: stop.lat,
                  lon: stop.lon,
                  seq: (prev?.seq ?? 0) + 1,
                }));
              };
              return (
                <div
                  aria-label={`Show ${stop.place} on the globe`}
                  className={`travel-card ${activeStop === stop.place ? "is-active" : ""}`}
                  key={stop.place}
                  onClick={flyTo}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      flyTo();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <TravelPhoto
                    src={stop.photoHref}
                    alt={`Photo from ${stop.place}`}
                    onZoom={
                      stop.photoHref
                        ? () =>
                            setZoomPhoto({
                              src: stop.photoHref as string,
                              caption: `${stop.place} — ${stop.note}`,
                            })
                        : undefined
                    }
                  />
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
                    <span className="travel-fly" aria-hidden="true">
                      {activeStop === stop.place ? "On the globe ·" : "Fly the globe here →"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {zoomPhoto ? (
            <div
              className="research-lightbox"
              role="dialog"
              aria-label="Enlarged travel photo"
              onClick={() => setZoomPhoto(null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={zoomPhoto.src} alt={zoomPhoto.caption} />
              <p>{zoomPhoto.caption}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
