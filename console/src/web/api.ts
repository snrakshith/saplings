export class ConsoleError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function consoleApi(token: string) {
  return async <T>(path: string, method = 'GET', body?: unknown): Promise<T> => {
    const response = await fetch('/api' + path, {
      method,
      headers: {
        Authorization: 'Bearer ' + token,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new ConsoleError(
        detail.error ?? 'The console could not complete this request.',
        response.status,
      );
    }
    return response.json();
  };
}

export function tenantPath(project: string, tenant: string) {
  return '/projects/' + encodeURIComponent(project) + '/tenants/' + encodeURIComponent(tenant);
}

export function parseJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(label + ' must contain valid JSON.');
  }
}

export function download(filename: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2) + '\n'], {
      type: 'application/json',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
