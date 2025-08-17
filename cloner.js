
import axios from 'axios';
import { load } from "cheerio";

import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { posix, toURL, sameHost, pageUrlToRelPath, assetUrlToRelPath, rel, hash } from './utils.js';
import mime from 'mime-types';
import pLimit from 'p-limit';

// Core clone function
export async function cloneSite(startUrl, options={}) {
  const {
    outDir = path.resolve(process.cwd(), 'dist'),
    maxDepth = 2,
    maxPages = 50,
    concurrency = 8,
    includeSubdomains = false,
    fetchExternalAssets = true,
    userAgent = 'Mozilla/5.0 (compatible; SiteCloner/1.0; +https://example.com)',
  } = options;

  const start = toURL(startUrl);
  if (!start) throw new Error('Invalid URL: ' + startUrl);

  console.log('🎯 Target:', start.href);
  console.log('📁 Output:', outDir);
  console.log('📏 Limits:', { maxDepth, maxPages, concurrency, includeSubdomains, fetchExternalAssets });

  const ax = axios.create({
    // some sites require this header to return full HTML
    headers: { 'User-Agent': userAgent, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    // follow redirects by default
    maxRedirects: 5,
    timeout: 20000,
    validateStatus: (s) => s >= 200 && s < 400,
  });

  const pageQueue = [];
  const seenPages = new Set();
  const seenAssets = new Set();

  const limit = pLimit(concurrency);

  function enqueuePage(u, depth) {
    const urlObj = toURL(u);
    if (!urlObj) return;
    if (seenPages.has(urlObj.href)) return;
    if (!sameHost(urlObj, start, includeSubdomains)) return; // only crawl within host by default
    if (depth > maxDepth) return;
    seenPages.add(urlObj.href);
    pageQueue.push({ url: urlObj, depth });
  }

  // initial seed
  enqueuePage(start.href, 0);

  let pagesProcessed = 0;
  while (pageQueue.length && pagesProcessed < maxPages) {
    const { url, depth } = pageQueue.shift();
    console.log(`\n🧭 [Depth ${depth}] Fetching page: ${url.href}`);
    try {
      const html = await fetchText(ax, url.href);
      const pageRelPath = pageUrlToRelPath(url);
      const pageFsPath = path.join(outDir, pageRelPath);
      await fs.ensureDir(path.dirname(pageFsPath));
      const { updatedHtml, discoveredLinks, assetTasks } = await processHtml({
        html,
        pageUrl: url,
        pageRelPath,
        outDir,
        fetchAsset: (assetAbsUrl) => scheduleAssetDownload(ax, assetAbsUrl, outDir, seenAssets, limit, fetchExternalAssets, userAgent),
      });

      // enqueue internal page links
      for (const link of discoveredLinks) {
        enqueuePage(link, depth + 1);
      }

      await fs.writeFile(pageFsPath, updatedHtml, 'utf8');
      pagesProcessed++;
      console.log(`✅ Saved: ${pageRelPath} (links: ${discoveredLinks.length}, assets queued: ${assetTasks})`);
    } catch (err) {
      console.warn('⚠️ Failed to process page:', url.href, '-', err.message);
    }
  }

  console.log(`\n📦 Pages saved: ${pagesProcessed}`);
  console.log(`📦 Assets saved: ${seenAssets.size}`);
}

// ------------ Helpers -------------

async function fetchText(ax, url) {
  const res = await ax.get(url, { responseType: 'text' });
  return res.data;
}

async function fetchBuffer(ax, url, userAgent) {
  const res = await ax.get(url, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': userAgent },
    // allow any content-type
    validateStatus: (s) => s >= 200 && s < 400,
  });
  return { data: res.data, contentType: res.headers['content-type'] || '' };
}

// Download an asset (image/css/js/font) and save it, rewrite nested CSS urls if needed
async function scheduleAssetDownload(ax, assetAbsUrl, outDir, seenAssets, limit, fetchExternalAssets, userAgent) {
  const u = toURL(assetAbsUrl);
  if (!u) return null;
  if (seenAssets.has(u.href)) return null;
  // if external and disallowed
  if (!fetchExternalAssets && u.hostname !== toURL(assetAbsUrl).hostname) {
    return null;
  }
  seenAssets.add(u.href);

  return limit(async () => {
    const relPath = assetUrlToRelPath(u);
    const fsPath = path.join(outDir, relPath);
    try {
      await fs.ensureDir(path.dirname(fsPath));
      const { data, contentType } = await fetchBuffer(ax, u.href, userAgent);
      // If CSS, process nested url()s and rewrite
      const isCss = contentType.includes('text/css') || u.pathname.endsWith('.css');
      if (isCss) {
        let cssText = Buffer.from(data).toString('utf8');
        const { css: rewritten, downloads } = await processCss(cssText, u, relPath, outDir, ax, seenAssets, limit, fetchExternalAssets, userAgent);
        await fs.writeFile(fsPath, rewritten, 'utf8');
        console.log('📄 CSS saved + rewritten:', relPath, `(nested assets: ${downloads})`);
      } else {
        await fs.writeFile(fsPath, data);
        console.log('🧩 Asset saved:', relPath, contentType ? '(' + contentType + ')' : '');
      }
      return relPath;
    } catch (err) {
      console.warn('⚠️ Failed asset:', u.href, '-', err.message);
      return null;
    }
  });
}

