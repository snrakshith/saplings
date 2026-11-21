export class RequestMetrics {
  private count = 0;
  private errors = 0;
  private duration = 0;
  observe(status: number, ms: number) {
    this.count++;
    if (status >= 500) this.errors++;
    this.duration += ms;
  }
  snapshot() {
    return {
      requests: this.count,
      errors: this.errors,
      availability: this.count ? 1 - this.errors / this.count : null,
      meanMs: this.count ? this.duration / this.count : null,
    };
  }
}
