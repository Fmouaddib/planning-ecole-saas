import { Twitter, Linkedin, Github, Shield, Lock, Globe } from 'lucide-react'
import { useLang } from '@/hooks/useLang'

export default function LandingFooter() {
  const { t } = useLang()

  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="landing-footer-brand">
          <a href="#/" className="landing-logo">
            <div className="landing-logo-icon">A</div>
            <span>AntiPlanning</span>
          </a>
          <p className="landing-footer-tagline">{t('footer.tagline')}</p>
          <div className="landing-footer-social">
            <a href="#/" aria-label="Twitter"><Twitter size={18} /></a>
            <a href="#/" aria-label="LinkedIn"><Linkedin size={18} /></a>
            <a href="#/" aria-label="GitHub"><Github size={18} /></a>
          </div>
        </div>
        <div className="landing-footer-col">
          <h4>{t('footer.product')}</h4>
          <a href="#/features">{t('footer.features')}</a>
          <a href="#/features#feat-attendance">{t('footer.attendance')}</a>
          <a href="#/features#feat-grades">{t('footer.grades')}</a>
          <a href="#/ecole-en-ligne">{t('footer.onlineSchool')}</a>
          <a href="#/how-it-works">{t('footer.howItWorks')}</a>
          <a href="#/pricing">{t('footer.pricing')}</a>
        </div>
        <div className="landing-footer-col">
          <h4>{t('footer.resources')}</h4>
          <a href="#/blog">{t('footer.blog')}</a>
          <a href="#/how-it-works">{t('footer.howItWorks')}</a>
          <a href="#/api-docs">API Documentation</a>
          <a href="#/onboarding">Créer mon établissement</a>
        </div>
        <div className="landing-footer-col">
          <h4>{t('footer.support')}</h4>
          <a href="#/contact">{t('footer.contact')}</a>
          <a href="mailto:contact@anti-planning.com">contact@anti-planning.com</a>
        </div>
        <div className="landing-footer-col">
          <h4>{t('footer.legal')}</h4>
          <a href="#/terms">{t('footer.terms')}</a>
          <a href="#/privacy">{t('footer.privacy')}</a>
          <a href="#/about">{t('nav.about')}</a>
        </div>
      </div>
      <div className="landing-footer-trust">
        <div className="landing-footer-trust-item"><Shield size={14} /> {t('footer.trust.rgpd')}</div>
        <div className="landing-footer-trust-item"><Lock size={14} /> {t('footer.trust.ssl')}</div>
        <div className="landing-footer-trust-item"><Globe size={14} /> {t('footer.trust.eu')}</div>
      </div>
      <div className="landing-footer-bottom">
        {t('footer.copyright')}
      </div>
    </footer>
  )
}
