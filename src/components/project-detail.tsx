import { ArrowLeft, ArrowRight, ArrowUpRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { domainKey, type Project } from "@/lib/portfolio-data";
import { PcbShowcase } from "./pcb-showcase-lazy";
import { MediaGallery } from "./media-gallery";
import { BoardSectionTabs } from "./board-section-tabs";
import { HopeMissionIntro } from "./hope-mission-intro";
import { SolarIntro } from "./solar-intro";
import { SolarPin } from "./solar-pin";
import { ArrivalFlash } from "./arrival-flash";

const statusLabels = {
  live: "Live artifact",
  missing: "Artifact missing",
  private: "Private artifact",
  planned: "Planned artifact",
};

function ArchitectureDiagram({ project }: { project: Project }) {
  return (
    <section className="detail-section mt-16">
      <div className="kicker-line">
        <p className="kicker">System flow</p>
        <span className="rule" />
      </div>
      <div className="architecture-flow mt-6" aria-label={`${project.title} architecture flow`}>
        {project.architecture.map((node, index) => (
          <div className="architecture-step" key={node.label}>
            <span className="architecture-index">{String(index + 1).padStart(2, "0")}</span>
            <strong>{node.label}</strong>
            <p>{node.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProblemSolution({ project }: { project: Project }) {
  return (
    <section className="detail-section mt-16">
      <div className="kicker-line">
        <p className="kicker">Problem -&gt; solution</p>
        <span className="rule" />
      </div>
      <div className="problem-solution-grid mt-6">
        <div className="card case-card problem-card">
          <span>Problem</span>
          <p>{project.problem}</p>
        </div>
        <div className="card case-card">
          <span>What I built</span>
          <p>{project.role}</p>
        </div>
        <div className="card case-card">
          <span>Result</span>
          <p>{project.outcome}</p>
        </div>
        <div className="card case-card">
          <span>Main constraints</span>
          <ul>
            {project.constraints.slice(0, 3).map((constraint) => (
              <li key={constraint}>{constraint}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function BoardSections({ project }: { project: Project }) {
  if (!project.boardSections?.length) {
    return null;
  }

  return (
    <section className="detail-section mt-16">
      <div className="kicker-line">
        <p className="kicker">Board sections</p>
        <span className="rule" />
      </div>
      <p className="lead mt-5 max-w-3xl">
        Footprint walkthrough from the KiCad component file: 239 placed components, including 24 ICs/modules,
        78 resistors, 69 capacitors, 26 diodes/LEDs, 20 test points, and 5 connectors.
      </p>
      <BoardSectionTabs sections={project.boardSections} />
    </section>
  );
}

export function ProjectDetail({
  project,
  prev,
  next,
}: {
  project: Project;
  prev: Project;
  next: Project;
}) {
  const Icon = project.icon;
  const showcase = project.slug === "cubesat-telemetry-pcb";
  const isSolar = project.slug === "solar-cycle-prediction";

  return (
    <article className={`detail${isSolar ? " detail-solar" : ""}`} data-domain={domainKey(project.domain)}>
      {showcase ? (
        <HopeMissionIntro />
      ) : (
        <>
          <ArrivalFlash />
          {isSolar ? <SolarIntro /> : null}
          {isSolar ? <SolarPin /> : null}
        </>
      )}
      <div className="detail-aura" aria-hidden="true" />
      <div id="case-study" className="shell relative pb-8 pt-28 sm:pt-32">
        <Link className="detail-back" href="/projects">
          <ArrowLeft size={16} />
          All projects
        </Link>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <div>
            <div className="flex items-start gap-5">
              <div className="detail-badge">
                <Icon size={28} />
              </div>
              <div>
                <div className="work-meta">
                  <span className="work-domain">{project.domain}</span>
                  <span className="work-dot" />
                  <span className="work-period">{project.period}</span>
                  <span className="work-dot" />
                  <span className="work-status">{project.status}</span>
                </div>
                <h1 className="display mt-3 text-4xl text-white sm:text-5xl">{project.title}</h1>
              </div>
            </div>

            <p className="lead mt-7">{project.summary}</p>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              {project.stack.map((item) => (
                <span className="chip chip-mono" key={item}>
                  {item}
                </span>
              ))}
              <span className="chip chip-mono">{project.verification}</span>
              <span className={`chip chip-mono artifact-${project.artifactStatus}`}>
                {statusLabels[project.artifactStatus]}
              </span>
            </div>

            {project.links.length > 0 ? (
              <div className="mt-8 flex flex-wrap gap-3">
                {project.links.map((link) => (
                  <a
                    className="btn btn-ghost"
                    href={link.href}
                    key={link.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.label}
                    <ExternalLink size={16} />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="spec-grid mt-12">
          {project.highlights.map((highlight) => (
            <div className="spec-item" key={highlight.label}>
              <span>{highlight.label}</span>
              <strong>{highlight.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="shell relative pb-8">
        <ProblemSolution project={project} />
        <BoardSections project={project} />
        <ArchitectureDiagram project={project} />
      </div>

      {showcase ? <PcbShowcase /> : null}

      <div className="shell relative pb-8">
        <MediaGallery items={project.gallery} label={showcase ? "PCB layout" : "Gallery"} />

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1.45fr]">
          <div className="detail-section">
            <p className="kicker">Still to add</p>
            <ul className="detail-bullet-list mt-5">
              {project.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
          <div className="detail-section">
            <p className="kicker">Approach</p>
            <div className="approach-list mt-5">
              {project.approach.map((step) => (
                <div className="approach-item" key={step}>
                  <span className="approach-num" aria-hidden="true" />
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {project.benchmark ? (
          <div className="detail-section mt-16">
            <p className="kicker">Performance</p>
            <p className="lead mt-4 max-w-2xl">{project.benchmark.caption}</p>
            <div className="card mt-6 p-6">
              <div className="benchmark">
                {project.benchmark.bars.map((bar) => (
                  <div className="benchmark-row" key={bar.name}>
                    <span className="name">{bar.name}</span>
                    <span className="benchmark-track">
                      <span
                        className={`benchmark-fill ${bar.accent ? "accent" : "base"}`}
                        style={{ width: `${bar.value}%` }}
                      />
                    </span>
                    <span className="val">{bar.display}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 font-mono text-xs text-[var(--muted-2)]">{project.benchmark.unit}</p>
            </div>
          </div>
        ) : null}

        <div className="hairline mt-16" />

        <div className="detail-nav mt-8">
          <Link href={`/projects/${prev.slug}`}>
            <span>
              <ArrowLeft size={12} className="mr-1 inline" />
              Previous
            </span>
            <strong>{prev.title}</strong>
          </Link>
          <Link className="next" href={`/projects/${next.slug}`}>
            <span>
              Next
              <ArrowRight size={12} className="ml-1 inline" />
            </span>
            <strong>{next.title}</strong>
          </Link>
        </div>

        <Link className="domain-link mt-10" href="/projects">
          See all projects
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </article>
  );
}
