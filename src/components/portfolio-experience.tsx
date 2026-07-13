"use client";

import { ArrowUpRight, BriefcaseBusiness, ExternalLink, GraduationCap, Search } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import {
  domainKey,
  domains,
  education,
  experience,
  featuredProjects,
  navigationTabs,
  profile,
  projects,
  skills,
  socials,
} from "@/lib/portfolio-data";
import { CountUp, TiltCard } from "./interactions";
import { ScrambleText } from "./scramble-text";
import { SpaceHero } from "./space-hero";
import { Reveal } from "./portfolio/shared";
import { SiteInvader } from "./portfolio/site-invader";

export { WorldSection } from "./portfolio/world-section";

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
      window.setTimeout(() => setActiveSection(null), 0);
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
      <div className="nav-inner flex h-14 w-full items-center gap-1 overflow-x-auto px-4 sm:px-6 lg:px-10">
        <Link className="nav-brand" href="/">
          <span className="dot" aria-hidden="true" />
          {profile.name}
        </Link>
        {navigationTabs.map((tab) => {
          const active = isTabActive(tab.href);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`nav-tab ${active ? "nav-tab-active" : ""}`}
              href={tab.href}
              key={tab.href}
            >
              {tab.label}
            </Link>
          );
        })}
        <button
          type="button"
          className="cmdk-trigger ml-2 hidden sm:inline-flex"
          onClick={() => window.dispatchEvent(new Event("cmdk:open"))}
          aria-label="Open command menu"
        >
          <Search size={13} />
          <kbd>Ctrl/Command K</kbd>
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
  "PyTorch / CUDA",
  "CuPy",
  "NumPy",
  "KiCad",
  "ESP32-S3",
  "LoRa",
  "AES / HMAC",
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
  sub: string;
  accent?: boolean;
  value?: string;
  count?: { value: number; decimals?: number; prefix?: string; suffix?: string };
};

const stats: Stat[] = [
  { value: "Berkeley", label: "CS + Data Science", sub: "Expected May 2028" },
  { value: "NSA", label: "Software intern", sub: "2023 - 2024" },
  { value: "CubeSat", label: "Secure telemetry PCB", sub: "LoRa + GNSS + signing", accent: true },
  { value: "CS 161", label: "Secure file system", sub: "Malicious datastore model" },
  { count: { value: 3.78, decimals: 2 }, label: "GPA", sub: "UC Berkeley" },
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
                <div className="stat-sub">{stat.sub}</div>
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
    body: "I gravitate toward problems where being roughly right isn't enough - cryptography, embedded firmware, numerical methods. The interesting part is the failure mode.",
  },
  {
    title: "From the board up",
    body: "Comfortable across the whole stack - PCB and firmware, systems and security, models and the GPUs they run on - so I can follow a problem wherever it goes.",
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
                    <Link className="domain-link" href={`/projects/${domain.projectSlug}`}>
                      See the build
                      <ArrowUpRight size={15} />
                    </Link>
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
        <Link
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
              <Chip mono>{project.verification}</Chip>
            </div>
          </div>
          <div className="work-arrow">
            <ArrowUpRight size={18} />
          </div>
        </Link>
      </TiltCard>
    </Reveal>
  );
}

function ResearchSection() {
  const research = projects.find((p) => p.slug === "solar-cycle-prediction");
  if (!research) return null;
  const Icon = research.icon;
  return (
    <section id="research" className="section section-bordered">
      <div className="shell">
        <Reveal className="section-head">
          <p className="kicker">Research</p>
          <h2 className="display text-4xl text-white sm:text-5xl">Active work at Berkeley.</h2>
          <p className="lead mt-6 max-w-2xl">{research.summary}</p>
        </Reveal>
        <Reveal delay={0.08} className="mt-10">
          <Link className="card work-card" data-domain="ai" href={`/projects/${research.slug}`}>
            <div className="work-figure">
              <Icon size={26} />
            </div>
            <div>
              <div className="work-meta">
                <span className="work-domain">{research.domain}</span>
                <span className="work-dot" />
                <span className="work-period">{research.period}</span>
                <span className="work-dot" />
                <span className="work-status">{research.status}</span>
              </div>
              <h3>{research.title}</h3>
              <p className="work-tagline">{research.tagline}</p>
              <div className="work-stack">
                {research.stack.map((item) => (
                  <Chip key={item} mono>
                    {item}
                  </Chip>
                ))}
                <Chip mono>{research.verification}</Chip>
              </div>
            </div>
            <div className="work-arrow">
              <ArrowUpRight size={18} />
            </div>
          </Link>
        </Reveal>
      </div>
    </section>
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
              Real systems with real constraints - a satellite-grade PCB, a GPU physics
              engine, and a cryptosystem that assumes the server is hostile.
            </p>
          </div>
          <Link className="btn btn-ghost" href="/projects">
            All projects
            <ArrowUpRight size={16} />
          </Link>
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
                        {item.org} - {item.location}
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
              <div className="card flex items-center gap-4 p-5">
                <img src="/headshot.jpg" alt={profile.name} className="profile-photo-img" />
                <div>
                  <p className="text-base font-semibold leading-tight text-white">{profile.name}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{profile.title}</p>
                </div>
              </div>
            </Reveal>

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
                    {education.graduation} - GPA {education.gpa}
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
            <Link className="contact-row" href="/hire-me">
              <span className="icon">
                <BriefcaseBusiness size={18} />
              </span>
              <span>Recruiter summary</span>
              <ArrowUpRight size={16} />
            </Link>
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

function SkillsSection() {
  return (
    <section id="skills" className="section section-bordered">
      <div className="shell">
        <Reveal className="section-head">
          <p className="kicker">Toolbox</p>
          <ScrambleText
            as="h2"
            className="display text-4xl text-white sm:text-5xl"
            text="The tools I reach for."
          />
        </Reveal>

        <div className="skills-grid mt-12">
          {skills.map((group, index) => (
            <Reveal key={group.label} delay={index * 0.05}>
              <div className="card skill-card">
                <span className="label">{group.label}</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <Chip key={item}>{item}</Chip>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PortfolioExperience() {
  const [invaderActive, setInvaderActive] = useState(false);

  return (
    <main className={`relative z-10 ${invaderActive ? "invader-active" : ""}`}>
      <FloatingTabs />
      <SpaceHero />
      <StatsStrip />
      <Ticker />
      <DomainsSection />
      <ApproachSection />
      <SelectedWork />
      <ResearchSection />
      <ExperienceSection />
      <SkillsSection />
      <ContactSection />
      <SiteInvader active={invaderActive} onToggle={() => setInvaderActive((current) => !current)} />
    </main>
  );
}
