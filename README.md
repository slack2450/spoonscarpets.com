# spoonscarpets.com

Frontend web app for exploring all **768** seamlessly vectorized UK J D Wetherspoon carpets (plus the **8** confirmed carpet-free pubs).

Assets (`carpets.json`, `patterns/*.svg`, `thumbs/*.webp`) live in the sibling [`../spoonscarpets-data`](../spoonscarpets-data) repository and are served from Cloudflare R2 (`https://assets.spoonscarpets.com`) in production.

## Local Development

```bash
npm install
npm run dev
```

When `VITE_ASSETS_URL` is unset, `vite.config.ts` automatically serves `/assets/carpets.json`, `/assets/patterns/*.svg`, and `/assets/thumbs/*.webp` directly from `../spoonscarpets-data`.

## Production Build & Cloudflare Pages

```bash
VITE_ASSETS_URL=https://assets.spoonscarpets.com npm run build
```

## License & Disclaimer

The frontend source code in this repository is licensed under the **GNU General Public License v3.0** — see [LICENSE](./LICENSE).

Carpet SVG tiles and metadata are maintained in `spoonscarpets-data` under **CC BY-SA 4.0**. This is an independent, unofficial archival project and is not affiliated with or endorsed by J D Wetherspoon plc or any carpet manufacturer. Pub names and underlying physical carpet designs remain the property of their respective owners.
