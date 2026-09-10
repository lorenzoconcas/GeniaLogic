<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { ArrowLeft, ChevronDown, ChevronRight, Maximize2, Minus, Plus } from '@lucide/vue'
import type { Gender, Person, Relationship } from '../types'
import { closeRelatives } from '../services/closeRelatives'
import { createFanExport, downloadFan, fanPng, fanSectorAngles, readableRotation, type FanShape } from '../services/fanExport'
import { fanNavigationModifier, fanWheelFactor, maxFanZoom, panFanCamera, zoomFanCamera, type FanCamera } from '../services/fanViewport'
import PersonHoverCard from './PersonHoverCard.vue'
import GraphPersonSearch from './GraphPersonSearch.vue'

const props = defineProps<{
  people: Person[]
  relationships: Relationship[]
  rootId: string
  shape?: FanShape
}>()

const emit = defineEmits<{
  selectPerson: [personId: string]
  addParent: [payload: { childId: string; gender: Extract<Gender, 'male' | 'female'> }]
}>()

type ParentGender = Extract<Gender, 'male' | 'female'>
type FanSlot = {
  generation: number
  index: number
  person?: Person
  childId?: string
  expectedGender?: ParentGender
}

const generations = ref(5)
const isCircle = computed(() => props.shape === 'circle')
const viewLabel = computed(() => isCircle.value ? 'Radiale' : 'Ventaglio')
const navigationModifier = fanNavigationModifier(typeof navigator === 'undefined' ? '' : navigator.platform || navigator.userAgent)
const exporting = ref(false)
const exportMessage = ref('')
const exportFailed = ref(false)

async function exportFan(format: 'png' | 'svg') {
  if (!rootPerson.value || exporting.value) return
  exporting.value = true
  exportMessage.value = ''
  exportFailed.value = false
  try {
    const root = rootPerson.value
    const context = document.createElement('canvas').getContext('2d')
    if (!context) throw new Error('Impossibile preparare il grafico su questo dispositivo.')
    const shape = props.shape ?? 'fan'
    const chart = createFanExport(root, slots.value, generations.value, relativeGroups.value, (text, size) => {
      context.font = `600 ${size}px Arial, sans-serif`
      return context.measureText(text).width
    }, shape)
    const name = `${root.firstName}-${root.lastName}`.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 100)
    const blob = format === 'svg' ? new Blob([chart.svg], { type: 'image/svg+xml;charset=utf-8' }) : await fanPng(chart)
    downloadFan(blob, `GeniaLogic-${shape === 'circle' ? 'radiale' : 'ventaglio'}-${name}.${format}`)
    exportMessage.value = `${format.toUpperCase()} pronto: nomi completi, figli e fratelli inclusi.`
  } catch (error) {
    exportFailed.value = true
    exportMessage.value = error instanceof Error ? error.message : 'Esportazione non riuscita. Riprova in SVG.'
  } finally {
    exporting.value = false
  }
}
const navigationHistory = ref<string[]>([])
let returningTo: string | null = null
const previousPerson = computed(() => {
  for (let index = navigationHistory.value.length - 1; index >= 0; index -= 1) {
    const person = props.people.find((item) => item.id === navigationHistory.value[index])
    if (person && person.id !== props.rootId) return person
  }
  return null
})

watch(() => props.rootId, (currentId, previousId) => {
  const isReturning = currentId === returningTo
  returningTo = null
  if (!isReturning && previousId && props.people.some((person) => person.id === previousId)) {
    navigationHistory.value.push(previousId)
  }
})

function goBack() {
  const previous = previousPerson.value
  if (!previous) return
  const index = navigationHistory.value.lastIndexOf(previous.id)
  navigationHistory.value.splice(index)
  returningTo = previous.id
  emit('selectPerson', previous.id)
}

function selectSearchRoot(personId: string) {
  if (!props.people.some(person => person.id === personId)) return
  closeDetails()
  resetCamera()
  exportMessage.value = ''
  emit('selectPerson', personId)
}

