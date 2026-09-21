import type { Person, RelationshipType } from '../types'
import { relationshipOptions } from '../data'

export function fullName(person?: Person | null) {
  return person ? `${person.firstName} ${person.lastName}` : 'Persona sconosciuta'
}
export function relationshipLabel(type: RelationshipType) {
  return relationshipOptions.find((option) => option.value === type)?.label ?? type
}
export function initials(person: Person) {
  return `${person.firstName[0] || ''}${person.lastName[0] || ''}`.toUpperCase()
}
export function dateLabel(value?: string) {
  return value
    ? new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        new Date(`${value}T12:00:00`),
      )
    : ''
}
export function lifeLabel(person: Person) {
  if (!person.birthDate && !person.deathDate) return 'Date non inserite'
  const birth = person.birthDate?.slice(0, 4) ?? '?'
  return person.deathDate ? `${birth} – ${person.deathDate.slice(0, 4)}` : `n. ${birth}`
}
