import Link from "next/link";
import { domains, education, profile } from "@/lib/portfolio-data";

export default function PlainPage() {
  return (
    <>
      <h1>{profile.name}</h1>
      <p>{profile.intro}</p>
      <p>
        {education.degree} - {education.school} - {education.graduation}
        <br />
        {profile.location}
      </p>
      <p>{profile.availability}.</p>
      <p>{profile.clearance}.</p>

      <p>
        <a href={`mailto:${profile.email}`}>{profile.email}</a>
        {" - "}
        <a href={profile.githubHref} target="_blank" rel="noreferrer">github</a>
        {" - "}
        <a href={profile.linkedinHref} target="_blank" rel="noreferrer">linkedin</a>
        {" - "}
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
          <p className="plain-note">{d.signals.join(" - ")}</p>
        </div>
      ))}

      <hr />

      <p>
        <Link href="/plain/projects">-&gt; view all projects</Link>
        {" - "}
        <Link href="/plain/experience">-&gt; experience &amp; education</Link>
        {" - "}
        <Link href="/plain/about">-&gt; skills &amp; coursework</Link>
      </p>

      <p className="plain-note">made with next.js - kind of defeats the point, i know</p>
    </>
  );
}
