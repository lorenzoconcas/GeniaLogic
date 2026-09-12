import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/services/treeMerge.ts', import.meta.url), 'utf8').replace("import type { FamilyTree, Person, Relationship } from '../types'\n", '')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { mergeTrees } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const person = (id, firstName) => ({ id, firstName, lastName: 'Rossi', gender: 'unspecified', color: '#000' })
const tree = (people, relationships = []) => ({ version: 1, id: 'tree', name: 'Famiglia', updatedAt: '2026-01-01', people, relationships })

test('combines additions and independent field edits from both copies', () => {
  const base = tree([person('a', 'Anna')])
  const local = tree([{ ...person('a', 'Anna'), notes: 'locale' }, person('b', 'Bruno')])
  const remote = tree([{ ...person('a', 'Anita'), occupation: 'Medico' }, person('c', 'Carla')])
  const result = mergeTrees(base, local, remote)
  assert.equal(result.conflicts, 0)
  assert.deepEqual(result.tree.people.map(person => person.id), ['a', 'b', 'c'])
  assert.deepEqual(result.tree.people[0], { ...person('a', 'Anita'), notes: 'locale', occupation: 'Medico' })
})

test('keeps local value and reports when the same field changed twice', () => {
  const base = tree([person('a', 'Anna')])
  const result = mergeTrees(base, tree([person('a', 'Ada')]), tree([person('a', 'Anita')]))
  assert.equal(result.tree.people[0].firstName, 'Ada')
  assert.equal(result.conflicts, 1)
})

test('does not lose an edited record when the other copy deleted it', () => {
  const base = tree([person('a', 'Anna')])
  const result = mergeTrees(base, tree([]), tree([person('a', 'Anita')]))
  assert.equal(result.tree.people[0].firstName, 'Anita')
  assert.equal(result.conflicts, 1)
})
