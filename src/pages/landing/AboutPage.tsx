import { useEffect, useState } from 'react'
import {
  Sparkles, Shield, Lock, Users, Check,
  GraduationCap, Zap, Globe, Server,
  ShieldCheck, FileCheck, Database, Smartphone,
} from 'lucide-react'
import { useLang } from '@/hooks/useLang'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { updatePageMeta } from '@/utils/seo'
import { supabase } from '@/lib/supabase'
import LandingLayout from '@/components/landing/LandingLayout'

export default function AboutPage() {
  const { t, lang } = useLang()
  const { reveal } = useScrollReveal()
  const [liveStats, setLiveStats] = useState<{ centers: number; sessions: number; users: number } | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    updatePageMeta({
      title: 'A propos',
      description: 'A propos d\'Anti-Planning : notre mission est de simplifier la gestion des centres de formation avec un outil tout-en-un.',
      path: '/about',
      keywords: 'anti-planning, logiciel gestion formation, solution planning ecole, outil centre de formation, mission anti-planning',
    })
    supabase.rpc('get_landing_stats').then(({ data }) => {
      if (data) setLiveStats(data as { centers: number; sessions: number; users: number })
    })
  }, [])

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
    { icon: Smartphone, color: '#06b6d4', titleKey: 'aboutPage.diff.pwa.title', descKey: 'aboutPage.diff.pwa.desc' },
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

      {/* Numbers */}
      <section className="landing-detail-section landing-detail-section-alt">
        <div className="landing-detail-section-inner">
          <div ref={reveal} style={{ textAlign: 'center' }}>
            <h2 className="landing-section-title" style={{ textAlign: 'center' }}>{t('aboutPage.numbers.title')}</h2>
          </div>
          <div className="landing-numbers">
            {[
              { num: liveStats ? String(liveStats.centers) : '–', label: lang === 'fr' ? 'Centres de formation' : 'Training centers' },
              { num: liveStats ? liveStats.sessions.toLocaleString('fr-FR') : '–', label: lang === 'fr' ? 'Séances planifiées' : 'Scheduled sessions' },
              { num: liveStats ? String(liveStats.users) : '–', label: lang === 'fr' ? 'Utilisateurs actifs' : 'Active users' },
              { num: '99.9%', label: lang === 'fr' ? 'Disponibilité' : 'Uptime' },
            ].map((item, i) => (
              <div key={item.label} className="landing-numbers-card" ref={reveal} data-reveal-delay={i + 1}>
                <div className="number">{item.num}</div>
                <div className="label">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="landing-detail-section">
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
          <p className="landing-cta-microcopy">{t('hero.microcopy')}</p>
        </div>
      </section>
    </LandingLayout>
  )
}
