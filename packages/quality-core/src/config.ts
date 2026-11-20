import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { validateConfig } from './validation.js';
import type { QualityConfig } from './types.js';
export async function loadQualityConfig(file: string): Promise<QualityConfig> {
  const resolved = path.resolve(file);
  let value: unknown;
  if (file.endsWith('.json')) value = JSON.parse(await readFile(resolved, 'utf8'));
  else if (file.endsWith('.ts') || file.endsWith('.mts')) {
    let mod: { default?: unknown };
    try {
      mod = await import(pathToFileURL(resolved).href);
    } catch (error) {
      if (
        !(error instanceof SyntaxError) &&
        !['ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX', 'ERR_UNKNOWN_FILE_EXTENSION'].includes(
          (error as { code?: string }).code ?? '',
        )
      )
        throw error;
      const engine = 'jiti';
      const { createJiti } = (await import(engine)) as {
        createJiti: (url: string) => { import(file: string): Promise<unknown> };
      };
      mod = (await createJiti(import.meta.url).import(resolved)) as { default?: unknown };
    }
    value = mod.default ?? mod;
  } else {
    const mod = (await import(pathToFileURL(resolved).href)) as { default?: unknown };
    value = mod.default ?? mod;
  }
  if (value && typeof value === 'object' && 'quality' in value) value = value.quality;
  validateConfig(value as QualityConfig);
  return value as QualityConfig;
}
