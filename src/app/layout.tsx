import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guyub — Kas & Tabungan Komunitas",
  description: "Kelola kas, tabungan, dan qurban joinan keluarga, RT, atau paguyuban dari satu aplikasi.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/pwa-icon/192", type: "image/png", sizes: "192x192" },
    ],
    apple: "/apple-icon",
  },
  appleWebApp: { capable: true, title: "Guyub", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#C1652D",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">
        {children}
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');`}
        </Script>
      </body>
    </html>
  );
}
