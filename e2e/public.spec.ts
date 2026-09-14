import { test, expect } from "@playwright/test";

// Cuma 4 halaman ini yang bisa diuji tanpa sesi asli: login Google tidak bisa
// diotomasi (lihat CLAUDE.md). Semua halaman /t/[tenantId]/* di luar cakupan
// ini — server redirect ke /login sebelum kontennya sempat dirender.
const HALAMAN_PUBLIK = ["/", "/login", "/register", "/cari"];

for (const path of HALAMAN_PUBLIK) {
  test(`${path}: render tanpa error, tanpa overflow horizontal`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    const res = await page.goto(path);
    expect(res?.ok()).toBeTruthy();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `lebar konten ${path} melebihi viewport sebesar ${overflow}px`).toBeLessThanOrEqual(1);

    expect(errors, `console/page error di ${path}: ${errors.join("; ")}`).toEqual([]);
  });
}

test("landing page: link Masuk & Daftar ada dan bisa diklik", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Masuk" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Daftar" }).first()).toBeVisible();
});

test("navigasi back/forward browser (ini yang dipicu gesture swipe-back Chrome Android)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Masuk" }).first().click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);

  await page.goForward();
  await expect(page).toHaveURL(/\/login$/);
});

test("manifest PWA valid & ikonnya bisa diakses", async ({ page }) => {
  const res = await page.request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();

  expect(manifest.name).toBeTruthy();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons?.length).toBeGreaterThan(0);

  for (const icon of manifest.icons as { src: string }[]) {
    const iconRes = await page.request.get(icon.src);
    expect(iconRes.ok(), `ikon ${icon.src} tidak bisa diakses`).toBeTruthy();
  }
});

test("service worker terdaftar & aktif", async ({ page }) => {
  await page.goto("/");
  const aktif = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return null;
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active;
  });
  expect(aktif).toBe(true);
});
