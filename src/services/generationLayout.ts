import type { Person, Relationship } from '../types'

const parentTypes = new Set(['biological-parent', 'adoptive-parent', 'foster-parent', 'guardian'])
const coupleTypes = new Set(['married', 'civil-union', 'partner', 'separated', 'divorced', 'former-partner'])
const cardPitch = 252
const branchGap = 96
const generationPitch = 230

/** Reserve the entire width of each descendant branch before placing its ancestors. */
export function generationLayout(people: Person[], relationships: Relationship[]) {
  const ids = people.map(person => person.id).sort()
  const groupOf = new Map(ids.map(id => [id, id]))
  const validLinks = relationships.filter(link => groupOf.has(link.sourceId) && groupOf.has(link.targetId))
  const parentLinks = validLinks.filter(link => parentTypes.has(link.type))
  const reaches = (from: string, to: string) => {
    const visited = new Set<string>()
    const pending = [from]
    while (pending.length) {
      const current = pending.pop()!
      if (current === to) return true
      if (visited.has(current)) continue
      visited.add(current)
      for (const link of parentLinks) {
        if (groupOf.get(link.sourceId) === current) pending.push(groupOf.get(link.targetId)!)
      }
    }
    return false
  }
  const join = (first: string, second: string) => {
    const a = groupOf.get(first)!
    const b = groupOf.get(second)!
    // Contract only peers: merging ancestors or a path between groups would create a cycle.
    if (a === b || reaches(a, b) || reaches(b, a)) return
    const representative = a < b ? a : b
    for (const [id, group] of groupOf) if (group === a || group === b) groupOf.set(id, representative)
  }
  for (const link of [...validLinks].sort((a, b) => a.id.localeCompare(b.id))) {
    if (coupleTypes.has(link.type)) join(link.sourceId, link.targetId)
  }
  for (const childId of ids) {
    const parents = [...new Set(parentLinks.filter(link => link.targetId === childId).map(link => link.sourceId))].sort()
    for (let index = 1; index < parents.length; index++) join(parents[0]!, parents[index]!)
  }

  const members = new Map<string, string[]>()
  for (const id of ids) {
    const group = groupOf.get(id)!
    members.set(group, [...(members.get(group) ?? []), id])
  }
  const parents = new Map([...members.keys()].map(id => [id, new Set<string>()]))
  const children = new Map([...members.keys()].map(id => [id, new Set<string>()]))
  // Keep layout acyclic even if a loaded archive contains contradictory ancestry.
  const hasPath = (from: string, to: string, visited = new Set<string>()): boolean => {
    if (from === to) return true
    if (visited.has(from)) return false
    visited.add(from)
    return [...children.get(from)!].some(child => hasPath(child, to, visited))
  }
  for (const link of [...parentLinks].sort((a, b) => a.id.localeCompare(b.id))) {
    const source = groupOf.get(link.sourceId)!
    const target = groupOf.get(link.targetId)!
    if (hasPath(target, source)) continue
    parents.get(target)!.add(source)
    children.get(source)!.add(target)
  }
  const ranks = new Map<string, number>()
  const rank = (id: string): number => {
    if (!ranks.has(id)) ranks.set(id, Math.max(0, ...[...parents.get(id)!].map(parent => rank(parent) + 1)))
    return ranks.get(id)!
  }
  for (const id of members.keys()) rank(id)

  // A shared branch occupies space only once. Other parent links remain visible.
  const branches = new Map([...members.keys()].map(id => [id, [] as string[]]))
  const roots: string[] = []
  for (const id of members.keys()) {
    const owner = [...parents.get(id)!].sort((a, b) => rank(b) - rank(a) || a.localeCompare(b))[0]
    if (owner) branches.get(owner)!.push(id)
    else roots.push(id)
  }
  const widths = new Map<string, number>()
  const width = (id: string): number => {
    if (!widths.has(id)) {
      const descendants = branches.get(id)!
      widths.set(id, Math.max(members.get(id)!.length * cardPitch,
        descendants.reduce((sum, child) => sum + width(child), 0) + Math.max(0, descendants.length - 1) * branchGap))
    }
    return widths.get(id)!
  }
  const positions = new Map<string, { x: number; y: number }>()
  const place = (id: string, left: number) => {
    const center = left + width(id) / 2
    const group = members.get(id)!
    group.forEach((personId, index) => positions.set(personId, {
      x: center + (index - (group.length - 1) / 2) * cardPitch,
      y: rank(id) * generationPitch,
    }))
    const descendants = branches.get(id)!
    const total = descendants.reduce((sum, child) => sum + width(child), 0) + Math.max(0, descendants.length - 1) * branchGap
    let cursor = center - total / 2
    for (const child of descendants) {
      place(child, cursor)
      cursor += width(child) + branchGap
    }
  }
  let cursor = 0
  for (const root of roots) {
    place(root, cursor)
    cursor += width(root) + branchGap * 2
  }
  return positions
}
