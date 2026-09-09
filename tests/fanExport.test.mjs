import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/services/fanExport.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { createFanExport, pngScale, fanPng, downloadFan } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const measure = (text, size) => [...text].length * size * .6
const person = (id, firstName = 'Maria Angela', lastName = 'Concas') => ({ id, firstName, lastName, gender: 'female', color: '#5657d9', birthDate: '1920-02-03' })

test('all names stay inside the rays and arcs for 3–6 full generations', () => {
  for (let count = 3; count <= 6; count++) {
    const slots = []
    for (let generation = 1; generation <= count; generation++) {
      for (let index = 0; index < 2 ** generation; index++) slots.push({ generation, index, person: person(`${generation}-${index}`, 'Giovanni Antonio', 'Della Rocca Concas') })
    }
    const chart = createFanExport(person('root'), slots, count, [], measure)
    assert.equal(chart.rings.flatMap((ring) => ring.members).length, 2 ** (count + 1) - 2)
    for (const ring of chart.rings) {
      for (const slot of ring.members) {
        assert.equal(slot.label.lines.slice(0, -1).join('').replace(/\s/g, ''), `${slot.person.firstName}${slot.person.lastName}`.replace(/\s/g, ''))
        const near = ring.labelRadius - slot.label.width / 2
        const far = ring.labelRadius + slot.label.width / 2
        assert.ok(near >= ring.inner + 15)
        assert.ok(Math.atan2(slot.label.height / 2, near) < ring.angle / 2)
        assert.ok(Math.hypot(far, slot.label.height / 2) < ring.outer)
      }
    }
    const scale = pngScale(chart.width, chart.height)
    assert.ok(scale >= 1 && scale <= 2)
    assert.ok(chart.width * chart.height * scale ** 2 <= 16_000_001)
  }
})

test('escapes XML, preserves long unbroken names and includes every relative', () => {
  const root = person('root', 'Èlia <script>&"', 'D’Angelo')
  const longName = 'Supercalifragilistichespiralidoso'.repeat(6)
  const ancestor = person('parent', longName, 'De André')
  ancestor.color = '#fff" onload="alert(1)'
  const chart = createFanExport(root, [{ generation: 1, index: 0, person: ancestor }], 3, [{ title: 'Figli', people: Array.from({ length: 30 }, (_, i) => person(`child-${i}`, `Figlio${i}`)) }, { title: 'Fratelli e sorelle', people: [] }], measure)
  assert.ok(chart.svg.includes('Èlia &lt;script&gt;&amp;&quot;'))
  assert.ok(!chart.svg.includes('<script>'))
  assert.ok(!chart.svg.includes('onload='))
  assert.ok(chart.svg.includes('Figlio29'))
  assert.ok(chart.svg.includes('Nessuna persona registrata'))
  const label = chart.rings[0].members[0].label
  assert.equal(label.lines.slice(0, -1).join('').replace(/\s/g, ''), `${longName}DeAndré`)
  assert.ok(chart.height > 2000)
  assert.ok(!chart.svg.includes('foreignObject'))
  assert.ok(!chart.svg.includes('href='))
})

test('empty ancestor slots and very large PNGs have explicit behavior', () => {
  const chart = createFanExport(person('root'), [{ generation: 1, index: 0 }, { generation: 1, index: 1 }], 3, [], measure)
  assert.ok(chart.svg.includes('Maria Angela'))
  assert.ok(Number.isFinite(chart.width) && Number.isFinite(chart.height))
  assert.throws(() => pngScale(10_000, 10_000), /SVG/)
  assert.throws(() => createFanExport(person('root'), [], 7, [], measure), /generazioni/)
})

test('PNG conversion returns the encoded blob and cleans up resources on success and failure', async () => {
  const originalDocument = globalThis.document
  const originalImage = globalThis.Image
  const create = URL.createObjectURL
  const revoke = URL.revokeObjectURL
  let revoked = 0
  let drawCalls = 0
  let fail = false
  let canvas
  try {
    URL.createObjectURL = () => 'blob:test'
    URL.revokeObjectURL = () => revoked++
    globalThis.Image = class { set src(_) { queueMicrotask(() => this.onload()) } }
    globalThis.document = { createElement: () => (canvas = { width: 0, height: 0, getContext: () => ({ drawImage: () => drawCalls++ }), toBlob: (callback) => callback(fail ? null : new Blob(['png'], { type: 'image/png' })) }) }
    const result = await fanPng({ svg: '<svg/>', width: 1000, height: 1000 })
    assert.equal(result.type, 'image/png')
    assert.equal(drawCalls, 1)
    assert.equal(canvas.width, 0)
    assert.equal(revoked, 1)
    fail = true
    await assert.rejects(fanPng({ svg: '<svg/>', width: 1000, height: 1000 }), /SVG/)
    assert.equal(revoked, 2)
    assert.equal(canvas.height, 0)
    globalThis.Image = class { set src(_) { queueMicrotask(() => this.onerror()) } }
    await assert.rejects(fanPng({ svg: '<svg/>', width: 1000, height: 1000 }), /SVG/)
    assert.equal(revoked, 3)
  } finally {
    globalThis.document = originalDocument
    globalThis.Image = originalImage
    URL.createObjectURL = create
    URL.revokeObjectURL = revoke
  }
})

test('download uses the requested extension and keeps URL alive for Safari', () => {
  const originalDocument = globalThis.document
  const originalTimeout = globalThis.setTimeout
  const create = URL.createObjectURL
  const revoke = URL.revokeObjectURL
  const actions = []
  let timer
  const anchor = { click: () => actions.push('click'), remove: () => actions.push('remove') }
  try {
    URL.createObjectURL = () => 'blob:test'
    URL.revokeObjectURL = () => actions.push('revoke')
    globalThis.document = { createElement: () => anchor, body: { append: () => actions.push('append') } }
    globalThis.setTimeout = (callback, delay) => { timer = callback; assert.equal(delay, 60_000) }
    downloadFan(new Blob(['svg']), 'ventaglio.svg')
    assert.equal(anchor.download, 'ventaglio.svg')
    assert.deepEqual(actions, ['append', 'click', 'remove'])
    timer()
    assert.equal(actions.at(-1), 'revoke')
  } finally {
    globalThis.document = originalDocument
    globalThis.setTimeout = originalTimeout
    URL.createObjectURL = create
    URL.revokeObjectURL = revoke
  }
})
