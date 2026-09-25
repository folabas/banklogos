# banklogos

## 0.1.1

### Patch Changes

- 5cd9593: React Native / Expo support: new `banklogos/native/<id>` entry points return an image source for `<Image>` (PNG or WebP, with PNG renderings of the SVG logos, since React Native can't draw SVG in `<Image>`). `banklogos/img/<id>` now passes React Native asset ids through instead of returning `undefined`. Tested with Expo SDK 57 / React Native 0.86 on Android, iOS and web.

## 0.1.0

### Minor Changes

- 75de037: First release: logos for 272 of 279 Nigerian bank codes (banks, microfinance banks, mortgage banks, payment service banks and wallets) plus Visa and USDT. Lookup by bank code, name or search; per-logo imports (`banklogos/img/<id>`), raw SVG markup (`banklogos/svg/<id>`), shipped files under `banklogos/assets/`, and `logoUrl()` for CDN links.
