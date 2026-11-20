# Application-specific suites

The quality platform supplies engines and basic observable contracts; it cannot infer arbitrary business invariants, backup integrity or auth behavior. Use a custom executable to extend a suite where its built-in default is insufficient.

```ts
backend: {
  // ...
  custom: {
    'contract': {
      command: 'node',
      args: ['scripts/check-api-contract.mjs'],
      timeoutMs: 30000,
    },
  },
}
```

The process must exit 0 on success and nonzero on failure. Shell interpolation is not supported (`command` and `args` are separate). Use a disposable target, scope test secrets carefully, and write your own assertions rather than returning success unconditionally.

For DR, use `backend.kubernetes.drill` and implement real backup restoration in a disposable database/cluster, plus backup-age, checksum, recovery time and point objectives. There is intentionally **no fake database restore implementation** in this repository.
