import { useState } from 'react'
import {
  Calendar, ShieldCheck, Video, Mail, Check, ArrowRight,
  FileBarChart, Building2, GraduationCap, Smartphone,
  UserPlus, Settings, CalendarCheck, ChevronDown,
  Star, Quote,
} from 'lucide-react'
import { useLang } from '@/hooks/useLang'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import LandingLayout from './LandingLayout'

export default function LandingPage() {
  const { t } = useLang()
  const { reveal } = useScrollReveal()
  const [annualBilling, setAnnualBilling] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const features = [
    { icon: Calendar, color: 'coral', titleKey: 'features.calendar.title', descKey: 'features.calendar.desc' },
    { icon: ShieldCheck, color: 'blue', titleKey: 'features.conflict.title', descKey: 'features.conflict.desc' },
    { icon: Video, color: 'teal', titleKey: 'features.zoom.title', descKey: 'features.zoom.desc' },
    { icon: Mail, color: 'amber', titleKey: 'features.email.title', descKey: 'features.email.desc' },
    { icon: FileBarChart, color: 'violet', titleKey: 'features.reports.title', descKey: 'features.reports.desc' },
    { icon: Building2, color: 'rose', titleKey: 'features.multiCampus.title', descKey: 'features.multiCampus.desc' },
    { icon: GraduationCap, color: 'indigo', titleKey: 'features.academic.title', descKey: 'features.academic.desc' },
    { icon: Smartphone, color: 'emerald', titleKey: 'features.mobile.title', descKey: 'features.mobile.desc' },
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
      nameKey: 'plan.ecole',
      price: 59,
      priceAnnual: 47,
      features: ['plan.ecole.f1', 'plan.ecole.f2', 'plan.ecole.f3', 'plan.ecole.f4', 'plan.ecole.f5', 'plan.ecole.f6'],
      ctaKey: 'pricing.cta.ecole',
      popular: true,
      btnStyle: 'filled' as const,
    },
    {
      nameKey: 'plan.pro',
      price: 99,
      priceAnnual: 79,
      features: ['plan.pro.f1', 'plan.pro.f2', 'plan.pro.f3', 'plan.pro.f4', 'plan.pro.f5', 'plan.pro.f6'],
      ctaKey: 'pricing.cta.pro',
      popular: false,
      btnStyle: 'outline' as const,
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

  const faqItems = [
    { qKey: 'faq.1.q', aKey: 'faq.1.a' },
    { qKey: 'faq.2.q', aKey: 'faq.2.a' },
    { qKey: 'faq.3.q', aKey: 'faq.3.a' },
    { qKey: 'faq.4.q', aKey: 'faq.4.a' },
    { qKey: 'faq.5.q', aKey: 'faq.5.a' },
    { qKey: 'faq.6.q', aKey: 'faq.6.a' },
  ]

  const mockupSlots = [
    '', 'filled-coral', '', 'filled-blue', '',
    'filled-blue', '', 'filled-teal', '', 'filled-coral',
    '', 'filled-amber', '', '', 'filled-teal',
    'filled-teal', '', 'filled-coral', 'filled-amber', '',
  ]

  return (
    <LandingLayout>
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
              <a href="#/features" className="landing-hero-btn-secondary">
                {t('hero.cta.secondary')}
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

          <div className="landing-section-more" ref={reveal}>
            <a href="#/features" className="landing-link-more">
              {t('features.learnMore')} <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* =================== HOW IT WORKS =================== */}
      <section className="landing-how-it-works" id="how-it-works">
        <div className="landing-how-inner">
          <div ref={reveal} style={{ textAlign: 'center' }}>
            <span className="landing-section-label">{t('howItWorks.section')}</span>
            <h2 className="landing-section-title" style={{ textAlign: 'center' }}>{t('howItWorks.title')}</h2>
            <p className="landing-section-subtitle" style={{ margin: '0 auto 3.5rem' }}>{t('howItWorks.subtitle')}</p>
          </div>

          <div className="landing-how-steps">
            {[
              { num: 1, icon: UserPlus, titleKey: 'howItWorks.step1.title', descKey: 'howItWorks.step1.desc' },
              { num: 2, icon: Settings, titleKey: 'howItWorks.step2.title', descKey: 'howItWorks.step2.desc' },
              { num: 3, icon: CalendarCheck, titleKey: 'howItWorks.step3.title', descKey: 'howItWorks.step3.desc' },
            ].map((step, i) => (
              <div key={step.num} className="landing-how-step" ref={reveal} data-reveal-delay={i + 1}>
                <div className="landing-how-step-number">{step.num}</div>
                <div className="landing-how-step-icon">
                  <step.icon size={28} />
                </div>
                <h3>{t(step.titleKey)}</h3>
                <p>{t(step.descKey)}</p>
              </div>
            ))}
          </div>

          <div className="landing-section-more" ref={reveal}>
            <a href="#/how-it-works" className="landing-link-more">
              {t('howItWorks.learnMore')} <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* =================== FEATURE SHOWCASE =================== */}
      <section className="landing-showcase">
        <div className="landing-showcase-inner">
          <div className="landing-showcase-block" ref={reveal}>
            <div className="landing-showcase-text">
              <span className="landing-showcase-label">{t('showcase.calendar.label')}</span>
              <h3>{t('showcase.calendar.title')}</h3>
              <p>{t('showcase.calendar.desc')}</p>
              <ul className="landing-showcase-bullets">
                {['showcase.calendar.b1', 'showcase.calendar.b2', 'showcase.calendar.b3', 'showcase.calendar.b4'].map(k => (
                  <li key={k}><Check size={18} /> {t(k)}</li>
                ))}
              </ul>
            </div>
            <div className="landing-showcase-visual">
              <div className="landing-showcase-mockup-calendar">
                {['', 'active', '', 'blue', '', 'blue', '', 'teal', '', '', '', 'active', '', 'teal', ''].map((cls, i) => (
                  <div key={i} className={`slot ${cls}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="landing-showcase-block reversed" ref={reveal}>
            <div className="landing-showcase-text">
              <span className="landing-showcase-label">{t('showcase.conflict.label')}</span>
              <h3>{t('showcase.conflict.title')}</h3>
              <p>{t('showcase.conflict.desc')}</p>
              <ul className="landing-showcase-bullets">
                {['showcase.conflict.b1', 'showcase.conflict.b2', 'showcase.conflict.b3'].map(k => (
                  <li key={k}><Check size={18} /> {t(k)}</li>
                ))}
              </ul>
            </div>
            <div className="landing-showcase-visual">
              <div className="landing-showcase-mockup-conflict">
                <div className="landing-showcase-conflict-row">
                  <div className="dot" style={{ background: '#3b82f6' }} />
                  <div className="line" style={{ background: 'rgba(59,130,246,0.3)', width: '60%' }} />
                </div>
                <div className="landing-showcase-conflict-row">
                  <div className="dot" style={{ background: '#14b8a6' }} />
                  <div className="line" style={{ background: 'rgba(20,184,166,0.3)', width: '45%' }} />
                </div>
                <div className="landing-showcase-conflict-row conflict">
                  <div className="dot" style={{ background: '#FF5B46' }} />
                  <div className="line" style={{ background: 'rgba(255,91,70,0.3)', width: '55%' }} />
                  <div className="badge">Conflit</div>
                </div>
                <div className="landing-showcase-conflict-row">
                  <div className="dot" style={{ background: '#FBA625' }} />
                  <div className="line" style={{ background: 'rgba(251,166,37,0.3)', width: '50%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="landing-showcase-block" ref={reveal}>
            <div className="landing-showcase-text">
              <span className="landing-showcase-label">{t('showcase.academic.label')}</span>
              <h3>{t('showcase.academic.title')}</h3>
              <p>{t('showcase.academic.desc')}</p>
              <ul className="landing-showcase-bullets">
                {['showcase.academic.b1', 'showcase.academic.b2', 'showcase.academic.b3', 'showcase.academic.b4'].map(k => (
                  <li key={k}><Check size={18} /> {t(k)}</li>
                ))}
              </ul>
            </div>
            <div className="landing-showcase-visual">
              <div className="landing-showcase-mockup-academic">
                <div className="landing-showcase-academic-item">
                  <div className="icon-box" style={{ background: 'rgba(139,92,246,0.2)' }}>
                    <GraduationCap size={14} style={{ color: '#8b5cf6' }} />
                  </div>
                  <div className="label" style={{ background: 'rgba(139,92,246,0.2)', width: '70%' }} />
                </div>
                <div className="landing-showcase-academic-item indent">
                  <div className="icon-box" style={{ background: 'rgba(59,130,246,0.2)' }}>
                    <Calendar size={14} style={{ color: '#3b82f6' }} />
                  </div>
                  <div className="label" style={{ background: 'rgba(59,130,246,0.2)', width: '55%' }} />
                </div>
                <div className="landing-showcase-academic-item indent-2">
                  <div className="icon-box" style={{ background: 'rgba(20,184,166,0.2)' }}>
                    <FileBarChart size={14} style={{ color: '#14b8a6' }} />
                  </div>
                  <div className="label" style={{ background: 'rgba(20,184,166,0.2)', width: '60%' }} />
                </div>
                <div className="landing-showcase-academic-item indent-2">
                  <div className="icon-box" style={{ background: 'rgba(251,166,37,0.2)' }}>
                    <FileBarChart size={14} style={{ color: '#FBA625' }} />
                  </div>
                  <div className="label" style={{ background: 'rgba(251,166,37,0.2)', width: '45%' }} />
                </div>
                <div className="landing-showcase-academic-item indent">
                  <div className="icon-box" style={{ background: 'rgba(244,63,94,0.2)' }}>
                    <Calendar size={14} style={{ color: '#f43f5e' }} />
                  </div>
                  <div className="label" style={{ background: 'rgba(244,63,94,0.2)', width: '50%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================== TESTIMONIALS =================== */}
      <section className="landing-testimonials" id="testimonials">
        <div className="landing-testimonials-inner">
          <div ref={reveal} style={{ textAlign: 'center' }}>
            <span className="landing-section-label">{t('testimonials.section')}</span>
            <h2 className="landing-section-title" style={{ textAlign: 'center' }}>{t('testimonials.title')}</h2>
            <p className="landing-section-subtitle" style={{ margin: '0 auto 3.5rem' }}>{t('testimonials.subtitle')}</p>
          </div>

          <div className="landing-testimonials-grid">
            {[
              { quoteKey: 'testimonial.1.quote', nameKey: 'testimonial.1.name', roleKey: 'testimonial.1.role', color: '#3b82f6', initials: 'MD' },
              { quoteKey: 'testimonial.2.quote', nameKey: 'testimonial.2.name', roleKey: 'testimonial.2.role', color: '#8b5cf6', initials: 'TB' },
              { quoteKey: 'testimonial.3.quote', nameKey: 'testimonial.3.name', roleKey: 'testimonial.3.role', color: '#14b8a6', initials: 'SM' },
            ].map((item, i) => (
              <div key={i} className="landing-testimonial-card" ref={reveal} data-reveal-delay={i + 1}>
                <div className="landing-testimonial-stars">
                  {[...Array(5)].map((_, j) => <Star key={j} size={16} fill="currentColor" />)}
                </div>
                <Quote size={28} className="landing-testimonial-quote-icon" />
                <p className="landing-testimonial-text">{t(item.quoteKey)}</p>
                <div className="landing-testimonial-author">
                  <div className="landing-testimonial-avatar" style={{ background: item.color }}>
                    {item.initials}
                  </div>
                  <div className="landing-testimonial-author-info">
                    <span className="landing-testimonial-name">{t(item.nameKey)}</span>
                    <span className="landing-testimonial-role">{t(item.roleKey)}</span>
                  </div>
                </div>
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

      {/* =================== FAQ =================== */}
      <section className="landing-faq" id="faq">
        <div className="landing-faq-inner">
          <div ref={reveal} style={{ textAlign: 'center' }}>
            <span className="landing-section-label">{t('faq.section')}</span>
            <h2 className="landing-section-title" style={{ textAlign: 'center' }}>{t('faq.title')}</h2>
            <p className="landing-section-subtitle" style={{ margin: '0 auto 3.5rem' }}>{t('faq.subtitle')}</p>
          </div>

          <div className="landing-faq-list">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className={`landing-faq-item ${openFaq === i ? 'open' : ''}`}
                ref={reveal}
                data-reveal-delay={i + 1}
              >
                <button
                  className="landing-faq-question"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {t(item.qKey)}
                  <ChevronDown size={20} className="landing-faq-chevron" />
                </button>
                <div className="landing-faq-answer">
                  <div className="landing-faq-answer-content">
                    {t(item.aKey)}
                  </div>
                </div>
              </div>
            ))}
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
          <div className="landing-cta-quote">
            <p className="landing-cta-quote-text">{t('cta.quote')}</p>
            <p className="landing-cta-quote-author">{t('cta.quoteAuthor')}</p>
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}
