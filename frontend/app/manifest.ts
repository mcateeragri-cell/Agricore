import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AgriCore",
    short_name: "AgriCore",
    description:
      "Agricultural engineering CRM for customers, machines, jobs, quotes and invoices.",

    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",

    background_color: "#f1f5f9",
    theme_color: "#004c3f",

    categories: ["business", "productivity", "utilities"],

    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}