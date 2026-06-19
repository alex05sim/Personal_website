import type { MetadataRoute } from "next";
import { projects } from "@/lib/portfolio-data";

const base = "https://alexsimpson.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = ["", "/projects", "/world", "/plain"].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
  }));
  const projectRoutes = projects.map((project) => ({
    url: `${base}/projects/${project.slug}`,
    lastModified: now,
  }));
  return [...staticRoutes, ...projectRoutes];
}
