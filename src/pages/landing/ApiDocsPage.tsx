import { useEffect, useState, useRef } from 'react'
import { updatePageMeta } from '@/utils/seo'
import LandingLayout from '@/components/landing/LandingLayout'
import { Copy, Check, ChevronRight } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidebarItem {
  id: string
  label: string
}

// ---------------------------------------------------------------------------
// Sidebar sections
// ---------------------------------------------------------------------------

const SECTIONS: SidebarItem[] = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'authentication', label: 'Authentification' },
  { id: 'sessions', label: 'Seances' },
  { id: 'users', label: 'Utilisateurs' },
  { id: 'rooms', label: 'Salles' },
  { id: 'academic', label: 'Referentiel' },
  { id: 'attendance', label: 'Presences' },
  { id: 'grades', label: 'Notes' },
  { id: 'webhooks', label: 'Temps reel' },
]

// ---------------------------------------------------------------------------
// Copy button helper
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors text-gray-400 hover:text-white"
      title="Copier"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Code block
// ---------------------------------------------------------------------------

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <div className="relative rounded-lg overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono uppercase">{language}</span>
      </div>
      <div className="relative">
        <CopyButton text={code} />
        <pre className="bg-gray-950 text-gray-200 p-4 overflow-x-auto text-sm leading-relaxed font-mono">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Endpoint badge
