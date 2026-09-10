import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'
import { createContext, runInContext } from 'node:vm'

const source = readFileSync(new URL('../src/services/personSearch.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { searchPeople, namesakeIds, personSearchDetails } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const person = (id, fields = {}) => ({ id, firstName: 'Maria', lastName: 'Concas', gender: 'female', color: '#5657d9', ...fields })

test('searches accent-insensitively with multiple words in any order', () => {
  const people = [person('one', { firstName: 'Élia', lastName: 'D’André', birthPlace: 'Cagliari' }), person('two')]
  assert.deepEqual(searchPeople(people, ' ANDRE elia  ').map(p => p.id), ['one'])
  assert.deepEqual(searchPeople(people, 'ELIA cagliari').map(p => p.id), ['one'])
  assert.deepEqual(searchPeople(people, 'Elia Roma'), [])
})

test('searches dates, birth surname, nickname and exact reference', () => {
  const people = [person('unique-reference', { birthDate: '1920-02-03', deathDate: '2005-01-04', nickname: 'Mimì', birthName: 'Sanna' })]
  for (const query of ['1920', '2005', 'mimi', 'sanna', 'unique-reference']) assert.equal(searchPeople(people, query)[0]?.id, 'unique-reference')
  assert.equal(personSearchDetails(people[0]), 'N. 03/02/1920 · † 04/01/2005 · «Mimì»')
  assert.equal(personSearchDetails(person('unknown')), 'Nascita non indicata')
})

test('sorts namesakes by date and stable ID without changing the archive', () => {
  const people = [person('b', { birthDate: '1980-01-01' }), person('c', { birthDate: '1920-01-01' }), person('a', { birthDate: '1980-01-01' })]
  assert.deepEqual(searchPeople(people, 'Maria').map(p => p.id), ['c', 'a', 'b'])
  assert.deepEqual(people.map(p => p.id), ['b', 'c', 'a'])
  assert.deepEqual([...namesakeIds(people)].sort(), ['a', 'b', 'c'])
})

test('detects namesakes across accents and whitespace, without confusing different people', () => {
  const people = [person('a', { firstName: 'Élia' }), person('b', { firstName: ' elia ' }), person('c')]
  assert.deepEqual([...namesakeIds(people)], ['a', 'b'])
})

test('empty/no-match queries are empty; matching lists are not silently capped', () => {
  const people = Array.from({ length: 200 }, (_, i) => person(`id-${i}`))
  assert.deepEqual(searchPeople(people, '  '), [])
  assert.deepEqual(searchPeople(people, 'nessuno'), [])
  assert.equal(searchPeople(people, 'Concas').length, 200)
  assert.deepEqual(searchPeople([], 'Maria'), [])
})

test('fan and radial search select any archive person and reset the viewport without mutating people', () => {
  const component = readFileSync(new URL('../src/components/RadialTree.vue', import.meta.url), 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
  const ast = ts.createSourceFile('RadialTree.ts', component, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const handler = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'selectSearchRoot')
  assert.ok(handler)
  const code = ts.transpileModule(handler.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  for (const shape of ['fan', 'circle']) {
    const people = [person('root'), person('disconnected')]
    const before = JSON.stringify(people)
    const events = []
    const calls = []
    const context = createContext({ props: { people, shape, rootId: 'root' }, exportMessage: { value: 'Old export' }, closeDetails: () => calls.push('close'), resetCamera: () => calls.push('reset'), emit: (...args) => events.push(args) })
    runInContext(code, context)
    context.selectSearchRoot('disconnected')
    assert.deepEqual(events, [['selectPerson', 'disconnected']])
    assert.deepEqual(calls, ['close', 'reset'])
    assert.equal(context.exportMessage.value, '')
    assert.equal(JSON.stringify(people), before)
    context.selectSearchRoot('missing')
    assert.equal(events.length, 1)
    context.selectSearchRoot('root')
    assert.equal(events.length, 2)
    assert.equal(calls.filter(call => call === 'reset').length, 2)
  }
})
