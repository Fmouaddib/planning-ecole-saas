/**
 * SEO utilities -- dynamic meta tags per page
 */
import { useEffect } from 'react'

export interface SEOMeta {
  title: string
  description: string
  path?: string
  keywords?: string
  ogImage?: string
  ogType?: string
}

const BASE_URL = 'https://anti-planning.com'
const SITE_NAME = 'Anti-Planning'
const SITE_TAGLINE = 'Logiciel de gestion pour centres de formation'
const DEFAULT_OG_IMAGE = 'https://anti-planning.com/pwa-512x512.png'

function setMetaTag(selector: string, attribute: string, value: string) {
  const el = document.querySelector(selector)
  if (el) {
    el.setAttribute(attribute, value)
  }
}

export function updatePageMeta({ title, description, path, keywords, ogImage, ogType }: SEOMeta) {
  // Title
  document.title = `${title} | ${SITE_NAME} - ${SITE_TAGLINE}`

  // Meta description
  setMetaTag('meta[name="description"]', 'content', description)

  // Keywords
  if (keywords) {
    setMetaTag('meta[name="keywords"]', 'content', keywords)
  }

  // OG tags
  setMetaTag('meta[property="og:title"]', 'content', `${title} | ${SITE_NAME}`)
  setMetaTag('meta[property="og:description"]', 'content', description)
  setMetaTag('meta[property="og:type"]', 'content', ogType || 'website')
  setMetaTag('meta[property="og:image"]', 'content', ogImage || DEFAULT_OG_IMAGE)

  if (path) {
    const fullUrl = `${BASE_URL}/#${path}`
    setMetaTag('meta[property="og:url"]', 'content', fullUrl)
    setMetaTag('link[rel="canonical"]', 'href', fullUrl)
  }

  // Twitter tags
  setMetaTag('meta[name="twitter:title"]', 'content', `${title} | ${SITE_NAME}`)
  setMetaTag('meta[name="twitter:description"]', 'content', description)
  if (ogImage) {
    setMetaTag('meta[name="twitter:image"]', 'content', ogImage)
  }
}

/**
 * React hook for setting SEO meta tags on mount.
 * Scrolls to top and updates all meta tags.
 */
export function useSEO(meta: SEOMeta) {
  useEffect(() => {
    window.scrollTo(0, 0)
    updatePageMeta(meta)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
