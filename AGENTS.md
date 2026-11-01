# AGENTS

- Content is in `data/*.json`; never hand-edit `public/` (generated, gitignored). `npm run check` builds and validates.
- Every UI string in `scripts/i18n.js` needs both `en` and `tr`; data text fields are `{ en, tr }`.
- Keep the site light: no frameworks, no web fonts, third-party embeds only behind a click (facade). New third-party origins must be added to the CSP in `firebase.json`.
- "yayınla" = `npm run check && npm run deploy` (hosting only).
- Photos need a photographer credit; images are "all rights reserved", only the code is MIT.
