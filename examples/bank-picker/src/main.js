import { getLogo, listByCountry, searchLogos } from 'banklogos';
// An app that knows which logos it needs imports them directly:
import gtbankLogo from 'banklogos/img/gtbank';
import accessLogo from 'banklogos/img/access-bank';

// This picker shows every bank, so it loads all img/<id> modules (each is a one-line URL to the shipped file).
const imgModules = import.meta.glob('/node_modules/banklogos/dist/generated/img/*.js', {
  import: 'default',
  eager: true,
});

const urlFor = (entity, variant = 'mark') => {
  const v = entity.variants.includes(variant) ? variant : 'logo';
  const name = v === 'logo' ? entity.id : `${entity.id}-${v}`;
  return imgModules[`/node_modules/banklogos/dist/generated/img/${name}.js`];
};

document.getElementById('featured').src = gtbankLogo;
document.getElementById('featured2').src = accessLogo;

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
