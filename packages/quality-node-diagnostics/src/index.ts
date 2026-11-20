import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { memoryUsage, cpuUsage } from 'node:process';
/** Optional Node.js in-process diagnostics for applications that elect to expose /quality-metrics. */
export function createNodeDiagnostics() {
  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();
  let previousCPU = cpuUsage(),
    previousTime = performance.now();
  return {
    snapshot() {
      const now = performance.now(),
        cpu = cpuUsage(previousCPU),
        delta = now - previousTime;
      previousTime = now;
      previousCPU = cpuUsage();
      const mem = memoryUsage();
      return {
        eventLoopLagP95Ms: histogram.percentile(95) / 1e6,
        eventLoopLagMaxMs: histogram.max / 1e6,
        heapUsedMb: mem.heapUsed / 1048576,
        rssMb: mem.rss / 1048576,
        externalMb: mem.external / 1048576,
        cpuPercent: delta > 0 ? ((cpu.user + cpu.system) / 1000 / delta) * 100 : 0,
        uptimeSeconds: process.uptime(),
      };
    },
    close() {
      histogram.disable();
    },
  };
}
