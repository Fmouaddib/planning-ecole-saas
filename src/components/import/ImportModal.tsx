/**
 * Import modal — 4 steps: Upload → Preview → Execute → Report
 */
import { useState, useRef, useMemo } from 'react'
import { Modal, ModalFooter, Button, Badge } from '@/components/ui'
import { Upload, AlertTriangle, CheckCircle, Download, X } from 'lucide-react'
import { parseFile, type ParseResult } from '@/utils/import-parser'
import { validateImport, type ImportType, type ValidationResult } from '@/utils/import-validators'
import { executeImport, type ImportResult } from '@/utils/import-executor'
import { downloadTemplate, type TemplateReferenceData } from '@/utils/import-templates'
import { useAuthContext } from '@/contexts/AuthContext'
import { isDemoMode } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  type: ImportType
  context?: {
    classNames?: string[]
    diplomaNames?: string[]
    programNames?: string[]
    subjectNames?: string[]
    roomNames?: string[]
    teacherEmails?: string[]
    sessionTypeValues?: string[]
    classMap?: Map<string, string>
    diplomaMap?: Map<string, string>
    programMap?: Map<string, string>
    subjectMap?: Map<string, string>
    roomMap?: Map<string, string>
    teacherEmailMap?: Map<string, string>
  }
  referenceData?: TemplateReferenceData
  onComplete?: () => void
}

type Step = 'upload' | 'preview' | 'executing' | 'report'

const TYPE_LABELS: Record<ImportType, string> = {
  students: 'étudiants',
  teachers: 'professeurs',
  subjects: 'matières',
  classes: 'classes',
  sessions: 'séances',
}

