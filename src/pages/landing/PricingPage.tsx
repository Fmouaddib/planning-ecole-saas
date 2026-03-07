import { useState, useEffect } from 'react'
import { Check, X, ChevronDown, ShieldCheck, Loader2, Mail, UserCog, GraduationCap, ClipboardCheck } from 'lucide-react'
import { priceTTC, formatPrice } from '@/utils/pricing'
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
  { qKey: 'faq.7.q', aKey: 'faq.7.a' },
  { qKey: 'faq.8.q', aKey: 'faq.8.a' },
  { qKey: 'faq.9.q', aKey: 'faq.9.a' },
  { qKey: 'faq.10.q', aKey: 'faq.10.a' },
]

type CellValue = boolean | string

interface CompareRow {
  labelKey: string
  values: [CellValue, CellValue, CellValue, CellValue]
  isSection?: boolean
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
    if (!isAuthenticated) return
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
    // Section: Planning
    { labelKey: 'pricingPage.section.planning', values: ['', '', '', ''], isSection: true },
    { labelKey: 'pricingPage.row.teachers', values: ['3', '15', '50', t('plan.enterprise.f1').split(' ')[0]] },
    { labelKey: 'pricingPage.row.students', values: ['\u2014', '200', '\u2014', t('plan.enterprise.f1').split(' ')[0]] },
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

    // Section: Pedagogy
    { labelKey: 'pricingPage.section.pedagogy', values: ['', '', '', ''], isSection: true },
    { labelKey: 'pricingPage.row.attendance', values: [false, true, true, true] },
    { labelKey: 'pricingPage.row.grades', values: [false, true, true, true] },
    { labelKey: 'pricingPage.row.bulletins', values: [false, false, true, true] },
    { labelKey: 'pricingPage.row.certificates', values: [false, false, false, true] },
    { labelKey: 'pricingPage.row.parentContacts', values: [false, false, true, true] },
    { labelKey: 'pricingPage.row.absenceReports', values: [false, false, true, true] },

    // Section: Collaboration
    { labelKey: 'pricingPage.section.collaboration', values: ['', '', '', ''], isSection: true },
    { labelKey: 'pricingPage.row.teacherCollab', values: [false, false, true, true] },
    { labelKey: 'pricingPage.row.replacements', values: [false, false, true, true] },
    { labelKey: 'pricingPage.row.assignments', values: [false, false, true, true] },
    { labelKey: 'pricingPage.row.planningMessages', values: [false, false, true, true] },

