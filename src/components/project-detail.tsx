import { ArrowLeft, ArrowRight, ArrowUpRight, ExternalLink } from "lucide-react";
import { domainKey, type Project } from "@/lib/portfolio-data";
import { PcbShowcase } from "./pcb-showcase-lazy";

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

  return (
    <article className="detail" data-domain={domainKey(project.domain)}>
      <div className="detail-aura" aria-hidden="true" />
      <div className="shell relative pb-8 pt-28 sm:pt-32">
        <a className="detail-back" href="/projects">
          <ArrowLeft size={16} />
          All projects
        </a>

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

      {showcase ? <PcbShowcase /> : null}

      <div className="shell relative pb-8">
        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1.45fr]">
          <div className="detail-section">
            <p className="kicker">The problem</p>
            <p className="lead mt-5">{project.problem}</p>
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
          <a href={`/projects/${prev.slug}`}>
            <span>
              <ArrowLeft size={12} className="mr-1 inline" />
              Previous
            </span>
            <strong>{prev.title}</strong>
          </a>
          <a className="next" href={`/projects/${next.slug}`}>
            <span>
              Next
              <ArrowRight size={12} className="ml-1 inline" />
            </span>
            <strong>{next.title}</strong>
          </a>
        </div>

        <a className="domain-link mt-10" href="/projects">
          See all projects
          <ArrowUpRight size={15} />
        </a>
      </div>
    </article>
  );
}
