import { useState, useEffect } from 'react'
import { Calendar, ShieldCheck, Video, Mail, Check, Menu, X } from 'lucide-react'
import { useLang } from '@/hooks/useLang'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import '@/styles/landing.css'

export default function LandingPage() {
  const { lang, toggleLang, t } = useLang()
  const { reveal } = useScrollReveal()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [annualBilling, setAnnualBilling] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const features = [
    { icon: Calendar, color: 'coral', titleKey: 'features.calendar.title', descKey: 'features.calendar.desc' },
    { icon: ShieldCheck, color: 'blue', titleKey: 'features.conflict.title', descKey: 'features.conflict.desc' },
    { icon: Video, color: 'teal', titleKey: 'features.zoom.title', descKey: 'features.zoom.desc' },
    { icon: Mail, color: 'amber', titleKey: 'features.email.title', descKey: 'features.email.desc' },
  ]

  const plans = [
    {
      nameKey: 'plan.free',
      price: 0,
      priceAnnual: 0,
      features: ['plan.free.f1', 'plan.free.f2', 'plan.free.f3', 'plan.free.f4'],
      ctaKey: 'pricing.cta.free',
      popular: false,
      btnStyle: 'outline' as const,
    },
    {
      nameKey: 'plan.pro',
      price: 49,
      priceAnnual: 39,
      features: ['plan.pro.f1', 'plan.pro.f2', 'plan.pro.f3', 'plan.pro.f4', 'plan.pro.f5', 'plan.pro.f6'],
      ctaKey: 'pricing.cta.pro',
      popular: true,
      btnStyle: 'filled' as const,
    },
    {
      nameKey: 'plan.enterprise',
      price: 149,
      priceAnnual: 119,
      features: ['plan.enterprise.f1', 'plan.enterprise.f2', 'plan.enterprise.f3', 'plan.enterprise.f4', 'plan.enterprise.f5', 'plan.enterprise.f6'],
      ctaKey: 'pricing.cta.enterprise',
      popular: false,
      btnStyle: 'outline' as const,
    },
  ]

  // Calendar mockup slot data
  const mockupSlots = [
    '', 'filled-coral', '', 'filled-blue', '',
    'filled-blue', '', 'filled-teal', '', 'filled-coral',
    '', 'filled-amber', '', '', 'filled-teal',
    'filled-teal', '', 'filled-coral', 'filled-amber', '',
  ]

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* =================== NAVBAR =================== */}
      <nav className={`landing-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-navbar-inner">
          <a href="#/" className="landing-logo">
            <div className="landing-logo-icon">A</div>
            <span>AntiPlanning</span>
          </a>

          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">{t('nav.features')}</a>
            <a href="#pricing" className="landing-nav-link">{t('nav.pricing')}</a>
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

      {/* Mobile menu */}
      <div className={`landing-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <button
          className="landing-mobile-close"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close"
        >
          <X size={24} />
        </button>
        <a
          href="#features"
          className="landing-mobile-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          {t('nav.features')}
        </a>
        <a
          href="#pricing"
          className="landing-mobile-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          {t('nav.pricing')}
        </a>
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
        <a
          href="#/login"
          className="landing-btn-ghost"
          onClick={() => setMobileMenuOpen(false)}
        >
          {t('nav.login')}
        </a>
        <a
          href="#/signup"
          className="landing-btn-coral landing-btn-coral-lg"
          onClick={() => setMobileMenuOpen(false)}
        >
          {t('nav.start')}
        </a>
      </div>

      {/* =================== HERO =================== */}
      <section className="landing-hero">
        <div className="landing-float-shape landing-float-1" />
        <div className="landing-float-shape landing-float-2" />
        <div className="landing-float-shape landing-float-3" />

        <div className="landing-hero-inner">
          <div className="landing-hero-content">
            <h1 className="landing-hero-animate">
              {t('hero.title').split(' ').slice(0, 2).join(' ')}{' '}
              <span>{t('hero.title').split(' ').slice(2).join(' ')}</span>
            </h1>
            <p className="landing-hero-subtitle landing-hero-animate-delay-1">
              {t('hero.subtitle')}
            </p>
            <div className="landing-hero-buttons landing-hero-animate-delay-2">
              <a href="#/onboarding" className="landing-btn-coral landing-btn-coral-lg">
                {t('hero.cta.primary')}
              </a>
              <a href="#/signup" className="landing-hero-btn-secondary">
                {t('hero.cta.secondary.join')}
              </a>
            </div>
          </div>

          <div className="landing-hero-mockup landing-hero-animate-delay-3">
            <div className="landing-mockup-calendar">
              <div className="landing-mockup-header">
                <span className="landing-mockup-title">Planning - Semaine 12</span>
                <div className="landing-mockup-dots">
                  <div className="landing-mockup-dot" style={{ background: '#FF5B46' }} />
                  <div className="landing-mockup-dot" style={{ background: '#FBA625' }} />
                  <div className="landing-mockup-dot" style={{ background: '#22c55e' }} />
                </div>
              </div>
              <div className="landing-mockup-grid">
                {mockupSlots.map((cls, i) => (
                  <div key={i} className={`landing-mockup-slot ${cls}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================== FEATURES =================== */}
      <section className="landing-features" id="features">
        <div className="landing-features-inner">
          <div ref={reveal}>
            <span className="landing-section-label">{t('features.section')}</span>
            <h2 className="landing-section-title">{t('features.title')}</h2>
            <p className="landing-section-subtitle">{t('features.subtitle')}</p>
          </div>

          <div className="landing-features-grid">
            {features.map((feat, i) => (
              <div
                key={feat.titleKey}
                className="landing-feature-card"
                ref={reveal}
                data-reveal-delay={i + 1}
              >
                <div className={`landing-feature-icon ${feat.color}`}>
                  <feat.icon size={24} />
                </div>
                <h3>{t(feat.titleKey)}</h3>
                <p>{t(feat.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =================== PRICING =================== */}
      <section className="landing-pricing" id="pricing">
        <div className="landing-pricing-inner">
          <div ref={reveal} style={{ textAlign: 'center' }}>
            <span className="landing-section-label">{t('pricing.section')}</span>
            <h2 className="landing-section-title" style={{ textAlign: 'center' }}>{t('pricing.title')}</h2>
            <p className="landing-section-subtitle" style={{ margin: '0 auto 1.5rem' }}>{t('pricing.subtitle')}</p>
          </div>

          <div className="landing-pricing-toggle" ref={reveal} data-reveal-delay="1">
            <span className={`landing-pricing-toggle-label ${!annualBilling ? 'active' : ''}`}>
              {t('pricing.monthly')}
            </span>
            <button
              className={`landing-pricing-switch ${annualBilling ? 'annual' : ''}`}
              onClick={() => setAnnualBilling(!annualBilling)}
              aria-label="Toggle billing period"
            >
              <div className="landing-pricing-switch-knob" />
            </button>
            <span className={`landing-pricing-toggle-label ${annualBilling ? 'active' : ''}`}>
              {t('pricing.annual')}
            </span>
            {annualBilling && (
              <span className="landing-pricing-save-badge">{t('pricing.annual.save')}</span>
            )}
          </div>

          <div className="landing-pricing-grid">
            {plans.map((plan, i) => {
              const price = annualBilling ? plan.priceAnnual : plan.price
              return (
                <div
                  key={plan.nameKey}
                  className={`landing-pricing-card ${plan.popular ? 'landing-pricing-popular' : ''}`}
                  ref={reveal}
                  data-reveal-delay={i + 2}
                >
                  {plan.popular && (
                    <div className="landing-pricing-badge">{t('pricing.popular')}</div>
                  )}
                  <div className="landing-pricing-card-name">{t(plan.nameKey)}</div>
                  <div className="landing-pricing-card-price">
                    <span className="currency">&euro;</span>
                    <span className="amount">{price}</span>
                    {price > 0 && <span className="period">{t('pricing.mo')}</span>}
                  </div>
                  <ul className="landing-pricing-features">
                    {plan.features.map((fKey) => (
                      <li key={fKey}>
                        <Check size={18} />
                        {t(fKey)}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#/signup"
                    className={`landing-pricing-card-btn ${plan.btnStyle}`}
                  >
                    {t(plan.ctaKey)}
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* =================== CTA =================== */}
      <section className="landing-cta">
        <div className="landing-cta-inner" ref={reveal}>
          <h2>{t('cta.title')}</h2>
          <p>{t('cta.subtitle')}</p>
          <a href="#/onboarding" className="landing-btn-coral landing-btn-coral-lg">
            {t('cta.button')}
          </a>
        </div>
      </section>

      {/* =================== FOOTER =================== */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <a href="#/" className="landing-logo">
              <div className="landing-logo-icon">A</div>
              <span>AntiPlanning</span>
            </a>
            <p className="landing-footer-tagline">{t('footer.tagline')}</p>
          </div>
          <div className="landing-footer-col">
            <h4>{t('footer.product')}</h4>
            <a href="#features">{t('footer.features')}</a>
            <a href="#pricing">{t('footer.pricing')}</a>
          </div>
          <div className="landing-footer-col">
            <h4>{t('footer.legal')}</h4>
            <a href="#/">{t('footer.terms')}</a>
            <a href="#/">{t('footer.privacy')}</a>
          </div>
        </div>
        <div className="landing-footer-bottom">
          {t('footer.copyright')}
        </div>
      </footer>
    </div>
  )
}
