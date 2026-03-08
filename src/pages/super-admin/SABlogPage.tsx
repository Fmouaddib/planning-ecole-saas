/**
 * Super Admin — Blog Engine
 * Génération automatique d'articles SEO avec IA
 */
import { useState, useEffect, useCallback } from 'react'
import { SABlogService, type BlogSettings, type BlogPost, type BlogTopic, type BlogLog, type TopicSuggestion, type SeoAudit } from '@/services/super-admin/blog'
import { MarkdownWithMermaid } from '@/components/ui/MermaidRenderer'
import toast from 'react-hot-toast'

// ── Helpers ──────────────────────────────────────────────────────
const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Brouillon', cls: 'sa-badge-warning' },
  review: { label: 'À relire', cls: 'sa-badge-info' },
  published: { label: 'Publié', cls: 'sa-badge-success' },
  archived: { label: 'Archivé', cls: 'sa-badge' },
  pending: { label: 'En attente', cls: 'sa-badge-warning' },
  generating: { label: 'Génération...', cls: 'sa-badge-info' },
  generated: { label: 'Généré', cls: 'sa-badge-success' },
  failed: { label: 'Échec', cls: 'sa-badge-error' },
  skipped: { label: 'Ignoré', cls: 'sa-badge' },
}

const CATEGORY_LABELS: Record<string, string> = {
  'gestion-centre': 'Gestion de centre',
  'planning-pedagogique': 'Planning pédagogique',
  'digitalisation': 'Digitalisation',
  'reglementation-formation': 'Réglementation',
  'conseils-pratiques': 'Conseils pratiques',
  'ia-education': 'IA & Éducation',
  'temoignages': 'Témoignages',
  'productivite': 'Productivité',
}

