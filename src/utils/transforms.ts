/**
 * Transformations snake_case (Supabase) → camelCase (TypeScript)
 * Adapté au schéma réel : training_sessions, profiles, rooms
 */

import type { Booking, Room, User, Program, InAppNotification, TeacherAvailability, TeacherUnavailability, SessionAssignment, SessionChangeRequest, PlanningMessage, AvailabilityRequest, AvailabilityRequestResponse, ReplacementRequest, ReplacementCandidate, StudentContact, Bulletin } from '@/types'

// ==================== BOOKING (from training_sessions) ====================

export function transformBooking(raw: Record<string, any>): Booking {
  // trainer = join profile
  const trainer = raw.trainer
  // subject = join subjects
  const subject = raw.subject
  // class_ = join classes (avec diploma)
  const class_ = raw.class_

  // Le session_type réel (in_person/online/hybrid) est le mode de livraison
  // On utilise 'course' par défaut car il n'y a pas de colonne booking_type dans le schéma
  const bookingType: 'course' = 'course'

  const { firstName, lastName } = parseFullName(trainer?.full_name)

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? undefined,
    startTime: raw.start_time,
    endTime: raw.end_time,
    startDateTime: raw.start_time,
    endDateTime: raw.end_time,
    roomId: raw.room_id,
    userId: raw.trainer_id,
    attendeeIds: [],
    status: raw.status || 'scheduled',
    type: bookingType,
    bookingType: bookingType,
    recurrence: undefined,
    schoolId: raw.center_id,
    establishmentId: raw.center_id,
    room: raw.room
      ? {
          id: raw.room.id,
          name: raw.room.name,
          room_type: raw.room.room_type,
          capacity: raw.room.capacity,
        }
      : undefined,
    user: trainer
      ? {
          id: trainer.id,
          firstName,
          lastName,
          email: trainer.email || '',
        }
      : undefined,
    attendees: [],
    cancelledAt: undefined,
    cancelledBy: undefined,
    cancellationReason: undefined,
    subjectId: raw.subject_id ?? undefined,
    classId: raw.class_id ?? undefined,
    matiere: subject?.name ?? undefined,
    diplome: class_?.diploma?.title ?? undefined,
    niveau: class_?.name ?? undefined,
    meetingUrl: raw.meeting_url ?? undefined,
    sessionType: raw.session_type ?? undefined,
    needsReschedule: raw.needs_reschedule ?? false,
    attendanceMarkingEnabled: raw.attendance_marking_enabled ?? true,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

// ==================== ROOM (from rooms) ====================

export function transformRoom(raw: Record<string, any>): Room {
  return {
    id: raw.id,
    name: raw.name,
    code: raw.name, // pas de colonne code, on utilise name
    capacity: raw.capacity || 0,
    type: raw.room_type || 'classroom',
    roomType: raw.room_type || 'classroom',
    equipment: raw.equipment ?? [],
    location: raw.location || '',
    description: undefined,
    isActive: raw.is_available ?? true,
    schoolId: raw.center_id,
    establishmentId: raw.center_id,
    buildingId: undefined, // pas de buildings dans ce schéma
    building: undefined,
    floor: undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

// ==================== PROGRAM (from programs) ====================

export function transformProgram(raw: Record<string, any>): Program {
  return {
    id: raw.id,
    centerId: raw.center_id,
    name: raw.name,
    code: raw.code ?? undefined,
    description: raw.description ?? undefined,
    durationHours: raw.duration_hours ?? 0,
    maxParticipants: raw.max_participants ?? 20,
    color: raw.color ?? '#3B82F6',
    isActive: raw.is_active ?? true,
    createdAt: raw.created_at,
    diplomaId: raw.diploma_id ?? undefined,
    diploma: raw.diploma ?? undefined,
  }
}

// ==================== HELPERS ====================

export function parseFullName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (fullName || '').split(' ')
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' }
}

// ==================== USER (from profiles) ====================

// ==================== NOTIFICATION (from in_app_notifications) ====================

export function transformInAppNotification(raw: Record<string, any>): InAppNotification {
  return {
    id: raw.id,
    userId: raw.user_id,
    centerId: raw.center_id,
    title: raw.title,
    message: raw.message,
    type: raw.type || 'system',
    link: raw.link ?? undefined,
    isRead: raw.is_read ?? false,
    sessionId: raw.session_id ?? undefined,
    createdAt: raw.created_at,
  }
}

// ==================== USER (from profiles) ====================

export function transformUser(raw: Record<string, any>): User {
  const { firstName, lastName } = parseFullName(raw.full_name)

  return {
    id: raw.id,
    email: raw.email || '',
    firstName,
    lastName,
    role: raw.role || 'student',
    schoolId: raw.center_id,
    establishmentId: raw.center_id,
    avatar: raw.avatar_url ?? undefined,
    profilePicture: raw.avatar_url ?? undefined,
    isActive: raw.is_active ?? true,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

// ==================== ATTENDANCE (from session_attendance) ====================

export function transformAttendance(raw: Record<string, any>): import('@/types').SessionAttendance {
  const student = raw.student
  const { firstName, lastName } = student ? parseFullName(student.full_name) : { firstName: '', lastName: '' }
  return {
    id: raw.id,
    sessionId: raw.session_id,
    studentId: raw.student_id,
    centerId: raw.center_id,
    status: raw.status || 'absent',
    lateMinutes: raw.late_minutes ?? undefined,
    excuseReason: raw.excuse_reason ?? undefined,
    markedBy: raw.marked_by ?? undefined,
    markedAt: raw.marked_at ?? undefined,
    notes: raw.notes ?? undefined,
    student: student ? { id: student.id, firstName, lastName, email: student.email || '' } : undefined,
    session: raw.session ? { id: raw.session.id, title: raw.session.title, date: raw.session.start_time } : undefined,
  }
}

// ==================== EVALUATION (from evaluations) ====================

export function transformEvaluation(raw: Record<string, any>): import('@/types').Evaluation {
  const teacher = raw.teacher
  const { firstName, lastName } = teacher ? parseFullName(teacher.full_name) : { firstName: '', lastName: '' }
  return {
    id: raw.id,
    centerId: raw.center_id,
    subjectId: raw.subject_id,
    classId: raw.class_id,
    teacherId: raw.teacher_id,
    title: raw.title,
    description: raw.description ?? undefined,
    evaluationType: raw.evaluation_type || 'exam',
    date: raw.date,
    coefficient: parseFloat(raw.coefficient) || 1,
    maxGrade: parseFloat(raw.max_grade) || 20,
    isPublished: raw.is_published ?? false,
    subject: raw.subject ? { id: raw.subject.id, name: raw.subject.name } : undefined,
    class_: raw.class_ ? { id: raw.class_.id, name: raw.class_.name } : undefined,
    teacher: teacher ? { id: teacher.id, firstName, lastName } : undefined,
  }
}

// ==================== GRADE (from grades) ====================

export function transformGrade(raw: Record<string, any>): import('@/types').Grade {
  const student = raw.student
  const { firstName, lastName } = student ? parseFullName(student.full_name) : { firstName: '', lastName: '' }
  return {
    id: raw.id,
    evaluationId: raw.evaluation_id,
    studentId: raw.student_id,
    centerId: raw.center_id,
    grade: raw.grade != null ? parseFloat(raw.grade) : null,
    isAbsent: raw.is_absent ?? false,
    comment: raw.comment ?? undefined,
    gradedBy: raw.graded_by ?? undefined,
    gradedAt: raw.graded_at ?? undefined,
    student: student ? { id: student.id, firstName, lastName } : undefined,
  }
}

// ==================== TEACHER AVAILABILITY ====================

export function transformTeacherAvailability(raw: Record<string, any>): TeacherAvailability {
  const teacher = raw.teacher
  const t = teacher ? parseFullName(teacher.full_name) : { firstName: '', lastName: '' }
  return {
    id: raw.id,
    teacherId: raw.teacher_id,
    centerId: raw.center_id,
    date: raw.date,
    startTime: raw.start_time,
    endTime: raw.end_time,
    recurrence: raw.recurrence || 'none',
    status: raw.status || 'submitted',
    notes: raw.notes ?? undefined,
    teacher: teacher ? { id: teacher.id, firstName: t.firstName, lastName: t.lastName, email: teacher.email || '' } : undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

// ==================== TEACHER UNAVAILABILITY ====================

export function transformTeacherUnavailability(raw: Record<string, any>): TeacherUnavailability {
  const teacher = raw.teacher
  const t = teacher ? parseFullName(teacher.full_name) : { firstName: '', lastName: '' }
  return {
    id: raw.id,
    teacherId: raw.teacher_id,
    centerId: raw.center_id,
    startDate: raw.start_date,
    endDate: raw.end_date,
    reason: raw.reason || 'other',
    description: raw.description ?? undefined,
    status: raw.status || 'pending',
    adminResponse: raw.admin_response ?? undefined,
    requestedAt: raw.requested_at,
    respondedAt: raw.responded_at ?? undefined,
    respondedBy: raw.responded_by ?? undefined,
    teacher: teacher ? { id: teacher.id, firstName: t.firstName, lastName: t.lastName, email: teacher.email || '' } : undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

// ==================== SESSION ASSIGNMENT ====================

export function transformSessionAssignment(raw: Record<string, any>): SessionAssignment {
  const teacher = raw.teacher
  const t = teacher ? parseFullName(teacher.full_name) : { firstName: '', lastName: '' }
  const assigner = raw.assigner
  const a = assigner ? parseFullName(assigner.full_name) : { firstName: '', lastName: '' }
  return {
    id: raw.id,
    sessionId: raw.session_id,
    teacherId: raw.teacher_id,
    centerId: raw.center_id,
    status: raw.status || 'pending',
    assignedBy: raw.assigned_by,
    message: raw.message ?? undefined,
    teacherResponse: raw.teacher_response ?? undefined,
    assignedAt: raw.assigned_at,
    respondedAt: raw.responded_at ?? undefined,
    session: raw.session ? {
      id: raw.session.id,
      title: raw.session.title,
      startTime: raw.session.start_time,
      endTime: raw.session.end_time,
      room: raw.session.room ? { name: raw.session.room.name } : undefined,
    } : undefined,
    teacher: teacher ? { id: teacher.id, firstName: t.firstName, lastName: t.lastName, email: teacher.email || '' } : undefined,
    assigner: assigner ? { id: assigner.id, firstName: a.firstName, lastName: a.lastName } : undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

// ==================== SESSION CHANGE REQUEST ====================

export function transformSessionChangeRequest(raw: Record<string, any>): SessionChangeRequest {
  const teacher = raw.teacher
  const t = teacher ? parseFullName(teacher.full_name) : { firstName: '', lastName: '' }
  const requester = raw.requester
  const r = requester ? parseFullName(requester.full_name) : { firstName: '', lastName: '' }
  return {
    id: raw.id,
    sessionId: raw.session_id,
    teacherId: raw.teacher_id,
    centerId: raw.center_id,
    changeType: raw.change_type,
    oldValues: raw.old_values || {},
    newValues: raw.new_values || {},
    status: raw.status || 'pending',
    requestedBy: raw.requested_by,
    message: raw.message ?? undefined,
    teacherResponse: raw.teacher_response ?? undefined,
    session: raw.session ? { id: raw.session.id, title: raw.session.title } : undefined,
    teacher: teacher ? { id: teacher.id, firstName: t.firstName, lastName: t.lastName } : undefined,
    requester: requester ? { id: requester.id, firstName: r.firstName, lastName: r.lastName } : undefined,
    createdAt: raw.created_at,
    respondedAt: raw.responded_at ?? undefined,
    updatedAt: raw.updated_at,
  }
}

// ==================== PLANNING MESSAGE ====================

export function transformPlanningMessage(raw: Record<string, any>): PlanningMessage {
  const sender = raw.sender
  const s = sender ? parseFullName(sender.full_name) : { firstName: '', lastName: '' }
  const recipient = raw.recipient
  const rc = recipient ? parseFullName(recipient.full_name) : { firstName: '', lastName: '' }
  return {
    id: raw.id,
    centerId: raw.center_id,
    senderId: raw.sender_id,
    recipientId: raw.recipient_id,
    sessionId: raw.session_id ?? undefined,
    subject: raw.subject ?? undefined,
    content: raw.content,
    isRead: raw.is_read ?? false,
    parentId: raw.parent_id ?? undefined,
    sender: sender ? { id: sender.id, firstName: s.firstName, lastName: s.lastName, email: sender.email || '' } : undefined,
    recipient: recipient ? { id: recipient.id, firstName: rc.firstName, lastName: rc.lastName, email: recipient.email || '' } : undefined,
    createdAt: raw.created_at,
  }
}

// ==================== AVAILABILITY REQUEST ====================

export function transformAvailabilityRequest(raw: Record<string, any>): AvailabilityRequest {
  const creator = raw.creator
  const c = creator ? parseFullName(creator.full_name) : { firstName: '', lastName: '' }
  return {
    id: raw.id,
    centerId: raw.center_id,
    createdBy: raw.created_by,
    subjectId: raw.subject_id ?? undefined,
    classId: raw.class_id ?? undefined,
    periodStart: raw.period_start,
    periodEnd: raw.period_end,
    message: raw.message ?? undefined,
    status: raw.status || 'open',
    creator: creator ? { id: creator.id, firstName: c.firstName, lastName: c.lastName } : undefined,
    subject: raw.subject ? { id: raw.subject.id, name: raw.subject.name } : undefined,
    class_: raw.class_ ? { id: raw.class_.id, name: raw.class_.name } : undefined,
    responses: raw.responses?.map(transformAvailabilityRequestResponse) ?? undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

// ==================== AVAILABILITY REQUEST RESPONSE ====================

export function transformAvailabilityRequestResponse(raw: Record<string, any>): AvailabilityRequestResponse {
  const teacher = raw.teacher
  const t = teacher ? parseFullName(teacher.full_name) : { firstName: '', lastName: '' }
  return {
    id: raw.id,
    requestId: raw.request_id,
    teacherId: raw.teacher_id,
    centerId: raw.center_id,
    responseType: raw.response_type,
    unavailableSlots: Array.isArray(raw.unavailable_slots) ? raw.unavailable_slots : JSON.parse(raw.unavailable_slots || '[]'),
    notes: raw.notes ?? undefined,
    respondedAt: raw.responded_at,
    teacher: teacher ? { id: teacher.id, firstName: t.firstName, lastName: t.lastName, email: teacher.email || '' } : undefined,
    createdAt: raw.created_at,
  }
}

// ==================== REPLACEMENT REQUEST ====================

export function transformReplacementRequest(raw: Record<string, any>): ReplacementRequest {
  const orig = raw.original_teacher
  const ot = orig ? parseFullName(orig.full_name) : { firstName: '', lastName: '' }
  const sel = raw.selected_teacher
  const st = sel ? parseFullName(sel.full_name) : { firstName: '', lastName: '' }
  return {
    id: raw.id,
    centerId: raw.center_id,
    sessionId: raw.session_id,
    originalTeacherId: raw.original_teacher_id,
    subjectId: raw.subject_id ?? undefined,
    createdBy: raw.created_by,
    message: raw.message ?? undefined,
    status: raw.status || 'open',
    selectedTeacherId: raw.selected_teacher_id ?? undefined,
    session: raw.session ? {
      id: raw.session.id,
      title: raw.session.title,
      startTime: raw.session.start_time,
      endTime: raw.session.end_time,
      room: raw.session.room ? { name: raw.session.room.name } : undefined,
    } : undefined,
    originalTeacher: orig ? { id: orig.id, firstName: ot.firstName, lastName: ot.lastName } : undefined,
    selectedTeacher: sel ? { id: sel.id, firstName: st.firstName, lastName: st.lastName } : undefined,
    candidates: raw.candidates?.map(transformReplacementCandidate) ?? undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

// ==================== REPLACEMENT CANDIDATE ====================

export function transformReplacementCandidate(raw: Record<string, any>): ReplacementCandidate {
  const teacher = raw.teacher
  const t = teacher ? parseFullName(teacher.full_name) : { firstName: '', lastName: '' }
  return {
    id: raw.id,
    replacementRequestId: raw.replacement_request_id,
    teacherId: raw.teacher_id,
    centerId: raw.center_id,
    status: raw.status || 'pending',
    responseMessage: raw.response_message ?? undefined,
    respondedAt: raw.responded_at ?? undefined,
    teacher: teacher ? { id: teacher.id, firstName: t.firstName, lastName: t.lastName, email: teacher.email || '' } : undefined,
    createdAt: raw.created_at,
  }
}

// ==================== STUDENT CONTACT ====================

export function transformStudentContact(raw: Record<string, any>): StudentContact {
  return {
    id: raw.id,
    studentId: raw.student_id,
    centerId: raw.center_id,
    firstName: raw.first_name,
    lastName: raw.last_name,
    email: raw.email,
    phone: raw.phone ?? undefined,
    relationship: raw.relationship || 'autre',
    receiveBulletins: raw.receive_bulletins ?? true,
    receiveAbsences: raw.receive_absences ?? true,
    notes: raw.notes ?? undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

// ==================== BULLETIN ====================

export function transformBulletin(raw: Record<string, any>): Bulletin {
  return {
    id: raw.id,
    centerId: raw.center_id,
    studentId: raw.student_id,
    classId: raw.class_id,
    generatedBy: raw.generated_by,
    periodLabel: raw.period_label,
    periodStart: raw.period_start,
    periodEnd: raw.period_end,
    bulletinData: typeof raw.bulletin_data === 'string' ? JSON.parse(raw.bulletin_data) : raw.bulletin_data,
    generalAverage: raw.general_average != null ? parseFloat(raw.general_average) : null,
    classRank: raw.class_rank ?? null,
    pdfUrl: raw.pdf_url ?? undefined,
    sentAt: raw.sent_at ?? undefined,
    sentTo: Array.isArray(raw.sent_to) ? raw.sent_to : (typeof raw.sent_to === 'string' ? JSON.parse(raw.sent_to) : []),
    createdAt: raw.created_at,
  }
}

// ==================== PUSH SUBSCRIPTION ====================

export function transformPushSubscription(raw: Record<string, any>): import('@/types').PushSubscriptionRecord {
  return {
    id: raw.id,
    userId: raw.user_id,
    centerId: raw.center_id,
    endpoint: raw.endpoint,
    p256dh: raw.p256dh,
    authKey: raw.auth_key,
    deviceName: raw.device_name ?? undefined,
    isActive: raw.is_active ?? true,
    lastUsedAt: raw.last_used_at ?? undefined,
    createdAt: raw.created_at,
  }
}
