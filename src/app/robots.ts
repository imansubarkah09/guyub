import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_URL ?? "https://guyub.thedreamcompany.space";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/platform", "/t/", "/invite/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
