# CLAUDE.md — augustineevents.com

Context and working instructions for Claude Code on this repository.

> **Verified 2026-09-09** against the repo, the live site, the Cloudflare API, and
> the Workers Builds configuration.
> This is a Cloudflare Worker, not GitHub Pages and not Cloudflare Pages. It
> deploys from git, and on 2026-09-09 a push to `main` produced the first
> build-sourced deployment, which is what finally proved the pipeline. Until that
> day production was still serving the hand-uploaded version from 2026-05-15.
> Do not trust an unverified claim in this file over what production actually returns.
> This document has been confidently wrong before.

---

## What this is

The marketing website for **Augustine Music & Events**, a Nashville wedding music and event rental business run by Becca Augustine (violinist and vocalist) and Justin Brown (keys, guitar, operations).

Hand-written static HTML with **no build step, no framework and no package.json**.
Each page carries its own `<style>` block inline.

Since 2026-09-05 the repo also carries a small Worker script (`src/`) that records
contact form submissions to D1 and sends the notification email. It is plain ESM
with no dependencies and no bundler, so the "no build step" rule still holds. Static
assets are matched and served *before* that code runs, so a failure in it cannot take
the six pages down.

**Hosting is a Cloudflare Worker, not GitHub Pages.** As of 2026-09-05 it deploys automatically from `main` via Workers Builds. See "Deployment" below before touching anything deploy-related.

A booking system is planned as a separate Next.js project. This repo stays static
until that migration, apart from the inquiry Worker described above. Do not add a
build step, framework, or bundler here.

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

### The inquiry Worker

Added 2026-09-05, live in production since 2026-09-09.

| Path | Purpose |
|---|---|
| `src/index.js` | Entry point. Serves `POST /api/inquiries` only; every other unmatched path returns a bare 404, which is what production did before. Writes to D1 first, then sends the email, so a mail failure can never cost the record of a lead. |
| `src/email.js` | Builds and sends the notification. Recipients default to Becca and Justin, overridable with the `NOTIFY_EMAILS` var. Sends one recipient at a time on purpose, so one bad address cannot fail the whole call. |
| `src/guards.js` | Honeypot, minimum fill time, email shape check, and a rate limit of 5 per hashed IP per hour. A rejected submission is answered with a normal success response so a bot learns nothing. |
| `migrations/` | D1 schema. See the warning about migration bookkeeping under Deployment. |

The D1 database is `augustine-inquiries` (`8233db2a-ce39-4b4e-8447-a8a00da7da6c`),
bound as `env.augustine_inquiries`. **There is only one database.** Preview and
staging versions bind the same one production does, so a staging test writes real
rows. That is a feature when verifying a deploy and a trap if you forget it.

`IP_SALT` is an optional secret. Without it `hashIp` falls back to a default string,
so the Worker deploys and runs fine, but the hashes are less resistant to a
precomputed lookup. Setting it is a small, worthwhile hardening step.

### Third-party dependency

`contact.html` loads **EmailJS** from jsDelivr. It is no longer the only conversion
path (the Worker also emails and stores the inquiry), but it is still the one the
visitor's success message depends on:

```
line   8: <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js">
line   9: emailjs.init('_gnvsXbH1iYymclUs')
line 387: emailjs.send('service_i7u4b0s', 'template_qqheek4', ...)
```

Those three identifiers are **publishable by design** for EmailJS and are not secrets.
Do not "fix" them by moving them to env vars; removing them breaks the visitor-facing
success path. There are no real secrets in this repo and it should stay that way.

The form posts to `/api/inquiries` **fire and forget**, wrapped in `.catch()`, after
EmailJS resolves or rejects. That ordering is deliberate: if the Worker, the database
or the endpoint is down, the visitor never sees it and the email is unaffected. Retiring
EmailJS is possible now that the Worker sends its own mail, but it is a separate
decision and would make the Worker a single point of failure for the only conversion
path on the site.

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

**Proven 2026-09-09.** Until that day this was configuration, not observed behavior:
Workers Builds was connected on 2026-09-05, but production was still serving
`ca5cfc70` from 2026-05-15, the last hand-upload, because no push had exercised it.
The pipeline is now confirmed working in both directions:

| | |
|---|---|
| Branch push (`site-updates`) | uploaded version `3fa96db5` |
| `main` push (`3197a16..40696cc`) | deployed version `4984765d`, live in about 40 seconds |

Live matching `main` is therefore no longer evidence that a deploy ran. Before the
first build, the two matched anyway, because `main` had been reconstructed *from*
production during the 2026-09-03 recovery. To confirm a deploy actually happened,
check `wrangler deployments list`, not the page bytes.

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

### D1 migrations

**Reconciled 2026-09-09.** `wrangler d1 migrations list --remote` now reports
`No migrations to apply!` and the runner is safe to use for the next migration.

The history is worth knowing, because the symptom is confusing if it recurs. The
schema was originally applied by hand through `d1 execute` rather than through the
migrations runner, so the `inquiries` table and its `ip_hash` column were live and
correct while `d1_migrations` sat empty. In that state `migrations list` reports every
file as pending and `d1 list` can show a stale `num_tables: 0`, neither of which means
the database is unset. Running `migrations apply` would have aborted on `0002`'s
`ALTER TABLE inquiries ADD COLUMN ip_hash`, because the column already existed. It was
fixed by backfilling the two rows with their real timestamps.

