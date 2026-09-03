# Security Policy

PantryMap is a static site with no server, no accounts, and no user data storage — but
security still matters here: the site renders community-contributed data, and people in
vulnerable situations rely on it being trustworthy.

## Reporting a vulnerability

Please report vulnerabilities privately via
**[GitHub's private vulnerability reporting](../../security/advisories/new)**
(Security tab → "Report a vulnerability"). Do not open a public issue for anything
exploitable.

You can expect an acknowledgment within a week. There is no bug bounty — this is a
volunteer community project — but reporters are credited in the fix unless they prefer
otherwise.

## Scope

In scope:

- Any way for contributed data (`data/foodbanks/*.json`) to execute script, break out of
  its rendering context, or alter the page beyond its own listing (XSS via name, address,
  URL, notes, etc.)
- Bypasses of the schema validation that CI runs on pull requests
- Ways to make the deployed site contact services other than the disclosed
  OpenStreetMap endpoints, or otherwise violate the privacy guarantees in the README
- Supply-chain issues in the build pipeline (mise tasks, Dagger module, GitHub Actions)

Out of scope:

- Incorrect food bank information (use the
  ["Report incorrect info" issue form](../../issues/new?template=report-incorrect-info.yml))
- Vulnerabilities in GitHub Pages, OpenStreetMap, or other third-party platforms
- The local dev server (`scripts/serve.mjs`) — it binds to 127.0.0.1 and is not deployed

## Design notes for reviewers

All data-derived strings are escaped with `escapeHtml()` (`js/search.js`) before touching
HTML — including attributes and map popups — and the schema rejects quote characters in
URLs. The deployed page makes zero external requests on load; every asset is self-hosted.
