import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useLang } from '@/hooks/useLang'

interface LandingNavbarProps {
  scrolled: boolean
  isDetailPage?: boolean
}

export default function LandingNavbar({ scrolled, isDetailPage: _isDetailPage = false }: LandingNavbarProps) {
  const { lang, toggleLang, t } = useLang()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '#/features', label: t('nav.features'), badge: true },
    { href: '#/ecole-en-ligne', label: t('nav.onlineSchool') },
    { href: '#/how-it-works', label: t('nav.howItWorks') },
    { href: '#/pricing', label: t('nav.pricing') },
    { href: '#/blog', label: 'Blog' },
    { href: '#/about', label: t('nav.about') },
  ]

  return (
    <>
      <nav className={`landing-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-navbar-inner">
          <a href="#/" className="landing-logo">
            <div className="landing-logo-icon">A</div>
            <span>AntiPlanning</span>
          </a>

          <div className="landing-nav-links">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="landing-nav-link">
                {link.label}
                {link.badge && <span className="landing-nav-badge-new">{t('nav.badge.new')}</span>}
              </a>
            ))}
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
            <a href="#/signup" className="landing-btn-coral">{t('nav.start')}</a>
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
        {navLinks.map((link) => (
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
        <a href="#/signup" className="landing-btn-coral landing-btn-coral-lg" onClick={() => setMobileMenuOpen(false)}>
          {t('nav.start')}
        </a>
      </div>
    </>
  )
}
