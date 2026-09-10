import type { Person } from '../types'

export type ExportSlot = { generation: number; index: number; person?: Person }
export type FanShape = 'fan' | 'circle'

export function fanSectorAngles(generation: number, index: number, shape: FanShape = 'fan') {
  const angle = (shape === 'circle' ? Math.PI * 2 : Math.PI) / 2 ** generation
  // Keep the paternal half on the left and the maternal half on the right.
  const origin = shape === 'circle' ? Math.PI * 1.5 : Math.PI
  const start = origin - (index + 1) * angle
  const end = origin - index * angle
  return { angle, start, end, middle: (start + end) / 2 }
}

export function readableRotation(degrees: number) {
  return ((degrees + 90) % 180 + 180) % 180 - 90
}
type RelativeGroup = { title: string; people: Person[] }
type MeasureText = (text: string, size: number) => number
const fontSize = 18
const lineHeight = 24
const padding = 16
const margin = 40

const escapeXml = (text: string) => text.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!)
const fullName = (person: Person) => `${person.firstName} ${person.lastName}`.trim()
const color = (person?: Person) => /^#[\da-f]{6}$/i.test(person?.color ?? '') ? person!.color : '#6264c9'
const years = (person: Person) => person.deathDate ? `${person.birthDate?.slice(0, 4) || '?'}–${person.deathDate.slice(0, 4)}` : person.birthDate ? `n. ${person.birthDate.slice(0, 4)}` : 'Date non inserite'

// Never truncate: even a long, unbroken surname is split into multiple lines.
function wrap(text: string, maxWidth: number, measure: MeasureText): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.trim().split(/\s+/u)) {
    const candidate = line ? `${line} ${word}` : word
    if (measure(candidate, fontSize) <= maxWidth) { line = candidate; continue }
    if (line) { lines.push(line); line = '' }
    for (const char of word) {
      if (line && measure(line + char, fontSize) > maxWidth) { lines.push(line); line = '' }
      line += char
    }
  }
  if (line) lines.push(line)
  return lines
}

function personLabel(person: Person, measure: MeasureText) {
  const lines = [...wrap(fullName(person), 230, measure), years(person)]
  // Extra metric allowance keeps exported SVGs safe with substitute system fonts.
  return { lines, width: Math.max(...lines.map((line) => measure(line, fontSize))) * 1.15 + 8, height: lines.length * lineHeight }
}

