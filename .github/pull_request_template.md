<!-- Thanks for helping neighbors find food! Fill in the section that matches your PR
     and delete the rest. -->

## What does this PR do?



## Type of change

- [ ] 🥫 Data — add, update, or remove a food bank listing
- [ ] 💻 Site — HTML/CSS/JS changes
- [ ] 🔧 Tooling/CI — scripts, mise tasks, Dagger, workflows
- [ ] 📝 Docs

## Data checklist (for `data/foodbanks/` changes)

- [ ] Every fact (address, phone, hours) comes from the organization's own site or a
      direct confirmation — nothing guessed
- [ ] `sourceUrl` points to the page that **actually carries those facts**, not just the homepage
- [ ] `lastVerified` is today's date
- [ ] The organization serves everyone — religious participation is never required to receive food
- [ ] The listing uses the client-facing pantry address/hours, not an admin office
- [ ] `mise run lint:data` passes locally (optional — CI runs it too and tells you exactly what to fix)

## Code checklist (for site/tooling changes)

- [ ] `mise run ci-local` (or `mise run ci`) is green
- [ ] No new external requests on page load — the privacy guarantee in the README still holds
- [ ] Any data-derived string rendered into HTML goes through `escapeHtml()`
- [ ] Colors keep WCAG AA contrast in both light and dark themes
