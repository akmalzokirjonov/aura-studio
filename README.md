# AURA — Where imagination connects

A responsive creative studio concept with a black-and-bronze palette, editorial typography, glass cards, and an interactive neural canvas.

**Live website:** https://akmalzokirjonov.github.io/aura-studio/

## Features

- Responsive layout for phones, tablets, and desktops.
- SVG connections between the main canvas and satellite cards, recalculated on resize.
- Accessible studio dialogs with keyboard support and focus restoration.
- Three curated visual directions with independent editable briefs.
- Downloadable creative briefs and reference images.
- Monthly/yearly pricing toggle with an exact 20% annual discount.
- Motion preview with a pause button and reduced-motion support.
- Local fonts and images, with no external runtime requests or third-party JavaScript.

This is a **frontend product concept**. AI generation, paid subscriptions, collaboration, authentication, and email delivery are not connected. The interface identifies preview imagery and concept pricing. The digest form does not collect or transmit email addresses. Briefs remain in memory until downloaded; reloading clears them.

## Run locally

No build step or package installation is required. From this folder:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173/ in your browser.

## Publish changes

GitHub Pages publishes the root of the `main` branch. Commit and push changes to update the live site automatically. `.nojekyll` keeps the site as plain static files. Relative asset URLs work under the `/aura-studio/` project path.

The same folder can also be deployed as a static site on Vercel, Netlify, or another static host without a framework or build command.

## Files

| File         | Purpose                                                          |
| ------------ | ---------------------------------------------------------------- |
| `index.html` | Semantic page, sections, and dialogs                             |
| `styles.css` | Design tokens, layouts, responsive styles, and motion            |
| `app.js`     | Canvas connections, previews, downloads, navigation, and pricing |
| `assets/`    | Locally hosted images, fonts, favicon, and font licenses         |

## Artwork and fonts

The bronze flower in `assets/sculpture.png` was created for this project using the built-in image generation tool. The generation brief is recorded in [ASSETS.md](ASSETS.md).

Other images are illustrative photography from Unsplash, downloaded locally. They do not depict AURA employees or offices. Inter and Playfair Display are distributed under the SIL Open Font License; their licenses are included in `assets/`.

## Verification

Checked in Chromium at 375, 390, 768, 1024, and 1440 pixel widths. Browser checks cover image/font loading, horizontal overflow, pricing calculations, scene changes, per-scene brief preservation, brief downloads, modal keyboard behavior and focus restoration, motion controls, mobile navigation, and reduced-motion behavior. No browser console errors were observed in the local checks.
