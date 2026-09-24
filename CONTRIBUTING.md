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

4. Run `npm run normalize && npm run validate`.

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

## SVG rules (checked by `npm run validate`)

- The root `<svg>` has a valid `viewBox`.
- No `<script>`, `<foreignObject>`, embedded `<image>`, event handlers or external references.
- At most 20 KB after normalizing.
