# @saplings/quality-node-diagnostics

Collect process and event-loop metrics in a Node.js service. The implementation is shared with [@saplings/observability](https://www.npmjs.com/package/@saplings/observability), which also provides correlated JSON logs and OpenTelemetry helpers.

## Install

```bash
npm install @saplings/quality-node-diagnostics
```

## Quick start

```ts
import { createNodeDiagnostics } from '@saplings/quality-node-diagnostics';

const diagnostics = createNodeDiagnostics();
try {
  console.log(diagnostics.snapshot());
} finally {
  diagnostics.close();
}
```

## API and integration

- `createNodeDiagnostics()` starts a performance histogram. `snapshot()` reports memory, CPU, uptime, and event-loop latency in documented units.
- Create a collector at service startup and close it at shutdown. CPU usage reflects the interval since the last snapshot.
- Restrict access if you expose snapshots through an HTTP endpoint.

Read the [integration guide](https://github.com/snrakshith/saplings/blob/main/docs/BACKEND_QUALITY.md) for configuration and operational details.
