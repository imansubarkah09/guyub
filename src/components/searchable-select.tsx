"use client";

import { useId, useState } from "react";

/**
 * Dropdown yang bisa diketik/dicari, dibangun dari `<input list>` + `<datalist>`
 * bawaan browser (bukan library combobox baru, project ini tidak punya satu pun
 * terpasang). Opsi biasanya berisi ID (userId, tenantId, dst) yang tidak sama
 * dengan teks yang ditampilkan, jadi input yang terlihat cuma menampung teks
 * pencarian, nilai sesungguhnya dikirim lewat input tersembunyi begitu teks yang
 * diketik cocok persis dengan salah satu label.
 *
 * ponytail: filter substring/prefix-nya ikut perilaku browser (Chrome substring,
 * Firefox prefix), tidak dikontrol manual, itu harga native zero-JS. Kalau nanti
 * butuh highlight/keyboard nav custom, baru upgrade ke combobox penuh.
 */
export function SearchableSelect({
  name,
  options,
  defaultValue,
  emptyLabel,
  placeholder,
  required,
  className,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  emptyLabel?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const listId = useId();
  const semuaOpsi = emptyLabel ? [{ value: "", label: emptyLabel }, ...options] : options;
  const [text, setText] = useState(semuaOpsi.find((o) => o.value === (defaultValue ?? ""))?.label ?? "");
  const cocok = semuaOpsi.find((o) => o.label === text);

  return (
    <>
      <input
        list={listId}
        defaultValue={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        required={required && !emptyLabel}
        autoComplete="off"
        className={className}
      />
      <datalist id={listId}>
        {semuaOpsi.map((o) => (
          <option key={o.value} value={o.label} />
        ))}
      </datalist>
      <input type="hidden" name={name} value={cocok?.value ?? ""} />
    </>
  );
}
