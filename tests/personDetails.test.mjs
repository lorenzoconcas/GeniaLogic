import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const source = readFileSync(new URL('../src/services/personDetails.ts', import.meta.url), 'utf8')
const { personDetailRows, placePersonDetails } = await import(`data:text/javascript;base64,${Buffer.from(compile(source)).toString('base64')}`)
const person = { id: 'a', firstName: 'Maria Angela', lastName: 'Della Rocca', birthDate: '1890-03-05', deathDate: '1975-12-08', birthPlace: 'Cagliari', birthName: 'Concas', nickname: 'Mimì', occupation: 'Insegnante' }

test('detail rows show full dates and all available biographical fields', () => {
  assert.deepEqual(personDetailRows(person), [
    { label: 'Nascita', value: '05/03/1890' }, { label: 'Decesso', value: '08/12/1975' },
    { label: 'Luogo di nascita', value: 'Cagliari' }, { label: 'Cognome alla nascita', value: 'Concas' },
    { label: 'Soprannome', value: 'Mimì' }, { label: 'Professione', value: 'Insegnante' },
  ])
  assert.deepEqual(personDetailRows({}), [{ label: 'Nascita', value: 'Non indicata' }, { label: 'Decesso', value: 'Non indicata' }])
  assert.equal(personDetailRows({ birthDate: '1900' })[0].value, '1900')
})

test('detail card fits at all viewport edges, including narrow screens', () => {
  for (const viewport of [{ width: 1200, height: 900 }, { width: 320, height: 480 }]) {
    const size = { width: Math.min(368, viewport.width - 16), height: Math.min(500, viewport.height - 16) }
    for (const anchor of [{ x: 0, y: 0 }, { x: viewport.width, y: viewport.height }, { x: viewport.width / 2, y: viewport.height / 2 }]) {
      const p = placePersonDetails(anchor, size, viewport)
      assert.ok(p.x >= 8 && p.y >= 8)
      assert.ok(p.x + size.width <= viewport.width - 8)
      assert.ok(p.y + size.height <= viewport.height - 8)
    }
  }
})

