import { useState, useEffect } from 'react'
import { Check, X, ChevronDown, ShieldCheck, Loader2, Mail, UserCog, GraduationCap, ClipboardCheck } from 'lucide-react'
import { priceTTC, formatPrice } from '@/utils/pricing'
import { useLang } from '@/hooks/useLang'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { updatePageMeta } from '@/utils/seo'
import { useAuthContext } from '@/contexts/AuthContext'
import { useStripeCheckout } from '@/hooks/useStripeCheckout'
import { supabase } from '@/lib/supabase'
import LandingLayout from '@/components/landing/LandingLayout'

interface DBPlan {
  slug: string
  name: string
  price_monthly: number
  price_yearly: number
  features: string[]
  is_active: boolean
  sort_order: number
  max_users: number
  max_sessions: number
  max_rooms: number
  max_students: number
}

// Slug qui est marqué "popular"
const POPULAR_SLUG = 'ecole-en-ligne'

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
  values: CellValue[]
  isSection?: boolean
}

export default function PricingPage() {
  const { t, lang } = useLang()
  const { reveal } = useScrollReveal()
  const { user } = useAuthContext()
  const { openCheckout, isLoading: checkoutLoading } = useStripeCheckout()
  const [annualBilling, setAnnualBilling] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null)
  const [dbPlans, setDbPlans] = useState<DBPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)

  const isAuthenticated = !!user

  useEffect(() => {
    window.scrollTo(0, 0)
    updatePageMeta({
      title: 'Tarifs',
      description: 'Tarifs Anti-Planning : plans gratuit, ecole en ligne, professionnel et entreprise. Essai gratuit, sans engagement.',
      path: '/pricing',
      keywords: 'tarifs planning ecole, prix logiciel formation, plan gratuit formation, logiciel education prix, SaaS formation tarifs',
    })
  }, [])

  // Fetch plans from subscription_plans table
  useEffect(() => {
    supabase
      .from('subscription_plans')
      .select('slug, name, price_monthly, price_yearly, features, is_active, sort_order, max_users, max_sessions, max_rooms, max_students')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDbPlans(data as DBPlan[])
        }
        setPlansLoading(false)
      })
  }, [])

  // Build display plans from DB
  const plans = dbPlans.map(p => ({
    name: p.name,
    slug: p.slug,
    price: Number(p.price_monthly),
    priceAnnual: p.price_yearly > 0 ? Math.round(Number(p.price_yearly) / 12) : 0,
    features: (p.features || []) as string[],
    popular: p.slug === POPULAR_SLUG,
    btnStyle: (p.slug === POPULAR_SLUG ? 'filled' : 'outline') as 'filled' | 'outline',
  }))

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

  // Build compare rows dynamically from DB plans
  const fmtLimit = (v: number) => v === -1 ? t('pricing.unlimited') : String(v)
  const planVal = (slugs: string[], getter: (p: DBPlan) => CellValue): CellValue[] =>
    slugs.map(s => { const p = dbPlans.find(pp => pp.slug === s); return p ? getter(p) : false })
  const planSlugs = dbPlans.map(p => p.slug)
  const isPaid = (slug: string) => { const p = dbPlans.find(pp => pp.slug === slug); return p ? Number(p.price_monthly) > 0 : false }
  const isTop = (slug: string) => slug === 'enterprise'
  const sectionRow = (labelKey: string): CompareRow => ({ labelKey, values: planSlugs.map(() => '') as CellValue[], isSection: true })

  const compareRows: CompareRow[] = plans.length > 0 ? [
    // Section: Planning
    sectionRow('pricingPage.section.planning'),
    { labelKey: 'pricingPage.row.teachers', values: planVal(planSlugs, p => fmtLimit(p.max_users)) },
    { labelKey: 'pricingPage.row.students', values: planVal(planSlugs, p => p.max_students === 0 ? '\u2014' : fmtLimit(p.max_students)) },
    { labelKey: 'pricingPage.row.rooms', values: planVal(planSlugs, p => fmtLimit(p.max_rooms)) },
    { labelKey: 'pricingPage.row.sessions', values: planVal(planSlugs, p => fmtLimit(p.max_sessions)) },
    { labelKey: 'pricingPage.row.calendar', values: planSlugs.map(() => true) },
    { labelKey: 'pricingPage.row.conflicts', values: planSlugs.map(s => isPaid(s)) },
    { labelKey: 'pricingPage.row.dragdrop', values: planSlugs.map(() => true) },
    { labelKey: 'pricingPage.row.export', values: planSlugs.map(s => isPaid(s)) },
    { labelKey: 'pricingPage.row.academic', values: planSlugs.map(s => isPaid(s)) },
    { labelKey: 'pricingPage.row.visio', values: planSlugs.map(s => isPaid(s)) },
    { labelKey: 'pricingPage.row.studentAccess', values: planSlugs.map(s => isTop(s)) },
    { labelKey: 'pricingPage.row.multiCampus', values: planSlugs.map(s => isTop(s)) },

    // Section: Pedagogy
    sectionRow('pricingPage.section.pedagogy'),
    { labelKey: 'pricingPage.row.attendance', values: planSlugs.map(s => isPaid(s)) },
    { labelKey: 'pricingPage.row.grades', values: planSlugs.map(s => isPaid(s)) },
    { labelKey: 'pricingPage.row.bulletins', values: planSlugs.map(s => s === 'pro' || isTop(s)) },
    { labelKey: 'pricingPage.row.certificates', values: planSlugs.map(s => isTop(s)) },
    { labelKey: 'pricingPage.row.parentContacts', values: planSlugs.map(s => s === 'pro' || isTop(s)) },
    { labelKey: 'pricingPage.row.absenceReports', values: planSlugs.map(s => s === 'pro' || isTop(s)) },

    // Section: Collaboration
    sectionRow('pricingPage.section.collaboration'),
    { labelKey: 'pricingPage.row.teacherCollab', values: planSlugs.map(s => s === 'pro' || isTop(s)) },
    { labelKey: 'pricingPage.row.replacements', values: planSlugs.map(s => s === 'pro' || isTop(s)) },
    { labelKey: 'pricingPage.row.assignments', values: planSlugs.map(s => s === 'pro' || isTop(s)) },
    { labelKey: 'pricingPage.row.planningMessages', values: planSlugs.map(s => s === 'pro' || isTop(s)) },

    // Section: Technical
    sectionRow('pricingPage.section.technical'),
    { labelKey: 'pricingPage.row.csvImport', values: planSlugs.map(s => isPaid(s)) },
    { labelKey: 'pricingPage.row.pwa', values: planSlugs.map(() => true) },
    { labelKey: 'pricingPage.row.pushNotif', values: planSlugs.map(s => isPaid(s)) },
    { labelKey: 'pricingPage.row.billing', values: planSlugs.map(s => isPaid(s)) },
    { labelKey: 'pricingPage.row.api', values: planSlugs.map(s => isTop(s)) },
    { labelKey: 'pricingPage.row.sso', values: planSlugs.map(s => isTop(s)) },
    { labelKey: 'pricingPage.row.sla', values: planSlugs.map(s => isTop(s) ? '99.9%' : '\u2014') },
    { labelKey: 'pricingPage.row.support', values: planSlugs.map(s => s === 'free' ? t('pricingPage.support.email') : isTop(s) ? t('pricingPage.support.dedicated') : t('pricingPage.support.priority')) },
    { labelKey: 'pricingPage.row.manager', values: planSlugs.map(s => isTop(s)) },
  ] : []

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
            {plansLoading ? (
              <div className="flex items-center justify-center py-12 col-span-full">
                <Loader2 size={32} className="animate-spin text-neutral-400" />
              </div>
            ) : plans.map((plan, i) => {
              const price = annualBilling ? plan.priceAnnual : plan.price
              const billing = annualBilling ? 'yearly' : 'monthly'
              const ctaHref = plan.slug === 'free'
                ? '#/onboarding'
                : `#/onboarding?plan=${plan.slug}&billing=${billing}`
              return (
                <div
                  key={plan.slug}
                  className={`landing-pricing-card ${plan.popular ? 'landing-pricing-popular' : ''}`}
                  ref={reveal}
                  data-reveal-delay={i + 1}
                >
                  {plan.popular && (
                    <div className="landing-pricing-badge">{t('pricing.popular')}</div>
                  )}
                  <div className="landing-pricing-card-name">{plan.name}</div>
                  <div className="landing-pricing-card-price">
                    <span className="currency">&euro;</span>
                    <span className="amount">{price}</span>
                    {price > 0 && <span className="period">HT{t('pricing.mo')}</span>}
                  </div>
                  {price > 0 && (
                    <div className="text-xs text-neutral-400 -mt-1 mb-1">
                      {t('pricing.ttcPrefix')} {formatPrice(priceTTC(price))}€ {t('pricing.ttcSuffix')}
                    </div>
                  )}
                  <ul className="landing-pricing-features">
                    {plan.features.map((feat, fi) => (
                      <li key={fi}>
                        <Check size={18} />
                        {feat}
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
                        <><Loader2 size={16} className="animate-spin inline mr-2" />{t('pricing.redirecting')}</>
                      ) : (
                        plan.slug === 'free' ? t('pricing.cta.free') : t('pricing.subscribe')
                      )}
                    </button>
                  ) : (
                    <a
                      href={ctaHref}
                      className={`landing-pricing-card-btn ${plan.btnStyle}`}
                    >
                      {plan.slug === 'free' ? t('pricing.cta.free') : t('pricing.subscribe')}
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
                    <th key={p.slug} className={p.popular ? 'popular' : ''}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => {
                  if (row.isSection) {
                    return (
                      <tr key={row.labelKey} className="landing-compare-section-header">
                        <td colSpan={plans.length + 1}>{t(row.labelKey)}</td>
                      </tr>
                    )
                  }
                  return (
                    <tr key={row.labelKey}>
                      <td className="landing-compare-label">{t(row.labelKey)}</td>
                      {row.values.map((val, i) => (
                        <td key={i} className={plans[i]?.popular ? 'popular' : ''}>
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
                      <span className="landing-addon-option-name">{lang === 'en' ? opt.nameEn : opt.name}</span>
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
          <p className="landing-cta-microcopy">{t('hero.microcopy')}</p>
        </div>
      </section>
    </LandingLayout>
  )
}
