import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://getagricore.com";
  const routes = [
    ["", 1, "weekly"],
    ["/features", 0.9, "monthly"],
    ["/pricing", 0.9, "monthly"],
    ["/roi-calculator", 0.85, "monthly"],
    ["/demo", 0.85, "monthly"],
    ["/security", 0.7, "monthly"],
    ["/about", 0.7, "monthly"],
    ["/contact", 0.7, "monthly"],
    ["/blog", 0.6, "weekly"],
    ["/industries", 0.85, "monthly"],
    ["/industries/agricultural-engineers", 0.85, "monthly"],
    ["/industries/machinery-dealers", 0.8, "monthly"],
    ["/industries/mobile-service-engineers", 0.8, "monthly"],
    ["/industries/dairy-service", 0.75, "monthly"],
    ["/agricultural-engineering-software", 0.9, "monthly"],
    ["/farm-machinery-workshop-software", 0.9, "monthly"],
    ["/mobile-job-sheets-agricultural-engineers", 0.85, "monthly"],
    ["/machinery-service-management-software", 0.85, "monthly"],
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
