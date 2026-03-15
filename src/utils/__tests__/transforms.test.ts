import { describe, it, expect } from 'vitest'
import {
  transformBooking,
  transformRoom,
  transformUser,
  parseFullName,
  transformProgram,
  transformAttendance,
  transformGrade,
  transformStudentContact,
} from '../transforms'

// ---------------------------------------------------------------------------
// parseFullName
// ---------------------------------------------------------------------------
describe('parseFullName', () => {
  it('separe prenom et nom', () => {
    const result = parseFullName('Jean Dupont')
    expect(result).toEqual({ firstName: 'Jean', lastName: 'Dupont' })
  })

  it('gere un nom compose', () => {
    const result = parseFullName('Jean Pierre Dupont')
    expect(result).toEqual({ firstName: 'Jean', lastName: 'Pierre Dupont' })
  })

  it('gere un seul mot (prenom sans nom)', () => {
    const result = parseFullName('Alice')
    expect(result).toEqual({ firstName: 'Alice', lastName: '' })
  })

  it('gere null', () => {
    const result = parseFullName(null)
    expect(result).toEqual({ firstName: '', lastName: '' })
  })

  it('gere undefined', () => {
    const result = parseFullName(undefined)
    expect(result).toEqual({ firstName: '', lastName: '' })
  })

  it('gere une chaine vide', () => {
    const result = parseFullName('')
    expect(result).toEqual({ firstName: '', lastName: '' })
  })
})

// ---------------------------------------------------------------------------
// transformBooking
// ---------------------------------------------------------------------------
describe('transformBooking', () => {
  it('transforme les champs de base', () => {
    const raw = {
      id: 'sess-1',
      title: 'Cours de maths',
      start_time: '2026-03-14T09:00:00Z',
      end_time: '2026-03-14T11:00:00Z',
      room_id: 'room-1',
      trainer_id: 'user-1',
      center_id: 'center-1',
      status: 'scheduled',
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-01T00:00:00Z',
    }
    const result = transformBooking(raw)

    expect(result.id).toBe('sess-1')
    expect(result.title).toBe('Cours de maths')
    expect(result.startTime).toBe('2026-03-14T09:00:00Z')
    expect(result.endTime).toBe('2026-03-14T11:00:00Z')
    expect(result.roomId).toBe('room-1')
    expect(result.userId).toBe('user-1')
    expect(result.establishmentId).toBe('center-1')
    expect(result.status).toBe('scheduled')
    expect(result.type).toBe('course')
  })

  it('inclut le building name dans la room', () => {
    const raw = {
      id: 'sess-2',
      title: 'Test',
      start_time: '2026-03-14T09:00:00Z',
      end_time: '2026-03-14T10:00:00Z',
      room_id: 'room-1',
      room: {
        id: 'room-1',
        name: 'Salle A',
        room_type: 'classroom',
        capacity: 30,
        building: { name: 'Batiment Principal' },
      },
    }
    const result = transformBooking(raw)

    expect(result.room).toBeDefined()
    expect(result.room?.name).toBe('Salle A')
    expect(result.room?.buildingName).toBe('Batiment Principal')
  })

  it('gere l absence de room et trainer', () => {
    const raw = {
      id: 'sess-3',
      title: 'Sans salle',
      start_time: '2026-03-14T09:00:00Z',
      end_time: '2026-03-14T10:00:00Z',
    }
    const result = transformBooking(raw)

    expect(result.room).toBeUndefined()
    expect(result.user).toBeUndefined()
  })

  it('extrait matiere et diplome des joins', () => {
    const raw = {
      id: 'sess-4',
      title: 'Cours',
      start_time: '2026-03-14T09:00:00Z',
      end_time: '2026-03-14T10:00:00Z',
      subject_id: 'sub-1',
      class_id: 'cls-1',
      subject: { name: 'Mathematiques', color: '#FF0000' },
      class_: { name: 'BTS SIO 1', diploma: { title: 'BTS SIO' } },
    }
    const result = transformBooking(raw)

    expect(result.matiere).toBe('Mathematiques')
    expect(result.diplome).toBe('BTS SIO')
    expect(result.niveau).toBe('BTS SIO 1')
    expect(result.subjectColor).toBe('#FF0000')
  })

  it('transforme le trainer avec parseFullName', () => {
    const raw = {
      id: 'sess-5',
      title: 'Cours',
      start_time: '2026-03-14T09:00:00Z',
      end_time: '2026-03-14T10:00:00Z',
      trainer_id: 'user-1',
      trainer: { id: 'user-1', full_name: 'Marie Curie', email: 'marie@test.com' },
    }
    const result = transformBooking(raw)

    expect(result.user?.firstName).toBe('Marie')
    expect(result.user?.lastName).toBe('Curie')
    expect(result.user?.email).toBe('marie@test.com')
  })
})

