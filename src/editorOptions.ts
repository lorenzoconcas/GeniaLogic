import type { Gender, RelationshipType } from './types'
import type { RelativeKind } from './uiTypes'

// I tutori partecipano al grafo genealogico, ma non vengono copiati sui fratelli.
export const parentTypeValues = new Set<RelationshipType>([
  'biological-parent',
  'adoptive-parent',
  'foster-parent',
  'guardian',
])
export const sharedParentTypeValues = new Set<RelationshipType>([
  'biological-parent',
  'adoptive-parent',
  'foster-parent',
])
export const coupleTypeValues = new Set<RelationshipType>([
  'married',
  'civil-union',
  'partner',
  'separated',
  'divorced',
  'former-partner',
])
export const relativeChoices: Array<{
  value: RelativeKind
  label: string
  description: string
  gender: Gender
  copySurname: boolean
}> = [
  {
    value: 'father',
    label: 'Padre',
    description: 'Genitore biologico',
    gender: 'male',
    copySurname: true,
  },
  {
    value: 'mother',
    label: 'Madre',
    description: 'Genitore biologico',
    gender: 'female',
    copySurname: true,
  },
  {
    value: 'son',
    label: 'Figlio',
    description: 'Figlio biologico',
    gender: 'male',
    copySurname: true,
  },
  {
    value: 'daughter',
    label: 'Figlia',
    description: 'Figlia biologica',
    gender: 'female',
    copySurname: true,
  },
  {
    value: 'brother',
    label: 'Fratello',
    description: 'Condivide i genitori noti',
    gender: 'male',
    copySurname: true,
  },
  {
    value: 'sister',
    label: 'Sorella',
    description: 'Condivide i genitori noti',
    gender: 'female',
    copySurname: true,
  },
  {
    value: 'spouse',
    label: 'Coniuge',
    description: 'Legame matrimoniale',
    gender: 'unspecified',
    copySurname: false,
  },
  {
    value: 'partner',
    label: 'Partner',
    description: 'Relazione di coppia',
    gender: 'unspecified',
    copySurname: false,
  },
]
