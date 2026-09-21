import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

const source = readFileSync(new URL('../src/services/storage.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText
const { suggestedTreeFileName } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
)

const tree = (people, name = 'Nuovo albero') => ({
  version: 1,
  id: 'tree',
  name,
  updatedAt: '2026-01-01',
  people,
  relationships: [],
})

test('suggests the archive name from the initial person', () => {
  assert.equal(
    suggestedTreeFileName(tree([{ firstName: 'Èlia Maria', lastName: "D'Angelo", id: 'root' }])),
    'èlia-maria-d-angelo.genia',
  )
})

test('uses the tree name only until an initial person exists', () => {
  assert.equal(suggestedTreeFileName(tree([], 'Famiglia Rossi')), 'famiglia-rossi.genia')
})
