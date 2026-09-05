# CLAUDE.md — augustineevents.com

Context and working instructions for Claude Code on this repository.

> **Verified 2026-09-05** against the repo, the live site, the Cloudflare API, and
> the Workers Builds configuration.
> This is a Cloudflare Worker, not GitHub Pages and not Cloudflare Pages. As of
> 2026-09-05 it deploys from git; before that it was hand-uploaded.
> Do not trust an unverified claim in this file over what production actually returns.
> This document has been confidently wrong before.

---

## What this is

The marketing website for **Augustine Music & Events**, a Nashville wedding music and event rental business run by Becca Augustine (violinist and vocalist) and Justin Brown (keys, guitar, operations).

Hand-written static HTML. No build step, no framework, no package.json. Each page carries its own `<style>` block inline.

**Hosting is a Cloudflare Worker, not GitHub Pages.** As of 2026-09-05 it deploys automatically from `main` via Workers Builds. See "Deployment" below before touching anything deploy-related.

A booking system is planned as a separate Next.js project. This repo stays static until that migration. Do not add a build step, framework, or bundler here.

---

## READ FIRST: pushing to `main` now deploys

**Changed 2026-09-05.** This repository is connected to production. A push to `main`
builds and deploys the live site. That was not true before this date, and the
warnings that used to fill this section are now obsolete.

What changed, in order:

1. The 16 files that existed only on the Worker were recovered, verified byte for
   byte against production, and pushed. `main` reproduces production exactly.
2. `wrangler.jsonc` and `.assetsignore` were added so deploys come from this repo.
3. Workers Builds was connected to `Beccaxlynn93/augustineevents` by the repo owner.

**Consequences:**

- **A push to `main` is a production deploy.** Use the staging workflow below for
  anything that should be looked at first.
- A push to any other branch uploads a version and gives it a preview URL. It does
  not touch production.

**Still true, and still the way this can break:** Cloudflare's asset store is
upload-only. No API reads files back out of the Worker. If anyone hand-uploads
through the dashboard again, the drift returns and is invisible from inside this
repo. To check production, mirror it over HTTP.

**Verify before assuming.** `curl -sSI https://augustineevents.com/` costs nothing.

---

## Repository structure

### Real pages (6)

| File | Purpose |
|---|---|
| `index.html` | Homepage. Full-screen hero. |
| `about.html` | Becca's bio. |
| `services.html` | Service overview. |
| `event-music.html` | Music packages. |
| `event-rentals.html` | Rental catalog. The largest and most important page. |
| `contact.html` | Inquiry form. Depends on EmailJS, see below. |

### Real assets in the repo

- `HeyLovely.ttf` — licensed display font, self-hosted. The only referenced font file.
- `Photographer photos/` — 14 rental JPGs, 42-99 KB each, roughly 780-1200px wide,
  ~0.96 MB total. Recovered from production 2026-09-03. **Referenced by
  `event-rentals.html` and working in production.**
- `hero 1.jpg` — 1920x1080, 1.7 MB. Hero background for `index.html` and `contact.html`.
  Recovered 2026-09-03.
- `608A5063.jpg` — music package photo on the homepage. **1400x2100, 958 KB.**
  Resized 2026-09-05 from a 3648x5472 / 11.96 MB Canon EOS R6 original, a 92%
  reduction. The full resolution original remains in git history. `.pkg-card` uses
  `object-fit: cover` in a two column grid, so width is the binding dimension.
- `romantic music and intimate wedding rentals.png` — 1366px, used by `index.html`.
  **Do not delete**; it is easy to mistake for junk.
- `Screenshot 2026-03-25 194905 / 194925 / 194933 / 194941.png` and
  `Screenshot 2026-03-26 190035.png` — interior page hero backgrounds, still in use.
  Low resolution, see Known issues.
- `CNAME` — contains `www.augustineevents.com`, a hostname that **does not resolve**.
  Vestigial; GitHub Pages is not serving this site. See Deployment.
