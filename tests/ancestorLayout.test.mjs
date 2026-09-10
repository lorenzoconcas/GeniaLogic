import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/services/ancestorLayout.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { ancestorLayout, ancestorSvg } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const measure = text => [...text].length * 11
const person = (id, extra = {}) => ({ id, firstName: `Persona ${id}`, lastName: 'Concas', gender: 'unspecified', color: '#5657d9', ...extra })
const link = (sourceId, targetId, type = 'biological-parent') => ({ id: `${sourceId}-${targetId}-${type}`, sourceId, targetId, type })

test('only follows incoming ancestry, including all adoptive and foster parents', () => {
  const people = ['root', 'father', 'mother', 'adoptive', 'foster', 'child', 'spouse', 'sibling', 'guardian'].map(id => person(id))
  const relationships = [link('father', 'root'), link('mother', 'root'), link('adoptive', 'root', 'adoptive-parent'), link('foster', 'root', 'foster-parent'), link('root', 'child'), link('spouse', 'root', 'married'), link('sibling', 'root', 'sibling'), link('guardian', 'root', 'guardian'), link('missing', 'root')]
  const chart = ancestorLayout(people, relationships, 'root', 4, 'horizontal', measure)
  assert.deepEqual(chart.nodes.map(n => n.person.id).sort(), ['adoptive', 'father', 'foster', 'mother', 'root'])
  assert.equal(chart.links.length, 4)
  assert.equal(chart.links.filter(l => l.dash).length, 2)
})

test('full trees of 1–10 generations have non-overlapping cards within export bounds in both orientations', () => {
  for (let generations = 1; generations <= 10; generations++) {
    const count = 2 ** (generations + 1) - 1
    const people = Array.from({ length: count }, (_, i) => person(String(i)))
    const relationships = people.slice(1).map((p, i) => link(p.id, String(Math.floor(i / 2))))
    for (const orientation of ['horizontal', 'vertical']) {
      const chart = ancestorLayout(people, relationships, '0', generations, orientation, measure)
      assert.equal(chart.nodes.length, count)
      assert.equal(chart.links.length, count - 1)
      for (const [i, node] of chart.nodes.entries()) {
        assert.ok(node.x >= 0 && node.y >= 100)
        assert.ok(node.x + chart.cardWidth < chart.width)
        assert.ok(node.y + chart.cardHeight < chart.height)
        for (const other of chart.nodes.slice(i + 1)) {
          assert.ok(node.x + chart.cardWidth <= other.x || other.x + chart.cardWidth <= node.x || node.y + chart.cardHeight <= other.y || other.y + chart.cardHeight <= node.y)
        }
        if (node.parentId) {
          const child = chart.nodes.find(n => n.id === node.parentId)
          assert.ok(orientation === 'horizontal' ? node.x > child.x : node.y < child.y)
        }
      }
      const svg = ancestorSvg(chart)
      assert.equal((svg.match(/<g>/g) ?? []).length, count)
      assert.ok(!svg.includes('NaN'))
      assert.ok(svg.includes(`width="${chart.width}"`))
    }
  }
})

test('shared ancestors repeat on separate branches; cyclic paths stop explicitly', () => {
  const people = ['root', 'a', 'b', 'shared'].map(id => person(id))
  const relationships = [link('a', 'root'), link('b', 'root'), link('shared', 'a'), link('shared', 'b'), link('root', 'shared')]
  const chart = ancestorLayout(people, relationships, 'root', 6, 'horizontal', measure)
  assert.equal(chart.nodes.filter(n => n.person.id === 'shared').length, 2)
  assert.equal(chart.nodes.filter(n => n.cycle).length, 2)
  assert.equal(chart.nodes.length, 7)
  assert.ok(chart.cycles)
  assert.ok(ancestorSvg(chart).includes('Ciclo: ramo interrotto'))
})

test('generation limit, duplicate links, isolated root and missing roots', () => {
  const people = ['root', 'parent', 'grandparent'].map(id => person(id))
  const relationships = [link('parent', 'root'), link('parent', 'root'), link('grandparent', 'parent')]
  assert.equal(ancestorLayout(people, relationships, 'root', 1, 'vertical', measure).nodes.length, 2)
  assert.equal(ancestorLayout(people, [], 'root', 4, 'vertical', measure).nodes.length, 1)
  assert.throws(() => ancestorLayout(people, [], 'missing', 4, 'vertical', measure), /persona/)
  assert.throws(() => ancestorLayout(people, [], 'root', 11, 'vertical', measure), /generazioni/)
})

test('preserves long names without abbreviations and escapes user content in standalone SVG', () => {
  const name = 'Èlia <script> & "' + 'Lunghissimo'.repeat(15)
  const root = person('root', { firstName: name, lastName: 'D’André', color: '#fff" onload="alert(1)' })
  const chart = ancestorLayout([root], [], 'root', 4, 'horizontal', measure)
  const lines = chart.nodes[0].lines.slice(0, -1)
  assert.equal(lines.join('').replace(/\s/g, ''), `${name}D’André`.replace(/\s/g, ''))
  assert.ok(lines.every(line => measure(line) <= 230))
  assert.ok(chart.cardHeight >= chart.nodes[0].lines.length * 24 + 32)
  const svg = ancestorSvg(chart)
  assert.ok(svg.includes('&lt;script&gt;'))
  assert.ok(!svg.includes('<script>') && !svg.includes('onload='))
  assert.ok(!svg.includes('foreignObject') && !svg.includes('href='))
})

test('does not mutate source data and layout is stable after relationship reordering', () => {
  const people = ['root', 'a', 'b'].map(id => person(id))
  const relationships = [link('b', 'root'), link('a', 'root')]
  const before = JSON.stringify({ people, relationships })
  const chart = ancestorLayout(people, relationships, 'root', 3, 'horizontal', measure)
  assert.equal(JSON.stringify({ people, relationships }), before)
  const reversed = ancestorLayout(people, [...relationships].reverse(), 'root', 3, 'horizontal', measure)
  assert.deepEqual(chart, reversed)
})