// ---------------------------------------------------------------------------

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    PATCH: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${colors[method] || 'bg-gray-600 text-gray-300'}`}>
      {method}
    </span>
  )
}

function EndpointUrl({ method, url }: { method: string; url: string }) {
  return (
    <div className="flex items-center gap-3 bg-gray-900 rounded-lg px-4 py-3 my-3 font-mono text-sm overflow-x-auto">
      <MethodBadge method={method} />
      <span className="text-gray-200">{url}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Table helper
// ---------------------------------------------------------------------------

function ParamsTable({ rows }: { rows: { name: string; type: string; description: string }[] }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 pr-4 font-semibold text-gray-700">Parametre</th>
            <th className="text-left py-2 pr-4 font-semibold text-gray-700">Type</th>
            <th className="text-left py-2 font-semibold text-gray-700">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-gray-100">
              <td className="py-2 pr-4 font-mono text-indigo-600 text-xs">{r.name}</td>
              <td className="py-2 pr-4 text-gray-500 text-xs">{r.type}</td>
              <td className="py-2 text-gray-600">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Constants for examples
// ---------------------------------------------------------------------------

const BASE_URL = 'https://<project-ref>.supabase.co'
const ANON_KEY = '<votre-anon-key>'

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState('introduction')
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    window.scrollTo(0, 0)
    updatePageMeta({
      title: 'API Documentation',
      description:
        "Documentation de l'API REST Anti-Planning. Integrez vos outils avec notre plateforme de gestion pour centres de formation.",
      path: '/api-docs',
      keywords:
        'API anti-planning, REST API, documentation API, integration centre formation, Supabase API',
    })
  }, [])

  // Intersection observer for active section tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0.1 }
    )

    for (const section of SECTIONS) {
      const el = sectionRefs.current[section.id]
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    const el = sectionRefs.current[id]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const ref = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el
  }

  return (
    <LandingLayout isDetailPage>
      {/* Hero */}
      <section className="landing-detail-hero">
        <div className="landing-detail-hero-inner">
          <h1>API Documentation</h1>
          <p>
            Integrez Anti-Planning avec vos outils existants grace a notre API REST.
            Accedez aux seances, utilisateurs, salles, notes et presences.
          </p>
        </div>
      </section>

      {/* Content with sidebar */}
      <section style={{ padding: '3rem 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <nav className="lg:w-56 shrink-0">
              <div className="lg:sticky lg:top-24">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Sommaire
                </h3>
                <ul className="space-y-1">
                  {SECTIONS.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => scrollTo(s.id)}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1.5 ${
                          activeSection === s.id
                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        {activeSection === s.id && <ChevronRight size={12} />}
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* -------------------------------------------------------- */}
              {/* INTRODUCTION */}
              {/* -------------------------------------------------------- */}
              <article id="introduction" ref={ref('introduction')} className="mb-16 scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Anti-Planning expose une API REST complète basée sur{' '}
                  <a
                    href="https://postgrest.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    PostgREST
                  </a>{' '}
                  via Supabase. Chaque table de la base de données est accessible en lecture
                  (et en écriture selon vos droits) via des endpoints RESTful standards.
                </p>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">URL de base</h3>
                <CodeBlock
                  code={`${BASE_URL}/rest/v1/`}
                  language="url"
                />

                <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-6">
                  En-têtes requis
                </h3>
                <ParamsTable
                  rows={[
                    {
                      name: 'apikey',
                      type: 'string',
                      description:
                        'Votre cle publique anon Supabase. Obligatoire pour toutes les requêtes.',
                    },
                    {
                      name: 'Authorization',
                      type: 'string',
                      description:
                        'Bearer <access_token> obtenu apres authentification. Necessite un JWT valide.',
                    },
                    {
                      name: 'Content-Type',
                      type: 'string',
                      description:
                        'application/json pour les requêtes POST / PATCH / DELETE.',
                    },
                  ]}
                />

                <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-6">
                  Parametres de requête communs (PostgREST)
                </h3>
                <ParamsTable
                  rows={[
                    {
                      name: 'select',
                      type: 'string',
                      description:
                        'Colonnes a retourner, separées par des virgules. Supporte les jointures : select=*,profiles(*)',
                    },
                    {
                      name: 'order',
                      type: 'string',
                      description:
                        'Tri : column.asc ou column.desc',
                    },
                    {
                      name: 'limit',
                      type: 'integer',
                      description:
                        'Nombre maximum de lignes retournées.',
                    },
                    {
                      name: 'offset',
                      type: 'integer',
                      description:
                        'Nombre de lignes à sauter (pagination).',
                    },
                    {
                      name: 'column=eq.value',
                      type: 'filter',
                      description:
                        'Filtre egalite. Autres operateurs : neq, gt, gte, lt, lte, like, ilike, in, is.',
                    },
                  ]}
                />

                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mt-6">
                  <p className="text-sm text-blue-800">
                    <strong>Row-Level Security (RLS)</strong> : Toutes les tables sont protégées.
                    Les données retournées sont filtrées automatiquement selon le centre de
                    formation (center_id) de l'utilisateur authentifié. Un administrateur
                    ne voit que les données de son centre.
                  </p>
                </div>
              </article>

              {/* -------------------------------------------------------- */}
              {/* AUTHENTICATION */}
              {/* -------------------------------------------------------- */}
              <article id="authentication" ref={ref('authentication')} className="mb-16 scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentification</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  L'authentification utilise Supabase Auth (GoTrue). Envoyez vos identifiants
                  pour obtenir un access_token JWT, valable 1 heure. Le refresh_token permet
                  de renouveler la session.
                </p>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">Se connecter</h3>
                <EndpointUrl method="POST" url={`${BASE_URL}/auth/v1/token?grant_type=password`} />

                <h4 className="text-sm font-semibold text-gray-700 mt-4 mb-2">Corps de la requête</h4>
                <CodeBlock
                  language="json"
                  code={`{
  "email": "admin@mon-centre.com",
  "password": "votre-mot-de-passe"
}`}
                />

                <h4 className="text-sm font-semibold text-gray-700 mt-4 mb-2">Exemple cURL</h4>
                <CodeBlock
                  code={`curl -X POST '${BASE_URL}/auth/v1/token?grant_type=password' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "email": "admin@mon-centre.com",
    "password": "votre-mot-de-passe"
  }'`}
                />

                <h4 className="text-sm font-semibold text-gray-700 mt-4 mb-2">Reponse</h4>
                <CodeBlock
                  language="json"
                  code={`{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "v1.MR...",
  "user": {
    "id": "uuid-utilisateur",
    "email": "admin@mon-centre.com",
    "role": "authenticated"
  }
}`}
                />

                <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-8">
                  Renouveler le token
                </h3>
                <EndpointUrl method="POST" url={`${BASE_URL}/auth/v1/token?grant_type=refresh_token`} />
                <CodeBlock
                  language="json"
                  code={`{
  "refresh_token": "v1.MR..."
}`}
                />

                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mt-6">
                  <p className="text-sm text-amber-800">
                    <strong>Important</strong> : L'access_token expire apres 1 heure.
                    Utilisez le refresh_token pour obtenir un nouveau token sans re-saisir
                    les identifiants.
                  </p>
                </div>
              </article>

              {/* -------------------------------------------------------- */}
              {/* SESSIONS */}
              {/* -------------------------------------------------------- */}
              <article id="sessions" ref={ref('sessions')} className="mb-16 scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Seances</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Les seances de formation sont stockées dans la table{' '}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-600">
                    training_sessions
                  </code>
                  . Chaque seance a un titre, une date/heure, une salle, un formateur et un type
                  (presentiel, en ligne ou hybride).
                </p>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Lister les seances
                </h3>
                <EndpointUrl method="GET" url={`${BASE_URL}/rest/v1/training_sessions`} />

                <h4 className="text-sm font-semibold text-gray-700 mt-4 mb-2">
                  Parametres de filtre utiles
                </h4>
                <ParamsTable
                  rows={[
                    { name: 'center_id', type: 'eq.uuid', description: 'Filtrer par centre de formation.' },
                    { name: 'start_time', type: 'gte.timestamp', description: 'Seances a partir de cette date (ISO 8601).' },
                    { name: 'end_time', type: 'lte.timestamp', description: 'Seances jusqu\'a cette date.' },
                    { name: 'status', type: 'eq.string', description: 'scheduled, in_progress, completed, cancelled.' },
                    { name: 'session_type', type: 'eq.string', description: 'in_person, online, hybrid.' },
                    { name: 'teacher_id', type: 'eq.uuid', description: 'Filtrer par formateur.' },
                    { name: 'room_id', type: 'eq.uuid', description: 'Filtrer par salle.' },
                  ]}
                />

                <h4 className="text-sm font-semibold text-gray-700 mt-4 mb-2">Exemple cURL</h4>
                <CodeBlock
                  code={`curl '${BASE_URL}/rest/v1/training_sessions?select=*,profiles!teacher_id(first_name,last_name),rooms(name)&status=eq.scheduled&order=start_time.asc&limit=20' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer <access_token>'`}
                />

                <h4 className="text-sm font-semibold text-gray-700 mt-4 mb-2">
                  Reponse (exemple)
                </h4>
                <CodeBlock
                  language="json"
                  code={`[
  {
    "id": "a1b2c3d4-...",
    "title": "Mathematiques - Terminale",
    "start_time": "2026-03-15T09:00:00+01:00",
    "end_time": "2026-03-15T11:00:00+01:00",
    "status": "scheduled",
    "session_type": "in_person",
    "teacher_id": "uuid-prof",
    "room_id": "uuid-salle",
    "center_id": "uuid-centre",
    "class_id": "uuid-classe",
    "subject_id": "uuid-matiere",
    "color": "#4f46e5",
    "profiles": {
      "first_name": "Marie",
      "last_name": "Dupont"
    },
    "rooms": {
      "name": "Salle A102"
    }
  }
]`}
                />

                <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-8">
                  Filtrer par plage de dates
                </h3>
                <CodeBlock
                  code={`curl '${BASE_URL}/rest/v1/training_sessions?start_time=gte.2026-03-01T00:00:00&end_time=lte.2026-03-31T23:59:59&order=start_time.asc' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer <access_token>'`}
                />
              </article>

              {/* -------------------------------------------------------- */}
              {/* USERS */}
              {/* -------------------------------------------------------- */}
              <article id="users" ref={ref('users')} className="mb-16 scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Utilisateurs</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Les profils utilisateurs sont dans la table{' '}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-600">
                    profiles
                  </code>
                  . Les rôles disponibles : admin, teacher, student, staff, trainer, coordinator.
                </p>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Lister les utilisateurs
                </h3>
                <EndpointUrl method="GET" url={`${BASE_URL}/rest/v1/profiles`} />

                <ParamsTable
                  rows={[
                    { name: 'center_id', type: 'eq.uuid', description: 'Filtrer par centre.' },
                    { name: 'role', type: 'eq.string', description: 'admin, teacher, student, staff, trainer, coordinator.' },
                    { name: 'is_active', type: 'eq.boolean', description: 'true pour les utilisateurs actifs uniquement.' },
                    { name: 'class_id', type: 'eq.uuid', description: 'Etudiants d\'une classe donnée.' },
                  ]}
                />

                <CodeBlock
                  code={`curl '${BASE_URL}/rest/v1/profiles?select=id,first_name,last_name,email,role,is_active&role=eq.teacher&is_active=eq.true&order=last_name.asc' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer <access_token>'`}
                />

                <CodeBlock
                  language="json"
                  code={`[
  {
    "id": "uuid-prof-1",
    "first_name": "Marie",
    "last_name": "Dupont",
    "email": "marie.dupont@centre.com",
    "role": "teacher",
    "is_active": true
  },
  {
    "id": "uuid-prof-2",
    "first_name": "Pierre",
    "last_name": "Martin",
    "email": "pierre.martin@centre.com",
    "role": "teacher",
    "is_active": true
  }
]`}
                />
              </article>

              {/* -------------------------------------------------------- */}
              {/* ROOMS */}
              {/* -------------------------------------------------------- */}
              <article id="rooms" ref={ref('rooms')} className="mb-16 scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Salles</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Les salles de cours sont dans la table{' '}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-600">
                    rooms
                  </code>
                  . Chaque salle a un nom, une capacité, un type et des équipements.
                </p>

                <EndpointUrl method="GET" url={`${BASE_URL}/rest/v1/rooms`} />

                <CodeBlock
                  code={`curl '${BASE_URL}/rest/v1/rooms?select=id,name,capacity,room_type,equipment&order=name.asc' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer <access_token>'`}
                />

                <CodeBlock
                  language="json"
                  code={`[
  {
    "id": "uuid-salle-1",
    "name": "Salle A102",
    "capacity": 30,
    "room_type": "classroom",
    "equipment": ["projector", "whiteboard", "computer"]
  },
  {
    "id": "uuid-salle-2",
    "name": "Labo Informatique",
    "capacity": 20,
    "room_type": "lab",
    "equipment": ["computers", "projector"]
  }
]`}
                />
              </article>

              {/* -------------------------------------------------------- */}
              {/* ACADEMIC */}
              {/* -------------------------------------------------------- */}
              <article id="academic" ref={ref('academic')} className="mb-16 scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Referentiel academique</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Le referentiel suit la hierarchie :{' '}
                  <strong>Diplome</strong> {'->'} <strong>Programme</strong> {'->'}{' '}
                  <strong>Matiere</strong>. Les classes sont rattachées a un diplôme.
                </p>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">Diplomes</h3>
                <EndpointUrl method="GET" url={`${BASE_URL}/rest/v1/diplomas`} />
                <CodeBlock
                  code={`curl '${BASE_URL}/rest/v1/diplomas?select=id,name,short_name,level&order=name.asc' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer <access_token>'`}
                />

                <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-8">Programmes</h3>
                <EndpointUrl method="GET" url={`${BASE_URL}/rest/v1/programs`} />
                <CodeBlock
                  code={`curl '${BASE_URL}/rest/v1/programs?select=id,name,diploma_id,diplomas(name)&order=name.asc' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer <access_token>'`}
                />

                <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-8">Classes</h3>
                <EndpointUrl method="GET" url={`${BASE_URL}/rest/v1/classes`} />
                <CodeBlock
                  code={`curl '${BASE_URL}/rest/v1/classes?select=id,name,diploma_id,year,max_students,diplomas(name)&order=name.asc' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer <access_token>'`}
                />

                <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-8">Matieres</h3>
                <EndpointUrl method="GET" url={`${BASE_URL}/rest/v1/subjects`} />
                <CodeBlock
                  code={`curl '${BASE_URL}/rest/v1/subjects?select=id,name,code,color,total_hours,program_id,programs(name)&order=name.asc' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer <access_token>'`}
                />

                <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-8">
                  Tables de liaison
                </h3>
                <p className="text-gray-600 mb-3 text-sm">
                  Les associations many-to-many sont accessibles via :
                </p>
                <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 mb-4">
                  <li>
                    <code className="bg-gray-100 px-1 rounded font-mono text-xs">class_subjects</code>{' '}
                    -- matieres d'une classe
                  </li>
                  <li>
                    <code className="bg-gray-100 px-1 rounded font-mono text-xs">teacher_subjects</code>{' '}
                    -- matieres affectées a un professeur
                  </li>
                  <li>
                    <code className="bg-gray-100 px-1 rounded font-mono text-xs">student_subjects</code>{' '}
                    -- inscriptions etudiants aux matieres
                  </li>
                </ul>
                <CodeBlock
                  code={`# Matieres d'une classe specifique
curl '${BASE_URL}/rest/v1/class_subjects?class_id=eq.<uuid>&select=subject_id,subjects(name,code)' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer <access_token>'`}
                />
              </article>

              {/* -------------------------------------------------------- */}
              {/* ATTENDANCE */}
              {/* -------------------------------------------------------- */}
              <article id="attendance" ref={ref('attendance')} className="mb-16 scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Presences</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  La table{' '}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-600">
                    session_attendance
                  </code>{' '}
                  enregistre la presence de chaque etudiant pour chaque seance.
                  Statuts possibles : present, absent, late, excused.
                </p>

                <EndpointUrl method="GET" url={`${BASE_URL}/rest/v1/session_attendance`} />

                <ParamsTable
                  rows={[
                    { name: 'session_id', type: 'eq.uuid', description: 'Presences d\'une seance specifique.' },
                    { name: 'student_id', type: 'eq.uuid', description: 'Historique d\'un etudiant.' },
                    { name: 'status', type: 'eq.string', description: 'present, absent, late, excused.' },
                  ]}
                />

                <CodeBlock
                  code={`curl '${BASE_URL}/rest/v1/session_attendance?session_id=eq.<uuid>&select=*,profiles!student_id(first_name,last_name)' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer <access_token>'`}
                />

                <CodeBlock
                  language="json"
                  code={`[
  {
    "id": "uuid-att-1",
    "session_id": "uuid-seance",
    "student_id": "uuid-etudiant",
    "status": "present",
    "late_minutes": null,
    "excuse_reason": null,
    "marked_at": "2026-03-15T09:05:00+01:00",
    "profiles": {
      "first_name": "Lucas",
      "last_name": "Bernard"
    }
  },
  {
    "id": "uuid-att-2",
    "session_id": "uuid-seance",
    "student_id": "uuid-etudiant-2",
    "status": "late",
    "late_minutes": 15,
    "excuse_reason": null,
    "marked_at": "2026-03-15T09:15:00+01:00",
    "profiles": {
      "first_name": "Emma",
      "last_name": "Petit"
    }
  }
]`}
                />
              </article>

              {/* -------------------------------------------------------- */}
              {/* GRADES */}
              {/* -------------------------------------------------------- */}
              <article id="grades" ref={ref('grades')} className="mb-16 scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Notes et evaluations</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Deux tables : <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-600">evaluations</code>{' '}
                  (examens, devoirs, projets) et{' '}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-600">grades</code>{' '}
                  (notes individuelles). Les types d'evaluation : exam, assignment, project, oral, quiz, continuous.
                </p>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Lister les evaluations
                </h3>
                <EndpointUrl method="GET" url={`${BASE_URL}/rest/v1/evaluations`} />
                <CodeBlock
                  code={`curl '${BASE_URL}/rest/v1/evaluations?select=id,title,type,date,coefficient,max_grade,is_published,class_id,subject_id,subjects(name)&is_published=eq.true&order=date.desc' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer <access_token>'`}
                />

                <CodeBlock
                  language="json"
                  code={`[
  {
    "id": "uuid-eval-1",
    "title": "Examen final - Algebre",
    "type": "exam",
    "date": "2026-03-10",
    "coefficient": 3,
    "max_grade": 20,
    "is_published": true,
    "class_id": "uuid-classe",
    "subject_id": "uuid-matiere",
    "subjects": {
      "name": "Algebre lineaire"
    }
  }
]`}
                />

                <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-8">
                  Notes d'une evaluation
                </h3>
                <EndpointUrl method="GET" url={`${BASE_URL}/rest/v1/grades`} />
                <CodeBlock
                  code={`curl '${BASE_URL}/rest/v1/grades?evaluation_id=eq.<uuid>&select=*,profiles!student_id(first_name,last_name)&order=profiles(last_name).asc' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer <access_token>'`}
                />

                <CodeBlock
                  language="json"
                  code={`[
  {
    "id": "uuid-note-1",
    "evaluation_id": "uuid-eval-1",
    "student_id": "uuid-etudiant",
    "grade": 16.5,
    "is_absent": false,
    "comment": "Tres bon travail",
    "profiles": {
      "first_name": "Lucas",
      "last_name": "Bernard"
    }
  }
]`}
                />
              </article>

              {/* -------------------------------------------------------- */}
              {/* WEBHOOKS / REALTIME */}
              {/* -------------------------------------------------------- */}
              <article id="webhooks" ref={ref('webhooks')} className="mb-16 scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Temps reel (Realtime)
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Anti-Planning utilise Supabase Realtime pour les mises à jour en temps reel.
                  Vous pouvez souscrire aux changements sur n'importe quelle table via WebSocket.
                </p>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Souscrire aux changements
                </h3>
                <p className="text-gray-600 mb-3 text-sm">
                  Utilisez le client JavaScript Supabase pour recevoir les modifications en temps reel :
                </p>
                <CodeBlock
                  language="javascript"
                  code={`import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  '${BASE_URL}',
  '${ANON_KEY}'
)

// Souscrire aux nouvelles seances
const channel = supabase
  .channel('training_sessions_changes')
  .on(
    'postgres_changes',
    {
      event: '*',           // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'training_sessions',
      filter: 'center_id=eq.<votre-center-id>'
    },
    (payload) => {
      console.log('Changement detecte :', payload)
    }
  )
  .subscribe()

// Se desabonner
channel.unsubscribe()`}
                />

                <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-8">
                  Evenements disponibles
                </h3>
                <ParamsTable
                  rows={[
                    { name: 'INSERT', type: 'event', description: 'Nouvelle ligne ajoutée a la table.' },
                    { name: 'UPDATE', type: 'event', description: 'Ligne existante modifiée.' },
                    { name: 'DELETE', type: 'event', description: 'Ligne supprimée.' },
                    { name: '*', type: 'event', description: 'Tous les evenements (INSERT + UPDATE + DELETE).' },
                  ]}
                />

                <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-8">
                  Tables recommandées pour le temps reel
                </h3>
                <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                  <li>
                    <code className="bg-gray-100 px-1 rounded font-mono text-xs">training_sessions</code>{' '}
                    -- modifications du planning
                  </li>
                  <li>
                    <code className="bg-gray-100 px-1 rounded font-mono text-xs">session_attendance</code>{' '}
                    -- marquage des presences
                  </li>
                  <li>
                    <code className="bg-gray-100 px-1 rounded font-mono text-xs">chat_messages</code>{' '}
                    -- messagerie instantanee
                  </li>
                  <li>
                    <code className="bg-gray-100 px-1 rounded font-mono text-xs">in_app_notifications</code>{' '}
                    -- notifications utilisateur
                  </li>
                </ul>

                <div className="bg-emerald-50 border-l-4 border-emerald-400 p-4 rounded-r-lg mt-6">
                  <p className="text-sm text-emerald-800">
                    <strong>Tip</strong> : Pour une integration serveur-a-serveur classique
                    (sans WebSocket), utilisez simplement l'API REST avec des appels periodiques
                    (polling). Le parametre <code className="font-mono">order=created_at.desc&limit=10</code>{' '}
                    permet de recuperer les dernieres modifications efficacement.
                  </p>
                </div>
              </article>

              {/* -------------------------------------------------------- */}
              {/* Rate limits / support */}
              {/* -------------------------------------------------------- */}
              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Limites et support</h3>
                <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
                  <li>
                    <strong>Rate limiting</strong> : Les requêtes sont limitees selon votre plan
                    Supabase. Respectez un maximum de 100 requêtes par seconde.
                  </li>
                  <li>
                    <strong>Pagination</strong> : Utilisez <code className="font-mono bg-gray-100 px-1 rounded text-xs">limit</code>{' '}
                    et <code className="font-mono bg-gray-100 px-1 rounded text-xs">offset</code>{' '}
                    pour paginer les resultats. Maximum 1000 lignes par requête.
                  </li>
                  <li>
                    <strong>Support</strong> : Pour toute question sur l'API, contactez-nous a{' '}
                    <a href="mailto:contact@anti-planning.com" className="text-indigo-600 hover:underline">
                      contact@anti-planning.com
                    </a>
                    .
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}
