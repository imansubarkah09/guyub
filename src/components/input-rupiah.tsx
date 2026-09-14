"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const ribuan = new Intl.NumberFormat("id-ID");
const bersihkan = (teks: string) => teks.replace(/\D/g, "");

/**
 * Isian uang yang memasang titik ribuan sambil diketik, walau pengguna
 * mengetiknya tanpa titik: "1500000" tampil jadi "1.500.000".
 *
 * Dua input, bukan satu: yang terlihat bertipe teks (karena `type="number"`
 * tidak bisa menampilkan titik sama sekali), dan yang dikirim ke server adalah
 * input tersembunyi berisi angka polos. Jadi tidak ada satu pun server action
 * yang perlu tahu soal pemisah ribuan.
 *
 * Nilainya dipegang state, BUKAN ditulis langsung ke DOM. Versi pertama menulis
 * `hidden.value` lewat ref, dan nilainya hilang begitu induknya render ulang —
 * di Dana Kegiatan yang barisnya bisa ditambah, dua dari tiga baris terkirim
 * kosong padahal di layar angkanya terlihat benar. Bug diam yang hanya ketahuan
 * dengan membaca isi input tersembunyinya.
 *
 * Konsekuensinya reset bawaan browser tidak lagi cukup (reset tidak menyentuh
 * state React), jadi komponen ini ikut mendengarkan event `reset` milik formnya
 * — itu yang dipakai React sesudah server action selesai.
 */
export function InputRupiah({
  name,
  className,
  placeholder,
  required,
  defaultValue,
}: {
  name: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: number | string | null;
}) {
  const awal = defaultValue === null || defaultValue === undefined ? "" : bersihkan(String(defaultValue));
  const [angka, setAngka] = useState(awal);
  const acuan = useRef<HTMLInputElement>(null);
  const digitSebelumKursor = useRef<number | null>(null);

  useEffect(() => {
    const form = acuan.current?.form;
    if (!form) return;
    const kembalikan = () => setAngka(awal);
    form.addEventListener("reset", kembalikan);
    return () => form.removeEventListener("reset", kembalikan);
  }, [awal]);

  // Controlled input yang memformat ulang tiap ketikan bikin kursor lompat ke
  // ujung. Hitung berapa digit di kiri kursor sebelum reformat, lalu taruh
  // kursor setelah jumlah digit yang sama di string yang sudah diformat.
  useLayoutEffect(() => {
    if (digitSebelumKursor.current === null) return;
    const input = acuan.current;
    if (!input) return;
    const teks = input.value;
    let sisa = digitSebelumKursor.current;
    let pos = 0;
    while (pos < teks.length && sisa > 0) {
      if (/\d/.test(teks[pos])) sisa--;
      pos++;
    }
    input.setSelectionRange(pos, pos);
    digitSebelumKursor.current = null;
  }, [angka]);

  return (
    <>
      <input
        ref={acuan}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        className={className}
        value={angka ? ribuan.format(Number(angka)) : ""}
        onChange={(e) => {
          const posisi = e.target.selectionStart ?? e.target.value.length;
          digitSebelumKursor.current = bersihkan(e.target.value.slice(0, posisi)).length;
          setAngka(bersihkan(e.target.value));
        }}
      />
      <input type="hidden" name={name} value={angka} />
    </>
  );
}
