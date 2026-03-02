import { useEffect } from 'react'
import {
  UserPlus, Settings, CalendarCheck, Check,
  ShieldCheck, GraduationCap, Users, ClipboardList,
} from 'lucide-react'
import { useLang } from '@/hooks/useLang'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import LandingLayout from '@/components/landing/LandingLayout'

export default function HowItWorksPage() {
  const { t } = useLang()
  const { reveal } = useScrollReveal()

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const steps = [
    {
      num: 1,
      icon: UserPlus,
      titleKey: 'howItWorksPage.step1.title',
      descKey: 'howItWorksPage.step1.desc',
      bullets: ['howItWorksPage.step1.b1', 'howItWorksPage.step1.b2', 'howItWorksPage.step1.b3'],
    },
    {
      num: 2,
      icon: Settings,
      titleKey: 'howItWorksPage.step2.title',
      descKey: 'howItWorksPage.step2.desc',
      bullets: ['howItWorksPage.step2.b1', 'howItWorksPage.step2.b2', 'howItWorksPage.step2.b3', 'howItWorksPage.step2.b4'],
    },
    {
      num: 3,
      icon: CalendarCheck,
      titleKey: 'howItWorksPage.step3.title',
      descKey: 'howItWorksPage.step3.desc',
      bullets: ['howItWorksPage.step3.b1', 'howItWorksPage.step3.b2', 'howItWorksPage.step3.b3', 'howItWorksPage.step3.b4'],
    },
  ]

  const personas = [
    { icon: ShieldCheck, color: '#FF5B46', titleKey: 'howItWorksPage.persona.admin.title', descKey: 'howItWorksPage.persona.admin.desc' },
    { icon: GraduationCap, color: '#3b82f6', titleKey: 'howItWorksPage.persona.teacher.title', descKey: 'howItWorksPage.persona.teacher.desc' },
    { icon: Users, color: '#14b8a6', titleKey: 'howItWorksPage.persona.student.title', descKey: 'howItWorksPage.persona.student.desc' },
    { icon: ClipboardList, color: '#8b5cf6', titleKey: 'howItWorksPage.persona.coordinator.title', descKey: 'howItWorksPage.persona.coordinator.desc' },
  ]

  return (
    <LandingLayout isDetailPage>
      {/* Hero */}
      <section className="landing-detail-hero">
        <div className="landing-detail-hero-inner">
          <span className="landing-section-label">{t('howItWorksPage.hero.label')}</span>
          <h1>{t('howItWorksPage.hero.title')}</h1>
          <p>{t('howItWorksPage.hero.subtitle')}</p>
        </div>
      </section>

      {/* Steps */}
      <section className="landing-detail-content">
        <div className="landing-detail-content-inner">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`landing-detail-block ${i % 2 !== 0 ? 'reversed' : ''}`}
              ref={reveal}
            >
              <div className="landing-detail-block-text">
                <div className="landing-detail-step-header">
                  <div className="landing-how-step-number">{step.num}</div>
                  <div className="landing-how-step-icon">
                    <step.icon size={28} />
                  </div>
                </div>
                <h2>{t(step.titleKey)}</h2>
                <p>{t(step.descKey)}</p>
                <ul className="landing-showcase-bullets">
                  {step.bullets.map(k => (
                    <li key={k}><Check size={18} /> {t(k)}</li>
                  ))}
                </ul>
              </div>
              <div className="landing-detail-block-visual">
                <div className="landing-detail-mockup-icon-box">
                  <step.icon size={56} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  <div className="landing-detail-step-num-big">{step.num}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Personas */}
      <section className="landing-detail-personas">
        <div className="landing-detail-personas-inner">
          <div ref={reveal} style={{ textAlign: 'center' }}>
            <span className="landing-section-label">{t('howItWorksPage.personas.title')}</span>
            <h2 className="landing-section-title" style={{ textAlign: 'center' }}>{t('howItWorksPage.personas.title')}</h2>
            <p className="landing-section-subtitle" style={{ margin: '0 auto 3.5rem' }}>{t('howItWorksPage.personas.subtitle')}</p>
          </div>

          <div className="landing-detail-personas-grid">
            {personas.map((persona, i) => (
              <div key={persona.titleKey} className="landing-detail-persona-card" ref={reveal} data-reveal-delay={i + 1}>
                <div className="landing-detail-persona-icon" style={{ background: `${persona.color}20`, color: persona.color }}>
                  <persona.icon size={28} />
                </div>
                <h3>{t(persona.titleKey)}</h3>
                <p>{t(persona.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="landing-cta-inner" ref={reveal}>
          <h2>{t('howItWorksPage.cta.title')}</h2>
          <p>{t('howItWorksPage.cta.subtitle')}</p>
          <a href="#/onboarding" className="landing-btn-coral landing-btn-coral-lg">
            {t('cta.button')}
          </a>
        </div>
      </section>
    </LandingLayout>
  )
}
