import type { Person, Relationship } from '../types'

export type AncestorOrientation = 'horizontal' | 'vertical'
type Measure = (text: string) => number
export type AncestorNode = {
  id: string; person: Person; generation: number; parentId?: string;
  relationshipType?: string; cycle: boolean; lines: string[]; x: number; y: number; span: number
}
export const ancestorLinkStyles: Record<string, { color: string; dash: string; label: string }> = {
  'biological-parent': { color: '#596176', dash: '', label: 'Biologico' },
  'adoptive-parent': { color: '#5657d9', dash: '8 4', label: 'Adottivo' },
  'foster-parent': { color: '#b46619', dash: '2 5', label: 'Affido' },
}
export const ancestorColor = (person: Person) => /^#[\da-f]{6}$/i.test(person.color) ? person.color : '#5657d9'
const escapeXml = (text: string) => text.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!)

function wrapName(text: string, measure: Measure): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.trim().split(/\s+/u)) {
    const candidate = line ? `${line} ${word}` : word
    if (measure(candidate) <= 230) { line = candidate; continue }
    if (line) { lines.push(line); line = '' }
    for (const char of word) {
      if (line && measure(line + char) > 230) { lines.push(line); line = '' }
      line += char
    }
  }
  if (line) lines.push(line)
  return lines
}

export function ancestorLayout(people: Person[], relationships: Relationship[], rootId: string, generations: number, orientation: AncestorOrientation, measure: Measure) {
  if (!Number.isInteger(generations) || generations < 1 || generations > 6) throw new Error('Scegli da 1 a 6 generazioni.')
  const byId = new Map(people.map(person => [person.id, person]))
  if (!byId.has(rootId)) throw new Error('Scegli una persona di partenza.')
  const parents = new Map<string, Relationship[]>()
  for (const relationship of relationships) {
    if (!Object.hasOwn(ancestorLinkStyles, relationship.type) || !byId.has(relationship.sourceId) || !byId.has(relationship.targetId)) continue
    const list = parents.get(relationship.targetId) ?? []
    if (!list.some(item => item.sourceId === relationship.sourceId && item.type === relationship.type)) list.push(relationship)
    parents.set(relationship.targetId, list)
  }
  for (const list of parents.values()) list.sort((a, b) => {
    const first = byId.get(a.sourceId)!, second = byId.get(b.sourceId)!
    const rank = (p: Person) => p.gender === 'male' ? 0 : p.gender === 'female' ? 1 : 2
    return rank(first) - rank(second) || first.lastName.localeCompare(second.lastName, 'it') || first.firstName.localeCompare(second.firstName, 'it') || a.id.localeCompare(b.id)
  })
  const nodes: AncestorNode[] = []
  const children = new Map<string, AncestorNode[]>()
  function visit(personId: string, generation: number, path: Set<string>, parentId?: string, relationshipType?: string): AncestorNode {
    if (nodes.length >= 2000) throw new Error('Troppi rami da visualizzare: riduci il numero di generazioni.')
    const person = byId.get(personId)!
    const cycle = path.has(personId)
    const dates = person.deathDate ? `${person.birthDate?.slice(0, 4) || '?'}–${person.deathDate.slice(0, 4)}` : person.birthDate ? `n. ${person.birthDate.slice(0, 4)}` : 'Date non inserite'
    const lines = [...wrapName(`${person.firstName} ${person.lastName}`, measure), dates]
    if (cycle) lines.push('Ciclo: ramo interrotto')
    const node: AncestorNode = { id: `ancestor-${nodes.length}`, person, generation, parentId, relationshipType, cycle, lines, x: 0, y: 0, span: 1 }
    nodes.push(node)
    const nextPath = new Set(path).add(personId)
    const ancestors = !cycle && generation < generations ? (parents.get(personId) ?? []).map(link => visit(link.sourceId, generation + 1, nextPath, node.id, link.type)) : []
    children.set(node.id, ancestors)
    node.span = Math.max(1, ancestors.reduce((sum, item) => sum + item.span, 0))
    return node
  }
  const root = visit(rootId, 0, new Set())
  const cardWidth = 300
  const cardHeight = Math.max(96, ...nodes.map(node => node.lines.length * 24 + 32))
  const maxGeneration = Math.max(...nodes.map(node => node.generation))
  const crossStep = (orientation === 'horizontal' ? cardHeight : cardWidth) + 32
  const depthStep = (orientation === 'horizontal' ? cardWidth : cardHeight) + 90
  function place(node: AncestorNode, start: number) {
    const cross = (start + node.span / 2) * crossStep
    if (orientation === 'horizontal') {
      node.x = 40 + node.generation * depthStep
      node.y = 105 + cross - cardHeight / 2
    } else {
      node.x = 40 + cross - cardWidth / 2
      node.y = 105 + (maxGeneration - node.generation) * depthStep
    }
    let offset = start
    for (const ancestor of children.get(node.id) ?? []) { place(ancestor, offset); offset += ancestor.span }
  }
  place(root, 0)
  const width = Math.max(650, Math.ceil(Math.max(...nodes.map(node => node.x + cardWidth)) + 40))
  const height = Math.ceil(Math.max(...nodes.map(node => node.y + cardHeight)) + 70)
  const nodeMap = new Map(nodes.map(node => [node.id, node]))
  const links = nodes.filter(node => node.parentId).map(node => {
    const child = nodeMap.get(node.parentId!)!
    let path: string
    if (orientation === 'horizontal') {
      const x = child.x + cardWidth, y = child.y + cardHeight / 2, targetY = node.y + cardHeight / 2
      const middle = (x + node.x) / 2
      path = `M ${x} ${y} C ${middle} ${y} ${middle} ${targetY} ${node.x} ${targetY}`
    } else {
      const x = child.x + cardWidth / 2, y = child.y, targetX = node.x + cardWidth / 2, targetY = node.y + cardHeight
      const middle = (y + targetY) / 2
      path = `M ${x} ${y} C ${x} ${middle} ${targetX} ${middle} ${targetX} ${targetY}`
    }
    return { id: node.id, path, ...ancestorLinkStyles[node.relationshipType!]! }
  })
  return { nodes, links, width, height, cardWidth, cardHeight, generations, orientation, cycles: nodes.some(node => node.cycle) }
}

