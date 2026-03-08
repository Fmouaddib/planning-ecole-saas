/**
 * Super Admin — Blog Engine
 * Génération automatique d'articles SEO avec IA
 */
import { useState, useEffect, useCallback } from 'react'
import { SABlogService, type BlogSettings, type BlogPost, type BlogTopic, type BlogLog, type TopicSuggestion, type SeoAudit } from '@/services/super-admin/blog'
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

const MODEL_OPTIONS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (le moins cher — ~0.01€/article)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (meilleure qualité — ~0.04€/article)' },
]

const TONE_OPTIONS = [
  { value: 'expert', label: 'Expert (autoritaire, données)' },
  { value: 'professional', label: 'Professionnel (informatif)' },
  { value: 'friendly', label: 'Amical (accessible)' },
  { value: 'casual', label: 'Décontracté (blog style)' },
]

const FREQ_OPTIONS = [
  { value: 'daily', label: 'Quotidien' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'biweekly', label: 'Bi-mensuel' },
  { value: 'monthly', label: 'Mensuel' },
]

function SeoBar({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden" style={{ maxWidth: 80 }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────
export function SABlogPage() {
  const [tab, setTab] = useState<'dashboard' | 'posts' | 'topics' | 'settings' | 'logs'>('dashboard')
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
    { id: 'settings' as const, label: 'Paramètres', icon: '⚙️' },
    { id: 'logs' as const, label: 'Logs', icon: '📋' },
  ]

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e74c3c]" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="sa-page-title">🤖 Blog Engine — SEO Automatisé</h1>
          <p className="sa-page-subtitle">Génération automatique d'articles optimisés SEO via IA</p>
        </div>
        <button className="sa-btn sa-btn-secondary" onClick={refresh} disabled={loading}>
          {loading ? '⏳' : '🔄'} Actualiser
        </button>
      </div>

      {/* API Key warning */}
      {settings && !settings.anthropic_api_key && (
        <div className="sa-card" style={{ borderLeft: '4px solid #f59e0b', marginBottom: 16 }}>
          <p className="sa-text-sm" style={{ color: '#f59e0b' }}>
            ⚠️ <strong>Clé API Anthropic non configurée.</strong> Allez dans l'onglet Paramètres pour ajouter votre clé. Obtenez-la sur <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>console.anthropic.com</a>
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.id
                ? 'bg-[#e74c3c] text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && stats && <DashboardTab stats={stats} settings={settings!} posts={posts} onRefresh={refresh} />}
      {tab === 'posts' && <PostsTab posts={posts} onRefresh={refresh} />}
      {tab === 'topics' && <TopicsTab topics={topics} settings={settings!} onRefresh={refresh} />}
      {tab === 'settings' && settings && <SettingsTab settings={settings} onRefresh={refresh} />}
      {tab === 'logs' && <LogsTab logs={logs} />}
    </div>
  )
}

// ── Dashboard Tab ────────────────────────────────────────────────
function DashboardTab({ stats, settings, posts, onRefresh }: { stats: any; settings: BlogSettings; posts: BlogPost[]; onRefresh: () => void }) {
  const [batchLoading, setBatchLoading] = useState(false)

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

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Articles', value: stats.totalPosts, icon: '📝' },
          { label: 'Publiés', value: stats.published, icon: '✅' },
          { label: 'À relire', value: stats.reviews, icon: '👀' },
          { label: 'Brouillons', value: stats.drafts, icon: '📋' },
          { label: 'Sujets en attente', value: stats.pendingTopics, icon: '💡' },
          { label: 'Score SEO moyen', value: stats.avgSeoScore, icon: '🎯' },
          { label: 'Coût total', value: `$${stats.totalCost.toFixed(3)}`, icon: '💰' },
        ].map((kpi, i) => (
          <div key={i} className="sa-card text-center">
            <div className="text-xl mb-1">{kpi.icon}</div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{kpi.value}</div>
            <div className="text-xs text-gray-500">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Actions rapides */}
      <div className="sa-card">
        <h3 className="sa-card-title">⚡ Actions rapides</h3>
        <div className="flex flex-wrap gap-3 mt-3">
          <button
            className="sa-btn sa-btn-primary"
            onClick={handleBatchGenerate}
            disabled={batchLoading || !settings.anthropic_api_key || stats.pendingTopics === 0}
          >
            {batchLoading ? '⏳ Génération...' : `🚀 Générer ${settings.posts_per_batch} article(s)`}
          </button>
          <span className="text-xs text-gray-400 self-center">
            Modèle : {settings.model} · {stats.pendingTopics} sujet(s) en file d'attente
          </span>
        </div>
        {settings.last_generation_at && (
          <p className="text-xs text-gray-400 mt-2">
            Dernière génération : {new Date(settings.last_generation_at).toLocaleString('fr-FR')}
          </p>
        )}
      </div>

      {/* Derniers articles */}
      {recentPosts.length > 0 && (
        <div className="sa-card">
          <h3 className="sa-card-title">📝 Derniers articles</h3>
          <div className="sa-table-wrap mt-3">
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
                    <td className="font-medium" style={{ maxWidth: 300 }}>
                      <div className="truncate">{p.title}</div>
                      <div className="text-[10px] text-gray-400">/{p.slug}</div>
                    </td>
                    <td><span className="sa-badge">{CATEGORY_LABELS[p.category] || p.category}</span></td>
                    <td><span className={STATUS_BADGES[p.status]?.cls || 'sa-badge'}>{STATUS_BADGES[p.status]?.label || p.status}</span></td>
                    <td><SeoBar score={p.seo_score} /></td>
                    <td className="text-xs">{p.word_count}</td>
                    <td className="text-xs">${p.generation_cost_estimate?.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      toast.success(newStatus === 'published' ? 'Article publié !' : 'Article sauvegardé')
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

  if (selectedPost) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button className="sa-btn sa-btn-secondary" onClick={() => setSelectedPost(null)}>← Retour</button>
          <div className="flex gap-2">
            <button className="sa-btn sa-btn-secondary" onClick={handleAudit} disabled={auditing}>
              {auditing ? '⏳' : '🎯'} Audit SEO
            </button>
            <button className="sa-btn sa-btn-secondary" onClick={() => handleSave()} disabled={saving}>💾 Sauvegarder</button>
            {selectedPost.status !== 'published' && (
              <button className="sa-btn sa-btn-primary" onClick={() => handleSave('published')} disabled={saving}>✅ Publier</button>
            )}
            <button className="sa-btn" style={{ background: '#ef4444', color: 'white' }} onClick={() => handleDelete(selectedPost.id)}>🗑️</button>
          </div>
        </div>

        {/* SEO Audit result */}
        {auditResult && (
          <div className="sa-card" style={{ borderLeft: `4px solid ${auditResult.score >= 70 ? '#22c55e' : '#f59e0b'}` }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl font-bold" style={{ color: auditResult.score >= 70 ? '#22c55e' : '#f59e0b' }}>{auditResult.score}/100</span>
              <span className="text-sm text-gray-500">Score SEO IA</span>
            </div>
            {auditResult.issues.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold text-gray-500 mb-1">Problèmes :</p>
                {auditResult.issues.map((issue, i) => (
                  <div key={i} className="text-xs mb-1">
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${issue.severity === 'critical' ? 'bg-red-500' : issue.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                    {issue.message} → <em className="text-gray-400">{issue.fix}</em>
                  </div>
                ))}
              </div>
            )}
            {auditResult.strengths.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-bold text-gray-500 mb-1">Points forts :</p>
                {auditResult.strengths.map((s, i) => <p key={i} className="text-xs text-green-600">✓ {s}</p>)}
              </div>
            )}
          </div>
        )}

        {/* Editor */}
        <div className="sa-card">
          <div className="space-y-3">
            <div>
              <label className="sa-label">Titre</label>
              <input className="sa-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              <span className="text-[10px] text-gray-400">{editTitle.length} chars (optimal: 30-65)</span>
            </div>
            <div>
              <label className="sa-label">Meta Description</label>
              <input className="sa-input" value={editMeta} onChange={e => setEditMeta(e.target.value)} />
              <span className="text-[10px] text-gray-400">{editMeta.length} chars (optimal: 120-160)</span>
            </div>
            <div>
              <label className="sa-label">Contenu (Markdown)</label>
              <textarea
                className="sa-input"
                rows={25}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
              />
            </div>
            <div className="flex gap-4 text-xs text-gray-400">
              <span>Mots-clés : {selectedPost.keywords?.join(', ')}</span>
              <span>Modèle : {selectedPost.model_used}</span>
              <span>Coût : ${selectedPost.generation_cost_estimate?.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['', 'review', 'draft', 'published', 'archived'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f ? 'bg-[#e74c3c] text-white' : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {f === '' ? 'Tous' : STATUS_BADGES[f]?.label || f} ({f === '' ? posts.length : posts.filter(p => p.status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="sa-card text-center py-12">
          <p className="text-2xl mb-2">📝</p>
          <p className="text-gray-500">Aucun article. Générez des sujets puis lancez la génération.</p>
        </div>
      ) : (
        <div className="sa-table-wrap">
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
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} onClick={() => openPost(p)} style={{ cursor: 'pointer' }}>
                  <td className="font-medium" style={{ maxWidth: 350 }}>
                    <div className="truncate">{p.title}</div>
                  </td>
                  <td><span className="sa-badge">{CATEGORY_LABELS[p.category] || p.category}</span></td>
                  <td><span className={STATUS_BADGES[p.status]?.cls || 'sa-badge'}>{STATUS_BADGES[p.status]?.label}</span></td>
                  <td><SeoBar score={p.seo_score} /></td>
                  <td className="text-xs">{p.word_count}</td>
                  <td className="text-xs">{p.reading_time_min} min</td>
                  <td className="text-xs">{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
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
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button className="sa-btn sa-btn-primary" onClick={handleSuggest} disabled={suggesting || !settings.anthropic_api_key}>
          {suggesting ? '⏳ Analyse IA en cours...' : '🧠 Suggérer des sujets (IA)'}
        </button>
        <button className="sa-btn sa-btn-secondary" onClick={() => setShowManual(!showManual)}>
          ✏️ Ajouter manuellement
        </button>
      </div>

      {/* Manual add */}
      {showManual && (
        <div className="sa-card">
          <h3 className="sa-card-title">Ajouter un sujet manuellement</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <input className="sa-input" placeholder="Sujet / Titre" value={manualTopic} onChange={e => setManualTopic(e.target.value)} />
            <input className="sa-input" placeholder="Mots-clés (séparés par virgule)" value={manualKeywords} onChange={e => setManualKeywords(e.target.value)} />
            <select className="sa-input" value={manualCategory} onChange={e => setManualCategory(e.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button className="sa-btn sa-btn-primary mt-3" onClick={handleAddManual} disabled={!manualTopic.trim()}>
            Ajouter
          </button>
        </div>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="sa-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="sa-card-title">🧠 Suggestions IA ({suggestions.length})</h3>
            <button className="sa-btn sa-btn-primary" onClick={handleAcceptAll}>✅ Tout accepter</button>
          </div>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.topic}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {s.keywords.map((k, ki) => (
                      <span key={ki} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{k}</span>
                    ))}
                    <span className="sa-badge text-[10px]">{CATEGORY_LABELS[s.category] || s.category}</span>
                    <span className="text-[10px] text-gray-400">Priorité: {s.priority}/10</span>
                  </div>
                </div>
                <button className="sa-btn sa-btn-primary" style={{ fontSize: 12 }} onClick={() => handleAcceptSuggestion(s)}>+ Ajouter</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing topics */}
      <div className="sa-card">
        <h3 className="sa-card-title">📋 File d'attente ({topics.length})</h3>
        {topics.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">Aucun sujet. Utilisez la suggestion IA pour commencer.</p>
        ) : (
          <div className="sa-table-wrap mt-3">
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
                    <td className="font-medium" style={{ maxWidth: 250 }}>
                      <div className="truncate">{t.topic}</div>
                      {t.error_message && <div className="text-[10px] text-red-500 truncate">{t.error_message}</div>}
                    </td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {(t.keywords || []).slice(0, 3).map((k, i) => (
                          <span key={i} className="text-[10px] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{k}</span>
                        ))}
                      </div>
                    </td>
                    <td><span className="sa-badge text-[10px]">{CATEGORY_LABELS[t.category] || t.category}</span></td>
                    <td className="text-center">{t.priority}</td>
                    <td><span className={STATUS_BADGES[t.status]?.cls || 'sa-badge'}>{STATUS_BADGES[t.status]?.label}</span></td>
                    <td className="text-xs">{t.suggested_by === 'ai' ? '🧠' : '✏️'}</td>
                    <td>
                      <div className="flex gap-1">
                        {t.status === 'pending' && (
                          <button
                            className="sa-btn sa-btn-primary"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => handleGenerate(t.id)}
                            disabled={generating === t.id || !settings.anthropic_api_key}
                          >
                            {generating === t.id ? '⏳' : '🚀'} Générer
                          </button>
                        )}
                        {t.status === 'failed' && (
                          <button
                            className="sa-btn sa-btn-secondary"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={async () => {
                              await SABlogService.updateTopic(t.id, { status: 'pending', error_message: null })
                              onRefresh()
                            }}
                          >
                            🔄 Retry
                          </button>
                        )}
                        <button
                          className="sa-btn"
                          style={{ fontSize: 11, padding: '4px 8px', color: '#ef4444' }}
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
          </div>
        )}
      </div>
    </div>
  )
}

// ── Settings Tab ─────────────────────────────────────────────────
function SettingsTab({ settings, onRefresh }: { settings: BlogSettings; onRefresh: () => void }) {
  const [form, setForm] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await SABlogService.updateSettings({
        auto_generate: form.auto_generate,
        generation_frequency: form.generation_frequency,
        posts_per_batch: form.posts_per_batch,
        model: form.model,
        tone: form.tone,
        target_audience: form.target_audience,
        site_name: form.site_name,
        site_url: form.site_url,
        blog_base_url: form.blog_base_url,
        cta_text: form.cta_text,
        cta_url: form.cta_url,
        seed_keywords: form.seed_keywords,
        categories: form.categories,
        anthropic_api_key: form.anthropic_api_key,
      } as Partial<BlogSettings>)
      toast.success('Paramètres sauvegardés')
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* API Key */}
      <div className="sa-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
        <h3 className="sa-card-title">🔑 Clé API Anthropic</h3>
        <p className="text-xs text-gray-500 mb-3">
          Obtenez votre clé sur <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline text-blue-500">console.anthropic.com</a>.
          Claude Haiku 4.5 coûte ~0.01€ par article. Sonnet 4.6 ~0.04€.
        </p>
        <div className="flex gap-2">
          <input
            className="sa-input flex-1"
            type={showApiKey ? 'text' : 'password'}
            placeholder="sk-ant-api03-..."
            value={form.anthropic_api_key || ''}
            onChange={e => setForm(f => ({ ...f, anthropic_api_key: e.target.value }))}
          />
          <button className="sa-btn sa-btn-secondary" onClick={() => setShowApiKey(!showApiKey)}>
            {showApiKey ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      {/* Modèle & génération */}
      <div className="sa-card">
        <h3 className="sa-card-title">🤖 Modèle & Génération</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <label className="sa-label">Modèle IA</label>
            <select className="sa-input" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}>
              {MODEL_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="sa-label">Ton de rédaction</label>
            <select className="sa-input" value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}>
              {TONE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="sa-label">Fréquence (auto)</label>
            <select className="sa-input" value={form.generation_frequency} onChange={e => setForm(f => ({ ...f, generation_frequency: e.target.value }))}>
              {FREQ_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="sa-label">Articles par lot</label>
            <input className="sa-input" type="number" min={1} max={10} value={form.posts_per_batch} onChange={e => setForm(f => ({ ...f, posts_per_batch: parseInt(e.target.value) || 2 }))} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.auto_generate} onChange={e => setForm(f => ({ ...f, auto_generate: e.target.checked }))} />
            <span className="text-sm">Génération automatique activée</span>
          </label>
        </div>
      </div>

      {/* SEO & Site */}
      <div className="sa-card">
        <h3 className="sa-card-title">🎯 SEO & Site</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <label className="sa-label">Nom du site</label>
            <input className="sa-input" value={form.site_name} onChange={e => setForm(f => ({ ...f, site_name: e.target.value }))} />
          </div>
          <div>
            <label className="sa-label">URL du site</label>
            <input className="sa-input" value={form.site_url} onChange={e => setForm(f => ({ ...f, site_url: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="sa-label">Audience cible</label>
            <input className="sa-input" value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="sa-label">CTA par défaut</label>
            <input className="sa-input" value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} placeholder="Texte CTA" />
          </div>
          <div className="md:col-span-2">
            <label className="sa-label">Mots-clés seed (un par ligne)</label>
            <textarea
              className="sa-input"
              rows={5}
              value={(form.seed_keywords || []).join('\n')}
              onChange={e => setForm(f => ({ ...f, seed_keywords: e.target.value.split('\n').map(k => k.trim()).filter(Boolean) }))}
            />
          </div>
        </div>
      </div>

      <button className="sa-btn sa-btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder les paramètres'}
      </button>
    </div>
  )
}

// ── Logs Tab ─────────────────────────────────────────────────────
function LogsTab({ logs }: { logs: BlogLog[] }) {
  return (
    <div className="sa-card">
      <h3 className="sa-card-title">📋 Journal de génération</h3>
      {logs.length === 0 ? (
        <p className="text-gray-400 text-sm py-6 text-center">Aucun log pour le moment.</p>
      ) : (
        <div className="sa-table-wrap mt-3">
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
                  <td className="text-xs">{new Date(l.created_at).toLocaleString('fr-FR')}</td>
                  <td className="text-xs font-medium">{l.action}</td>
                  <td className="text-xs">{l.model?.replace('claude-', '').split('-').slice(0, 2).join('-')}</td>
                  <td className="text-xs">{l.input_tokens} / {l.output_tokens}</td>
                  <td className="text-xs">${l.cost_estimate?.toFixed(4)}</td>
                  <td className="text-xs">{(l.duration_ms / 1000).toFixed(1)}s</td>
                  <td>
                    <span className={l.status === 'success' ? 'sa-badge-success' : 'sa-badge-error'}>
                      {l.status === 'success' ? '✅' : '❌'} {l.status}
                    </span>
                    {l.error_message && <div className="text-[10px] text-red-500 truncate max-w-[200px]">{l.error_message}</div>}
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
