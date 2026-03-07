/**
 * Subdomain utilities for multi-tenant routing
 * e.g. zec.anti-planning.com → center "Zeroencompta"
 */

import { supabase } from '@/lib/supabase'

// Base domain — configurable via env var
const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || 'anti-planning.com'

// Reserved subdomains that are NOT center slugs
const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'admin', 'api', 'mail', 'smtp', 'ftp', 'cdn',
  'static', 'assets', 'blog', 'docs', 'help', 'support',
  'status', 'staging', 'dev', 'test',
])

export type SubdomainContext =
  | { type: 'landing' }          // www / root → landing page
  | { type: 'app' }              // app.* → generic login
  | { type: 'admin' }            // admin.* → super admin
  | { type: 'center'; slug: string } // zec.* → center-specific

/**
 * Extract subdomain context from current hostname.
 * Works with:
 *   - zec.anti-planning.com → center slug "zec"
 *   - admin.anti-planning.com → admin
 *   - app.anti-planning.com → app (generic login)
 *   - anti-planning.com / www.anti-planning.com → landing
 *   - localhost:5173 → landing (dev)
 */
export function getSubdomainContext(): SubdomainContext {
  const hostname = window.location.hostname

  // Dev mode: localhost or IP → treat as landing (no subdomain)
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
    // Allow dev override via query param: ?subdomain=zec
    const params = new URLSearchParams(window.location.search)
    const devSlug = params.get('subdomain')
    if (devSlug === 'admin') return { type: 'admin' }
    if (devSlug === 'app') return { type: 'app' }
    if (devSlug && !RESERVED_SUBDOMAINS.has(devSlug)) return { type: 'center', slug: devSlug }
    return { type: 'landing' }
  }

  // Vercel preview URLs (*.vercel.app) → treat as landing
  if (hostname.endsWith('.vercel.app')) {
    const params = new URLSearchParams(window.location.search)
    const devSlug = params.get('subdomain')
    if (devSlug === 'admin') return { type: 'admin' }
    if (devSlug === 'app') return { type: 'app' }
    if (devSlug && !RESERVED_SUBDOMAINS.has(devSlug)) return { type: 'center', slug: devSlug }
    return { type: 'landing' }
  }

  // Extract subdomain from hostname
  const baseParts = BASE_DOMAIN.split('.').length // e.g. 2 for "anti-planning.com"
  const hostParts = hostname.split('.')

  // No subdomain (naked domain)
  if (hostParts.length <= baseParts) return { type: 'landing' }

  const subdomain = hostParts.slice(0, hostParts.length - baseParts).join('.')

  if (!subdomain || subdomain === 'www') return { type: 'landing' }
  if (subdomain === 'admin') return { type: 'admin' }
  if (subdomain === 'app') return { type: 'app' }

  // Any other subdomain → center slug
  return { type: 'center', slug: subdomain }
}

/**
 * Resolve a center slug to its center_id.
 * Uses a SECURITY DEFINER RPC so it works without auth (anon).
 * Returns null if not found or inactive.
 */
export async function resolveCenterSlug(slug: string): Promise<{ id: string; name: string; logoUrl?: string; slug: string } | null> {
  const { data, error } = await supabase
    .rpc('resolve_center_slug', { p_slug: slug })

  if (error || !data || data.length === 0) return null
  const row = data[0]
  return { id: row.id, name: row.name, logoUrl: row.logo_url, slug: row.slug }
}

/**
 * Get the center URL for a given slug.
 * In dev, uses ?subdomain=slug. In prod, uses slug.domain.com
 */
export function getCenterUrl(slug: string): string {
  const hostname = window.location.hostname
  const protocol = window.location.protocol

  // Dev mode
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const port = window.location.port ? `:${window.location.port}` : ''
    return `${protocol}//${hostname}${port}?subdomain=${slug}`
  }

  // Vercel preview
  if (hostname.endsWith('.vercel.app')) {
    return `${protocol}//${hostname}?subdomain=${slug}`
  }

  // Production
  return `${protocol}//${slug}.${BASE_DOMAIN}`
}

/**
 * Get the admin URL.
 */
export function getAdminUrl(): string {
  return getCenterUrl('admin').replace('?subdomain=admin', '?subdomain=admin')
}

/**
 * Get the landing/marketing site URL.
 */
export function getLandingUrl(): string {
  const hostname = window.location.hostname
  const protocol = window.location.protocol

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const port = window.location.port ? `:${window.location.port}` : ''
    return `${protocol}//${hostname}${port}`
  }

  if (hostname.endsWith('.vercel.app')) {
    return `${protocol}//${hostname}`
  }

  return `${protocol}//www.${BASE_DOMAIN}`
}

/**
 * Navigate to a center's subdomain (full page redirect).
 */
export function navigateToCenter(slug: string, hash?: string): void {
  const url = getCenterUrl(slug) + (hash || '#/')
  window.location.href = url
}

/**
 * Navigate to admin subdomain.
 */
export function navigateToAdmin(): void {
  const url = getCenterUrl('admin') + '#/super-admin'
  window.location.href = url
}

/**
 * Check if we're in a center context (not landing, not admin, not app).
 */
export function isCenterContext(): boolean {
  return getSubdomainContext().type === 'center'
}

/**
 * Get current center slug if in center context, null otherwise.
 */
export function getCurrentCenterSlug(): string | null {
  const ctx = getSubdomainContext()
  return ctx.type === 'center' ? ctx.slug : null
}

export { BASE_DOMAIN, RESERVED_SUBDOMAINS }