const rootRadius = 88
const ringWidth = 104
const parentTypes = new Set(['biological-parent', 'adoptive-parent', 'foster-parent', 'guardian'])
const rootPerson = computed(() => props.people.find((person) => person.id === props.rootId))
const relatives = computed(() => closeRelatives(props.rootId, props.people, props.relationships))
const relativeGroups = computed(() => [
  { title: 'Figli', people: relatives.value.children, empty: 'Nessun figlio registrato.' },
  { title: 'Fratelli e sorelle', people: relatives.value.siblings, empty: 'Nessun fratello o sorella registrato.' },
])
const outerRadius = computed(() => rootRadius + generations.value * ringWidth)
const canvasWidth = computed(() => outerRadius.value * 2 + 90)
const canvasHeight = computed(() => isCircle.value ? canvasWidth.value : outerRadius.value + rootRadius + 88)
const centerX = computed(() => canvasWidth.value / 2)
const centerY = computed(() => isCircle.value ? canvasHeight.value / 2 : outerRadius.value + 38)
const fanSvg = ref<SVGSVGElement | null>(null)
const camera = ref<FanCamera>({ x: 0, y: 0, zoom: 1 })
const dragging = ref(false)
const detailsId = useId()
const hoveredSlot = ref<{ personId: string; generation: number; index: number } | null>(null)
const detailAnchor = ref({ x: 0, y: 0 })
const hoveredPerson = computed(() => props.people.find(person => person.id === hoveredSlot.value?.personId))
let detailOpenTimer: ReturnType<typeof setTimeout> | undefined
let detailCloseTimer: ReturnType<typeof setTimeout> | undefined

function keepDetailsOpen() { clearTimeout(detailCloseTimer) }
function closeDetails() {
  clearTimeout(detailOpenTimer)
  clearTimeout(detailCloseTimer)
  hoveredSlot.value = null
}
function leaveDetails() {
  clearTimeout(detailOpenTimer)
  clearTimeout(detailCloseTimer)
  detailCloseTimer = setTimeout(closeDetails, 180)
}
function matchesDetails(slot: FanSlot) {
  return hoveredSlot.value?.personId === slot.person?.id && hoveredSlot.value?.generation === slot.generation && hoveredSlot.value?.index === slot.index
}
function showDetails(slot: FanSlot, event: PointerEvent | FocusEvent) {
  clearTimeout(detailOpenTimer)
  if (!slot.person || dragging.value || ('pointerType' in event && (event.pointerType === 'touch' || event[navigationModifier.key]))) { closeDetails(); return }
  keepDetailsOpen()
  const bounds = (event.currentTarget as Element).getBoundingClientRect()
  detailAnchor.value = 'clientX' in event ? { x: event.clientX, y: event.clientY } : { x: bounds.right, y: bounds.top + bounds.height / 2 }
  const selection = { personId: slot.person.id, generation: slot.generation, index: slot.index }
  if (event.type === 'focusin') hoveredSlot.value = selection
  else detailOpenTimer = setTimeout(() => { hoveredSlot.value = selection }, 160)
}
function moveDetails(slot: FanSlot, event: PointerEvent) {
  if (dragging.value || event[navigationModifier.key]) { closeDetails(); return }
  if (matchesDetails(slot)) detailAnchor.value = { x: event.clientX, y: event.clientY }
}
watch([camera, () => props.rootId, generations, () => props.shape], closeDetails)
let drag: { pointerId: number; camera: FanCamera; start: DOMPoint; inverse: DOMMatrix } | null = null
let suppressClick = false
const fanViewBox = computed(() => `${camera.value.x} ${camera.value.y} ${canvasWidth.value / camera.value.zoom} ${canvasHeight.value / camera.value.zoom}`)

function endPan(event?: PointerEvent) {
  if (event && event.pointerId !== drag?.pointerId) return
  const pointerId = drag?.pointerId
  drag = null
  dragging.value = false
  if (pointerId !== undefined && fanSvg.value?.hasPointerCapture(pointerId)) fanSvg.value.releasePointerCapture(pointerId)
}

function resetCamera() {
  endPan()
  camera.value = { x: 0, y: 0, zoom: 1 }
}
watch([() => props.rootId, generations, () => props.shape], resetCamera)
onBeforeUnmount(() => { endPan(); closeDetails() })

function zoomBy(factor: number) {
  endPan()
  camera.value = zoomFanCamera(camera.value, canvasWidth.value, canvasHeight.value, factor)
}

