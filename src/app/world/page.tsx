import type { Metadata } from "next";
import { ContactSection, FloatingTabs, WorldSection } from "@/components/portfolio-experience";

export const metadata: Metadata = {
  title: "World",
  description:
    "A travel log and live sky tracker - the places Alex Simpson has been and where to point the camera next.",
};

export default function WorldPage() {
  return (
    <main className="relative z-10 min-h-screen pt-16">
      <FloatingTabs />
      <WorldSection />
      <ContactSection />
    </main>
  );
}
