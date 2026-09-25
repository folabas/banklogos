'use client';

// Client component: the same package works in the browser bundle.
import { useState } from 'react';
import { getLogo, searchLogos } from 'banklogos';
import opay from 'banklogos/img/opay';

export default function BankPicker({ banks }: { banks: { id: string; name: string; codes: string[] }[] }) {
  const [query, setQuery] = useState('');
  const hits = query ? searchLogos(query).map((e) => e.shortName ?? e.name) : banks.map((b) => b.name);
  return (
    <section>
      <p>
        <img data-testid="client-img" src={opay} alt="OPay" height={32} /> Client component, code 999992 →{' '}
        <span data-testid="client-lookup">{getLogo({ bankCode: '999992' })?.name}</span>
      </p>
      <input data-testid="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
      <ul data-testid="results">
        {hits.slice(0, 12).map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </section>
  );
}
