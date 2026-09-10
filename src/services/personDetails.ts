import type { Person } from '../types'

const displayDate = (value?: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value || 'Non indicata'

export function personDetailRows(person: Person): { label: string; value: string }[] {
  return [
    { label: 'Nascita', value: displayDate(person.birthDate) },
    { label: 'Decesso', value: displayDate(person.deathDate) },
    { label: 'Luogo di nascita', value: person.birthPlace ?? '' },
    { label: 'Cognome alla nascita', value: person.birthName ?? '' },
    { label: 'Soprannome', value: person.nickname ?? '' },
    { label: 'Professione', value: person.occupation ?? '' },
  ].filter(row => row.value.trim())
}

export function placePersonDetails(anchor: { x: number; y: number }, size: { width: number; height: number }, viewport: { width: number; height: number }) {
  const gap = 16, margin = 8
  const preferredX = anchor.x + gap + size.width <= viewport.width - margin ? anchor.x + gap : anchor.x - size.width - gap
  const preferredY = anchor.y + gap + size.height <= viewport.height - margin ? anchor.y + gap : anchor.y - size.height - gap
  return {
    x: Math.max(margin, Math.min(preferredX, viewport.width - size.width - margin)),
    y: Math.max(margin, Math.min(preferredY, viewport.height - size.height - margin)),
  }
}