Check the schema directly rather than trusting the ledger or the table count:

```
npx wrangler d1 execute augustine-inquiries --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table'"
```

**Pass SQL with `--file`, not a multi-line `--command`.** A multi-line quoted
statement pasted into a terminal failed with `7403: The given account is not valid or
is not authorized to access this service`, which reads like a permissions problem and
is not one. The identical SQL in a file succeeded immediately. Reads and other writes
worked throughout, so treat a lone 7403 on a pasted statement as a mangled command
before going anywhere near account access.

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
| **Contact form still has no field validation** | Partly addressed 2026-09-09. Still true: zero `required` attributes, so a blank form submits, and the estimated total is computed client-side and is not authoritative. The customer still gets no confirmation email, only Becca and Justin are notified. **No longer true:** submissions are stored in D1, and the endpoint has honeypot, timing, email-shape and rate-limit guards. A lost or spam-filtered email no longer means a lost inquiry. |
| **Em dash rule is violated site-wide** | **26 em/en dashes** remain across the six pages (was 29; 3 removed 2026-09-05 on lines already being edited). Highest counts: `contact.html` 9, `event-music.html` 6, `event-rentals.html` 4. Includes `<title>` tags. |
| **`CNAME` points at a dead hostname** | Says `www.augustineevents.com`, which has no DNS record. Vestigial. Delete it or add the record. |
| **GitHub Pages is configured and broken** | Cert `bad_authz`, expired 2026-08-12, redirects to the non-resolving `www` host. Serves nobody. Recommend deleting the Pages config. |
| **Interior page heroes are screenshots** | Measured 698-860px wide, used full-bleed. Low source resolution; cannot be fixed by optimizing. Replace with real photography, do not upscale. |
| **Instagram handle is outdated** | Footer links `instagram.com/becca_augustine`. Should be `@augustinemusicandevents`. |
| **Music package names** | Should read "Bronze Package, Violin or Voice with Becca" and "Emerald Package, Violin or Voice with Becca". Currently just "Bronze" and "Emerald". |
| **`services.html` footer is inconsistent** | The other five pages carry a `.footer-credits` line with the photographer credit. `services.html` has a simpler footer with none. |
| **Italian vases are not individually bookable** | They appear only inside the Brass Collection Bundle description, on `event-rentals.html` and in the booking form. There is no catalog entry, price, count, or photo for them anywhere. Decided 2026-09-09 to leave them out of the booking form and keep them bundle only. Revisit if Becca wants to rent them separately, which needs a per-vase price and a count from her. |
| **Beverage urns: delivery-only status unconfirmed** | Becca's 2026-09-05 notes listed ceramic plates, ramekins, and glass beverage dispensers as delivery-only, and those are flagged. An earlier note also claimed **beverage urns**, which her list did not include. Left unflagged pending confirmation. |
| **No testimonials, no service area, weak local SEO** | Known gaps, not yet scheduled. |
| **`.git` is 157 MB** | Bloated by oversized images in history. Deleting them from the working tree does not shrink it; only a history rewrite does, which changes hashes for anyone with a clone. Separate decision. |

### Resolved 2026-09-09

| Was | Now |
|---|---|
| Inquiries existed only as an EmailJS send | Stored in D1 and sent from the Worker. Verified in production: a submission records a row and notifies both recipients. |
| No bot protection on the form | Honeypot, minimum fill time, email shape and per-IP rate limit. Verified live: a honeypot submission is answered 200 and writes no row. |
| Bundled rental lines misread in the summary | A bundled line showed `x4 ($75/ea)` while the total charged the $250 bundle, so the emailed summary appeared not to add up. It now uses the same condition the total does. |
| Workers Builds connected but never exercised | First build-sourced deployment, `4984765d`. See Deployment. |
| Bundle and its member items both selectable | Selecting the Brass Collection Bundle alongside the individual brass pieces charged for the same items twice. A real submission caught it at `$283.00`. Checking the bundle now clears and locks its members. Deployed as `0bf75d0d` and verified live. |
| `d1_migrations` empty while the schema was live | Backfilled with the real timestamps. `migrations list --remote` reports nothing to apply. See D1 migrations. |

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

**Rental bundles.** A bundle row carries `data-bundle="<name>"` and every item it
contains carries `data-bundle-member="<name>"`. Checking the bundle clears, disables
and visually mutes its members, and reveals their `.bundle-included` line; unchecking
hands them back. This exists so a visitor cannot pay twice for the same pieces, and
`syncBundles()` must keep running before `syncDeliveryOnly()` in the checkbox handler,
because clearing a member can change which delivery only items are still selected.
Adding another bundle needs only these two attributes and a `.bundle-included` span,
no new JavaScript. Today the only bundle is the brass collection.

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

When a release touches the Worker, verify the endpoint against staging before
promoting, and remember that staging writes to the **production** database and sends
**real email** to Becca and Justin. Label test submissions clearly, and clean up the
rows afterward.

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
