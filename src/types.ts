export type Gender = 'female' | 'male' | 'nonbinary' | 'unspecified'

export interface Person {
  id: string
  firstName: string
  lastName: string
  birthName?: string
  nickname?: string
  gender: Gender
  birthDate?: string
  deathDate?: string
  birthPlace?: string
  occupation?: string
  notes?: string
  color: string
}

export type RelationshipType =
  | 'biological-parent'
  | 'adoptive-parent'
  | 'foster-parent'
  | 'guardian'
  | 'married'
  | 'civil-union'
  | 'partner'
  | 'separated'
  | 'divorced'
  | 'former-partner'
  | 'sibling'

export interface Relationship {
  id: string
  sourceId: string
  targetId: string
  type: RelationshipType
  startDate?: string
  endDate?: string
  notes?: string
}

export interface FamilyTree {
  version: 1
  id: string
  name: string
  updatedAt: string
  people: Person[]
  relationships: Relationship[]
}

export interface RelationshipOption {
  value: RelationshipType
  label: string
  description: string
  group: 'Genitorialità' | 'Fratellanza' | 'Coppia'
  directional: boolean
}
