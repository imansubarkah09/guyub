import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { InstallBanner } from "@/components/install-banner";

/**
 * Sebelumnya app ini tidak pasang font sama sekali — semua render pakai font
 * sistem visitor (San Francisco/Roboto/Segoe UI tergantung device), padahal
 * identitas visualnya (cream/terracotta, "warm home + futuristik") sudah jelas
 * di tempat lain. Plus Jakarta Sans dipilih karena hangat-tapi-profesional,
 * relevan secara tematik (nama dari Jakarta), dan dukungan angka tabular
 * kuat — app ini pakai `tabular-nums` di mana-mana untuk uang (§typeset,
 * 15 Sep 2026). self-hosted otomatis oleh next/font, tanpa request ke Google
 * saat runtime, tanpa render blocking.
 */
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: "Guyub — Kas & Tabungan Komunitas",
  description: "Kelola kas, tabungan, dan qurban joinan keluarga, RT, atau paguyuban dari satu aplikasi.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/apple-icon.png",
  },
  appleWebApp: { capable: true, title: "Guyub", statusBarStyle: "default" },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#A45626",
};

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="min-h-screen antialiased">
        {children}
        <InstallBanner />
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');`}
        </Script>
        {process.env.NODE_ENV === "production" && GA_MEASUREMENT_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
