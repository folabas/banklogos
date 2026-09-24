/**
 * Writes preview/index.html: every logo at full size and at 32px, on light and dark backgrounds,
 * with its metadata. Used to review logo PRs before flipping `verified: true`.
 */
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatOf } from '../packages/core/src/types.js';
import { readLogoFolders, ROOT } from './lib/logos.js';
import { validateFolders } from './lib/validate.js';

const folders = readLogoFolders();
const { entities, errors } = validateFolders(folders);
const dirById = new Map(folders.map((f) => [f.idDir, f.dir]));
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const cards = entities
  .map((e) => {
    const variants = e.variants
      .map((v) => {
        const format = formatOf(e, v);
        const file = `${v}.${format}`;
        const bytes = statSync(join(dirById.get(e.id)!, file)).size;
        // Linked, not inlined: the page stays small with hundreds of logos.
        const img = `../logos/${e.scope.toLowerCase()}/${e.id}/${file}`;
        const src = (v !== 'logo' && e.variantSources?.[v]) || e.source;
        return `<div class="variant"><span class="label">${v} · ${format.toUpperCase()} · ${bytes} B · <a href="${esc(src.url)}">${esc(src.license)}</a></span>
          <div class="row"><div class="tile light"><img src="${img}" alt="" loading="lazy"></div><div class="tile dark"><img src="${img}" alt="" loading="lazy"></div></div>
          <div class="row small"><div class="chip light"><img src="${img}" alt="" loading="lazy"></div><div class="chip dark"><img src="${img}" alt="" loading="lazy"></div><span class="label">32px</span></div></div>`;
      })
      .join('');
    const swatches = Object.values(e.colors ?? {})
      .map((c) => `<span class="swatch" style="background:${esc(c!)}" title="${esc(c!)}"></span>${esc(c!)}`)
      .join(' ');
    return `<article class="${e.verified ? 'verified' : 'unverified'}">
      <header><h2>${esc(e.shortName ?? e.name)}</h2><code>${esc(e.id)}</code>
        <span class="badge">${e.verified ? 'verified' : 'unverified'}</span></header>
      ${variants}
      <dl>
        <dt>Name</dt><dd>${esc(e.name)}</dd>
        <dt>Scope</dt><dd>${esc(e.scope)}${e.markets.length ? ` → ${e.markets.join(', ')}` : ''}</dd>
        <dt>Types</dt><dd>${e.types.join(', ')}</dd>
        <dt>Bank codes</dt><dd>${esc(e.bankCodes?.join(', ') || '—')}</dd>
        <dt>Aliases</dt><dd>${esc(e.aliases.join(', ') || '—')}</dd>
        <dt>Colors</dt><dd>${swatches || '—'}</dd>
        <dt>Source</dt><dd><a href="${esc(e.source.url)}">${esc(e.source.license)}</a> · ${e.source.fetchedAt}</dd>
      </dl></article>`;
  })
  .join('\n');

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Logo preview</title><style>
:root{--bg:#f6f6f4;--card:#fff;--text:#1a1a1a;--muted:#6b6b6b;--border:#e3e3e0}
@media (prefers-color-scheme:dark){:root{--bg:#161616;--card:#1f1f1f;--text:#eee;--muted:#9a9a9a;--border:#333}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--text);font:14px/1.45 system-ui,sans-serif}
h1{font-size:20px;margin:0 0 4px}p.meta{color:var(--muted);margin:0 0 20px}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
article{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px}
article.unverified{border-left:3px solid #d9a400}article.verified{border-left:3px solid #2e9d5b}
header{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}h2{font-size:16px;margin:0}
code{color:var(--muted)}.badge{margin-left:auto;font-size:12px;color:var(--muted)}
.variant{margin:12px 0}.label{font-size:12px;color:var(--muted)}
.row{display:flex;gap:8px;align-items:center;margin-top:6px}
.tile{flex:1;height:110px;display:flex;align-items:center;justify-content:center;border-radius:8px;padding:12px}
.tile img{max-width:100%;max-height:100%}
.chip{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:6px}
.chip img{max-width:32px;max-height:32px}
.light{background:#fff;border:1px solid #e3e3e0}.dark{background:#111;border:1px solid #333}
dl{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin:12px 0 0;font-size:13px}dt{color:var(--muted)}dd{margin:0;overflow-wrap:anywhere}
.swatch{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px;margin-right:4px;border:1px solid var(--border)}
a{color:inherit}.errors{background:#fde8e8;color:#8a1c1c;padding:12px;border-radius:8px;margin-bottom:16px;white-space:pre-wrap}
</style></head><body>
<h1>Logo preview</h1>
<p class="meta">${entities.length} entities · ${entities.filter((e) => !e.verified).length} unverified · generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC</p>
${errors.length ? `<div class="errors">${esc(errors.join('\n'))}</div>` : ''}
<main>${cards}</main></body></html>`;

const outDir = join(ROOT, 'preview');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), html);
console.log(`preview: ${entities.length} entities -> ${join(outDir, 'index.html')}`);
