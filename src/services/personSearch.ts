import type { Person } from '../types'

export const normalizePersonSearch = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it').trim()

export function searchPeople(people: Person[], query: string): Person[] {
  const terms = normalizePersonSearch(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  return people.filter((person) => {
    const text = normalizePersonSearch([
      person.firstName, person.lastName, person.birthName, person.nickname,
      person.birthDate, person.deathDate, person.birthPlace, person.occupation, person.id,
    ].filter(Boolean).join(' '))
    return terms.every((term) => text.includes(term))
  }).sort((a, b) => a.lastName.localeCompare(b.lastName, 'it', { sensitivity: 'base' })
    || a.firstName.localeCompare(b.firstName, 'it', { sensitivity: 'base' })
    || (a.birthDate ?? '').localeCompare(b.birthDate ?? '') || a.id.localeCompare(b.id))
}

export function namesakeIds(people: Person[]): Set<string> {
  const groups = new Map<string, string[]>()
  for (const person of people) {
    const key = normalizePersonSearch(`${person.firstName} ${person.lastName}`).replace(/\s+/g, ' ')
    const ids = groups.get(key) ?? []
    ids.push(person.id)
    groups.set(key, ids)
  }
  return new Set([...groups.values()].filter((ids) => ids.length > 1).flat())
}

export function personSearchDetails(person: Person): string {
  const date = (value: string) => value.split('-').reverse().join('/')
  return [person.birthDate ? `N. ${date(person.birthDate)}` : 'Nascita non indicata',
    person.deathDate ? `† ${date(person.deathDate)}` : '', person.birthPlace,
    person.nickname ? `«${person.nickname}»` : ''].filter(Boolean).join(' · ')
}
