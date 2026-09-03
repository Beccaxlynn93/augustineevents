# CLAUDE.md — augustineevents.com

Context and working instructions for Claude Code on this repository.

> **Verified 2026-09-03** against the repo, the live site, and the Cloudflare API.
> The deployment section was materially wrong before that audit: this is a
> hand-deployed Cloudflare Worker, not GitHub Pages, and not Cloudflare Pages.
> Do not trust an unverified claim in this file over what production actually returns.

---

## What this is

The marketing website for **Augustine Music & Events**, a Nashville wedding music and event rental business run by Becca Augustine (violinist and vocalist) and Justin Brown (keys, guitar, operations).

Hand-written static HTML. No build step, no framework, no package.json. Each page carries its own `<style>` block inline.

**Hosting is a hand-deployed Cloudflare Worker, not GitHub Pages.** See "Deployment" below before touching anything deploy-related. This is the single most misunderstood thing about this project.

A booking system is planned as a separate Next.js project. This repo stays static until that migration. Do not add a build step, framework, or bundler here.

---

## READ FIRST: git and production are not connected

**Resolved 2026-09-03:** the live site once served 16 files that existed in no branch
and no commit here. They are now recovered and committed on branch `recover-live-site`
(`b811597`). The repo can reproduce the live site: 29 asset references across the six
real pages, 0 missing.

**Still true, and the reason this can happen again:** there is no link of any kind
between this repository and production. No git integration, no build, no CI. The live
site is a Cloudflare Worker updated by dragging a folder into a dashboard.

So:

1. **Pushing to `main` deploys nothing.** Merging a PR deploys nothing.
2. **A hand-upload can reintroduce the drift at any time**, and Cloudflare's asset
   store is upload-only (no API reads files back), so anything uploaded but not
   committed exists in exactly one place.
3. Rental images are **not** broken in production and never were. Any claim that they
   are is stale, and predates the 2026-09-03 audit.

**Highest priority open task:** wire up `wrangler` so deploys come from this repo.
Until that exists, git and production will keep drifting.

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
- `608A5063.jpg` — music package photo on the homepage. **3648x5472, 12.5 MB, a Canon
  EOS R6 original.** Recovered 2026-09-03. See Known issues; this is the site's real
  performance problem.
- `romantic music and intimate wedding rentals.png` — 1366px, used by `index.html`.
  **Do not delete**; it is easy to mistake for junk.
- `Screenshot 2026-03-25 194905 / 194925 / 194933 / 194941.png` and
  `Screenshot 2026-03-26 190035.png` — interior page hero backgrounds, still in use.
  Low resolution, see Known issues.
- `CNAME` — contains `www.augustineevents.com`, a hostname that **does not resolve**.
  Vestigial; GitHub Pages is not serving this site. See Deployment.
- `Augustine Wedding Rentals Catalog.pdf` — do not delete without asking, may be linked
  externally.
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
- `Screenshot 2026-03-25 203402.png` — 522px, referenced by no page
- `Screenshot 2026-03-25 194914.png` — no longer referenced. Production replaced it with
  `608A5063.jpg`; confirmed unreferenced by all six pages as of 2026-09-03.
- The 15 oversized root `.jpg` files (`Dinner Plates.jpg`, `Wisteria Chandelier.jpg`,
  etc., 3-14 MB each). These are **not** what production serves; the real ones live in
  `Photographer photos/`. Superseded and safe to delete from the working tree.
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

**Verified 2026-09-03. The previous version of this section was wrong on every point.**

### What actually serves the site

A **Cloudflare Worker with static assets**, not Cloudflare Pages. Confirmed via the
Cloudflare API on 2026-09-03.

| | |
|---|---|
| Account | `Raugustinemusic@gmail.com's Account` (`20da6feefc828587a10b5b232912d1a5`) |
| Worker | `rough-salad-4d39`, created 2026-05-15 |
| Custom domain | `augustineevents.com` -> `rough-salad-4d39` (production) |
| Direct origin | `https://rough-salad-4d39.raugustinemusic.workers.dev` |
| Zone | `augustineevents.com`, Free plan, active |
| Bindings | none |

DNS for the zone is a single record:

```
AAAA  augustineevents.com  ->  100::  (proxied)
```

`100::` is Cloudflare's placeholder address for a Worker custom domain. **There is no
`www` record and never has been**, which is why the GitHub Pages redirect to
`www.augustineevents.com` dead-ends.

### How it gets deployed: by hand, from the dashboard

Every deployment in the Worker's history is a manual upload:

```
2026-05-15T17:11  source=dash  triggered_by=upload  raugustinemusic@gmail.com
2026-05-15T16:57  source=dash  triggered_by=upload  raugustinemusic@gmail.com
2026-05-15T16:53  source=dash  triggered_by=upload  raugustinemusic@gmail.com
2026-05-15T16:52  source=dash  triggered_by=upload  raugustinemusic@gmail.com
2026-05-15T16:52  source=dash  triggered_by=upload  raugustinemusic@gmail.com
2026-05-15T06:01  source=dash  triggered_by=upload  raugustinemusic@gmail.com
2026-05-15T06:00  source=api   triggered_by=upload  raugustinemusic@gmail.com
```

**There is no git integration, no build step, and no CI.** This is the complete
explanation for why this repo and the live site diverged: they were never connected.

**The site has not been deployed since 2026-05-15.** Pushing to `main` does nothing.
Merging a PR does nothing. The only way content reaches production today is someone
dragging a folder into the Cloudflare dashboard.

### GitHub Pages is configured and broken

Do not rely on it. `gh api repos/Beccaxlynn93/augustineevents/pages` returns:

