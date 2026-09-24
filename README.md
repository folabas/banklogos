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
getLogo({ name: 'GTB' }); // by name, short name or alias
getLogo({ name: 'Access Bank', country: 'GH' }); // prefer a country
searchLogos('acc', { limit: 5 });
listByCountry('NG'); // includes global brands operating in Nigeria (Visa, Mastercard, ...)
listByType('mobile-money');
```

Lookups never throw. An unknown id or name returns `undefined`.

The metadata above holds no SVG content. Import each SVG on its own, so your bundle contains only the logos you use:

```ts
import gtbank from 'fintech-logos/svg/gtbank'; // full logo, SVG string
import gtbankMark from 'fintech-logos/svg/gtbank-mark'; // icon-only mark, when the entity lists a "mark" variant
```

## Entity metadata

| Field                          | Meaning                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `id`                           | Stable slug. Never renamed or reused.                                                                       |
| `scope`                        | ISO country code (`NG`) or `global`                                                                         |
| `markets`                      | Countries where the brand operates                                                                          |
| `types`                        | `bank`, `microfinance-bank`, `mobile-money`, `e-wallet`, `payment-gateway`, `card-network`, `crypto`        |
| `variants`                     | `logo` (always present), `mark` (optional icon-only version)                                                |
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
