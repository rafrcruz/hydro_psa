import { useEffect, useState } from 'react';
import { getAutomations } from '../services/mockApi';

export default function CatalogoPage() {
  const [automations, setAutomations] = useState([]);

  useEffect(() => {
    getAutomations().then(setAutomations);
  }, []);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl">Catálogo de automações</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {automations.map((item) => (
          <article key={item.id} className="card p-4">
            <p className="text-lg font-display text-hydro-blue">{item.name}</p>
            <p className="text-sm text-mid-gray">Owner: {item.owner}</p>
            <p className="text-sm text-mid-gray">Status: {item.status}</p>
            <p className="text-sm text-mid-gray">SLA estimado: {item.slaHours}h</p>
          </article>
        ))}
      </div>
    </section>
  );
}

