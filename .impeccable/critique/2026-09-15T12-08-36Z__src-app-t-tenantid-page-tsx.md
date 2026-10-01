---
target: tenant dashboard (/t/[tenantId])
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/home/iman/projects/thedreamcompany-guyub/src/app/t/[tenantId]/page.tsx"
target_fingerprint: "sha256:7645312ac1800836d41fd766ab4dadeda3b981b4465731ac1b4561cee310d5f5"
target_path: /home/iman/projects/thedreamcompany-guyub/src/app/t/[tenantId]/page.tsx
timestamp: 2026-09-15T12-08-36Z
slug: src-app-t-tenantid-page-tsx
closed: true
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Tone is hardcoded, not data-driven — Saldo Kas always "primary" even if negative |
| 2 | Match System / Real World | 3 | Great domain vocabulary, but "Donatur" (platform) collides with "Infaq" (tenant) |
| 3 | User Control and Freedom | 3 | Read-only page, nothing to undo; no violations found |
| 4 | Consistency and Standards | 2 | Three different empty-state strategies coexist on one page |
| 5 | Error Prevention | 2 | No visual warning for negative/critical kas balance |
| 6 | Recognition Rather Than Recall | 3 | Nav groups labeled, checklist gives direct deep links |
| 7 | Flexibility and Efficiency | 2 | `PageTitle` supports an action slot but dashboard passes none — zero quick actions |
| 8 | Aesthetic and Minimalist Design | 2 | ~8 stacked content blocks compete on first load |
| 9 | Error Recovery | 3 | `error.tsx` is genuinely well done — localized, filtered stack traces, retry + escape hatch |
| 10 | Help and Documentation | 1 | No tooltips anywhere — "Nyawa Platform", "Plerek" rely on the user just knowing |
| **Total** | | **23/40** | **Acceptable (58%)** |

## Design Specificity Verdict

**LLM assessment**: Strongly domain-authored where it counts — kas, arisan (putaran/giliran), qurban (with gamified per-name messages like "Widodo & Arif sudah lunas, masih menunggu 5 orang lagi"), infaq/shodaqoh, silsilah, WA-based onboarding. This is not generic admin-dashboard boilerplate. However, the top of the dashboard is dominated by a feature (NyawaBar + Trakteer donor leaderboards) that serves the **platform owner's monetization/sustainability need**, not the treasurer's actual job-to-be-done of "check my tenant's money." That's over-fit to the business model and under-fit to the end user on this specific screen — a real specificity foul in the opposite direction from the usual "too generic" complaint.

**Deterministic scan**: `impeccable detect` returned zero findings across `page.tsx`, `layout.tsx`, `tenant-shell.tsx`. As with the other two pages in this run, treat this as "nothing this ruleset checks for," not a clean bill of health.

**Static markup pass** (browser evidence unavailable — see below): found 2 confirmed color-only navigation active-states with no `aria-current` (`tenant-shell.tsx:100`, `:108`, `:148-150`) — these affect every page in the app, not just this one, since `tenant-shell.tsx` is the persistent shell. Also found same-file spacing inconsistencies (`gap-1`/`gap-1.5`/`gap-2` mixed for structurally identical icon+text groupings).

**Live-evidence limitation**: this route requires a real Google OAuth session; this app has no dev-login bypass and automated Google login is blocked by Google itself. No browser/visual evidence was obtainable — all findings are from reading JSX/Tailwind source. Structural/logic findings (missing headings, hardcoded tone, nav item counts) are high-confidence; exact visual rendering (perceived density, spacing) is lower-confidence.

## Overall Impression

The dashboard's content order inverts whose problem it's solving: a volunteer treasurer opening this screen to check tenant funds sees platform-subscription health and donor leaderboards before their own kas balance — on a brand-new tenant, that's a jarring red "Masa aktif habis" badge as the very first thing on screen. Biggest opportunity: reorder so the tenant's own financial summary leads, and make its tone data-driven (green/red) instead of hardcoded.

## What's Working

1. **`pesanGamifiedQurban`** generates natural, personalized Indonesian sentences naming who has paid — genuinely delightful, not a generic progress bar.
2. **"Tugas Anda" checklist** is computed live from real data conditions (missing phone, missing silsilah node, unpaid arisan) rather than static onboarding copy, and every item deep-links straight to the fix.
3. **`loading.tsx`/`error.tsx`** are unusually mature — skeleton fallback inside the persistent shell, error boundary that filters raw stack traces and offers retry + escape hatch.

## Priority Issues

**[P0] Money hierarchy is inverted, and it's actively alarming for new tenants**
- Why it matters: `NyawaBar` and two `DonaturList` (Trakteer platform donors) render *before* the Saldo Kas/Infaq/Qurban/Arisan stat grid. On a zero-data tenant, this shows a red "Masa aktif habis" danger badge as the first thing on screen — the platform's own billing concern surfacing above the community's financial summary, on the one screen whose job is "show tenant status."
- Fix: move the stat-card grid above `NyawaBar`/donor lists; soften or suppress the "danger" tone for tenants that have simply never been supported yet versus tenants whose paid period actually lapsed.
- Suggested command: /impeccable layout

