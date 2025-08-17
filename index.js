
//usr/bin/env; node 
import { Command } from 'commander';
import { cloneSite } from './src/cloner.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'fs-extra';

const program = new Command();
program
  .name('site-cloner')
  .description('Clone a website locally so it works offline (static assets + internal links).')
  .argument('<url>', 'Website URL to clone')
  .option('-o, --out <dir>', 'Output directory', 'dist')
  .option('-d, --max-depth <n>', 'Max crawl depth (0 = only the given page)', (v)=>parseInt(v,10), 2)
  .option('-p, --max-pages <n>', 'Max number of pages to crawl', (v)=>parseInt(v,10), 50)
  .option('--concurrency <n>', 'Concurrent downloads', (v)=>parseInt(v,10), 8)
  .option('--include-subdomains', 'Also crawl subdomains of the target host', false)
  .option('--fetch-external-assets', 'Download external asset URLs (fonts, CDNs, images)', true)
  .option('--no-fetch-external-assets', 'Disable external asset download', false)
  .option('--user-agent <ua>', 'Custom User-Agent string', 'Mozilla/5.0 (compatible; SiteCloner/1.0; +https://example.com)')
  .action(async (url, opts) => {
    try {
      const outDir = path.resolve(process.cwd(), opts.out);
      await fs.ensureDir(outDir);
      console.log(`🚀 Starting site clone: ${url}`);
      console.log(`📂 Output directory: ${outDir}`);
      await cloneSite(url, {
        outDir,
        maxDepth: opts.maxDepth,
        maxPages: opts.maxPages,
        concurrency: opts.concurrency,
        includeSubdomains: !!opts.includeSubdomains,
        fetchExternalAssets: !!opts.fetchExternalAssets,
        userAgent: opts.userAgent,
      });
      console.log('\n✨ Done! Open the generated index.html (or any page) from the dist folder.\n');
    } catch (err) {
      console.error('Fatal error:', err?.stack || err?.message || err);
      process.exit(1);
    }
  });

program.parse();
