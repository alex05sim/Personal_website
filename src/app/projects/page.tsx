import type { Metadata } from "next";
import { ContactSection, FloatingTabs } from "@/components/portfolio-experience";
import { ProjectsExplorer } from "@/components/projects-explorer";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Security, hardware, and AI projects by Alex Simpson — a secure telemetry PCB, a GPU N-body simulator, a malicious-datastore cryptosystem, and Berkeley solar-cycle research.",
};

export default function ProjectsPage() {
  return (
    <main className="relative z-10 min-h-screen">
      <FloatingTabs />
      <section className="pb-8 pt-32 sm:pt-36">
        <div className="shell section-head">
          <p className="kicker">Projects</p>
          <h1 className="display text-5xl text-white sm:text-6xl">Things I&apos;ve built.</h1>
          <p className="lead">
            Across security, hardware, and AI — each one started from a problem where being
            roughly right wasn&apos;t good enough.
          </p>
        </div>
      </section>
      <ProjectsExplorer />
      <ContactSection />
    </main>
  );
}
