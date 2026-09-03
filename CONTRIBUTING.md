# Contributing

Thank you for helping neighbors find food. This directory is community-maintained: every
food bank listing is a small JSON file in [`data/foodbanks/`](data/foodbanks/), and adding,
fixing, or removing one is a normal GitHub pull request.

**Not comfortable with GitHub?** Open an issue instead using the
[Add a food bank](../../issues/new?template=add-food-bank.yml) or
[Report incorrect info](../../issues/new?template=report-incorrect-info.yml) form and a
maintainer will make the change for you.

## Ground rules

- **Everyone welcome.** Listings must serve people regardless of religion, background, or
  identity. An organization's religious affiliation may be noted in the `affiliation` field
  for information, but **no listing may require religious participation (services, prayer,
  counseling) as a condition of receiving food.**
- **Verify before you write.** Every fact (address, phone, hours) must come from the
  organization's own website or a direct confirmation. Put the URL you checked in
  `sourceUrl` and today's date in `lastVerified`.
- **Client-facing details only.** Use the pantry/distribution address and hours, not the
  admin office, if they differ.

## Adding a food bank

1. Copy an existing file in `data/foodbanks/` as a template.
2. Name the file `{state}-{city}-{short-name}.json`, all lowercase kebab-case, e.g.
   `tx-plano-minnies-food-pantry.json`. The `id` field inside must match the filename.
3. Fill in the fields — see [`data/schema/foodbank.schema.json`](data/schema/foodbank.schema.json)
   for every field and its format. Required: `id`, `name`, `address`, `lat`, `lng`,
   `services`, `lastVerified`.
4. Get coordinates: find the address on [OpenStreetMap](https://www.openstreetmap.org)
   (right-click → "Show address") or any geocoder, and copy latitude/longitude to 4+ decimals.
5. Check your work locally (optional but appreciated):
   ```sh
   mise run lint:data   # validates your file against the schema
   mise run serve       # browse the site at http://localhost:3663
   ```
6. Open a pull request. CI runs the same validation and will tell you exactly what to fix
   if something's off.

### Field tips

- `hours` is for **regular weekly** distribution hours (24-hour times). For anything
  irregular — "2nd Saturday of the month" — leave `hours` short or empty and explain in
  `hoursNotes`.
- `idRequired` / `appointmentRequired` / `serviceAreaRestricted`: use `true`/`false` only
  when the organization states it clearly; use `null` (or omit) when unknown. The site's
  filters only trust explicit `false` values.
- `requirements` is free text shown to visitors: "Bring a photo ID and proof of address."

## Editing or removing

- **Editing:** change the file, update `lastVerified` and `sourceUrl`, open a PR.
- **Removing:** delete the file, and in the PR description say why (closed, moved, etc.)
  with a link if available.

## Local development

Install [mise](https://mise.jdx.dev), then:

```sh
mise install        # installs bun (the only tool needed)
mise run ci         # lint + test + build, same as CI
mise run serve      # local server on :3663
mise tasks          # list everything
```
