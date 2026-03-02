import { useEffect } from 'react'
import {
  Sparkles, Shield, Lock, Users, Check,
  GraduationCap, Zap, Globe, Server,
  ShieldCheck, FileCheck, Database,
} from 'lucide-react'
import { useLang } from '@/hooks/useLang'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import LandingLayout from '@/components/landing/LandingLayout'

export default function AboutPage() {
  const { t } = useLang()
  const { reveal } = useScrollReveal()

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const values = [
    { icon: Sparkles, color: '#FF5B46', titleKey: 'aboutPage.value.simplicity.title', descKey: 'aboutPage.value.simplicity.desc' },
    { icon: Shield, color: '#3b82f6', titleKey: 'aboutPage.value.reliability.title', descKey: 'aboutPage.value.reliability.desc' },
    { icon: Lock, color: '#14b8a6', titleKey: 'aboutPage.value.security.title', descKey: 'aboutPage.value.security.desc' },
    { icon: Users, color: '#8b5cf6', titleKey: 'aboutPage.value.collaboration.title', descKey: 'aboutPage.value.collaboration.desc' },
  ]

  const differentiators = [
    { icon: GraduationCap, color: '#FF5B46', titleKey: 'aboutPage.diff.education.title', descKey: 'aboutPage.diff.education.desc' },
    { icon: Zap, color: '#3b82f6', titleKey: 'aboutPage.diff.conflicts.title', descKey: 'aboutPage.diff.conflicts.desc' },
    { icon: Check, color: '#14b8a6', titleKey: 'aboutPage.diff.onboarding.title', descKey: 'aboutPage.diff.onboarding.desc' },
    { icon: Globe, color: '#8b5cf6', titleKey: 'aboutPage.diff.bilingual.title', descKey: 'aboutPage.diff.bilingual.desc' },
  ]

  const securityItems = [
    { icon: Server, titleKey: 'aboutPage.security.hosting', descKey: 'aboutPage.security.hosting.desc' },
    { icon: ShieldCheck, titleKey: 'aboutPage.security.encryption', descKey: 'aboutPage.security.encryption.desc' },
    { icon: FileCheck, titleKey: 'aboutPage.security.gdpr', descKey: 'aboutPage.security.gdpr.desc' },
    { icon: Database, titleKey: 'aboutPage.security.backups', descKey: 'aboutPage.security.backups.desc' },
  ]

  return (
    <LandingLayout isDetailPage>
      {/* Hero */}
      <section className="landing-detail-hero">
        <div className="landing-detail-hero-inner">
          <span className="landing-section-label">{t('aboutPage.hero.label')}</span>
          <h1>{t('aboutPage.hero.title')}</h1>
          <p>{t('aboutPage.hero.subtitle')}</p>
        </div>
      </section>

      {/* Mission */}
      <section className="landing-detail-section">
        <div className="landing-detail-section-inner" ref={reveal}>
          <h2 className="landing-section-title" style={{ textAlign: 'center' }}>{t('aboutPage.mission.title')}</h2>
          <p className="landing-about-mission-text">{t('aboutPage.mission.desc')}</p>
        </div>
      </section>

      {/* Values */}
      <section className="landing-detail-section landing-detail-section-alt">
        <div className="landing-detail-section-inner">
          <div ref={reveal} style={{ textAlign: 'center' }}>
            <h2 className="landing-section-title" style={{ textAlign: 'center' }}>{t('aboutPage.values.title')}</h2>
          </div>
          <div className="landing-detail-personas-grid" style={{ marginTop: '3rem' }}>
            {values.map((value, i) => (
              <div key={value.titleKey} className="landing-detail-persona-card" ref={reveal} data-reveal-delay={i + 1}>
                <div className="landing-detail-persona-icon" style={{ background: `${value.color}20`, color: value.color }}>
                  <value.icon size={28} />
                </div>
                <h3>{t(value.titleKey)}</h3>
                <p>{t(value.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="landing-detail-section">
        <div className="landing-detail-section-inner">
          <div ref={reveal} style={{ textAlign: 'center' }}>
            <h2 className="landing-section-title" style={{ textAlign: 'center' }}>{t('aboutPage.differentiators.title')}</h2>
          </div>
          <div className="landing-detail-personas-grid" style={{ marginTop: '3rem' }}>
            {differentiators.map((item, i) => (
              <div key={item.titleKey} className="landing-detail-persona-card" ref={reveal} data-reveal-delay={i + 1}>
                <div className="landing-detail-persona-icon" style={{ background: `${item.color}20`, color: item.color }}>
                  <item.icon size={28} />
                </div>
                <h3>{t(item.titleKey)}</h3>
                <p>{t(item.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & GDPR */}
      <section className="landing-detail-section landing-detail-section-alt">
        <div className="landing-detail-section-inner">
          <div ref={reveal} style={{ textAlign: 'center' }}>
            <h2 className="landing-section-title" style={{ textAlign: 'center' }}>{t('aboutPage.security.title')}</h2>
          </div>
          <div className="landing-detail-security-grid" style={{ marginTop: '3rem' }}>
            {securityItems.map((item, i) => (
              <div key={item.titleKey} className="landing-detail-security-card" ref={reveal} data-reveal-delay={i + 1}>
                <div className="landing-detail-security-icon">
                  <item.icon size={24} />
                </div>
                <div>
                  <h3>{t(item.titleKey)}</h3>
                  <p>{t(item.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="landing-cta-inner" ref={reveal}>
          <h2>{t('aboutPage.cta.title')}</h2>
          <p>{t('aboutPage.cta.subtitle')}</p>
          <a href="#/onboarding" className="landing-btn-coral landing-btn-coral-lg">
            {t('cta.button')}
          </a>
        </div>
      </section>
    </LandingLayout>
  )
}
