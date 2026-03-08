/**
 * Public Blog — Article detail page
 */
import { useState, useEffect } from 'react'
import { Calendar, Clock, ArrowLeft, Tag, Share2 } from 'lucide-react'
import LandingLayout from '@/components/landing/LandingLayout'
import { MarkdownWithMermaid } from '@/components/ui/MermaidRenderer'
import { supabase } from '@/lib/supabase'

interface FullPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  meta_title: string | null
  meta_description: string | null
  keywords: string[]
  category: string
  word_count: number
  reading_time_min: number
  published_at: string
  seo_score: number
  featured_image_url: string | null
}

interface RelatedPost {
  id: string
  title: string
  slug: string
  category: string
  reading_time_min: number
  published_at: string
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

export default function BlogPostPage() {
  const [post, setPost] = useState<FullPost | null>(null)
  const [related, setRelated] = useState<RelatedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Extract slug from hash: #/blog/my-slug
  const slug = window.location.hash.replace('#/blog/', '').split('?')[0]

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setPost(data as FullPost)

      // Increment view count
      supabase.rpc('increment_blog_view', { post_slug: slug }).catch(() => {})

      // Update meta tags for SEO
      if (data.meta_title) document.title = data.meta_title
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc && data.meta_description) metaDesc.setAttribute('content', data.meta_description)

      // Fetch related posts (same category, exclude current)
      const { data: relatedData } = await supabase
        .from('blog_posts')
        .select('id, title, slug, category, reading_time_min, published_at')
        .eq('status', 'published')
        .eq('category', data.category)
        .neq('id', data.id)
        .order('published_at', { ascending: false })
        .limit(3)

      setRelated(relatedData || [])
      setLoading(false)
      window.scrollTo(0, 0)
    }

    if (slug) fetchPost()
  }, [slug])

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: post?.title, url })
    } else {
      await navigator.clipboard.writeText(url)
      alert('Lien copie !')
    }
  }

  if (loading) {
    return (
      <LandingLayout isDetailPage>
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF5B46]" />
        </div>
      </LandingLayout>
    )
  }

  if (notFound || !post) {
    return (
      <LandingLayout isDetailPage>
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Article introuvable</h1>
          <p style={{ color: '#64748b', marginBottom: 24 }}>Cet article n'existe pas ou n'est plus disponible.</p>
          <a href="#/blog" style={{ color: '#FF5B46', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={16} /> Retour au blog
          </a>
        </div>
      </LandingLayout>
    )
  }

  const catColor = CATEGORY_COLORS[post.category] || '#3b82f6'

  return (
    <LandingLayout isDetailPage>
      {/* Article header */}
      <article style={{ paddingTop: 100 }}>
        <header style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: '0 24px 40px',
          textAlign: 'center',
        }}>
          <a href="#/blog" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: '#64748b',
            textDecoration: 'none',
            marginBottom: 24,
          }}>
            <ArrowLeft size={14} /> Retour au blog
          </a>

          <div style={{ marginBottom: 16 }}>
            <span style={{
              padding: '4px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              background: `${catColor}15`,
              color: catColor,
            }}>
              {CATEGORY_LABELS[post.category] || post.category}
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.25,
            marginBottom: 16,
          }}>
            {post.title}
          </h1>

          {post.excerpt && (
            <p style={{ fontSize: 18, color: '#64748b', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 20px' }}>
              {post.excerpt}
            </p>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            fontSize: 14,
            color: '#94a3b8',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={15} />
              {new Date(post.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={15} />
              {post.reading_time_min} min de lecture
            </span>
            <button
              onClick={handleShare}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}
            >
              <Share2 size={15} /> Partager
            </button>
          </div>
        </header>

        {/* Featured image */}
        {post.featured_image_url && (
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px 32px' }}>
            <img
              src={post.featured_image_url}
              alt={post.title}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: 400,
                objectFit: 'cover',
                borderRadius: 16,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              }}
            />
          </div>
        )}

        {/* Article content */}
        <div style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: '0 24px 60px',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 'clamp(24px, 4vw, 48px)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #f1f5f9',
          }}>
            <MarkdownWithMermaid content={post.content} />
          </div>

          {/* Keywords */}
          {post.keywords?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
              {post.keywords.map((kw, i) => (
                <span key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  background: '#f1f5f9',
                  color: '#64748b',
                }}>
                  <Tag size={11} /> {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{
          maxWidth: 800,
          margin: '0 auto 60px',
          padding: '0 24px',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #FF5B46, #FBA625)',
            borderRadius: 16,
            padding: '40px 32px',
            textAlign: 'center',
            color: '#fff',
          }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              Simplifiez la gestion de votre centre de formation
            </h3>
            <p style={{ fontSize: 15, opacity: 0.9, marginBottom: 20 }}>
              Decouvrez AntiPlanning, le logiciel de planning intelligent pour centres de formation.
            </p>
            <a
              href="#/signup"
              style={{
                display: 'inline-block',
                padding: '12px 32px',
                borderRadius: 12,
                background: '#fff',
                color: '#FF5B46',
                fontWeight: 700,
                fontSize: 15,
                textDecoration: 'none',
              }}
            >
              Essayer gratuitement
            </a>
          </div>
        </div>

        {/* Related articles */}
        {related.length > 0 && (
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px 80px' }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Articles similaires</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {related.map(r => (
                <a
                  key={r.id}
                  href={`#/blog/${r.slug}`}
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
                >
                  <h4 style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#0f172a',
                    marginBottom: 8,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {r.title}
                  </h4>
                  <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 8 }}>
                    <span>{r.reading_time_min} min</span>
                    <span>{new Date(r.published_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </article>
    </LandingLayout>
  )
}
