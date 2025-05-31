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
  private readonly NOTIFICATION_THROTTLE = 5 * 60 * 1000; // 5 minutes
  private notificationTimestamps: Record<string, number> = {};

  constructor() {
    // Flush queue before window unloads
    window.addEventListener('beforeunload', () => {
      if (this.queue.length > 0) {
        this.flush();
      }
    });
  }

  private shouldNotify(errorType: string): boolean {
    const now = Date.now();
    const lastNotification = this.notificationTimestamps[errorType] || 0;
    
    if (now - lastNotification >= this.NOTIFICATION_THROTTLE) {
      this.notificationTimestamps[errorType] = now;
      return true;
    }
    return false;
  }

  private isErrorCritical(error: Error, context?: ErrorContext): boolean {
    // Payment errors
    if (error.message.toLowerCase().includes('payment') || 
        context?.operation?.toLowerCase().includes('payment')) {
      return true;
    }

    // Booking errors
    if (error.message.toLowerCase().includes('booking') || 
        context?.operation?.toLowerCase().includes('booking')) {
      return true;
    }

    // Authentication errors
    if (error.message.toLowerCase().includes('auth') || 
        context?.operation?.toLowerCase().includes('login')) {
      return true;
    }

    // Check error frequency
    const errorKey = `${error.message}_${context?.operation || ''}`;
    const recentErrors = this.queue.filter(e => 
      e.message === error.message && 
      e.created_at && 
      (new Date().getTime() - new Date(e.created_at).getTime()) < 60000 // Last minute
    );
    if (recentErrors.length >= 5) {
      return true;
    }

    return false;
  }

  async log(
    error: Error,
    level: 'debug' | 'info' | 'warning' | 'error' | 'critical' = 'error',
    context?: ErrorContext
  ) {
    // Check if error should be elevated to critical
    if (level !== 'critical' && this.isErrorCritical(error, context)) {
      level = 'critical';
    }

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

    // For critical errors, check throttling before notifying
    if (level === 'critical') {
      const errorKey = `${error.message}_${context?.operation || ''}`;
      if (this.shouldNotify(errorKey)) {
        this.notifyCriticalError(errorLog);
      }
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