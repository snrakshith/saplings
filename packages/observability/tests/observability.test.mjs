import assert from 'node:assert/strict';
import { context, metrics, SpanStatusCode, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  TracerProvider,
} from '@opentelemetry/sdk-trace';
import { test } from 'vitest';
import {
  createLogger,
  createNodeDiagnostics,
  createObservability,
  RequestMetrics,
} from '../dist/index.js';
import { createSapling, Metrics } from '../../sdk/dist/index.js';
import { createNodeDiagnostics as createQualityDiagnostics } from '../../quality-node-diagnostics/dist/index.js';

test('JSON logs redact nested credentials, tolerate circular fields, and apply the level filter', async () => {
  const lines = [];
  const log = createLogger({
    serviceName: 'orders',
    redactKeys: ['cardNumber'],
    write: (line) => {
      lines.push(line);
    },
  });
  const fields = {
    id: 123,
    headers: { authorization: 'Bearer sensitive', Cookie: 'secret' },
    records: [{ 'card-number': 'secret', 'X-API-Key': 'secret' }],
  };
  fields.circular = fields;
  Object.defineProperty(fields, 'getter', {
    enumerable: true,
    get() {
      throw new Error('getter');
    },
  });
  await log({ level: 'debug', event: 'ignored' });
  await log({ level: 'info', event: 'order.created\nasynchronously', fields });

  assert.equal(lines.length, 1);
  assert.equal(lines[0].split('\n').length, 2);
  const record = JSON.parse(lines[0]);
  assert.equal(record.service, 'orders');
  assert.equal(record.trace_id, undefined);
  assert.deepEqual(record.fields, {
    id: 123,
    headers: { authorization: '[Redacted]', Cookie: '[Redacted]' },
    records: [{ 'card-number': '[Redacted]', 'X-API-Key': '[Redacted]' }],
    circular: '[Circular]',
  });
  await createLogger({
    serviceName: 'orders',
    async write() {
      throw new Error('sink unavailable');
    },
  })({ level: 'info', event: 'sink.failure' });
});

test('active spans correlate logs across awaits and report metrics through real providers', async () => {
  const logs = [];
  const manager = new AsyncLocalStorageContextManager().enable();
  const spans = new InMemorySpanExporter();
  const traceProvider = new TracerProvider({
    spanProcessors: [new SimpleSpanProcessor({ exporter: spans })],
  });
  const metricExporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
  const meterProvider = new MeterProvider({
    readers: [new PeriodicExportingMetricReader({ exporter: metricExporter })],
  });
  context.setGlobalContextManager(manager);
  trace.setGlobalTracerProvider(traceProvider);
  metrics.setGlobalMeterProvider(meterProvider);

  try {
    const obs = createObservability({
      serviceName: 'orders',
      write: (line) => {
        logs.push(JSON.parse(line));
      },
    });
    const counter = obs.meter.createCounter('orders.processed');
    const sdk = createSapling({
      app: { id: 'orders', environment: 'test' },
      providers: { telemetry: obs },
    });
    await obs.withSpan('orders.process', async (parent) => {
      await Promise.resolve();
      assert.equal(trace.getActiveSpan(), parent);
      await obs.withSpan('orders.persist', async () => {
        await sdk.telemetry.log('info', 'orders.processed');
        counter.add(2, { source: 'batch' });
      });
    });

    const failure = new Error('internal request details');
    await assert.rejects(
      obs.withSpan('orders.fail', () => {
        throw failure;
      }),
      (error) => error === failure,
    );
    await traceProvider.forceFlush();
    await meterProvider.forceFlush();
    const finished = spans.getFinishedSpans();
    const parent = finished.find((span) => span.name === 'orders.process');
    const child = finished.find((span) => span.name === 'orders.persist');
    const failed = finished.find((span) => span.name === 'orders.fail');
    assert.equal(child.parentSpanContext.spanId, parent.spanContext().spanId);
    assert.equal(logs[0].trace_id, child.spanContext().traceId);
    assert.equal(logs[0].span_id, child.spanContext().spanId);
    assert.equal(failed.status.code, SpanStatusCode.ERROR);
    assert.equal(failed.status.message, undefined);
    assert.equal(trace.getActiveSpan(), undefined);

    const sample = metricExporter
      .getMetrics()
      .flatMap((resource) => resource.scopeMetrics.flatMap((scope) => scope.metrics))
      .find((metric) => metric.descriptor.name === 'orders.processed');
    assert.equal(sample.dataPoints[0].value, 2);
    assert.deepEqual(sample.dataPoints[0].attributes, { source: 'batch' });
  } finally {
    context.disable();
    trace.disable();
    metrics.disable();
    await Promise.all([traceProvider.shutdown(), meterProvider.shutdown()]);
  }
});

test('SDK and quality diagnostics exports reuse the shared implementations', () => {
  assert.equal(Metrics, RequestMetrics);
  assert.equal(createQualityDiagnostics, createNodeDiagnostics);
  const requests = new RequestMetrics();
  assert.deepEqual(requests.snapshot(), {
    requests: 0,
    errors: 0,
    availability: null,
    meanMs: null,
  });
  requests.observe(200, 15);
  requests.observe(503, 25);
  assert.deepEqual(requests.snapshot(), { requests: 2, errors: 1, availability: 0.5, meanMs: 20 });

  const diagnostics = createNodeDiagnostics();
  try {
    assert.ok(diagnostics.snapshot().rssMb > 0);
  } finally {
    diagnostics.close();
  }
});
