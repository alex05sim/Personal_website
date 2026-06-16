import { domains, profile, skills } from "@/lib/portfolio-data";

export default function PlainAboutPage() {
  return (
    <>
      <h1>about</h1>
      <p>{profile.intro}</p>
      <p>{profile.availability}.</p>
      <p>{profile.clearance}.</p>

      <hr />

      <h2>skills</h2>
      {skills.map((group) => (
        <div key={group.label}>
          <h3>{group.label}</h3>
          <p>{group.items.join(", ")}</p>
        </div>
      ))}

      <hr />

      <h2>focus areas</h2>
      {domains.map((d) => (
        <div key={d.domain}>
          <h3>{d.label}</h3>
          <p>{d.description}</p>
          <ul>
            {d.capabilities.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
