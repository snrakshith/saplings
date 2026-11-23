export type CheckoutEnvironment = 'sandbox' | 'production';
type Cashfree = (options: { mode: CheckoutEnvironment }) => {
  checkout(input: {
    paymentSessionId: string;
    redirectTarget: '_self';
  }): Promise<{ error?: unknown } | undefined>;
};

let loading: Promise<Cashfree> | undefined;

function loadCashfree() {
  loading ??= new Promise<Cashfree>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => {
      const factory = (window as Window & { Cashfree?: Cashfree }).Cashfree;
      if (typeof factory === 'function') resolve(factory);
      else reject(new Error('Cashfree Checkout is unavailable.'));
    };
    script.onerror = () => reject(new Error('Could not load Cashfree Checkout.'));
    document.head.append(script);
  }).catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}

export async function openCashfree(environment: CheckoutEnvironment, paymentSessionId: string) {
  const factory = await loadCashfree();
  const result = await factory({ mode: environment }).checkout({
    paymentSessionId,
    redirectTarget: '_self',
  });
  if (result?.error) throw new Error('Cashfree Checkout could not open.');
}