function wheelZoom(event: WheelEvent) {
  if (!event[navigationModifier.key]) return
  event.preventDefault()
  if (drag) return
  const matrix = fanSvg.value?.getScreenCTM()
  if (!matrix) return
  const anchor = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
  camera.value = zoomFanCamera(camera.value, canvasWidth.value, canvasHeight.value,
    fanWheelFactor(event.deltaY, event.deltaMode, fanSvg.value!.clientHeight), anchor)
}

function startPan(event: PointerEvent) {
  closeDetails()
  suppressClick = false
  if (!event[navigationModifier.key] || event.button !== 0 || drag) return
  const svg = fanSvg.value
  const matrix = svg?.getScreenCTM()
  if (!svg || !matrix) return
  event.preventDefault()
  const inverse = matrix.inverse()
  drag = { pointerId: event.pointerId, camera: { ...camera.value }, start: new DOMPoint(event.clientX, event.clientY).matrixTransform(inverse), inverse }
  suppressClick = true
  dragging.value = true
  svg.setPointerCapture(event.pointerId)
}

function movePan(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.pointerId) return
  event.preventDefault()
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(drag.inverse)
  camera.value = panFanCamera(drag.camera, drag.start, point)
}

function guardClick(event: MouseEvent) {
  closeDetails()
  if (!event[navigationModifier.key] && !suppressClick) return
  suppressClick = false
  event.preventDefault()
  event.stopPropagation()
}

function preventPanMenu(event: MouseEvent) {
  if (event[navigationModifier.key] || drag || suppressClick) event.preventDefault()
}

function keyboardNavigate(event: KeyboardEvent) {
  if (event.key === 'Escape') { endPan(); closeDetails(); return }
  if (event.target !== event.currentTarget) return
  const stepX = canvasWidth.value / camera.value.zoom * .1
  const stepY = canvasHeight.value / camera.value.zoom * .1
  if (event.key === '+' || event.key === '=') zoomBy(1.3)
  else if (event.key === '-') zoomBy(1 / 1.3)
  else if (event.key === '0') resetCamera()
  else if (event.key === 'ArrowLeft') camera.value = { ...camera.value, x: camera.value.x - stepX }
  else if (event.key === 'ArrowRight') camera.value = { ...camera.value, x: camera.value.x + stepX }
  else if (event.key === 'ArrowUp') camera.value = { ...camera.value, y: camera.value.y - stepY }
  else if (event.key === 'ArrowDown') camera.value = { ...camera.value, y: camera.value.y + stepY }
  else return
  event.preventDefault()
}

function parentsOf(childId: string) {
  const parents = props.relationships
    .filter((relationship) => parentTypes.has(relationship.type) && relationship.targetId === childId)
    .map((relationship) => props.people.find((person) => person.id === relationship.sourceId))
    .filter((person): person is Person => Boolean(person))
  let father = parents.find((person) => person.gender === 'male')
  let mother = parents.find((person) => person.gender === 'female')
  const unassigned = parents.filter((person) => person.id !== father?.id && person.id !== mother?.id)
  if (!father) father = unassigned.shift()
  if (!mother) mother = unassigned.shift()
  return { father, mother }
}

const slots = computed(() => {
  const root = rootPerson.value
  if (!root) return []
  const result: FanSlot[] = [{ generation: 0, index: 0, person: root }]
  let previous: FanSlot[] = result
  for (let generation = 1; generation <= generations.value; generation += 1) {
    const current: FanSlot[] = []
    previous.forEach((childSlot, parentIndex) => {
      const parents = childSlot.person ? parentsOf(childSlot.person.id) : { father: undefined, mother: undefined }
      current.push({ generation, index: parentIndex * 2, person: parents.father, childId: childSlot.person?.id, expectedGender: 'male' })
      current.push({ generation, index: parentIndex * 2 + 1, person: parents.mother, childId: childSlot.person?.id, expectedGender: 'female' })
    })
    result.push(...current)
    previous = current
  }
  return result
})

function polar(radius: number, angle: number) {
  return {
    x: centerX.value + Math.cos(angle) * radius,
    y: centerY.value - Math.sin(angle) * radius,
  }
}

