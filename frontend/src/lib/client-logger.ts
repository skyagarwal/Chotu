type LogLevel = 'log' | 'info' | 'warn' | 'error';

export interface ClientLogEvent {
  ts: string;
  level: LogLevel;
  message: string;
  page?: string;
  sessionId?: string;
  stack?: string;
  data?: unknown;
}

interface InstallOptions {
  endpoint?: string;
  sessionStorageKey?: string;
  flushIntervalMs?: number;
  maxQueueSize?: number;
}

let installed = false;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const safeJson = (value: unknown) => {
  try {
    return JSON.stringify(value);
  } catch {
    return '"<unserializable>"';
  }
};

const getSessionId = (key: string) => {
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = `cl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return undefined;
  }
};

export function installClientLogger(options: InstallOptions = {}) {
  if (installed) return;
  installed = true;

  const endpoint = options.endpoint ?? '/api/client-logs';
  const sessionStorageKey = options.sessionStorageKey ?? 'mangwale-client-log-session';
  const flushIntervalMs = options.flushIntervalMs ?? 2000;
  const maxQueueSize = options.maxQueueSize ?? 200;

  const queue: ClientLogEvent[] = [];
  const sessionId = getSessionId(sessionStorageKey);

  const enqueue = (event: ClientLogEvent) => {
    queue.push(event);
    while (queue.length > maxQueueSize) queue.shift();
  };

  const flush = async () => {
    if (!queue.length) return;
    const batch = queue.splice(0, queue.length);

    const payload = {
      events: batch,
    };

    try {
      // Prefer sendBeacon during unload
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([safeJson(payload)], { type: 'application/json' });
        // sendBeacon returns boolean; ignore failures
        navigator.sendBeacon(endpoint, blob);
        return;
      }

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeJson(payload),
        keepalive: true,
      });
    } catch {
      // Swallow to avoid infinite loops / noisy errors
    }
  };

  const record = (level: LogLevel, message: string, data?: unknown, stack?: string) => {
    enqueue({
      ts: new Date().toISOString(),
      level,
      message,
      data,
      stack,
      page: typeof window !== 'undefined' ? window.location.href : undefined,
      sessionId,
    });
  };

  // Record a lightweight boot marker so we can correlate sessions/reloads.
  try {
    const navEntry = performance.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined;
    record('info', 'client_logger_installed', {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      visibilityState: typeof document !== 'undefined' ? document.visibilityState : undefined,
      navigationType: navEntry?.type,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      serviceWorkerControlled:
        typeof navigator !== 'undefined' ? Boolean(navigator.serviceWorker?.controller) : undefined,
    });
  } catch {
    // ignore
  }

  // Lifecycle / navigation breadcrumbs (these are critical for "page reset" debugging)
  const lifecycleRecord = (eventName: string, extra?: unknown) => {
    try {
      const navEntry = performance.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined;
      record('info', `lifecycle:${eventName}`, {
        ...(isRecord(extra) ? extra : { extra }),
        visibilityState: typeof document !== 'undefined' ? document.visibilityState : undefined,
        navigationType: navEntry?.type,
      });
    } catch {
      // ignore
    }
  };

  window.addEventListener('pageshow', (event) => {
    const persisted = (event as PageTransitionEvent).persisted;
    lifecycleRecord('pageshow', { persisted });
  });
  window.addEventListener('pagehide', (event) => {
    const persisted = (event as PageTransitionEvent).persisted;
    lifecycleRecord('pagehide', { persisted });
  });
  window.addEventListener('beforeunload', () => lifecycleRecord('beforeunload'));
  window.addEventListener('unload', () => lifecycleRecord('unload'));
  window.addEventListener('popstate', () => lifecycleRecord('popstate'));
  window.addEventListener('hashchange', () => lifecycleRecord('hashchange'));
  document.addEventListener('visibilitychange', () => lifecycleRecord('visibilitychange'));

  // Detect programmatic navigations (reload/assign/replace) and capture a stack trace.
  try {
    type LocationProto = {
      reload: (forcedReload?: boolean) => void;
      assign: (url: string | URL) => void;
      replace: (url: string | URL) => void;
      __mangwaleLocationWrapped?: boolean;
    };

    const locationProto = (window.Location?.prototype ?? undefined) as LocationProto | undefined;
    if (locationProto && !locationProto.__mangwaleLocationWrapped) {
      locationProto.__mangwaleLocationWrapped = true;

      const wrap = <K extends keyof Pick<LocationProto, 'reload' | 'assign' | 'replace'>>(
        methodName: K,
      ) => {
        const original = locationProto[methodName];
        if (typeof original !== 'function') return;

        locationProto[methodName] = ((...args: unknown[]) => {
          let stack: string | undefined;
          try {
            stack = new Error(`location.${String(methodName)} called`).stack;
          } catch {
            stack = undefined;
          }

          record('warn', `location.${String(methodName)} called`, { args }, stack);

          return (original as unknown as (...a: unknown[]) => unknown).apply(window.location, args);
        }) as LocationProto[K];
      };

      wrap('reload');
      wrap('assign');
      wrap('replace');
    }
  } catch (error) {
    record('warn', 'location hook install failed', { error: String(error) });
  }

  // Capture runtime errors
  window.addEventListener('error', (event) => {
    const err = (event as ErrorEvent).error as Error | undefined;
    const message = (event as ErrorEvent).message || 'window.error';
    record('error', message, {
      filename: (event as ErrorEvent).filename,
      lineno: (event as ErrorEvent).lineno,
      colno: (event as ErrorEvent).colno,
    }, err?.stack);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    const stack = reason instanceof Error ? reason.stack : undefined;
    record('error', 'unhandledrejection', reason, stack);
  });

  // Wrap console methods (warn/error only to keep noise down)
  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);
  const origLog = console.log.bind(console);
  const origInfo = console.info.bind(console);

  const shouldCaptureInfo = (args: unknown[]) => {
    const text = args
      .map(a => (typeof a === 'string' ? a : safeJson(a)))
      .join(' ')
      .toLowerCase();
    // Common Next.js dev signals that correlate with "page reset"
    return (
      text.includes('fast refresh') ||
      text.includes('full reload') ||
      text.includes('hmr') ||
      text.includes('hot reload') ||
      text.includes('webpack') ||
      text.includes('turbopack')
    );
  };

  console.warn = ((...args: Parameters<typeof console.warn>) => {
    try {
      record('warn', args.map(a => (typeof a === 'string' ? a : safeJson(a))).join(' '), args);
    } catch {}
    origWarn(...args);
  }) as typeof console.warn;

  console.error = ((...args: Parameters<typeof console.error>) => {
    try {
      record('error', args.map(a => (typeof a === 'string' ? a : safeJson(a))).join(' '), args);
    } catch {}
    origError(...args);
  }) as typeof console.error;

  // Filtered capture for dev reload diagnostics
  console.log = ((...args: Parameters<typeof console.log>) => {
    try {
      if (shouldCaptureInfo(args as unknown[])) {
        record('info', args.map(a => (typeof a === 'string' ? a : safeJson(a))).join(' '), args);
      }
    } catch {}
    origLog(...args);
  }) as typeof console.log;

  console.info = ((...args: Parameters<typeof console.info>) => {
    try {
      if (shouldCaptureInfo(args as unknown[])) {
        record('info', args.map(a => (typeof a === 'string' ? a : safeJson(a))).join(' '), args);
      }
    } catch {}
    origInfo(...args);
  }) as typeof console.info;

  // Periodic flush
  const interval = window.setInterval(() => {
    flush();
  }, flushIntervalMs);

  // Flush on page hide/unload
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
  });
  window.addEventListener('pagehide', () => {
    void flush();
  });

  // Clean up interval if needed (not currently exposed)
  void interval;
}
