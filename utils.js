
import path from 'node:path';
import crypto from 'node:crypto';

export const posix = path.posix;

// Normalize URL and ensure protocol
export function toURL(u) {
  try {
    if (!/^https?:\/\//i.test(u)) {
      u = 'https://' + u;
    }
    return new URL(u);
  } catch {
    return null;
  }
}

export function sameHost(a, b, includeSubdomains=false) {
  if (!a || !b) return false;
  if (includeSubdomains) {
    const ah = a.hostname.toLowerCase();
    const bh = b.hostname.toLowerCase();
    return ah === bh || ah.endsWith('.' + bh) || bh.endsWith('.' + ah);
  }
  return a.hostname.toLowerCase() === b.hostname.toLowerCase();
}

// Sanitize file name segments for file system safety
export function safeSegment(name) {
  const replaced = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  // avoid empty
  return replaced.length ? replaced : '_';
}

export function hash(input) {
  return crypto.createHash('sha1').update(String(input)).digest('hex').slice(0, 10);
}

// Given a page URL, return a relative POSIX path for where to save its HTML (e.g., 'index.html' or 'about/index.html')
export function pageUrlToRelPath(u) {
  let pathname = u.pathname;
  if (!pathname || pathname === '/') {
    return 'index.html';
  }
  if (pathname.endsWith('/')) {
    return posix.join(pathname, 'index.html');
  }
  // ensure .html extension for clean local navigation
  const base = posix.basename(pathname);
  if (!base.includes('.')) {
    return pathname + '/index.html';
  }
  // if it already has extension, keep it (html/php/etc). We'll still save as .html if not .html
  if (!base.endsWith('.html') && !base.endsWith('.htm')) {
    return pathname + '.html';
  }
  return pathname;
}

// Given any asset URL, return a relative POSIX path under assets/<host>/... for storage
export function assetUrlToRelPath(u) {
  const host = safeSegment(u.hostname.toLowerCase());
  let pathname = u.pathname || '/';
  if (pathname.endsWith('/')) pathname += 'index';
  let fname = posix.basename(pathname);
  const dir = posix.dirname(pathname);
  // Append short hash if query exists to avoid collisions
  if (u.search && u.search.length > 1) {
    const h = hash(u.search);
    const dot = fname.lastIndexOf('.');
    if (dot > 0) fname = fname.slice(0, dot) + '_' + h + fname.slice(dot);
    else fname = fname + '_' + h;
  }
  return posix.join('assets', host, dir, safeSegment(fname));
}

// Produce a relative path string from one file to another
export function rel(fromRelFile, toRelFile) {
  let p = posix.relative(posix.dirname(fromRelFile), toRelFile);
  if (!p.startsWith('.')) p = './' + p;
  return p;
}

// Simple sleep utility for throttling if needed
export function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}
