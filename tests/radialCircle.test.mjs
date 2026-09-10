import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/services/fanExport.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { fanSectorAngles, readableRotation, createFanExport, pngScale } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`)
const person = id => ({ id, firstName: 'Giovanni Antonio', lastName: 'Della Rocca Concas', gender: 'male', birthDate: '1920-01-01', color: '#5657d9' })
const measure = (text, size) => [...text].length * size * .6

test('radial sectors cover exactly 360 degrees, while the fan stays at 180', () => {
  for (const shape of ['fan', 'circle']) {
    for (let generation = 1; generation <= 10; generation++) {
      const sectors = Array.from({ length: 2 ** generation }, (_, index) => fanSectorAngles(generation, index, shape))
      near(sectors.reduce((sum, sector) => sum + sector.angle, 0), shape === 'circle' ? 2 * Math.PI : Math.PI)
      for (let i = 1; i < sectors.length; i++) near(sectors[i].end, sectors[i - 1].start)
      if (generation < 10) {
        for (let i = 0; i < sectors.length; i++) {
          const firstParent = fanSectorAngles(generation + 1, i * 2, shape)
          const secondParent = fanSectorAngles(generation + 1, i * 2 + 1, shape)
          near(firstParent.end, sectors[i].end)
          near(secondParent.start, sectors[i].start)
          near(firstParent.start, secondParent.end)
        }
      }
    }
  }
})

test('paternal half is left, maternal half right, labels remain upright in all quadrants', () => {
  assert.ok(Math.cos(fanSectorAngles(1, 0, 'circle').middle) < 0)
  assert.ok(Math.cos(fanSectorAngles(1, 1, 'circle').middle) > 0)
  for (let index = 0; index < 1024; index++) {
    const { middle } = fanSectorAngles(10, index, 'circle')
    for (const input of [-middle * 180 / Math.PI, 90 - middle * 180 / Math.PI]) {
      const rotation = readableRotation(input)
      assert.ok(rotation >= -90 && rotation < 90)
      near(Math.sin((rotation - input) * Math.PI / 180), 0)
    }
  }
})

test('complete radial exports up to ten generations keep every name inside its sector', () => {
  for (let count = 3; count <= 10; count++) {
    const slots = []
    for (let generation = 1; generation <= count; generation++) {
      for (let index = 0; index < 2 ** generation; index++) slots.push({ generation, index, person: person(`${generation}-${index}`) })
    }
    const chart = createFanExport(person('root'), slots, count, [], measure, 'circle')
    assert.equal(chart.shape, 'circle')
    assert.equal(chart.rings.flatMap(ring => ring.members).length, 2 ** (count + 1) - 2)
    assert.ok(chart.centerY - chart.outerRadius > 75)
    assert.ok(chart.centerY + chart.outerRadius < chart.height - 40)
    assert.ok(chart.centerX - chart.outerRadius > 0)
    assert.ok(chart.centerX + chart.outerRadius < chart.width)
    for (const ring of chart.rings) {
      for (const { label } of ring.members) {
        const nearEdge = ring.labelRadius - label.width / 2
        const farEdge = ring.labelRadius + label.width / 2
        assert.ok(nearEdge >= ring.inner + 15)
        assert.ok(Math.atan2(label.height / 2, nearEdge) < ring.angle / 2)
        assert.ok(Math.hypot(farEdge, label.height / 2) < ring.outer)
        assert.equal(label.lines.slice(0, -1).join('').replace(/\s/g, ''), 'GiovanniAntonioDellaRoccaConcas')
      }
    }
    assert.ok(chart.svg.includes('Albero genealogico radiale'))
    assert.ok(!chart.svg.includes('NaN'))
    if (count <= 6) assert.ok(pngScale(chart.width, chart.height) >= 1)
    if (count === 10) assert.throws(() => pngScale(chart.width, chart.height), /SVG/)
  }
})

test('the footer is below the complete circle and contains all close relatives', () => {
  const groups = [{ title: 'Figli', people: [{ ...person('child'), firstName: 'Nome del figlio' }] }, { title: 'Fratelli e sorelle', people: [] }]
  const chart = createFanExport(person('root'), [{ generation: 1, index: 0 }, { generation: 1, index: 1 }], 3, groups, measure, 'circle')
  const match = chart.svg.match(/<text x="[^"]+" y="([^"]+)"[^>]*>Figli \(1\)<\/text>/)
  assert.ok(match)
  assert.ok(Number(match[1]) > chart.centerY + chart.outerRadius)
  assert.ok(chart.svg.includes('Nome del figlio'))
  const fan = createFanExport(person('root'), [], 3, [], measure)
  assert.equal(fan.shape, 'fan')
  assert.ok(fan.svg.includes('Ventaglio genealogico'))
})
