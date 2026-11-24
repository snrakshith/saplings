import { context, propagation, ROOT_CONTEXT, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { createObservability, createNodeDiagnostics, type LogEvent } from '@saplings/observability';
import type { RequestHandler } from 'express';

export type StarterTelemetry = {
  log(event: LogEvent): Promise<void>;
  diagnostics: ReturnType<typeof createNodeDiagnostics>;
  http: RequestHandler;
  producerTrace(): string | undefined;
  report<T>(traceparent: string | undefined, work: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
};

export function startTelemetry(component: 'api' | 'worker'): StarterTelemetry {
  const serviceName = 'saplings-starter-' + component;
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  let sdk: NodeSDK | undefined;
  let logger: LoggerProvider | undefined;
  if (endpoint) {
    const url = URL.parse(endpoint);
    if (
      !url ||
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error('OTEL_EXPORTER_OTLP_ENDPOINT must be an HTTP or HTTPS endpoint.');
    const resource = resourceFromAttributes({
      'service.name': serviceName,
      'deployment.environment.name':
        process.env.SAPLINGS_DEPLOYMENT_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    });
    process.env.OTEL_EXPORTER_OTLP_PROTOCOL ??= 'http/protobuf';
    process.env.OTEL_METRIC_EXPORT_INTERVAL ??= '5000';
    sdk = new NodeSDK({ resource, logRecordProcessors: [] });
    sdk.start();
    logger = new LoggerProvider({
      resource,
      processors: [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter(),
          scheduledDelayMillis: 1000,
        }),
      ],
    });
  }

  const otelLogger = logger?.getLogger('saplings.starter');
  const telemetry = createObservability({
    serviceName,
    write(line) {
      process.stdout.write(line);
      if (!otelLogger) return;
      const event = JSON.parse(line) as {
        event: string;
        level: 'info' | 'error' | 'warn' | 'debug';
      };
      otelLogger.emit({
        body: line.trim(),
        severityNumber: { debug: 5, info: 9, warn: 13, error: 17 }[event.level] as 5 | 9 | 13 | 17,
        severityText: event.level.toUpperCase(),
        attributes: { 'event.name': event.event },
        context: context.active(),
      });
    },
  });
  const duration = telemetry.meter.createHistogram('starter.http.duration', { unit: 's' });
  const requests = telemetry.meter.createCounter('starter.http.requests');
  const jobs = telemetry.meter.createCounter('starter.worker.jobs');
  const diagnostics = createNodeDiagnostics();
  const heap = telemetry.meter.createObservableGauge('starter.process.heap', { unit: 'By' });
  heap.addCallback((sample) => sample.observe(diagnostics.snapshot().heapUsedMb * 1048576));

  const http: RequestHandler = (req, res, next) => {
    telemetry.tracer.startActiveSpan('HTTP ' + req.method, { kind: SpanKind.SERVER }, (span) => {
      const scoped = context.active();
      const started = performance.now();
      const id = span.spanContext().traceId;
      if (span.isRecording()) res.set('X-Trace-Id', id);
      res.once('close', () =>
        context.with(scoped, () => {
          const route = typeof req.route?.path === 'string' ? req.route.path : 'unmatched';
          const code = res.writableFinished ? res.statusCode : 499;
          const attributes = {
            'http.request.method': req.method,
            'http.response.status_code': code,
            'http.route': route,
          };
          const elapsed = (performance.now() - started) / 1000;
          span.updateName(req.method + ' ' + route);
          span.setAttributes(attributes);
          if (code >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
          requests.add(1, attributes);
          duration.record(elapsed, attributes);
          if (!['/metrics', '/health', '/ready'].includes(route))
            void telemetry.log({
              level: code >= 500 ? 'error' : 'info',
              event: 'starter.http.completed',
              fields: { ...attributes, duration_ms: Math.round(elapsed * 1000) },
            });
          span.end();
        }),
      );
      next();
    });
  };

  return {
    log: telemetry.log,
    diagnostics,
    http,
    producerTrace() {
      const carrier: Record<string, string> = {};
      propagation.inject(context.active(), carrier);
      return carrier.traceparent;
    },
    async report<T>(traceparent: string | undefined, work: () => Promise<T>) {
      const parent = traceparent
        ? propagation.extract(ROOT_CONTEXT, { traceparent })
        : ROOT_CONTEXT;
      return context.with(parent, () =>
        telemetry.withSpan('starter.report', async () => {
          try {
            const result = await work();
            jobs.add(1, { outcome: 'completed' });
            await telemetry.log({ level: 'info', event: 'starter.report.completed' });
            return result;
          } catch (error) {
            jobs.add(1, { outcome: 'failed' });
            await telemetry.log({ level: 'error', event: 'starter.report.failed' });
            throw error;
          }
        }),
      );
    },
    async close() {
      diagnostics.close();
      await Promise.allSettled([sdk?.shutdown(), logger?.shutdown()]);
    },
  };
}