function geometry(slot: FanSlot) {
  const { start: startAngle, end: endAngle, middle: middleAngle } = fanSectorAngles(slot.generation, slot.index, props.shape)
  const innerRadius = rootRadius + (slot.generation - 1) * ringWidth
  const outer = innerRadius + ringWidth
  const outerStart = polar(outer, startAngle)
  const outerEnd = polar(outer, endAngle)
  const innerEnd = polar(innerRadius, endAngle)
  const innerStart = polar(innerRadius, startAngle)
  const labelPoint = polar(innerRadius + ringWidth * 0.52, middleAngle)
  return {
    path: `M ${outerStart.x} ${outerStart.y} A ${outer} ${outer} 0 0 0 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 0 1 ${innerStart.x} ${innerStart.y} Z`,
    labelX: labelPoint.x,
    labelY: labelPoint.y,
    rotation: readableRotation(90 - middleAngle * 180 / Math.PI),
  }
}

function personName(person: Person, generation: number) {
  const full = `${person.firstName} ${person.lastName}`
  if (generation < 4 || full.length <= 20) return full
  return `${person.firstName} ${person.lastName.slice(0, 1)}.`
}

function years(person: Person) {
  const born = person.birthDate?.slice(0, 4) || '?'
  const died = person.deathDate?.slice(0, 4)
  return died ? `${born}–${died}` : `n. ${born}`
}

function segmentFill(slot: FanSlot) {
  if (slot.person?.color?.startsWith('#')) return `${slot.person.color}24`
  return slot.index % 2 ? '#f6f1fb' : '#edf3f8'
}

function segmentStroke(slot: FanSlot) {
  if (slot.person?.color?.startsWith('#')) return `${slot.person.color}8f`
  return '#d9deea'
}

function addMissingParent(slot: FanSlot) {
  if (!slot.childId || !slot.expectedGender) return
  emit('addParent', { childId: slot.childId, gender: slot.expectedGender })
}
</script>

