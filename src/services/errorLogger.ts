/**
 * Lightweight error logging service.
 * Captures unhandled errors and logs them to the Supabase `error_logs` table.
 * In demo mode, errors are only printed to console.
 *
 * Features:
 * - Deduplication: same error message not logged more than once per minute
 * - Rate limiting: max 10 errors per minute to avoid flooding
 * - Non-blocking: fire-and-forget, never throws
 */

import { supabase, isDemoMode } from '@/lib/supabase';

// --- Rate limiting & dedup state ---

const DEDUP_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

const recentErrors = new Map<string, number>(); // message -> timestamp
let rateLimitCounter = 0;
let rateLimitWindowStart = Date.now();

function isDuplicate(message: string): boolean {
  const now = Date.now();
  const lastSeen = recentErrors.get(message);
  if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
    return true;
  }
  recentErrors.set(message, now);
  // Cleanup old entries periodically
  if (recentErrors.size > 100) {
    for (const [key, ts] of recentErrors) {
      if (now - ts > DEDUP_WINDOW_MS) recentErrors.delete(key);
    }
  }
  return false;
}

function isRateLimited(): boolean {
  const now = Date.now();
  if (now - rateLimitWindowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitCounter = 0;
    rateLimitWindowStart = now;
  }
  if (rateLimitCounter >= RATE_LIMIT_MAX) {
    return true;
  }
  rateLimitCounter++;
  return false;
}

// --- Cached user info (resolved lazily) ---

let cachedUserId: string | null = null;
let cachedCenterId: string | null = null;
let userInfoResolved = false;

async function resolveUserInfo(): Promise<void> {
  if (userInfoResolved) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      cachedUserId = session.user.id;
      // Try to get center_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('center_id')
        .eq('id', session.user.id)
        .single();
      if (profile?.center_id) {
        cachedCenterId = profile.center_id;
      }
    }
    userInfoResolved = true;
  } catch {
    // Silently fail -- user info is best-effort
  }
}

// Listen for auth changes to update cached info
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    cachedUserId = session.user.id;
    userInfoResolved = false; // re-resolve center_id on next error
  } else {
    cachedUserId = null;
    cachedCenterId = null;
    userInfoResolved = false;
  }
});

// --- Core logger ---

export interface ErrorContext {
  component?: string;
  action?: string;
  extra?: Record<string, unknown>;
}

/**
 * Log an error to the Supabase error_logs table.
 * Non-blocking, fire-and-forget. Never throws.
 */
export async function logError(error: unknown, context?: ErrorContext): Promise<void> {
  try {
    const message = extractMessage(error);
    const stack = extractStack(error);

    // Console log always (useful for dev)
    console.error('[ErrorLogger]', message, context || '');

    if (isDemoMode) return;
    if (isDuplicate(message)) return;
    if (isRateLimited()) return;

    // Resolve user info (best-effort, non-blocking)
    await resolveUserInfo();

    const payload = {
      message: message.slice(0, 2000), // cap message length
      stack: stack ? stack.slice(0, 8000) : null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
      user_id: cachedUserId || null,
      center_id: cachedCenterId || null,
      context: context ? JSON.parse(JSON.stringify(context)) : null,
    };

    // Fire and forget
    supabase.from('error_logs').insert(payload).then(({ error: insertErr }) => {
      if (insertErr) {
        console.warn('[ErrorLogger] Failed to persist error log:', insertErr.message);
      }
    });
  } catch {
    // The error logger must never throw
  }
}

function extractMessage(error: unknown): string {
  if (!error) return 'Unknown error';
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
    if (typeof e.reason === 'string') return e.reason;
  }
  return String(error);
}

function extractStack(error: unknown): string | null {
  if (error instanceof Error && error.stack) return error.stack;
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.stack === 'string') return e.stack;
  }
  return null;
}

// --- Global error handlers ---

/**
 * Install global error handlers (window.onerror, unhandledrejection).
 * Call once at app startup (e.g. in main.tsx).
 */
export function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event: ErrorEvent) => {
    logError(event.error || event.message, {
      component: 'window.onerror',
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    logError(event.reason, {
      component: 'unhandledrejection',
    });
  });
}
