import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { InstallBanner } from "@/components/install-banner";
import { UpdateBanner } from "@/components/update-banner";

/**
 * Sebelumnya app ini tidak pasang font sama sekali, semua render pakai font
 * sistem visitor (San Francisco/Roboto/Segoe UI tergantung device), padahal
 * identitas visualnya (cream/terracotta, "warm home + futuristik") sudah jelas
 * di tempat lain. Plus Jakarta Sans dipilih karena hangat-tapi-profesional,
 * relevan secara tematik (nama dari Jakarta), dan dukungan angka tabular
 * kuat: app ini pakai `tabular-nums` di mana-mana untuk uang (§typeset,
 * 15 Sep 2026). self-hosted otomatis oleh next/font, tanpa request ke Google
 * saat runtime, tanpa render blocking.
 */
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_URL ?? "https://guyub.thedreamcompany.space";
const TITLE = "Guyub: Kas & Tabungan Komunitas";
const DESCRIPTION = "Kelola kas, tabungan, dan qurban joinan keluarga, RT, atau paguyuban dari satu aplikasi.";
const OG_IMAGE = { url: "/og-image.png", width: 1200, height: 630, alt: "Guyub: Kas & Tabungan Komunitas" };

// WebSite terstruktur (§SEO, 21 Sep 2026): dulu tidak ada metadataBase/Open
// Graph/JSON-LD sama sekali, jadi link Guyub yang dibagikan di WhatsApp/media
// sosial tampil polos tanpa preview, dan /tentang bahkan berbagi title+
// description yang sama persis dengan landing page (halaman berbeda tidak
// bisa dibedakan mesin pencari). title.template biar tiap halaman anak cukup
// setel judulnya sendiri, otomatis jadi "X | Guyub".
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s | Guyub" },
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: "Guyub",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/apple-icon.png",
  },
  appleWebApp: { capable: true, title: "Guyub", statusBarStyle: "default" },
  // Next cuma mengeluarkan "mobile-web-app-capable" untuk appleWebApp.capable.
  // iOS modern membaca display:standalone dari manifest, tapi tag lama ini
  // murah dan menjaga Layar Utama (syarat Web Push iPhone) di iOS lebih tua.
  other: { "apple-mobile-web-app-capable": "yes" },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Guyub",
  url: SITE_URL,
  description: DESCRIPTION,
  inLanguage: "id",
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }} />
        {children}
        <InstallBanner />
        <UpdateBanner />
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
