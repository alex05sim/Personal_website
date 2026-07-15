import type { Metadata } from "next";
import { MeExperience } from "@/components/me-experience";

export const metadata: Metadata = {
  title: "Me",
  description:
    "The off-duty page: interests, a deep-cut FAQ, and a black hole that answers questions about Alex Simpson.",
};

export default function MePage() {
  return <MeExperience />;
}
