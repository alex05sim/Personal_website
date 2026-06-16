import { projects } from "@/lib/portfolio-data";

export default function PlainProjectsPage() {
  return (
    <>
      <h1>projects</h1>
      <p>things i&apos;ve built. click through for full writeups.</p>

      <hr />

      {projects.map((project) => (
        <div key={project.slug} className="plain-project-entry">
          <h3>
            <a href={`/plain/projects/${project.slug}`}>{project.title}</a>
          </h3>
          <p className="plain-note">
            {project.domain} · {project.period} · {project.status}
          </p>
          <p>{project.tagline}</p>
          <p>{project.summary}</p>
          <p className="plain-note">stack: {project.stack.join(", ")}</p>
          <p>
            <a href={`/plain/projects/${project.slug}`}>→ full writeup</a>
            {project.links.map((link) => (
              <span key={link.href}>
                {" · "}
                <a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
              </span>
            ))}
          </p>
        </div>
      ))}
    </>
  );
}
