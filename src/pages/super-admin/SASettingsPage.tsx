import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { SABlogService, type BlogSettings } from '@/services/super-admin/blog'
import toast from 'react-hot-toast'

interface AnalyticsSettings {
  provider: string
  tracking_id: string
  custom_code: string
  enabled: boolean
}

const PROVIDER_OPTIONS = [
  { value: 'gemini', label: 'Gemini (GRATUIT)' },
  { value: 'groq', label: 'Groq (GRATUIT)' },
  { value: 'claude', label: 'Claude (payant)' },
]

const MODEL_BY_PROVIDER: Record<string, { value: string; label: string }[]> = {
  gemini: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (le plus puissant)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (rapide + raisonnement)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (rapide, gratuit)' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (ultra leger)' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (stable)' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (economique)' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (gratuit)' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (gratuit)' },
  ],
  claude: [
    { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 (~0.01\u20ac)' },
    { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6 (~0.04\u20ac)' },
  ],
}

const TONE_OPTIONS = [
  { value: 'expert', label: 'Expert' },
  { value: 'professional', label: 'Professionnel' },
  { value: 'friendly', label: 'Amical' },
  { value: 'casual', label: 'Decontracte' },
]

const FREQ_OPTIONS = [
  { value: 'daily', label: 'Quotidien' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'biweekly', label: 'Bi-mensuel' },
  { value: 'monthly', label: 'Mensuel' },
]

type SettingsTab = 'analytics' | 'blog-ia' | 'blog-content'

export const SASettingsPage = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('analytics')
  const [analytics, setAnalytics] = useState<AnalyticsSettings>({
    provider: 'google_analytics',
    tracking_id: '',
    custom_code: '',
    enabled: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [blogSettings, setBlogSettings] = useState<BlogSettings | null>(null)
  const [blogForm, setBlogForm] = useState<Partial<BlogSettings>>({})
  const [savingBlog, setSavingBlog] = useState(false)
  const [savedBlog, setSavedBlog] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const [analyticsRes, blogRes] = await Promise.allSettled([
        supabase.from('platform_settings').select('*').eq('key', 'analytics').single(),
        SABlogService.getSettings(),
      ])
      if (analyticsRes.status === 'fulfilled' && !analyticsRes.value.error && analyticsRes.value.data) {
        setAnalytics(analyticsRes.value.data.value as AnalyticsSettings)
      }
      if (blogRes.status === 'fulfilled') {
        setBlogSettings(blogRes.value)
        setBlogForm(blogRes.value)
      }
    } catch (err) {
      console.error('Error fetching platform settings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleSaveAnalytics = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({ key: 'analytics', value: analytics, updated_at: new Date().toISOString() })
      if (error) throw error
      setSaved(true)
      toast.success('Parametres Analytics sauvegardes')
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Error saving analytics settings:', err)
      toast.error('Erreur sauvegarde Analytics')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBlog = async () => {
    if (savingBlog) return
    setSavingBlog(true)
    setSavedBlog(false)
    try {
      const patch: Partial<BlogSettings> = {
        provider: blogForm.provider ?? 'gemini',
        auto_generate: blogForm.auto_generate ?? false,
        generation_frequency: blogForm.generation_frequency ?? 'weekly',
        posts_per_batch: blogForm.posts_per_batch ?? 2,
        model: blogForm.model ?? 'gemini-2.0-flash',
        tone: blogForm.tone ?? 'professional',
        target_audience: blogForm.target_audience || '',
        site_name: blogForm.site_name || '',
        site_url: blogForm.site_url || '',
        blog_base_url: blogForm.blog_base_url || '',
        cta_text: blogForm.cta_text || '',
        cta_url: blogForm.cta_url || '',
        seed_keywords: blogForm.seed_keywords ?? [],
        categories: blogForm.categories ?? [],
        anthropic_api_key: blogForm.anthropic_api_key || null,
        gemini_api_key: blogForm.gemini_api_key || null,
        groq_api_key: blogForm.groq_api_key || null,
        tavily_api_key: blogForm.tavily_api_key || null,
        research_enabled: blogForm.research_enabled ?? true,
      }
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout \u2014 la requete a pris trop longtemps')), 15000)
      )
      const result = await Promise.race([
        SABlogService.updateSettings(patch),
        timeoutPromise,
      ])
      setBlogForm(result)
      setSavedBlog(true)
      toast.success('Parametres blog sauvegardes')
      setTimeout(() => setSavedBlog(false), 3000)
    } catch (err: any) {
      console.error('Blog save error:', err)
      toast.error(err?.message || 'Erreur sauvegarde blog')
    } finally {
      setSavingBlog(false)
    }
  }

  const currentBlogProvider = blogForm.provider || 'gemini'
  const blogModels = MODEL_BY_PROVIDER[currentBlogProvider] || MODEL_BY_PROVIDER.gemini

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'analytics', label: 'Analytics', icon: '\ud83d\udcc8' },
    { id: 'blog-ia', label: 'Blog IA - Provider', icon: '\ud83e\udd16' },
    { id: 'blog-content', label: 'Blog IA - Contenu', icon: '\u270d\ufe0f' },
  ]

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="sa-page-header">
          <div>
            <h1 className="sa-page-title">Parametres plateforme</h1>
            <p className="sa-page-subtitle">Configuration globale</p>
          </div>
        </div>
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e74c3c]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="sa-page-header">
        <div>
          <h1 className="sa-page-title">Parametres plateforme</h1>
          <p className="sa-page-subtitle">Configuration globale de la plateforme</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="sa-tabs" style={{ marginTop: 20 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`sa-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span style={{ marginRight: 6 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: Analytics */}
      {activeTab === 'analytics' && (
        <div className="sa-card">
          <h2 className="sa-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>\ud83d\udcc8</span> Google Analytics
          </h2>
          <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 20 }}>
            Suivez le trafic et le comportement des utilisateurs sur la plateforme
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
            {/* Enabled toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <div
                onClick={() => setAnalytics(a => ({ ...a, enabled: !a.enabled }))}
                style={{
                  width: 44, height: 24, borderRadius: 12, position: 'relative',
                  backgroundColor: analytics.enabled ? '#22c55e' : '#d1d5db',
                  transition: 'background-color 0.2s', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 9, backgroundColor: 'white',
                  position: 'absolute', top: 3,
                  left: analytics.enabled ? 23 : 3,
                  transition: 'left 0.2s',
                }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {analytics.enabled ? 'Suivi actif' : 'Suivi desactive'}
              </span>
            </label>

            {/* Tracking ID */}
            <div>
              <label className="sa-label">ID de suivi (Measurement ID)</label>
              <input
                type="text"
                value={analytics.tracking_id}
                onChange={e => setAnalytics(a => ({ ...a, tracking_id: e.target.value }))}
                placeholder="G-XXXXXXXXXX"
                className="sa-input"
              />
              <p className="sa-text-sm" style={{ marginTop: 4 }}>
                Trouvable dans Google Analytics &gt; Admin &gt; Data Streams &gt; Measurement ID
              </p>
            </div>

            {/* Custom tracking code */}
            <div>
              <label className="sa-label">Code de suivi personnalise</label>
              <textarea
                value={analytics.custom_code || (analytics.tracking_id ? `<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=${analytics.tracking_id}"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', '${analytics.tracking_id}');\n</script>` : '')}
                onChange={e => setAnalytics(a => ({ ...a, custom_code: e.target.value }))}
                placeholder={`<!-- Collez ici votre code de suivi -->`}
                rows={8}
                className="sa-input"
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
              <p className="sa-text-sm" style={{ marginTop: 4 }}>
                Ce code sera injecte dans le {'<head>'} de toutes les pages.
              </p>
            </div>

            {/* Save button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <button onClick={handleSaveAnalytics} disabled={saving} className="sa-btn sa-btn-primary" style={{ opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Enregistrement...' : saved ? 'Enregistre !' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Blog IA - Provider */}
      {activeTab === 'blog-ia' && blogSettings && (
        <div className="sa-card">
          <h2 className="sa-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>\ud83e\udd16</span> Blog SEO \u2014 Provider IA & Cles API
          </h2>
          <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 20 }}>
            Configurez le provider IA et les cles API pour la generation d'articles
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
            {/* Provider selector */}
            <div>
              <label className="sa-label">Provider IA principal</label>
              <p className="sa-text-sm" style={{ marginBottom: 10 }}>
                <strong>Gemini et Groq sont 100% gratuits.</strong> Claude est payant mais premium.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PROVIDER_OPTIONS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => {
                      const firstModel = MODEL_BY_PROVIDER[p.value]?.[0]?.value || ''
                      setBlogForm(f => ({ ...f, provider: p.value, model: firstModel }))
                    }}
                    className={`sa-filter-btn ${currentBlogProvider === p.value ? 'active' : ''}`}
                  >
                    {p.value === 'claude' ? '\ud83d\udfe6' : '\ud83d\udfe2'} {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* API Key for current provider */}
            <div style={{ padding: 16, borderRadius: 10, border: '1px solid var(--sa-border)', background: 'var(--sa-bg-hover)' }}>
              {currentBlogProvider === 'gemini' && (
                <>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#16a34a', marginBottom: 8 }}>Google Gemini \u2014 100% GRATUIT</p>
                  <ol className="sa-text-sm" style={{ margin: '0 0 10px 0', paddingLeft: 20, lineHeight: 2 }}>
                    <li>Allez sur <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>aistudio.google.com/apikey</a></li>
                    <li>Connectez-vous avec votre compte Google</li>
                    <li>Cliquez sur <strong>"Create API Key"</strong></li>
                    <li>Copiez la cle generee</li>
                  </ol>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type={showApiKey ? 'text' : 'password'} value={blogForm.gemini_api_key || ''} onChange={e => setBlogForm(f => ({ ...f, gemini_api_key: e.target.value }))} placeholder="AIzaSy..." className="sa-input" style={{ flex: 1, fontFamily: 'monospace' }} />
                    <button onClick={() => setShowApiKey(!showApiKey)} className="sa-btn sa-btn-secondary">{showApiKey ? '\ud83d\ude48' : '\ud83d\udc41\ufe0f'}</button>
                  </div>
                </>
              )}
              {currentBlogProvider === 'groq' && (
                <>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#16a34a', marginBottom: 8 }}>Groq (Llama 3) \u2014 100% GRATUIT</p>
                  <ol className="sa-text-sm" style={{ margin: '0 0 10px 0', paddingLeft: 20, lineHeight: 2 }}>
                    <li>Allez sur <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>console.groq.com/keys</a></li>
                    <li>Creez un compte gratuit</li>
                    <li>Cliquez sur <strong>"Create API Key"</strong></li>
                    <li>Copiez la cle</li>
                  </ol>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type={showApiKey ? 'text' : 'password'} value={blogForm.groq_api_key || ''} onChange={e => setBlogForm(f => ({ ...f, groq_api_key: e.target.value }))} placeholder="gsk_..." className="sa-input" style={{ flex: 1, fontFamily: 'monospace' }} />
                    <button onClick={() => setShowApiKey(!showApiKey)} className="sa-btn sa-btn-secondary">{showApiKey ? '\ud83d\ude48' : '\ud83d\udc41\ufe0f'}</button>
                  </div>
                </>
              )}
              {currentBlogProvider === 'claude' && (
                <>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#2563eb', marginBottom: 8 }}>Claude (Anthropic) \u2014 PAYANT a l'usage</p>
                  <ol className="sa-text-sm" style={{ margin: '0 0 10px 0', paddingLeft: 20, lineHeight: 2 }}>
                    <li>Allez sur <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>console.anthropic.com/settings/keys</a></li>
                    <li>Ajoutez un moyen de paiement</li>
                    <li>Creez une cle API</li>
                    <li>Copiez la cle</li>
                  </ol>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type={showApiKey ? 'text' : 'password'} value={blogForm.anthropic_api_key || ''} onChange={e => setBlogForm(f => ({ ...f, anthropic_api_key: e.target.value }))} placeholder="sk-ant-api03-..." className="sa-input" style={{ flex: 1, fontFamily: 'monospace' }} />
                    <button onClick={() => setShowApiKey(!showApiKey)} className="sa-btn sa-btn-secondary">{showApiKey ? '\ud83d\ude48' : '\ud83d\udc41\ufe0f'}</button>
                  </div>
                </>
              )}
            </div>

            {/* Fallback providers */}
            <details>
              <summary className="sa-text-sm" style={{ cursor: 'pointer', fontWeight: 500 }}>
                Configurer d'autres providers (fallback automatique)
              </summary>
              <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: 'var(--sa-bg-hover)' }}>
                <p className="sa-text-sm" style={{ marginBottom: 10 }}>
                  Si le provider principal echoue : Gemini \u2192 Groq \u2192 Claude
                </p>
                {currentBlogProvider !== 'gemini' && (
                  <div style={{ marginBottom: 10 }}>
                    <label className="sa-label">Gemini \u2014 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>obtenir une cle</a></label>
                    <input type="password" value={blogForm.gemini_api_key || ''} onChange={e => setBlogForm(f => ({ ...f, gemini_api_key: e.target.value }))} placeholder="AIzaSy..." className="sa-input" style={{ fontFamily: 'monospace' }} />
                  </div>
                )}
                {currentBlogProvider !== 'groq' && (
                  <div style={{ marginBottom: 10 }}>
                    <label className="sa-label">Groq \u2014 <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>obtenir une cle</a></label>
                    <input type="password" value={blogForm.groq_api_key || ''} onChange={e => setBlogForm(f => ({ ...f, groq_api_key: e.target.value }))} placeholder="gsk_..." className="sa-input" style={{ fontFamily: 'monospace' }} />
                  </div>
                )}
                {currentBlogProvider !== 'claude' && (
                  <div>
                    <label className="sa-label">Anthropic Claude \u2014 <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>obtenir une cle</a></label>
                    <input type="password" value={blogForm.anthropic_api_key || ''} onChange={e => setBlogForm(f => ({ ...f, anthropic_api_key: e.target.value }))} placeholder="sk-ant-api03-..." className="sa-input" style={{ fontFamily: 'monospace' }} />
                  </div>
                )}
              </div>
            </details>

            {/* Tavily Search */}
            <div style={{ padding: 16, borderRadius: 10, border: '1px solid var(--sa-border)', background: 'var(--sa-bg-hover)' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#f97316', marginBottom: 8 }}>Recherche Web (Tavily) \u2014 GRATUIT 1 000 req/mois</p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12 }}>
                <input type="checkbox" checked={blogForm.research_enabled ?? true} onChange={e => setBlogForm(f => ({ ...f, research_enabled: e.target.checked }))} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>Recherche web activee</span>
              </label>
              <ol className="sa-text-sm" style={{ margin: '0 0 10px 0', paddingLeft: 20, lineHeight: 2 }}>
                <li>Allez sur <a href="https://app.tavily.com/home" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>app.tavily.com</a></li>
                <li>Creez un compte gratuit</li>
                <li>Copiez la cle API depuis le dashboard</li>
              </ol>
              <input type="password" value={blogForm.tavily_api_key || ''} onChange={e => setBlogForm(f => ({ ...f, tavily_api_key: e.target.value }))} placeholder="tvly-..." className="sa-input" style={{ fontFamily: 'monospace' }} />
            </div>

            {/* Model & Generation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="sa-label">Modele IA</label>
                <select value={blogForm.model || ''} onChange={e => setBlogForm(f => ({ ...f, model: e.target.value }))} className="sa-input">
                  {blogModels.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="sa-label">Frequence (auto)</label>
                <select value={blogForm.generation_frequency || ''} onChange={e => setBlogForm(f => ({ ...f, generation_frequency: e.target.value }))} className="sa-input">
                  {FREQ_OPTIONS.map(fr => <option key={fr.value} value={fr.value}>{fr.label}</option>)}
                </select>
              </div>
            </div>

            {/* Auto generate toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <div
                onClick={() => setBlogForm(f => ({ ...f, auto_generate: !f.auto_generate }))}
                style={{
                  width: 44, height: 24, borderRadius: 12, position: 'relative',
                  backgroundColor: blogForm.auto_generate ? '#22c55e' : '#d1d5db',
                  transition: 'background-color 0.2s', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 9, backgroundColor: 'white',
                  position: 'absolute', top: 3,
                  left: blogForm.auto_generate ? 23 : 3,
                  transition: 'left 0.2s',
                }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {blogForm.auto_generate ? 'Generation automatique activee' : 'Generation automatique desactivee'}
              </span>
            </label>

            {/* Save */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <button onClick={handleSaveBlog} disabled={savingBlog} className="sa-btn sa-btn-primary" style={{ opacity: savingBlog ? 0.7 : 1 }}>
                {savingBlog ? 'Enregistrement...' : savedBlog ? 'Enregistre !' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Blog IA - Content */}
      {activeTab === 'blog-content' && blogSettings && (
        <div className="sa-card">
          <h2 className="sa-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>\u270d\ufe0f</span> Blog SEO \u2014 Contenu & SEO
          </h2>
          <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 20 }}>
            Configurez le contenu, le ton et les parametres SEO des articles generes
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
            {/* Ton & batch */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="sa-label">Ton de redaction</label>
                <select value={blogForm.tone || ''} onChange={e => setBlogForm(f => ({ ...f, tone: e.target.value }))} className="sa-input">
                  {TONE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="sa-label">Articles par lot</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={blogForm.posts_per_batch || 2}
                  onChange={e => setBlogForm(f => ({ ...f, posts_per_batch: parseInt(e.target.value) || 2 }))}
                  className="sa-input"
                />
              </div>
            </div>

            {/* Site info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="sa-label">Nom du site</label>
                <input value={blogForm.site_name || ''} onChange={e => setBlogForm(f => ({ ...f, site_name: e.target.value }))} className="sa-input" />
              </div>
              <div>
                <label className="sa-label">URL du site</label>
                <input value={blogForm.site_url || ''} onChange={e => setBlogForm(f => ({ ...f, site_url: e.target.value }))} className="sa-input" />
              </div>
            </div>

            <div>
              <label className="sa-label">Audience cible</label>
              <input value={blogForm.target_audience || ''} onChange={e => setBlogForm(f => ({ ...f, target_audience: e.target.value }))} className="sa-input" />
            </div>

            <div>
              <label className="sa-label">CTA par defaut</label>
              <input value={blogForm.cta_text || ''} onChange={e => setBlogForm(f => ({ ...f, cta_text: e.target.value }))} placeholder="Texte d'appel a l'action" className="sa-input" />
            </div>

            <div>
              <label className="sa-label">URL du CTA</label>
              <input value={blogForm.cta_url || ''} onChange={e => setBlogForm(f => ({ ...f, cta_url: e.target.value }))} placeholder="https://..." className="sa-input" />
            </div>

            <div>
              <label className="sa-label">Mots-cles seed (un par ligne)</label>
              <textarea
                value={(blogForm.seed_keywords || []).join('\n')}
                onChange={e => setBlogForm(f => ({ ...f, seed_keywords: e.target.value.split('\n').map(k => k.trim()).filter(Boolean) }))}
                rows={6}
                className="sa-input"
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Save */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <button onClick={handleSaveBlog} disabled={savingBlog} className="sa-btn sa-btn-primary" style={{ opacity: savingBlog ? 0.7 : 1 }}>
                {savingBlog ? 'Enregistrement...' : savedBlog ? 'Enregistre !' : 'Enregistrer'}
              </button>
            </div>

            {/* Stats summary */}
            {blogSettings.last_generation_at && (
              <p className="sa-text-sm" style={{ marginTop: 4 }}>
                Derniere generation : {new Date(blogSettings.last_generation_at).toLocaleString('fr-FR')} \u00b7 {blogSettings.total_posts_generated} article(s) genere(s) au total
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
