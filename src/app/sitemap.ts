import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_URL ?? "https://guyub.thedreamcompany.space";
  // Dulu cuma "/" yang terdaftar, padahal /tentang, /login, /register juga
  // publik dan boleh diindeks (§SEO, 21 Sep 2026). Halaman tenant/admin
  // sengaja tidak masuk sini, sudah di-disallow di robots.ts.
  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/tentang`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/register`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
