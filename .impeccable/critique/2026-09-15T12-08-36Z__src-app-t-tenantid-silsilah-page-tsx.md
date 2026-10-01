---
target: silsilah keluarga (/t/[tenantId]/silsilah)
total_score: 16
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:/home/iman/projects/thedreamcompany-guyub/src/app/t/[tenantId]/silsilah/page.tsx"
target_fingerprint: "sha256:6398b88989e76cb46f1841af2c6c850e9de32ba37d9b537b44233de893100003"
target_path: /home/iman/projects/thedreamcompany-guyub/src/app/t/[tenantId]/silsilah/page.tsx
timestamp: 2026-09-15T12-08-36Z
slug: src-app-t-tenantid-silsilah-page-tsx
closed: true
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | Only a spinner-text on submit; no toast/confirmation after successful add/edit/delete |
| 2 | Match System / Real World | 1 | "Leluhur tertinggi", raw "Anak ke-" ordering, validation-engine-style error phrasing |
| 3 | User Control and Freedom | 1 | Delete has zero undo/soft-delete despite being emotionally weighted and irreversible |
| 4 | Consistency and Standards | 2 | Uses shared Card/Badge/inputClass, but inline edit form uses raw untyped classes instead |
| 5 | Error Prevention | 2 | Good server-side scope + cycle guards, but the affordance gap below undermines this |
| 6 | Recognition Rather Than Recall | 2 | In-context option labels are good, but no visual cue for why some names are hidden |
| 7 | Flexibility and Efficiency | 2 | Search + "my tree first" default are efficient touches |
| 8 | Aesthetic and Minimalist Design | 2 | Dense inline row mixes badge+name+edit+spouse+account note in one wrapped span |
| 9 | Error Recovery | 2 | Error copy is specific and actionable where it appears, but delivery path is unconfirmed |
| 10 | Help and Documentation | 0 | Zero in-page explanation of the new self-service scoping rule anywhere in the UI |
| **Total** | | **16/40** | **Poor (40%)** |

## Design Specificity Verdict

**LLM assessment**: This reads as generic CRUD-list boilerplate wearing a tree costume, not a design authored for "this is my family, some of them are dead, some I've never met." A family member is rendered as one `<span>` with inline edit/Hapus text links — visually indistinguishable from a settings row in an admin panel. No person-card affordance, no living/deceased distinction (a real gap for a family-tree feature in Indonesian culture where that distinction is customarily marked), no relationship-label in the read view beyond nesting depth and a "⚭" glyph for spouse — which is the one genuinely nice domain-specific touch in the whole page.

**Deterministic scan**: `impeccable detect` returned zero findings on `page.tsx` and `node-row.tsx` — as with the other two pages, this is "nothing this ruleset checks for," and the manual pass below found several concrete, independently-confirmed gaps the scan missed entirely.

**Static markup pass + live-evidence limitation**: browser evidence correctly unobtainable (real Google OAuth required, no dev-login bypass, headless Google login blocked). Both independent assessments — the LLM design review and the detector/evidence pass — separately flagged the exact same issue with the disabled "Hapus" button, which is strong cross-validation: it renders as a plain `<span title="...">`, not a disabled `<button>`. `title` tooltips don't fire on touch/mobile and aren't reliably announced by screen readers — on a mobile-first PWA whose audience includes elderly relatives, this is the single explanation mechanism for "why can't I delete this," delivered through a channel largely unavailable to the app's own target users.

## Overall Impression

The newly-shipped self-service scoping (any linked member can edit their own lineage, not just admins) is server-side correct — verified directly against the code — but the UI never explains the concept exists, and the edit affordance itself doesn't respect the boundary it's supposed to communicate: a regular member sees a live "edit" link on every name in the entire tenant tree, not just their own line, and only discovers a rejection after filling out the form and submitting. This is exactly the "why is this editable-looking thing not actually editable" confusion the access-control change risked, now confirmed in the shipped code.

## What's Working

1. **`computeScope`/`isReferenceable`** correctly filter *both* the dropdown options and server-side authorization from the same source of truth — good error-prevention-by-omission design where it's applied.
2. **The P2002 spouse-race condition** is caught and translated into a specific, actionable Indonesian message instead of a generic 500 — real craft, with code comments showing it was learned from a production incident.
3. **"Menampilkan pohon keluarga Anda" default view** + "Lihat semua pohon" toggle is a genuinely good default — a member sees their own branch first, not an undifferentiated flat list of the whole tenant.

## Priority Issues

