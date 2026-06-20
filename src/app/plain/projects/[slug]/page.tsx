import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@/lib/portfolio-data";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function PlainProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  return (
    <>
      <p className="plain-note">
        <Link href="/plain/projects">&lt;- all projects</Link>
      </p>

      <h1>{project.title}</h1>
      <p className="plain-note">
        {project.domain} - {project.period} - {project.status}
      </p>
      <p className="plain-note">proof: {project.verification}</p>
      <p>
        <em>{project.tagline}</em>
      </p>

      <hr />

      <h2>overview</h2>
      <p>{project.summary}</p>

      <h2>the problem</h2>
      <p>{project.problem}</p>

      <h2>approach</h2>
      <ul>
        {project.approach.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>

      {project.highlights.length > 0 && (
        <>
          <h2>key details</h2>
          <ul>
            {project.highlights.map((h) => (
              <li key={h.label}>
                <strong>{h.label}:</strong> {h.value}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>stack</h2>
      <p>{project.stack.join(", ")}</p>

      {project.links.length > 0 && (
        <>
          <h2>links</h2>
          <ul>
            {project.links.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
              </li>
            ))}
          </ul>
        </>
      )}

      <hr />

      <p>
        <Link href="/plain/projects">&lt;- back to projects</Link>
        {" - "}
        <Link href={`/projects/${project.slug}`}>view in fancy version -&gt;</Link>
      </p>
    </>
  );
}
