/**
 * Service Super-Admin — Blog Engine (génération automatique d'articles SEO)
 */
import { supabase } from '@/lib/supabase'

// ── Types ────────────────────────────────────────────────────────
export interface BlogSettings {
  id: number
  provider: string
  auto_generate: boolean
  generation_frequency: string
  posts_per_batch: number
  model: string
  language: string
  tone: string
  target_audience: string
  site_name: string
  site_url: string
  blog_base_url: string
  categories: string[]
  seed_keywords: string[]
  internal_links: { title: string; url: string }[]
  cta_text: string
  cta_url: string
  last_generation_at: string | null
  total_posts_generated: number
  anthropic_api_key: string | null
  gemini_api_key: string | null
  groq_api_key: string | null
  tavily_api_key: string | null
  research_enabled: boolean
  custom_prompt: string | null
  unsplash_api_key: string | null
  updated_at: string
}

export interface BlogTopic {
  id: string
  topic: string
  description: string | null
  keywords: string[]
  category: string
  priority: number
  status: 'pending' | 'generating' | 'generated' | 'failed' | 'skipped'
  generated_post_id: string | null
  error_message: string | null
  suggested_by: string
  created_at: string
  updated_at: string
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  content_html: string | null
  meta_title: string | null
  meta_description: string | null
  keywords: string[]
  category: string
  status: 'draft' | 'review' | 'published' | 'archived'
  author_name: string
  featured_image_prompt: string | null
  featured_image_url: string | null
  word_count: number
  reading_time_min: number
  seo_score: number
  topic_id: string | null
  model_used: string | null
  generation_cost_estimate: number
  view_count: number
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface BlogLog {
  id: string
  action: string
  topic_id: string | null
  post_id: string | null
  model: string | null
  input_tokens: number
  output_tokens: number
  cost_estimate: number
  duration_ms: number
  status: string
  error_message: string | null
  metadata: Record<string, any>
  created_at: string
}

export interface TopicSuggestion {
  topic: string
  description: string
  keywords: string[]
  category: string
  priority: number
}

export interface SeoAudit {
  score: number
  issues: { severity: string; message: string; fix: string }[]
  strengths: string[]
  recommendations: string[]
}

// ── Service ──────────────────────────────────────────────────────
export class SABlogService {
  // Settings
  static async getSettings(): Promise<BlogSettings> {
    const { data, error } = await supabase
      .from('blog_settings')
      .select('*')
      .eq('id', 1)
      .single()
    if (error) throw error
    return data as BlogSettings
  }