// ---------------------------------------------------------------------------
// transformRoom
// ---------------------------------------------------------------------------
describe('transformRoom', () => {
  it('transforme les champs de base', () => {
    const raw = {
      id: 'room-1',
      name: 'Salle 101',
      capacity: 30,
      room_type: 'lab',
      center_id: 'center-1',
      is_available: true,
      equipment: ['projector', 'whiteboard'],
    }
    const result = transformRoom(raw)

    expect(result.id).toBe('room-1')
    expect(result.name).toBe('Salle 101')
    expect(result.capacity).toBe(30)
    expect(result.roomType).toBe('lab')
    expect(result.equipment).toEqual(['projector', 'whiteboard'])
    expect(result.isActive).toBe(true)
  })

  it('inclut le building si present', () => {
    const raw = {
      id: 'room-2',
      name: 'Amphi',
      building: { id: 'b-1', name: 'Bat A' },
    }
    const result = transformRoom(raw)

    expect(result.building?.name).toBe('Bat A')
  })

  it('utilise des valeurs par defaut pour les champs manquants', () => {
    const raw = { id: 'room-3', name: 'Salle X' }
    const result = transformRoom(raw)

    expect(result.capacity).toBe(0)
    expect(result.roomType).toBe('classroom')
    expect(result.isActive).toBe(true)
    expect(result.equipment).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// transformUser
// ---------------------------------------------------------------------------
describe('transformUser', () => {
  it('transforme un profil Supabase en User', () => {
    const raw = {
      id: 'user-1',
      email: 'alice@test.com',
      full_name: 'Alice Dupont',
      role: 'admin',
      center_id: 'center-1',
      is_active: true,
      avatar_url: 'https://img.com/alice.jpg',
    }
    const result = transformUser(raw)

    expect(result.id).toBe('user-1')
    expect(result.email).toBe('alice@test.com')
    expect(result.firstName).toBe('Alice')
    expect(result.lastName).toBe('Dupont')
    expect(result.role).toBe('admin')
    expect(result.establishmentId).toBe('center-1')
    expect(result.avatar).toBe('https://img.com/alice.jpg')
  })

  it('utilise des valeurs par defaut pour les champs manquants', () => {
    const raw = { id: 'user-2' }
    const result = transformUser(raw)

    expect(result.email).toBe('')
    expect(result.firstName).toBe('')
    expect(result.lastName).toBe('')
    expect(result.role).toBe('student')
    expect(result.isActive).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// transformProgram
// ---------------------------------------------------------------------------
describe('transformProgram', () => {
  it('transforme les champs avec valeurs par defaut', () => {
    const raw = {
      id: 'prog-1',
      name: 'Programme BTS',
      center_id: 'c-1',
    }
    const result = transformProgram(raw)

    expect(result.id).toBe('prog-1')
    expect(result.name).toBe('Programme BTS')
    expect(result.durationHours).toBe(0)
    expect(result.maxParticipants).toBe(20)
    expect(result.color).toBe('#3B82F6')
    expect(result.isActive).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// transformAttendance
// ---------------------------------------------------------------------------
describe('transformAttendance', () => {
  it('transforme une presence avec etudiant', () => {
    const raw = {
      id: 'att-1',
      session_id: 'sess-1',
      student_id: 'stu-1',
      center_id: 'c-1',
      status: 'present',
      student: { id: 'stu-1', full_name: 'Bob Martin', email: 'bob@test.com' },
    }
    const result = transformAttendance(raw)

    expect(result.status).toBe('present')
    expect(result.student?.firstName).toBe('Bob')
    expect(result.student?.lastName).toBe('Martin')
  })

  it('gere l absence d etudiant dans le join', () => {
    const raw = {
      id: 'att-2',
      session_id: 'sess-1',
      student_id: 'stu-2',
      status: 'absent',
    }
    const result = transformAttendance(raw)

    expect(result.student).toBeUndefined()
    expect(result.status).toBe('absent')
  })
})

// ---------------------------------------------------------------------------
// transformGrade
// ---------------------------------------------------------------------------
describe('transformGrade', () => {
  it('parse la note en float', () => {
    const raw = {
      id: 'g-1',
      evaluation_id: 'ev-1',
      student_id: 's-1',
      grade: '15.5',
      is_absent: false,
    }
    const result = transformGrade(raw)

    expect(result.grade).toBe(15.5)
    expect(result.isAbsent).toBe(false)
  })

  it('gere une note null (absent)', () => {
    const raw = {
      id: 'g-2',
      evaluation_id: 'ev-1',
      student_id: 's-2',
      grade: null,
      is_absent: true,
    }
    const result = transformGrade(raw)

    expect(result.grade).toBeNull()
    expect(result.isAbsent).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// transformStudentContact
// ---------------------------------------------------------------------------
describe('transformStudentContact', () => {
  it('transforme un contact avec valeurs par defaut', () => {
    const raw = {
      id: 'sc-1',
      student_id: 's-1',
      center_id: 'c-1',
      first_name: 'Parent',
      last_name: 'Dupont',
      email: 'parent@test.com',
    }
    const result = transformStudentContact(raw)

    expect(result.firstName).toBe('Parent')
    expect(result.relationship).toBe('autre')
    expect(result.receiveBulletins).toBe(true)
    expect(result.receiveAbsences).toBe(true)
  })
})
