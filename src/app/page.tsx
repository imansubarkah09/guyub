import { getSessionUser } from "@/lib/session";
import { TRAKTEER_PAGE_URL } from "@/lib/trakteer";

const FITUR_PERAN = [
  { peran: "Ketua", desc: "Persetujuan tenant, atur pengurus, buka qurban joinan & arisan." },
  { peran: "Bendahara", desc: "Catat kas masuk/keluar, kelola tabungan, catat setoran." },
  { peran: "Sekretaris", desc: "Kelola data anggota & silsilah keluarga, update profil tenant." },
  { peran: "Anggota", desc: "Lihat kas & tabungan transparan, ikut qurban joinan, lihat laporan." },
];

export default async function Home() {
  const user = await getSessionUser();

  return (
    <main>
      <header className="flex items-center justify-between px-4 py-3">
        <span className="font-semibold text-primary">Guyub</span>
        <a
          href={user ? "/dashboard" : "/login"}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {user ? "Dashboard" : "Masuk"}
        </a>
      </header>

      <section className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="text-2xl font-semibold">Kas keluarga, RT, atau paguyuban — rapi tanpa jadi beban sekretaris</h1>
        <p className="mt-3 text-sm text-foreground/70">
          Selama ini catatan kas cuma ada di grup WhatsApp atau buku tulis satu orang — begitu ganti pengurus, riwayatnya ikut hilang.
          Guyub menyimpan kas, tabungan, qurban joinan, dan silsilah keluarga di satu tempat yang bisa dilihat semua anggota, kapan saja.
        </p>
        <a href="/login" className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
          Daftarkan Tenant Anda
        </a>
      </section>

      <section className="mx-auto max-w-md px-4 py-8">
        <h2 className="mb-3 text-center text-lg font-semibold">Mulai dalam 3 langkah</h2>
        <ol className="space-y-2 text-sm">
          <li>1. Ketua daftar tenant (keluarga/RT/paguyuban) dengan akun Google.</li>
          <li>2. Menunggu persetujuan singkat dari pengelola platform.</li>
          <li>3. Undang anggota lewat link WhatsApp — pengurus konfirmasi yang bergabung.</li>
        </ol>
      </section>

      <section className="mx-auto max-w-md px-4 py-8">
        <h2 className="mb-3 text-center text-lg font-semibold">Fitur per peran</h2>
        <ul className="space-y-3 text-sm">
          {FITUR_PERAN.map((f) => (
            <li key={f.peran} className="rounded-md border border-primary/15 p-3">
              <p className="font-medium text-primary">{f.peran}</p>
              <p className="text-foreground/70">{f.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-md px-4 py-8 text-sm text-foreground/70">
        <h2 className="mb-2 text-center text-lg font-semibold text-foreground">Data tenant Anda aman</h2>
        <p>
          Data setiap keluarga, RT, atau paguyuban terisolasi penuh dari tenant lain — tidak ada yang bisa saling
          mengintip. Fitur dasar (kas, tabungan, qurban joinan, arisan, silsilah, laporan) gratis dipakai; fitur
          lanjutan seperti upload bukti transfer dan pembayaran otomatis menyusul untuk tenant yang membutuhkannya.
        </p>
      </section>

      {TRAKTEER_PAGE_URL && (
        <section className="mx-auto max-w-md px-4 py-8 text-center text-sm">
          <p className="mb-2 text-foreground/70">Suka dengan Guyub? Dukung pengembangannya secara sukarela.</p>
          <a href={TRAKTEER_PAGE_URL} target="_blank" rel="noreferrer" className="rounded-md border border-primary/30 px-4 py-2 font-medium text-primary">
            Traktir Kami
          </a>
        </section>
      )}

      <footer className="px-4 py-6 text-center text-xs text-foreground/50">Guyub — {new Date().getFullYear()}</footer>
    </main>
  );
}
