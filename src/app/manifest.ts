import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Guyub — Kas & Tabungan Komunitas",
    short_name: "Guyub",
    description: "Kelola kas, tabungan, dan qurban joinan keluarga, RT, atau paguyuban dari satu aplikasi.",
    lang: "id",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFF8EE",
    theme_color: "#C1652D",
    categories: ["finance", "lifestyle"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