- `Photographer photos/Faux Floral Arrangements.jpg` — 1000x1000, 279 KB. Added
  2026-09-05. Full frame width preserved, cropped only top and bottom, because
  `.item-card img` crops with `object-fit: cover` and the sides must not be lost.
- `Augustine Wedding Rentals Catalog.pdf` — **served in production** (confirmed 200,
  2026-09-05) though no page links it. Do not delete; it may be linked externally.
- `Becca Website.jpg` and `Screenshot 2026-03-25 203402 / 194914.png` — **served in
  production** despite being referenced by no page. Kept in the asset upload set so
  existing URLs keep working.
- `wrangler.jsonc` and `.assetsignore` — deploy configuration. See Deployment.
- `.gitignore` — ignores `*.zip` and `.DS_Store`. Added 2026-09-03 so the 147 MB working
  archive cannot be committed by accident.

### Third-party dependency

`contact.html` loads **EmailJS** from jsDelivr and is the site's only conversion path:

```
line   8: <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js">
line   9: emailjs.init('_gnvsXbH1iYymclUs')
line 387: emailjs.send('service_i7u4b0s', 'template_qqheek4', ...)
```

Those three identifiers are **publishable by design** for EmailJS and are not secrets.
Do not "fix" them by moving them to env vars; there is no server to read env vars from,
and removing them breaks the contact form. There are no real secrets in this repo and
it should stay that way.

### Junk to delete

Roughly 40 files from an accidental browser "Save Page As" commit. Not referenced by any real page:

- `saved_resource.html`, `saved_resource(1).html`, `saved_resource`
- everything ending in `.js.download` (includes `gtm.js.download`)
- hashed stylesheets matching `*.ltr.css`, plus `9ebe5bfcf37fcce0d8e45969bcd8e089.css`
- `edb7c4ff061bab89.ltr.css+dc4946096a210ac2.ltr.css+f7688c2d15a1efc4.ltr.css`
- `t.webp`, `width_1109`, `749002f5a04f784cc1802d77d2fed423.svg`
- `vcd15cbe7772f49c399c6a5babf22c1241717689176015`
- `Augustine Music Packages.html` and its `_files` references
- `Hey Lovely.ttf` — byte-identical duplicate of `HeyLovely.ttf`; only the space-free name is referenced
- ~~`Screenshot 2026-03-25 203402.png`~~ and ~~`Screenshot 2026-03-25 194914.png`~~ —
  **do not delete.** Unreferenced by any page, but both return 200 in production, so
  they stay in the upload set.
- The 14 oversized root `.jpg` files (`Dinner Plates.jpg`, `Wisteria Chandelier.jpg`,
  etc., 3-14 MB each). These are **not** what production serves; the real ones live in
  `Photographer photos/`. All 14 return 404 in production and are excluded by
  `.assetsignore`. Note `Becca Website.jpg` is **not** one of these; it is live.
- `augustineevents-main.zip` (147 MB) and `augustine-optimized-assets.zip` (4.4 MB) —
  working files. Now covered by `.gitignore`; never commit them.

---

## Design system

Defined as CSS custom properties in each page's `:root`. Keep these exact values.

```css
--green:       #4a5e40;
--green-dark:  #2e3b28;
--cream:       #f5f2ec;
--white:       #fff;
--text:        #2c2c2c;
--muted:       #5a5a5a;
```

**Typography**

| Role | Font | Notes |
|---|---|---|
| Logo / display | `HeyLovely` | Self-hosted TTF, `@font-face` declared inline. License owned. |
| Headings | `Playfair Display` | Google Fonts, weights 400/600, italics available |
| Body | `Lato` | Google Fonts, weights 300/400/700 |

**Patterns already in use**

- Nav: absolute-positioned over the hero, white links, uppercase, `0.82rem`, `letter-spacing: 0.1em`, `opacity: 0.85` rising to `1` on hover
- Hero: `height: 100vh`, `min-height: 600px`, dark overlay via `::after` at `rgba(0,0,0,0.48)`
- Sections use a `.section-label` eyebrow above the heading
- `.fade-in` class drives scroll animations
- Mobile nav toggle is a three-span hamburger button

