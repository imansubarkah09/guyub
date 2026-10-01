---
target: landing page (src/app/page.tsx)
total_score: 23
max_score: 36
na_heuristics: 7
p0_count: 1
p1_count: 3
target_identity: "file:/home/iman/projects/thedreamcompany-guyub/src/app/page.tsx"
target_fingerprint: "sha256:025e9b2a163832d6a9b1333da45a3acd4b4d99b63a20017ef0d3f75c13e0a04a"
target_path: /home/iman/projects/thedreamcompany-guyub/src/app/page.tsx
timestamp: 2026-09-15T12-08-36Z
slug: src-app-page-tsx
closed: true
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Header correctly swaps Masuk/Daftar for "Dashboard" when a session exists |
| 2 | Match System / Real World | 4 | Domain vocabulary (Kas, Tabungan, Qurban Joinan, RT, paguyuban) used throughout |
| 3 | User Control and Freedom | 2 | "Guyub" wordmark is a bare span, not a Link — clicking the logo does nothing |
| 4 | Consistency and Standards | 2 | Three different labels for the same registration action; "Masuk" repeated 3x |
| 5 | Error Prevention | 3 | No forms on this page itself; Trakteer modal shows code before sending off-site |
| 6 | Recognition Rather Than Recall | 3 | Every screenshot pairs icon+label; role cards self-explanatory |
| 7 | Flexibility and Efficiency | n/a | First-visit persuade surface, no repeat-use path to be flexible about |
| 8 | Aesthetic and Minimalist Design | 3 | Clean palette, but 6 sections repeat identical rhythm with no escalation |
| 9 | Error Recovery | 2 | No forms to fail, but zero anticipatory guidance on the one real ambiguity (approval wait) |
| 10 | Help and Documentation | 1 | No FAQ, no contact link, despite copy raising open questions |
| **Total** | | **23/36** | **Acceptable (64%)** |

## Design Specificity Verdict

**LLM assessment**: Genuinely authored for this audience, not a re-skinned template. The hero subhead ("Selama ini catatan kas cuma ada di grup WhatsApp atau buku tulis satu orang...") names a real, specific failure mode of RT/family cash-keeping. Role breakdown (Ketua/Bendahara/Sekretaris/Anggota) mirrors real community-org structure. The page STRUCTURE (hero+CTA → 3 steps → screenshot grid → role cards → trust → donation → footer) is generic SaaS skeleton, but the content poured into it is specific enough to read as "Guyub," not "any startup."

**Deterministic scan**: `impeccable detect` returned zero findings on `page.tsx` and `trakteer-modal.tsx`. Treat this as "no violations of this specific ruleset," not a clean bill of health — manual review below found real, concrete issues the scan didn't catch (this pattern held across all three pages critiqued in this run).

**Browser evidence**: Live Playwright pass completed (before the local dev server was killed by host memory pressure) confirmed zero horizontal overflow at 1280px/390px, all 4 phone-mockup images loaded correctly (no broken images), and zero console errors. Contrast was independently verified two ways — live-measured AND computed from `globals.css` tokens — and both landed on the exact same numbers, cross-validating the finding below.

## Overall Impression

The copy and structure are genuinely well-crafted for this specific audience, but the color system has a real, measurable AA failure baked into the design token itself, not just one button — and the mobile "Masuk" link is smaller than even the lenient WCAG minimum tap target. Biggest opportunity: fix `--primary` at the token level (one change, cascades correctly everywhere) and add a persistent CTA path for mobile scrollers.

## What's Working

1. **Hero subhead's specific pain narrative** — authentic, not templated; names WhatsApp/notebook bookkeeping and leadership-change data loss precisely.
2. **Role-based feature cards** — lets a visitor self-locate (which role am I?) instead of parsing a generic feature list.
3. **Real product screenshots with descriptive alt text, all verified loading correctly** — builds credibility, helps screen readers, and (confirmed via live check) never fails to load.

## Priority Issues

**[P0] The `--primary` color token fails AA contrast everywhere it's used as text**
- Why it matters: measured at exactly 3.85:1 (both live-rendered and computed from CSS tokens — they agree). This isn't one button's problem: it fails identically on the primary CTA ("Daftarkan Tenant Anda"), the header "Daftar"/"Dashboard" button, the footer brand wordmark, all four role labels (Ketua/Bendahara/Sekretaris/Anggota), and the "Traktir Kami" button. WCAG AA requires 4.5:1 for normal text.
- Fix: darken `--primary` (e.g. toward `#a8541f`) or lighten `--primary-foreground`, then re-verify the whole palette in one pass since every one of these six usages shares the same two tokens.
- Suggested command: /impeccable audit (contrast-focused) or /impeccable colorize

