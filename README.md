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
| `data/profile.json` | Name, tagline, bio (`en`/`tr`), genres, venues, email, management, rider, social links, hero image/video, Web3Forms key |
| `data/releases.json` | SoundCloud sets, newest first is the "Listen Live" target. Artwork goes in `site/assets/img/releases/` (400×400 WebP) |
| `data/gigs.json` | Dates. Past/upcoming is split at build time and again in the browser |
| `data/media.json` | `photos` (`src`, `alt {en,tr}`, `width`, `height`, `credit`, `press`, `download`) and `videos` (`youtubeId`, `poster`, `title {en,tr}`) |
| `scripts/i18n.js` | UI strings, both languages |

Still to fill in: EPK bio (`bioDraft: true` until then), Resident Advisor / Spotify / YouTube / Bandsintown links, hero photo or video loop (`site/assets/hero.*`; keep the video ≤ 2 MB, it only plays on wide screens), press photos with photographer credits, management, rider, upcoming dates.

### Booking form

Set `profile.form.web3formsAccessKey` (free key from [web3forms.com](https://web3forms.com), created for the address that should receive enquiries). Without a key the form opens a prefilled email to `booking@inansounds.com`.

### Email (booking@inansounds.com)

Free forwarding (e.g. ImprovMX) to a personal inbox. DNS at Squarespace:

- MX `@` → `mx1.improvmx.com` (10), `mx2.improvmx.com` (20)
- TXT `@` → `v=spf1 include:spf.improvmx.com ~all` (replaces the current `v=spf1 -all`)
- TXT `_dmarc` → `v=DMARC1; p=none; rua=mailto:booking@inansounds.com`

## Publish

`npm run check` builds and validates. Pushing to `main` deploys `hosting:inan`; PRs get a 7-day preview channel. Manually: `npm run check && npm run deploy`.

CI authenticates with Workload Identity Federation; the deployer service account needs `roles/iam.workloadIdentityUser` for `principalSet://iam.googleapis.com/projects/239510573325/locations/global/workloadIdentityPools/github-actions/attribute.repository/collective-bucket/inan`.

## License

Code: MIT (see `LICENSE`). Photos, artwork, recordings and texts about the artist: © INÄN, all rights reserved.
