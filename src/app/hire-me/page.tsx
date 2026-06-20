import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Code2, Download, Mail, ShieldCheck } from "lucide-react";
import { ContactSection, FloatingTabs } from "@/components/portfolio-experience";
import { education, experience, getProject, profile, socials, type Project } from "@/lib/portfolio-data";

export const metadata: Metadata = {
  title: "Hire Me",
  description:
    "Recruiter summary for Alex Simpson - UC Berkeley CS + Data Science student focused on security, embedded systems, ML infrastructure, and systems software.",
};

const targetRoles = [
  "Security engineering",
  "Embedded systems",
  "ML infrastructure",
  "Systems software",
];

const proofItems = [
  {
    label: "NSA software intern",
    detail: "Worked in a secure, mission-critical environment with TS/SCI clearance experience.",
    href: "/#experience",
  },
  {
    label: "CubeSat secure telemetry PCB",
    detail: "Custom ESP32-S3 + LoRa + GNSS board with replay-guarded telemetry and public firmware/groundstation repo.",
    href: "/projects/cubesat-telemetry-pcb",
  },
  {
    label: "CS 161 secure file system",
    detail: "Malicious-datastore file sharing design with authenticated sharing, O(1) append, and cascading revocation.",
    href: "/projects/secure-file-storage",
  },
];

const hiringSkills = [
  { label: "Security", items: ["Threat models", "AEAD/HMAC", "Argon2", "PKE", "Signatures", "Revocation"] },
  { label: "Systems", items: ["C", "Go", "Linux", "RISC-V", "Computer architecture", "Databases"] },
  { label: "Hardware", items: ["KiCad", "ESP32-S3", "LoRa/SX1262", "GNSS", "PCB bring-up"] },
  { label: "ML / compute", items: ["Python", "PyTorch", "CuPy", "NumPy", "scikit-learn"] },
];

const featured = [
  getProject("cubesat-telemetry-pcb"),
  getProject("secure-file-storage"),
  getProject("orbital-mechanics-simulator"),
].filter((project): project is Project => project !== undefined);

export default function HireMePage() {
  const github = socials.find((social) => social.label === "GitHub");
  const linkedin = socials.find((social) => social.label === "LinkedIn");

  return (
    <main className="relative z-10 min-h-screen">
      <FloatingTabs />

      <section className="hire-hero pb-12 pt-28 sm:pt-32">
        <div className="shell grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="kicker">Recruiter summary</p>
            <h1 className="display mt-5 text-5xl text-white sm:text-6xl">Alex Simpson</h1>
            <p className="lead mt-6 max-w-3xl">
              UC Berkeley CS + Data Science student building security, hardware, and AI systems
              with proof you can inspect: public firmware, real systems constraints, and private
              course work clearly labeled.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className="btn btn-primary" href={profile.resumeHref} target="_blank" rel="noreferrer">
                <Download size={18} />
                Resume
              </a>
              <a className="btn btn-ghost" href={`mailto:${profile.email}`}>
                <Mail size={18} />
                Email
              </a>
              {github ? (
                <a className="btn btn-ghost" href={github.href} target="_blank" rel="noreferrer">
                  <Code2 size={18} />
                  GitHub
                </a>
              ) : null}
              {linkedin ? (
                <a className="btn btn-ghost" href={linkedin.href} target="_blank" rel="noreferrer">
                  <BriefcaseBusiness size={18} />
                  LinkedIn
                </a>
              ) : null}
            </div>
          </div>

          <aside className="card hire-snapshot">
            <span>Looking for</span>
            <strong>Summer 2026 internships</strong>
            <p>{profile.availability}.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {targetRoles.map((role) => (
                <span className="chip chip-mono" key={role}>
                  {role}
                </span>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="section section-bordered">
        <div className="shell">
          <div className="kicker-line">
            <p className="kicker">Proof</p>
            <span className="rule" />
          </div>
          <div className="hire-proof-grid mt-8">
            {proofItems.map((item) => (
              <Link className="card hire-proof-card" href={item.href} key={item.label}>
                <ShieldCheck size={20} />
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
                <span>
                  Inspect proof
                  <ArrowUpRight size={13} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-bordered">
        <div className="shell grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="kicker">Fit</p>
            <h2 className="display mt-5 text-4xl text-white sm:text-5xl">Where I can help.</h2>
            <p className="lead mt-6">
              I am strongest where software meets constraints: adversarial systems, embedded links,
              low-level architecture, and compute-heavy Python.
            </p>
          </div>
          <div className="hire-skill-grid">
            {hiringSkills.map((group) => (
              <div className="card hire-skill-card" key={group.label}>
                <span>{group.label}</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span className="chip" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-bordered">
        <div className="shell">
          <div className="kicker-line">
            <p className="kicker">Selected projects</p>
            <span className="rule" />
          </div>
          <div className="hire-projects mt-8">
            {featured.map((project) => (
              <Link className="card hire-project-card" data-domain={project.domain.toLowerCase()} href={`/projects/${project.slug}`} key={project.slug}>
                <span>{project.domain}</span>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
                <em>{project.verification}</em>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-bordered">
        <div className="shell grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="card hire-detail-card">
            <span>Education</span>
            <h2>{education.school}</h2>
            <p>{education.degree}</p>
            <p>{education.graduation} - GPA {education.gpa}</p>
          </div>
          <div className="card hire-detail-card">
            <span>Current background</span>
            <h2>{experience[0].org}</h2>
            <p>{experience[0].role} - {experience[0].period}</p>
            <p>{profile.clearance}.</p>
          </div>
        </div>
      </section>

      <ContactSection />
    </main>
  );
}