    // Section: Technical
    { labelKey: 'pricingPage.section.technical', values: ['', '', '', ''], isSection: true },
    { labelKey: 'pricingPage.row.csvImport', values: [false, true, true, true] },
    { labelKey: 'pricingPage.row.pwa', values: [true, true, true, true] },
    { labelKey: 'pricingPage.row.pushNotif', values: [false, true, true, true] },
    { labelKey: 'pricingPage.row.billing', values: [false, true, true, true] },
    { labelKey: 'pricingPage.row.api', values: [false, false, false, true] },
    { labelKey: 'pricingPage.row.sso', values: [false, false, false, true] },
    { labelKey: 'pricingPage.row.sla', values: ['\u2014', '\u2014', '\u2014', '99.9%'] },
    { labelKey: 'pricingPage.row.support', values: [t('pricingPage.support.email'), t('pricingPage.support.priority'), t('pricingPage.support.priority'), t('pricingPage.support.dedicated')] },
    { labelKey: 'pricingPage.row.manager', values: [false, false, false, true] },
  ]

  const renderCell = (val: CellValue) => {
    if (val === true) return <Check size={18} className="text-green-500 mx-auto" />
    if (val === false) return <X size={18} className="text-neutral-300 mx-auto" />
    return <span className="text-sm text-neutral-700">{val}</span>
  }

  const addonCards = [
    {
      icon: Mail,
      color: 'rgba(59,130,246,0.1)',
      iconColor: '#3b82f6',
      bgTint: 'rgba(59,130,246,0.04)',
      borderTint: 'rgba(59,130,246,0.1)',
      titleKey: 'pricingPage.addon.email.title',
      descKey: 'pricingPage.addon.email.desc',
      includedKey: 'pricingPage.addon.email.included',
      options: [
        { name: '25 emails/jour', nameEn: '25 emails/day', price: '9,90' },
        { name: '50 emails/jour', nameEn: '50 emails/day', price: '14,90' },
        { name: '200 emails/jour', nameEn: '200 emails/day', price: '19,90' },
      ],
    },
    {
      icon: UserCog,
      color: 'rgba(139,92,246,0.1)',
      iconColor: '#8b5cf6',
      bgTint: 'rgba(139,92,246,0.04)',
      borderTint: 'rgba(139,92,246,0.1)',
      titleKey: 'pricingPage.addon.teacher.title',
      descKey: 'pricingPage.addon.teacher.desc',
      options: [
        { name: '+5 profs', nameEn: '+5 teachers', price: '9,90' },
        { name: '+15 profs', nameEn: '+15 teachers', price: '19,90' },
        { name: '+30 profs', nameEn: '+30 teachers', price: '29,90' },
      ],
    },
    {
      icon: GraduationCap,
      color: 'rgba(16,185,129,0.1)',
      iconColor: '#10b981',
      bgTint: 'rgba(16,185,129,0.04)',
      borderTint: 'rgba(16,185,129,0.1)',
      titleKey: 'pricingPage.addon.student.title',
      descKey: 'pricingPage.addon.student.desc',
      options: [
        { name: '+50 \u00E9tudiants', nameEn: '+50 students', price: '9,90' },
        { name: '+150 \u00E9tudiants', nameEn: '+150 students', price: '19,90' },
        { name: '+500 \u00E9tudiants', nameEn: '+500 students', price: '29,90' },
      ],
    },
    {
      icon: ClipboardCheck,
      color: 'rgba(249,115,22,0.1)',
      iconColor: '#f97316',
      bgTint: 'rgba(249,115,22,0.04)',
      borderTint: 'rgba(249,115,22,0.1)',
      titleKey: 'pricingPage.addon.pedagogy.title',
      descKey: 'pricingPage.addon.pedagogy.desc',
      includedKey: 'pricingPage.addon.email.included',
      options: [
        { name: 'Starter', nameEn: 'Starter', price: '19,90' },
        { name: 'Standard', nameEn: 'Standard', price: '24,90' },
        { name: 'Premium', nameEn: 'Premium', price: '39,90' },
      ],
    },
  ]

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
                    {price > 0 && <span className="period">HT{t('pricing.mo')}</span>}
                  </div>
                  {price > 0 && (
                    <div className="text-xs text-neutral-400 -mt-1 mb-1">
                      soit {formatPrice(priceTTC(price))}€ TTC/mois
                    </div>
                  )}
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
                {compareRows.map((row) => {
                  if (row.isSection) {
                    return (
                      <tr key={row.labelKey} className="landing-compare-section-header">
                        <td colSpan={5}>{t(row.labelKey)}</td>
                      </tr>
                    )
                  }
                  return (
                    <tr key={row.labelKey}>
                      <td className="landing-compare-label">{t(row.labelKey)}</td>
                      {row.values.map((val, i) => (
                        <td key={i} className={plans[i].popular ? 'popular' : ''}>
                          {renderCell(val)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Options supplementaires (redesigned) */}
      <section className="landing-pricing-compare">
        <div className="landing-pricing-compare-inner">
          <div ref={reveal} style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="landing-section-title" style={{ textAlign: 'center' }}>{t('pricingPage.addons.title')}</h2>
            <p className="landing-section-subtitle" style={{ margin: '0 auto' }}>{t('pricingPage.addons.subtitle')}</p>
          </div>

          <div className="landing-addon-grid" ref={reveal} data-reveal-delay="1">
            {addonCards.map((card) => (
              <div key={card.titleKey} className="landing-addon-card">
                <div className="landing-addon-card-header">
                  <div className="landing-addon-card-icon" style={{ background: card.color }}>
                    <card.icon size={20} style={{ color: card.iconColor }} />
                  </div>
                  <div>
                    <h3>{t(card.titleKey)}</h3>
                    {card.includedKey && (
                      <span className="landing-addon-badge">{t(card.includedKey)}</span>
                    )}
                  </div>
                </div>
                <p className="landing-addon-card-desc">{t(card.descKey)}</p>
                <div className="landing-addon-card-options">
                  {card.options.map((opt) => (
                    <div key={opt.name} className="landing-addon-option" style={{ background: card.bgTint, border: `1px solid ${card.borderTint}` }}>
                      <span className="landing-addon-option-name">{opt.name}</span>
                      <span className="landing-addon-option-price">{opt.price}€ HT{t('pricingPage.addon.perMonth')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
