# CLAUDE.md — augustineevents.com

Context and working instructions for Claude Code on this repository.

> **Verified 2026-09-11** against the repo, the live site, the Cloudflare API, the
> Workers Builds configuration, and the production D1 database.
>
> **This copy is on the `redesign` branch and describes it.** `main` is nine commits
> behind and still serves the previous design with the old booking form. See
> "Branches and previews" for what each branch holds and the order to merge them.
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

Since 2026-09-10 the repo also carries the rental catalog as data in D1, with a
server-side pricing resolver. See "The rental catalog" below.

**The booking system is being built here, in this Worker. It is not a separate
Next.js project.** That plan was written when the site was believed to be on GitHub
Pages, which cannot run server code. That constraint is gone, and the reasons not to
migrate are strong: a Next.js rewrite would mean rebuilding all six pages as
components, adding the build step this file forbids, running Postgres alongside the
D1 that already exists, and re-proving the deploy pipeline. It would also destroy the
property that makes this setup safe, which is that static assets are matched and
served **before** any code runs, so a bug in the Worker cannot take the marketing
site down. In a Next.js app it can.

**No React, no framework, no bundler, no build step, and no `package.json`.** The six
pages stay hand-written HTML with inline `<style>` and vanilla JS. Booking is a state
problem, not a rendering problem: it lives in D1 and the Worker. Tests run on Node's
built-in runner and `node:sqlite`, which is why there is still no `package.json`.

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
- **This bit on 2026-09-10.** Two content fixes were committed and pushed to
  `booking-phase-1` and reported as shipped. Production kept serving the old bytes,
  because a branch push is not a deploy. Nothing is live until it is on `main`.
  Verify with curl against production, not with `git push` having succeeded.

**Still true, and still the way this can break:** Cloudflare's asset store is
upload-only. No API reads files back out of the Worker. If anyone hand-uploads
through the dashboard again, the drift returns and is invisible from inside this
repo. To check production, mirror it over HTTP.

**Verify before assuming.** `curl -sSI https://augustineevents.com/` costs nothing.

---

## Branches and previews

Four branches, each built on the one before, so the newest contains all of it.
Nothing below is on `main` yet. The owners reviewed the redesign on 2026-09-11 and
approved it, with tweaks outstanding.