**[P1] "Donatur" vocabulary collision**
- Why it matters: `DonaturList` headers "Donatur Terbaru"/"Donasi Terbesar" (Trakteer app-supporters) sit one screen from "Infaq & Shodaqoh" (the tenant's own charity fund). Non-technical members will plausibly read these as the same thing — a real trust risk on a money-accuracy screen.
- Fix: rename to "Pendukung Aplikasi"/"Dukungan untuk Guyub" and visually separate from the tenant financial-stat section.
- Suggested command: /impeccable clarify

**[P1] No negative/critical-balance signaling**
- Why it matters: Saldo Kas `StatCard` always uses `tone="primary"`, and `saldoKas` can go negative. A negative cash balance is exactly the emergency a treasurer needs surfaced instantly; it currently looks identical to a healthy balance.
- Fix: pass `tone="danger"` when the balance is negative (same for Infaq).
- Suggested command: /impeccable harden

**[P1] Primary navigation active-state is color-only, app-wide**
- Why it matters: bottom-nav and sidebar active states (`tenant-shell.tsx:100`, `:108`, `:148-150`) distinguish the current page only by text color/background fill, with no `aria-current="page"` anywhere. This is the persistent shell wrapping every tenant page, not just the dashboard — a screen-reader user gets no signal of current location anywhere in the app.
- Fix: add `aria-current={isActive ? "page" : undefined}` to the active nav link/button in all three locations.
- Suggested command: /impeccable audit

**[P2] Financial summary section has no heading, unlike every sibling section**
- Why it matters: the stat-card section has no `<h2>`, while "Progress Qurban", "Tugas Anda", and "Tabungan Anda" all get one — a screen-reader user navigating by heading list skips past the single most important content block on the page.
- Fix: add `<h2 className="sr-only">Ringkasan Keuangan</h2>`.
- Suggested command: /impeccable audit

## Persona Red Flags

**Alex (Power User)**: Must scroll past `NyawaBar` + 2 donor-list cards before reaching Saldo Kas. `PageTitle`'s unused `action` slot means zero quick-action shortcuts ("catat transaksi", "bayar arisan") from the dashboard itself — every action requires a full nav trip. All 4 StatCards share identical visual weight, so Alex must read every label to find the one he cares about.

**Sam (Accessibility-Dependent)**: The financial stat-card section has no heading — tabbing by heading list skips the most important numbers on the page entirely. `Progress` is a bare styled `<div>` with no `role="progressbar"`/`aria-valuenow` — qurban completion percentage is invisible to a screen reader. The app-wide nav active-state gap (above) means Sam never gets a location cue anywhere in the shell.

**Jordan (First-Timer)**: "Nyawa Platform" is an unexplained metaphor requiring reading fine caption text to understand. Given the adjacent "Infaq & Shodaqoh" card, he can easily mistake "Donatur Terbaru" for his own community's charity records. "Plerek" (a nav label) has zero tooltip or explanation. The checklist gives "belum bayar arisan" (a financial obligation to peers) and "lengkapi nomor WhatsApp" (housekeeping) identical yellow-warning styling with no way to tell which matters more.

## Minor Observations

- The "Keuangan" nav group has 7 flat items in one list — exceeds the ≤4 chunking guideline the code's own comment claims to have already fixed.
- `loading.tsx`'s skeleton shape (title → 4-grid → 4 rows) doesn't match the real content order (title → NyawaBar → donor grid → 4-grid...), so real content visibly "jumps" into a different shape than what was previewed.
- Arisan StatCard `sub` text hardcodes `tone="success"` regardless of actual saldo/participation state.
- `sayaIkutQurban` is awaited serially after the main `Promise.all` rather than folded into it — an avoidable latency add in a codebase that already tracks per-request query counts closely.
- Same-file spacing inconsistencies: `tenant-shell.tsx` mixes `gap-2`/`gap-1.5`/`gap-1` for the same "icon next to text" pattern; `page.tsx:125` uses `gap-1.5` where three sibling instances of the same pattern use `gap-2`.
- A full-viewport invisible mobile-drawer scrim is implemented as a real, focusable `<button>` — accessible, but an unusual tab-order inclusion for what's usually a non-focusable overlay.

## Questions to Consider

- Why does the screen whose entire purpose is "show my tenant's financial status" spend its first two content blocks on the platform's subscription health and donor leaderboard rather than the tenant's own kas? Whose dashboard is this really for?
- Since `saldoKas` can mathematically go negative, why does nothing on this screen visually distinguish "we're fine" from "we're in trouble"?
- Is it intentional that "add your WhatsApp number" and "you haven't paid this round's arisan" render as the identical yellow-warning card — should a financial obligation to other members carry the same visual urgency as a profile nudge?
