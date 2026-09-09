import type { Person, Relationship } from '../types'

// Guardianship alone does not establish parenthood or siblinghood.
const parentTypes = new Set(['biological-parent', 'adoptive-parent', 'foster-parent'])

export function closeRelatives(rootId: string, people: Person[], relationships: Relationship[]) {
  const knownIds = new Set(people.map(person => person.id))
  const parents = new Set<string>()
  const children = new Set<string>()
  const siblings = new Set<string>()
  const parentLinks = relationships.filter(link => parentTypes.has(link.type)
    && knownIds.has(link.sourceId) && knownIds.has(link.targetId))
  for (const link of parentLinks) {
    if (link.targetId === rootId) parents.add(link.sourceId)
    if (link.sourceId === rootId) children.add(link.targetId)
  }
  for (const link of parentLinks) if (parents.has(link.sourceId)) siblings.add(link.targetId)
  for (const link of relationships) {
    if (link.type !== 'sibling') continue
    if (link.sourceId === rootId) siblings.add(link.targetId)
    if (link.targetId === rootId) siblings.add(link.sourceId)
  }
  const resolve = (ids: Set<string>) => people.filter(person => person.id !== rootId && ids.has(person.id))
    .sort((a, b) => (a.birthDate || '9999').localeCompare(b.birthDate || '9999')
      || a.lastName.localeCompare(b.lastName, 'it') || a.firstName.localeCompare(b.firstName, 'it')
      || a.id.localeCompare(b.id))
  return { children: resolve(children), siblings: resolve(siblings) }
}
