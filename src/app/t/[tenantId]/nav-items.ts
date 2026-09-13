import {
  LayoutDashboard,
  Wallet,
  PiggyBank,
  HandCoins,
  HeartHandshake,
  Receipt,
  CalendarDays,
  CircleDollarSign,
  TreePine,
  FileBarChart,
  Users,
  Settings2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Tampil di bottom bar mobile (§4: 4-5 menu tersering), sisanya masuk "Lainnya". */
  primary?: boolean;
  /** Hanya untuk role tertentu — saat ini cuma Profil Tenant (ketua). */
  ketuaOnly?: boolean;
};

export type NavGroup = { label: string | null; items: NavItem[] };

/** Kategorisasi wajib §6 — jangan kembalikan ke 9 menu flat sejajar. */
export const NAV_GROUPS: NavGroup[] = [
  { label: null, items: [{ href: "", label: "Ringkasan", icon: LayoutDashboard, primary: true }] },
  {
    label: "Keuangan",
    items: [
      { href: "/kas", label: "Kas", icon: Wallet, primary: true },
      { href: "/tabungan", label: "Tabungan", icon: PiggyBank, primary: true },
      { href: "/qurban", label: "Qurban", icon: HandCoins },
      { href: "/infaq", label: "Infaq & Shodaqoh", icon: HeartHandshake },
      { href: "/kegiatan", label: "Dana Kegiatan", icon: Receipt },
    ],
  },
  {
    label: "Arisan",
    items: [
      { href: "/arisan", label: "Status Bayar & Saldo", icon: CircleDollarSign, primary: true },
      { href: "/arisan/jadwal", label: "Jadwal Pertemuan", icon: CalendarDays },
    ],
  },
  { label: null, items: [{ href: "/silsilah", label: "Silsilah Keluarga", icon: TreePine }] },
  { label: null, items: [{ href: "/laporan", label: "Laporan", icon: FileBarChart }] },
  { label: null, items: [{ href: "/anggota", label: "Anggota & Undangan", icon: Users }] },
  { label: null, items: [{ href: "/profil", label: "Profil Tenant", icon: Settings2, ketuaOnly: true }] },
];

export const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);
