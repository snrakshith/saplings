export function value(fields: FormData, key: string) {
  return String(fields.get(key) ?? '').trim();
}

export function lines(fields: FormData, key: string) {
  return value(fields, key)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
