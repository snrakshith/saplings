// Copy outside the source tree, use real sandbox adapters, never production accounts.
// These are intentionally failing placeholders, not evidence. Implement each check with
// real credentials/config and assert round-trip results + negative tenant test.
export const environmentId = 'replace-with-approved-sandbox';
export const checks = Object.fromEntries(
  [
    'oidc',
    'saml-broker',
    'social-broker',
    'stripe',
    'razorpay',
    's3',
    'presign',
    'ses',
    'sns',
    'github-workflow',
    'kubernetes',
    'cloudflare',
    'otlp',
    'media',
    'graphql',
    'domain-tls',
    'physical-backup',
  ].map((name) => [
    name,
    async () => {
      throw Error(`Configure and verify ${name} sandbox`);
    },
  ]),
);