// Execute the component's real event handlers with controlled refs and timers.
const component = readFileSync(new URL('../src/components/RadialTree.vue', import.meta.url), 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
const ast = ts.createSourceFile('RadialTree.ts', component, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const handlerNames = new Set(['keepDetailsOpen', 'closeDetails', 'leaveDetails', 'matchesDetails', 'showDetails', 'moveDetails'])
const handlers = ast.statements.filter(node => ts.isFunctionDeclaration(node) && handlerNames.has(node.name?.text)).map(node => node.getText(ast)).join('\n')
function setup(extra = {}, code = handlers) {
  const timers = new Map()
  let timerId = 0
  const context = createContext({
    hoveredSlot: { value: null }, detailAnchor: { value: { x: 0, y: 0 } }, dragging: { value: false },
    navigationModifier: { key: 'metaKey' }, detailOpenTimer: undefined, detailCloseTimer: undefined,
    setTimeout: callback => { timers.set(++timerId, callback); return timerId }, clearTimeout: id => timers.delete(id),
    ...extra,
  })
  runInContext(compile(code), context)
  const flush = () => { for (const [id, callback] of [...timers]) { if (timers.delete(id)) callback() } }
  return { context, flush, timers }
}
const slot = { person, generation: 2, index: 1 }
const mouse = { type: 'pointerenter', pointerType: 'mouse', metaKey: false, ctrlKey: false, clientX: 140, clientY: 220, currentTarget: { getBoundingClientRect: () => ({ right: 150, top: 180, height: 40 }) } }

test('hover opens after delay, stays open over the card and closes on leaving', () => {
  const { context: c, flush } = setup()
  c.showDetails(slot, mouse)
  assert.equal(c.hoveredSlot.value, null)
  flush()
  assert.equal(c.hoveredSlot.value.personId, person.id)
  assert.equal(c.matchesDetails(slot), true)
  assert.equal(c.matchesDetails({ ...slot, index: 2 }), false)
  c.leaveDetails()
  c.keepDetailsOpen()
  flush()
  assert.equal(c.hoveredSlot.value.personId, person.id)
  c.leaveDetails()
  flush()
  assert.equal(c.hoveredSlot.value, null)
})

test('quick exits, empty segments, modifier gestures and drag do not leave a tooltip', () => {
  const { context: c, flush } = setup()
  c.showDetails(slot, mouse)
  c.leaveDetails()
  flush()
  assert.equal(c.hoveredSlot.value, null)
  for (const event of [{ ...mouse, metaKey: true }, { ...mouse, pointerType: 'touch' }]) {
    c.showDetails(slot, event)
    flush()
    assert.equal(c.hoveredSlot.value, null)
  }
  c.dragging.value = true
  c.showDetails(slot, mouse)
  flush()
  assert.equal(c.hoveredSlot.value, null)
  c.dragging.value = false
  c.showDetails({ generation: 3, index: 2 }, mouse)
  flush()
  assert.equal(c.hoveredSlot.value, null)
})

test('keyboard focus opens immediately, and dismissal cancels pending opens', () => {
  const { context: c, flush } = setup()
  c.showDetails(slot, { type: 'focusin', currentTarget: mouse.currentTarget })
  assert.equal(c.hoveredSlot.value.personId, person.id)
  assert.equal(c.detailAnchor.value.x, 150)
  c.closeDetails()
  assert.equal(c.hoveredSlot.value, null)
  c.showDetails(slot, mouse)
  c.closeDetails()
  flush()
  assert.equal(c.hoveredSlot.value, null)
})

const ancestorComponent = readFileSync(new URL('../src/components/AncestorTree.vue', import.meta.url), 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
const ancestorAst = ts.createSourceFile('AncestorTree.ts', ancestorComponent, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const ancestorHandlers = ancestorAst.statements.filter(node => ts.isFunctionDeclaration(node) && (handlerNames.has(node.name?.text) || node.name?.text === 'selectAncestor')).map(node => node.getText(ancestorAst)).join('\n')

test('ancestor hover distinguishes repeated occurrences and only clicking selects a person', () => {
  const events = []
  const { context: c, flush } = setup({ hoveredNodeId: { value: null }, emit: (...args) => events.push(args) }, ancestorHandlers)
  const node = { id: 'ancestor-1', person, generation: 2 }
  c.showDetails(node, mouse)
  assert.equal(c.hoveredNodeId.value, null)
  flush()
  assert.equal(c.hoveredNodeId.value, 'ancestor-1')
  assert.equal(events.length, 0)
  c.leaveDetails()
  c.keepDetailsOpen()
  flush()
  assert.equal(c.hoveredNodeId.value, 'ancestor-1')
  c.showDetails({ ...node, id: 'ancestor-7' }, mouse)
  flush()
  assert.equal(c.hoveredNodeId.value, 'ancestor-7')
  c.selectAncestor(person.id)
  assert.equal(c.hoveredNodeId.value, null)
  assert.deepEqual(events, [['selectPerson', person.id]])
})

test('ancestor details open on keyboard focus and cancel on touch, gestures or dismissal', () => {
  const { context: c, flush } = setup({ hoveredNodeId: { value: null } }, ancestorHandlers)
  const node = { id: 'ancestor-0', person, generation: 0 }
  c.showDetails(node, { type: 'focusin', currentTarget: mouse.currentTarget })
  assert.equal(c.hoveredNodeId.value, node.id)
  c.closeDetails()
  for (const event of [{ ...mouse, pointerType: 'touch' }, { ...mouse, buttons: 1 }, { ...mouse, metaKey: true }, { ...mouse, ctrlKey: true }]) {
    c.showDetails(node, event)
    flush()
    assert.equal(c.hoveredNodeId.value, null)
  }
  c.showDetails(node, mouse)
  c.closeDetails()
  flush()
  assert.equal(c.hoveredNodeId.value, null)
})
