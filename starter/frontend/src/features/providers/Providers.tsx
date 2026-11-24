import { useState } from 'react';
import { Button } from '@saplings/murphi-ui';
import { post, useStarterFetch } from '../../lib/api.js';
import type { Session } from '../auth/SessionFields.js';
import { ProviderStorage } from './ProviderStorage.js';
import { ProviderCheckout } from './ProviderCheckout.js';
import type { CheckoutEnvironment } from './cashfree.js';

type ProviderStatus = {
  storage: boolean;
  signedDownloads: boolean;
  notifications: 'off' | 'aws' | 'smtp';
  checkout?: { environment: CheckoutEnvironment; amountMinor: number };
};

function ProvidersDashboard() {
  const { data, error } = useStarterFetch<ProviderStatus>('/api/starter/providers');
  const [mail, setMail] = useState('');
  const [mailError, setMailError] = useState('');
  const [busy, setBusy] = useState(false);

  async function notify() {
    setBusy(true);
    setMail('');
    setMailError('');
    try {
      await post('/api/starter/providers/notification', {});
      setMail('Test email sent.');
    } catch (error) {
      setMailError(error instanceof Error ? error.message : 'Email delivery failed.');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Loading providers…</p>;
  return (
    <div className="capability-grid">
      {data.storage ? (
        <ProviderStorage signedDownloads={data.signedDownloads} />
      ) : (
        <section className="capability-card">
          <h2>Object storage</h2>
          <p>Configure an S3 bucket to upload and read objects.</p>
        </section>
      )}
      <section className="capability-card">
        <h2>Notifications</h2>
        {data.notifications === 'off' ? (
          <p>Configure an email provider to send notifications.</p>
        ) : (
          <>
            <p>Send a test message to the email on your account.</p>
            <Button disabled={busy} onClick={() => void notify()}>
              Send test email
            </Button>
          </>
        )}
        {mail && <p role="status">{mail}</p>}
        {mailError && <p role="alert">{mailError}</p>}
      </section>
      {data.checkout ? (
        <ProviderCheckout {...data.checkout} />
      ) : (
        <section className="capability-card">
          <h2>Cashfree checkout</h2>
          <p>Configure Cashfree credentials and an INR price to try checkout.</p>
        </section>
      )}
    </div>
  );
}

export function Providers() {
  const { data, error } = useStarterFetch<Session>('/api/starter/session');
  return (
    <>
      <h1>Provider integrations</h1>
      {error ? (
        <p role="alert">{error}</p>
      ) : data?.profile === 'local' ? (
        <p>
          Use the durable Starter for provider integrations.{' '}
          <a href="/dashboard">Run local capability checks</a>.
        </p>
      ) : data?.signedIn ? (
        <ProvidersDashboard />
      ) : data ? (
        <a className="starter-link" href="/login">
          Sign in to try provider integrations
        </a>
      ) : (
        <p role="status">Loading providers…</p>
      )}
    </>
  );
}
