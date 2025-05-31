import { supabase } from './supabase';

class PerformanceLogger {
  private queue: Array<{
    operation: string;
    duration_ms: number;
    metadata?: Record<string, any>;
  }> = [];
  private batchTimer: number | null = null;
  private readonly BATCH_INTERVAL = 5000;

  async logPerformance(
    operation: string,
    duration_ms: number,
    metadata?: Record<string, any>
  ) {
    this.queue.push({
      operation,
      duration_ms,
      metadata
    });

    this.scheduleBatch();
  }

  private scheduleBatch() {
    if (this.batchTimer !== null) return;

    this.batchTimer = window.setTimeout(() => {
      this.flush();
    }, this.BATCH_INTERVAL);
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const logs = [...this.queue];
    this.queue = [];

    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      const { error } = await supabase
        .from('performance_logs')
        .insert(logs);

      if (error) throw error;
    } catch (e) {
      console.error('Failed to log performance metrics:', e);
    }
  }

  measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();
    return fn().finally(() => {
      const duration = Math.round(performance.now() - start);
      this.logPerformance(operation, duration, metadata);
    });
  }

  measureSync<T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = Math.round(performance.now() - start);
      this.logPerformance(operation, duration, metadata);
    }
  }
}

export const performanceLogger = new PerformanceLogger();