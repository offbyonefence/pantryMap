# AGENTS.md

Guidance for AI coding agents working in this repository. Humans: see README.md and
CONTRIBUTING.md first.

## What this is

PantryMap — a privacy-focused static site (GitHub Pages) helping people find food banks.
Data lives as one JSON file per food bank in `data/foodbanks/`, maintained via pull
requests. Vanilla HTML/CSS/JS, zero package dependencies for the site itself.

## Hard rules

- **Bun, never Node/npm.** All scripts run with `bun`; do not add `package.json`
  dependencies, `node_modules`, or npm/npx invocations to the site or scripts.
- **mise is the task runner.** Run everything through `mise run <task>`; add new tasks as
  file-based scripts under `.mise/tasks/` (bash, `set -euo pipefail`, `#MISE` metadata).
- **Branch is `master`**, not main. License is **AGPL-3.0** — do not add MIT-licensed
  project text or relicense.
- **Privacy is the product.** The deployed page must make zero external requests on load.
  No analytics, no CDNs, no external fonts. Only two opt-in exceptions exist, both
  OpenStreetMap: Nominatim address search and map tiles — each disclosed in the UI where
  it happens. Never add a third without explicit owner approval.
- **Escape everything rendered from data.** Data files arrive via community PRs and are
  untrusted. Any string interpolated into HTML — including attributes and Leaflet
  popups — goes through `escapeHtml()` from `js/search.js`. Schema URL patterns reject
  quotes; keep it that way.
- **Data honesty.** `sourceUrl` must be the page that actually carries the verified
  facts (not the org homepage); `lastVerified` is the date someone actually checked.
  Never invent or guess addresses, hours, or phone numbers — drop unverifiable entries.
- Local dev server port is **3663** ("FOOD").

## Commands

```sh
mise run ci          # canonical CI: containerized via Dagger (needs Docker)
mise run ci-local    # same checks natively — fast, no Docker
mise run test        # bun test tests/
mise run lint:data   # schema-validate data/foodbanks/*.json
mise run build       # assemble dist/
mise run serve       # build + serve on :3663
mise run zips:generate  # rebuild data/zips.json from GeoNames (rarely)
```

CI is defined once as a Dagger module in `.dagger/` (TypeScript SDK on the Bun runtime).
GitHub Actions calls the same pipeline — keep `.mise/tasks/`, `scripts/`, and `.dagger/`
in sync when changing checks.

## Layout

- `index.html`, `css/style.css`, `js/` — the site. Two-state UI (landing → results).
  CSS uses `color-scheme` + `light-dark()` for auto theme; keep all colors as
  `light-dark()` token pairs and keep text at WCAG AA contrast (measure, don't eyeball).
- `js/search.js` — pure logic, no DOM; everything here must stay unit-testable.
  `js/app.js` — DOM wiring. `js/map.js` — lazy Leaflet. `js/geocode.js` — location.
- `data/schema/foodbank.schema.json` — the data contract; `scripts/lib/validate-lib.mjs`
  is a zero-dependency validator implementing the subset of JSON Schema the contract uses.
- `vendor/` — self-hosted Leaflet and Inter fonts (licenses inside; keep them).
- `tests/` — bun tests. Use timezone-explicit dates (`-05:00`); "open now" logic is
  evaluated in each listing's `timezone` (default America/Chicago), never the visitor's.

## Verification bar

Before claiming work done: `mise run ci-local` green (or `mise run ci` when Docker is
available), and for data changes confirm the entry renders sensibly (distance sort,
badges, hours formatting) via `mise run serve`.
