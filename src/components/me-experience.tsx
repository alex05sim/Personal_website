"use client";

import { Send, Sparkles } from "lucide-react";
import { type FormEvent, useState } from "react";
import { blackHoleQA, interests, weirdFaq, weirdFaqNote } from "@/lib/me-data";
import { FloatingTabs } from "./portfolio-experience";
import { Reveal, useHydratedReducedMotion } from "./portfolio/shared";
import { ScrambleText } from "./scramble-text";

/** The Q&A black hole: preloaded questions orbit the accretion disk; clicking
 *  one feeds it past the event horizon and the answer "radiates" back out.
 *  Visitors can also throw their own questions in (moderated, stored for Alex,
 *  never displayed publicly). Reduced motion gets a static question list. */
function BlackHoleQA() {
  const reduce = useHydratedReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fedIds, setFedIds] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const active = blackHoleQA.find((item) => item.id === activeId);

  const feed = (id: string) => {
    setFedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveId(id);
  };

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) {
      setStatus("Type a question first - the black hole doesn't accept vacuum.");
      return;
    }
    setSubmitting(true);
    setStatus("Crossing the event horizon…");
    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, website: "" }),
      });
      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(failure?.error ?? "The black hole rejected that one.");
      }
      setQuestion("");
      setStatus("Absorbed. Nothing escapes - except my reply, if it's a good one.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The black hole rejected that one.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section section-bordered bh-section" aria-label="Question and answer black hole">
      <div className="shell">
        <Reveal className="section-head">
          <p className="kicker">Q&A singularity</p>
          <ScrambleText
            as="h2"
            className="display text-4xl text-white sm:text-5xl"
            text="Ask the black hole."
          />
          <p className="lead">
            Preloaded questions orbit the disk - click one and it falls in; the answer radiates
            back out. Throw in your own and it reaches me directly.
          </p>
        </Reveal>

        {!reduce ? (
          <div className="bh-stage" aria-hidden="true">
            <div className="bh-disk" />
            <div className="bh-photon" />
            <div className="bh-core" />
            {blackHoleQA.map((item, index) => (
              <div
                className="bh-orbit"
                key={item.id}
                style={
                  {
                    "--t": `${26 + index * 6}s`,
                    "--d": `${(-(26 + index * 6) / blackHoleQA.length) * index}s`,
                    "--r": `${index % 2 === 0 ? 42 : 33}cqw`,
                  } as React.CSSProperties
                }
              >
                <button
                  className={`bh-q ${fedIds.includes(item.id) ? "is-fed" : ""} ${activeId === item.id ? "is-active" : ""}`}
                  onClick={() => feed(item.id)}
                  tabIndex={-1}
                  type="button"
                >
                  <span>{item.q}</span>
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="bh-index" role="tablist" aria-label="Questions">
          {blackHoleQA.map((item) => (
            <button
              key={item.id}
              className={`bh-index-q ${activeId === item.id ? "is-active" : ""}`}
              onClick={() => feed(item.id)}
              type="button"
            >
              {item.q}
            </button>
          ))}
        </div>

        {active ? (
          <div className="bh-answer" role="region" aria-live="polite">
            <p className="bh-answer-kicker">
              <Sparkles size={13} />
              Hawking radiation // decoded
            </p>
            <h3>{active.q}</h3>
            <p>{active.a}</p>
          </div>
        ) : null}

        <form className="bh-form" onSubmit={submitQuestion}>
          <label className="sr-only" htmlFor="bh-question">
            Ask your own question
          </label>
          <input
            autoComplete="off"
            id="bh-question"
            maxLength={200}
            name="question"
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Throw your own question in…"
            value={question}
          />
          <input
            aria-hidden="true"
            autoComplete="off"
            className="recommendation-honeypot"
            name="website"
            tabIndex={-1}
          />
          <button aria-label="Submit question" disabled={submitting} type="submit">
            <Send size={16} />
          </button>
        </form>
        <p className="bh-status" aria-live="polite">
          {status}
        </p>
        <p className="bh-note">
          Questions cross the event horizon and reach me directly - they aren&apos;t shown
          publicly. Good ones get added to the disk.
        </p>
      </div>
    </section>
  );
}

export function MeExperience() {
  return (
    <main className="relative z-10 min-h-screen">
      <FloatingTabs />

      <section className="section pt-28 sm:pt-36">
        <div className="shell">
          <Reveal className="section-head">
            <p className="kicker">Off duty</p>
            <ScrambleText
              as="h1"
              className="display text-5xl text-white sm:text-6xl"
              text="The rest of me."
            />
            <p className="lead">
              No threat models here. This is the part of the site for interests, obsessions, and
              a black hole that takes questions - because if you commit to a space theme, you
              commit all the way.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section section-bordered" aria-label="Interests">
        <div className="shell">
          <Reveal className="section-head">
            <p className="kicker">Interests</p>
            <ScrambleText
              as="h2"
              className="display text-4xl text-white sm:text-5xl"
              text="When the laptop closes."
            />
          </Reveal>
          <div className="me-grid mt-12">
            {interests.map((interest, index) => {
              const Icon = interest.icon;
              return (
                <Reveal key={interest.title} delay={index * 0.06}>
                  <article className="card me-card">
                    <Icon size={20} />
                    <h3>{interest.title}</h3>
                    <p>{interest.blurb}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <BlackHoleQA />

      <section className="section section-bordered" aria-label="Deep-cut FAQ">
        <div className="shell">
          <Reveal className="section-head">
            <p className="kicker">Deep-cut FAQ</p>
            <ScrambleText
              as="h2"
              className="display text-4xl text-white sm:text-5xl"
              text="The interview easter egg."
            />
            <p className="lead">{weirdFaqNote}</p>
          </Reveal>
          <dl className="me-faq mt-12">
            {weirdFaq.map((item) => (
              <div className="me-faq-row" key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  );
}
