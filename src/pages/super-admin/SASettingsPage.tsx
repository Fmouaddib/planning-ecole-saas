import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface AnalyticsSettings {
  provider: string
  tracking_id: string
  enabled: boolean
}

export const SASettingsPage = () => {
  const [analytics, setAnalytics] = useState<AnalyticsSettings>({
    provider: 'google_analytics',
    tracking_id: '',
    enabled: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('key', 'analytics')
        .single()
      if (!error && data) {
        setAnalytics(data.value as AnalyticsSettings)
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

          {/* Code preview */}
          {analytics.tracking_id && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Code de suivi (injecte automatiquement)
              </label>
              <pre style={{
                padding: 12, borderRadius: 8, fontSize: 12, lineHeight: 1.5,
                backgroundColor: 'var(--sa-card-bg)', border: '1px solid var(--sa-border)',
                overflow: 'auto', whiteSpace: 'pre-wrap',
              }}>
{`<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${analytics.tracking_id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${analytics.tracking_id}');
</script>`}
              </pre>
            </div>
          )}

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

      {/* Future: more platform settings */}
      <div className="sa-card" style={{ marginTop: 24, opacity: 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🔧</span>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Autres parametres</h2>
            <p style={{ fontSize: 13, opacity: 0.6, margin: '4px 0 0' }}>
              D'autres options de configuration seront ajoutees ici (SEO, domaine personnalise, maintenance, etc.)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
