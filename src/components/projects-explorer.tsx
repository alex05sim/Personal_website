"use client";

import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { type Domain, domainKey, domains, projects } from "@/lib/portfolio-data";

type Filter = Domain | "All";

const filters: Array<{ label: string; value: Filter }> = [
  { label: "All", value: "All" },
  ...domains.map((domain) => ({ label: domain.domain, value: domain.domain as Filter })),
];

export function ProjectsExplorer() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState<Filter>("All");
  const visible = active === "All" ? projects : projects.filter((p) => p.domain === active);

  return (
    <section className="pb-24">
      <div className="shell">
        <div className="filter-bar">
          {filters.map((filter) => (
            <button
              className="filter-tab"
              data-active={active === filter.value}
              data-domain={filter.value === "All" ? undefined : domainKey(filter.value as Domain)}
              key={filter.value}
              onClick={() => setActive(filter.value)}
              type="button"
            >
              {filter.value !== "All" ? <span className="swatch" aria-hidden="true" /> : null}
              {filter.label}
            </button>
          ))}
        </div>

        <div className="work-list mt-8">
          {visible.map((project, index) => {
            const Icon = project.icon;

            return (
              <motion.a
                className="card work-card"
                data-domain={domainKey(project.domain)}
                href={`/projects/${project.slug}`}
                key={project.slug}
                layout
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
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
                      <span className="chip chip-mono" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="work-arrow">
                  <ArrowUpRight size={18} />
                </div>
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
