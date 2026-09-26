"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Bungkus hero: begitu section hero (dan CTA utamanya) lewat scroll, muncul
 * bar CTA sticky di mobile biar pengunjung yang scroll satu tangan nggak
 * harus balik ke atas buat daftar (ketemu review 15 Sep 2026, persona Casey).
 * Desktop tidak perlu ini, CTA header sudah selalu kelihatan di sana.
 */
export function HeroWithStickyCta({ children }: { children: React.ReactNode }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [terlihat, setTerlihat] = useState(false);

  useEffect(() => {
    const target = heroRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setTerlihat(!entry.isIntersecting), { threshold: 0 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={heroRef}>{children}</div>
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-sm transition-transform duration-300 ease-out lg:hidden ${
          terlihat ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <Link
          href="/register"
          className="block w-full rounded-md bg-primary px-6 py-3 text-center text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          Daftarkan Tenant Anda, Yuk
        </Link>
      </div>
    </>
  );
}
