/**
 * Hook for student contacts management (parents, tuteurs, etc.)
 */
import { useState, useCallback } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { transformStudentContact } from '@/utils/transforms'
import type { StudentContact, ContactRelationship } from '@/types'
import toast from 'react-hot-toast'

const DEMO_CONTACTS: StudentContact[] = [
  {
    id: 'demo-contact-1', studentId: 'demo-student-1', centerId: 'demo-center',
    firstName: 'Marie', lastName: 'Dupont', email: 'marie.dupont@email.com',
    phone: '06 12 34 56 78', relationship: 'parent',
    receiveBulletins: true, receiveAbsences: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-contact-2', studentId: 'demo-student-1', centerId: 'demo-center',
    firstName: 'Jean', lastName: 'Martin', email: 'j.martin@entreprise.fr',
    relationship: 'tuteur_pro',
    receiveBulletins: true, receiveAbsences: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
]

export function useStudentContacts() {
  const { user } = useAuthContext()
  const [contacts, setContacts] = useState<StudentContact[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchContacts = useCallback(async () => {
    if (isDemoMode) { setContacts(DEMO_CONTACTS); return }
    const centerId = user?.establishmentId
    if (!centerId) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('student_contacts')
        .select('*')
        .eq('center_id', centerId)
        .order('last_name')
      if (error) throw error
      setContacts((data || []).map(transformStudentContact))
    } catch (err) {
      console.error('Error fetching contacts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.establishmentId])

  const getContactsForStudent = useCallback((studentId: string): StudentContact[] => {
    return contacts.filter(c => c.studentId === studentId)
  }, [contacts])

  const createContact = useCallback(async (data: {
    studentId: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    relationship: ContactRelationship
    receiveBulletins?: boolean
    receiveAbsences?: boolean
    notes?: string
  }): Promise<StudentContact | null> => {
    if (isDemoMode) { toast.success('Contact ajouté (mode démo)'); return null }
    const centerId = user?.establishmentId
    if (!centerId) return null
    setIsLoading(true)
    try {
      const { data: result, error } = await supabase
        .from('student_contacts')
        .insert({
          student_id: data.studentId,
          center_id: centerId,
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone || null,
          relationship: data.relationship,
          receive_bulletins: data.receiveBulletins ?? true,
          receive_absences: data.receiveAbsences ?? true,
          notes: data.notes || null,
        })
        .select('*')
        .single()
      if (error) throw error
      const contact = transformStudentContact(result)
      setContacts(prev => [...prev, contact])
      toast.success('Contact ajouté')
      return contact
    } catch (err) {
      console.error('Error creating contact:', err)
      toast.error('Erreur lors de l\'ajout du contact')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [user?.establishmentId])

  const updateContact = useCallback(async (contactId: string, data: Partial<{
    firstName: string; lastName: string; email: string; phone: string;
    relationship: ContactRelationship; receiveBulletins: boolean; receiveAbsences: boolean; notes: string;
  }>): Promise<StudentContact | null> => {
    if (isDemoMode) { toast.success('Contact modifié (mode démo)'); return null }
    setIsLoading(true)
    try {
      const updateData: Record<string, any> = {}
      if (data.firstName !== undefined) updateData.first_name = data.firstName
      if (data.lastName !== undefined) updateData.last_name = data.lastName
      if (data.email !== undefined) updateData.email = data.email
      if (data.phone !== undefined) updateData.phone = data.phone || null
      if (data.relationship !== undefined) updateData.relationship = data.relationship
      if (data.receiveBulletins !== undefined) updateData.receive_bulletins = data.receiveBulletins
      if (data.receiveAbsences !== undefined) updateData.receive_absences = data.receiveAbsences
      if (data.notes !== undefined) updateData.notes = data.notes || null
      const { data: result, error } = await supabase
        .from('student_contacts')
        .update(updateData)
        .eq('id', contactId)
        .select('*')
        .single()
      if (error) throw error
      const contact = transformStudentContact(result)
      setContacts(prev => prev.map(c => c.id === contactId ? contact : c))
      toast.success('Contact modifié')
      return contact
    } catch (err) {
      console.error('Error updating contact:', err)
      toast.error('Erreur lors de la modification du contact')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const removeContact = useCallback(async (contactId: string) => {
    if (isDemoMode) { toast.success('Contact supprimé (mode démo)'); return }
    try {
      const { error } = await supabase.from('student_contacts').delete().eq('id', contactId)
      if (error) throw error
      setContacts(prev => prev.filter(c => c.id !== contactId))
      toast.success('Contact supprimé')
    } catch (err) {
      console.error('Error deleting contact:', err)
      toast.error('Erreur lors de la suppression du contact')
    }
  }, [])

  return {
    contacts,
    isLoading,
    fetchContacts,
    getContactsForStudent,
    createContact,
    updateContact,
    removeContact,
  }
}
