import { useStarterFetch } from '../../../lib/api.js';
import type { Session } from '../../auth/SessionFields.js';

type AuditEvent = { id: string; at: string; action: string; resourceType: string };

function ActivityList() {
  const { data, error } = useStarterFetch<{ events: AuditEvent[] }>('/api/starter/activity');
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Loading activity…</p>;
  if (!data.events.length) return <p>No workspace activity yet.</p>;
  return (
    <ul className="activity-list">
      {data.events.map((event) => (
        <li key={event.id}>
          <strong>{event.action}</strong>
          <span>{event.resourceType}</span>
          <time dateTime={event.at}>{new Date(event.at).toLocaleString()}</time>
        </li>
      ))}
    </ul>
  );
}

export function ActivityPage() {
  const { data, error } = useStarterFetch<Session>('/api/starter/session');
  return (
    <>
      <h1>Activity</h1>
      {error && <p role="alert">{error}</p>}
      {!error && !data && <p role="status">Loading workspace…</p>}
      {data &&
        (data.canReadActivity ? (
          <ActivityList />
        ) : data.signedIn ? (
          <p>Only workspace authors and reviewers can view activity.</p>
        ) : (
          <p>
            <a href="/login">Sign in to view workspace activity</a>
          </p>
        ))}
    </>
  );
}
