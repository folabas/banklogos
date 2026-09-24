import { getLogo, listByCountry, searchLogos, formatOf } from 'fintech-logos';
// Raw files shipped in the package, turned into URLs by the bundler (only the ones rendered get requested).
const assetUrls = import.meta.glob('/node_modules/fintech-logos/assets/*', {
  query: '?url',
  import: 'default',
  eager: true,
});

const urlFor = (entity, variant = 'mark') => {
  const v = entity.variants.includes(variant) ? variant : 'logo';
  const name = v === 'logo' ? entity.id : `${entity.id}-${v}`;
  return assetUrls[`/node_modules/fintech-logos/assets/${name}.${formatOf(entity, v)}`];
};

const list = document.getElementById('banks');
const status = document.getElementById('status');
const all = listByCountry('NG').sort((a, b) => (a.shortName ?? a.name).localeCompare(b.shortName ?? b.name));

function render(entities, message) {
  status.textContent = message;
  list.innerHTML = entities
    .map(
      (e) => `<li><img src="${urlFor(e)}" alt="" loading="lazy" /><span><strong>${e.shortName ?? e.name}</strong>
        <small>${(e.bankCodes ?? []).join(', ') || '—'} · ${e.types.join(', ')}</small></span></li>`,
    )
    .join('');
}

document.getElementById('search').addEventListener('input', (ev) => {
  const q = ev.target.value.trim();
  const hits = q ? searchLogos(q).filter((e) => e.scope === 'NG' || e.markets.includes('NG')) : all;
  render(hits, q ? `${hits.length} match "${q}"` : `${all.length} institutions`);
});

document.getElementById('code').addEventListener('input', (ev) => {
  const code = ev.target.value.trim();
  if (!code) return render(all, `${all.length} institutions`);
  const hit = getLogo({ bankCode: code });
  render(hit ? [hit] : [], hit ? `Bank code ${code} → ${hit.name}` : `No bank with code ${code}`);
});

render(all, `${all.length} institutions`);
