import { useState, useMemo, useEffect } from 'react'
import { useAcademicData } from '@/hooks/useAcademicData'
import { useCenterSettings } from '@/hooks/useCenterSettings'
import { Button, LoadingSpinner, HelpBanner } from '@/components/ui'
import { GraduationCap, BookOpen, Layers, RefreshCw, UserCheck, FolderOpen, Upload } from 'lucide-react'
import { ProgramsTab } from './tabs/ProgramsTab'
import { DiplomasTab } from './tabs/DiplomasTab'
import { ClassesTab } from './tabs/ClassesTab'
import { SubjectsTab } from './tabs/SubjectsTab'
import { TeachersTab } from './tabs/TeachersTab'
import { CoursTab } from './tabs/CoursTab'
import { ImportModal } from '@/components/import/ImportModal'
import { navigateTo } from '@/utils/navigation'
import type { ImportType } from '@/utils/import-validators'

type Tab = 'programs' | 'diplomas' | 'classes' | 'subjects' | 'teachers' | 'cours'

const normalTabs: { key: Tab; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'diplomas', label: 'Diplômes', icon: GraduationCap },
  { key: 'programs', label: 'Programmes', icon: FolderOpen },
  { key: 'classes', label: 'Classes', icon: Layers },
  { key: 'subjects', label: 'Matières', icon: BookOpen },
  { key: 'teachers', label: 'Professeurs', icon: UserCheck },
]

const mergedTabs: { key: Tab; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'diplomas', label: 'Diplômes', icon: GraduationCap },
  { key: 'programs', label: 'Programmes', icon: FolderOpen },
  { key: 'cours', label: 'Cours', icon: BookOpen },
  { key: 'teachers', label: 'Professeurs', icon: UserCheck },
]

const TAB_IMPORT_TYPE: Partial<Record<Tab, ImportType>> = {
  classes: 'classes',
  subjects: 'subjects',
  teachers: 'teachers',
}

