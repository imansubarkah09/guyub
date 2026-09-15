import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Guyub — Kas & Tabungan Komunitas",
    short_name: "Guyub",
    description: "Kelola kas, tabungan, dan qurban joinan keluarga, RT, atau paguyuban dari satu aplikasi.",
    lang: "id",
    dir: "ltr",
    // Langsung ke ruang kerja, bukan landing page — kalau belum login, guard-nya
    // yang mengarahkan ke /login seperti biasa.
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FDF8F2",
    theme_color: "#A45626",
    categories: ["finance", "lifestyle"],
    // PNG statis di /public, bukan dibuat next/og saat request: rendering og
    // memakan ratusan milidetik CPU per ikon dan bikin Worker kena batas CPU
    // (error 1102) waktu HP mengambil beberapa ikon sekaligus.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