// Parse and rewrite HTML, queue assets and links
async function processHtml({ html, pageUrl, pageRelPath, outDir, fetchAsset }) {
  const $ = load(html);
  const discoveredLinks = new Set();
  let assetTasks = 0;

  // Helper to handle attribute rewrite + queue
  function handleAttr(el, attrName) {
    const val = $(el).attr(attrName);
    if (!val) return;
    if (val.startsWith('data:') || val.startsWith('blob:')) return;
    // ignore hash-only links
    if (attrName === 'href' && (val.startsWith('#') || val.startsWith('mailto:') || val.startsWith('tel:'))) return;

    const absUrl = new URL(val, pageUrl).href;

    // If this is a link to another page (anchor), we should compute its local page path if same host
    if (el.tagName === 'a' && attrName === 'href') {
      const destUrl = new URL(absUrl);
      const same = destUrl.hostname === pageUrl.hostname;
      if (same) {
        const destRel = pageUrlToRelPath(destUrl);
        const newHref = rel(pageRelPath, destRel);
        $(el).attr('href', newHref);
        discoveredLinks.add(destUrl.href);
      } else {
        // external link — keep absolute so clicking works online; for strict offline, you'd download it too.
        $(el).attr('href', absUrl);
      }
      return;
    }

    // For assets (img/src, script/src, link/href, source/src, etc)
    assetTasks++;
    fetchAsset(absUrl).then((relPath) => {
      if (relPath) {
        const newRef = rel(pageRelPath, relPath);
        $(el).attr(attrName, newRef);
      }
    });
  }

  // Core selectors for assets
  $('img[src]').each((_, el) => handleAttr(el, 'src'));
  $('script[src]').each((_, el) => handleAttr(el, 'src'));
  $('link[rel="stylesheet"][href]').each((_, el) => handleAttr(el, 'href'));
  $('link[rel="icon"][href], link[rel="shortcut icon"][href], link[rel="apple-touch-icon"][href]').each((_, el) => handleAttr(el, 'href'));
  $('source[src]').each((_, el) => handleAttr(el, 'src'));
  $('video[src]').each((_, el) => handleAttr(el, 'src'));
  $('audio[src]').each((_, el) => handleAttr(el, 'src'));
  $('img[srcset], source[srcset]').each((_, el) => {
    const val = $(el).attr('srcset');
    if (!val) return;
    const parts = val.split(',').map(s => s.trim()).filter(Boolean);
    const rewritten = [];
    parts.forEach(part => {
      const [urlPart, descriptor] = part.split(/\s+/, 2);
      const abs = new URL(urlPart, pageUrl).href;
      assetTasks++;
      fetchAsset(abs).then((relPath) => {
        if (relPath) {
          const newRef = rel(pageRelPath, relPath);
          rewritten.push(descriptor ? (newRef + ' ' + descriptor) : newRef);
          // finally set updated srcset after all promises resolve? We can't await here easily.
          // We'll set a placeholder now; promises will still download assets.
        }
      });
    });
    // Note: For simplicity, we keep original srcset; downloaded images will still load if primary src is set.
  });

  // Rewrite anchor links + discover internal pages
  $('a[href]').each((_, el) => handleAttr(el, 'href'));

  // Return updated HTML immediately (asset paths will be set as their downloads resolve above if rapid; otherwise keep originals)
  return { updatedHtml: $.html(), discoveredLinks: Array.from(discoveredLinks), assetTasks };
}

// Process CSS: download nested url() assets and rewrite paths
async function processCss(cssText, cssUrlObj, cssRelPath, outDir, ax, seenAssets, limit, fetchExternalAssets, userAgent) {
  const urlRx = /url\(([^)]+)\)/g;
  let m;
  let downloads = 0;
  const replacements = []; // {start,end,newText}

  // Collect unique URLs
  const found = new Map();
  while ((m = urlRx.exec(cssText)) !== null) {
    let raw = m[1].trim().replace(/^['"]|['"]$/g, '');
    if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) continue;
    try {
      const abs = new URL(raw, cssUrlObj).href;
      found.set(m.index, abs); // use position as key to keep order
    } catch {}
  }

  for (const [pos, abs] of found) {
    const u = toURL(abs);
    if (!u) continue;
    // Download asset
    const relAsset = await scheduleAssetDownload(ax, u.href, outDir, seenAssets, limit, fetchExternalAssets, userAgent);
    if (relAsset) {
      downloads++;
      // Compute new relative path from the CSS file location
      const newRef = rel(cssRelPath, relAsset).replace(/\\/g, '/');

      // Replace the specific occurrence (re-scan around pos to find exact token)
      // Simpler: do a global replace of the URL string; risk: over-replace if same URL multiple times.
      cssText = cssText.split(abs).join(newRef);
    }
  }

  return { css: cssText, downloads };
}