**[P0] The edit affordance is visible on every node tenant-wide, not just a member's own scope — verified directly against the shipped code**
- Why it matters: `canKelola` is computed once per page (`pengurus || scope !== null`) and passed identically to every node's `Branch`/`NodeRow`. A regular member sees a live "edit" link next to a total stranger's grandmother, can open the full inline edit form, fill it out, and only gets rejected by the server *after* submitting (`updateFamilyNodeAction`'s `scope.has(nodeId)` check). No data is actually at risk — the server-side gate is correct — but this is a broken-looking affordance on the exact feature this session shipped, and it's the direct cause of the "confused, thinks the app is broken" outcome.
- Fix: pass the already-computed `scope` down to `Branch`, and only render the edit link when `pengurus || scope.has(node.id)` — same data already available, just also applied to what's rendered, mirroring the filtering already done for `pilihanRelasi`.
- Suggested command: /impeccable harden

**[P0] Disabled "Hapus" state has no accessible affordance**
- Why it matters: independently flagged by both assessments. It's a plain `<span title="...">`, not a `disabled` button — not focusable, `title` isn't reliably announced by screen readers, and doesn't appear at all on touch/mobile (no hover). The one explanation for "why can't I delete this" is delivered through a channel unavailable to this app's own target users (mobile-first, includes elderly relatives).
- Fix: keep it visually muted, but add visible inline caption text under the row (e.g. "Lepas pasangan/anak dulu untuk menghapus") instead of tooltip-only, plus `aria-disabled` semantics.
- Suggested command: /impeccable harden

**[P1] Zero in-page explanation of the new scoping rule anywhere in the UI**
- Why it matters: this is a brand-new permission model shipped with no onboarding copy. A member editing their own grandfather successfully, then failing (silently, via absent dropdown options or a rejected submit) on a neighbor's branch, has no way to understand why.
- Fix: one line of help text under the "Tambah Anggota Silsilah" heading, e.g. "Anda bisa menambah/mengubah anggota di garis keturunan Anda sendiri... Untuk keluarga lain, hubungi pengurus." Reuses existing Card/EmptyState styling.
- Suggested command: /impeccable clarify

**[P1] Unbounded recursive tree rendering with no depth cap and no cycle guard**
- Why it matters: `<details open>` is hardcoded unconditionally at every depth, so a large multi-generation tree renders its entire DOM expanded on first load — the same category of "unbounded render" issue this project's own history (per its build notes) has already been burned by elsewhere. `Branch`'s recursion also has no cycle guard, unlike the sibling `akarDari` function in the same file, which explicitly tracks a `seen` Set — an inconsistent defensive posture for the same kind of tree-walk.
- Fix: cap default-open depth (e.g. only the first 2 levels open by default), and add the same `seen`-set guard to `Branch` that `akarDari` already uses.
- Suggested command: /impeccable optimize

**[P2] Technical jargon leaks into user-facing Indonesian error strings**
- Why it matters: "tenant" (internal multi-tenancy term) appears untranslated in four error messages a family member would read (e.g. "Akun itu bukan anggota aktif tenant ini"); one message also leaks the raw English field name "parent" ("...edit parent-nya...") inconsistently with every other message in the same file, which correctly says "orang tua."
- Fix: replace "tenant" with "grup/komunitas ini" in user-facing strings; fix the one "parent" leak to match the file's own established pattern.
- Suggested command: /impeccable clarify

## Persona Red Flags

**Jordan (First-Timer)**: The "you don't have a position yet" banner instructs them to "tautkan akun" (link an account) — fairly technical phrasing for someone who doesn't know what that means. After being added, tries to edit a relative one branch over that happens to be out of their scope by chance of who's linked — the edit link is fully visible and clickable (P0 above), they fill the form, hit Simpan, and get a raw thrown-Error string with zero prior warning. Nothing in the UI ever taught them the scope concept exists at all.

**Riley (Stress Tester)**: Option lists for a regular member silently include "stub" nodes (no relations at all) that *anyone* scoped can reference — there's no ownership/claiming step, so two unrelated members could independently attach the same free-floating stub as their own ancestor, producing a confusing "someone already added my grandpa and now it's in their scope, not mine" scenario, undocumented anywhere.

**Sam (Accessibility-Dependent)**: The entire interactive row is one `inline-flex flex-wrap` span mixing a badge, plain text, an edit link, spouse text, and conditional badges — a screen reader hears a flat stream of fragments with no relational structure (no grouping relating "name" to "spouse" to "edit control"). The disabled Hapus's `title`-only explanation (P0 above) means Sam gets zero explanation, worse than sighted users even with the tooltip.

## Minor Observations

- A node linked to an account shows `(user.name)` next to the family-tree `nama` — if they differ (nickname vs. formal name), this could read as confusing duplication with no explanation.
- The "anak ke-" ordering field has no validation preventing duplicate values across siblings; ties are silently broken by name.
- Search does not respect scope — a regular member can find and view names in branches they cannot edit, which is likely intentional (view access broader than edit access) but is never stated.
- Parent/spouse pickers are plain `<select>` elements with no search — fine at small tenant sizes, but would need a `<datalist>` or filter-as-you-type (no new dependency needed) if any tenant approaches 30-40+ people.
- Success feedback after add/edit/delete is entirely silent (`revalidatePath` just redraws the list) — no toast/confirmation banner.

## Questions to Consider

- If view access to the whole tenant's tree is unrestricted (any member can search/browse every branch) but edit access is scoped, is privacy actually the goal here, or is it purely about preventing accidental edits to data you don't understand — and shouldn't the UI say so explicitly rather than leaving users to reverse-engineer a privacy model that doesn't actually exist for reading?
- Given that any scoped member can claim a disconnected "stub" node as their own ancestor with no claiming step, what stops two unrelated family branches from building against the same accidentally-shared stub?
- Is a flat `<select>` of every referenceable name really how a non-technical elderly user is expected to find one relative among dozens, or was search/autocomplete knowingly deferred — and if so, is that tracked anywhere?
