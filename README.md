# AURA — Where imagination connects

A responsive creative studio concept with a black-and-bronze palette, editorial typography, glass cards, and an interactive neural canvas.

**Live website:** https://akmalzokirjonov.github.io/aura-studio/

## Features

- Responsive layout for phones, tablets, and desktops.
- SVG connections between the main canvas and satellite cards, recalculated on resize.
- Accessible studio dialogs with keyboard support and focus restoration.
- Three curated visual directions with independent editable briefs.
- Downloadable creative briefs and reference images.
- Real image generation with Stable Diffusion and Deliberate through AI Horde.
- Queue updates, cancellation, timeout handling, and downloadable AI results.
- Monthly/yearly pricing toggle with an exact 20% annual discount.
- Motion preview with a pause button and reduced-motion support.
- Local fonts, reference images, and JavaScript. AI requests go directly to AI Horde only after the visitor submits a prompt.

**Image generation is live and free.** It uses [AI Horde](https://github.com/Haidra-Org/AI-Horde), a volunteer service with anonymous access. No private API key, backend, registration, or payment is required. Availability and waiting time depend on volunteer workers; anonymous requests have low queue priority and can be restricted during heavy load. The studio submits one 512 × 512 image at a time and stops after ten minutes.

Before submitting, visitors must acknowledge that their prompts go to community workers and **anonymous generated images are shared with LAION for AI training**. This is a provider condition, not a toggle AURA can disable for anonymous requests. Avoid confidential prompts. AURA does not store drafts or generated images; download results before reloading. See the provider's [API documentation](https://aihorde.net/api/) and [privacy policy](https://aihorde.net/privacy/).

AI video generation, paid subscriptions, team collaboration, and email delivery remain concepts. The interface identifies reference previews and concept pricing. The digest form does not collect or transmit email addresses.

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

| File          | Purpose                                                          |
| ------------- | ---------------------------------------------------------------- |
| `index.html`  | Semantic page, sections, and dialogs                             |
| `styles.css`  | Design tokens, layouts, responsive styles, and motion            |
| `app.js`      | Canvas connections, previews, downloads, navigation, and pricing |
| `ai-horde.js` | AI request lifecycle, polling, cancellation, and provider errors |
| `assets/`     | Locally hosted images, fonts, favicon, and font licenses         |

## Artwork and fonts

The bronze flower in `assets/sculpture.png` was created for this project using the built-in image generation tool. The generation brief is recorded in [ASSETS.md](ASSETS.md).

Other images are illustrative photography from Unsplash, downloaded locally. They do not depict AURA employees or offices. Inter and Playfair Display are distributed under the SIL Open Font License; their licenses are included in `assets/`.

## Verification

Run `npm test` with Node.js 20 or newer. The tests have no dependencies and do not make real API calls. They cover completed generations, cancellation during submission, rate limits without duplicate submissions, unavailable workers, censored output, expiry, and timeouts.

Checked in Chromium at 375, 390, 768, 1024, and 1440 pixel widths. Browser checks cover image/font loading, horizontal overflow, pricing calculations, scene changes, per-scene brief preservation, brief downloads, modal keyboard behavior and focus restoration, motion controls, mobile navigation, and reduced-motion behavior. No browser console errors were observed in the local checks.

The public anonymous credential `0000000000` is documented by AI Horde and is intentionally included in the client. Never replace it with a personal secret in this public repository. Cancelling or closing the studio sends a DELETE for the active request; if a network failure prevents cancellation, the UI says that the provider may still finish it. Requests are never automatically resubmitted after POST errors.

A real browser request to AI Horde successfully generated and displayed a 512 × 512 Stable Diffusion image. Separate simulated-provider browser tests cover consent before network submission, image downloading, preserving earlier results on errors, rate limits, cancellation, and 320–1440 pixel dialog layouts.
