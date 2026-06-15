"use client";

import {
  ArrowUpRight,
  Camera,
  ExternalLink,
  Globe2,
  GraduationCap,
  MapPin,
  RotateCcw,
  Search,
  Send,
  Swords,
  Users,
} from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { usePathname } from "next/navigation";
import {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  domainKey,
  domains,
  education,
  experience,
  featuredProjects,
  navigationTabs,
  profile,
  skills,
  socials,
  suggestedPlaces,
  travelStops,
} from "@/lib/portfolio-data";
import { CaliforniaSky } from "./california-sky";
import { CountUp, TiltCard } from "./interactions";
import { ScrambleText } from "./scramble-text";
import { SpaceHero } from "./space-hero";
import { TravelGlobe } from "./travel-globe";

function useHydratedReducedMotion() {
  const preference = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setHydrated(true), 0);

    return () => window.clearTimeout(timer);
  }, []);

  return hydrated ? Boolean(preference) : false;
}

function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduceMotion = useHydratedReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y, filter: "blur(4px)" }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function FloatingTabs() {
  const pathname = usePathname();
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.08, 0.28], [1, 0.92, 0.66]);
  const y = useTransform(scrollYProgress, [0, 0.16], [0, -8]);
  const blur = useTransform(scrollYProgress, [0, 0.16], ["blur(22px)", "blur(16px)"]);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Scroll-spy: highlight Work / Contact tabs as their sections pass center.
  useEffect(() => {
    if (pathname !== "/") {
      setActiveSection(null);
      return;
    }

    const ids = ["domains", "work", "experience", "contact"];
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.2, 0.5, 1] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  const isTabActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" && (activeSection === null || activeSection === "domains");
    }

    if (href === "/#work") {
      return pathname === "/" && (activeSection === "work" || activeSection === "experience");
    }

    if (href === "/#contact") {
      return pathname === "/" && activeSection === "contact";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <motion.nav
      aria-label="Primary"
      className="nav-shell fixed inset-x-0 top-0 z-50"
      style={{ backdropFilter: blur, opacity, y }}
    >
      <div className="nav-inner shell flex h-14 items-center gap-1 overflow-x-auto">
        <a className="nav-brand" href="/">
          <span className="dot" aria-hidden="true" />
          {profile.name}
        </a>
        {navigationTabs.map((tab) => {
          const active = isTabActive(tab.href);

          return (
            <a
              aria-current={active ? "page" : undefined}
              className={`nav-tab ${active ? "nav-tab-active" : ""}`}
              href={tab.href}
              key={tab.href}
            >
              {tab.label}
            </a>
          );
        })}
        <button
          type="button"
          className="cmdk-trigger ml-2 hidden sm:inline-flex"
          onClick={() => window.dispatchEvent(new Event("cmdk:open"))}
          aria-label="Open command menu"
        >
          <Search size={13} />
          <kbd>⌘K</kbd>
        </button>
      </div>
    </motion.nav>
  );
}