Match these conventions when adding markup. Do not introduce Tailwind, CSS frameworks, or a new color palette.

---

## Deployment

**Verified 2026-09-05** against the Cloudflare API, the Workers Builds config, and
the live site.

### What serves the site

A **Cloudflare Worker with static assets**, not Cloudflare Pages.

| | |
|---|---|
| Account | `Raugustinemusic@gmail.com's Account` (`20da6feefc828587a10b5b232912d1a5`) |
| Worker | `rough-salad-4d39`, script tag `efa2f16198fd422b8695cc0e97d82110` |
| Custom domain | `augustineevents.com` -> `rough-salad-4d39` (production) |
| Direct origin | `https://rough-salad-4d39.raugustinemusic.workers.dev` |
| Staging alias | `https://staging-rough-salad-4d39.raugustinemusic.workers.dev` |
| Zone | `augustineevents.com`, Free plan, active |
| Bindings | none |

DNS for the zone is a single record, `AAAA augustineevents.com -> 100:: (proxied)`,
Cloudflare's placeholder for a Worker custom domain. **There is still no `www`
record**, which is why the GitHub Pages redirect dead-ends.

### How it deploys

**Workers Builds is connected to `Beccaxlynn93/augustineevents`** (connected
2026-09-05 by the repo owner; only a personal repo's owner can install the
Cloudflare GitHub App).

| Trigger | Branch | Command |
|---|---|---|
| Production | `main` | `npx wrangler deploy` |
| Preview | every branch except `main` | `npx wrangler versions upload` |

Build command is empty and root directory is `/`. Correct: this site has no build step.

**A push to `main` deploys to production.** Any other branch gets a preview URL and
leaves production alone.

### wrangler.jsonc

Reproduces the live Worker exactly. Do not change these casually:

- **`name` must stay `rough-salad-4d39`**, or Workers Builds fails outright. The name
  here must match the Worker in the dashboard.
- **`account_id` is pinned** because the maintainers can see two Cloudflare accounts.
  Without it, wrangler can silently create a new Worker in the wrong account.
- **`html_handling: "auto-trailing-slash"`** preserves the live redirect behavior,
  `/about.html` -> `/about`. Changing it changes every URL on the site.
- **`not_found_handling: "none"`** matches production. There is no `404.html`.
- **`preview_urls: true`** must stay in sync with the dashboard toggle. Cloudflare
  warns that if config and dashboard disagree, the next wrangler deploy silently
  flips the dashboard setting.

### .assetsignore

Derived empirically, not guessed: every file in the repo was requested from
production, and only files returning 404 were excluded. The upload set is exactly the
files production serves.

**It must keep excluding `**/.git`.** The site lives at the repo root, so `.git` sits
inside the assets directory. Without that exclusion wrangler tries to upload the
157 MB pack file and aborts.

When adding a file that should be live, confirm it is not caught by an existing
pattern. Verify with:

```
WRANGLER_LOG=debug npx wrangler deploy --dry-run 2>&1 | grep '^Ignoring asset: '
```

### Staging workflow

A stable preview alias exists. Use it before promoting anything:

```
npx wrangler versions upload --preview-alias staging
```

The URL does not change between uploads, so it can be shared once and revisited.
Production keeps serving whatever is deployed.

- Promote a reviewed version: `npx wrangler versions deploy`
- Roll back: deploy an earlier version id. Version 7,
  `ca5cfc70-84e5-4d84-8b51-156b0a4cf2de`, is the last hand-uploaded state and the
  known-good fallback.

### GitHub Pages is still configured and still broken

Cert in `bad_authz`, expired 2026-08-12, redirecting to `www.augustineevents.com`
which has no DNS record. It serves nobody. Recommend deleting the Pages config. The
repo's `CNAME` points at that same non-resolving hostname and is excluded from asset
uploads.

### Inspecting production

The Cloudflare MCP server (plugin `cloudflare@cloudflare`) is authenticated against
this account and can read Worker config, versions, deployments, and the Builds
setup. **In practice it is read-only**: writes to the subdomain endpoint return
`10000: Authentication error`. Use `wrangler` or the dashboard for changes.