function AcademicPage() {
  const [activeTab, setActiveTab] = useState<Tab>('diplomas')
  const [showImport, setShowImport] = useState(false)
  const { settings } = useCenterSettings()
  const isMergedMode = !!settings.merge_class_subject
  const {
    programs, diplomas, classes, subjects, teachers, isLoading,
    programOptions, diplomaOptions,
    getSubjectIdsForClass,
    subjectOptionsByDiploma,
    programOptionsByDiploma,
    createProgram, updateProgram, deleteProgram,
    createDiploma, updateDiploma, deleteDiploma,
    createClass, updateClass, deleteClass,
    createSubject, updateSubject, deleteSubject,
    createTeacher, updateTeacher, deleteTeacher,
    setClassSubjectLinks,
    setTeacherSubjectLinks,
    getSubjectIdsForTeacher,
    classStudents,
    toggleDispensation,
    getStudentSubjectsForClass,
    coursList, createCours, updateCours, deleteCours,
    refreshAll,
  } = useAcademicData()

  const tabs = isMergedMode ? mergedTabs : normalTabs

  // Reset tab when mode changes and current tab is hidden
  useEffect(() => {
    if (isMergedMode && (activeTab === 'classes' || activeTab === 'subjects')) {
      setActiveTab('cours')
    }
    if (!isMergedMode && activeTab === 'cours') {
      setActiveTab('classes')
    }
  }, [isMergedMode])

  const subjectOptions = useMemo(
    () => subjects.map(s => ({ value: s.id, label: `${s.name}${s.code ? ` (${s.code})` : ''}` })),
    [subjects],
  )

  const importContext = useMemo(() => ({
    classNames: classes.map(c => c.name),
    diplomaNames: diplomas.map(d => d.title),
    programNames: programs.map(p => p.name),
    classMap: new Map(classes.map(c => [c.name.toLowerCase(), c.id])),
    diplomaMap: new Map(diplomas.map(d => [d.title.toLowerCase(), d.id])),
    programMap: new Map(programs.map(p => [p.name.toLowerCase(), p.id])),
  }), [classes, diplomas, programs])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Chargement du référentiel..." />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Référentiel académique</h1>
          <p className="text-neutral-500 mt-1">
            {programs.length} programme{programs.length > 1 ? 's' : ''}, {diplomas.length} diplôme{diplomas.length > 1 ? 's' : ''},{' '}
            {isMergedMode
              ? `${coursList.length} cours`
              : `${classes.length} classe${classes.length > 1 ? 's' : ''}, ${subjects.length} matière${subjects.length > 1 ? 's' : ''}`
            }, {teachers.length} professeur{teachers.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          {TAB_IMPORT_TYPE[activeTab] && (
            <Button variant="secondary" leftIcon={Upload} onClick={() => setShowImport(true)}>
              Importer
            </Button>
          )}
          <Button variant="secondary" leftIcon={RefreshCw} onClick={refreshAll}>
            Actualiser
          </Button>
        </div>
      </div>

      <HelpBanner storageKey="admin-academic">
        Le référentiel structure votre offre de formation : Diplômes → Programmes → Matières. Associez ensuite les matières aux classes et aux professeurs. Cette hiérarchie alimente le calendrier et les bulletins.
        <span className="flex gap-2 mt-2">
          <button onClick={() => navigateTo('/users')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Gérer les utilisateurs →</button>
          <button onClick={() => navigateTo('/planning')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Voir le planning →</button>
        </span>
      </HelpBanner>

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 mb-6">
        <nav className="flex space-x-1 -mb-px">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:border-neutral-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'diplomas' && (
        <DiplomasTab
          diplomas={diplomas}
          programs={programs}
          createDiploma={createDiploma}
          updateDiploma={updateDiploma}
          deleteDiploma={deleteDiploma}
        />
      )}
      {activeTab === 'programs' && (
        <ProgramsTab
          programs={programs}
          subjects={subjects}
          diplomaOptions={diplomaOptions}
          createProgram={createProgram}
          updateProgram={updateProgram}
          deleteProgram={deleteProgram}
        />
      )}
      {activeTab === 'classes' && (
        <ClassesTab
          classes={classes}
          diplomas={diplomas}
          subjects={subjects}
          diplomaOptions={diplomaOptions}
          subjectOptionsByDiploma={subjectOptionsByDiploma}
          getSubjectIdsForClass={getSubjectIdsForClass}
          createClass={createClass}
          updateClass={updateClass}
          deleteClass={deleteClass}
          setClassSubjectLinks={setClassSubjectLinks}
          classStudents={classStudents}
          toggleDispensation={toggleDispensation}
          getStudentSubjectsForClass={getStudentSubjectsForClass}
        />
      )}
      {activeTab === 'subjects' && (
        <SubjectsTab
          subjects={subjects}
          programs={programs}
          programOptions={programOptions}
          createSubject={createSubject}
          updateSubject={updateSubject}
          deleteSubject={deleteSubject}
        />
      )}
      {activeTab === 'cours' && (
        <CoursTab
          coursList={coursList}
          diplomas={diplomas}
          programs={programs}
          diplomaOptions={diplomaOptions}
          programOptionsByDiploma={programOptionsByDiploma}
          createCours={createCours}
          updateCours={updateCours}
          deleteCours={deleteCours}
        />
      )}
      {activeTab === 'teachers' && (
        <TeachersTab
          teachers={teachers}
          subjects={subjects}
          subjectOptions={subjectOptions}
          getSubjectIdsForTeacher={getSubjectIdsForTeacher}
          createTeacher={createTeacher}
          updateTeacher={updateTeacher}
          deleteTeacher={deleteTeacher}
          setTeacherSubjectLinks={setTeacherSubjectLinks}
        />
      )}

      {/* Import Modal */}
      {TAB_IMPORT_TYPE[activeTab] && (
        <ImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          type={TAB_IMPORT_TYPE[activeTab]!}
          context={importContext}
          onComplete={refreshAll}
        />
      )}
    </div>
  )
}

export default AcademicPage
