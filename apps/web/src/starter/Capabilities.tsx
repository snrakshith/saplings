import { useStarterFetch, type Capability } from './api.js';
import { CapabilityCard } from './CapabilityCard.js';
import { ReportJobs } from './ReportJobs.js';
import type { Session } from './SessionFields.js';

const sections = [
  { title: 'Platform', ids: ['kingsman', 'harbor'] },
  { title: 'Application foundation', ids: ['workspace', 'flags', 'analytics', 'storage'] },
  { title: 'Commerce', ids: ['payments', 'billing'] },
  { title: 'Operations', ids: ['notifications', 'workflows', 'audit', 'governance', 'operations'] },
];

function LocalCapabilities() {
  const { data, error } = useStarterFetch<{ capabilities: Capability[] }>('/api/starter');
  const byId = new Map(data?.capabilities.map((capability) => [capability.id, capability]));
  return (
    <>
      <header className="page-intro">
        <h1>Application capabilities</h1>
        <p>
          Run each workflow against the starter API. Development adapters use isolated local data.
        </p>
      </header>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading capabilities…</p>}
      {data &&
        sections.map(({ title, ids }) => (
          <section className="capability-section" key={title}>
            <h2>{title}</h2>
            <div className="capability-grid">
              {ids.map((id) => {
                const capability = byId.get(id);
                return capability && <CapabilityCard key={id} capability={capability} />;
              })}
            </div>
          </section>
        ))}
    </>
  );
}

export function Capabilities() {
  const { data, error } = useStarterFetch<Session>('/api/starter/session');
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Loading dashboard…</p>;
  return data.profile === 'durable' ? (
    <ReportJobs signedIn={data.signedIn} />
  ) : (
    <LocalCapabilities />
  );
}
