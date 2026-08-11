import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/platform", "/administration", "/settings", "/account", "/office", "/technician"] },
    ],
    sitemap: "https://getagricore.com/sitemap.xml",
    host: "https://getagricore.com",
  };
}