**You cannot read assets back.** `/content` returns `10405 Method not allowed`, and
`/assets` is upload-only. To recover production files, mirror them over HTTP, which
is how the 2026-09-03 recovery was done.

### Access notes

- The repo is **user-owned**, not org-owned. GitHub offers no collaborator role
  dropdown on personal repos: collaborators get write, and only the owner is admin.
  Installing GitHub Apps and setting Actions secrets require the owner.
- Justin is a **Super Administrator** on the Cloudflare account under
  `justinben2335@gmail.com` and does not need Becca's login. In the dashboard he must
  switch accounts; his personal account is the default.
- If `git push` fails with "Invalid username or token", the macOS keychain holds a
  stale credential. Fix with `gh auth setup-git`.

---

## Known issues

Updated 2026-09-05. Items resolved that day are listed at the bottom.

| Issue | Notes |
|---|---|
| **Contact form has no validation or bot protection** | `contact.html` calls `preventDefault()` and sends immediately. Zero `required` attributes, so a blank form submits. No captcha, Turnstile, or honeypot. Nothing is stored: if the email fails or lands in spam, the inquiry is gone. Only one `emailjs.send`, so the customer gets no confirmation. The estimated total is computed client-side and is not authoritative. |
| **Em dash rule is violated site-wide** | **26 em/en dashes** remain across the six pages (was 29; 3 removed 2026-09-05 on lines already being edited). Highest counts: `contact.html` 9, `event-music.html` 6, `event-rentals.html` 4. Includes `<title>` tags. |
| **`CNAME` points at a dead hostname** | Says `www.augustineevents.com`, which has no DNS record. Vestigial. Delete it or add the record. |
| **GitHub Pages is configured and broken** | Cert `bad_authz`, expired 2026-08-12, redirects to the non-resolving `www` host. Serves nobody. Recommend deleting the Pages config. |
| **Interior page heroes are screenshots** | Measured 698-860px wide, used full-bleed. Low source resolution; cannot be fixed by optimizing. Replace with real photography, do not upscale. |
| **Instagram handle is outdated** | Footer links `instagram.com/becca_augustine`. Should be `@augustinemusicandevents`. |
| **Music package names** | Should read "Bronze Package, Violin or Voice with Becca" and "Emerald Package, Violin or Voice with Becca". Currently just "Bronze" and "Emerald". |
| **`services.html` footer is inconsistent** | The other five pages carry a `.footer-credits` line with the photographer credit. `services.html` has a simpler footer with none. |
| **Beverage urns: delivery-only status unconfirmed** | Becca's 2026-09-05 notes listed ceramic plates, ramekins, and glass beverage dispensers as delivery-only, and those are flagged. An earlier note also claimed **beverage urns**, which her list did not include. Left unflagged pending confirmation. |
| **No testimonials, no service area, weak local SEO** | Known gaps, not yet scheduled. |
| **`.git` is 157 MB** | Bloated by oversized images in history. Deleting them from the working tree does not shrink it; only a history rewrite does, which changes hashes for anyone with a clone. Separate decision. |

### Resolved 2026-09-05

| Was | Now |
|---|---|
| Deploys manual and disconnected from git | Workers Builds deploys `main`. See Deployment. |
| Recovered files existed only on one laptop | Pushed; `main` reproduces production exactly. |
| `608A5063.jpg` 12.5 MB on the homepage | Resized to 1400x2100 / 958 KB, a 92% reduction. |
| Faux Floral showed "Photo Coming Soon" | Real photo added. |
| Rental inventory stale | Updated from Becca's notes: candlesticks 50 pieces / $140, brass bundle $230, rectangular tablecloths 3, floral $75 each or $250 for four. |
| Delivery-only items unmarked | "Delivery Only Item" flag added to dinner plates, salad plates, ramekins, and glass beverage dispensers. |
| Photographer credit contradictory | Confirmed **@erinelizabeth.photog**, who shot most of the photos. Already correct in markup on all five pages that carry a credit. |

---

## The optimized assets zip: status and caveat

