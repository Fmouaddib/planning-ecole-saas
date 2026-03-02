import { useEffect } from 'react'
import {
  Calendar, ShieldCheck, Video, Mail, Check,
  FileBarChart, Building2, GraduationCap, Smartphone,
} from 'lucide-react'
import { useLang } from '@/hooks/useLang'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import LandingLayout from '@/components/landing/LandingLayout'

const featureBlocks = [
  {
    icon: Calendar,
    color: 'coral',
    titleKey: 'featuresPage.calendar.title',
    descKey: 'featuresPage.calendar.desc',
    bullets: ['featuresPage.calendar.b1', 'featuresPage.calendar.b2', 'featuresPage.calendar.b3', 'featuresPage.calendar.b4', 'featuresPage.calendar.b5'],
    mockup: 'calendar',
  },
  {
    icon: ShieldCheck,
    color: 'blue',
    titleKey: 'featuresPage.conflict.title',
    descKey: 'featuresPage.conflict.desc',
    bullets: ['featuresPage.conflict.b1', 'featuresPage.conflict.b2', 'featuresPage.conflict.b3', 'featuresPage.conflict.b4'],
    mockup: 'conflict',
  },
  {
    icon: Video,
    color: 'teal',
    titleKey: 'featuresPage.zoom.title',
    descKey: 'featuresPage.zoom.desc',
    bullets: ['featuresPage.zoom.b1', 'featuresPage.zoom.b2', 'featuresPage.zoom.b3', 'featuresPage.zoom.b4'],
    mockup: 'zoom',
  },
  {
    icon: Mail,
    color: 'amber',
    titleKey: 'featuresPage.email.title',
    descKey: 'featuresPage.email.desc',
    bullets: ['featuresPage.email.b1', 'featuresPage.email.b2', 'featuresPage.email.b3', 'featuresPage.email.b4'],
    mockup: 'email',
  },
  {
    icon: FileBarChart,
    color: 'violet',
    titleKey: 'featuresPage.reports.title',
    descKey: 'featuresPage.reports.desc',
    bullets: ['featuresPage.reports.b1', 'featuresPage.reports.b2', 'featuresPage.reports.b3', 'featuresPage.reports.b4'],
    mockup: 'reports',
  },
  {
    icon: Building2,
    color: 'rose',
    titleKey: 'featuresPage.multiCampus.title',
    descKey: 'featuresPage.multiCampus.desc',
    bullets: ['featuresPage.multiCampus.b1', 'featuresPage.multiCampus.b2', 'featuresPage.multiCampus.b3', 'featuresPage.multiCampus.b4'],
    mockup: 'multi',
  },
  {
    icon: GraduationCap,
    color: 'indigo',
    titleKey: 'featuresPage.academic.title',
    descKey: 'featuresPage.academic.desc',
    bullets: ['featuresPage.academic.b1', 'featuresPage.academic.b2', 'featuresPage.academic.b3', 'featuresPage.academic.b4', 'featuresPage.academic.b5'],
    mockup: 'academic',
  },
  {
    icon: Smartphone,
    color: 'emerald',
    titleKey: 'featuresPage.mobile.title',
    descKey: 'featuresPage.mobile.desc',
    bullets: ['featuresPage.mobile.b1', 'featuresPage.mobile.b2', 'featuresPage.mobile.b3', 'featuresPage.mobile.b4'],
    mockup: 'mobile',
  },
]