function Chip({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return <span className={`chip ${mono ? "chip-mono" : ""}`}>{children}</span>;
}

const tickerItems = [
  "Python",
  "C",
  "Go",
  "PyTorch · CUDA",
  "CuPy",
  "NumPy",
  "KiCad",
  "ESP32-S3",
  "LoRa",
  "AES · HMAC",
  "RISC-V",
  "scikit-learn",
  "Verlet integration",
  "Docker",
  "Kubernetes",
  "Linux",
];

function Ticker() {
  const loop = [...tickerItems, ...tickerItems];

  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {loop.map((item, index) => (
          <span className="ticker-item" key={`${item}-${index}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

type Stat = {
  label: string;
  accent?: boolean;
  value?: string;
  count?: { value: number; decimals?: number; prefix?: string; suffix?: string };
};

const stats: Stat[] = [
  { count: { value: 3.78, decimals: 2 }, label: "GPA · UC Berkeley" },
  { value: "’28", label: "Expected graduation" },
  { count: { value: 40, prefix: "~", suffix: "%" }, label: "GPU speedup (CuPy)", accent: true },
  { value: "TS/SCI", label: "Clearance eligible" },
];

function StatsStrip() {
  return (
    <section className="section-bordered">
      <div className="shell py-16">
        <Reveal className="stats">
          {stats.map((stat) => {
            const inner = stat.count ? (
              <CountUp
                value={stat.count.value}
                decimals={stat.count.decimals ?? 0}
                prefix={stat.count.prefix ?? ""}
                suffix={stat.count.suffix ?? ""}
              />
            ) : (
              stat.value
            );

            return (
              <div className="stat" key={stat.label}>
                <div className="num">{stat.accent ? <em>{inner}</em> : inner}</div>
                <div className="lbl">{stat.label}</div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

const principles = [
  {
    title: "Correctness over flash",
    body: "I gravitate toward problems where being roughly right isn't enough — cryptography, embedded firmware, numerical methods. The interesting part is the failure mode.",
  },
  {
    title: "From the board up",
    body: "Comfortable across the whole stack — PCB and firmware, systems and security, models and the GPUs they run on — so I can follow a problem wherever it goes.",
  },
  {
    title: "Measure, then claim",
    body: "Benchmarks, energy-conservation checks, threat models. I'd rather show the evidence than reach for an adjective.",
  },
];

function ApproachSection() {
  return (
    <section className="section section-bordered">
      <div className="shell">
        <Reveal className="section-head">
          <p className="kicker">How I work</p>
          <ScrambleText
            as="h2"
            className="display text-4xl text-white sm:text-5xl"
            text="Built to be trusted."
          />
        </Reveal>
        <div className="principles mt-12">
          {principles.map((principle, index) => (
            <Reveal key={principle.title} delay={index * 0.08}>
              <article className="card principle">
                <span className="n">0{index + 1}</span>
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function DomainsSection() {
  return (
    <section id="domains" className="section section-bordered">
      <div className="shell">
        <Reveal className="section-head">
          <p className="kicker">What I build</p>
          <ScrambleText
            as="h2"
            className="display text-4xl text-white sm:text-5xl"
            text="Three layers, one way of working."
          />
          <p className="lead">
            Security, hardware, and AI look like separate worlds. I treat them as one
            discipline: figure out where things break, then build systems that hold up.
          </p>
        </Reveal>

        <div className="domain-grid mt-14">
          {domains.map((domain, index) => {
            const Icon = domain.icon;

            return (
              <Reveal key={domain.domain} delay={index * 0.08} className="h-full">
                <TiltCard className="h-full">
                  <article className="card domain-card h-full" data-domain={domainKey(domain.domain)}>
                    <div className="domain-badge">
                      <Icon size={22} />
                    </div>
                    <h3>{domain.title}</h3>
                    <p>{domain.description}</p>
                    <div className="domain-signals">
                      {domain.signals.map((signal) => (
                        <Chip key={signal} mono>
                          {signal}
                        </Chip>
                      ))}
                    </div>
                    <a className="domain-link" href={`/projects/${domain.projectSlug}`}>
                      See the build
                      <ArrowUpRight size={15} />
                    </a>
                  </article>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WorkCard({ project, index }: { project: (typeof featuredProjects)[number]; index: number }) {
  const Icon = project.icon;

  return (
    <Reveal delay={index * 0.06}>
      <TiltCard max={5}>
        <a
          className="card work-card"
          data-domain={domainKey(project.domain)}
          href={`/projects/${project.slug}`}
        >
          <div className="work-figure">
            <Icon size={26} />
          </div>
        <div>
          <div className="work-meta">
            <span className="work-domain">{project.domain}</span>
            <span className="work-dot" />
            <span className="work-period">{project.period}</span>
            <span className="work-dot" />
            <span className="work-status">{project.status}</span>
          </div>
          <h3>{project.title}</h3>
          <p className="work-tagline">{project.tagline}</p>
          <div className="work-stack">
            {project.stack.slice(0, 5).map((item) => (
              <Chip key={item} mono>
                {item}
              </Chip>
            ))}
          </div>
        </div>
        <div className="work-arrow">
          <ArrowUpRight size={18} />
        </div>
        </a>
      </TiltCard>
    </Reveal>
  );
}

function SelectedWork() {
  return (
    <section id="work" className="section section-bordered">
      <div className="shell">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div className="section-head">
            <p className="kicker">Selected work</p>
            <ScrambleText
              as="h2"
              className="display text-4xl text-white sm:text-5xl"
              text="Proof, not promises."
            />
            <p className="lead">
              Real systems with real constraints — a satellite-grade PCB, a GPU physics
              engine, and a cryptosystem that assumes the server is hostile.
            </p>
          </div>
          <a className="btn btn-ghost" href="/projects">
            All projects
            <ArrowUpRight size={16} />
          </a>
        </Reveal>

        <div className="work-list mt-14">
          {featuredProjects.map((project, index) => (
            <WorkCard key={project.slug} project={project} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ExperienceSection() {
  return (
    <section id="experience" className="section section-bordered">
      <div className="shell">
        <Reveal className="section-head">
          <p className="kicker">Background</p>
          <ScrambleText
            as="h2"
            className="display text-4xl text-white sm:text-5xl"
            text="Where I've done the work."
          />
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div className="exp-list">
            {experience.map((item, index) => {
              const Icon = item.icon;

              return (
                <Reveal key={item.org} delay={index * 0.06}>
                  <article className="card exp-item">
                    <div className="exp-icon">
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="exp-head">
                        <h3>{item.role}</h3>
                        <span className="period">{item.period}</span>
                      </div>
                      <p className="exp-org">
                        {item.org} · {item.location}
                      </p>
                      <ul className="exp-points">
                        {item.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                      <div className="work-stack mt-4">
                        {item.tags.map((tag) => (
                          <Chip key={tag} mono>
                            {tag}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>

          <aside className="grid content-start gap-6">
            <Reveal>
              <div className="card edu-card">
                <div className="row">
                  <span className="exp-icon">
                    <GraduationCap size={20} />
                  </span>
                  <h3>{education.school}</h3>
                </div>
                <div className="grid gap-1">
                  <p className="edu-meta text-[var(--foreground)]">{education.degree}</p>
                  <p className="edu-meta">
                    {education.graduation} · GPA {education.gpa}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {education.coursework.map((course) => (
                    <Chip key={course} mono>
                      {course}
                    </Chip>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="card grid gap-5 p-6">
                {skills.map((group) => (
                  <div className="skill-group" key={group.label}>
                    <span className="label">{group.label}</span>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <Chip key={item}>{item}</Chip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </aside>
        </div>
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <section id="contact" className="section section-bordered contact">
      <div className="shell grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <Reveal>
          <p className="kicker">Contact</p>
          <ScrambleText
            as="h2"
            className="display mt-5 text-4xl text-white sm:text-5xl"
            text="Let's build something that matters."
          />
          <p className="lead mt-6 max-w-xl">{profile.availability}.</p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--muted-2)]">
            {profile.clearance}.
          </p>
          <div className="contact-proof mt-12">
            <span>Based in</span>
            <strong>{profile.location}</strong>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="self-center">
          <div className="contact-actions">
            <a
              className="contact-row contact-row-primary"
              href={profile.resumeHref}
              target="_blank"
              rel="noreferrer"
            >
              Download resume
              <ExternalLink size={18} />
            </a>
            {socials.map((social) => {
              const Icon = social.icon;

              return (
                <a
                  className="contact-row"
                  href={social.href}
                  key={social.label}
                  target={social.href.startsWith("http") ? "_blank" : undefined}
                  rel={social.href.startsWith("http") ? "noreferrer" : undefined}
                >
                  <span className="icon">
                    <Icon size={18} />
                  </span>
                  <span>{social.label}</span>
                  <ArrowUpRight size={16} />
                </a>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

function SiteInvader({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const [shipX, setShipX] = useState(50);
  const [shots, setShots] = useState<Array<{ id: number; x: number }>>([]);
  const [hits, setHits] = useState(0);
  const shotIdRef = useRef(0);

  useEffect(() => {
    if (!active) {
      document.documentElement.style.setProperty("--invader-ship-x", "50%");

      return;
    }

    function fireShot() {
      const id = shotIdRef.current;
      shotIdRef.current += 1;
      setShots((current) => [...current, { id, x: shipX }]);
      setHits((current) => Math.min(current + 1, 5));

      window.setTimeout(() => {
        setShots((current) => current.filter((shot) => shot.id !== id));
      }, 780);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        setShipX((current) => Math.max(8, current - 5));
      }

      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        event.preventDefault();
        setShipX((current) => Math.min(92, current + 5));
      }

      if (event.code === "Space") {
        event.preventDefault();
        fireShot();
      }

      if (event.key === "Escape") {
        onToggle();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, onToggle, shipX]);

  useEffect(() => {
    document.documentElement.style.setProperty("--invader-ship-x", `${shipX}%`);
  }, [shipX]);

  function pointerMove(event: MouseEvent<HTMLDivElement>) {
    if (!active) {
      return;
    }

    const x = (event.clientX / window.innerWidth) * 100;
    setShipX(Math.min(92, Math.max(8, x)));
  }

  function pointerFire() {
    if (!active) {
      return;
    }

    const id = shotIdRef.current;
    shotIdRef.current += 1;
    setShots((current) => [...current, { id, x: shipX }]);
    setHits((current) => Math.min(current + 1, 5));

    window.setTimeout(() => {
      setShots((current) => current.filter((shot) => shot.id !== id));
    }, 780);
  }

  function handleToggle() {
    if (active) {
      setHits(0);
      setShots([]);
      setShipX(50);
    }

    onToggle();
  }

  return (
    <>
      {active ? (
        <div
          aria-hidden="true"
          className="invader-overlay"
          onClick={pointerFire}
          onMouseMove={pointerMove}
        >
          {shots.map((shot) => (
            <div className="invader-shot" key={shot.id} style={{ left: `${shot.x}%` }} />
          ))}
          <div className="invader-ship">▟▙</div>
          <div className="invader-status">A/D or arrows move | Space shoots | Hits {hits}/5</div>
        </div>
      ) : null}
      <button aria-pressed={active} className="invader-button" onClick={handleToggle} type="button">
        {active ? <RotateCcw size={18} /> : <Swords size={18} />}
        <span>{active ? "Restore site" : "Play site invader"}</span>
      </button>
    </>
  );
}

export function PortfolioExperience() {
  const [invaderActive, setInvaderActive] = useState(false);

  return (
    <main className={`relative z-10 ${invaderActive ? "invader-active" : ""}`}>
      <FloatingTabs />
      <SpaceHero />
      <Ticker />
      <StatsStrip />
      <DomainsSection />
      <ApproachSection />
      <SelectedWork />
      <ExperienceSection />
      <ContactSection />
      <SiteInvader active={invaderActive} onToggle={() => setInvaderActive((current) => !current)} />
    </main>
  );
}
