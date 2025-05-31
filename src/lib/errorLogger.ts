import { supabase } from './supabase';
import type { ErrorLog } from '../types';

interface ErrorContext {
  componentStack?: string;
  errorBoundary?: boolean;
  type?: string;
  [key: string]: any;
}

class ErrorLogger {
  private queue: ErrorLog[] = [];
  private batchTimer: number | null = null;
  private readonly BATCH_INTERVAL = 1000;
  private readonly MAX_QUEUE_SIZE = 50;

  constructor() {
    // Flush queue before window unloads
    window.addEventListener('beforeunload', () => {
      if (this.queue.length > 0) {
        this.flush();
      }
    });
  }

  async log(
    error: Error,
    level: 'debug' | 'info' | 'warning' | 'error' | 'critical' = 'error',
    context?: ErrorContext
  ) {
    const errorLog: ErrorLog = {
      level,
      message: error.message,
      error_stack: error.stack,
      context: {
        ...context,
        url: window.location.href,
        route: window.location.pathname,
      },
      browser_info: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timestamp: new Date().toISOString(),
      },
      user_id: (await supabase.auth.getUser()).data.user?.id,
    };

    this.queue.push(errorLog);

    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      this.flush();
    } else {
      this.scheduleBatch();
    }

    // For critical errors, notify immediately
    if (level === 'critical') {
      this.notifyCriticalError(errorLog);
    }
  }

  private scheduleBatch() {
    if (this.batchTimer !== null) return;

    this.batchTimer = window.setTimeout(() => {
      this.flush();
    }, this.BATCH_INTERVAL);
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const errors = [...this.queue];
    this.queue = [];

    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      const { error } = await supabase
        .from('error_logs')
        .insert(errors);

      if (error) throw error;
    } catch (e) {
      // Fallback to console if Supabase fails
      console.error('Failed to log errors to Supabase:', e);
      console.error('Errors that failed to log:', errors);
    }
  }

  private async notifyCriticalError(errorLog: ErrorLog) {
    try {
      await supabase.functions.invoke('error-notification', {
        body: { error: errorLog }
      });
    } catch (e) {
      console.error('Failed to send critical error notification:', e);
    }
  }
}

export const errorLogger = new ErrorLogger();

// Global error handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorLogger.log(event.error || new Error(event.message));
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.log(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      'error',
      { type: 'unhandledRejection' }
    );
  });
}