import { ImageResponse } from "next/og";
import { getProject, projects } from "@/lib/portfolio-data";

export const alt = "Project — Alex Simpson";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

const accentByDomain: Record<string, string> = {
  Security: "#2bd4ee",
  Hardware: "#f6a23c",
  AI: "#b292ff",
};

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  const accent = accentByDomain[project?.domain ?? "AI"] ?? "#6ea0ff";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "76px",
          background: "linear-gradient(135deg, #05060c 0%, #0a0e18 55%, #05060c 100%)",
          color: "#f3f5fb",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px", color: accent }}>
          <div style={{ width: 16, height: 16, borderRadius: 999, background: accent }} />
          <div style={{ fontSize: 26, letterSpacing: 6, textTransform: "uppercase" }}>
            {`${project?.domain ?? "Project"} · ${project?.period ?? ""}`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2, lineHeight: 1.02 }}>
            {project?.title ?? "Project"}
          </div>
          <div style={{ fontSize: 34, color: "#cfd4df", maxWidth: 1000 }}>
            {project?.tagline ?? ""}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: 28, color: "#aab2c6" }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: "#6ea0ff" }} />
          Alex Simpson — Security · Hardware · AI
        </div>
      </div>
    ),
    { ...size },
  );
}
