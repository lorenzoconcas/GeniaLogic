import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import * as vue from 'vue'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url))

// Execute real composables and their local dependencies; mock only browser boundaries.
function loadModule(relativePath, overrides = {}, globals = {}) {
  const cache = new Map()
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText
    runInNewContext(code, {
      module,
      exports: module.exports,
      crypto: { randomUUID },
      ...globals,
      require: (name) => {
        if (name in overrides) return overrides[name]
        return name.startsWith('.') ? load(resolve(dirname(filename), `${name}.ts`)) : require(name)
      },
    })
    return module.exports
  }
  return load(resolve(sourceRoot, relativePath))
}
const person = (id) => ({
  id,
  firstName: id,
  lastName: 'Rossi',
  gender: 'unspecified',
  color: '#5657d9',
})
const family = (people = [], relationships = []) => ({
  version: 1,
  id: 'family',
  name: 'Famiglia',
  updatedAt: '2026-01-01',
  people,
  relationships,
})
const parent = (sourceId, targetId) => ({
  id: `${sourceId}-${targetId}`,
  sourceId,
  targetId,
  type: 'biological-parent',
})
const clone = (value) => JSON.parse(JSON.stringify(value))

function editorSetup(initial) {
  const { useTreeEditor } = loadModule('composables/useTreeEditor.ts', { vue })
  const tree = vue.ref(initial)
  const selection = vue.ref(initial.people[0]?.id ?? null)
  const editor = useTreeEditor(
    tree,
    selection,
    vue.ref('tree'),
    () => {},
    () => {},
  )
  return { tree, selection, editor }
}

test('editor follows a replaced archive and removes only that archive’s selected person and links', () => {
  const { tree, selection, editor } = editorSetup(family([person('old')]))
  tree.value = family([person('new'), person('child')], [parent('new', 'child')])
  selection.value = 'new'
  editor.openEditPerson(tree.value.people[0])
  editor.personForm.firstName = ' Nuovo nome '
  editor.submitPerson()
  assert.equal(tree.value.people[0].firstName, 'Nuovo nome')
  editor.deleteSelectedPerson()
  assert.equal(tree.value.people.length, 1)
  assert.equal(tree.value.people[0].id, 'child')
  assert.equal(tree.value.relationships.length, 0)
  assert.equal(selection.value, 'child')
})

test('relationship editing still rejects ancestry cycles and duplicate undirected couples', () => {
  const { tree, editor } = editorSetup(family([person('a'), person('b')], [parent('a', 'b')]))
  editor.openRelationship('b')
  editor.relationshipForm.targetId = 'a'
  editor.submitRelationship()
  assert.match(editor.relationshipError.value, /ciclo/)
  assert.equal(tree.value.relationships.length, 1)
  tree.value.relationships = [{ id: 'couple', sourceId: 'a', targetId: 'b', type: 'married' }]
  editor.relationshipForm.type = 'married'
  editor.submitRelationship()
  assert.match(editor.relationshipError.value, /già presente/)
  assert.equal(tree.value.relationships.length, 1)
})

test('adding a parent from the radial view preserves the child selection', () => {
  const { tree, selection, editor } = editorSetup(family([person('child')]))
  editor.openParentFromRadial({ childId: 'child', gender: 'female' })
  editor.relativeForm.firstName = 'Maria'
  editor.submitRelative()
  assert.equal(selection.value, 'child')
  assert.equal(editor.modal.value, null)
  assert.equal(tree.value.people[1].gender, 'female')
  assert.equal(tree.value.relationships[0].sourceId, tree.value.people[1].id)
  assert.equal(tree.value.relationships[0].targetId, 'child')
})

function archiveSetup({ remembered = true } = {}) {
  let mount
  let disk = family([person('disk')])
  const writes = []
  const exports = []
  const timers = new Map()
  let timerId = 0
  const input = {
    value: '',
    clicks: 0,
    click() {
      this.clicks++
    },
  }
  const handle = { name: 'famiglia.genia' }
  const storage = {
    getRememberedFileHandle: async () => (remembered ? handle : null),
    loadLocal: async () => family([person('stale')]),
    ensureFilePermission: async () => true,
    readTreeHandle: async () => ({ tree: clone(disk), name: handle.name, lastModified: 1 }),
    rememberFileHandle: async () => {},
    forgetFileHandle: async () => {},
    writeTreeHandle: async (_, tree) => {
      writes.push(clone(tree))
      disk = clone(tree)
    },
    saveLocal: async () => {},
    pickTreeHandle: async () => null,
    importTree: async () => clone(disk),
    exportTree: async (tree) => exports.push(clone(tree)),
  }
  const { useTreeArchive } = loadModule(
    'composables/useTreeArchive.ts',
    {
      vue: {
        ...vue,
        onMounted: (callback) => {
          mount = callback
        },
        useTemplateRef: () => vue.ref(input),
      },
      '../services/storage': storage,
    },
    {
      window: {
        clearTimeout: (id) => timers.delete(id),
        setTimeout: (callback) => {
          timers.set(++timerId, callback)
          return timerId
        },
      },
    },
  )
  const scope = vue.effectScope()
  const tree = vue.ref(family())
  const selection = vue.ref(null)
  const archive = scope.run(() =>
    useTreeArchive(
      tree,
      selection,
      vue.ref('tree'),
      () => {},
      () => {},
      () => {},
    ),
  )
  return {
    tree,
    selection,
    archive,
    mount,
    writes,
    exports,
    input,
    scope,
    changeDisk: (value) => {
      disk = value
    },
  }
}

test('archive waits for startup choice, reloads disk, and detects changes again before overwrite', async () => {
  const state = archiveSetup()
  try {
    await state.mount()
    assert.equal(state.archive.hydrated.value, false)
    assert.equal(state.tree.value.people.length, 0)
    await state.archive.reopenPrevious()
    assert.equal(state.archive.hydrated.value, true)
    assert.equal(state.selection.value, 'disk')
    state.tree.value.name = 'Local edit'
    state.changeDisk({ ...family([person('disk')]), name: 'External edit' })
    await state.archive.saveFile()
    assert.equal(state.writes.length, 0)
    assert.equal(state.archive.pendingFileConflict.value.tree.name, 'External edit')
    state.changeDisk({ ...family([person('disk')]), name: 'Another external edit' })
    await state.archive.resolveFileConflict('overwrite')
    assert.equal(state.writes.length, 0)
    assert.equal(state.archive.pendingFileConflict.value.tree.name, 'Another external edit')
    await state.archive.resolveFileConflict('overwrite')
    assert.equal(state.writes.length, 1)
    assert.equal(state.writes[0].name, 'Local edit')
    assert.equal(state.archive.pendingFileConflict.value, null)
  } finally {
    state.scope.stop()
  }
})

test('fallback file picker remains connected for opening and verifying a subsequent save', async () => {
  const state = archiveSetup({ remembered: false })
  try {
    await state.mount()
    await state.archive.declinePrevious()
    await state.archive.chooseFile()
    assert.equal(state.input.clicks, 1)
    const event = {
      target: { files: [{ name: 'famiglia.genia', lastModified: 1 }], value: 'selected' },
    }
    await state.archive.openFile(event)
    assert.equal(state.selection.value, 'disk')
    state.tree.value.name = 'Updated'
    await state.archive.saveFile()
    assert.equal(state.input.clicks, 2)
    assert.equal(state.exports.length, 0)
    await state.archive.openFile(event)
    assert.equal(state.exports.length, 1)
    assert.equal(state.exports[0].name, 'Updated')
  } finally {
    state.scope.stop()
  }
})
