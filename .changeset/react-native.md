---
'banklogos': patch
---

React Native / Expo support: new `banklogos/native/<id>` entry points return an image source for `<Image>` (PNG or WebP, with PNG renderings of the SVG logos, since React Native can't draw SVG in `<Image>`). `banklogos/img/<id>` now passes React Native asset ids through instead of returning `undefined`. Tested with Expo SDK 57 / React Native 0.86 on Android, iOS and web.
