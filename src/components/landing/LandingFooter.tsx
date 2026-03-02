import { Twitter, Linkedin, Github } from 'lucide-react'
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
          <a href="#/ecole-en-ligne">{t('footer.onlineSchool')}</a>
          <a href="#/how-it-works">{t('footer.howItWorks')}</a>
          <a href="#/pricing">{t('footer.pricing')}</a>
        </div>
        <div className="landing-footer-col">
          <h4>{t('footer.resources')}</h4>
          <a href="#/">{t('footer.blog')}</a>
          <a href="#/">{t('footer.docs')}</a>
          <a href="#/">{t('footer.guides')}</a>
        </div>
        <div className="landing-footer-col">
          <h4>{t('footer.support')}</h4>
          <a href="#/">{t('footer.helpCenter')}</a>
          <a href="#/">{t('footer.contact')}</a>
          <a href="#/">{t('footer.status')}</a>
        </div>
        <div className="landing-footer-col">
          <h4>{t('footer.legal')}</h4>
          <a href="#/">{t('footer.terms')}</a>
          <a href="#/">{t('footer.privacy')}</a>
          <a href="#/about">{t('nav.about')}</a>
        </div>
      </div>
      <div className="landing-footer-bottom">
        {t('footer.copyright')}
      </div>
    </footer>
  )
}
