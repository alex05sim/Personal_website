import { education, experience } from "@/lib/portfolio-data";

export default function PlainExperiencePage() {
  return (
    <>
      <h1>experience &amp; education</h1>

      <h2>work</h2>
      {experience.map((item) => (
        <div key={item.org}>
          <h3>
            {item.role} · {item.org}
          </h3>
          <p className="plain-note">
            {item.period} · {item.location}
          </p>
          <ul>
            {item.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="plain-note">stack: {item.tags.join(", ")}</p>
        </div>
      ))}

      <hr />

      <h2>education</h2>
      <h3>{education.school}</h3>
      <p>
        {education.degree}
        <br />
        {education.graduation} · GPA {education.gpa}
      </p>
      <p>
        <strong>coursework:</strong>{" "}
        {education.coursework.map((c) => c.split(" — ")[0]).join(", ")}
      </p>
    </>
  );
}