function FeatureMockup({ type }: { type: string }) {
  switch (type) {
    case 'calendar':
      return (
        <div className="landing-detail-mockup-grid">
          {['', 'filled-coral', '', 'filled-blue', '', 'filled-blue', '', 'filled-teal', '', '', '', 'filled-coral', '', 'filled-teal', '', 'filled-amber', '', '', 'filled-blue', ''].map((cls, i) => (
            <div key={i} className={`landing-mockup-slot ${cls}`} />
          ))}
        </div>
      )
    case 'conflict':
      return (
        <div className="landing-detail-mockup-rows">
          <div className="landing-detail-mockup-row"><div className="dot" style={{ background: '#3b82f6' }} /><div className="bar" style={{ background: 'rgba(59,130,246,0.3)', width: '65%' }} /></div>
          <div className="landing-detail-mockup-row"><div className="dot" style={{ background: '#14b8a6' }} /><div className="bar" style={{ background: 'rgba(20,184,166,0.3)', width: '50%' }} /></div>
          <div className="landing-detail-mockup-row conflict"><div className="dot" style={{ background: '#FF5B46' }} /><div className="bar" style={{ background: 'rgba(255,91,70,0.3)', width: '55%' }} /><span className="badge">Conflit</span></div>
          <div className="landing-detail-mockup-row"><div className="dot" style={{ background: '#FBA625' }} /><div className="bar" style={{ background: 'rgba(251,166,37,0.3)', width: '45%' }} /></div>
        </div>
      )
    case 'zoom':
      return (
        <div className="landing-detail-mockup-icon-box">
          <Video size={48} style={{ color: 'rgba(255,255,255,0.6)' }} />
          <div className="landing-detail-mockup-lines">
            <div className="line" style={{ width: '70%' }} />
            <div className="line" style={{ width: '50%' }} />
          </div>
        </div>
      )
    case 'email':
      return (
        <div className="landing-detail-mockup-icon-box">
          <Mail size={48} style={{ color: 'rgba(255,255,255,0.6)' }} />
          <div className="landing-detail-mockup-lines">
            <div className="line" style={{ width: '80%' }} />
            <div className="line" style={{ width: '55%' }} />
          </div>
        </div>
      )
    case 'reports':
      return (
        <div className="landing-detail-mockup-bars">
          {[60, 85, 45, 70, 55].map((h, i) => (
            <div key={i} className="landing-detail-mockup-bar" style={{ height: `${h}%`, background: ['#FF5B46', '#3b82f6', '#14b8a6', '#FBA625', '#8b5cf6'][i] }} />
          ))}
        </div>
      )
    case 'multi':
      return (
        <div className="landing-detail-mockup-icon-box">
          <Building2 size={48} style={{ color: 'rgba(255,255,255,0.6)' }} />
          <div className="landing-detail-mockup-lines">
            <div className="line" style={{ width: '65%' }} />
            <div className="line" style={{ width: '45%' }} />
          </div>
        </div>
      )
    case 'academic':
      return (
        <div className="landing-detail-mockup-tree">
          <div className="tree-item"><div className="tree-dot" style={{ background: '#8b5cf6' }} /><div className="tree-line" style={{ width: '70%', background: 'rgba(139,92,246,0.3)' }} /></div>
          <div className="tree-item indent"><div className="tree-dot" style={{ background: '#3b82f6' }} /><div className="tree-line" style={{ width: '55%', background: 'rgba(59,130,246,0.3)' }} /></div>
          <div className="tree-item indent-2"><div className="tree-dot" style={{ background: '#14b8a6' }} /><div className="tree-line" style={{ width: '60%', background: 'rgba(20,184,166,0.3)' }} /></div>
          <div className="tree-item indent-2"><div className="tree-dot" style={{ background: '#FBA625' }} /><div className="tree-line" style={{ width: '45%', background: 'rgba(251,166,37,0.3)' }} /></div>
        </div>
      )
    case 'mobile':
      return (
        <div className="landing-detail-mockup-phone">
          <div className="phone-screen">
            <div className="phone-header" />
            <div className="phone-rows">
              <div className="phone-row filled-coral" />
              <div className="phone-row" />
              <div className="phone-row filled-blue" />
              <div className="phone-row filled-teal" />
            </div>
          </div>
        </div>
      )
    default:
      return null
  }
}

export default function FeaturesPage() {
  const { t } = useLang()
  const { reveal } = useScrollReveal()

  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <LandingLayout isDetailPage>
      {/* Hero */}
      <section className="landing-detail-hero">
        <div className="landing-detail-hero-inner">
          <span className="landing-section-label">{t('featuresPage.hero.label')}</span>
          <h1>{t('featuresPage.hero.title')}</h1>
          <p>{t('featuresPage.hero.subtitle')}</p>
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
          <h2>{t('featuresPage.cta.title')}</h2>
          <p>{t('featuresPage.cta.subtitle')}</p>
          <a href="#/onboarding" className="landing-btn-coral landing-btn-coral-lg">
            {t('cta.button')}
          </a>
        </div>
      </section>
    </LandingLayout>
  )
}
