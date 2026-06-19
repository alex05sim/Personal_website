import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://alexsimpson.dev/sitemap.xml",
    host: "https://alexsimpson.dev",
  };
}
