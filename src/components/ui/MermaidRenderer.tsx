/**
 * MermaidRenderer — Renders Mermaid diagram blocks from Markdown content.
 * Splits content on ```mermaid fences, renders text as HTML and diagrams as SVG.
 */
import { useEffect, useRef, useState, memo } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  fontFamily: 'Inter, system-ui, sans-serif',
  flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
  securityLevel: 'loose',
})

// Single Mermaid diagram block
const MermaidBlock = memo(({ code, id }: { code: string; id: string }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      try {
        const { svg: rendered } = await mermaid.render(`mermaid-${id}`, code.trim())
        if (!cancelled) setSvg(rendered)
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Erreur de rendu Mermaid')
      }
    }
    render()
    return () => { cancelled = true }
  }, [code, id])

  if (error) {
    return (
      <div style={{ padding: 12, margin: '16px 0', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12, color: '#dc2626' }}>
        Erreur schéma : {error}
        <pre style={{ marginTop: 8, fontSize: 11, whiteSpace: 'pre-wrap', color: '#666' }}>{code}</pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div style={{ padding: 20, margin: '16px 0', textAlign: 'center', color: '#999', fontSize: 13 }}>
        Chargement du schéma...
      </div>
    )
  }

  return (
    <div
      ref={ref}
      style={{
        margin: '20px 0',
        padding: 16,
        borderRadius: 12,
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        textAlign: 'center',
        overflow: 'auto',
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
})

MermaidBlock.displayName = 'MermaidBlock'

// Parse markdown content and split into text + mermaid segments
interface Segment {
  type: 'text' | 'mermaid'
  content: string
}

function parseContent(markdown: string): Segment[] {
  const segments: Segment[] = []
  const regex = /```mermaid\s*\n([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(markdown)) !== null) {
    // Text before this mermaid block
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: markdown.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'mermaid', content: match[1] })
    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < markdown.length) {
    segments.push({ type: 'text', content: markdown.slice(lastIndex) })
  }

  return segments
}

// Simple Markdown to HTML (headings, bold, italic, lists, links, paragraphs)
function markdownToHtml(md: string): string {
  let html = md
    // Headings
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin-top:24px;margin-bottom:12px;font-size:1.3em;color:#1e293b">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="margin-top:28px;margin-bottom:14px;font-size:1.5em;color:#0f172a">$1</h1>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#2563eb;text-decoration:underline">$1</a>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li style="margin-left:20px;margin-bottom:4px">$1</li>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr style="margin:20px 0;border:none;border-top:1px solid #e2e8f0">')
    // Code blocks (non-mermaid)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:#f1f5f9;padding:12px;border-radius:8px;overflow:auto;font-size:12px"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:0.9em">$1</code>')

  // Paragraphs: wrap standalone text lines
  html = html
    .split('\n')
    .map(line => {
      const trimmed = line.trim()
      if (!trimmed) return ''
      if (trimmed.startsWith('<')) return line
      return `<p style="margin-bottom:10px;line-height:1.7;color:#334155">${line}</p>`
    })
    .join('\n')

  return html
}

/** Renders markdown content with inline Mermaid diagrams */
export function MarkdownWithMermaid({ content }: { content: string }) {
  const segments = parseContent(content)
  let mermaidIndex = 0

  return (
    <div style={{ fontSize: 14, lineHeight: 1.7 }}>
      {segments.map((seg, i) => {
        if (seg.type === 'mermaid') {
          const idx = mermaidIndex++
          return <MermaidBlock key={`m-${idx}`} code={seg.content} id={`${idx}-${Date.now()}`} />
        }
        return (
          <div
            key={`t-${i}`}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(seg.content) }}
          />
        )
      })}
    </div>
  )
}
