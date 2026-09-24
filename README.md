# fintech-logos

Logos for banks, mobile money providers, e-wallets, payment gateways, card networks and crypto assets. One package, one consistent format, starting with Nigeria.

> **Status:** pre-release (M0). No logos are published yet.

## Install

```bash
npm install fintech-logos
```

## Usage

```ts
import { getLogo, searchLogos, listByCountry, listByType } from 'fintech-logos';

getLogo('gtbank'); // by id
getLogo({ bankCode: '058' }); // by the bank code a transfer API returned (Paystack/NIBSS codes)
getLogo({ name: 'GTB' }); // by name, short name or alias
getLogo({ name: 'Access Bank', country: 'GH' }); // prefer a country
searchLogos('acc', { limit: 5 });
listByCountry('NG'); // includes global brands operating in Nigeria (Visa, Mastercard, ...)
listByType('mobile-money');
```

Lookups never throw. An unknown id or name returns `undefined`.

The metadata above holds no image data. Import each logo on its own, so your app only ships the logos it uses:

```ts
import gtbank from 'fintech-logos/img/gtbank'; // URL for <img src>, any format
import gtbankMark from 'fintech-logos/img/gtbank-mark'; // icon-only mark, when the entity has one
import gtbankSvg from 'fintech-logos/svg/gtbank'; // raw SVG markup, only for logos shipped as SVG
```

`img/<id>` imports the image file itself, so your bundler (Vite, webpack, Next.js, Parcel, Rollup with an asset plugin) emits it and gives you its URL, in dev and production builds alike. In plain Node, `require('fintech-logos/img/<id>')` returns the `file://` URL of the file inside the installed package. The files are also available directly as `fintech-logos/assets/<id>.<svg|webp>` (and `<id>-mark.<ext>`). Test runners that don't understand image imports (e.g. Jest) need their usual image mock.

Logos are shipped as SVG where the institution publishes a vector logo, and as WebP otherwise (the institution's official PNG or app icon, at most 512px). `entity.formats` tells you which variants are WebP.

## Entity metadata

| Field                          | Meaning                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `id`                           | Stable slug. Never renamed or reused.                                                                       |
| `scope`                        | ISO country code (`NG`) or `global`                                                                         |
| `markets`                      | Countries where the brand operates                                                                          |
| `types`                        | `bank`, `microfinance-bank`, `mobile-money`, `e-wallet`, `payment-gateway`, `card-network`, `crypto`        |
| `variants`                     | `logo` (always present), `mark` (optional icon-only version)                                                |
| `formats`                      | Variants shipped as WebP rather than SVG, e.g. `{ "logo": "webp" }`                                         |
| `bankCodes`                    | Bank codes used by transfer APIs (Nigeria: Paystack/NIBSS codes like `"058"`)                               |
| `verified`                     | `true` once a maintainer has confirmed the logo is current. Filter on it if you only want reviewed entries. |
| `source.url`, `source.license` | Where the file came from                                                                                    |
| `variantSources.mark`          | Where the mark came from, when that differs from `source`                                                   |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Each logo lives in `logos/<scope>/<id>/` as `meta.json` plus `logo.svg` (and optionally `mark.svg`).

```bash
npm install
npm run normalize   # optimize SVGs with SVGO
npm run validate    # schema + SVG checks
npm test
npm run build
```

## Legal

All logos are trademarks of their respective owners. They are included **for identification purposes only**. Their inclusion does not imply endorsement by, or affiliation with, any owner. Owners can request removal; see [TAKEDOWN.md](TAKEDOWN.md).

The MIT license in [LICENSE](LICENSE) covers the **code** in this repository. It does not cover the logos.
