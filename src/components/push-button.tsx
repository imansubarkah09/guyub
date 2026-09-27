"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { btnGhost } from "@/components/ui";
import { hapusPushAction, simpanPushAction } from "@/app/account-actions";

type Keadaan = "memuat" | "belum" | "aktif" | "ditolak" | "ios" | "tidak-didukung" | "gagal";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Dibaca sekali lewat lazy initializer, bukan setState di effect (dilarang lint,
// lihat install-button.tsx). Aman karena komponen ini cuma dirender di dalam
// dropdown ProfileMenu yang baru muncul setelah diklik, tidak pernah di server.
function keadaanAwal(): Keadaan {
  if (typeof window === "undefined" || !VAPID) return "tidak-didukung";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    // Safari iPhone/iPad baru punya PushManager kalau Guyub dibuka dari ikon Layar
    // Utama (iOS 16.4+). iPadOS mengaku "Macintosh", jadi dicek lewat layar sentuh.
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    return ios ? "ios" : "tidak-didukung";
  }
  return Notification.permission === "denied" ? "ditolak" : "memuat";
}

function keUint8(base64url: string) {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export function PushButton() {
  const [k, setK] = useState<Keadaan>(keadaanAwal);
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    if (k !== "memuat") return;
    navigator.serviceWorker.ready
      .then((r) => r.pushManager.getSubscription())
      .then((s) => {
        if (s) simpanPushAction(s.toJSON());
        setK(s ? "aktif" : "belum");
      })
      .catch(() => setK("belum"));
  }, [k]);

  async function aktifkan() {
    setSibuk(true);
    try {
      // requestPermission harus jadi await pertama: iOS cuma mengizinkannya
      // langsung dari tap pengguna.
      const izin = await Notification.requestPermission();
      if (izin !== "granted") return setK(izin === "denied" ? "ditolak" : "belum");
      const r = await navigator.serviceWorker.ready;
      const s = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keUint8(VAPID!) });
      await simpanPushAction(s.toJSON());
      setK("aktif");
    } catch (e) {
      console.error("Aktifkan notifikasi gagal", e);
      setK("gagal");
    } finally {
      setSibuk(false);
    }
  }

  if (k === "memuat" || k === "tidak-didukung") return null;
  if (k === "aktif") {
    return (
      <p className="flex items-center gap-2 px-2 py-1 text-xs text-muted">
        <BellRing className="h-4 w-4 text-success" />
        Notifikasi aktif di perangkat ini
      </p>
    );
  }
  if (k === "ios") {
    return (
      <p className="px-2 text-xs text-muted">
        Notifikasi di iPhone: tap Bagikan (Share), pilih &quot;Tambah ke Layar Utama&quot;, lalu buka Guyub dari ikon itu.
      </p>
    );
  }
  if (k === "ditolak") {
    return <p className="px-2 text-xs text-muted">Notifikasi diblokir di perangkat ini. Izinkan lewat pengaturan situs di browser, lalu buka menu ini lagi.</p>;
  }
  return (
    <div className="w-full">
      <button type="button" onClick={aktifkan} disabled={sibuk} className={`${btnGhost} w-full`}>
        <Bell className="h-4 w-4" />
        {sibuk ? "Mengaktifkan…" : "Aktifkan Notifikasi"}
      </button>
      {k === "gagal" && <p className="mt-1 text-xs text-danger">Gagal mengaktifkan notifikasi. Coba lagi.</p>}
    </div>
  );
}

/** Dipanggil sebelum keluar akun, supaya HP yang dipakai bergantian berhenti menerima notifikasi akun ini. */
export async function lepasPush() {
  try {
    const r = await navigator.serviceWorker?.getRegistration();
    const s = await r?.pushManager?.getSubscription();
    if (!s) return;
    await hapusPushAction(s.endpoint);
    await s.unsubscribe();
  } catch (e) {
    console.error("Lepas langganan push gagal", e);
  }
}
