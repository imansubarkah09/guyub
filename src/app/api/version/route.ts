import { NextResponse } from "next/server";

/** Versi deploy yang sedang live (commit GitHub Actions). Tab/PWA yang masih memuat versi lama melihat angkanya beda. */
export function GET() {
  return NextResponse.json({ build: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" }, { headers: { "cache-control": "no-store" } });
}