**[P1] Header "Masuk" link tap target is 60.9×20px — fails even WCAG's lenient 24×24 minimum**
- Why it matters: measured via live `boundingBox()`. The className has no vertical padding, so the tap box is just the 14px line-height. This is the login link for returning users on a mobile-first PWA.
- Fix: add vertical padding (e.g. `py-2`) to match the adjacent "Daftar" button's height (36px).
- Suggested command: /impeccable adapt

**[P1] No persistent CTA path once a mobile visitor scrolls past the hero**
- Why it matters: "Daftarkan Tenant Anda" appears exactly once, in the hero. A distracted one-handed mobile user (Casey persona) who scrolls has no easy way back without scrolling all the way up.
- Fix: sticky bottom CTA bar (safe-area aware) once the hero scrolls out of view, or repeat the button after the role/trust sections.
- Suggested command: /impeccable layout

**[P1] Trust/reassurance signal arrives too late relative to the highest-anxiety moment**
- Why it matters: "Data tenant Anda aman" is section 5 of 6, well after step 2's "Menunggu persetujuan singkat dari pengelola platform" — which states no timeframe, no named contact, no fallback. Registering a tenant is a one-time, high-commitment action for a whole community; the reassurance a hesitant elder-treasurer needs arrives after the anxiety, not alongside it.
- Fix: move a condensed trust line ("data terisolasi penuh, fitur dasar gratis") directly under the hero CTA or inline with step 2.
- Suggested command: /impeccable clarify

**[P2] Inconsistent CTA copy (3 different labels) and a dead logo-to-home affordance**
- Why it matters: "Daftar" / "Daftarkan Tenant Anda" used interchangeably for the same action muddies the "this is one action" model; the "Guyub" wordmark is a bare `<span>`, not wrapped in `Link href="/"`, breaking the universal logo-returns-home convention.
- Fix: standardize on one CTA phrase site-wide; wrap the logo in `Link`.
- Suggested command: /impeccable clarify

## Persona Red Flags

**Jordan (First-Timer)**: The CTA itself uses bare SaaS jargon "Tenant" with no plain-language gloss right on the button (the keluarga/RT/paguyuban explanation lives in a different paragraph above). Step 2's "pengelola platform" and "singkat" are undefined, with no FAQ to check. Clicking the "Guyub" logo (the universal "reset/go home" instinct) does nothing.

**Riley (Stress Tester)**: Both the CTA text and all four role labels measure ~3.85:1 against the background — fails WCAG AA immediately under any accessibility audit. The footer copyright/legal line measures even worse, 3.06:1. Three redundant "Masuk" links (header, footer "Produk" column, footer bottom row) all point to the identical destination.

**Casey (Distracted Mobile User)**: No sticky/bottom CTA after the hero — the only way back to registering is the top-right header "Daftar" (a known hard-to-reach thumb zone on tall phones) or scrolling all the way back up. The header "Masuk" link's 20px-tall tap target is also genuinely hard to hit one-handed.

## Minor Observations

- Footer copyright text and the duplicate bottom "Masuk" link use `text-foreground/50`, computing to 3.06:1 contrast — worse than the primary-token issue above, on the least-noticeable text tier.
- Next.js itself flagged (via console) that the first mockup image is the LCP candidate and should use `loading="eager"` — a legitimate, free performance win.
- No FAQ or contact link addresses either ambiguity the copy itself raises: approval wait time, or what happens to currently-free features once paid ones launch.
- The page's last content block before the footer is a donation ask ("Suka dengan Guyub? Dukung pengembangannya...") rather than a reinforced CTA or final reassurance — per the peak-end rule, this is a strange final beat for a Persuade-mode page aimed at people who haven't signed up yet.
- Six sections in a row share the identical "centered h2 + paragraph + card list" rhythm, flattening well before the footer.

## Questions to Consider

- Step 2 promises only a "singkat" (brief) approval wait — if that wait is ever longer, or a tenant is rejected, what happens to a first-time Ketua's trust, and why isn't that addressed anywhere on the page meant to convince them to commit?
- The whole page argues the pain of WhatsApp/notebook bookkeeping but never argues why switching is worth the behavior-change cost for a group of non-technical elders who've "made it work" for years — where's the objection-handling?
- Is ending the scroll journey on a tip-jar request, instead of reinforcing the registration CTA, the right closing note for a page whose entire job is conversion?