function SeoBar({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--sa-border-medium)', maxWidth: 80, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', borderRadius: 999, background: color, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{score}</span>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────
export function SABlogPage() {
  const [tab, setTab] = useState<'dashboard' | 'posts' | 'topics' | 'logs'>('dashboard')
  const [settings, setSettings] = useState<BlogSettings | null>(null)
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [topics, setTopics] = useState<BlogTopic[]>([])
  const [logs, setLogs] = useState<BlogLog[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [s, p, t, l, st] = await Promise.all([
        SABlogService.getSettings(),
        SABlogService.getPosts(),
        SABlogService.getTopics(),
        SABlogService.getLogs(50),
        SABlogService.getStats(),
      ])
      setSettings(s); setPosts(p); setTopics(t); setLogs(l); setStats(st)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: '📊' },
    { id: 'posts' as const, label: `Articles (${posts.length})`, icon: '📝' },
    { id: 'topics' as const, label: `Sujets (${topics.filter(t => t.status === 'pending').length})`, icon: '💡' },
    { id: 'logs' as const, label: 'Logs', icon: '📋' },
  ]

  if (loading && !settings) {
    return (
      <div className="sa-empty-state">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e74c3c]" />
      </div>
    )
  }

  const noApiKey = !settings?.gemini_api_key && !settings?.groq_api_key && !settings?.anthropic_api_key

  return (
    <div className="p-6">
      <div className="sa-page-header">
        <div>
          <h1 className="sa-page-title">Blog Engine — SEO Automatisé</h1>
          <p className="sa-page-subtitle">Génération automatique d'articles optimisés SEO via IA</p>
        </div>
        <button className="sa-btn sa-btn-secondary" onClick={refresh} disabled={loading}>
          {loading ? '⏳' : '🔄'} Actualiser
        </button>
      </div>

      {/* API Key warning */}
      {noApiKey && (
        <div className="sa-card" style={{ borderLeft: '4px solid #f59e0b', marginBottom: 20 }}>
          <p className="sa-text-sm" style={{ color: '#f59e0b' }}>
            ⚠️ <strong>Aucune clé API configurée.</strong> Allez dans <strong>Paramètres plateforme</strong> (menu Monitoring → ⚙️ Paramètres) pour configurer vos clés API. <strong>Gemini est gratuit</strong> — obtenez une clé sur <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>aistudio.google.com</a>
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="sa-tabs" style={{ marginBottom: 24 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`sa-tab ${tab === t.id ? 'active' : ''}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && stats && <DashboardTab stats={stats} settings={settings!} posts={posts} onRefresh={refresh} />}
      {tab === 'posts' && <PostsTab posts={posts} onRefresh={refresh} />}
      {tab === 'topics' && <TopicsTab topics={topics} settings={settings!} onRefresh={refresh} />}
      {tab === 'logs' && <LogsTab logs={logs} />}
    </div>
  )
}

// ── Dashboard Tab ────────────────────────────────────────────────
function DashboardTab({ stats, settings, posts, onRefresh }: { stats: any; settings: BlogSettings; posts: BlogPost[]; onRefresh: () => void }) {
  const [batchLoading, setBatchLoading] = useState(false)
  const noApiKey = !settings?.gemini_api_key && !settings?.groq_api_key && !settings?.anthropic_api_key

  const handleBatchGenerate = async () => {
    setBatchLoading(true)
    try {
      const result = await SABlogService.batchGenerate()
      toast.success(`${result.generated} article(s) généré(s)`)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setBatchLoading(false)
    }
  }

  const recentPosts = posts.slice(0, 5)

  const kpis = [
    { label: 'Articles', value: stats.totalPosts, icon: '📝' },
    { label: 'Publiés', value: stats.published, icon: '✅' },
    { label: 'À relire', value: stats.reviews, icon: '👀' },
    { label: 'Brouillons', value: stats.drafts, icon: '📋' },
    { label: 'Sujets en attente', value: stats.pendingTopics, icon: '💡' },
    { label: 'Score SEO moyen', value: stats.avgSeoScore, icon: '🎯' },
    { label: 'Coût total', value: `$${stats.totalCost.toFixed(3)}`, icon: '💰' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPIs */}
      <div className="sa-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="sa-kpi-card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{kpi.icon}</div>
            <div className="sa-kpi-value" style={{ fontSize: '1.4rem' }}>{kpi.value}</div>
            <div className="sa-kpi-label" style={{ fontSize: '0.7rem', marginBottom: 0 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Actions rapides */}
      <div className="sa-card">
        <div className="sa-card-title">⚡ Actions rapides</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12, alignItems: 'center' }}>
          <button
            className="sa-btn sa-btn-primary"
            onClick={handleBatchGenerate}
            disabled={batchLoading || noApiKey || stats.pendingTopics === 0}
            title={noApiKey ? 'Configurez au moins une clé API dans Paramètres' : stats.pendingTopics === 0 ? 'Ajoutez des sujets dans l\'onglet Sujets d\'abord' : ''}
          >
            {batchLoading ? '⏳ Génération...' : `🚀 Générer ${settings.posts_per_batch} article(s)`}
          </button>
          <span style={{ fontSize: 12, color: 'var(--sa-text-tertiary)' }}>
            Modèle : {settings.model} · {stats.pendingTopics} sujet(s) en file d'attente
          </span>
        </div>
        {noApiKey && (
          <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 8 }}>
            ⚠ Aucune clé API configurée — allez dans <strong>Paramètres &gt; Blog SEO</strong> pour ajouter une clé.
          </p>
        )}
        {!noApiKey && stats.pendingTopics === 0 && (
          <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 8 }}>
            ⚠ Aucun sujet en attente — allez dans l'onglet <strong>Sujets</strong> pour en créer ou en suggérer via l'IA.
          </p>
        )}
        {settings.last_generation_at && (
          <p style={{ fontSize: 12, color: 'var(--sa-text-tertiary)', marginTop: 8 }}>
            Dernière génération : {new Date(settings.last_generation_at).toLocaleString('fr-FR')}
          </p>
        )}
      </div>

      {/* Derniers articles */}
      {recentPosts.length > 0 && (
        <div className="sa-table-container">
          <div className="sa-table-header">
            <span className="sa-table-title">📝 Derniers articles</span>
          </div>
          <table className="sa-table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>SEO</th>
                <th>Mots</th>
                <th>Coût</th>
              </tr>
            </thead>
            <tbody>
              {recentPosts.map(p => (
                <tr key={p.id}>
                  <td style={{ maxWidth: 300 }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--sa-text-tertiary)' }}>/{p.slug}</div>
                  </td>
                  <td><span className="sa-badge">{CATEGORY_LABELS[p.category] || p.category}</span></td>
                  <td><span className={STATUS_BADGES[p.status]?.cls || 'sa-badge'}>{STATUS_BADGES[p.status]?.label || p.status}</span></td>
                  <td><SeoBar score={p.seo_score} /></td>
                  <td style={{ fontSize: 13 }}>{p.word_count}</td>
                  <td style={{ fontSize: 13 }}>${p.generation_cost_estimate?.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Posts Tab ─────────────────────────────────────────────────────
function PostsTab({ posts, onRefresh }: { posts: BlogPost[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState('')
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editMeta, setEditMeta] = useState('')
  const [saving, setSaving] = useState(false)
  const [auditResult, setAuditResult] = useState<SeoAudit | null>(null)
  const [auditing, setAuditing] = useState(false)
  const [improving, setImproving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showLinkPanel, setShowLinkPanel] = useState(false)
  const [linkSearch, setLinkSearch] = useState('')
  const [fetchingImage, setFetchingImage] = useState(false)
  const textareaRef = { current: null as HTMLTextAreaElement | null }

  // Published posts for internal linking (exclude current)
  const publishedPosts = posts.filter(p => p.status === 'published' && p.id !== selectedPost?.id)
  const filteredLinks = linkSearch
    ? publishedPosts.filter(p => p.title.toLowerCase().includes(linkSearch.toLowerCase()) || p.keywords?.some(k => k.toLowerCase().includes(linkSearch.toLowerCase())))
    : publishedPosts

  const insertInternalLink = (post: BlogPost) => {
    const link = `[${post.title}](#/blog/${post.slug})`
    const ta = textareaRef.current
    if (ta) {
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const before = editContent.slice(0, start)
      const after = editContent.slice(end)
      setEditContent(before + link + after)
      // Restore cursor position after the inserted link
      setTimeout(() => {
        ta.focus()
        ta.selectionStart = ta.selectionEnd = start + link.length
      }, 10)
    } else {
      setEditContent(editContent + '\n' + link)
    }
    setShowLinkPanel(false)
    setLinkSearch('')
  }

  const filtered = filter
    ? posts.filter(p => p.status === filter)
    : posts

  const openPost = (post: BlogPost) => {
    setSelectedPost(post)
    setEditTitle(post.title)
    setEditContent(post.content)
    setEditMeta(post.meta_description || '')
    setAuditResult(null)
  }

  const handleSave = async (newStatus?: string) => {
    if (!selectedPost) return
    setSaving(true)
    try {
      const patch: Partial<BlogPost> = {
        title: editTitle,
        content: editContent,
        meta_description: editMeta,
      }
      if (newStatus) patch.status = newStatus as BlogPost['status']
      await SABlogService.updatePost(selectedPost.id, patch)
      const msg = newStatus === 'published' ? 'Article publié !' : selectedPost.status === 'published' ? 'Article publié mis à jour !' : 'Article sauvegardé'
      toast.success(msg)
      setSelectedPost(null)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet article ?')) return
    try {
      await SABlogService.deletePost(id)
      toast.success('Article supprimé')
      setSelectedPost(null)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleAudit = async () => {
    if (!selectedPost) return
    setAuditing(true)
    try {
      const audit = await SABlogService.analyzeSeo(selectedPost.id)
      setAuditResult(audit)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAuditing(false)
    }
  }

  const handleImprove = async () => {
    if (!selectedPost || !auditResult) return
    setImproving(true)
    try {
      const improved = await SABlogService.improveArticle(selectedPost.id, auditResult)
      // Update local state with improved article
      const merged = { ...selectedPost, ...improved }
      setSelectedPost(merged)
      setEditTitle(merged.title)
      setEditContent(merged.content)
      setEditMeta(merged.meta_description || '')
      setAuditResult(null)
      toast.success(`Article amélioré ! Score SEO : ${merged.seo_score}`)
      onRefresh()
    } catch (err: any) {
      // If edge function fails, try to save locally-audited changes
      console.error('Improve error:', err)
      toast.error(err.message || 'Erreur lors de l\'amélioration')
    } finally {
      setImproving(false)
    }
  }

  const handleFetchImage = async () => {
    if (!selectedPost) return
    setFetchingImage(true)
    try {
      const settings = await SABlogService.getSettings()
      if (!settings.unsplash_api_key) {
        toast.error('Clé API Unsplash non configurée — allez dans Paramètres > Blog IA')
        return
      }
      const query = (selectedPost.keywords || []).slice(0, 2).join(' ') + ' ' + (selectedPost.category || 'education')
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${settings.unsplash_api_key}` } }
      )
      if (!res.ok) throw new Error('Erreur Unsplash')
      const data = await res.json()
      const photos = data.results || []
      if (photos.length === 0) {
        toast.error('Aucune image trouvée pour ces mots-clés')
        return
      }
      // Use the first result
      const imageUrl = photos[0].urls?.regular || photos[0].urls?.small
      if (imageUrl) {
        await SABlogService.updatePost(selectedPost.id, { featured_image_url: imageUrl } as any)
        setSelectedPost({ ...selectedPost, featured_image_url: imageUrl } as any)
        toast.success('Image de couverture mise à jour')
        onRefresh()
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la récupération d\'image')
    } finally {
      setFetchingImage(false)
    }
  }

  if (selectedPost) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <button className="sa-btn sa-btn-secondary" onClick={() => setSelectedPost(null)}>← Retour</button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {selectedPost.status === 'published' && (
              <a
                href={`#/blog/${selectedPost.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="sa-btn sa-btn-secondary"
                style={{ textDecoration: 'none' }}
              >
                🌐 Voir en ligne
              </a>
            )}
            <button className="sa-btn sa-btn-secondary" onClick={handleFetchImage} disabled={fetchingImage}>
              {fetchingImage ? '⏳' : '🖼️'} Image
            </button>
            <button className="sa-btn sa-btn-secondary" onClick={() => { setShowLinkPanel(!showLinkPanel); setLinkSearch('') }}>
              🔗 Lien interne
            </button>
            <button className="sa-btn sa-btn-secondary" onClick={handleAudit} disabled={auditing}>
              {auditing ? '⏳' : '🎯'} Audit SEO
            </button>
            <button className="sa-btn sa-btn-secondary" onClick={() => handleSave()} disabled={saving}>💾 Sauvegarder</button>
            {selectedPost.status !== 'published' && (
              <button className="sa-btn sa-btn-success" onClick={() => handleSave('published')} disabled={saving}>✅ Publier</button>
            )}
            <button className="sa-btn sa-btn-danger" onClick={() => handleDelete(selectedPost.id)}>🗑️ Supprimer</button>
          </div>
        </div>

        {/* Featured image preview */}
        {(selectedPost as any)?.featured_image_url && (
          <div style={{ borderRadius: 12, overflow: 'hidden', maxHeight: 200 }}>
            <img
              src={(selectedPost as any).featured_image_url}
              alt={selectedPost.title}
              style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12 }}
            />
          </div>
        )}

        {/* SEO Audit result */}
        {auditResult && (
          <div className="sa-card" style={{ borderLeft: `4px solid ${auditResult.score >= 70 ? '#22c55e' : '#f59e0b'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: auditResult.score >= 70 ? '#22c55e' : '#f59e0b' }}>{auditResult.score}/100</span>
                <span style={{ fontSize: 14, color: 'var(--sa-text-secondary)' }}>Score SEO IA</span>
              </div>
              {(auditResult.issues.length > 0 || auditResult.recommendations.length > 0) && (
                <button
                  className="sa-btn sa-btn-primary"
                  onClick={handleImprove}
                  disabled={improving}
                  style={{ fontSize: 13 }}
                >
                  {improving ? '⏳ Amélioration IA en cours...' : '✨ Appliquer les améliorations (IA)'}
                </button>
              )}
            </div>
            {auditResult.issues.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--sa-text-secondary)', marginBottom: 4 }}>Problèmes ({auditResult.issues.length}) :</p>
                {auditResult.issues.map((issue, i) => (
                  <div key={i} style={{ fontSize: 12, marginBottom: 4, color: 'var(--sa-text-primary)' }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6, background: issue.severity === 'critical' ? '#ef4444' : issue.severity === 'warning' ? '#f59e0b' : '#3b82f6' }} />
                    {issue.message} → <em style={{ color: 'var(--sa-text-tertiary)' }}>{issue.fix}</em>
                  </div>
                ))}
              </div>
            )}
            {auditResult.recommendations.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--sa-text-secondary)', marginBottom: 4 }}>Recommandations ({auditResult.recommendations.length}) :</p>
                {auditResult.recommendations.map((r, i) => (
                  <p key={i} style={{ fontSize: 12, color: '#3b82f6', marginBottom: 2 }}>💡 {r}</p>
                ))}
              </div>
            )}
            {auditResult.strengths.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--sa-text-secondary)', marginBottom: 4 }}>Points forts :</p>
                {auditResult.strengths.map((s, i) => <p key={i} style={{ fontSize: 12, color: '#22c55e' }}>✓ {s}</p>)}
              </div>
            )}
          </div>
        )}

        {/* Internal link panel */}
        {showLinkPanel && (
          <div className="sa-card" style={{ borderLeft: '4px solid #3b82f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="sa-card-title">🔗 Insérer un lien vers un article publié</div>
              <button className="sa-btn sa-btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setShowLinkPanel(false)}>✕ Fermer</button>
            </div>
            <input
              className="sa-form-input"
              placeholder="Rechercher un article par titre ou mot-clé..."
              value={linkSearch}
              onChange={e => setLinkSearch(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            {publishedPosts.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--sa-text-tertiary)' }}>Aucun article publié disponible pour le maillage interne.</p>
            ) : (
              <div style={{ maxHeight: 250, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredLinks.slice(0, 15).map(p => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'var(--sa-bg-subtle)',
                      cursor: 'pointer',
                    }}
                    onClick={() => insertInternalLink(p)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--sa-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.title}
                      </p>
                      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: 'var(--sa-text-tertiary)' }}>/{p.slug}</span>
                        <span style={{ fontSize: 10, color: 'var(--sa-text-tertiary)' }}>·</span>
                        <span style={{ fontSize: 10, color: 'var(--sa-text-tertiary)' }}>SEO: {p.seo_score}</span>
                        <span style={{ fontSize: 10, color: 'var(--sa-text-tertiary)' }}>·</span>
                        <span style={{ fontSize: 10, color: 'var(--sa-text-tertiary)' }}>{CATEGORY_LABELS[p.category] || p.category}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, whiteSpace: 'nowrap' }}>+ Insérer</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Editor */}
        <div className="sa-card">
          <div className="sa-form-group">
            <label className="sa-form-label">Titre</label>
            <input className="sa-form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            <span style={{ fontSize: 10, color: 'var(--sa-text-tertiary)' }}>{editTitle.length} chars (optimal: 30-65)</span>
          </div>
          <div className="sa-form-group">
            <label className="sa-form-label">Meta Description</label>
            <input className="sa-form-input" value={editMeta} onChange={e => setEditMeta(e.target.value)} />
            <span style={{ fontSize: 10, color: 'var(--sa-text-tertiary)' }}>{editMeta.length} chars (optimal: 120-160)</span>
          </div>
          <div className="sa-form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="sa-form-label" style={{ marginBottom: 0 }}>Contenu (Markdown)</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className={`sa-btn ${!showPreview ? 'sa-btn-primary' : 'sa-btn-secondary'}`}
                  style={{ fontSize: 11, padding: '4px 12px' }}
                  onClick={() => setShowPreview(false)}
                >
                  Éditer
                </button>
                <button
                  className={`sa-btn ${showPreview ? 'sa-btn-primary' : 'sa-btn-secondary'}`}
                  style={{ fontSize: 11, padding: '4px 12px' }}
                  onClick={() => setShowPreview(true)}
                >
                  Aperçu
                </button>
              </div>
            </div>
            {showPreview ? (
              <div style={{
                minHeight: 500,
                maxHeight: 700,
                overflow: 'auto',
                padding: 24,
                borderRadius: 8,
                border: '1px solid var(--sa-border-medium)',
                background: '#fff',
              }}>
                <MarkdownWithMermaid content={editContent} />
              </div>
            ) : (
              <textarea
                ref={el => { textareaRef.current = el }}
                className="sa-form-textarea"
                rows={25}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--sa-text-tertiary)' }}>
            <span>Mots-clés : {selectedPost.keywords?.join(', ')}</span>
            <span>Modèle : {selectedPost.model_used}</span>
            <span>Coût : ${selectedPost.generation_cost_estimate?.toFixed(4)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'review', 'draft', 'published', 'archived'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`sa-filter-btn ${filter === f ? 'active' : ''}`}
            style={{ fontSize: 13 }}
          >
            {f === '' ? 'Tous' : STATUS_BADGES[f]?.label || f} ({f === '' ? posts.length : posts.filter(p => p.status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="sa-empty-state">
          <div className="sa-empty-icon">📝</div>
          <div className="sa-empty-title">Aucun article</div>
          <div className="sa-empty-text">Générez des sujets puis lancez la génération.</div>
        </div>
      ) : (
        <div className="sa-table-container">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>SEO</th>
                <th>Mots</th>
                <th>Lecture</th>
                <th>Créé le</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} onClick={() => openPost(p)} style={{ cursor: 'pointer' }}>
                  <td style={{ maxWidth: 350 }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                  </td>
                  <td><span className="sa-badge">{CATEGORY_LABELS[p.category] || p.category}</span></td>
                  <td><span className={STATUS_BADGES[p.status]?.cls || 'sa-badge'}>{STATUS_BADGES[p.status]?.label}</span></td>
                  <td><SeoBar score={p.seo_score} /></td>
                  <td style={{ fontSize: 13 }}>{p.word_count}</td>
                  <td style={{ fontSize: 13 }}>{p.reading_time_min} min</td>
                  <td style={{ fontSize: 13 }}>{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>
                    {p.status === 'published' && (
                      <a
                        href={`#/blog/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}
                      >
                        🌐 Voir
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Topics Tab ───────────────────────────────────────────────────
function TopicsTab({ topics, settings, onRefresh }: { topics: BlogTopic[]; settings: BlogSettings; onRefresh: () => void }) {
  const [suggesting, setSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([])
  const [generating, setGenerating] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const noApiKey = !settings?.gemini_api_key && !settings?.groq_api_key && !settings?.anthropic_api_key
  const [manualTopic, setManualTopic] = useState('')
  const [manualKeywords, setManualKeywords] = useState('')
  const [manualCategory, setManualCategory] = useState('conseils-pratiques')

  const handleSuggest = async () => {
    setSuggesting(true)
    try {
      const result = await SABlogService.suggestTopics(10)
      setSuggestions(result)
      toast.success(`${result.length} sujets suggérés par l'IA`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSuggesting(false)
    }
  }

  const handleAcceptSuggestion = async (s: TopicSuggestion) => {
    try {
      await SABlogService.createTopic({
        topic: s.topic,
        description: s.description,
        keywords: s.keywords,
        category: s.category,
        priority: s.priority,
        suggested_by: 'ai',
      })
      setSuggestions(prev => prev.filter(x => x.topic !== s.topic))
      toast.success('Sujet ajouté à la file')
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleAcceptAll = async () => {
    try {
      const count = await SABlogService.bulkCreateTopics(
        suggestions.map(s => ({
          topic: s.topic,
          description: s.description,
          keywords: s.keywords,
          category: s.category,
          priority: s.priority,
          suggested_by: 'ai',
        }))
      )
      setSuggestions([])
      toast.success(`${count} sujets ajoutés`)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleGenerate = async (topicId: string) => {
    setGenerating(topicId)
    try {
      await SABlogService.generateArticle(topicId)
      toast.success('Article généré !')
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setGenerating(null)
    }
  }

  const handleAddManual = async () => {
    if (!manualTopic.trim()) return
    try {
      await SABlogService.createTopic({
        topic: manualTopic,
        keywords: manualKeywords.split(',').map(k => k.trim()).filter(Boolean),
        category: manualCategory,
        priority: 5,
        suggested_by: 'manual',
      })
      setManualTopic(''); setManualKeywords(''); setShowManual(false)
      toast.success('Sujet ajouté')
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await SABlogService.deleteTopic(id)
      toast.success('Supprimé')
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <button className="sa-btn sa-btn-primary" onClick={handleSuggest} disabled={suggesting || noApiKey}>
          {suggesting ? '⏳ Analyse IA en cours...' : '🧠 Suggérer des sujets (IA)'}
        </button>
        <button className="sa-btn sa-btn-secondary" onClick={() => setShowManual(!showManual)}>
          ✏️ Ajouter manuellement
        </button>
      </div>

      {/* Manual add */}
      {showManual && (
        <div className="sa-card">
          <div className="sa-card-title">Ajouter un sujet manuellement</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
            <div className="sa-form-group" style={{ marginBottom: 0 }}>
              <input className="sa-form-input" placeholder="Sujet / Titre" value={manualTopic} onChange={e => setManualTopic(e.target.value)} />
            </div>
            <div className="sa-form-group" style={{ marginBottom: 0 }}>
              <input className="sa-form-input" placeholder="Mots-clés (séparés par virgule)" value={manualKeywords} onChange={e => setManualKeywords(e.target.value)} />
            </div>
            <div className="sa-form-group" style={{ marginBottom: 0 }}>
              <select className="sa-form-select" value={manualCategory} onChange={e => setManualCategory(e.target.value)}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <button className="sa-btn sa-btn-primary" style={{ marginTop: 12 }} onClick={handleAddManual} disabled={!manualTopic.trim()}>
            + Ajouter
          </button>
        </div>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="sa-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="sa-card-title">🧠 Suggestions IA ({suggestions.length})</div>
            <button className="sa-btn sa-btn-primary" onClick={handleAcceptAll}>✅ Tout accepter</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestions.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: 12, borderRadius: 8, background: 'var(--sa-bg-subtle)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--sa-text-primary)' }}>{s.topic}</p>
                  <p style={{ fontSize: 12, color: 'var(--sa-text-secondary)', marginTop: 2 }}>{s.description}</p>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {s.keywords.map((k, ki) => (
                      <span key={ki} className="sa-badge-info" style={{ fontSize: 10, padding: '1px 6px' }}>{k}</span>
                    ))}
                    <span className="sa-badge" style={{ fontSize: 10 }}>{CATEGORY_LABELS[s.category] || s.category}</span>
                    <span style={{ fontSize: 10, color: 'var(--sa-text-tertiary)' }}>Priorité: {s.priority}/10</span>
                  </div>
                </div>
                <button className="sa-btn sa-btn-primary" style={{ fontSize: 12, padding: '4px 12px', whiteSpace: 'nowrap' }} onClick={() => handleAcceptSuggestion(s)}>+ Ajouter</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing topics */}
      <div className="sa-table-container">
        <div className="sa-table-header">
          <span className="sa-table-title">📋 File d'attente ({topics.length})</span>
        </div>
        {topics.length === 0 ? (
          <div className="sa-empty-state" style={{ padding: 40 }}>
            <div className="sa-empty-icon">💡</div>
            <div className="sa-empty-title">Aucun sujet</div>
            <div className="sa-empty-text">Utilisez la suggestion IA pour commencer.</div>
          </div>
        ) : (
          <table className="sa-table">
            <thead>
              <tr>
                <th>Sujet</th>
                <th>Mots-clés</th>
                <th>Catégorie</th>
                <th>Priorité</th>
                <th>Statut</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {topics.map(t => (
                <tr key={t.id}>
                  <td style={{ maxWidth: 250 }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.topic}</div>
                    {t.error_message && <div style={{ fontSize: 10, color: '#ef4444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.error_message}</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(t.keywords || []).slice(0, 3).map((k, i) => (
                        <span key={i} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--sa-bg-subtle)', color: 'var(--sa-text-secondary)' }}>{k}</span>
                      ))}
                    </div>
                  </td>
                  <td><span className="sa-badge" style={{ fontSize: 10 }}>{CATEGORY_LABELS[t.category] || t.category}</span></td>
                  <td style={{ textAlign: 'center', fontSize: 13 }}>{t.priority}</td>
                  <td><span className={STATUS_BADGES[t.status]?.cls || 'sa-badge'}>{STATUS_BADGES[t.status]?.label}</span></td>
                  <td style={{ fontSize: 13 }}>{t.suggested_by === 'ai' ? '🧠 IA' : '✏️ Manuel'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {t.status === 'pending' && (
                        <button
                          className="sa-btn sa-btn-primary"
                          style={{ fontSize: 11, padding: '4px 10px' }}
                          onClick={() => handleGenerate(t.id)}
                          disabled={generating === t.id || noApiKey}
                        >
                          {generating === t.id ? '⏳' : '🚀'} Générer
                        </button>
                      )}
                      {t.status === 'failed' && (
                        <button
                          className="sa-btn sa-btn-secondary"
                          style={{ fontSize: 11, padding: '4px 10px' }}
                          onClick={async () => {
                            await SABlogService.updateTopic(t.id, { status: 'pending', error_message: null })
                            onRefresh()
                          }}
                        >
                          🔄 Retry
                        </button>
                      )}
                      <button
                        className="sa-btn sa-btn-danger"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => handleDelete(t.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Logs Tab ─────────────────────────────────────────────────────
function LogsTab({ logs }: { logs: BlogLog[] }) {
  return (
    <div className="sa-table-container">
      <div className="sa-table-header">
        <span className="sa-table-title">📋 Journal de génération</span>
      </div>
      {logs.length === 0 ? (
        <div className="sa-empty-state" style={{ padding: 40 }}>
          <div className="sa-empty-icon">📋</div>
          <div className="sa-empty-title">Aucun log</div>
          <div className="sa-empty-text">Les logs apparaîtront ici après la première génération.</div>
        </div>
      ) : (
        <table className="sa-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Modèle</th>
              <th>Tokens (in/out)</th>
              <th>Coût</th>
              <th>Durée</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id}>
                <td style={{ fontSize: 13 }}>{new Date(l.created_at).toLocaleString('fr-FR')}</td>
                <td style={{ fontSize: 13, fontWeight: 500 }}>{l.action}</td>
                <td style={{ fontSize: 13 }}>{l.model?.replace('claude-', '').split('-').slice(0, 2).join('-')}</td>
                <td style={{ fontSize: 13 }}>{l.input_tokens} / {l.output_tokens}</td>
                <td style={{ fontSize: 13 }}>${l.cost_estimate?.toFixed(4)}</td>
                <td style={{ fontSize: 13 }}>{(l.duration_ms / 1000).toFixed(1)}s</td>
                <td>
                  <span className={l.status === 'success' ? 'sa-badge-success' : 'sa-badge-error'}>
                    {l.status === 'success' ? '✅' : '❌'} {l.status}
                  </span>
                  {l.error_message && <div style={{ fontSize: 10, color: '#ef4444', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.error_message}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
