#!/usr/bin/env node
// Builds a single, self-contained HTML preview of the app in DEMO MODE (sample data, no backend).
// Used to share a design-review link before any backend/device setup.
//
//   node scripts/build-preview.mjs <expo-web-export-dir> <output.html>
//
// The export must be produced with EXPO_PUBLIC_DEMO_MODE=true:
//   EXPO_PUBLIC_DEMO_MODE=true npx expo export --platform web --output-dir /tmp/web
//
// What it does:
//  - inlines the JS bundles referenced by index.html (no external requests)
//  - replaces font/image asset URLs in the bundles with base64 data URIs
//  - resets the URL path to "/" before the app boots, so routing works when the page
//    is served from an arbitrary sub-path (e.g. a preview host)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [, , exportDir, outFile] = process.argv;
if (!exportDir || !outFile) {
  console.error('usage: build-preview.mjs <export-dir> <out.html>');
  process.exit(1);
}

let html = readFileSync(path.join(exportDir, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map((m) => m[1]);
if (!scripts.length) throw new Error('no scripts found in index.html');

const MIME = { ttf: 'font/ttf', otf: 'font/otf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
const assetCache = new Map();
// Fonts and images are referenced as plain "/assets/..." string literals in the web bundle.
const inlineAssets = (js) =>
  js.replace(/"(\/assets\/[^"]+\.(ttf|otf|png|jpe?g|webp|gif))"/g, (_, url, ext) => {
    if (!assetCache.has(url)) {
      const b64 = readFileSync(path.join(exportDir, decodeURIComponent(url))).toString('base64');
      assetCache.set(url, `data:${MIME[ext]};base64,${b64}`);
    }
    return JSON.stringify(assetCache.get(url));
  });

const bundles = scripts.map((src) => {
  if (!src.startsWith('/_expo/')) throw new Error(`unexpected script ${src}`);
  if (/\/_expo\/static\/js\/web\/[^"]+\.js/.test(readFileSync(path.join(exportDir, src), 'utf8').replace(src, ''))) {
    // Async route chunks would need network loads; the app.json disables them for web.
    console.warn(`warning: ${src} references other chunks (asyncRoutes enabled?)`);
  }
  const js = inlineAssets(readFileSync(path.join(exportDir, src), 'utf8'));
  return js.replace(/<\/script/gi, '<\\/script');
});

const boot = `<script>try{if(location.pathname!=='/'){history.replaceState(null,'','/'+location.hash)}}catch(e){}</script>`;

html = html
  .replace(/<script src="[^"]+" defer><\/script>/g, '')
  .replace(/<link rel="icon"[^>]*\/>/, '')
  .replace('<html lang="en">', '<html lang="th">')
  // Function replacer: bundle text contains `$&`/`$'` sequences that a string replacement would expand.
  .replace('</body>', () => `${boot}${bundles.map((b) => `<script>${b}</script>`).join('')}\n</body>`);

writeFileSync(outFile, html);
console.log(`wrote ${outFile} (${(html.length / 1024 / 1024).toFixed(2)} MB, ${assetCache.size} assets inlined, ${bundles.length} scripts)`);