  static async updateSettings(patch: Partial<BlogSettings>): Promise<BlogSettings> {
    // Remove undefined values that Supabase may reject
    const cleanPatch: Record<string, any> = {}
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) cleanPatch[key] = value
    }
    const { data, error } = await supabase
      .from('blog_settings')
      .update(cleanPatch)
      .eq('id', 1)
      .select()
    if (error) throw error
    if (!data || data.length === 0) throw new Error('Échec mise à jour paramètres blog (vérifiez vos permissions)')
    return data[0] as BlogSettings
  }

  // Topics
  static async getTopics(status?: string): Promise<BlogTopic[]> {
    let query = supabase
      .from('blog_topics')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    return (data || []) as BlogTopic[]
  }

  static async createTopic(topic: Partial<BlogTopic>): Promise<BlogTopic> {
    const { data, error } = await supabase
      .from('blog_topics')
      .insert(topic)
      .select()
      .single()
    if (error) throw error
    return data as BlogTopic
  }

  static async updateTopic(id: string, patch: Partial<BlogTopic>): Promise<void> {
    const { error } = await supabase
      .from('blog_topics')
      .update(patch)
      .eq('id', id)
    if (error) throw error
  }

  static async deleteTopic(id: string): Promise<void> {
    const { error } = await supabase
      .from('blog_topics')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  static async bulkCreateTopics(topics: Partial<BlogTopic>[]): Promise<number> {
    const { data, error } = await supabase
      .from('blog_topics')
      .insert(topics)
      .select('id')
    if (error) throw error
    return data?.length || 0
  }

  // Posts
  static async getPosts(status?: string): Promise<BlogPost[]> {
    let query = supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    return (data || []) as BlogPost[]
  }

  static async getPost(id: string): Promise<BlogPost> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as BlogPost
  }

  static async updatePost(id: string, patch: Partial<BlogPost>): Promise<BlogPost> {
    const updateData: Record<string, any> = { ...patch }
    if (patch.status === 'published' && !patch.published_at) {
      updateData.published_at = new Date().toISOString()
    }
    const { data, error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as BlogPost
  }

  static async deletePost(id: string): Promise<void> {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  // Logs
  static async getLogs(limit = 50): Promise<BlogLog[]> {
    const { data, error } = await supabase
      .from('blog_generation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data || []) as BlogLog[]
  }

  // Edge function calls
  static async suggestTopics(count = 10): Promise<TopicSuggestion[]> {
    const [existingTopics, existingPosts] = await Promise.all([
      this.getTopics(),
      this.getPosts(),
    ])
    // Combine topic names + article titles to avoid duplicates
    const allExisting = [
      ...existingTopics.map(t => t.topic),
      ...existingPosts.map(p => p.title),
    ]
    const { data, error } = await supabase.functions.invoke('blog-engine', {
      body: {
        action: 'suggest-topics',
        count,
        existingTopics: allExisting,
      },
    })
    if (error) {
      // Extract error message from FunctionsHttpError context
      const msg = typeof error === 'object' && 'context' in error
        ? await (error as any).context?.json?.()?.then((d: any) => d?.error) || error.message
        : error.message
      throw new Error(msg || 'Erreur lors de la suggestion de sujets')
    }
    if (data?.error) throw new Error(data.error)
    return data?.suggestions || []
  }

  static async generateArticle(topicId: string): Promise<BlogPost> {
    const { data, error } = await supabase.functions.invoke('blog-engine', {
      body: { action: 'generate-article', topicId },
    })
    if (error) throw error
    return data?.post as BlogPost
  }

  static async batchGenerate(limit?: number): Promise<{ generated: number; results: any[] }> {
    const { data, error } = await supabase.functions.invoke('blog-engine', {
      body: { action: 'batch-generate', limit },
    })
    if (error) throw error
    return data
  }

  static async analyzeSeo(postId: string): Promise<SeoAudit> {
    const { data, error } = await supabase.functions.invoke('blog-engine', {
      body: { action: 'analyze-seo', postId },
    })
    if (error) throw error
    return data?.audit as SeoAudit
  }

  static async improveArticle(postId: string, audit: SeoAudit): Promise<BlogPost> {
    const { data, error } = await supabase.functions.invoke('blog-engine', {
      body: { action: 'improve-article', postId, audit },
    })
    if (error) throw error
    return data?.post as BlogPost
  }

  static async chatWithArticle(
    postId: string,
    instruction: string,
    history: { role: string; content: string }[] = [],
  ): Promise<{ message: string; hasChanges: boolean; post: BlogPost; cost: number }> {
    const { data, error } = await supabase.functions.invoke('blog-engine', {
      body: { action: 'chat-article', postId, instruction, history },
    })
    if (error) {
      const msg = typeof error === 'object' && 'context' in error
        ? await (error as any).context?.json?.()?.then((d: any) => d?.error) || error.message
        : error.message
      throw new Error(msg || 'Erreur lors de la communication avec l\'IA')
    }
    if (data?.error) throw new Error(data.error)
    return data as { message: string; hasChanges: boolean; post: BlogPost; cost: number }
  }

  static async updateLinks(postId: string): Promise<{ post: BlogPost; linksAdded: number; message?: string }> {
    const { data, error } = await supabase.functions.invoke('blog-engine', {
      body: { action: 'update-links', postId },
    })
    if (error) throw error
    return data as { post: BlogPost; linksAdded: number; message?: string }
  }

  // Stats
  static async getStats(): Promise<{
    totalPosts: number
    published: number
    drafts: number
    reviews: number
    pendingTopics: number
    totalCost: number
    avgSeoScore: number
    totalViews: number
  }> {
    const [posts, topics, logs] = await Promise.all([
      this.getPosts(),
      this.getTopics(),
      this.getLogs(1000),
    ])

    const published = posts.filter(p => p.status === 'published').length
    const drafts = posts.filter(p => p.status === 'draft').length
    const reviews = posts.filter(p => p.status === 'review').length
    const pendingTopics = topics.filter(t => t.status === 'pending').length
    const totalCost = logs.reduce((s, l) => s + (l.cost_estimate || 0), 0)
    const avgSeoScore = posts.length > 0
      ? Math.round(posts.reduce((s, p) => s + p.seo_score, 0) / posts.length)
      : 0
    const totalViews = posts.reduce((s, p) => s + (p.view_count || 0), 0)

    return {
      totalPosts: posts.length,
      published,
      drafts,
      reviews,
      pendingTopics,
      totalCost,
      avgSeoScore,
      totalViews,
    }
  }
}