export function createFanExport(root: Person, slots: ExportSlot[], generations: number, groups: RelativeGroup[], measure: MeasureText, shape: FanShape = 'fan') {
  if (!Number.isInteger(generations) || generations < 1 || generations > 10) throw new Error('Numero di generazioni non valido.')
  const rootLabel = personLabel(root, measure)
  const rootRadius = Math.max(110, Math.hypot(rootLabel.width / 2, rootLabel.height / 2) + padding)
  let radius = rootRadius + 10
  const rings = []
  for (let generation = 1; generation <= generations; generation++) {
    const angle = fanSectorAngles(generation, 0, shape).angle
    const members = slots.filter((slot) => slot.generation === generation).map((slot) => ({ ...slot, label: slot.person ? personLabel(slot.person, measure) : undefined }))
    const width = Math.max(80, ...members.map((slot) => slot.label?.width ?? 0))
    const height = Math.max(24, ...members.map((slot) => slot.label?.height ?? 0))
    // A label's entire rectangle must stay between both rays and both arcs.
    const start = Math.max(radius + padding, (height / 2 + padding) / Math.tan(angle / 2))
    const outer = Math.hypot(start + width, height / 2) + padding
    rings.push({ generation, inner: radius, outer, labelRadius: start + width / 2, width, height, angle, members })
    radius = outer
  }
  const width = Math.ceil(radius * 2 + margin * 2)
  const cx = width / 2
  const cy = radius + 100
  let footerY = cy + (shape === 'circle' ? radius : rootRadius) + 55
  const parts: string[] = []
  const textLines = (lines: string[], x: number, y: number, fill = '#24283c') => `<text x="${x}" y="${y}" text-anchor="middle" fill="${fill}" font-size="${fontSize}" font-weight="600">${lines.map((line, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${escapeXml(line)}</tspan>`).join('')}</text>`
  const polar = (r: number, a: number) => `${cx + Math.cos(a) * r} ${cy - Math.sin(a) * r}`
  parts.push(`<text x="40" y="42" font-size="26" font-weight="700" fill="#24283c">${shape === 'circle' ? 'Albero genealogico radiale' : 'Ventaglio genealogico'}</text>`)
  parts.push(`<text x="40" y="72" font-size="16" fill="#555c70">GeniaLogic · ${generations} generazioni di antenati</text>`)
  for (const ring of rings) {
    for (const slot of ring.members) {
      const { start, end, middle } = fanSectorAngles(ring.generation, slot.index, shape)
      const path = `M ${polar(ring.outer, start)} A ${ring.outer} ${ring.outer} 0 0 0 ${polar(ring.outer, end)} L ${polar(ring.inner, end)} A ${ring.inner} ${ring.inner} 0 0 1 ${polar(ring.inner, start)} Z`
      parts.push(`<path d="${path}" fill="${slot.person ? color(slot.person) : '#f1f3f8'}" fill-opacity="${slot.person ? '.14' : '1'}" stroke="#b9c0d1" stroke-width="1"/>`)
      if (!slot.person || !slot.label) continue
      const rotation = readableRotation(-middle * 180 / Math.PI)
      parts.push(`<g transform="translate(${polar(ring.labelRadius, middle)}) rotate(${rotation})"><title>${escapeXml(fullName(slot.person))}</title>${textLines(slot.label.lines, 0, -slot.label.height / 2 + 19)}</g>`)
    }
  }
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${rootRadius}" fill="#eeefff" stroke="${color(root)}" stroke-width="3"/>`)
  parts.push(textLines(rootLabel.lines, cx, cy - rootLabel.height / 2 + 19))
  // Include every close relative, including those hidden by the on-screen scroll area.
  const columnWidth = (width - margin * 2 - 40) / 2
  const groupBottoms = groups.map((group, index) => {
    const x = margin + index % 2 * (columnWidth + 40)
    let y = footerY
    parts.push(`<text x="${x}" y="${y}" font-size="22" font-weight="700" fill="#24283c">${escapeXml(group.title)} (${group.people.length})</text>`)
    y += 35
    if (!group.people.length) {
      parts.push(`<text x="${x}" y="${y}" font-size="18" fill="#555c70">Nessuna persona registrata</text>`)
      y += 28
    }
    for (const person of group.people) {
      const lines = [...wrap(fullName(person), columnWidth / 1.15 - 40, measure), years(person)]
      const height = lines.length * lineHeight + 24
      parts.push(`<rect x="${x}" y="${y - 20}" width="${columnWidth}" height="${height}" rx="8" fill="#f5f6fb"/>`)
      parts.push(textLines(lines, x + columnWidth / 2, y))
      y += height + 12
    }
    return y
  })
  footerY = Math.max(footerY, ...groupBottoms)
  const height = Math.ceil(footerY + margin)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Arial, sans-serif"><title>${escapeXml(`Antenati di ${fullName(root)}`)}</title><rect width="100%" height="100%" fill="white"/>${parts.join('')}</svg>`
  return { svg, width, height, rings, centerX: cx, centerY: cy, outerRadius: radius, shape }
}

export function pngScale(width: number, height: number) {
  // Bound mobile canvas memory without making text smaller than its designed size.
  const scale = Math.min(2, 8192 / width, 8192 / height, Math.sqrt(16_000_000 / (width * height)))
  if (scale < 1) throw new Error('Questo grafico è troppo grande per un PNG leggibile. Esportalo in SVG oppure riduci le generazioni.')
  return scale
}

export async function fanPng(chart: { svg: string; width: number; height: number }): Promise<Blob> {
  const scale = pngScale(chart.width, chart.height)
  const url = URL.createObjectURL(new Blob([chart.svg], { type: 'image/svg+xml;charset=utf-8' }))
  const canvas = document.createElement('canvas')
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Impossibile preparare il PNG. Prova il formato SVG.'))
      image.src = url
    })
    canvas.width = Math.floor(chart.width * scale)
    canvas.height = Math.floor(chart.height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Memoria insufficiente per il PNG. Prova il formato SVG.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Impossibile creare il PNG. Prova il formato SVG.')), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
    canvas.width = canvas.height = 0
  }
}

export function downloadFan(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Safari may consume the URL after the click handler finishes.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
