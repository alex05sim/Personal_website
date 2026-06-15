import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactSection, FloatingTabs } from "@/components/portfolio-experience";
import { ProjectDetail } from "@/components/project-detail";
import { getProject, projects } from "@/lib/portfolio-data";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) {
    return { title: "Project not found" };
  }

  return {
    title: project.title,
    description: project.tagline,
    openGraph: {
      title: `${project.title} — Alex Simpson`,
      description: project.summary,
      type: "article",
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) {
    notFound();
  }

  const index = projects.findIndex((entry) => entry.slug === slug);
  const prev = projects[(index - 1 + projects.length) % projects.length];
  const next = projects[(index + 1) % projects.length];

  return (
    <main className="relative z-10 min-h-screen">
      <FloatingTabs />
      <ProjectDetail project={project} prev={prev} next={next} />
      <ContactSection />
    </main>
  );
}
