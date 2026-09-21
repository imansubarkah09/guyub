import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_URL ?? "https://guyub.thedreamcompany.space";
  return {
    // /admin (kelola tenant platform owner) dan /laporan (link laporan
    // keuangan tenant yang dibagikan lewat WhatsApp) sebelumnya tidak ada di
    // sini, jadi bisa diindeks Google walau isinya bukan buat publik umum
    // (§SEO, 21 Sep 2026).
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/platform", "/t/", "/invite/", "/cari", "/admin", "/laporan"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
