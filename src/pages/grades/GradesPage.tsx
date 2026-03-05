/**
 * Page Notes & Evaluations
 * 3 vues selon le role: Teacher / Admin / Student
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  FileBarChart, BookOpen, Award,
  Plus, Eye, EyeOff,
  Filter, Save, X,
  AlertTriangle, BarChart3, TrendingUp,
  Download, Send, Loader2, FileText, CheckCircle,
} from 'lucide-react'
import { isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { FeatureGate } from '@/components/addons/FeatureGate'
import { Button, Badge, Card, CardContent, HelpBanner } from '@/components/ui'
import { useGrades } from '@/hooks/useGrades'
import { useBulletins } from '@/hooks/useBulletins'
import { useStudentContacts } from '@/hooks/useStudentContacts'
import { useAcademicData } from '@/hooks/useAcademicData'
import { useUsers } from '@/hooks/useUsers'
import { useAttendance } from '@/hooks/useAttendance'
import { generateBulletinPDF, generateBulkBulletinPDF, generateBulkBulletinExcel } from '@/utils/export-bulletin'
import { exportClassReportToPDF, exportClassReportToExcel } from '@/utils/export-class-report'
import type { ClassReportStudent } from '@/utils/export-class-report'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Bulletin, StudentBulletin } from '@/types'

// ==================== TYPES ====================

interface Evaluation {
  id: string
  title: string
  subjectId: string
  subjectName: string
  classId: string
  className: string
  date: string
  maxPoints: number
  coefficient: number
  isPublished: boolean
  createdBy: string
}

interface GradeEntry {
  studentId: string
  studentName: string
  grade: number | null
  comment?: string
}

interface StudentGrade {
  subjectName: string
  evaluations: Array<{
    title: string
    grade: number | null
    maxPoints: number
    coefficient: number
    date: string
  }>
  average: number | null
}

interface ClassSubjectAverage {
  className: string
  subjectName: string
  average: number
  studentCount: number
  minGrade: number
  maxGrade: number
}

// ==================== DEMO DATA ====================

const DEMO_EVALUATIONS: Evaluation[] = [
  { id: '1', title: 'DS1 - Algebre lineaire', subjectId: 'sub1', subjectName: 'Mathematiques', classId: 'c1', className: 'BTS SIO 1A', date: '2026-02-15', maxPoints: 20, coefficient: 3, isPublished: true, createdBy: 'Prof. Durand' },
  { id: '2', title: 'TP1 - HTML/CSS', subjectId: 'sub2', subjectName: 'Dev. Web', classId: 'c1', className: 'BTS SIO 1A', date: '2026-02-20', maxPoints: 20, coefficient: 2, isPublished: true, createdBy: 'Prof. Durand' },
  { id: '3', title: 'QCM - Grammaire', subjectId: 'sub3', subjectName: 'Anglais', classId: 'c1', className: 'BTS SIO 1A', date: '2026-02-25', maxPoints: 20, coefficient: 1, isPublished: false, createdBy: 'Prof. Durand' },
  { id: '4', title: 'DS2 - Analyse', subjectId: 'sub1', subjectName: 'Mathematiques', classId: 'c2', className: 'BTS SIO 2A', date: '2026-03-01', maxPoints: 20, coefficient: 3, isPublished: true, createdBy: 'Prof. Durand' },
  { id: '5', title: 'Projet Web React', subjectId: 'sub2', subjectName: 'Dev. Web', classId: 'c2', className: 'BTS SIO 2A', date: '2026-03-03', maxPoints: 20, coefficient: 4, isPublished: false, createdBy: 'Prof. Durand' },
]

const DEMO_GRADE_ENTRIES: GradeEntry[] = [
  { studentId: 's1', studentName: 'Dupont Alice', grade: 16.5 },
  { studentId: 's2', studentName: 'Martin Lucas', grade: 12.0 },
  { studentId: 's3', studentName: 'Bernard Emma', grade: 18.0 },
  { studentId: 's4', studentName: 'Petit Thomas', grade: 8.5 },
  { studentId: 's5', studentName: 'Robert Julie', grade: 14.0 },
  { studentId: 's6', studentName: 'Richard Hugo', grade: null },
  { studentId: 's7', studentName: 'Moreau Lea', grade: 15.5 },
  { studentId: 's8', studentName: 'Simon Nathan', grade: 11.0 },
]

const DEMO_STUDENT_GRADES: StudentGrade[] = [
  {
    subjectName: 'Mathematiques',
    evaluations: [
      { title: 'DS1 - Algebre lineaire', grade: 14.5, maxPoints: 20, coefficient: 3, date: '2026-02-15' },
      { title: 'DS2 - Analyse', grade: 16.0, maxPoints: 20, coefficient: 3, date: '2026-03-01' },
    ],
    average: 15.25,
  },
  {
    subjectName: 'Dev. Web',
    evaluations: [
      { title: 'TP1 - HTML/CSS', grade: 17.0, maxPoints: 20, coefficient: 2, date: '2026-02-20' },
      { title: 'Projet Web React', grade: null, maxPoints: 20, coefficient: 4, date: '2026-03-03' },
    ],
    average: 17.0,
  },
  {
    subjectName: 'Anglais',
    evaluations: [
      { title: 'QCM - Grammaire', grade: 13.0, maxPoints: 20, coefficient: 1, date: '2026-02-25' },
    ],
    average: 13.0,
  },
  {
    subjectName: 'Culture Generale',
    evaluations: [
      { title: 'Dissertation', grade: 11.5, maxPoints: 20, coefficient: 2, date: '2026-02-10' },
    ],
    average: 11.5,
  },
]

const DEMO_CLASS_AVERAGES: ClassSubjectAverage[] = [
  { className: 'BTS SIO 1A', subjectName: 'Mathematiques', average: 13.2, studentCount: 25, minGrade: 5.5, maxGrade: 19.0 },
  { className: 'BTS SIO 1A', subjectName: 'Dev. Web', average: 14.8, studentCount: 25, minGrade: 8.0, maxGrade: 19.5 },
  { className: 'BTS SIO 1A', subjectName: 'Anglais', average: 12.5, studentCount: 25, minGrade: 6.0, maxGrade: 18.5 },
  { className: 'BTS SIO 2A', subjectName: 'Mathematiques', average: 11.8, studentCount: 22, minGrade: 4.0, maxGrade: 18.0 },
  { className: 'BTS SIO 2A', subjectName: 'Dev. Web', average: 15.2, studentCount: 22, minGrade: 9.5, maxGrade: 20.0 },
  { className: 'Licence Pro', subjectName: 'Mathematiques', average: 12.0, studentCount: 18, minGrade: 6.5, maxGrade: 17.5 },
  { className: 'Licence Pro', subjectName: 'Base de donnees', average: 14.5, studentCount: 18, minGrade: 8.0, maxGrade: 19.0 },
]

// ==================== HELPERS ====================

function getGradeColor(grade: number, max: number = 20): string {
  const ratio = grade / max
  if (ratio >= 0.7) return 'text-emerald-600'
  if (ratio >= 0.5) return 'text-amber-600'
  return 'text-red-600'
}

function getGradeBg(grade: number, max: number = 20): string {
  const ratio = grade / max
  if (ratio >= 0.7) return 'bg-emerald-100 dark:bg-emerald-900/30'
  if (ratio >= 0.5) return 'bg-amber-100 dark:bg-amber-900/30'
  return 'bg-red-100 dark:bg-red-900/30'
}

// ==================== TEACHER VIEW ====================

function TeacherView() {
  const [selectedEval, setSelectedEval] = useState<Evaluation | null>(null)
  const [classFilter, setClassFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Grade entry state
  const [grades, setGrades] = useState<GradeEntry[]>(DEMO_GRADE_ENTRIES.map(g => ({ ...g })))

  const classes = useMemo(() => Array.from(new Set(DEMO_EVALUATIONS.map(e => e.className))), [])
  const subjects = useMemo(() => Array.from(new Set(DEMO_EVALUATIONS.map(e => e.subjectName))), [])

  const filtered = useMemo(() => {
    let result = DEMO_EVALUATIONS
    if (classFilter !== 'all') result = result.filter(e => e.className === classFilter)
    if (subjectFilter !== 'all') result = result.filter(e => e.subjectName === subjectFilter)
    return result
  }, [classFilter, subjectFilter])

  const setGrade = (studentId: string, grade: number | null) => {
    setGrades(prev => prev.map(g => g.studentId === studentId ? { ...g, grade } : g))
  }

  const classAvg = useMemo(() => {
    const graded = grades.filter(g => g.grade !== null)
    if (graded.length === 0) return null
    return graded.reduce((sum, g) => sum + (g.grade ?? 0), 0) / graded.length
  }, [grades])

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-neutral-400" />
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Toutes les classes</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            className="text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Toutes les matieres</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <Button leftIcon={Plus} size="sm" onClick={() => setShowCreateModal(true)}>
          Nouvelle evaluation
        </Button>
      </div>

      {/* Two-column layout: eval list + grade entry */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Evaluation list */}
        <div className="lg:col-span-2 space-y-2">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Evaluations ({filtered.length})
          </h3>
          {filtered.map(evalItem => {
            const isSelected = selectedEval?.id === evalItem.id
            return (
              <button
                key={evalItem.id}
                onClick={() => setSelectedEval(evalItem)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">
                    {evalItem.title}
                  </h4>
                  {evalItem.isPublished ? (
                    <Badge variant="success" size="sm" icon={Eye}>Publie</Badge>
                  ) : (
                    <Badge variant="neutral" size="sm" icon={EyeOff}>Brouillon</Badge>
                  )}
                </div>
                <p className="text-xs text-neutral-500">
                  {evalItem.className} &middot; {evalItem.subjectName} &middot; Coeff. {evalItem.coefficient}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {format(new Date(evalItem.date), 'd MMM yyyy', { locale: fr })} &middot; /{evalItem.maxPoints} pts
                </p>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-neutral-500 text-sm">
              Aucune evaluation trouvee.
            </div>
          )}
        </div>

        {/* Grade entry grid */}
        <div className="lg:col-span-3">
          {selectedEval ? (
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {selectedEval.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {selectedEval.className} &middot; /{selectedEval.maxPoints} pts
                    {classAvg !== null && (
                      <> &middot; Moy. classe: <span className={getGradeColor(classAvg)}>{classAvg.toFixed(1)}</span></>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={selectedEval.isPublished ? EyeOff : Eye}
                  >
                    {selectedEval.isPublished ? 'Depublier' : 'Publier'}
                  </Button>
                  <Button size="sm" leftIcon={Save}>
                    Enregistrer
                  </Button>
                </div>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {grades.map(entry => (
                  <div key={entry.studentId} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-medium text-neutral-600 dark:text-neutral-300">
                        {entry.studentName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {entry.studentName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={selectedEval.maxPoints}
                        step={0.5}
                        value={entry.grade ?? ''}
                        onChange={e => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value)
                          setGrade(entry.studentId, val)
                        }}
                        placeholder="-"
                        className={`w-16 text-center text-sm font-semibold border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          entry.grade === null
                            ? 'border-neutral-200 dark:border-neutral-700 text-neutral-400 bg-neutral-50 dark:bg-neutral-800'
                            : `border-neutral-200 dark:border-neutral-700 ${getGradeColor(entry.grade, selectedEval.maxPoints)} bg-white dark:bg-neutral-900`
                        }`}
                      />
                      <span className="text-xs text-neutral-400">/{selectedEval.maxPoints}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                <FileBarChart size={24} className="text-neutral-400" />
              </div>
              <p className="text-neutral-500 text-sm">
                Selectionnez une evaluation pour saisir les notes
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create evaluation modal (simplified) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Nouvelle evaluation
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                <X size={20} className="text-neutral-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Titre</label>
                <input
                  type="text"
                  placeholder="Ex: DS1 - Algebre lineaire"
                  className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Classe</label>
                  <select className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option>BTS SIO 1A</option>
                    <option>BTS SIO 2A</option>
                    <option>Licence Pro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Matiere</label>
                  <select className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option>Mathematiques</option>
                    <option>Dev. Web</option>
                    <option>Anglais</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Bareme</label>
                  <input
                    type="number"
                    defaultValue={20}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Coeff.</label>
                  <input
                    type="number"
                    defaultValue={1}
                    min={1}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Annuler</Button>
              <Button leftIcon={Plus} onClick={() => setShowCreateModal(false)}>Creer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== ADMIN VIEW ====================

function AdminView() {
  const { user } = useAuthContext()
  const [classFilter, setClassFilter] = useState('all')
  const classes = useMemo(() => Array.from(new Set(DEMO_CLASS_AVERAGES.map(a => a.className))), [])

  // Bulletin section
  const { classes: realClasses } = useAcademicData()
  const { users } = useUsers()
  const { computeBulletin } = useGrades()
  const { bulletins, fetchBulletins, generateClassBulletins, sendBulletin } = useBulletins()
  const { fetchContacts, getContactsForStudent } = useStudentContacts()
  const { getAttendanceForClass, computeAttendanceStats } = useAttendance()
  const [bulClassId, setBulClassId] = useState('')
  const [bulPeriodLabel, setBulPeriodLabel] = useState('')
  const [bulPeriodStart, setBulPeriodStart] = useState('')
  const [bulPeriodEnd, setBulPeriodEnd] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showSendModal, setShowSendModal] = useState<Bulletin | null>(null)
  const [sendToContacts, setSendToContacts] = useState(true)

  useEffect(() => { fetchBulletins(); fetchContacts() }, [fetchBulletins, fetchContacts])

  const students = useMemo(() =>
    users.filter(u => u.role === 'student'),
  [users])

  const handleGenerateBulletins = useCallback(async () => {
    if (!bulClassId || !bulPeriodLabel || !bulPeriodStart || !bulPeriodEnd) return
    setGenerating(true)
    try {
      // Generate for all students — computeBulletin filters by classId internally
      const classStudents = students
      const selectedClass = realClasses.find(c => c.id === bulClassId)
      const className = selectedClass?.name || 'Classe'

      // Compute bulletins for all students
      const studentsData: { studentId: string; bulletin: StudentBulletin }[] = []
      for (const st of classStudents) {
        const bul = await computeBulletin(st.id, bulClassId, `${st.firstName} ${st.lastName}`, className)
        if (bul && bul.subjects.length > 0) {
          studentsData.push({ studentId: st.id, bulletin: bul })
        }
      }

      if (studentsData.length === 0) {
        const toast = (await import('react-hot-toast')).default
        toast.error('Aucun bulletin à générer (pas de notes publiées)')
        return
      }

      // Compute class ranks
      const sorted = [...studentsData]
        .filter(s => s.bulletin.generalAverage != null)
        .sort((a, b) => (b.bulletin.generalAverage ?? 0) - (a.bulletin.generalAverage ?? 0))
      sorted.forEach((s, i) => { s.bulletin.classRank = i + 1 })

      await generateClassBulletins(bulClassId, bulPeriodLabel, bulPeriodStart, bulPeriodEnd, studentsData)
    } finally {
      setGenerating(false)
    }
  }, [bulClassId, bulPeriodLabel, bulPeriodStart, bulPeriodEnd, students, realClasses, computeBulletin, generateClassBulletins])

  const handleSendBulletin = useCallback(async (bul: Bulletin) => {
    const student = users.find(u => u.id === bul.studentId)
    if (!student) return
    const recipients: { email: string; name: string; type: 'student' | 'contact' }[] = [
      { email: student.email, name: `${student.firstName} ${student.lastName}`, type: 'student' },
    ]
    if (sendToContacts) {
      const sc = getContactsForStudent(bul.studentId).filter(c => c.receiveBulletins)
      for (const c of sc) {
        recipients.push({ email: c.email, name: `${c.firstName} ${c.lastName}`, type: 'contact' })
      }
    }
    await sendBulletin(bul.id, recipients, {
      studentName: bul.bulletinData.studentName,
      periodLabel: bul.periodLabel,
      generalAverage: bul.generalAverage,
      classRank: bul.classRank,
    })
    setShowSendModal(null)
  }, [users, sendToContacts, getContactsForStudent, sendBulletin])

  const handleDownloadPDF = useCallback((bul: Bulletin) => {
    const centerName = user?.establishmentId ? 'Mon Centre' : 'Centre'
    const doc = generateBulletinPDF(bul.bulletinData, {
      centerName,
      periodLabel: bul.periodLabel,
      periodStart: bul.periodStart,
      periodEnd: bul.periodEnd,
    })
    doc.save(`bulletin_${bul.bulletinData.studentName.replace(/\s+/g, '_')}_${bul.periodLabel.replace(/\s+/g, '_')}.pdf`)
  }, [user?.establishmentId])

  const filtered = useMemo(() => {
    if (classFilter === 'all') return DEMO_CLASS_AVERAGES
    return DEMO_CLASS_AVERAGES.filter(a => a.className === classFilter)
  }, [classFilter])

  const globalAvg = useMemo(() => {
    if (filtered.length === 0) return 0
    return filtered.reduce((sum, a) => sum + a.average, 0) / filtered.length
  }, [filtered])

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <BarChart3 size={20} className="text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Moyenne generale</p>
                <p className={`text-2xl font-bold ${getGradeColor(globalAvg)}`}>{globalAvg.toFixed(1)}/20</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Meilleure matiere</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {filtered.length > 0
                    ? filtered.reduce((best, a) => a.average > best.average ? a : best, filtered[0]).subjectName
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <FileBarChart size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Evaluations</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {DEMO_EVALUATIONS.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-neutral-400" />
        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          className="text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Toutes les classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Averages table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Classe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Matiere</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Effectif</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Moy.</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Min</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Max</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.map((row, idx) => (
                <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{row.className}</td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{row.subjectName}</td>
                  <td className="px-4 py-3 text-center text-neutral-500">{row.studentCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${getGradeColor(row.average)}`}>{row.average.toFixed(1)}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-red-600 font-medium">{row.minGrade.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center text-emerald-600 font-medium">{row.maxGrade.toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full w-24 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            row.average >= 14 ? 'bg-emerald-500' : row.average >= 10 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${(row.average / 20) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bulletins Section ── */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <FileText size={18} className="text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Bulletins de notes</h2>
        </div>

        {/* Generate form */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Classe</label>
                <select value={bulClassId} onChange={e => setBulClassId(e.target.value)}
                  className="w-full text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2">
                  <option value="">Choisir...</option>
                  {realClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Periode</label>
                <input type="text" value={bulPeriodLabel} onChange={e => setBulPeriodLabel(e.target.value)}
                  placeholder="Semestre 1 2025-2026"
                  className="w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Debut</label>
                <input type="date" value={bulPeriodStart} onChange={e => setBulPeriodStart(e.target.value)}
                  className="w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Fin</label>
                <input type="date" value={bulPeriodEnd} onChange={e => setBulPeriodEnd(e.target.value)}
                  className="w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900" />
              </div>
              <Button
                onClick={handleGenerateBulletins}
                disabled={!bulClassId || !bulPeriodLabel || !bulPeriodStart || !bulPeriodEnd || generating}
                leftIcon={generating ? Loader2 : FileBarChart}
                size="sm"
              >
                {generating ? 'Generation...' : 'Generer bulletins'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulletins list */}
        {bulletins.length > 0 && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {bulletins.map(bul => (
                <div key={bul.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <FileText size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {bul.bulletinData.studentName}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {bul.periodLabel} &middot; Moy: {bul.generalAverage?.toFixed(2) ?? '-'}/20
                        {bul.classRank && ` &middot; Rang: ${bul.classRank}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {bul.sentAt ? (
                      <Badge variant="success" size="sm" icon={CheckCircle}>Envoye</Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">Non envoye</Badge>
                    )}
                    <Button variant="ghost" size="sm" leftIcon={Download} onClick={() => handleDownloadPDF(bul)}>
                      PDF
                    </Button>
                    {!bul.sentAt && (
                      <Button variant="secondary" size="sm" leftIcon={Send} onClick={() => setShowSendModal(bul)}>
                        Envoyer
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bulk export buttons */}
        {bulletins.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" leftIcon={Download} onClick={() => {
              const centerName = user?.establishmentId ? 'Mon Centre' : 'Centre'
              const first = bulletins[0]
              const opts = { centerName, periodLabel: first.periodLabel, periodStart: first.periodStart, periodEnd: first.periodEnd }
              const doc = generateBulkBulletinPDF(bulletins.map(b => b.bulletinData), opts)
              doc.save(`bulletins_${first.periodLabel.replace(/\s+/g, '_')}.pdf`)
            }}>
              Tous les bulletins (PDF)
            </Button>
            <Button variant="secondary" leftIcon={Download} onClick={() => {
              const centerName = user?.establishmentId ? 'Mon Centre' : 'Centre'
              const first = bulletins[0]
              generateBulkBulletinExcel(bulletins.map(b => b.bulletinData), {
                centerName, periodLabel: first.periodLabel, periodStart: first.periodStart, periodEnd: first.periodEnd,
              })
            }}>
              Tous les bulletins (Excel)
            </Button>
            <Button variant="secondary" leftIcon={BarChart3} onClick={async () => {
              const first = bulletins[0]
              const classId = first.classId
              const className = first.bulletinData.className
              const centerName = user?.establishmentId ? 'Mon Centre' : 'Centre'
              // Build report data
              const attRecords = await getAttendanceForClass(classId)
              const attStats = computeAttendanceStats(attRecords)
              const reportStudents: ClassReportStudent[] = bulletins.map(b => {
                const att = attStats.find(a => a.studentId === b.studentId)
                return {
                  name: b.bulletinData.studentName,
                  average: b.generalAverage,
                  rank: b.classRank,
                  attendanceRate: att?.attendanceRate ?? null,
                  present: att?.present ?? 0,
                  absent: att?.absent ?? 0,
                  late: att?.late ?? 0,
                  excused: att?.excused ?? 0,
                  totalSessions: att?.totalSessions ?? 0,
                }
              })
              const classAvg = bulletins.filter(b => b.generalAverage != null).length > 0
                ? bulletins.reduce((s, b) => s + (b.generalAverage ?? 0), 0) / bulletins.filter(b => b.generalAverage != null).length
                : null
              const classAtt = reportStudents.filter(s => s.attendanceRate != null).length > 0
                ? Math.round(reportStudents.reduce((s, st) => s + (st.attendanceRate ?? 0), 0) / reportStudents.filter(s => s.attendanceRate != null).length)
                : null
              const reportData = { className, centerName, periodLabel: first.periodLabel, students: reportStudents, classAverage: classAvg != null ? Math.round(classAvg * 100) / 100 : null, classAttendanceRate: classAtt }
              const doc = exportClassReportToPDF(reportData)
              doc.save(`bilan_classe_${className.replace(/\s+/g, '_')}.pdf`)
            }}>
              Bilan de classe (PDF)
            </Button>
            <Button variant="secondary" leftIcon={BarChart3} onClick={async () => {
              const first = bulletins[0]
              const classId = first.classId
              const className = first.bulletinData.className
              const centerName = user?.establishmentId ? 'Mon Centre' : 'Centre'
              const attRecords = await getAttendanceForClass(classId)
              const attStats = computeAttendanceStats(attRecords)
              const reportStudents: ClassReportStudent[] = bulletins.map(b => {
                const att = attStats.find(a => a.studentId === b.studentId)
                return {
                  name: b.bulletinData.studentName,
                  average: b.generalAverage,
                  rank: b.classRank,
                  attendanceRate: att?.attendanceRate ?? null,
                  present: att?.present ?? 0,
                  absent: att?.absent ?? 0,
                  late: att?.late ?? 0,
                  excused: att?.excused ?? 0,
                  totalSessions: att?.totalSessions ?? 0,
                }
              })
              const classAvg = bulletins.filter(b => b.generalAverage != null).length > 0
                ? bulletins.reduce((s, b) => s + (b.generalAverage ?? 0), 0) / bulletins.filter(b => b.generalAverage != null).length
                : null
              const classAtt = reportStudents.filter(s => s.attendanceRate != null).length > 0
                ? Math.round(reportStudents.reduce((s, st) => s + (st.attendanceRate ?? 0), 0) / reportStudents.filter(s => s.attendanceRate != null).length)
                : null
              await exportClassReportToExcel({ className, centerName, periodLabel: first.periodLabel, students: reportStudents, classAverage: classAvg != null ? Math.round(classAvg * 100) / 100 : null, classAttendanceRate: classAtt })
            }}>
              Bilan de classe (Excel)
            </Button>
          </div>
        )}
      </div>

      {/* Send bulletin modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSendModal(null)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Envoyer le bulletin
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
              Bulletin de <strong>{showSendModal.bulletinData.studentName}</strong> — {showSendModal.periodLabel}
            </p>
            <div className="space-y-3 mb-4">
              <p className="text-xs text-neutral-500">Destinataires :</p>
              <p className="text-sm">- {showSendModal.bulletinData.studentName} (etudiant)</p>
              {sendToContacts && getContactsForStudent(showSendModal.studentId)
                .filter(c => c.receiveBulletins)
                .map(c => (
                  <p key={c.id} className="text-sm">- {c.firstName} {c.lastName} ({c.relationship})</p>
                ))}
            </div>
            <label className="flex items-center gap-2 text-sm mb-4">
              <input type="checkbox" checked={sendToContacts} onChange={e => setSendToContacts(e.target.checked)}
                className="rounded border-neutral-300" />
              Envoyer aussi aux contacts
            </label>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowSendModal(null)}>Annuler</Button>
              <Button leftIcon={Send} onClick={() => handleSendBulletin(showSendModal)}>Envoyer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== STUDENT VIEW (BULLETIN) ====================

function StudentView() {
  const { user } = useAuthContext()
  const { bulletins, fetchBulletins } = useBulletins()

  useEffect(() => {
    if (user?.id) fetchBulletins({ studentId: user.id })
  }, [user?.id, fetchBulletins])

  const handleDownloadStudentPDF = useCallback((bul: Bulletin) => {
    const doc = generateBulletinPDF(bul.bulletinData, {
      centerName: 'Mon Centre',
      periodLabel: bul.periodLabel,
      periodStart: bul.periodStart,
      periodEnd: bul.periodEnd,
    })
    doc.save(`bulletin_${bul.periodLabel.replace(/\s+/g, '_')}.pdf`)
  }, [])

  const generalAvg = useMemo(() => {
    const withGrade = DEMO_STUDENT_GRADES.filter(g => g.average !== null)
    if (withGrade.length === 0) return null
    // weighted average using number of evaluations as proxy for coefficients
    const totalCoeff = withGrade.reduce((sum, g) => sum + g.evaluations.filter(e => e.grade !== null).reduce((s, e) => s + e.coefficient, 0), 0)
    const weightedSum = withGrade.reduce((sum, g) => {
      const subjectEvals = g.evaluations.filter(e => e.grade !== null)
      return sum + subjectEvals.reduce((s, e) => s + (e.grade ?? 0) * e.coefficient, 0)
    }, 0)
    return totalCoeff > 0 ? weightedSum / totalCoeff : null
  }, [])

  return (
    <div className="space-y-6">
      {/* General average card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Award size={28} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Moyenne generale</p>
                <p className={`text-3xl font-bold ${generalAvg !== null ? getGradeColor(generalAvg) : 'text-neutral-400'}`}>
                  {generalAvg !== null ? `${generalAvg.toFixed(2)}/20` : '-'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral-500">{DEMO_STUDENT_GRADES.length} matieres</p>
              <p className="text-sm text-neutral-500">
                {DEMO_STUDENT_GRADES.reduce((sum, g) => sum + g.evaluations.length, 0)} evaluations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject cards */}
      <div className="space-y-4">
        {DEMO_STUDENT_GRADES.map((subject, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
          >
            {/* Subject header */}
            <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  subject.average !== null ? getGradeBg(subject.average) : 'bg-neutral-100 dark:bg-neutral-800'
                }`}>
                  <BookOpen size={16} className={subject.average !== null ? getGradeColor(subject.average) : 'text-neutral-400'} />
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {subject.subjectName}
                </h3>
              </div>
              <div className={`text-lg font-bold ${
                subject.average !== null ? getGradeColor(subject.average) : 'text-neutral-400'
              }`}>
                {subject.average !== null ? `${subject.average.toFixed(1)}/20` : '-'}
              </div>
            </div>

            {/* Evaluations */}
            <div className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {subject.evaluations.map((evalItem, eIdx) => (
                <div key={eIdx} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{evalItem.title}</p>
                    <p className="text-xs text-neutral-400">
                      {format(new Date(evalItem.date), 'd MMM yyyy', { locale: fr })} &middot; Coeff. {evalItem.coefficient}
                    </p>
                  </div>
                  <div className="text-right">
                    {evalItem.grade !== null ? (
                      <span className={`text-sm font-bold ${getGradeColor(evalItem.grade, evalItem.maxPoints)}`}>
                        {evalItem.grade}/{evalItem.maxPoints}
                      </span>
                    ) : (
                      <Badge variant="neutral" size="sm">Non publie</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mes bulletins */}
      {bulletins.length > 0 && (
        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6 space-y-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-indigo-600" />
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Mes bulletins</h2>
          </div>
          {bulletins.map(bul => (
            <div key={bul.id} className="flex items-center justify-between bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{bul.periodLabel}</p>
                <p className="text-xs text-neutral-500">
                  Moyenne : {bul.generalAverage?.toFixed(2) ?? '-'}/20
                  {bul.classRank && ` — Rang : ${bul.classRank}`}
                </p>
              </div>
              <Button variant="secondary" size="sm" leftIcon={Download} onClick={() => handleDownloadStudentPDF(bul)}>
                Telecharger PDF
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== MAIN PAGE ====================

export default function GradesPage() {
  const { user } = useAuthContext()
  const role = user?.role

  return (
    <FeatureGate feature="grades">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <FileBarChart size={22} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Notes & Evaluations
            </h1>
            <p className="text-sm text-neutral-500">
              {role === 'teacher'
                ? 'Gerez vos evaluations et saisissez les notes'
                : role === 'student'
                  ? 'Consultez vos notes et votre bulletin'
                  : 'Vue d\'ensemble des moyennes par classe et matiere'}
            </p>
          </div>
        </div>

        <HelpBanner storageKey={role === 'teacher' ? 'teacher-grades' : role === 'student' ? 'student-grades' : 'admin-grades'}>
          {role === 'teacher'
            ? "Créez des évaluations (examens, devoirs, projets…) et saisissez les notes. Publiez-les pour qu'elles soient visibles par les étudiants. Le coefficient pondère automatiquement la moyenne."
            : role === 'student'
              ? "Consultez vos notes et moyennes par matière. Les évaluations publiées par vos professeurs apparaissent ici avec leur coefficient. Téléchargez vos bulletins de période en PDF."
              : "Consultez les moyennes par classe et par matière. Générez les bulletins de période, envoyez-les aux étudiants et à leurs contacts, ou téléchargez-les en PDF."}
        </HelpBanner>

        {/* Demo mode banner */}
        {isDemoMode && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle size={16} />
            Mode demonstration : les donnees affichees sont fictives.
          </div>
        )}

        {/* Role-based view */}
        {role === 'teacher' && <TeacherView />}
        {role === 'student' && <StudentView />}
        {(role === 'admin' || role === 'super_admin' || role === 'staff') && <AdminView />}
        {!role && <AdminView />}
      </div>
    </FeatureGate>
  )
}
