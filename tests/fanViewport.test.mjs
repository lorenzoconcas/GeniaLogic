import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/services/fanViewport.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { zoomFanCamera, panFanCamera, fanWheelFactor, maxFanZoom, fanNavigationModifier } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`)

test('Mac uses Cmd exclusively; Windows and Linux keep Ctrl', () => {
  const cmd = { metaKey: true, ctrlKey: false }
  const ctrl = { metaKey: false, ctrlKey: true }
  for (const platform of ['MacIntel', 'MacARM', 'Macintosh', 'iPad']) {
    const modifier = fanNavigationModifier(platform)
    assert.equal(modifier.label, '⌘ Cmd')
    assert.equal(cmd[modifier.key], true)
    assert.equal(ctrl[modifier.key], false)
  }
  for (const platform of ['Win32', 'Linux x86_64', '']) {
    const modifier = fanNavigationModifier(platform)
    assert.equal(modifier.label, 'Ctrl')
    assert.equal(ctrl[modifier.key], true)
    assert.equal(cmd[modifier.key], false)
  }
})

test('wheel zoom keeps the chart point under the cursor stationary', () => {
  const before = { x: -250, y: 170, zoom: 3 }
  const anchor = { x: 400, y: 280 }
  for (const factor of [.6, 1.3, 2]) {
    const after = zoomFanCamera(before, 1200, 800, factor, anchor)
    near((anchor.x - before.x) * before.zoom, (anchor.x - after.x) * after.zoom)
    near((anchor.y - before.y) * before.zoom, (anchor.y - after.y) * after.zoom)
  }
})

test('zoom buttons use the viewport center and reciprocal zoom restores the camera', () => {
  const before = { x: 130, y: 70, zoom: 2 }
  const after = zoomFanCamera(before, 1000, 600, 2)
  near(before.x + 1000 / before.zoom / 2, after.x + 1000 / after.zoom / 2)
  near(before.y + 600 / before.zoom / 2, after.y + 600 / after.zoom / 2)
  const restored = zoomFanCamera(after, 1000, 600, .5)
  near(restored.x, before.x)
  near(restored.y, before.y)
  near(restored.zoom, before.zoom)
})

test('zoom remains within the full-chart and maximum limits', () => {
  assert.equal(zoomFanCamera({ x: 0, y: 0, zoom: 1 }, 1000, 600, .1).zoom, 1)
  assert.equal(zoomFanCamera({ x: 0, y: 0, zoom: 10 }, 1000, 600, 100).zoom, maxFanZoom)
  const camera = { x: 0, y: 0, zoom: 2 }
  for (const factor of [0, -1, NaN, Infinity]) assert.deepEqual(zoomFanCamera(camera, 1000, 600, factor), camera)
})

test('drag follows the pointer using the frozen initial SVG coordinates, without accumulation', () => {
  const before = { x: 100, y: 200, zoom: 4 }
  const start = { x: 200, y: 300 }
  assert.deepEqual(panFanCamera(before, start, { x: 220, y: 280 }), { x: 80, y: 220, zoom: 4 })
  assert.deepEqual(panFanCamera(before, start, { x: 240, y: 260 }), { x: 60, y: 240, zoom: 4 })
  assert.deepEqual(panFanCamera(before, start, start), before)
  assert.deepEqual(before, { x: 100, y: 200, zoom: 4 })
})

test('wheel delta handles pixel, line and page units and caps extreme jumps', () => {
  near(fanWheelFactor(16, 0, 800), fanWheelFactor(1, 1, 800))
  near(fanWheelFactor(80, 0, 800), fanWheelFactor(.1, 2, 800))
  assert.ok(fanWheelFactor(-10, 0, 800) > 1)
  assert.ok(fanWheelFactor(10, 0, 800) < 1)
  near(fanWheelFactor(100000, 0, 800), fanWheelFactor(240, 0, 800))
  assert.equal(fanWheelFactor(0, 0, 800), 1)
})
