import { useState, useRef, useEffect } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'
import { useLang } from '@/hooks/useLang'

interface LandingNavbarProps {
  scrolled: boolean
  isDetailPage?: boolean
}

interface NavItem {
  href: string
  label: string
  badge?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

type NavEntry = NavItem | NavGroup

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry
}

export default function LandingNavbar({ scrolled, isDetailPage: _isDetailPage = false }: LandingNavbarProps) {
  const { lang, toggleLang, t } = useLang()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const navEntries: NavEntry[] = [
    {
      label: t('nav.product'),
      items: [
        { href: '#/features', label: t('nav.features'), badge: true },
        { href: '#/ecole-en-ligne', label: t('nav.onlineSchool') },
        { href: '#/how-it-works', label: t('nav.howItWorks') },
      ],
    },
    { href: '#/pricing', label: t('nav.pricing') },
    { href: '#/blog', label: 'Blog' },
    { href: '#/about', label: t('nav.about') },
  ]

  // All flat links for mobile menu
  const allLinks: NavItem[] = navEntries.flatMap(entry =>
    isGroup(entry) ? entry.items : [entry]
  )

  const handleMouseEnter = (label: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current)
    setOpenDropdown(label)
  }

  const handleMouseLeave = () => {
    dropdownTimeout.current = setTimeout(() => setOpenDropdown(null), 150)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const close = () => setOpenDropdown(null)
    if (openDropdown) {
      document.addEventListener('click', close)
      return () => document.removeEventListener('click', close)
    }
  }, [openDropdown])

  return (
    <>
      <nav className={`landing-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-navbar-inner">
          <a href="#/" className="landing-logo">
            <div className="landing-logo-icon">A</div>
            <span>AntiPlanning</span>
          </a>

          <div className="landing-nav-links">
            {navEntries.map((entry) =>
              isGroup(entry) ? (
                <div
                  key={entry.label}
                  className="landing-nav-dropdown"
                  onMouseEnter={() => handleMouseEnter(entry.label)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button className="landing-nav-link landing-nav-dropdown-trigger">
                    {entry.label}
                    <ChevronDown size={14} className={`landing-nav-chevron ${openDropdown === entry.label ? 'open' : ''}`} />
                  </button>
                  <div className={`landing-nav-dropdown-menu ${openDropdown === entry.label ? 'open' : ''}`}>
                    {entry.items.map((item) => (
                      <a key={item.href} href={item.href} className="landing-nav-dropdown-item" onClick={() => setOpenDropdown(null)}>
                        {item.label}
                        {item.badge && <span className="landing-nav-badge-new">{t('nav.badge.new')}</span>}
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <a key={entry.href} href={entry.href} className="landing-nav-link">
                  {entry.label}
                  {entry.badge && <span className="landing-nav-badge-new">{t('nav.badge.new')}</span>}
                </a>
              )
            )}
          </div>

          <div className="landing-nav-actions">
            <div className="landing-lang-toggle">
              <button
                className={`landing-lang-option ${lang === 'fr' ? 'active' : ''}`}
                onClick={lang !== 'fr' ? toggleLang : undefined}
              >
                FR
              </button>
              <button
                className={`landing-lang-option ${lang === 'en' ? 'active' : ''}`}
                onClick={lang !== 'en' ? toggleLang : undefined}
              >
                EN
              </button>
            </div>
            <a href="#/login" className="landing-btn-ghost">{t('nav.login')}</a>
            <a href="#/onboarding" className="landing-btn-coral">{t('nav.start')}</a>
          </div>

          <button
            className="landing-hamburger"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </nav>

      <div className={`landing-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <button
          className="landing-mobile-close"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close"
        >
          <X size={24} />
        </button>
        {allLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="landing-mobile-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            {link.label}
            {link.badge && <span className="landing-nav-badge-new">{t('nav.badge.new')}</span>}
          </a>
        ))}
        <div className="landing-lang-toggle" style={{ marginTop: '1rem' }}>
          <button
            className={`landing-lang-option ${lang === 'fr' ? 'active' : ''}`}
            onClick={() => { if (lang !== 'fr') toggleLang() }}
          >
            FR
          </button>
          <button
            className={`landing-lang-option ${lang === 'en' ? 'active' : ''}`}
            onClick={() => { if (lang !== 'en') toggleLang() }}
          >
            EN
          </button>
        </div>
        <a href="#/login" className="landing-btn-ghost" onClick={() => setMobileMenuOpen(false)}>
          {t('nav.login')}
        </a>
        <a href="#/onboarding" className="landing-btn-coral landing-btn-coral-lg" onClick={() => setMobileMenuOpen(false)}>
          {t('nav.start')}
        </a>
      </div>
    </>
  )
}
