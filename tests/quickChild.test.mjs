import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/services/quickChild.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { singleSpouse, quickChildRelationships } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const person = id => ({ id, firstName: 'Maria', lastName: 'Concas', gender: 'unspecified', color: '#5657d9' })
const people = ['parent', 'spouse', 'other'].map(person)
const marriage = (sourceId, targetId, type = 'married') => ({ id: `${sourceId}-${targetId}-${type}`, sourceId, targetId, type })
let id = 0
const createId = () => `new-link-${++id}`

test('a single spouse becomes the second parent in either marriage direction', () => {
  for (const relationship of [marriage('parent', 'spouse'), marriage('spouse', 'parent')]) {
    assert.equal(singleSpouse('parent', people, [relationship])?.id, 'spouse')
    for (const gender of ['male', 'female']) {
      const child = { ...person('child'), gender }
      const links = quickChildRelationships('parent', child.id, people, [relationship], createId)
      assert.deepEqual(links.map(link => [link.sourceId, link.targetId, link.type]), [
        ['parent', 'child', 'biological-parent'], ['spouse', 'child', 'biological-parent'],
      ])
      assert.notEqual(links[0].id, links[1].id)
    }
  }
})

test('no spouse or multiple spouses keeps only the chosen parent', () => {
  for (const relationships of [[], [marriage('parent', 'spouse'), marriage('other', 'parent')]]) {
    assert.equal(singleSpouse('parent', people, relationships), undefined)
    assert.deepEqual(quickChildRelationships('parent', 'child', people, relationships, createId).map(link => link.sourceId), ['parent'])
  }
})

test('duplicate records for the same spouse do not add duplicate parents', () => {
  const relationships = [marriage('parent', 'spouse'), marriage('spouse', 'parent'), marriage('parent', 'spouse')]
  assert.equal(quickChildRelationships('parent', 'child', people, relationships, createId).length, 2)
})

test('other relationship kinds, missing people and self-links are not spouses', () => {
  const relationships = ['partner', 'former-partner', 'civil-union', 'separated', 'divorced', 'sibling', 'biological-parent'].map(type => marriage('parent', 'spouse', type))
  relationships.push(marriage('parent', 'missing'), marriage('parent', 'parent'), marriage('spouse', 'other'))
  assert.equal(singleSpouse('parent', people, relationships), undefined)
  assert.equal(quickChildRelationships('parent', 'child', people, relationships, createId).length, 1)
})

test('one marriage plus unrelated links still selects the spouse without changing the archive', () => {
  const relationships = [marriage('parent', 'spouse'), marriage('other', 'parent', 'partner')]
  const before = JSON.stringify({ people, relationships })
  assert.equal(quickChildRelationships('parent', 'child', people, relationships, createId).length, 2)
  assert.equal(JSON.stringify({ people, relationships }), before)
  assert.deepEqual(quickChildRelationships('missing', 'child', people, relationships, createId), [])
  assert.deepEqual(quickChildRelationships('parent', 'parent', people, relationships, createId), [])
})