<template>
  <section class="radial-tree" :aria-label="`${viewLabel} genealogico`">
    <header class="radial-toolbar">
      <button class="radial-back" type="button" :disabled="!previousPerson" :title="previousPerson ? `Torna a ${previousPerson.firstName} ${previousPerson.lastName}` : 'Nessuna persona precedente'" :aria-label="`Indietro nella vista ${viewLabel.toLowerCase()}`" @click="goBack"><ArrowLeft :size="18" />Indietro</button>
      <div><span>Persona al centro</span><strong>{{ rootPerson ? `${rootPerson.firstName} ${rootPerson.lastName}` : 'Nessuna persona' }}</strong></div>
      <label><span>Generazioni</span><span class="generation-select"><select v-model.number="generations"><option v-for="count in [3, 4, 5, 6, 7, 8, 9, 10]" :key="count" :value="count">{{ count }}</option></select><ChevronDown :size="14" /></span></label>
      <fieldset class="fan-export" :disabled="exporting || !rootPerson">
        <legend>Esporta {{ viewLabel.toLowerCase() }}</legend>
        <button type="button" title="Esporta un PNG ad alta risoluzione con nomi completi" @click="exportFan('png')">PNG</button>
        <button type="button" title="Esporta un SVG vettoriale con nomi completi, ingrandibile senza perdita di qualità" @click="exportFan('svg')">SVG</button>
      </fieldset>
      <fieldset class="fan-export fan-navigation">
        <legend>Navigazione · {{ Math.round(camera.zoom * 100) }}%</legend>
        <button type="button" :disabled="camera.zoom <= 1" aria-label="Riduci zoom del grafico" @click="zoomBy(1 / 1.3)"><Minus :size="18" /></button>
        <button type="button" :disabled="camera.zoom >= maxFanZoom" aria-label="Aumenta zoom del grafico" @click="zoomBy(1.3)"><Plus :size="18" /></button>
        <button type="button" title="Adatta alla vista" aria-label="Adatta il grafico alla vista" @click="resetCamera"><Maximize2 :size="18" /></button>
      </fieldset>
      <p class="fan-navigation-hint">{{ navigationModifier.label }} + rotellina: zoom · {{ navigationModifier.label }} + trascinamento: sposta · Tastiera sul grafico: frecce, +, − e 0.</p>
      <p v-if="exporting || exportMessage" class="export-message" :class="{ 'export-error': exportFailed }" role="status" aria-live="polite">{{ exporting ? 'Preparazione del grafico…' : exportMessage }}</p>
      <div class="radial-search-row"><GraphPersonSearch :people="people" :selected-id="rootId" @select-person="selectSearchRoot" /></div>
    </header>

    <svg v-if="rootPerson" ref="fanSvg" class="fan-canvas" :class="{ 'fan-dragging': dragging }" :viewBox="fanViewBox" :preserveAspectRatio="isCircle ? 'xMidYMid meet' : 'xMidYMax meet'" role="group" tabindex="0" :aria-label="`${viewLabel} degli antenati di ${rootPerson.firstName} ${rootPerson.lastName}. ${navigationModifier.label} più rotellina per zoom, ${navigationModifier.label} più trascinamento per spostare.`" @wheel="wheelZoom" @pointerdown.capture="startPan" @pointermove="movePan" @pointerup="endPan" @pointercancel="endPan" @lostpointercapture="endPan" @click.capture="guardClick" @contextmenu="preventPanMenu" @keydown="keyboardNavigate">
      <g v-for="slot in slots.filter(item => item.generation > 0)" :key="`${slot.generation}-${slot.index}`" class="fan-segment" :class="{ empty: !slot.person, actionable: !slot.person && slot.childId, 'details-visible': matchesDetails(slot) }" @pointerenter="showDetails(slot, $event)" @pointermove="moveDetails(slot, $event)" @pointerleave="leaveDetails" @focusin="showDetails(slot, $event)" @focusout="leaveDetails">
        <path :d="geometry(slot).path" :fill="segmentFill(slot)" :stroke="segmentStroke(slot)" stroke-width="1.5" />
        <g v-if="slot.person" class="fan-person" tabindex="0" role="button" :aria-describedby="matchesDetails(slot) ? detailsId : undefined" :aria-label="`Metti al centro ${slot.person.firstName} ${slot.person.lastName}`" :transform="`translate(${geometry(slot).labelX} ${geometry(slot).labelY}) rotate(${geometry(slot).rotation})`" @click="emit('selectPerson', slot.person.id)" @keydown.enter.prevent="emit('selectPerson', slot.person.id)" @keydown.space.prevent="emit('selectPerson', slot.person.id)">
          <text text-anchor="middle" :font-size="Math.max(9, 14 - slot.generation * 0.8)" font-weight="750"><tspan x="0" dy="-2">{{ personName(slot.person, slot.generation) }}</tspan><tspan x="0" dy="14" class="fan-years">{{ years(slot.person) }}</tspan></text>
        </g>
        <g v-else-if="slot.childId" class="fan-add" tabindex="0" role="button" :aria-label="`Aggiungi ${slot.expectedGender === 'male' ? 'padre' : 'madre'} mancante`" :transform="`translate(${geometry(slot).labelX} ${geometry(slot).labelY})`" @click.stop="addMissingParent(slot)" @keydown.enter.prevent="addMissingParent(slot)" @keydown.space.prevent="addMissingParent(slot)">
          <circle r="14" /><Plus :x="-8" :y="-8" :size="16" />
        </g>
      </g>

      <g class="fan-root" tabindex="0" role="button" :aria-label="`${rootPerson.firstName} ${rootPerson.lastName}, persona al centro`">
        <circle :cx="centerX" :cy="centerY" :r="rootRadius - 4" :fill="rootPerson.color" />
        <circle :cx="centerX" :cy="centerY" :r="rootRadius - 10" fill="none" stroke="rgba(255,255,255,.34)" stroke-width="1.5" />
        <text :x="centerX" :y="centerY - 4" text-anchor="middle" fill="white" font-size="16" font-weight="800"><tspan :x="centerX">{{ rootPerson.firstName }}</tspan><tspan :x="centerX" dy="19">{{ rootPerson.lastName }}</tspan><tspan :x="centerX" dy="18" class="root-years">{{ years(rootPerson) }}</tspan></text>
      </g>
    </svg>
    <PersonHoverCard v-if="hoveredPerson && hoveredSlot" :id="detailsId" :person="hoveredPerson" :generation="hoveredSlot.generation" :anchor="detailAnchor" @keep-open="keepDetailsOpen" @leave="leaveDetails" @close="closeDetails" />
    <div v-if="rootPerson" class="fan-relatives" :aria-label="`Figli e fratelli di ${rootPerson.firstName} ${rootPerson.lastName}`">
      <section v-for="group in relativeGroups" :key="group.title" class="fan-relative-group" :aria-label="group.title">
        <h3>{{ group.title }} <span>{{ group.people.length }}</span></h3>
        <div v-if="group.people.length" class="fan-relative-list">
          <button v-for="person in group.people" :key="person.id" type="button" class="fan-relative-card" :aria-label="`Metti al centro ${person.firstName} ${person.lastName}, ${years(person)}${person.birthPlace ? ', ' + person.birthPlace : ''}`" @click="emit('selectPerson', person.id)">
            <span class="fan-relative-avatar" :style="{ background: person.color }" aria-hidden="true">{{ person.firstName[0] }}{{ person.lastName[0] }}</span>
            <span class="fan-relative-details"><strong>{{ person.firstName }} {{ person.lastName }}</strong><small>{{ !person.birthDate && !person.deathDate ? 'Date non inserite' : years(person) }}<template v-if="person.birthPlace"> · {{ person.birthPlace }}</template></small></span>
            <ChevronRight :size="16" aria-hidden="true" />
          </button>
        </div>
        <p v-else class="fan-relatives-empty">{{ group.empty }}</p>
      </section>
    </div>
  </section>
