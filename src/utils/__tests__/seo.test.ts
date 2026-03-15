import { describe, it, expect, beforeEach } from 'vitest'
import { updatePageMeta } from '../seo'

// ---------------------------------------------------------------------------
// Setup: create minimal DOM meta tags that updatePageMeta expects
// ---------------------------------------------------------------------------
function ensureMeta(selector: string, attrs: Record<string, string>) {
  if (!document.querySelector(selector)) {
    const el = selector.startsWith('link')
      ? document.createElement('link')
      : document.createElement('meta')
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
    document.head.appendChild(el)
  }
}

beforeEach(() => {
  // Reset title
  document.title = ''

  // Ensure all expected meta/link elements exist
  ensureMeta('meta[name="description"]', { name: 'description', content: '' })
  ensureMeta('meta[name="keywords"]', { name: 'keywords', content: '' })
  ensureMeta('meta[property="og:title"]', { property: 'og:title', content: '' })
  ensureMeta('meta[property="og:description"]', { property: 'og:description', content: '' })
  ensureMeta('meta[property="og:type"]', { property: 'og:type', content: '' })
  ensureMeta('meta[property="og:image"]', { property: 'og:image', content: '' })
  ensureMeta('meta[property="og:url"]', { property: 'og:url', content: '' })
  ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: '' })
  ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: '' })
  ensureMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: '' })
  ensureMeta('link[rel="canonical"]', { rel: 'canonical', href: '' })
})

// ---------------------------------------------------------------------------
// updatePageMeta
// ---------------------------------------------------------------------------
describe('updatePageMeta', () => {
  it('definit le titre du document avec le format attendu', () => {
    updatePageMeta({ title: 'Accueil', description: 'desc' })
    expect(document.title).toBe('Accueil | Anti-Planning - Logiciel de gestion pour centres de formation')
  })

  it('definit la meta description', () => {
    updatePageMeta({ title: 'T', description: 'Ma description SEO' })
    const el = document.querySelector('meta[name="description"]')
    expect(el?.getAttribute('content')).toBe('Ma description SEO')
  })

  it('definit les OG tags', () => {
    updatePageMeta({ title: 'Page', description: 'Desc' })
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Page | Anti-Planning')
    expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('Desc')
    expect(document.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('website')
  })

  it('utilise l image OG par defaut si non fournie', () => {
    updatePageMeta({ title: 'T', description: 'D' })
    const img = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
    expect(img).toBe('https://anti-planning.com/pwa-512x512.png')
  })

  it('utilise une image OG custom si fournie', () => {
    updatePageMeta({ title: 'T', description: 'D', ogImage: 'https://example.com/img.png' })
    const img = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
    expect(img).toBe('https://example.com/img.png')
  })

  it('definit ogType custom', () => {
    updatePageMeta({ title: 'T', description: 'D', ogType: 'article' })
    expect(document.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('article')
  })

  it('definit le canonical et og:url quand path est fourni', () => {
    updatePageMeta({ title: 'T', description: 'D', path: '/features' })
    const expectedUrl = 'https://anti-planning.com/#/features'
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(expectedUrl)
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(expectedUrl)
  })

  it('ne modifie pas canonical si path non fourni', () => {
    // Set a value first
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://old.com')
    updatePageMeta({ title: 'T', description: 'D' })
    // Should remain unchanged (no path provided)
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://old.com')
  })

  it('definit les keywords si fournis', () => {
    updatePageMeta({ title: 'T', description: 'D', keywords: 'planning, ecole, saas' })
    expect(document.querySelector('meta[name="keywords"]')?.getAttribute('content')).toBe('planning, ecole, saas')
  })

  it('definit les twitter tags', () => {
    updatePageMeta({ title: 'Blog', description: 'Articles' })
    expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe('Blog | Anti-Planning')
    expect(document.querySelector('meta[name="twitter:description"]')?.getAttribute('content')).toBe('Articles')
  })

  it('definit twitter:image si ogImage fourni', () => {
    updatePageMeta({ title: 'T', description: 'D', ogImage: 'https://example.com/tw.png' })
    expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe('https://example.com/tw.png')
  })
})
