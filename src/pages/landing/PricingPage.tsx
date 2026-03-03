import { useState, useEffect } from 'react'
import { Check, X, ChevronDown, ShieldCheck, Loader2 } from 'lucide-react'
import { useLang } from '@/hooks/useLang'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { useAuthContext } from '@/contexts/AuthContext'
import { useStripeCheckout } from '@/hooks/useStripeCheckout'
import LandingLayout from '@/components/landing/LandingLayout'

const plans = [
  {
    nameKey: 'plan.free',
    slug: 'free',
    price: 0,
    priceAnnual: 0,
    features: ['plan.free.f1', 'plan.free.f2', 'plan.free.f3', 'plan.free.f4'],
    ctaKey: 'pricing.cta.free',
    popular: false,
    btnStyle: 'outline' as const,
  },
  {
    nameKey: 'plan.ecole',
    slug: 'ecole-en-ligne',
    price: 59,
    priceAnnual: 47,
    features: ['plan.ecole.f1', 'plan.ecole.f2', 'plan.ecole.f3', 'plan.ecole.f4', 'plan.ecole.f5', 'plan.ecole.f6'],
    ctaKey: 'pricing.cta.ecole',
    popular: true,
    btnStyle: 'filled' as const,
  },
  {
    nameKey: 'plan.pro',
    slug: 'pro',
    price: 99,
    priceAnnual: 79,
    features: ['plan.pro.f1', 'plan.pro.f2', 'plan.pro.f3', 'plan.pro.f4', 'plan.pro.f5', 'plan.pro.f6'],
    ctaKey: 'pricing.cta.pro',
    popular: false,
    btnStyle: 'outline' as const,
  },
  {
    nameKey: 'plan.enterprise',
    slug: 'enterprise',
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

type CellValue = boolean | string

interface CompareRow {
  labelKey: string
  values: [CellValue, CellValue, CellValue, CellValue] // free, pro, ecole, enterprise
}

export default function PricingPage() {
  const { t } = useLang()
  const { reveal } = useScrollReveal()
  const { user } = useAuthContext()
  const { openCheckout, isLoading: checkoutLoading } = useStripeCheckout()
  const [annualBilling, setAnnualBilling] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null)

  const isAuthenticated = !!user

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const handlePlanClick = async (slug: string) => {
    if (!isAuthenticated) return // fallback: le <a> href gère la nav
    if (slug === 'free') {
      window.location.hash = '#/onboarding'
      return
    }
    setLoadingSlug(slug)
    await openCheckout({
      planSlug: slug,
      billingCycle: annualBilling ? 'yearly' : 'monthly',
      successUrl: `${window.location.origin}/#/checkout-success`,
      cancelUrl: `${window.location.origin}/#/pricing?checkout=cancelled`,
    })
    setLoadingSlug(null)
  }

  const compareRows: CompareRow[] = [
    // Ordre : Free, École en ligne, Pro, Enterprise
    { labelKey: 'pricingPage.row.teachers', values: ['3', '15', '50', t('plan.enterprise.f1').split(' ')[0]] },
    { labelKey: 'pricingPage.row.students', values: ['—', '200', '—', t('plan.enterprise.f1').split(' ')[0]] },
    { labelKey: 'pricingPage.row.rooms', values: ['3', t('plan.pro.f2').split(' ')[0], t('plan.pro.f2').split(' ')[0], t('plan.enterprise.f1').split(' ')[0]] },
    { labelKey: 'pricingPage.row.sessions', values: ['50', t('plan.ecole.f4').split(' ')[0], t('plan.pro.f3').split(' ')[0], t('plan.enterprise.f1').split(' ')[0]] },
    { labelKey: 'pricingPage.row.calendar', values: [true, true, true, true] },
    { labelKey: 'pricingPage.row.conflicts', values: [false, true, true, true] },
    { labelKey: 'pricingPage.row.dragdrop', values: [true, true, true, true] },
    { labelKey: 'pricingPage.row.export', values: [false, true, true, true] },
    { labelKey: 'pricingPage.row.academic', values: [false, true, true, true] },
    { labelKey: 'pricingPage.row.visio', values: [false, true, true, true] },
    { labelKey: 'pricingPage.row.studentAccess', values: [false, false, false, true] },
    { labelKey: 'pricingPage.row.multiCampus', values: [false, false, false, true] },
    { labelKey: 'pricingPage.row.api', values: [false, false, false, true] },
    { labelKey: 'pricingPage.row.sso', values: [false, false, false, true] },
    { labelKey: 'pricingPage.row.sla', values: ['—', '—', '—', '99.9%'] },
    { labelKey: 'pricingPage.row.support', values: [t('pricingPage.support.email'), t('pricingPage.support.priority'), t('pricingPage.support.priority'), t('pricingPage.support.dedicated')] },
    { labelKey: 'pricingPage.row.manager', values: [false, false, false, true] },
  ]

  const renderCell = (val: CellValue) => {
    if (val === true) return <Check size={18} className="text-green-500 mx-auto" />
    if (val === false) return <X size={18} className="text-neutral-300 mx-auto" />
    return <span className="text-sm text-neutral-700">{val}</span>
  }

  return (
    <LandingLayout isDetailPage>
      {/* Hero */}
      <section className="landing-detail-hero">
        <div className="landing-detail-hero-inner">
          <span className="landing-section-label">{t('pricingPage.hero.label')}</span>
          <h1>{t('pricingPage.hero.title')}</h1>
          <p>{t('pricingPage.hero.subtitle')}</p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="landing-pricing" style={{ paddingTop: '4rem' }}>
        <div className="landing-pricing-inner">
          <div className="landing-pricing-toggle" ref={reveal}>
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
              const billing = annualBilling ? 'yearly' : 'monthly'
              const ctaHref = plan.slug === 'free'
                ? '#/onboarding'
                : `#/onboarding?plan=${plan.slug}&billing=${billing}`
              return (
                <div
                  key={plan.nameKey}
                  className={`landing-pricing-card ${plan.popular ? 'landing-pricing-popular' : ''}`}
                  ref={reveal}
                  data-reveal-delay={i + 1}
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
                  {isAuthenticated ? (
                    <button
                      onClick={() => handlePlanClick(plan.slug)}
                      disabled={checkoutLoading}
                      className={`landing-pricing-card-btn ${plan.btnStyle}`}
                    >
                      {loadingSlug === plan.slug ? (
                        <><Loader2 size={16} className="animate-spin inline mr-2" />Redirection...</>
                      ) : (
                        plan.slug === 'free' ? 'Commencer gratuitement' : 'Souscrire maintenant'
                      )}
                    </button>
                  ) : (
                    <a
                      href={ctaHref}
                      className={`landing-pricing-card-btn ${plan.btnStyle}`}
                    >
                      {t(plan.ctaKey)}
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="landing-pricing-compare">
        <div className="landing-pricing-compare-inner">
          <div ref={reveal} style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="landing-section-title" style={{ textAlign: 'center' }}>{t('pricingPage.compare.title')}</h2>
            <p className="landing-section-subtitle" style={{ margin: '0 auto' }}>{t('pricingPage.compare.subtitle')}</p>
          </div>

          <div className="landing-compare-table-wrap" ref={reveal} data-reveal-delay="1">
            <table className="landing-compare-table">
              <thead>
                <tr>
                  <th></th>
                  {plans.map(p => (
                    <th key={p.nameKey} className={p.popular ? 'popular' : ''}>
                      {t(p.nameKey)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row.labelKey}>
                    <td className="landing-compare-label">{t(row.labelKey)}</td>
                    {row.values.map((val, i) => (
                      <td key={i} className={plans[i].popular ? 'popular' : ''}>
                        {renderCell(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Options supplementaires */}
      <section className="landing-pricing-compare">
        <div className="landing-pricing-compare-inner">
          <div ref={reveal} style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="landing-section-title" style={{ textAlign: 'center' }}>Options supplementaires</h2>
            <p className="landing-section-subtitle" style={{ margin: '0 auto' }}>
              Ajoutez des packs pour etendre les capacites de votre plan
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }} ref={reveal} data-reveal-delay="1">
            {/* Email Packs */}
            <div style={{ background: 'var(--landing-card-bg, #fff)', borderRadius: '16px', padding: '2rem', border: '1px solid var(--landing-border, #e5e7eb)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                  📧
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Packs Email</h3>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Inclus dans Enterprise</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[{ name: '25 emails/jour', price: '9,90' }, { name: '50 emails/jour', price: '14,90' }, { name: '200 emails/jour', price: '19,90' }].map(p => (
                  <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderRadius: '8px', background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{p.price}{'\u20AC'}/mois</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Teacher Packs */}
            <div style={{ background: 'var(--landing-card-bg, #fff)', borderRadius: '16px', padding: '2rem', border: '1px solid var(--landing-border, #e5e7eb)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                  👨‍🏫
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Packs Professeurs</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[{ name: '+5 profs', price: '9,90' }, { name: '+15 profs', price: '19,90' }, { name: '+30 profs', price: '29,90' }].map(p => (
                  <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderRadius: '8px', background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.1)' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{p.price}{'\u20AC'}/mois</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Packs */}
            <div style={{ background: 'var(--landing-card-bg, #fff)', borderRadius: '16px', padding: '2rem', border: '1px solid var(--landing-border, #e5e7eb)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                  🎓
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Packs Etudiants</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[{ name: '+50 etudiants', price: '9,90' }, { name: '+150 etudiants', price: '19,90' }, { name: '+500 etudiants', price: '29,90' }].map(p => (
                  <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderRadius: '8px', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{p.price}{'\u20AC'}/mois</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="landing-pricing-guarantee">
        <div className="landing-pricing-guarantee-inner" ref={reveal}>
          <ShieldCheck size={40} />
          <h3>{t('pricingPage.guarantee.title')}</h3>
          <p>{t('pricingPage.guarantee.desc')}</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="landing-faq">
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

      {/* CTA */}
      <section className="landing-cta">
        <div className="landing-cta-inner" ref={reveal}>
          <h2>{t('pricingPage.cta.title')}</h2>
          <p>{t('pricingPage.cta.subtitle')}</p>
          <a href="#/onboarding" className="landing-btn-coral landing-btn-coral-lg">
            {t('cta.button')}
          </a>
        </div>
      </section>
    </LandingLayout>
  )
}
