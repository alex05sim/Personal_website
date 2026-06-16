import { domains, education, profile } from "@/lib/portfolio-data";

export default function PlainPage() {
  return (
    <>
      <h1>{profile.name}</h1>
      <p>{profile.intro}</p>
      <p>
        {education.degree} · {education.school} · {education.graduation}
        <br />
        {profile.location}
      </p>
      <p>{profile.availability}.</p>
      <p>{profile.clearance}.</p>

      <p>
        <a href={`mailto:${profile.email}`}>{profile.email}</a>
        {" · "}
        <a href={profile.githubHref} target="_blank" rel="noreferrer">github</a>
        {" · "}
        <a href={profile.linkedinHref} target="_blank" rel="noreferrer">linkedin</a>
        {" · "}
        <a href={profile.resumeHref} target="_blank" rel="noreferrer">resume (pdf)</a>
      </p>

      <p>
        <em>
          this is more my style but i wanted to learn frontend. the other version took a while.
        </em>
      </p>

      <hr />

      <h2>what i work on</h2>
      {domains.map((d) => (
        <div key={d.domain}>
          <h3>{d.label}</h3>
          <p>{d.description}</p>
          <p className="plain-note">{d.signals.join(" · ")}</p>
        </div>
      ))}

      <hr />

      <p>
        <a href="/plain/projects">→ view all projects</a>
        {" · "}
        <a href="/plain/experience">→ experience &amp; education</a>
        {" · "}
        <a href="/plain/about">→ skills &amp; coursework</a>
      </p>

      <p className="plain-note">made with next.js · kind of defeats the point, i know</p>
    </>
  );
}
