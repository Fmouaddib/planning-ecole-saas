import { useEffect } from 'react'
import { Monitor, Video, Users, Calendar, Check, LayoutDashboard, Bell } from 'lucide-react'
import { useLang } from '@/hooks/useLang'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { updatePageMeta } from '@/utils/seo'
import LandingLayout from '@/components/landing/LandingLayout'

const featureBlocks = [
  {
    icon: Monitor,
    color: 'teal',
    titleKey: 'onlineSchoolPage.virtual.title',
    descKey: 'onlineSchoolPage.virtual.desc',
    bullets: ['onlineSchoolPage.virtual.b1', 'onlineSchoolPage.virtual.b2', 'onlineSchoolPage.virtual.b3', 'onlineSchoolPage.virtual.b4'],
    mockup: 'virtual',
  },
  {
    icon: Video,
    color: 'blue',
    titleKey: 'onlineSchoolPage.integration.title',
    descKey: 'onlineSchoolPage.integration.desc',
    bullets: ['onlineSchoolPage.integration.b1', 'onlineSchoolPage.integration.b2', 'onlineSchoolPage.integration.b3', 'onlineSchoolPage.integration.b4'],
    mockup: 'integration',
  },
  {
    icon: Users,
    color: 'amber',
    titleKey: 'onlineSchoolPage.students.title',
    descKey: 'onlineSchoolPage.students.desc',
    bullets: ['onlineSchoolPage.students.b1', 'onlineSchoolPage.students.b2', 'onlineSchoolPage.students.b3', 'onlineSchoolPage.students.b4'],
    mockup: 'students',
  },
  {
    icon: Calendar,
    color: 'coral',
    titleKey: 'onlineSchoolPage.planning.title',
    descKey: 'onlineSchoolPage.planning.desc',
    bullets: ['onlineSchoolPage.planning.b1', 'onlineSchoolPage.planning.b2', 'onlineSchoolPage.planning.b3', 'onlineSchoolPage.planning.b4'],
    mockup: 'planning',
  },
  {
    icon: LayoutDashboard,
    color: 'indigo',
    titleKey: 'onlineSchoolPage.portal.title',
    descKey: 'onlineSchoolPage.portal.desc',
    bullets: ['onlineSchoolPage.portal.b1', 'onlineSchoolPage.portal.b2', 'onlineSchoolPage.portal.b3', 'onlineSchoolPage.portal.b4'],
    mockup: 'portal',
  },
  {
    icon: Bell,
    color: 'violet',
    titleKey: 'onlineSchoolPage.pwa.title',
    descKey: 'onlineSchoolPage.pwa.desc',
    bullets: ['onlineSchoolPage.pwa.b1', 'onlineSchoolPage.pwa.b2', 'onlineSchoolPage.pwa.b3', 'onlineSchoolPage.pwa.b4'],
    mockup: 'pwa',
  },
]

function FeatureMockup({ type }: { type: string }) {
  switch (type) {
    case 'virtual':
      return (
        <div className="landing-detail-mockup-icon-box">
          <Monitor size={48} style={{ color: 'rgba(255,255,255,0.6)' }} />
          <div className="landing-detail-mockup-lines">
            <div className="line" style={{ width: '75%' }} />
            <div className="line" style={{ width: '50%' }} />
          </div>
        </div>
      )
    case 'integration':
      return (
        <div className="landing-detail-mockup-icon-box">
          <Video size={48} style={{ color: 'rgba(255,255,255,0.6)' }} />
          <div className="landing-detail-mockup-lines">
            <div className="line" style={{ width: '70%' }} />
            <div className="line" style={{ width: '50%' }} />
          </div>
        </div>
      )
    case 'students':
      return (
        <div className="landing-detail-mockup-icon-box">
          <Users size={48} style={{ color: 'rgba(255,255,255,0.6)' }} />
          <div className="landing-detail-mockup-lines">
            <div className="line" style={{ width: '65%' }} />
            <div className="line" style={{ width: '45%' }} />
          </div>
        </div>
      )
    case 'planning':
      return (
        <div className="landing-detail-mockup-grid">
          {['', 'filled-coral', '', 'filled-blue', '', 'filled-blue', '', 'filled-teal', '', '', '', 'filled-coral', '', 'filled-teal', '', 'filled-amber', '', '', 'filled-blue', ''].map((cls, i) => (
            <div key={i} className={`landing-mockup-slot ${cls}`} />
          ))}
        </div>
      )
    case 'portal':
      return (
        <div className="landing-detail-mockup-icon-box">
          <LayoutDashboard size={48} style={{ color: 'rgba(255,255,255,0.6)' }} />
          <div className="landing-detail-mockup-lines">
            <div className="line" style={{ width: '70%' }} />
            <div className="line" style={{ width: '55%' }} />
          </div>
        </div>
      )
    case 'pwa':
      return (
        <div className="landing-detail-mockup-phone">
          <div className="phone-screen">
            <div className="phone-header" />
            <div className="phone-rows">
              <div className="phone-row filled-coral" />
              <div className="phone-row filled-blue" />
              <div className="phone-row filled-teal" />
              <div className="phone-row filled-amber" />
            </div>
          </div>
        </div>
      )
    default:
      return null
  }
}

export default function OnlineSchoolPage() {
  const { t } = useLang()
  const { reveal } = useScrollReveal()

  useEffect(() => {
    window.scrollTo(0, 0)
    updatePageMeta({
      title: 'Ecole en ligne',
      description: 'Creez votre ecole en ligne avec Anti-Planning : classes virtuelles, visioconference, suivi pedagogique a distance.',
      path: '/ecole-en-ligne',
      keywords: 'ecole en ligne, classes virtuelles, visioconference formation, suivi pedagogique distance, formation a distance, e-learning planning',
    })
  }, [])

  return (
    <LandingLayout isDetailPage>
      {/* Hero */}
      <section className="landing-detail-hero">
        <div className="landing-detail-hero-inner">
          <span className="landing-section-label">{t('onlineSchoolPage.hero.label')}</span>
          <h1>{t('onlineSchoolPage.hero.title')}</h1>
          <p>{t('onlineSchoolPage.hero.subtitle')}</p>
        </div>
      </section>

      {/* Feature blocks */}
      <section className="landing-detail-content">
        <div className="landing-detail-content-inner">
          {featureBlocks.map((block, i) => (
            <div
              key={block.titleKey}
              className={`landing-detail-block ${i % 2 !== 0 ? 'reversed' : ''}`}
              ref={reveal}
            >
              <div className="landing-detail-block-text">
                <div className={`landing-feature-icon ${block.color}`}>
                  <block.icon size={24} />
                </div>
                <h2>{t(block.titleKey)}</h2>
                <p>{t(block.descKey)}</p>
                <ul className="landing-showcase-bullets">
                  {block.bullets.map(k => (
                    <li key={k}><Check size={18} /> {t(k)}</li>
                  ))}
                </ul>
              </div>
              <div className="landing-detail-block-visual">
                <FeatureMockup type={block.mockup} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="landing-cta-inner" ref={reveal}>
          <h2>{t('onlineSchoolPage.cta.title')}</h2>
          <p>{t('onlineSchoolPage.cta.subtitle')}</p>
          <a href="#/onboarding" className="landing-btn-coral landing-btn-coral-lg">
            {t('cta.button')}
          </a>
          <p className="landing-cta-microcopy">{t('hero.microcopy')}</p>
        </div>
      </section>
    </LandingLayout>
  )
}