| Branch | Adds | Preview |
|---|---|---|
| `main` | What production serves today. | augustineevents.com |
| `design-pass` | Live-text headline (later reverted to Becca's image), readable line length, share metadata, favicon, form validation, contrast fixes. | version URL only |
| `booking-catalog` | The booking form's rental picker rendered from D1 with photos, `GET /api/catalog`, server-side pricing of inquiries. | `staging-rough-salad-4d39.raugustinemusic.workers.dev` |
| `redesign` | The new look: shared design system, arched page heroes, motion, line art, the A monogram, plus the copy changes below. | `redesign-rough-salad-4d39.raugustinemusic.workers.dev` |

**A preview alias keeps its URL across uploads**, so a link shared once stays good.
Publish to one with `npx wrangler versions upload --preview-alias <name>`. Only a push
to `main` touches production.

**Every preview binds the production database and the real EmailJS account.** A test
submission on any of them stores a real inquiry and emails Becca.

To ship: merge `redesign` into `main` (it contains the other two) and push. Migration
`0005_item_photos.sql` is already applied to production, so no database step is
needed. Expect the deploy about 40 seconds later, and verify by curling the site
rather than trusting the push.

---

## Repository structure

### Real pages (6)

| File | Purpose |
|---|---|
| `index.html` | Homepage. Full-bleed hero, two service cards, Becca, the offer band, closing. |
| `about.html` | Becca's bio. |
| `services.html` | Service overview. Orphaned: nothing links to it. |
| `event-music.html` | Music packages, in a tab switch. |
| `event-rentals.html` | Rental catalog. The largest and most important page. |
| `contact.html` | Booking form. Rental picker renders from `/api/catalog`. Depends on EmailJS, see below. |

On `redesign` every page loads `css/site.css` and `js/site.js` and keeps only its own
styles inline. Header and footer markup is generated from one template, so all six
must be edited together.

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
  `Screenshot 2026-03-26 190035.png` — interior page hero backgrounds on `main`,
  700 to 860px and stretched full width. **No page on `redesign` references them**;
  `img/*.webp` replaced them. Kept in the upload set so old URLs keep working.
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
- `css/site.css`, `js/site.js` — the shared design system and page behaviour, added
  2026-09-11 on `redesign`. Loaded by all six pages. See Design system.
- `js/pricing.js`, `js/catalog.js`, `js/rental-picker.js` — shared by the Worker and
  the browser. See The rental catalog.
- `img/*.webp` — six sharp photos added 2026-09-11, 552 KB in total, resized from the
  photographer's originals (up to 5472px, 7 to 12 MB each) which sit in the repo root
  and are excluded from the asset upload. Made with Pillow at quality 80, at most
  1400px wide, per the image convention. They replaced the screenshots used as page
  heroes and homepage cards.
- `favicon.svg` — the A monogram: the A from `HeyLovely.ttf` converted to a path
  (a favicon cannot load a font) inside a fine-line floral wreath. The header and
  footer carry the same drawing inline in `currentColor`.
- `wrangler.jsonc` and `.assetsignore` — deploy configuration. See Deployment.
- `.gitignore` — ignores `*.zip` and `.DS_Store`. Added 2026-09-03 so the 147 MB working
  archive cannot be committed by accident.

### The inquiry Worker

Added 2026-09-05, live in production since 2026-09-09.

| Path | Purpose |
|---|---|
| `src/index.js` | Entry point. Serves `GET /api/catalog` and `POST /api/inquiries`; every other unmatched path returns a bare 404, which is what production did before. Writes to D1 first, then sends the email, so a mail failure can never cost the record of a lead. |
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

### The rental catalog

Added 2026-09-10. **This is now the source of truth for items, counts and prices.**
The catalog previously lived in two places, the cards in `event-rentals.html` and the
checkbox rows in `contact.html`, and they drifted. That is how the florals came to be
priced differently on the two pages.

| Path | Purpose |
|---|---|
| `migrations/0003_catalog.sql` | `items`, `bundles`, `bundle_items`. |
| `migrations/0004_catalog_seed.sql` | 17 items and 4 bundles, seeded from the inventory workbook. |
| `migrations/0005_item_photos.sql` | `items.photo` and `items.photo_position`, for the 15 listed items. |
| `js/pricing.js` | `resolveCart` and `describeQuote`. Pricing, and the breakdown text both emails use. |
| `js/catalog.js` | Row adapter shared by D1, the browser and the tests. |
| `js/rental-picker.js` | The booking form's rental picker, rendered from `/api/catalog`. |
| `src/pricing.test.mjs` | 21 fixture tests. Run `node --test src/pricing.test.mjs`. |

**`js/` is shared by the Worker and the browser, and that is the point.** `pricing.js`
and `catalog.js` are pure ES modules with no imports. The Worker bundles them
(`src/index.js` imports `../js/...`), and they are also served as static assets, so
`contact.html` loads the same files. The estimate a visitor sees and the price the
Worker stores come from one implementation and cannot drift. Keep them dependency
free and browser safe; anything Worker only belongs in `src/`.

**How the booking form uses it (2026-09-10).** `GET /api/catalog` returns active items
(listed and unlisted, because the brass package contains the unlisted vases), bundles
and memberships. `js/rental-picker.js` renders a row per listed item with its photo,
generates each note from the data (stock, minimums, volume prices, delivery only),
and prices the selection live with `resolveCart`. A bundle of **one** item is a
volume discount that applies by itself as quantity rises; a bundle of **several**
items is a package the visitor ticks as a unit. On submit the page sends a structured
`cart` to `/api/inquiries`, which re-prices it and stores the server's breakdown and
total, overriding the browser's text. A browser total that disagrees is logged as
`estimate mismatch`.

**The picker is deliberately not load-bearing.** Submission, the package toggle and
the nav live in the page's ordinary script; the picker is a separate module that talks
to it only through `window.RentalPicker` and a `rentals:change` event. If the module,
the catalog request or D1 fails, the picker shows a fallback asking for items in the
message box and the form still submits. Keep it that way: this is the site's only
conversion path.

**Pricing never rejects a lead.** A cart over stock, under a minimum or below the $100
order minimum is still stored, with a note, because Becca approves every booking.
Music packages are not in the catalog yet, so `music_price` is the one figure still
taken from the browser. It is a fixed list of six.

Seeded from **`augustine-inventory-master.numbers`** (v2, Sept 2026), Becca's physical
inventory workbook, which is more current than either page. It is not in this repo. To
read it: open in Numbers and export as CSV, or drive that export from AppleScript.

**Pricing is a resolver, not a sum.** A cart of 50 candlesticks and 8 candelabras is
not `50 x $3 + 8 x $7 = $206`, it is the candlestick collection at $140 plus the
candelabra set at $50, so $190. Bundles overlap and nest, so `resolveCart` enumerates
every combination of applicable bundles and keeps the cheapest, which is the only way
to guarantee a customer is never punished for how they clicked. **Volume discounts are
modelled as single-item bundles** ("$250 for all four florals" is a bundle containing
4 of one item) so the resolver has one concept rather than two. Adding a discount
therefore means adding a bundle row, never new code.

Money is **integer cents** throughout. Never floats: `0.75 * 20` is not `15` in binary
floating point, and this arithmetic ends up on a contract.

**Hold buffers are per item, not global.** The rental price covers 48 hours, typically
Friday 10am to Sunday 10am, so the day either side of the event belongs to the booking.
What varies is turnaround, held in `items.buffer_after_days`: linens need 3 days,
anything washed needs 2, everything else needs 1. **Nothing is 0**, and a test enforces
that. A single global buffer, which the build plan assumed, would over-block every
one-of-one item and under-block the plates.

`active` and `listed` are different things. `active` means it exists and can be
reserved; `listed` means it appears in the public catalog. The Italian vases are
active but unlisted, so the Brass Collection Bundle can reserve them against a date
while they stay bundle only on the site.

**The tests load the real migration files** into in-memory SQLite rather than a
fixture, because a fixture would drift from the seed, which is the bug class this
whole layer exists to kill. Keep it that way.

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

**Redesigned 2026-09-11 on the `redesign` branch.** One shared system, loaded by
every page: `css/site.css` (tokens, type, header, buttons, dividers, footer, motion)
and `js/site.js` (header state, mobile menu, reveals, tabs, scroll-spy). Each page's
own `<style>` holds only what is unique to it. Before this, every page carried a
private copy of the nav, footer, buttons and type, about 1,000 duplicated lines.

The six brand colours are unchanged. Anything else in `site.css` is a tint of them
made with `color-mix`, never a new hue.

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
| Logo / accents | `HeyLovely` | Self-hosted TTF. Now used for the logo and small flourishes only. |
| Headings | `Cormorant Garamond` | Google Fonts, 300 to 600. Set with lining figures (`lining-nums`); its default old-style figures make $1,100 read like $I,IOO. |
| Body | `Jost` | Google Fonts, 300/400/500. |
| Home headline | Becca's Canva font | An image, `hero-headline.png`, inside a real `<h1>`. The font lives only in Canva. |

**Rules the system enforces**

- **No two neighbouring sections share a colour without a line.** Sections carry a
  `bg-*` class; `.bg-x + .bg-x` gets a hairline automatically as a safety net.
  Place a `.flourish` (the drawn sprig divider) where a softer break is wanted.
- **Reveal animations must never blank a page.** Content is hidden only under
  `html.reveal-ready`, which an inline snippet in each `<head>` adds and removes
  again after 2.5 s if `js/site.js` never starts. Reduced motion reveals everything
  immediately. Use `.fade-in` (rise and unblur), `.reveal-clip` (image uncovers),
  `data-stagger` on a parent for one-after-another.
- **Photos:** interior page heroes put a photo in an arch (`.arch`) rather than
  stretching it full-bleed. Sharp versions of the photographer originals live in
  `img/` as WebP, at most 1400px wide.
  **`.arch.is-framed` is the exception:** it shows a photo whole, at its own
  proportions, in a softly rounded frame. Both photos of Becca use it, because they
  were cropped at the top of her head before they reached the site and the arch's
  curve trimmed her hair. A framed photo must set `--ratio` inline (for example
  `--ratio: 699 / 754`) or the page reserves no space for it and jumps on load.
- **Header and footer markup is identical on every page.** Change all six together.
- **Line art (`drawVines` in `js/site.js`).** Each interior `.page-hero` gets three
  vines: one arches over the heading into the side of the photo's outline, one sweeps
  under the text into its bottom corner, one drapes onto the top of the arch, with
  leaves and a small bloom at the junction. The curves are **measured** from the
  heading and frame at runtime, not drawn by hand, because the frame sits differently
  at every width; each lands on the outline tangentially so it reads as growing into
  it. Phones get their own composition, since the photo sits above the text there.
  Redrawn on resize (without animating) and after `document.fonts.ready`, because the
  webfont changes the heading's size and so the curves.
- **The mark is the A monogram** (`favicon.svg`, and the same drawing inline in the
  header and footer): the A from `HeyLovely.ttf` converted to a path with fontTools,
  inside a fine-line floral wreath. The letter is enlarged and slightly thickened
  relative to the wreath so it survives 16px in a browser tab, where the fine lines
  can only read as texture. Regenerate with the same approach if the mark changes:
  a favicon cannot load a font, so the glyph must stay a path.

**Page level patterns worth knowing**

- Home: full-bleed hero with a slow push-in, two service cards, Becca in a framed
  photo, then a photo band carrying three `.offer-card` summaries (Music, Rentals,
  Both) over the wisteria photograph, then the closing band.
- Every page ends with the same closing band (`.bg-green`) above the footer
  (`.bg-dark`), so the two never share a colour.
- Event Rentals: sticky `.chip-bar` category chips with scroll-spy; item cards in
  threes; two columns on a phone.
- Event Music: the two package sets are a tab switch (`[data-tabs]`). A panel hidden
  at load never scrolled into view, so `select()` reveals its cards when shown, or
  they would stay invisible. Without JavaScript both sets simply show in sequence.


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
| `main` push (`112ede9..1e5d9b6`) | 2026-09-10, live in about 40 seconds, confirmed by curling production |

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

**It must keep excluding `.wrangler`.** Found 2026-09-10: `.wrangler/` also sits in
the assets directory and was not excluded, so a staging upload listed
`.wrangler/tmp/deploy-*/index.js.map` as a static asset. Worse, `wrangler dev` and
`d1 --local` write local SQLite databases (with inquiry rows) and simulated emails
there, which the next upload would have published. It was caught before that
happened. `.wrangler/` is now in both `.assetsignore` and `.gitignore`.

**Run local dev with `--persist-to` outside the repo.** Because the assets directory
is the repo root, `wrangler dev` watches `.wrangler/` and reloads on every local D1
write, which loops. Keep local state out of the tree:

```
npx wrangler d1 migrations apply augustine-inquiries --local --persist-to /tmp/wstate
npx wrangler dev --local --persist-to /tmp/wstate
```

Local mode simulates `send_email` (it writes the message to a file), so local tests
never email Becca. **EmailJS is not simulated**: submitting the real form locally
still sends through EmailJS unless `emailjs.send` is stubbed.

When adding a file that should be live, confirm it is not caught by an existing
pattern. Verify with:

```
WRANGLER_LOG=debug npx wrangler deploy --dry-run 2>&1 | grep '^Ignoring asset: '
```

### D1 migrations

**Reconciled 2026-09-09.** The runner is safe to use. As of 2026-09-10 all four
migrations are recorded as applied.

**Set `CLOUDFLARE_ACCOUNT_ID` for every `d1` command.** `wrangler.jsonc` pins
`account_id`, but the `d1` subcommands do not read it, so they fail with *"More than
one account available but unable to select one in non-interactive mode"*. This is the
two-account trap described under Access notes, wearing a different hat:

```
export CLOUDFLARE_ACCOUNT_ID=20da6feefc828587a10b5b232912d1a5
```

**D1 rejects a multi-row `VALUES` clause past a low ceiling.** A 17 row insert failed
with `too many terms in compound SELECT` (`SQLITE_ERROR 7500`) while the identical
file applied cleanly to local SQLite. The cause is not obvious: SQLite implements a
multi-row `VALUES` as a compound SELECT internally, so a 17 row insert **is** a 17
term compound select, and D1's ceiling sits well below stock SQLite's 500. **Local
testing cannot catch this**, because local SQLite has the higher limit. Write one
statement per row, and resolve foreign keys with a two-table `WHERE` rather than a
`UNION ALL` chain. `0004_catalog_seed.sql` is the worked example.

**Make every seed statement `INSERT OR IGNORE`.** The failed attempt above left
nothing behind and the file was safe to re-run unchanged. Verify that claim against
the tables rather than assuming it.

**There is one database, and it is production's.** Preview, staging and production all
bind `augustine-inquiries`. There is no preview copy, so `migrations apply --remote`
touches production whatever branch the code is on, and Workers Builds does **not** run
migrations: only a human typing `wrangler d1 migrations apply` does. Migrations must
therefore land **before** the code that reads them, or the preview 500s on tables that
do not exist. Back up first; three rows cost nothing to export.

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
| **Contact form still has no field validation** | Partly addressed 2026-09-09. Still true: zero `required` attributes, so a blank form submits, and the estimated total is still computed client-side and posted as text, so it arrives from the client and can be edited before sending. `resolveCart` exists to fix exactly this but **is not yet wired into `/api/inquiries`**. The customer still gets no confirmation email, only Becca and Justin are notified. **No longer true:** submissions are stored in D1, and the endpoint has honeypot, timing, email-shape and rate-limit guards. A lost or spam-filtered email no longer means a lost inquiry. |
| **Em dash rule is violated site-wide** | **Fixed on `redesign`:** zero em or en dashes in visitor-facing copy across all six pages, dropdown labels and alt text included (the page builder checked each build). Still present on `main` and `booking-catalog`, about 26 of them. |
| **Both photos of Becca are cropped at the top of her head** | The crops happened before the photos reached the site, so there is nothing above her hair to recover. `.arch.is-framed` shows them whole rather than trimming further. Justin said on 2026-09-11 that uncropped originals exist and he can send them; with those, the arch treatment could be restored. |
| **`CNAME` points at a dead hostname** | Says `www.augustineevents.com`, which has no DNS record. Vestigial. Delete it or add the record. |
| **GitHub Pages is configured and broken** | Cert `bad_authz`, expired 2026-08-12, redirects to the non-resolving `www` host. Serves nobody. Recommend deleting the Pages config. |
| **Interior page heroes are screenshots** | **Fixed on `redesign`:** page heroes now put a WebP made from the photographer originals into an arch at roughly 460px wide, rather than stretching a 700px screenshot across the window. Still true on `main`. |
| **Music package lead line** | Changed by the owners 2026-09-11 on the `redesign` branch. Every package, all six, now leads with "Violin or Voice with Becca, or Piano with Justin" (Solo tiers previously said only "Violin with Becca"). The rest of each package is unchanged. The older ask to title them "Bronze Package, Violin or Voice with Becca" is superseded unless the owners say otherwise. `main` and `booking-catalog` still carry the old wording. |
| **`services.html` is orphaned** | Its footer inconsistency is gone on `redesign` (all six share one footer), but nothing links to the page: it returns 200 and only its own nav points at it. Either link it or take it down. |
| **`event-rentals.html` still hardcodes the catalog** | The booking form renders from D1 as of 2026-09-10, but the rentals page cards are still static HTML, so they can drift from D1. Left static on purpose for now: rendering them client-side would take the items out of the HTML search engines read. The fix is server-side rendering (HTMLRewriter in the Worker) or a test that fails when the page and the seed disagree. |
| **Italian vases still have no photo and no catalog entry** | Resolved as inventory (see below), but they remain `listed = 0`: bundle only, with no card on `event-rentals.html` and no photo. Revisit if Becca wants to rent them separately. |
| **Three replacement costs are text, not numbers** | In the inventory workbook: dinner plates, beverage dispensers, cornhole boards. Exhibit A of the rental contract pulls that column, and "Out of Stock" is not a chargeable amount. Blocking for contracts (Phase 04), not for anything sooner. |
| **The inventory workbook needs three corrections** | Beverage urns `Delivery Only` should be **N**; rectangular tablecloths `Qty Available` should be **3**; the Collections tab is missing a row for the live **$250 four-floral** discount. The workbook is Becca's file, so these have to be made there. |
| **No testimonials, and local SEO is thin** | No testimonials anywhere; real client quotes are needed before a section can exist, and inventing them is not an option. Service area now appears in the booking form note, the closing bands and the footer on `redesign`. |
| **`.git` is 157 MB** | Bloated by oversized images in history. Deleting them from the working tree does not shrink it; only a history rewrite does, which changes hashes for anyone with a clone. Separate decision. |

### Owner decisions, 2026-09-11

Taken with Justin while reviewing the `redesign` preview. All are live on that
branch and on none of the others.

| Decision | Where it landed |
|---|---|
| Every music package leads with **"Violin or Voice with Becca, or Piano with Justin"** | Six package cards on `event-music.html`. The Solo tiers previously offered violin only, and piano was not offered at all. Justin plays piano and asked to be added. |
| Piano is named wherever the site describes the music | Home hero line, home music card, the Music offer card, the footer tagline. |
| Becca's intro reads **"a professional musician for over 15 years"** | Home and About, plus About's search and share descriptions. It replaced "a professional events planner and violinist". |
| The label above her intro reads **"Violinist, vocalist, and decorator"** | About page. |
| Becca approved the redesign on 2026-09-11 | Tweaks still outstanding; do not merge until the owners say so. |

**Copy written for the redesign that the owners have not explicitly approved
line by line:** the small labels above headings ("What we offer", "Good to know",
"Let's talk", "The collection", "Live performance", "What we play", "Get in touch"),
the home hero line, the three offer card summaries, the footer tagline, and the note
beside the booking form. Every claim in them comes from copy already on the site or
from the inventory workbook. Flag them if anything reads wrong.

### Resolved 2026-09-10

| Was | Now |
|---|---|
| The catalog lived in two hardcoded pages and drifted | `items`, `bundles`, `bundle_items` live in D1, seeded from the inventory workbook and verified in production: 17 items, 4 bundles, 8 memberships. |
| No server-side pricing | `resolveCart` in `js/pricing.js`, 21 tests. Wired into `/api/inquiries` 2026-09-10: the stored rental breakdown and total are the server's, not the browser's. |
| Brass items always read "Included in the Entire Brass Collection Bundle" | On the booking form, `.rental-item-note { display: block }` overrode the `hidden` attribute on that label, so it showed whether or not the bundle was ticked. Fixed with a `[hidden]` rule when the picker moved to `js/rental-picker.js`. |
| The $100 order minimum was advertised but never enforced | `event-rentals.html` line 390 promises it; `contact.html` never checked. The resolver does. |
| Italian vases were an inventory mystery | Real, and two SKUs: **2 small at $5** (`BR-VS-ITL-SM`) and **1 large at $15** (`BR-VS-ITL-LG`). The Brass Collection Bundle had been selling them for as long as it existed with no page listing them. Seeded active but unlisted, so the bundle can reserve them. |
| Hold buffers were assumed to be one global number | Per item, from the workbook's Turnaround Days column. Linens 3, washed items 2, everything else 1, never 0. |
| Beverage urns delivery-only status unconfirmed | Becca confirmed **not** delivery only. The workbook cell says otherwise and is wrong. |
| Booking system planned as a separate Next.js app | Settled: built here, in this Worker, on D1. No React, no build step. See "What this is". |
| `augustine-booking-build-spec.md` did not exist | Replaced by a build plan artifact. See "What is coming". |

**Prices confirmed unchanged 2026-09-09** where the workbook disagreed with the live
site. The live figure won in both cases: candlestick collection **$140** (workbook said
$145), Brass Collection Bundle **$230** (workbook said $240). All 3 rectangular
tablecloths are rentable; the workbook's "2 available" is stale. The **$250 four-floral**
discount is real and simply missing from the workbook.

Note the workbook's own Pricing Check tab grades the candlestick collection at a 3.3%
discount and the brass bundle at 6.3%, against a 15 to 25% norm, and suggests $120 and
$205. **That is a business decision for Becca and has not been taken.**

### Resolved 2026-09-09

| Was | Now |
|---|---|
| Inquiries existed only as an EmailJS send | Stored in D1 and sent from the Worker. Verified in production: a submission records a row and notifies both recipients. |
| No bot protection on the form | Honeypot, minimum fill time, email shape and per-IP rate limit. Verified live: a honeypot submission is answered 200 and writes no row. |
| Bundled rental lines misread in the summary | A bundled line showed `x4 ($75/ea)` while the total charged the $250 bundle, so the emailed summary appeared not to add up. It now uses the same condition the total does. |
| Workers Builds connected but never exercised | First build-sourced deployment, `4984765d`. See Deployment. |
| Beverage urns delivery-only status unconfirmed | Confirmed by Becca: urns are **not** delivery only. Customer pickup is fine. The markup already carried no flag on either page, so no change was needed. |
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

**Rental bundles.** Bundles are data in D1, not markup. A bundle of one item is a volume discount that applies by itself; a bundle of several items is a package the visitor ticks as a unit, which locks and mutes its members so nobody pays twice. `js/rental-picker.js` derives both from the catalog, so adding a bundle means adding rows, never new code. See "The rental catalog".

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

The booking system is **being built in this repo**, extending the Worker with D1. The
`augustine-booking-build-spec.md` this file used to reference never existed on disk; it
was replaced by a build plan artifact, which carries the data model, the availability
rule, the phasing and the open questions:

`https://claude.ai/code/artifact/cc1764ed-2068-4d5a-99ad-65a0b0bd7ac0`

That plan is itself **one phase stale**: it describes the Worker as assets-only with no
`main` script, which stopped being true on 2026-09-05. Read it for the design, not for
the status.

| Phase | State |
|---|---|
| **00** Stop losing inquiries | Done 2026-09-09, except Turnstile. Guards are honeypot, fill time, email shape and per-IP rate limit instead. |
| **01** Inventory becomes data | **Mostly done 2026-09-10.** Schema, seed, pricing, `GET /api/catalog`, the booking form picker with photos, and server pricing of inquiries. Remaining: `event-rentals.html` still renders its cards from static HTML (see Known issues), and music packages are not catalog items, so `music_price` is still taken from the browser. |
| **Redesign** | Built 2026-09-11 on `redesign`, approved by the owners, tweaks outstanding, **not merged**. See Branches and previews. |
| **02** Availability | Not started. Needs the date-overlap query, using the per-item buffers already seeded. |
| **03** Self-serve booking | Not started. Needs a Durable Object to serialize reservation, plus cron hold expiry. |
| **04** Contracts and payment | Not started. Blocked on the three text replacement costs and on a deposit and cancellation policy. |

**Decisions taken with the owners 2026-09-09:**

- **Bookings require Becca's approval**, they do not auto-confirm. This preserves the
  consultative close; the plan flags self-serve as fighting the existing sales process.
- **Courtesy holds last 48 hours.**
- **Rental period is 48 hours**, typically Friday 10am to Sunday 10am.
- **Payments stay payment-agnostic.** Confirmation is a state transition, never coupled
  to a payment event. Venmo and Zelle are recorded manually; Stripe stays a seam.

**The race condition is the launch blocker for Phase 03.** Two people checking out the
last Wisteria Chandelier a second apart will both pass an availability check and both
write a booking. A third of the catalog is one-of-one. Reading availability and writing
the reservation must be one indivisible step, which is what the Durable Object is for.
Do not ship self-serve booking without it.

**Still unanswered:** deposit amount, cancellation and refund policy, whether the
contract wording holds up in Tennessee (not a question to answer from here), and who is
on call when a booking fails at 11pm on a Friday.
