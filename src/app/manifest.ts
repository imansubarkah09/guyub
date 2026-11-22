import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "KOMUNITA — Kas & Tabungan Komunitas",
    short_name: "KOMUNITA",
    description: "Kelola anggota, kas, tabungan, arisan, dan kegiatan komunitas dalam satu platform digital yang praktis, transparan, dan mudah digunakan.",
    lang: "id",
    dir: "ltr",
    // Langsung ke ruang kerja, bukan landing page — kalau belum login, guard-nya
    // yang mengarahkan ke /login seperti biasa.
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F6F0",
    theme_color: "#153D35",
    categories: ["finance", "lifestyle"],
    // PNG statis di /public, bukan dibuat next/og saat request: rendering og
    // memakan ratusan milidetik CPU per ikon dan bikin Worker kena batas CPU
    // (error 1102) waktu HP mengambil beberapa ikon sekaligus.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/komunita-app-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