`augustine-optimized-assets.zip` (4.4 MB, 34 files) sits in the repo root, unapplied.
It contains a `photos/` directory of 1400px WebP images and patched copies of all six
HTML pages pointing at `photos/lowercase-hyphenated.webp`.

**Its stated rationale was wrong, and measurement 2026-09-03 showed why.** It was built
to fix a "140 MB page" by shipping 4.5 MB, a claimed 96.8% reduction. That compared
against oversized JPGs in the repo root that **were never deployed**. What production
actually serves:

| | Total | Per image | Width |
|---|---|---|---|
| Claimed problem | ~140 MB | 3-14 MB | full camera |
| **Actually live (rentals)** | **0.96 MB** | 42-99 KB | ~780-1200px |
| The zip | 4.5 MB | 200-400 KB | 1400px |

So the zip is an **image quality** upgrade at roughly 4.7x the current bytes. It is not
a performance fix.

**More importantly, it targeted the wrong page.** The rental catalog was never the
problem. The homepage was: `608A5063.jpg` alone was 12.5 MB, and the zip did not
address it at all. **That image was fixed directly on 2026-09-05** (958 KB), which
removed the site's actual performance problem without applying the zip.

**Do not apply the zip without a decision from the owners** on quality versus weight.
If applied, it must be reconciled against the recovered `Photographer photos/` files,
which are what production actually uses.

---

## Conventions

**Copy voice.** Warm, direct, conversational, concise. Never sales-y.

**Hard rule: no em dashes or en dashes in any client-facing copy.** Use commas, parentheses, periods, or restructure. This applies to page copy, alt text, meta descriptions, and `<title>` tags. It is a standing rule from the owners, not a stylistic suggestion. The site currently violates this in 29 places; see Known issues.

Also avoid: "link in bio", cliché wedding-industry phrasing, and any claim about packages or pricing not confirmed in the inventory workbook.

**Images.** Always include meaningful `alt` text describing the item, not the filename. Keep `loading="lazy"` on catalog images. New photos must be resized to 1400px max width and saved as WebP before committing. Never commit a multi-megabyte image.

**Privacy.** Never name a wedding couple on the site. Credit photographers where relevant.

**Accessibility.** Keep alt text on every image, maintain heading order, preserve the existing focus and hover states.

---

## Working style

- Small focused changes, not sweeping rewrites
- If the owners supply draft copy, refine it rather than replacing it
- Ask before changing prices, package names, or inventory counts; these are decided elsewhere
- Do not add analytics, tracking scripts, chat widgets, or third-party embeds without asking
- Do not commit secrets. There are none in this repo today and it should stay that way.
- **Verify deploy assumptions against the live site, not against this file.** This document was confidently wrong about hosting for its entire prior existence.

**Release process.** Work on a branch, push it, and review the staging alias. Merging
to `main` deploys to production, so treat it as the release step, not bookkeeping.
Never hand-upload through the Cloudflare dashboard: that is what caused the original
drift between git and production, and it is invisible from inside this repo.

**Images.** Resize before committing. Check how the CSS crops the image first: a
`.item-card img` is `height: 220px` with `object-fit: cover` in a roughly 281px wide
grid cell, so the sides are never cropped by the browser but the top and bottom are.
Crop vertically, never horizontally, and preserve the full frame width. Note that
`sips -Z` caps the *larger* dimension, which silently under-sizes a portrait image;
use `--resampleWidth` instead.

---

## What is coming

A rental booking system is specified in a separate document (`augustine-booking-build-spec.md`). It will be a Next.js application with Postgres, handling inventory availability, contract generation, and Venmo/Zelle payment coordination.

**What it replaces.** Today "Book Now" is not a booking system. Every CTA on every
page points at `contact.html`, a single EmailJS form that emails Becca. Nothing is
stored, reserved, validated, or paid. See Known issues for the specific gaps.

That project will eventually absorb these six pages as static routes. Until then, keep this repo simple and static. Do not begin that migration here without explicit instruction.

Note that the hosting question is already settled in its favor: the site is on Cloudflare,
which can run the server code GitHub Pages cannot.
