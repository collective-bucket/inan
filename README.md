# inan

[inansounds.com](https://inansounds.com): the official site of INÄN (inan.sounds), Istanbul DJ. Static HTML on Firebase Hosting (`collective-bucket` project, site `cbucket-inan`). English at `/`, Turkish at `/tr`.

## Run locally

```sh
npm ci
npm run serve   # builds, then http://localhost:5057
```

## Content

All content lives in `data/` and is rendered to plain HTML at build time (`scripts/build.js` → `public/`), so search engines and AI crawlers read it without JavaScript.

| File | What |
| --- | --- |
| `data/profile.json` | Name, roles, tagline, bio (`en`/`tr`), genres, venues, email, management, rider, `pressKit` (PDF in `site/assets/press/`), social links (`schemaOnly: true` = JSON-LD `sameAs` only, not shown), `disambiguation {en,tr}`, `googleSiteVerification` (optional meta tag value), hero (`photo`/`mobilePhoto` = ids from `media.json`, optional `video`), Web3Forms key |
| `data/releases.json` | SoundCloud sets, newest first is the "Listen Live" target. Artwork goes in `site/assets/img/releases/` (400×400 WebP) |
| `data/gigs.json` | Dates. Past/upcoming is split at build time and again in the browser |
| `data/media.json` | `photos` (`id`, `src` prefix → `site/assets/img/photos/<name>-<width>.{avif,webp}`, `widths`, `width`/`height` of the original, `focus` (`center`/`right`), `gallery: false` = EPK only, `alt {en,tr}`, `credit`, `creditUrl`, `press`, `download` = 2400 px JPG in `site/assets/img/press/`) and `videos` (`youtubeId`, `poster`, `title {en,tr}`) |
| `scripts/i18n.js` | UI strings, both languages |

Logo: `site/assets/img/logo.svg` (dark, for light backgrounds) and `logo-light.svg` (inlined in the header and hero). Photos: © Can Sarıçoban.

Still to fill in: Resident Advisor / Spotify / YouTube / Bandsintown / Mixcloud / Discogs / MusicBrainz / Wikidata links, optional hero video loop (keep it ≤ 2 MB, it only plays on wide screens), live/club photos, management, upcoming dates.

### Search and Knowledge Panel

The JSON-LD describes one entity, `Person` `#person` (no separate `MusicGroup`), referenced by the sets (`MusicRecording.byArtist`), dates and Sound of Berlin. Every profile link with a URL becomes `sameAs` and `rel="me"`. `sitemap.xml` lists both languages with hreflang/x-default, press photos and the press kit PDF; `lastmod` is the last commit touching `data/`, `site/` or `scripts/`. Search Console: add a Domain property for inansounds.com (DNS TXT at Squarespace) and submit `https://inansounds.com/sitemap.xml`.

### Booking form

Set `profile.form.web3formsAccessKey` (free key from [web3forms.com](https://web3forms.com), created for the address that should receive enquiries). The form posts to Web3Forms with `fetch` (subject built from venue/date/city; the sender's `email` becomes Reply-To). On error or a 15 s timeout it shows a prefilled `mailto:` link; without a key it only opens that mailto. The key is public by design; the free plan has no domain restriction, so spam is handled by the `botcheck` honeypot.

### Email (booking@inansounds.com)

Squarespace's built-in email forwarding (Domains → inansounds.com → Email forwarding) to a personal inbox; Squarespace manages the MX records (`mxa`/`mxb.mailgun.org`). Inbound only: replies go out from the personal address.

## Publish

`npm run check` builds and validates. Pushing to `main` deploys `hosting:inan`; PRs get a 7-day preview channel. Manually: `npm run check && npm run deploy`.

CI authenticates with Workload Identity Federation; the deployer service account needs `roles/iam.workloadIdentityUser` for `principalSet://iam.googleapis.com/projects/239510573325/locations/global/workloadIdentityPools/github-actions/attribute.repository/collective-bucket/inan`.

## License

Code: MIT (see `LICENSE`). Logo, artwork, recordings and texts about the artist: © INÄN; photos: © their photographers (credited on the site). All rights reserved.
