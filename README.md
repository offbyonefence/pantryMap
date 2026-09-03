# PantryMap

A free, privacy-focused directory of food banks and food pantries — starting with the
Dallas/Fort Worth metroplex and built to grow US-wide. Everyone is welcome to every
listing, regardless of who they are or what they believe.

**The data is the repo.** Each food bank is one JSON file in
[`data/foodbanks/`](data/foodbanks/), added and maintained through pull requests, and the
site is a static page on GitHub Pages. No servers, no database, no accounts.

## Privacy by design

- No analytics, cookies, ads, or tracking of any kind.
- No external requests on page load — every asset (including the map library) is served
  from this repo.
- ZIP code search resolves against a bundled lookup table, entirely in the browser.
- "Use my location" uses the browser's geolocation with explicit permission; coordinates
  never leave the device.
- Exactly two opt-in actions contact an outside service (the nonprofit OpenStreetMap):
  free-text address search (Nominatim) and map tiles if the map is opened. Both are
  disclosed in the UI where they happen.

## Contributing

Add, fix, or remove a listing with a pull request — see [CONTRIBUTING.md](CONTRIBUTING.md).
Not a GitHub user? Open an issue with the "Add a food bank" or "Report incorrect info" form.

## Development

Install [mise](https://mise.jdx.dev), then:

```sh
mise install         # installs bun + dagger
mise run serve       # build + serve locally on :3663 (FOOD)
mise run ci          # every CI check, containerized via Dagger (needs Docker)
mise run ci-local    # same checks natively — fast, no Docker needed
mise run zips:generate   # regenerate the ZIP centroid table (rarely needed)
```

Site code is vanilla HTML/CSS/JS with zero package dependencies; build tooling runs on
Bun. CI (lint, tests, build) is defined once as a [Dagger](https://dagger.io) module in
`.dagger/` — the exact same containerized pipeline runs locally and in GitHub Actions.

## Licenses & attribution

- Code: [AGPL-3.0](LICENSE).
- ZIP code centroids derived from [GeoNames](https://www.geonames.org/) postal data
  ([CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/)).
- Maps: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors; geocoding
  by [Nominatim](https://operations.osmfoundation.org/policies/nominatim/).
- [Leaflet](https://leafletjs.com/) (BSD-2-Clause) is vendored in `vendor/leaflet/`.
- [Inter and Inter Tight](https://rsms.me/inter/) fonts (SIL OFL 1.1) are vendored in
  `vendor/fonts/` — license in `vendor/fonts/OFL.txt`.