export function ImportModal({ isOpen, onClose, type, context, referenceData, onComplete }: ImportModalProps) {
  const { user } = useAuthContext()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const reset = () => {
    setStep('upload')
    setParseResult(null)
    setValidation(null)
    setImportResult(null)
    setIsProcessing(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = async (file: File) => {
    setIsProcessing(true)
    try {
      const parsed = await parseFile(file)
      setParseResult(parsed)
      const validated = validateImport(type, parsed.rows, parsed.headers, context)
      setValidation(validated)
      setStep('preview')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de lecture du fichier')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleExecute = async () => {
    if (!validation || !user?.establishmentId) return
    if (isDemoMode) { toast.error('Import impossible en mode démo'); return }
    setStep('executing')
    setIsProcessing(true)
    try {
      const result = await executeImport(type, validation.rows, {
        centerId: user.establishmentId,
        userId: user.id,
        classMap: context?.classMap,
        programMap: context?.programMap,
        diplomaMap: context?.diplomaMap,
        subjectMap: context?.subjectMap,
        roomMap: context?.roomMap,
        teacherEmailMap: context?.teacherEmailMap,
      })
      setImportResult(result)
      setStep('report')
      if (result.success > 0) onComplete?.()
    } catch {
      toast.error('Erreur lors de l\'import')
      setStep('preview')
    } finally {
      setIsProcessing(false)
    }
  }

  const statusCounts = useMemo(() => {
    if (!validation) return { valid: 0, error: 0, warning: 0 }
    return {
      valid: validation.validCount - validation.warningCount,
      error: validation.errorCount,
      warning: validation.warningCount,
    }
  }, [validation])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Importer des ${TYPE_LABELS[type]}`} size="lg">
      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-neutral-300 dark:border-neutral-600'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload size={40} className="mx-auto text-neutral-400 mb-3" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Glissez votre fichier ici
            </p>
            <p className="text-xs text-neutral-500 mb-3">ou</p>
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              Parcourir
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            <p className="text-xs text-neutral-400 mt-3">Formats: .csv, .xlsx</p>
          </div>
          <button
            onClick={() => downloadTemplate(type, referenceData)}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <Download size={14} />
            Télécharger le modèle {TYPE_LABELS[type]}
          </button>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && validation && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="success">{statusCounts.valid} valide{statusCounts.valid > 1 ? 's' : ''}</Badge>
            {statusCounts.warning > 0 && <Badge variant="warning">{statusCounts.warning} avertissement{statusCounts.warning > 1 ? 's' : ''}</Badge>}
            {statusCounts.error > 0 && <Badge variant="error">{statusCounts.error} erreur{statusCounts.error > 1 ? 's' : ''}</Badge>}
            <span className="text-xs text-neutral-500">
              {parseResult?.fileName} — {validation.rows.length} ligne{validation.rows.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="max-h-72 overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
            <table className="w-full text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-neutral-500">#</th>
                  <th className="px-2 py-2 text-left font-medium text-neutral-500">Statut</th>
                  {parseResult?.headers.map(h => (
                    <th key={h} className="px-2 py-2 text-left font-medium text-neutral-500">{h}</th>
                  ))}
                  <th className="px-2 py-2 text-left font-medium text-neutral-500">Messages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {validation.rows.map(row => (
                  <tr key={row.rowIndex} className={
                    row.status === 'error' ? 'bg-error-50/50 dark:bg-error-900/10' :
                    row.status === 'warning' ? 'bg-warning-50/50 dark:bg-warning-900/10' : ''
                  }>
                    <td className="px-2 py-1.5 text-neutral-400">{row.rowIndex}</td>
                    <td className="px-2 py-1.5">
                      {row.status === 'valid' && <CheckCircle size={14} className="text-success-500" />}
                      {row.status === 'warning' && <AlertTriangle size={14} className="text-warning-500" />}
                      {row.status === 'error' && <X size={14} className="text-error-500" />}
                    </td>
                    {parseResult?.headers.map(h => {
                      const originalValue = row.data[h] || row.data[h.toLowerCase().replace(/\s+/g, '_')] || ''
                      return <td key={h} className="px-2 py-1.5 text-neutral-700 dark:text-neutral-300 max-w-[120px] truncate">{originalValue}</td>
                    })}
                    <td className="px-2 py-1.5 text-[11px]">
                      {row.errors.map((e, i) => <span key={i} className="text-error-600 block">{e}</span>)}
                      {row.warnings.map((w, i) => <span key={i} className="text-warning-600 block">{w}</span>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isDemoMode && (
            <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg p-3 text-xs text-warning-700 dark:text-warning-400">
              <AlertTriangle size={14} className="inline mr-1" />
              L'exécution de l'import est désactivée en mode démo.
            </div>
          )}
        </div>
      )}

      {/* Step 3: Executing */}
      {step === 'executing' && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full mb-4" />
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Import en cours...</p>
          <p className="text-xs text-neutral-500 mt-1">Ne fermez pas cette fenêtre</p>
        </div>
      )}

      {/* Step 4: Report */}
      {step === 'report' && importResult && (
        <div className="space-y-4">
          <div className="text-center py-4">
            {importResult.failed === 0 ? (
              <CheckCircle size={48} className="mx-auto text-success-500 mb-3" />
            ) : (
              <AlertTriangle size={48} className="mx-auto text-warning-500 mb-3" />
            )}
            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Import terminé
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{importResult.total}</p>
              <p className="text-xs text-neutral-500">Total</p>
            </div>
            <div className="bg-success-50 dark:bg-success-900/20 rounded-lg p-3">
              <p className="text-2xl font-bold text-success-600">{importResult.success}</p>
              <p className="text-xs text-success-700">Réussis</p>
            </div>
            <div className="bg-error-50 dark:bg-error-900/20 rounded-lg p-3">
              <p className="text-2xl font-bold text-error-600">{importResult.failed}</p>
              <p className="text-xs text-error-700">Échecs</p>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <div className="max-h-40 overflow-auto rounded-lg border border-error-200 dark:border-error-800 p-3">
              {importResult.errors.map((e, i) => (
                <p key={i} className="text-xs text-error-600 py-0.5">
                  Ligne {e.rowIndex}: {e.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <ModalFooter>
        {step === 'upload' && (
          <Button variant="secondary" onClick={handleClose}>Annuler</Button>
        )}
        {step === 'preview' && (
          <>
            <Button variant="secondary" onClick={reset}>Retour</Button>
            <Button
              onClick={handleExecute}
              disabled={validation?.validCount === 0 || isDemoMode}
              isLoading={isProcessing}
            >
              Importer {validation?.validCount || 0} ligne{(validation?.validCount || 0) > 1 ? 's' : ''}
            </Button>
          </>
        )}
        {step === 'report' && (
          <>
            <Button variant="secondary" onClick={reset}>Nouvel import</Button>
            <Button onClick={handleClose}>Fermer</Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  )
}