```json
{"status":"built", "source":{"branch":"main"}, "cname":"www.augustineevents.com",
 "https_certificate":{"state":"bad_authz",
   "description":"The ACME authorization is in a bad state. We need to start over.",
   "expires_at":"2026-08-12"}}
```

- `beccaxlynn93.github.io/augustineevents/` responds `301 -> https://www.augustineevents.com/`
- **`www.augustineevents.com` has no DNS record**, confirmed against 1.1.1.1 and 8.8.8.8
- Only the apex resolves, to Cloudflare IPs (104.21.41.195, 172.67.166.213)
- The certificate expired 2026-08-12

So GitHub Pages redirects all traffic to a hostname that does not exist, over a dead cert.
**The repo's `CNAME` file points at that same non-resolving hostname.**

### Recommended direction

Keep Cloudflare, but replace drag-and-drop with `wrangler` driven from this repo:

1. The Worker and custom domain already work and already have valid TLS at the apex.
2. Adding a `wrangler.jsonc` with an assets directory makes **git the source of truth**
   and gives real deploys, rollbacks, and history.
3. The booking system needs server code. This is already a Worker, so that migration
   becomes an extension of what exists rather than a platform move.
4. Retire GitHub Pages entirely. Nothing points at it and its cert is dead.

Before any of that: **get the live files into git.** They are readable from both
`https://augustineevents.com` and `https://rough-salad-4d39.raugustinemusic.workers.dev`,
so this is a mirror-and-commit, not a rescue. Do it before the next hand-upload
overwrites something.

### Inspecting production without the dashboard

The Cloudflare MCP server (plugin `cloudflare@cloudflare`) is authenticated against
this account and can query the Worker directly. Useful calls:

```
GET /accounts/{account_id}/workers/scripts/rough-salad-4d39/deployments
GET /accounts/{account_id}/workers/scripts/rough-salad-4d39/versions
GET /accounts/{account_id}/workers/domains
GET /zones/{zone_id}/dns_records
```

**You cannot read files back out.** Verified 2026-09-03: `/content` returns
`10405 Method not allowed for this authentication scheme`, and `/assets` plus
`/asset-upload` are upload-only (204, empty). Version history returns metadata about
the asset config, never the assets. **To recover production files, mirror them over
HTTP** from `https://augustineevents.com` or the workers.dev origin, which is how the
2026-09-03 recovery was done.

### Working rule

Work on a branch and open a PR. But understand that **merging does not deploy**.
Nothing in git reaches production until someone uploads it to the Worker, and `main`
does not reflect production today.

Before assuming anything about production, check it. `curl -sSI https://augustineevents.com/`
costs nothing and this document has been confidently wrong before.

---

## Known issues

| Issue | Notes |
|---|---|
| **Deploys are manual and disconnected from git** | Highest priority. Nothing in this repo reaches production without a hand-upload. See "READ FIRST". |
| **`608A5063.jpg` is 12.5 MB on the homepage** | 3648x5472 Canon EOS R6 original, served at full size to every visitor. Alone it is 2.6x the entire optimized zip. This is the site's actual performance problem. Resizing is a content change, so ask first. |
| **`CNAME` points at a dead hostname** | Says `www.augustineevents.com`, which has no DNS record. Vestigial. Delete it or add the record. |
| **GitHub Pages is configured and broken** | Cert in `bad_authz`, expired 2026-08-12, redirects to the non-resolving `www` host. Serves nobody. Recommend deleting the Pages config outright. |
| **Em dash rule is violated site-wide** | 29 em/en dashes across all six pages, including every `<title>`. An open cleanup task, not just a go-forward convention. |
| **Interior page heroes are screenshots** | Measured 698-860px wide, used full-bleed. Low source resolution; cannot be fixed by optimizing. Replace with real photography, do not upscale. |
| **Instagram handle is outdated** | Footer links `instagram.com/becca_augustine`. Should be `@augustinemusicandevents`. |
| **Photographer credit is contradictory** | Markup links `instagram.com/erinelizabeth.photog`; prior guidance credited `@awarrickphotography`. Confirm which is correct before publishing either. |
| **Music package names** | Should read "Bronze Package, Violin or Voice with Becca" and "Emerald Package, Violin or Voice with Becca". Currently just "Bronze" and "Emerald". |
| **Rental inventory is stale** | `event-rentals.html:277` says 35 pieces / $100 collection. Should be 50, collection $145, brass bundle $240. Large Brass Italian Vase is missing entirely. |
| **Delivery-only items not marked** | Dinner plates, salad plates, dessert ramekins, beverage dispensers, and beverage urns are delivery-only. The page does not say so. |
| **Faux Floral Ground Installation** | Shows "Photo Coming Soon". Awaiting a photo. |
| **No testimonials, no service area, weak local SEO** | Known gaps, not yet scheduled. |
| **`.git` is 155 MB** | Bloated by the oversized root JPGs already in history. Deleting them from the working tree does not shrink it; only a history rewrite does, which changes hashes for anyone with a clone. Separate decision. |

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

**More importantly, it targets the wrong page.** The rental catalog was never the
problem. The homepage is: `608A5063.jpg` alone is 12.5 MB, and the zip does not address
it at all. Fixing that one image would do more than the entire zip.

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

---

## What is coming

A rental booking system is specified in a separate document (`augustine-booking-build-spec.md`). It will be a Next.js application with Postgres, handling inventory availability, contract generation, and Venmo/Zelle payment coordination.

That project will eventually absorb these six pages as static routes. Until then, keep this repo simple and static. Do not begin that migration here without explicit instruction.

Note that the hosting question is already settled in its favor: the site is on Cloudflare,
which can run the server code GitHub Pages cannot.
