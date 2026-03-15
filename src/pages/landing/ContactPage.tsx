import { useEffect, useState } from 'react'
import { Mail, MapPin, Phone, Send, CheckCircle } from 'lucide-react'
import { updatePageMeta } from '@/utils/seo'
import LandingLayout from '@/components/landing/LandingLayout'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    updatePageMeta({
      title: 'Contact',
      description: 'Contactez l\'equipe Anti-Planning. Support, questions commerciales, partenariats.',
      path: '/contact',
      keywords: 'contact anti-planning, support planning ecole, demande demo formation, partenariat logiciel education',
    })
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // mailto fallback
    const mailtoBody = encodeURIComponent(`Nom: ${name}\nEmail: ${email}\n\n${message}`)
    const mailtoSubject = encodeURIComponent(subject || 'Contact depuis anti-planning.com')
    window.open(`mailto:contact@anti-planning.com?subject=${mailtoSubject}&body=${mailtoBody}`)
    setSent(true)
  }

  return (
    <LandingLayout isDetailPage>
      <section className="landing-detail-hero">
        <div className="landing-detail-hero-inner">
          <span className="landing-section-label">Contact</span>
          <h1>Nous contacter</h1>
          <p>Une question, une demande de démo ou un partenariat ? Nous sommes à votre écoute.</p>
        </div>
      </section>

      <section style={{ padding: '4rem 0' }}>
        <div className="contact-grid" style={{ maxWidth: 900, margin: '0 auto', padding: '0 1.5rem', display: 'grid', gap: '2rem' }}>
          {/* Info */}
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#1e293b' }}>
              Coordonnées
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Mail size={20} style={{ color: '#FF5B46', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>Email</p>
                  <a href="mailto:contact@anti-planning.com" style={{ color: '#64748b' }}>contact@anti-planning.com</a>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Phone size={20} style={{ color: '#FF5B46', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>Téléphone</p>
                  <p style={{ color: '#64748b' }}>+33 1 23 45 67 89</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <MapPin size={20} style={{ color: '#FF5B46', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>Adresse</p>
                  <p style={{ color: '#64748b' }}>Paris, France</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Horaires de support</p>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Lundi — Vendredi : 9h - 18h (CET)<br />
                Réponse sous 24h ouvrées
              </p>
            </div>
          </div>

          {/* Form */}
          <div>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <CheckCircle size={48} style={{ color: '#10b981', margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                  Message prêt à envoyer !
                </h3>
                <p style={{ color: '#64748b' }}>
                  Votre client email s'est ouvert avec votre message. Envoyez-le pour nous contacter.
                </p>
                <button
                  onClick={() => setSent(false)}
                  style={{ marginTop: '1rem', color: '#FF5B46', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', fontSize: '0.9rem' }}
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#1e293b', marginBottom: '0.375rem', fontSize: '0.875rem' }}>Nom complet *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jean Dupont"
                    style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#1e293b', marginBottom: '0.375rem', fontSize: '0.875rem' }}>Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="jean@ecole.fr"
                    style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#1e293b', marginBottom: '0.375rem', fontSize: '0.875rem' }}>Sujet</label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', background: '#fff' }}
                  >
                    <option value="">Sélectionnez un sujet</option>
                    <option value="Demande de démo">Demande de démo</option>
                    <option value="Question sur les tarifs">Question sur les tarifs</option>
                    <option value="Support technique">Support technique</option>
                    <option value="Partenariat">Partenariat</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#1e293b', marginBottom: '0.375rem', fontSize: '0.875rem' }}>Message *</label>
                  <textarea
                    required
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Décrivez votre demande..."
                    rows={5}
                    style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                  />
                </div>
                <button
                  type="submit"
                  className="landing-btn-coral"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem' }}
                >
                  <Send size={16} />
                  Envoyer le message
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}
