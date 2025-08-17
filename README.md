
# site-cloner-cli

A simple Node.js CLI that clones a website to your local machine and rewrites paths so the site works offline for **static content** (HTML/CSS/JS/images/fonts). It crawls internal links up to a limit and downloads assets (including URLs referenced inside CSS).

> ⚠️ Heavily dynamic sites (e.g., Google, apps behind APIs/CSP) may not fully work offline. For the assignment, try landing pages or content sites (e.g., `piyushgarg.dev`, `hitesh.ai`, VS Code landing page).

## ✨ Features

- Crawl internal links up to `--max-depth` and `--max-pages`
- Download and rewrite **images**, **stylesheets**, **scripts**, **icons**, **video/audio sources**
- Parse CSS and download `url(...)` referenced assets (fonts, background images, etc.)
- Rewrites internal links (`<a href>`) to local relative paths like `about/index.html`
- Mirrors external assets under `assets/<host>/...` (configurable)
- Concurrency for faster downloads
- Clean, easy-to-run CLI

## 🚀 Quick Start

```bash
# 1) Extract or open this folder
cd site-cloner-cli

# 2) Install dependencies (Node 18+)
npm i

# 3) Clone a site (example)
node index.js https://piyushgarg.dev --out dist --max-depth 2 --max-pages 50

# 4) Open dist/index.html in your browser (Incognito works too)
```

Or after linking globally (optional):
```bash
npm link
site-cloner https://hitesh.ai --out dist
```

## 🧰 CLI Options

```
Usage: site-cloner [options] <url>

Clone a website locally so it works offline (static assets + internal links).

Arguments:
  url                           Website URL to clone

Options:
  -o, --out <dir>               Output directory (default: "dist")
  -d, --max-depth <n>           Max crawl depth (0 only the given page) (default: 2)
  -p, --max-pages <n>           Max number of pages to crawl (default: 50)
  --concurrency <n>             Concurrent downloads (default: 8)
  --include-subdomains          Also crawl subdomains of the target host (default: false)
  --fetch-external-assets       Download external asset URLs (fonts, CDNs, images) (default: true)
  --no-fetch-external-assets    Disable external asset download
  --user-agent <ua>             Custom User-Agent string
  -h, --help                    display help for command
```

## 📹 Demo Video (what to show)

1. Terminal: run `node index.js https://piyushgarg.dev -o dist`
2. Show the generated `dist/` structure (pages + assets folders)
3. Open `dist/index.html` and navigate links offline
4. Upload recording to YouTube as **Unlisted/Public**
5. Verify the link works in an **Incognito** window

## 📝 Notes / Limitations

- Dynamic data fetched via XHR/fetch won't be mirrored unless those endpoints are also cloned (out of scope).
- Sites with strict **CSP**, **service workers**, or heavy client-side rendering may break offline.
- External links are kept online by default; set `--fetch-external-assets=false` to skip downloading their assets.
- Respect the site's terms of use. Use this for educational purposes only.

## 🧪 Test Targets

- `https://piyushgarg.dev`
- `https://hitesh.ai`
- VS Code landing page
- (Avoid `google.com` for offline expectations; it's highly dynamic.)

## 🤝 License

MIT
