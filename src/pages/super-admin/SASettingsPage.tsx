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
  { value: 'gemini', label: '🟢 Gemini (GRATUIT)' },
  { value: 'groq', label: '🟢 Groq (GRATUIT)' },
  { value: 'claude', label: '🔵 Claude (payant)' },
]

const MODEL_BY_PROVIDER: Record<string, { value: string; label: string }[]> = {
  gemini: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (le plus puissant)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (rapide + raisonnement)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (rapide, gratuit)' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (ultra léger)' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (stable)' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (économique)' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (gratuit)' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (gratuit)' },
  ],
  claude: [
    { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 (~0.01€)' },
    { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6 (~0.04€)' },
  ],
}

const TONE_OPTIONS = [
  { value: 'expert', label: 'Expert' },
  { value: 'professional', label: 'Professionnel' },
  { value: 'friendly', label: 'Amical' },
  { value: 'casual', label: 'Décontracté' },
]

const FREQ_OPTIONS = [
  { value: 'daily', label: 'Quotidien' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'biweekly', label: 'Bi-mensuel' },
  { value: 'monthly', label: 'Mensuel' },
]

export const SASettingsPage = () => {
  const [analytics, setAnalytics] = useState<AnalyticsSettings>({
    provider: 'google_analytics',
    tracking_id: '',
    custom_code: '',
    enabled: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Blog settings
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

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({ key: 'analytics', value: analytics, updated_at: new Date().toISOString() })
      if (error) throw error
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Error saving analytics settings:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBlog = async () => {
    setSavingBlog(true)
    setSavedBlog(false)
    try {
      await SABlogService.updateSettings({
        provider: blogForm.provider,
        auto_generate: blogForm.auto_generate,
        generation_frequency: blogForm.generation_frequency,
        posts_per_batch: blogForm.posts_per_batch,
        model: blogForm.model,
        tone: blogForm.tone,
        target_audience: blogForm.target_audience,
        site_name: blogForm.site_name,
        site_url: blogForm.site_url,
        blog_base_url: blogForm.blog_base_url,
        cta_text: blogForm.cta_text,
        cta_url: blogForm.cta_url,
        seed_keywords: blogForm.seed_keywords,
        categories: blogForm.categories,
        anthropic_api_key: blogForm.anthropic_api_key,
        gemini_api_key: blogForm.gemini_api_key,
        groq_api_key: blogForm.groq_api_key,
        tavily_api_key: blogForm.tavily_api_key,
        research_enabled: blogForm.research_enabled,
      } as Partial<BlogSettings>)
      setSavedBlog(true)
      toast.success('Paramètres blog sauvegardés')
      setTimeout(() => setSavedBlog(false), 3000)
    } catch (err: any) {
      toast.error(err.message || 'Erreur sauvegarde blog')
    } finally {
      setSavingBlog(false)
    }
  }

  const currentBlogProvider = blogForm.provider || 'gemini'
  const blogModels = MODEL_BY_PROVIDER[currentBlogProvider] || MODEL_BY_PROVIDER.gemini

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

      {/* Google Analytics */}
      <div className="sa-card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 24 }}>📈</span>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Google Analytics</h2>
            <p style={{ fontSize: 13, opacity: 0.6, margin: '4px 0 0' }}>
              Suivez le trafic et le comportement des utilisateurs sur la plateforme
            </p>
          </div>
        </div>

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
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              ID de suivi (Measurement ID)
            </label>
            <input
              type="text"
              value={analytics.tracking_id}
              onChange={e => setAnalytics(a => ({ ...a, tracking_id: e.target.value }))}
              placeholder="G-XXXXXXXXXX"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--sa-border)', backgroundColor: 'var(--sa-bg)',
                color: 'var(--sa-text)', fontSize: 14,
              }}
            />
            <p style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
              Trouvable dans Google Analytics &gt; Admin &gt; Data Streams &gt; Measurement ID
            </p>
          </div>

          {/* Custom tracking code */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Code de suivi personnalise
            </label>
            <textarea
              value={analytics.custom_code || (analytics.tracking_id ? `<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=${analytics.tracking_id}"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', '${analytics.tracking_id}');\n</script>` : '')}
              onChange={e => setAnalytics(a => ({ ...a, custom_code: e.target.value }))}
              placeholder={`<!-- Collez ici votre code de suivi (Google Analytics, Matomo, Plausible, etc.) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>\n<script>\n  ...\n</script>`}
              rows={10}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--sa-border)', backgroundColor: 'var(--sa-bg)',
                color: 'var(--sa-text)', fontSize: 13, fontFamily: 'monospace',
                lineHeight: 1.5, resize: 'vertical',
              }}
            />
            <p style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
              Ce code sera injecte dans le {'<head>'} de toutes les pages. Compatible Google Analytics, Matomo, Plausible, Meta Pixel, etc.
            </p>
          </div>

          {/* Save button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              className="sa-btn sa-btn-primary"
              style={{ opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Enregistrement...' : saved ? 'Enregistre !' : 'Enregistrer'}
            </button>
            {saved && (
              <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 500 }}>
                Parametres sauvegardes
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Blog SEO Settings */}
      {blogSettings && (
        <div className="sa-card" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 24 }}>🤖</span>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Blog SEO (IA)</h2>
              <p style={{ fontSize: 13, opacity: 0.6, margin: '4px 0 0' }}>
                Configuration du moteur de génération automatique d'articles SEO
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
            {/* Provider selector */}
            <div style={{ padding: 16, borderRadius: 8, border: '1px solid #22c55e', background: 'rgba(34, 197, 94, 0.05)' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#22c55e' }}>
                🔑 Provider IA
              </label>
              <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
                Gemini et Groq sont 100% gratuits. Claude est payant.
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {PROVIDER_OPTIONS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => {
                      const firstModel = MODEL_BY_PROVIDER[p.value]?.[0]?.value || ''
                      setBlogForm(f => ({ ...f, provider: p.value, model: firstModel }))
                    }}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      border: currentBlogProvider === p.value ? '2px solid #e74c3c' : '1px solid var(--sa-border)',
                      background: currentBlogProvider === p.value ? 'rgba(231, 76, 60, 0.1)' : 'var(--sa-bg)',
                      color: 'var(--sa-text)',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {/* API Key for selected provider */}
              {currentBlogProvider === 'gemini' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type={showApiKey ? 'text' : 'password'} value={blogForm.gemini_api_key || ''} onChange={e => setBlogForm(f => ({ ...f, gemini_api_key: e.target.value }))} placeholder="AIzaSy..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--sa-border)', backgroundColor: 'var(--sa-bg)', color: 'var(--sa-text)', fontSize: 13, fontFamily: 'monospace' }} />
                  <button onClick={() => setShowApiKey(!showApiKey)} className="sa-btn sa-btn-secondary" style={{ padding: '8px 12px' }}>{showApiKey ? '🙈' : '👁️'}</button>
                </div>
              )}
              {currentBlogProvider === 'groq' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type={showApiKey ? 'text' : 'password'} value={blogForm.groq_api_key || ''} onChange={e => setBlogForm(f => ({ ...f, groq_api_key: e.target.value }))} placeholder="gsk_..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--sa-border)', backgroundColor: 'var(--sa-bg)', color: 'var(--sa-text)', fontSize: 13, fontFamily: 'monospace' }} />
                  <button onClick={() => setShowApiKey(!showApiKey)} className="sa-btn sa-btn-secondary" style={{ padding: '8px 12px' }}>{showApiKey ? '🙈' : '👁️'}</button>
                </div>
              )}
              {currentBlogProvider === 'claude' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type={showApiKey ? 'text' : 'password'} value={blogForm.anthropic_api_key || ''} onChange={e => setBlogForm(f => ({ ...f, anthropic_api_key: e.target.value }))} placeholder="sk-ant-api03-..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--sa-border)', backgroundColor: 'var(--sa-bg)', color: 'var(--sa-text)', fontSize: 13, fontFamily: 'monospace' }} />
                  <button onClick={() => setShowApiKey(!showApiKey)} className="sa-btn sa-btn-secondary" style={{ padding: '8px 12px' }}>{showApiKey ? '🙈' : '👁️'}</button>
                </div>
              )}
              {/* Tavily Search */}
              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>🔍 Tavily (recherche web gratuite — 1 000 req/mois)</label>
                <p style={{ fontSize: 11, opacity: 0.5, marginBottom: 6 }}>
                  Clé gratuite sur <a href="https://app.tavily.com/home" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>app.tavily.com</a> — Inscrivez-vous, copiez votre API Key
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="password" value={blogForm.tavily_api_key || ''} onChange={e => setBlogForm(f => ({ ...f, tavily_api_key: e.target.value }))} placeholder="tvly-..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--sa-border)', backgroundColor: 'var(--sa-bg)', color: 'var(--sa-text)', fontSize: 13, fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>

            {/* Model & Generation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Modèle IA</label>
                <select
                  value={blogForm.model || ''}
                  onChange={e => setBlogForm(f => ({ ...f, model: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--sa-border)', backgroundColor: 'var(--sa-bg)',
                    color: 'var(--sa-text)', fontSize: 14,
                  }}
                >
                  {blogModels.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Ton de rédaction</label>
                <select
                  value={blogForm.tone || ''}
                  onChange={e => setBlogForm(f => ({ ...f, tone: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--sa-border)', backgroundColor: 'var(--sa-bg)',
                    color: 'var(--sa-text)', fontSize: 14,
                  }}
                >
                  {TONE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Fréquence (auto)</label>
                <select
                  value={blogForm.generation_frequency || ''}
                  onChange={e => setBlogForm(f => ({ ...f, generation_frequency: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--sa-border)', backgroundColor: 'var(--sa-bg)',
                    color: 'var(--sa-text)', fontSize: 14,
                  }}
                >
                  {FREQ_OPTIONS.map(fr => <option key={fr.value} value={fr.value}>{fr.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Articles par lot</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={blogForm.posts_per_batch || 2}
                  onChange={e => setBlogForm(f => ({ ...f, posts_per_batch: parseInt(e.target.value) || 2 }))}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--sa-border)', backgroundColor: 'var(--sa-bg)',
                    color: 'var(--sa-text)', fontSize: 14,
                  }}
                />
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
                {blogForm.auto_generate ? 'Génération automatique activée' : 'Génération automatique désactivée'}
              </span>
            </label>

            {/* Site info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Nom du site</label>
                <input
                  value={blogForm.site_name || ''}
                  onChange={e => setBlogForm(f => ({ ...f, site_name: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--sa-border)', backgroundColor: 'var(--sa-bg)',
                    color: 'var(--sa-text)', fontSize: 14,
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>URL du site</label>
                <input
                  value={blogForm.site_url || ''}
                  onChange={e => setBlogForm(f => ({ ...f, site_url: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--sa-border)', backgroundColor: 'var(--sa-bg)',
                    color: 'var(--sa-text)', fontSize: 14,
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Audience cible</label>
              <input
                value={blogForm.target_audience || ''}
                onChange={e => setBlogForm(f => ({ ...f, target_audience: e.target.value }))}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--sa-border)', backgroundColor: 'var(--sa-bg)',
                  color: 'var(--sa-text)', fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>CTA par défaut</label>
              <input
                value={blogForm.cta_text || ''}
                onChange={e => setBlogForm(f => ({ ...f, cta_text: e.target.value }))}
                placeholder="Texte d'appel à l'action"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--sa-border)', backgroundColor: 'var(--sa-bg)',
                  color: 'var(--sa-text)', fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Mots-clés seed (un par ligne)</label>
              <textarea
                value={(blogForm.seed_keywords || []).join('\n')}
                onChange={e => setBlogForm(f => ({ ...f, seed_keywords: e.target.value.split('\n').map(k => k.trim()).filter(Boolean) }))}
                rows={6}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--sa-border)', backgroundColor: 'var(--sa-bg)',
                  color: 'var(--sa-text)', fontSize: 13, lineHeight: 1.5, resize: 'vertical',
                }}
              />
            </div>

            {/* Save blog button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <button
                onClick={handleSaveBlog}
                disabled={savingBlog}
                className="sa-btn sa-btn-primary"
                style={{ opacity: savingBlog ? 0.7 : 1 }}
              >
                {savingBlog ? 'Enregistrement...' : savedBlog ? 'Enregistré !' : '💾 Enregistrer les paramètres blog'}
              </button>
              {savedBlog && (
                <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 500 }}>
                  Paramètres blog sauvegardés
                </span>
              )}
            </div>

            {/* Stats summary */}
            {blogSettings.last_generation_at && (
              <p style={{ fontSize: 12, opacity: 0.5 }}>
                Dernière génération : {new Date(blogSettings.last_generation_at).toLocaleString('fr-FR')} · {blogSettings.total_posts_generated} article(s) généré(s) au total
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
