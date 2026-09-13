import { LayoutDashboard, Wallet, PiggyBank, HandCoins, Users, TreePine, FileText, UserCog, Settings2 } from "lucide-react";

/** `primary: true` items are the mobile bottom bar's 3 tabs; the rest live behind "Lainnya". */
export const NAV_ITEMS = [
  { href: "", label: "Ringkasan", icon: LayoutDashboard, primary: true },
  { href: "/kas", label: "Kas", icon: Wallet, primary: true },
  { href: "/tabungan", label: "Tabungan", icon: PiggyBank, primary: true },
  { href: "/qurban", label: "Qurban", icon: HandCoins, primary: false },
  { href: "/arisan", label: "Arisan", icon: Users, primary: false },
  { href: "/silsilah", label: "Silsilah", icon: TreePine, primary: false },
  { href: "/laporan", label: "Laporan", icon: FileText, primary: false },
  { href: "/anggota", label: "Anggota", icon: UserCog, primary: false },
  { href: "/profil", label: "Profil", icon: Settings2, primary: false },
] as const;
