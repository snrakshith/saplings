function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(object)
        .sort()
        .map((key) => [key, sorted(object[key])]),
    );
  }
  return value;
}

function changes(draft: string, published: Record<string, unknown>) {
  try {
    const next = JSON.parse(draft) as Record<string, unknown>;
    if (!next || typeof next !== 'object' || Array.isArray(next)) return;
    return Array.from(new Set([...Object.keys(published), ...Object.keys(next)]))
      .sort()
      .flatMap((key) => {
        if (!Object.hasOwn(next, key)) return [{ key, action: 'Removed' }];
        if (!Object.hasOwn(published, key)) return [{ key, action: 'Added' }];
        if (JSON.stringify(sorted(next[key])) !== JSON.stringify(sorted(published[key])))
          return [{ key, action: 'Changed' }];
        return [];
      });
  } catch {
    return;
  }
}

export function ConfigDiff({
  draft,
  published,
}: {
  draft: string;
  published: Record<string, unknown>;
}) {
  const fields = changes(draft, published);
  return (
    <section aria-label="Changes from published JSON">
      <h3>Changes from published JSON</h3>
      {!fields ? (
        <p>Enter a valid JSON object to compare fields.</p>
      ) : fields.length ? (
        <ul>
          {fields.map(({ key, action }) => (
            <li key={key}>
              {action} <code>{key}</code>
            </li>
          ))}
        </ul>
      ) : (
        <p>No field changes.</p>
      )}
    </section>
  );
}
