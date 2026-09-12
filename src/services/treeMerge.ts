import type { FamilyTree, Person, Relationship } from '../types'

export interface TreeMergeResult {
  tree: FamilyTree
  conflicts: number
}

function same(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function mergeValue<T>(base: T, local: T, remote: T, conflict: () => void): T {
  const localChanged = !same(local, base)
  const remoteChanged = !same(remote, base)
  if (!localChanged) return remote
  if (!remoteChanged || same(local, remote)) return local
  conflict()
  return local
}

function mergeRecord<T extends { id: string }>(base: T, local: T, remote: T, conflict: () => void): T {
  const merged: Record<string, unknown> = { id: local.id }
  const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])
  keys.delete('id')
  for (const key of keys) {
    merged[key] = mergeValue(
      (base as unknown as Record<string, unknown>)[key],
      (local as unknown as Record<string, unknown>)[key],
      (remote as unknown as Record<string, unknown>)[key],
      conflict,
    )
  }
  return merged as unknown as T
}

function mergeCollection<T extends { id: string }>(base: T[], local: T[], remote: T[], conflict: () => void): T[] {
  const baseById = new Map(base.map((item) => [item.id, item]))
  const localById = new Map(local.map((item) => [item.id, item]))
  const remoteById = new Map(remote.map((item) => [item.id, item]))
  const ids = new Set([...baseById.keys(), ...localById.keys(), ...remoteById.keys()])
  const result: T[] = []

  for (const id of ids) {
    const original = baseById.get(id)
    const ours = localById.get(id)
    const theirs = remoteById.get(id)
    if (!original) {
      if (ours && theirs) result.push(same(ours, theirs) ? ours : mergeRecord({ id } as T, ours, theirs, conflict))
      else if (ours || theirs) result.push((ours ?? theirs)!)
      continue
    }
    if (!ours && !theirs) continue
    if (!ours && theirs) {
      if (!same(theirs, original)) { conflict(); result.push(theirs) }
      continue
    }
    if (ours && !theirs) {
      if (!same(ours, original)) { conflict(); result.push(ours) }
      continue
    }
    result.push(mergeRecord(original, ours!, theirs!, conflict))
  }
  return result
}

/**
 * Unione a tre vie: le modifiche indipendenti vengono combinate per ID e per
 * singolo campo. Se entrambi hanno cambiato lo stesso campo, prevale la copia
 * locale e il conflitto viene contato. Una cancellazione prevale solo se
 * l'altra copia non ha anche modificato quell'elemento.
 */
export function mergeTrees(base: FamilyTree, local: FamilyTree, remote: FamilyTree): TreeMergeResult {
  let conflicts = 0
  const conflict = () => { conflicts += 1 }
  const people = mergeCollection<Person>(base.people, local.people, remote.people, conflict)
  const personIds = new Set(people.map((person) => person.id))
  const relationships = mergeCollection<Relationship>(base.relationships, local.relationships, remote.relationships, conflict)
    .filter((relationship) => personIds.has(relationship.sourceId) && personIds.has(relationship.targetId))

  return {
    conflicts,
    tree: {
      version: 1,
      id: local.id,
      name: mergeValue(base.name, local.name, remote.name, conflict),
      updatedAt: new Date().toISOString(),
      people,
      relationships,
    },
  }
}
