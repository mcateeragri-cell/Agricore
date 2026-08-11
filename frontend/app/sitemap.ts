import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://getagricore.com";
  const routes = [
    ["", 1, "weekly"],
    ["/features", 0.9, "monthly"],
    ["/pricing", 0.9, "monthly"],
    ["/demo", 0.85, "monthly"],
    ["/security", 0.7, "monthly"],
    ["/about", 0.7, "monthly"],
    ["/contact", 0.7, "monthly"],
    ["/blog", 0.6, "weekly"],
    ["/privacy", 0.3, "yearly"],
    ["/terms", 0.3, "yearly"],
    ["/cookies", 0.3, "yearly"],
  ] as const;

  return routes.map(([path, priority, changeFrequency]) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
