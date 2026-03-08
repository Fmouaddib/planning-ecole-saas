/**
 * Public Blog — Liste des articles publiés
 */
import { useState, useEffect } from 'react'
import { Calendar, Clock, Tag, Search, ArrowRight } from 'lucide-react'
import LandingLayout from '@/components/landing/LandingLayout'
import { supabase } from '@/lib/supabase'

interface PublicPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  category: string
  keywords: string[]
  reading_time_min: number
  published_at: string
  featured_image_prompt: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  'gestion-centre': 'Gestion de centre',
  'planning-pedagogique': 'Planning pedagogique',
  'digitalisation': 'Digitalisation',
  'reglementation-formation': 'Reglementation',
  'conseils-pratiques': 'Conseils pratiques',
  'ia-education': 'IA & Education',
  'temoignages': 'Temoignages',
  'productivite': 'Productivite',
}

const CATEGORY_COLORS: Record<string, string> = {
  'gestion-centre': '#3b82f6',
  'planning-pedagogique': '#8b5cf6',
  'digitalisation': '#06b6d4',
  'reglementation-formation': '#f59e0b',
  'conseils-pratiques': '#10b981',
  'ia-education': '#ec4899',
  'temoignages': '#f97316',
  'productivite': '#6366f1',
}

export default function BlogListPage() {
  const [posts, setPosts] = useState<PublicPost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, category, keywords, reading_time_min, published_at, featured_image_prompt')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
      setPosts(data || [])
      setLoading(false)
    }
    fetchPosts()
  }, [])

  const filtered = posts.filter(p => {
    if (filterCat && p.category !== filterCat) return false
    if (search) {
      const q = search.toLowerCase()
      return p.title.toLowerCase().includes(q) || (p.excerpt || '').toLowerCase().includes(q) || p.keywords.some(k => k.toLowerCase().includes(q))
    }
    return true
  })

  const categories = [...new Set(posts.map(p => p.category))]

  return (
    <LandingLayout isDetailPage>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        padding: '120px 24px 60px',
        textAlign: 'center',
        color: '#fff',
      }}>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, marginBottom: 12 }}>
          Blog AntiPlanning
        </h1>
        <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 600, margin: '0 auto 32px' }}>
          Conseils, guides et actualites pour optimiser la gestion de votre centre de formation.
        </p>

        {/* Search */}
        <div style={{ maxWidth: 500, margin: '0 auto', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Rechercher un article..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 20px 14px 44px',
              borderRadius: 12,
              border: 'none',
              fontSize: 15,
              background: '#1e293b',
              color: '#e2e8f0',
              outline: 'none',
              boxShadow: '0 0 0 1px #334155',
            }}
          />
        </div>
      </section>

      {/* Filters */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterCat('')}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: !filterCat ? '#0f172a' : '#f1f5f9',
              color: !filterCat ? '#fff' : '#475569',
              transition: 'all 0.2s',
            }}
          >
            Tous ({posts.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat === filterCat ? '' : cat)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: filterCat === cat ? (CATEGORY_COLORS[cat] || '#0f172a') : '#f1f5f9',
                color: filterCat === cat ? '#fff' : '#475569',
                transition: 'all 0.2s',
              }}
            >
              {CATEGORY_LABELS[cat] || cat} ({posts.filter(p => p.category === cat).length})
            </button>
          ))}
        </div>
      </section>

      {/* Articles grid */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Aucun article trouve</p>
            <p>Revenez bientot pour decouvrir nos prochains articles.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 24,
          }}>
            {filtered.map(post => (
              <a
                key={post.id}
                href={`#/blog/${post.slug}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)'
                }}
              >
                {/* Gradient placeholder header */}
                <div style={{
                  height: 140,
                  background: `linear-gradient(135deg, ${CATEGORY_COLORS[post.category] || '#3b82f6'}20, ${CATEGORY_COLORS[post.category] || '#3b82f6'}40)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}>
                  <span style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: CATEGORY_COLORS[post.category] || '#3b82f6',
                    color: '#fff',
                  }}>
                    {CATEGORY_LABELS[post.category] || post.category}
                  </span>
                  <Tag size={40} style={{ color: CATEGORY_COLORS[post.category] || '#3b82f6', opacity: 0.3 }} />
                </div>

                <div style={{ padding: '20px 20px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h2 style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: '#0f172a',
                    lineHeight: 1.4,
                    marginBottom: 8,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p style={{
                      fontSize: 14,
                      color: '#64748b',
                      lineHeight: 1.6,
                      marginBottom: 16,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      flex: 1,
                    }}>
                      {post.excerpt}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#94a3b8' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={13} />
                        {new Date(post.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={13} />
                        {post.reading_time_min} min
                      </span>
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#FF5B46' }}>
                      Lire <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </LandingLayout>
  )
}
