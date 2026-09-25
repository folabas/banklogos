# Contributing

## Adding a logo

1. Create `logos/<scope>/<id>/`. `<scope>` is a lower-case ISO country code (`ng`, `gh`) or `global`. `<id>` is a kebab-case slug that is not already used anywhere in `logos/`.
2. Add `logo.svg` (the full logo). Optionally add `mark.svg` (the icon only), but only when the brand publishes one. Don't crop or recolour logos yourself.
3. Add `meta.json`:

```json
{
  "id": "gtbank",
  "name": "Guaranty Trust Bank",
  "shortName": "GTBank",
  "aliases": ["GTB", "Guaranty Trust"],
  "scope": "NG",
  "markets": ["NG"],
  "types": ["bank"],
  "variants": ["logo"],
  "colors": { "primary": "#FF4713" },
  "website": "https://www.gtbank.com",
  "regulatorRef": { "body": "CBN", "category": "commercial-bank" },
  "source": { "url": "https://www.gtbank.com", "license": "official-site", "fetchedAt": "2026-09-24" },
  "verified": false,
  "addedIn": "0.1.0"
}
```

If `mark.svg` comes from a different place than `logo.svg`, record where in `variantSources`:

```json
"variantSources": {
  "mark": { "url": "https://moniepoint.com/icon.svg", "license": "official-site", "fetchedAt": "2026-09-24" }
}
```

4. Run `npm run normalize && npm run validate`, then `npm run preview` to check how the logo looks on light and dark backgrounds and at 32px.

Always set `verified: false`. A maintainer changes it to `true` after reviewing the logo.

## Sources, in order of preference

| `source.license`         | Use when                                                 |
| ------------------------ | -------------------------------------------------------- |
| `official-press-kit`     | The brand publishes a media or press kit                 |
| `cc-by-sa`               | Wikimedia Commons file under a free license              |
| `public-domain-textlogo` | Wikimedia Commons file tagged as a simple text logo      |
| `official-site`          | SVG taken from the brand's own website                   |
| `manual`                 | Recreated by hand. Needs extra review before it's merged |

Never trace a raster image. If no clean SVG exists, open a "wanted logo" issue instead.

## File formats

Keep originals lossless: `logo.svg` when the brand publishes a vector, otherwise the official image as `logo.png` (with `"formats": { "logo": "png" }`). The importer converts JPEG/WebP sources to PNG. The package build converts PNGs to WebP; never commit WebP.

## SVG rules (checked by `npm run validate`)

- The root `<svg>` has a valid `viewBox`.
- No `<script>`, `<foreignObject>`, embedded `<image>`, event handlers or external references.
- At most 20 KB after normalizing.

## Releasing

Releases are automated: you describe the change, merge one pull request, and GitHub Actions publishes to npm with provenance.

### 1. Add a changeset with your change

```bash
npx changeset
```

Pick the bump and write one or two sentences for the changelog:

| Bump      | Use for                                                                     |
| --------- | --------------------------------------------------------------------------- |
| **patch** | Logo fixes, metadata corrections, docs or tooling changes that ship         |
| **minor** | New logos or countries, new API                                             |
| **major** | Breaking API changes, or removing/renaming an entity id (ids are permanent) |

Commit the generated `.changeset/*.md` file with your change and merge it to `main`.

### 2. Merge the "Version packages" pull request

On every push to `main`, the **Release** workflow (`.github/workflows/release.yml`) runs:

```mermaid
flowchart LR
  A[Push to main] --> B{Pending<br/>changesets?}
  B -- yes --> C[Open/update<br/>Version packages PR]
  C -- you merge it --> A
  B -- no --> D{Version already<br/>on npm?}
  D -- no --> E[npm publish<br/>--provenance]
  E --> F[Wait for npm<br/>attestation]
  F --> G[Tag + GitHub Release]
  D -- yes --> H[Nothing to do]
```

- **With pending changesets**, it opens (or updates) a **"Version packages"** PR that bumps the version in `packages/core/package.json` and writes `packages/core/CHANGELOG.md`. Its CI check waits for a maintainer: click **Approve and run**.
- **Merging that PR** triggers the publish: the workflow builds, runs `npm publish --provenance --access public`, waits until npm serves the provenance attestation (npm can take a few minutes to list a new version), then creates the `banklogos@<version>` git tag and GitHub Release with the changelog section as notes. If the attestation never appears, the run fails instead of reporting success.

You can also start the workflow by hand from **Actions → Release → Run workflow**. It only publishes a version that isn't on npm yet, so re-running is safe.

### How publishing is authorised

There is no npm token. npm **trusted publishing** trusts this repository's `release.yml` through GitHub's OIDC identity, and the package gets a provenance attestation that links each version to the exact commit and workflow run. One-time setup (already done):

- npmjs.com → `banklogos` → Settings → **Trusted Publisher**: GitHub Actions, `folabas` / `banklogos`, workflow `release.yml`, no environment.
- GitHub → Settings → Actions → General → **Allow GitHub Actions to create and approve pull requests** (for the Version packages PR).
- The workflow needs `id-token: write` and npm 11.5.1 or later (it installs it; Node 22 ships npm 10).

Check a release with `npm audit signatures` in any project that installs it: it should report a verified registry signature and a verified attestation.

### If something goes wrong

| Symptom                                                                                 | Cause and fix                                                                                                                       |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Release fails with "GitHub Actions is not permitted to create or approve pull requests" | Turn on the GitHub setting above, then re-run.                                                                                      |
| Publish fails with an authentication error (`ENEEDAUTH`, 403, OIDC)                     | The Trusted Publisher on npmjs.com doesn't match: check owner, repo and the workflow **file name** (`release.yml`, not the path).   |
| "has no provenance attestation on npm"                                                  | The version may be on npm without provenance. It can't be republished; add a patch changeset and release the next version.          |
| A version PR shows "Checks 0" or "Action required"                                      | GitHub doesn't run workflows on bot-created PRs until a maintainer approves them. Approving is optional; `main` was already tested. |

**Manual publish (emergency only).** From `packages/core`, after `npm run build` at the root: `npm publish --provenance=false --access public` (needs `npm login` and your 2FA code). It won't carry provenance, and you must create the tag yourself: `git tag -a banklogos@<version> -m "banklogos <version>"` and `git push origin banklogos@<version>`.