</template>

<style scoped>
.radial-tree { position:relative; display:grid; grid-template-rows:auto minmax(12rem,1fr) auto; width:100%; height:100%; min-height:30rem; overflow:auto; background:radial-gradient(circle at 50% 100%,#fff 0,#f8f9fd 55%,#f2f4fa 100%); }
.radial-toolbar { position:relative; z-index:5; margin:.75rem .75rem 0; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:1rem; border:1px solid rgba(218,221,234,.9); border-radius:.65rem; background:rgba(255,255,255,.92); padding:.55rem .7rem; box-shadow:0 5px 18px rgba(35,39,68,.07); backdrop-filter:blur(8px); }
.fan-export { display:flex; gap:.4rem; margin:0; padding:0; border:0; }
.fan-export legend { margin-bottom:.2rem; font-size:.875rem; color:#4d536b; }
.fan-export button { min-height:2.5rem; padding:.45rem .7rem; border:1px solid #d8dbea; border-radius:.5rem; color:#4546bc; background:#f7f8fc; font-size:.875rem; font-weight:750; cursor:pointer; }
.fan-export button:hover { background:#eeeeff; }
.fan-export button:focus-visible { outline:2px solid #5657d9; outline-offset:2px; }
.fan-navigation button { display:grid; place-items:center; min-width:2.5rem; }
.fan-navigation button:disabled { opacity:.45; cursor:default; }
.fan-navigation-hint { flex-basis:100%; margin:0; font-size:.875rem; line-height:1.4; color:#596176; }
.fan-export:disabled { opacity:.5; }
.fan-export:disabled button { cursor:wait; }
.export-message { flex-basis:100%; margin:0; color:#4546bc; font-size:.875rem; overflow-wrap:anywhere; }
.export-message.export-error { color:#a52639; }
.radial-toolbar>div { display:grid; flex:1; gap:.12rem; min-width:0; }
.radial-toolbar>.radial-search-row { display:flex; flex:1 0 100%; position:relative; z-index:6; }
.radial-back { display:inline-flex; align-items:center; justify-content:center; gap:.35rem; flex-shrink:0; min-height:2.5rem; border:1px solid #d8dbea; border-radius:.5rem; background:#f7f8fc; padding:.45rem .6rem; color:#4546bc; font-size:.875rem; font-weight:750; cursor:pointer; }
.radial-back:hover:not(:disabled) { background:#eeeeff; border-color:#9293e4; }
.radial-back:disabled { opacity:.45; cursor:default; }
.radial-toolbar span { color:#73798c; font-size:.58rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
.radial-toolbar strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.72rem; }
.radial-toolbar label { display:flex; align-items:center; gap:.45rem; }
.generation-select { position:relative; display:flex; align-items:center; }
.generation-select select { appearance:none; min-width:3.2rem; border:1px solid #d8dbea; border-radius:.5rem; background:#f7f8fc; padding:.38rem 1.35rem .38rem .55rem; color:#35394d; font-size:.72rem; font-weight:800; outline:none; cursor:pointer; }
.generation-select svg { position:absolute; right:.35rem; color:#73798c; pointer-events:none; }
.fan-canvas { display:block; width:100%; height:100%; min-height:0; padding:.4rem .7rem .2rem; overflow:hidden; user-select:none; }
.fan-canvas:focus-visible { outline:2px solid #7778df; outline-offset:-3px; }
.fan-canvas.fan-dragging,.fan-canvas.fan-dragging * { cursor:grabbing!important; }
.fan-relatives { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:.75rem; border-top:1px solid #dfe3ed; padding:.8rem; background:rgba(255,255,255,.94); }
.fan-relative-group { min-width:0; }
.fan-relative-group h3 { display:flex; align-items:center; gap:.5rem; margin:0 0 .5rem; color:#363b54; font-size:.875rem; font-weight:800; }
.fan-relative-group h3>span { border-radius:1rem; background:#ececff; padding:.1rem .45rem; color:#5051b7; font-size:.75rem; }
.fan-relative-list { display:grid; align-content:start; gap:.4rem; max-height:9rem; overflow-y:auto; overscroll-behavior:contain; padding:2px; }
.fan-relative-card { display:flex; align-items:center; gap:.6rem; width:100%; border:1px solid #dfe3ed; border-radius:.6rem; padding:.6rem; background:#fff; text-align:left; cursor:pointer; }
.fan-relative-card:hover { border-color:#9798e2; background:#f5f5ff; }
.fan-relative-card:focus-visible { outline:2px solid #5657d9; outline-offset:-2px; }
.fan-relative-avatar { display:grid; place-items:center; flex:0 0 2.2rem; height:2.2rem; border-radius:.55rem; color:white; font-size:.875rem; font-weight:800; text-transform:uppercase; }
.fan-relative-details { display:grid; flex:1; min-width:0; gap:.15rem; overflow-wrap:anywhere; }
.fan-relative-details strong { font-size:.875rem; line-height:1.35; }
.fan-relative-details small { color:#626a7f; font-size:.75rem; line-height:1.4; }
.fan-relative-card>svg { flex-shrink:0; color:#7277a8; }
.fan-relatives-empty { margin:0; color:#697185; font-size:.8125rem; line-height:1.5; }
.fan-segment path { transition:filter .15s,fill .15s; }
.fan-segment:has(.fan-person):hover path { filter:brightness(.96) saturate(1.15); }
.fan-segment.details-visible>path { stroke:#5657d9; stroke-width:3px; }
.fan-person,.fan-add { cursor:pointer; outline:none; }
.fan-person text { fill:#24283c; paint-order:stroke; stroke:rgba(255,255,255,.58); stroke-width:2px; stroke-linejoin:round; }
.fan-person:focus-visible text { fill:#5657d9; }
.fan-years { fill:#73798c; font-size:9px; font-weight:650; letter-spacing:.02em; }
.fan-add circle { fill:#fff; stroke:#aeb4c7; stroke-width:1.5; transition:fill .15s,stroke .15s,transform .15s; }
.fan-add svg { width:16px; height:16px; padding:0; color:#686f84; pointer-events:none; }
.fan-add:hover circle,.fan-add:focus-visible circle { fill:#5657d9; stroke:#5657d9; transform:scale(1.08); }
.fan-add:hover svg,.fan-add:focus-visible svg { color:#fff; }
.fan-root { cursor:default; outline:none; filter:drop-shadow(0 8px 16px rgba(40,42,82,.2)); }
.root-years { font-size:10px; font-weight:650; opacity:.82; }
@media(max-width:600px){.radial-toolbar{align-items:center;gap:.45rem}.radial-toolbar label>span:first-child{display:none}.fan-canvas{padding-left:.15rem;padding-right:.15rem}}
@media(max-width:440px){.fan-relatives{grid-template-columns:1fr}.fan-relative-list{max-height:6rem}}
</style>
