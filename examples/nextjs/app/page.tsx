import { getLogo, listByCountry, logoUrl } from 'banklogos';
// Direct image imports: an SVG logo, a WebP logo and a WebP mark.
import gtbank from 'banklogos/img/gtbank';
import accessBank from 'banklogos/img/access-bank';
import kudaMark from 'banklogos/img/kuda-mark';
import BankPicker from './bank-picker';

export default function Page() {
  const gtb = getLogo({ bankCode: '058' })!;
  const banks = listByCountry('NG')
    .slice(0, 12)
    .map((e) => ({ id: e.id, name: e.shortName ?? e.name, codes: e.bankCodes ?? [] }));

  return (
    <main style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1>Choose your bank</h1>
      <p data-testid="lookup">
        Bank code 058 → {gtb.name} · CDN URL: <code>{logoUrl(gtb)}</code>
      </p>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <img data-testid="svg" src={gtbank} alt="GTBank" height={48} />
        <img data-testid="webp" src={accessBank} alt="Access Bank" height={48} />
        <img data-testid="mark" src={kudaMark} alt="Kuda" height={48} />
      </div>
      <BankPicker banks={banks} />
    </main>
  );
}
