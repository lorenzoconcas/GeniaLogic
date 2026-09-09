import type { Person, Relationship } from '../types'

/** Count people, not records: imported archives can contain duplicate marriages. */
export function singleSpouse(personId: string, people: Person[], relationships: Relationship[]): Person | undefined {
  const byId = new Map(people.map(person => [person.id, person]))
  if (!byId.has(personId)) return undefined
  const spouses = new Set<string>()
  for (const relationship of relationships) {
    if (relationship.type !== 'married') continue
    const otherId = relationship.sourceId === personId ? relationship.targetId
      : relationship.targetId === personId ? relationship.sourceId : undefined
    if (otherId && otherId !== personId && byId.has(otherId)) spouses.add(otherId)
  }
  return spouses.size === 1 ? byId.get([...spouses][0]!) : undefined
}

export function quickChildRelationships(parentId: string, childId: string, people: Person[], relationships: Relationship[], createId: () => string = () => crypto.randomUUID()): Relationship[] {
  if (parentId === childId || !people.some(person => person.id === parentId)) return []
  const spouse = singleSpouse(parentId, people, relationships)
  const parentIds = spouse && spouse.id !== childId ? [parentId, spouse.id] : [parentId]
  return parentIds.map(sourceId => ({ id: createId(), sourceId, targetId: childId, type: 'biological-parent' }))
}
