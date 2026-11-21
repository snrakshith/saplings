import { metrics, SpanStatusCode, trace, type Span, type SpanOptions } from '@opentelemetry/api';
import { createLogger, type LoggerOptions } from './logger.js';

export { createLogger, type LoggerOptions, type LogEvent, type LogLevel } from './logger.js';
export { createNodeDiagnostics } from './node-diagnostics.js';
export { RequestMetrics } from './request-metrics.js';

export function createObservability(options: LoggerOptions) {
  const log = createLogger(options);
  const tracer = trace.getTracer('@saplings/observability');
  const meter = metrics.getMeter('@saplings/observability');

  return {
    log,
    tracer,
    meter,
    withSpan<T>(name: string, work: (span: Span) => T | Promise<T>, options: SpanOptions = {}) {
      return tracer.startActiveSpan(name, options, async (span) => {
        try {
          return await work(span);
        } catch (error) {
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          span.end();
        }
      });
    },
  };
}
