/**
 * package-extension.mjs
 *
 * Packages the ClassPulse Chrome extension into a distributable ZIP.
 * Run from the repo root: npm run package:zip
 *
 * Included (explicit allow-list):
 *   manifest.json, background.js, popup.html, popup.css, popup.js
 *   icons/   lib/   modules/
 *
 * Excluded (never enters the zip):
 *   config.js        – contains live Supabase keys
 *   config.example.js
 *   .gitkeep
 */

import fs   from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT    = path.resolve(__dirname, '..');
const EXT_DIR = path.join(ROOT, 'extension');
const OUT_ZIP = path.join(ROOT, 'classpulse-extension.zip');

const INCLUDE = [
  'manifest.json',
  'background.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'icons',
  'lib',
  'modules',
];

// ── verify manifest paths ────────────────────────────────────────────────────
const manifest = JSON.parse(
  fs.readFileSync(path.join(EXT_DIR, 'manifest.json'), 'utf8')
);
const manifestPaths = [
  manifest.background.service_worker,
  manifest.action.default_popup,
  ...Object.values(manifest.action.default_icon),
  ...Object.values(manifest.icons),
  ...manifest.content_scripts.flatMap(cs => cs.js),
];

console.log('\n🔍 Verifying manifest paths…');
let allExist = true;
for (const p of [...new Set(manifestPaths)]) {
  const full = path.join(EXT_DIR, p);
  const ok   = fs.existsSync(full);
  console.log(`  ${ok ? '✓' : '✗ MISSING'}  ${p}`);
  if (!ok) allExist = false;
}
if (!allExist) { console.error('\n❌ Aborting.\n'); process.exit(1); }

// ── verify include list ──────────────────────────────────────────────────────
console.log('\n📦 Checking include list…');
for (const item of INCLUDE) {
  const full = path.join(EXT_DIR, item);
  if (!fs.existsSync(full)) {
    console.error(`  ✗  MISSING: extension/${item}`); process.exit(1);
  }
  console.log(`  ✓  ${item}`);
}

// ── remove stale zip ─────────────────────────────────────────────────────────
if (fs.existsSync(OUT_ZIP)) {
  fs.rmSync(OUT_ZIP);
  console.log('\n🗑  Removed previous classpulse-extension.zip');
}

// ── zip via PowerShell -EncodedCommand (handles spaces in paths) ─────────────
// Build the PowerShell script text, then Base64-encode it so the shell
// never sees the space-containing paths as separate tokens.
const includePaths = INCLUDE
  .map(item => path.join(EXT_DIR, item).replace(/\\/g, '\\\\'))
  .map(p => `'${p}'`)
  .join(',');

const psScript = `
$items = @(${includePaths})
Compress-Archive -Path $items -DestinationPath '${OUT_ZIP.replace(/\\/g, '\\\\')}' -CompressionLevel Optimal
`;

const encoded = Buffer.from(psScript, 'utf16le').toString('base64');

console.log('\n🗜  Compressing…');
execSync(`powershell -NoProfile -EncodedCommand ${encoded}`, { stdio: 'inherit' });

// ── report ───────────────────────────────────────────────────────────────────
const sizeMB = (fs.statSync(OUT_ZIP).size / 1024 / 1024).toFixed(2);
console.log(`\n✅  classpulse-extension.zip  (${sizeMB} MB)`);
console.log(`    ${OUT_ZIP}`);
console.log('\n    Chrome → Extensions → Load unpacked → select the extracted folder\n');
