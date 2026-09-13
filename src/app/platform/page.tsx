import { redirect } from "next/navigation";

/** Approval tenant pindah ke /admin (§7.1) — biar tidak ada dua tempat yang bisa drift. */
export default function PlatformPage() {
  redirect("/admin");
}
