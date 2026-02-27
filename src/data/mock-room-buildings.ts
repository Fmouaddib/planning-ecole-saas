export interface MockRoom {
  name: string
  capacity: number
  type: 'classroom' | 'lab' | 'amphitheater' | 'gym' | 'workshop'
}

export interface BuildingInfo {
  id: string
  name: string
  rooms: MockRoom[]
}

export const mockBuildingRooms: BuildingInfo[] = [
  {
    id: 'bat-a',
    name: 'Bâtiment A',
    rooms: [
      { name: 'A101', capacity: 35, type: 'classroom' },
      { name: 'A102', capacity: 35, type: 'classroom' },
      { name: 'A103', capacity: 30, type: 'classroom' },
      { name: 'A104', capacity: 30, type: 'classroom' },
      { name: 'A201', capacity: 40, type: 'classroom' },
      { name: 'A202', capacity: 40, type: 'classroom' },
    ],
  },
  {
    id: 'bat-b',
    name: 'Bâtiment B',
    rooms: [
      { name: 'B101', capacity: 35, type: 'classroom' },
      { name: 'B102', capacity: 35, type: 'classroom' },
      { name: 'B201', capacity: 40, type: 'classroom' },
      { name: 'B203', capacity: 30, type: 'classroom' },
    ],
  },
  {
    id: 'bat-c',
    name: 'Bâtiment C',
    rooms: [
      { name: 'C105', capacity: 20, type: 'classroom' },
      { name: 'C201', capacity: 35, type: 'classroom' },
      { name: 'C202', capacity: 35, type: 'classroom' },
    ],
  },
  {
    id: 'bat-d',
    name: 'Bâtiment D',
    rooms: [
      { name: 'D301', capacity: 30, type: 'classroom' },
      { name: 'D302', capacity: 30, type: 'classroom' },
      { name: 'D303', capacity: 30, type: 'classroom' },
    ],
  },
  {
    id: 'amphitheatres',
    name: 'Amphithéâtres',
    rooms: [
      { name: 'Amphi A', capacity: 200, type: 'amphitheater' },
      { name: 'Amphi B', capacity: 150, type: 'amphitheater' },
    ],
  },
  {
    id: 'special',
    name: 'Équipements spéciaux',
    rooms: [
      { name: 'Labo 1', capacity: 25, type: 'lab' },
      { name: 'Labo 2', capacity: 25, type: 'lab' },
      { name: 'Gymnase', capacity: 100, type: 'gym' },
      { name: 'Atelier', capacity: 20, type: 'workshop' },
    ],
  },
]
