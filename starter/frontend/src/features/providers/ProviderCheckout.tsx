import { useEffect, useRef, useState } from 'react';
import { Button } from '@saplings/murphi-ui';
import { post, request } from '../../lib/api.js';
import { openCashfree, type CheckoutEnvironment } from './cashfree.js';

type Order = { id: string; status: string; checkoutSessionId?: string };
const endpoint = '/api/starter/providers/checkout';
const storedOrder = 'saplings.checkout.order';

export function ProviderCheckout({
  environment,
  amountMinor,
}: {
  environment: CheckoutEnvironment;
  amountMinor: number;
}) {
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<Order>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [canRecover, setCanRecover] = useState(false);
  const pending = useRef<string>(undefined);

  useEffect(() => {
    const id = sessionStorage.getItem(storedOrder);
    if (id && /^sp_[a-f0-9]{40}$/.test(id))
      void request<Order>(endpoint + '/' + id).then(setOrder, () =>
        sessionStorage.removeItem(storedOrder),
      );
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The checkout request failed.');
    } finally {
      setBusy(false);
    }
  }
  async function create(recover: boolean) {
    pending.current ??= crypto.randomUUID();
    setCanRecover(true);
    const result = await post<Order>(
      endpoint,
      { phone, recover },
      { 'Idempotency-Key': pending.current },
    );
    sessionStorage.setItem(storedOrder, result.id);
    setOrder(result);
    setCanRecover(false);
    pending.current = undefined;
  }

  return (
    <section className="capability-card">
      <h2>Cashfree checkout</h2>
      <p>
        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
          amountMinor / 100,
        )}{' '}
        · {environment}
      </p>
      {!order ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => create(false));
          }}
        >
          <label className="catalog-search">
            Checkout phone number
            <input
              type="tel"
              autoComplete="tel"
              pattern="\+?[0-9]{8,15}"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </label>
          <div className="starter-actions">
            <Button type="submit" disabled={busy}>
              Create checkout
            </Button>
            {canRecover && (
              <Button
                type="button"
                variant="outlined"
                disabled={busy}
                onClick={() => void run(() => create(true))}
              >
                Recover order
              </Button>
            )}
          </div>
        </form>
      ) : (
        <>
          <p role="status">Order status {order.status}</p>
          <div className="starter-actions">
            {order.status !== 'captured' && order.checkoutSessionId && (
              <Button
                disabled={busy}
                onClick={() => void run(() => openCashfree(environment, order.checkoutSessionId!))}
              >
                Continue to Cashfree
              </Button>
            )}
            <Button
              variant="outlined"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const latest = await request<Order>(endpoint + '/' + order.id);
                  setOrder({ ...order, ...latest });
                })
              }
            >
              Refresh payment status
            </Button>
            <Button
              variant="outlined"
              disabled={busy}
              onClick={() => {
                sessionStorage.removeItem(storedOrder);
                setOrder(undefined);
                setPhone('');
              }}
            >
              Start another order
            </Button>
          </div>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