export type AncestorChart = ReturnType<typeof ancestorLayout>

export function ancestorSvg(chart: AncestorChart): string {
  const parts = [`<text x="40" y="42" font-size="26" font-weight="700">Albero degli antenati</text>`, `<text x="40" y="74" font-size="16">GeniaLogic · ${chart.generations} generazioni · ${chart.orientation === 'horizontal' ? 'Orizzontale' : 'Verticale'}</text>`]
  for (const link of chart.links) parts.push(`<path d="${link.path}" fill="none" stroke="${link.color}" stroke-width="2" stroke-dasharray="${link.dash}"><title>${link.label}</title></path>`)
  for (const node of chart.nodes) {
    parts.push(`<g><title>${escapeXml(`${node.person.firstName} ${node.person.lastName}`)}</title><rect x="${node.x}" y="${node.y}" width="${chart.cardWidth}" height="${chart.cardHeight}" rx="12" fill="${node.generation ? '#fff' : '#eeefff'}" stroke="${ancestorColor(node.person)}" stroke-width="${node.generation ? 2 : 4}"/>`)
    parts.push(`<text text-anchor="middle" font-size="18" font-weight="600">${node.lines.map((line, index) => `<tspan x="${node.x + chart.cardWidth / 2}" y="${node.y + (chart.cardHeight - node.lines.length * 24) / 2 + 19 + index * 24}">${escapeXml(line)}</tspan>`).join('')}</text></g>`)
  }
  Object.values(ancestorLinkStyles).forEach((style, index) => parts.push(`<path d="M ${40 + index * 190} ${chart.height - 27} h 32" stroke="${style.color}" stroke-width="2" stroke-dasharray="${style.dash}"/><text x="${82 + index * 190}" y="${chart.height - 22}" font-size="16">${style.label}</text>`))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${chart.width}" height="${chart.height}" viewBox="0 0 ${chart.width} ${chart.height}" font-family="Arial, sans-serif" fill="#24283c"><title>Albero degli antenati</title><rect width="100%" height="100%" fill="#fafbfe"/>${parts.join('')}</svg>`
}
