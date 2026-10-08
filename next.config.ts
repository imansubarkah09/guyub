import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["dev.thedreamcompany.space"],
  devIndicators: false,
  // Versi deploy = commit GitHub Actions. Dibandingkan UpdateBanner dengan /api/version
  // untuk tahu tab/PWA ini masih memuat versi lama. Build lokal = "dev" (banner mati).
  env: { NEXT_PUBLIC_BUILD_ID: process.env.GITHUB_SHA ?? "dev" },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
