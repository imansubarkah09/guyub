import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_URL ?? "https://guyub.thedreamcompany.space";
  return [{ url: base, changeFrequency: "monthly", priority: 1 }];
}
