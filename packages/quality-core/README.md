# @saplings/quality-core

Validate quality configuration, register suite runners, and write execution reports from Node.js or CI.

## Install

```bash
npm install --save-dev @saplings/quality-core
```

## Quick start

```ts
import { QualityOrchestrator, defineQualityConfig, result } from '@saplings/quality-core';

const config = defineQualityConfig({
  name: 'demo',
  environment: 'local',
  frontend: { baseUrl: 'http://127.0.0.1:5173', routes: ['/'] },
});
const orchestrator = new QualityOrchestrator();
orchestrator.register('frontend:rendering', async () =>
  result('frontend:rendering', 'example', Date.now(), 'passed', 'Example result'),
);
const report = await orchestrator.run(config, { suites: ['frontend:rendering'] });
console.log(report.summary, report.artifacts);
```

## API and integration

- `register(id, runner)` associates a `SuiteId` with a function returning a `SuiteResult`. Replace the example runner with a measured check or register a bundled suite.
- `run(config, options?)` applies target rules, executes selected suites, and writes JSON, HTML, and JUnit reports.
- Use `loadQualityConfig(path)` to read JSON, JavaScript, or TypeScript configuration, and `dryRun: true` to preview selection.

Read the [integration guide](https://github.com/snrakshith/saplings/blob/main/docs/quality/architecture/CORE_LLD.md) for configuration and operational details.
