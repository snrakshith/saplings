import { readFile } from 'node:fs/promises';
import { IdentityPlatform, type RealmUser } from '@saplings/kingsman';
import { openDurableRuntime } from './runtime.js';
import { starterRoles } from './login.js';
import { durableSettings, required } from './settings.js';

type Account = {
  username: string;
  email: string;
  password: string;
  role: (typeof starterRoles)[number];
};

function accounts(value: unknown): Account[] {
  if (!Array.isArray(value) || !value.length || value.length > 30)
    throw new Error('The bootstrap file must contain 1 to 30 accounts.');
  return value.map((item: Partial<Account> | null) => {
    if (
      !item ||
      typeof item.username !== 'string' ||
      typeof item.email !== 'string' ||
      typeof item.password !== 'string' ||
      item.password.length < 12 ||
      !item.role ||
      !starterRoles.includes(item.role)
    )
      throw new Error(
        'Each bootstrap account requires username, email, a password of at least 12 characters, and a supported role.',
      );
    return {
      ...item,
      username: item.username.trim().toLowerCase(),
      email: item.email.trim().toLowerCase(),
    } as Account;
  });
}

async function bootstrap() {
  const entries = accounts(JSON.parse(await readFile(required('SAPLINGS_BOOTSTRAP_FILE'), 'utf8')));
  const runtime = await openDurableRuntime(durableSettings());
  try {
    const identity = runtime.identity;
    for (const entry of entries) {
      const users = await identity.store.list<RealmUser>(identity.realm, 'users');
      const existing = users.find(
        (user) => user.username === entry.username || user.email === entry.email,
      );
      if (existing) {
        if (
          existing.username !== entry.username ||
          existing.email !== entry.email ||
          existing.roles.length !== 1 ||
          existing.roles[0] !== entry.role
        )
          throw new Error(
            'An existing bootstrap account has a different username, email, or role.',
          );
        continue;
      }
      const provisioner = new IdentityPlatform(
        {
          ...identity.config,
          spec: {
            ...identity.config.spec,
            registration: { enabled: true, verifyEmail: false },
            roles: { ...identity.config.spec.roles, defaultRoles: [entry.role] },
          },
        },
        identity.deps,
      );
      await provisioner.registerUser(entry);
    }
    console.log('Starter accounts are provisioned.');
  } finally {
    await runtime.close();
  }
}

try {
  await bootstrap();
} catch {
  console.error('Starter account bootstrap failed. Check the account file and database.');
  process.exitCode = 1;
}
