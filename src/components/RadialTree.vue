<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { ArrowLeft, ChevronDown, ChevronRight, Maximize2, Minus, Plus } from '@lucide/vue'
import type { Gender, Person, Relationship } from '../types'
import { closeRelatives } from '../services/closeRelatives'
import {
  createFanExport,
  downloadFan,
  fanPng,
  fanSectorAngles,
  readableRotation,
  type FanShape,
} from '../services/fanExport'
import {
  fanNavigationModifier,
  fanWheelFactor,
  maxFanZoom,
  panFanCamera,
  zoomFanCamera,
  type FanCamera,
} from '../services/fanViewport'
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
const viewLabel = computed(() => (isCircle.value ? 'Radiale' : 'Ventaglio'))
const navigationModifier = fanNavigationModifier(
  typeof navigator === 'undefined' ? '' : navigator.platform || navigator.userAgent,
)
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
    const chart = createFanExport(
      root,
      slots.value,
      generations.value,
      relativeGroups.value,
      (text, size) => {
        context.font = `600 ${size}px Arial, sans-serif`
        return context.measureText(text).width
      },
      shape,
    )
    const name = `${root.firstName}-${root.lastName}`
      .replace(/[^\p{L}\p{N}_-]+/gu, '-')
      .slice(0, 100)
    const blob =
      format === 'svg'
        ? new Blob([chart.svg], { type: 'image/svg+xml;charset=utf-8' })
        : await fanPng(chart)
    downloadFan(
      blob,
      `GeniaLogic-${shape === 'circle' ? 'radiale' : 'ventaglio'}-${name}.${format}`,
    )
    exportMessage.value = `${format.toUpperCase()} pronto: nomi completi, figli e fratelli inclusi.`
  } catch (error) {
    exportFailed.value = true
    exportMessage.value =
      error instanceof Error ? error.message : 'Esportazione non riuscita. Riprova in SVG.'
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

watch(
  () => props.rootId,
  (currentId, previousId) => {
    const isReturning = currentId === returningTo
    returningTo = null
    if (!isReturning && previousId && props.people.some((person) => person.id === previousId)) {
      navigationHistory.value.push(previousId)
    }
  },
)

function goBack() {
  const previous = previousPerson.value
  if (!previous) return
  const index = navigationHistory.value.lastIndexOf(previous.id)
  navigationHistory.value.splice(index)
  returningTo = previous.id
  emit('selectPerson', previous.id)
}

function selectSearchRoot(personId: string) {
  if (!props.people.some((person) => person.id === personId)) return
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
  {
    title: 'Fratelli e sorelle',
    people: relatives.value.siblings,
    empty: 'Nessun fratello o sorella registrato.',
  },
])
const outerRadius = computed(() => rootRadius + generations.value * ringWidth)
const canvasWidth = computed(() => outerRadius.value * 2 + 90)
const canvasHeight = computed(() =>
  isCircle.value ? canvasWidth.value : outerRadius.value + rootRadius + 88,
)
const centerX = computed(() => canvasWidth.value / 2)
const centerY = computed(() => (isCircle.value ? canvasHeight.value / 2 : outerRadius.value + 38))
const fanSvg = ref<SVGSVGElement | null>(null)
const camera = ref<FanCamera>({ x: 0, y: 0, zoom: 1 })
const dragging = ref(false)
const detailsId = useId()
const hoveredSlot = ref<{ personId: string; generation: number; index: number } | null>(null)
const detailAnchor = ref({ x: 0, y: 0 })
const hoveredPerson = computed(() =>
  props.people.find((person) => person.id === hoveredSlot.value?.personId),
)
let detailOpenTimer: ReturnType<typeof setTimeout> | undefined
let detailCloseTimer: ReturnType<typeof setTimeout> | undefined

function keepDetailsOpen() {
  clearTimeout(detailCloseTimer)
}
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
  return (
    hoveredSlot.value?.personId === slot.person?.id &&
    hoveredSlot.value?.generation === slot.generation &&
    hoveredSlot.value?.index === slot.index
  )
}
function showDetails(slot: FanSlot, event: PointerEvent | FocusEvent) {
  clearTimeout(detailOpenTimer)
  if (
    !slot.person ||
    dragging.value ||
    ('pointerType' in event && (event.pointerType === 'touch' || event[navigationModifier.key]))
  ) {
    closeDetails()
    return
  }
  keepDetailsOpen()
  const bounds = (event.currentTarget as Element).getBoundingClientRect()
  detailAnchor.value =
    'clientX' in event
      ? { x: event.clientX, y: event.clientY }
      : { x: bounds.right, y: bounds.top + bounds.height / 2 }
  const selection = { personId: slot.person.id, generation: slot.generation, index: slot.index }
  if (event.type === 'focusin') hoveredSlot.value = selection
  else
    detailOpenTimer = setTimeout(() => {
      hoveredSlot.value = selection
    }, 160)
}
function moveDetails(slot: FanSlot, event: PointerEvent) {
  if (dragging.value || event[navigationModifier.key]) {
    closeDetails()
    return
  }
  if (matchesDetails(slot)) detailAnchor.value = { x: event.clientX, y: event.clientY }
}
watch([camera, () => props.rootId, generations, () => props.shape], closeDetails)
let drag: { pointerId: number; camera: FanCamera; start: DOMPoint; inverse: DOMMatrix } | null =
  null
let suppressClick = false
const fanViewBox = computed(
  () =>
    `${camera.value.x} ${camera.value.y} ${canvasWidth.value / camera.value.zoom} ${canvasHeight.value / camera.value.zoom}`,
)

function endPan(event?: PointerEvent) {
  if (event && event.pointerId !== drag?.pointerId) return
  const pointerId = drag?.pointerId
  drag = null
  dragging.value = false
  if (pointerId !== undefined && fanSvg.value?.hasPointerCapture(pointerId))
    fanSvg.value.releasePointerCapture(pointerId)
}

function resetCamera() {
  endPan()
  camera.value = { x: 0, y: 0, zoom: 1 }
}
watch([() => props.rootId, generations, () => props.shape], resetCamera)
onBeforeUnmount(() => {
  endPan()
  closeDetails()
})

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
  camera.value = zoomFanCamera(
    camera.value,
    canvasWidth.value,
    canvasHeight.value,
    fanWheelFactor(event.deltaY, event.deltaMode, fanSvg.value!.clientHeight),
    anchor,
  )
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
  drag = {
    pointerId: event.pointerId,
    camera: { ...camera.value },
    start: new DOMPoint(event.clientX, event.clientY).matrixTransform(inverse),
    inverse,
  }
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
  if (event.key === 'Escape') {
    endPan()
    closeDetails()
    return
  }
  if (event.target !== event.currentTarget) return
  const stepX = (canvasWidth.value / camera.value.zoom) * 0.1
  const stepY = (canvasHeight.value / camera.value.zoom) * 0.1
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
    .filter(
      (relationship) => parentTypes.has(relationship.type) && relationship.targetId === childId,
    )
    .map((relationship) => props.people.find((person) => person.id === relationship.sourceId))
    .filter((person): person is Person => Boolean(person))
  let father = parents.find((person) => person.gender === 'male')
  let mother = parents.find((person) => person.gender === 'female')
  const unassigned = parents.filter(
    (person) => person.id !== father?.id && person.id !== mother?.id,
  )
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
      const parents = childSlot.person
        ? parentsOf(childSlot.person.id)
        : { father: undefined, mother: undefined }
      current.push({
        generation,
        index: parentIndex * 2,
        person: parents.father,
        childId: childSlot.person?.id,
        expectedGender: 'male',
      })
      current.push({
        generation,
        index: parentIndex * 2 + 1,
        person: parents.mother,
        childId: childSlot.person?.id,
        expectedGender: 'female',
      })
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
  const {
    start: startAngle,
    end: endAngle,
    middle: middleAngle,
  } = fanSectorAngles(slot.generation, slot.index, props.shape)
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
    rotation: readableRotation(90 - (middleAngle * 180) / Math.PI),
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
  <section
    class="relative grid grid-rows-[auto_minmax(12rem,_1fr)_auto] w-full h-full min-h-120 overflow-auto bg-[radial-gradient(circle_at_50%_100%,_#fff_0,_#f8f9fd_55%,_#f2f4fa_100%)] bg-transparent"
    :aria-label="`${viewLabel} genealogico`"
  >
    <header
      class="border border-[rgba(218,_221,_234,_0.9)] px-[0.7rem] py-[0.55rem] mx-3 relative z-5 mt-3 mb-0 flex flex-wrap items-center justify-between gap-4 rounded-[0.65rem] bg-[rgba(255,_255,_255,_0.92)] bg-none shadow-[0_5px_18px_rgba(35,_39,_68,_0.07)] backdrop-blur-[8px] max-[600px]:items-center max-[600px]:gap-[0.45rem]"
    >
      <button
        class="border border-[#d8dbea] px-[0.6rem] py-[0.45rem] inline-flex items-center justify-center gap-[0.35rem] shrink-0 min-h-10 rounded-lg bg-[#f7f8fc] bg-none text-[#4546bc] text-[0.875rem] font-[750] cursor-pointer hover:enabled:border-[#9293e4] hover:enabled:bg-[#eeeeff] hover:enabled:bg-none disabled:opacity-45 disabled:cursor-default"
        type="button"
        :disabled="!previousPerson"
        :title="
          previousPerson
            ? `Torna a ${previousPerson.firstName} ${previousPerson.lastName}`
            : 'Nessuna persona precedente'
        "
        :aria-label="`Indietro nella vista ${viewLabel.toLowerCase()}`"
        @click="goBack"
      >
        <ArrowLeft :size="18" />
        Indietro
      </button>
      <div class="grid flex-1 gap-[0.12rem] min-w-0">
        <span class="text-[#73798c] text-[0.58rem] font-extrabold tracking-[0.08em] uppercase">
          Persona al centro
        </span>
        <strong class="overflow-hidden text-ellipsis whitespace-nowrap text-[0.72rem]">
          {{ rootPerson ? `${rootPerson.firstName} ${rootPerson.lastName}` : 'Nessuna persona' }}
        </strong>
      </div>
      <label class="flex items-center gap-[0.45rem]">
        <span
          class="text-[#73798c] text-[0.58rem] font-extrabold tracking-[0.08em] uppercase max-[600px]:first:hidden"
        >
          Generazioni
        </span>
        <span
          class="text-[#73798c] text-[0.58rem] font-extrabold tracking-[0.08em] uppercase relative flex items-center max-[600px]:first:hidden"
        >
          <select
            class="border border-[#d8dbea] py-[0.38rem] appearance-none min-w-[3.2rem] rounded-lg bg-[#f7f8fc] bg-none pr-[1.35rem] pl-[0.55rem] text-[#35394d] text-[0.72rem] font-extrabold outline-none cursor-pointer"
            v-model.number="generations"
          >
            <option
              v-for="count in [3, 4, 5, 6, 7, 8, 9, 10]"
              :key="count"
              :value="count"
            >
              {{ count }}
            </option>
          </select>
          <ChevronDown
            class="absolute right-[0.35rem] text-[#73798c] pointer-events-none"
            :size="14"
          />
        </span>
      </label>
      <fieldset
        class="group/fan-export p-0 m-0 border-0 border-transparent flex gap-[0.4rem] disabled:opacity-50"
        :disabled="exporting || !rootPerson"
      >
        <legend class="mb-[0.2rem] text-[0.875rem] text-[#4d536b]">
          Esporta {{ viewLabel.toLowerCase() }}
        </legend>
        <button
          class="border border-[#d8dbea] px-[0.7rem] py-[0.45rem] min-h-10 rounded-lg text-[#4546bc] bg-[#f7f8fc] bg-none text-[0.875rem] font-[750] cursor-pointer hover:bg-[#eeeeff] hover:bg-none focus-visible:[outline:2px_solid_#5657d9] focus-visible:outline-offset-[2px] group-disabled/fan-export:cursor-wait"
          type="button"
          title="Esporta un PNG ad alta risoluzione con nomi completi"
          @click="exportFan('png')"
        >
          PNG
        </button>
        <button
          class="border border-[#d8dbea] px-[0.7rem] py-[0.45rem] min-h-10 rounded-lg text-[#4546bc] bg-[#f7f8fc] bg-none text-[0.875rem] font-[750] cursor-pointer hover:bg-[#eeeeff] hover:bg-none focus-visible:[outline:2px_solid_#5657d9] focus-visible:outline-offset-[2px] group-disabled/fan-export:cursor-wait"
          type="button"
          title="Esporta un SVG vettoriale con nomi completi, ingrandibile senza perdita di qualità"
          @click="exportFan('svg')"
        >
          SVG
        </button>
      </fieldset>
      <fieldset
        class="group/fan-export p-0 m-0 border-0 border-transparent flex gap-[0.4rem] disabled:opacity-50"
      >
        <legend class="mb-[0.2rem] text-[0.875rem] text-[#4d536b]">
          Navigazione · {{ Math.round(camera.zoom * 100) }}%
        </legend>
        <button
          class="border border-[#d8dbea] px-[0.7rem] py-[0.45rem] min-h-10 rounded-lg text-[#4546bc] bg-[#f7f8fc] bg-none text-[0.875rem] font-[750] cursor-pointer grid place-items-center min-w-10 hover:bg-[#eeeeff] hover:bg-none focus-visible:[outline:2px_solid_#5657d9] focus-visible:outline-offset-[2px] disabled:opacity-45 disabled:cursor-default group-disabled/fan-export:cursor-wait"
          type="button"
          :disabled="camera.zoom <= 1"
          aria-label="Riduci zoom del grafico"
          @click="zoomBy(1 / 1.3)"
        >
          <Minus :size="18" />
        </button>
        <button
          class="border border-[#d8dbea] px-[0.7rem] py-[0.45rem] min-h-10 rounded-lg text-[#4546bc] bg-[#f7f8fc] bg-none text-[0.875rem] font-[750] cursor-pointer grid place-items-center min-w-10 hover:bg-[#eeeeff] hover:bg-none focus-visible:[outline:2px_solid_#5657d9] focus-visible:outline-offset-[2px] disabled:opacity-45 disabled:cursor-default group-disabled/fan-export:cursor-wait"
          type="button"
          :disabled="camera.zoom >= maxFanZoom"
          aria-label="Aumenta zoom del grafico"
          @click="zoomBy(1.3)"
        >
          <Plus :size="18" />
        </button>
        <button
          class="border border-[#d8dbea] px-[0.7rem] py-[0.45rem] min-h-10 rounded-lg text-[#4546bc] bg-[#f7f8fc] bg-none text-[0.875rem] font-[750] cursor-pointer grid place-items-center min-w-10 hover:bg-[#eeeeff] hover:bg-none focus-visible:[outline:2px_solid_#5657d9] focus-visible:outline-offset-[2px] disabled:opacity-45 disabled:cursor-default group-disabled/fan-export:cursor-wait"
          type="button"
          title="Adatta alla vista"
          aria-label="Adatta il grafico alla vista"
          @click="resetCamera"
        >
          <Maximize2 :size="18" />
        </button>
      </fieldset>
      <p class="m-0 basis-full text-[0.875rem] leading-[1.4] text-[#596176]">
        {{ navigationModifier.label }} + rotellina: zoom · {{ navigationModifier.label }} +
        trascinamento: sposta · Tastiera sul grafico: frecce, +, − e 0.
      </p>
      <p
        v-if="exporting || exportMessage"
        class="m-0 basis-full text-[#4546bc] text-[0.875rem] wrap-anywhere data-export-error:text-[#a52639]"
        :data-export-error="exportFailed || undefined"
        role="status"
        aria-live="polite"
      >
        {{ exporting ? 'Preparazione del grafico…' : exportMessage }}
      </p>
      <div class="flex [flex:1_0_100%] gap-[0.12rem] min-w-0 relative z-6">
        <GraphPersonSearch
          :people="people"
          :selected-id="rootId"
          @select-person="selectSearchRoot"
        />
      </div>
    </header>

    <svg
      v-if="rootPerson"
      ref="fanSvg"
      class="group/fan-canvas px-[0.7rem] block w-full h-full min-h-0 pt-[0.4rem] pb-[0.2rem] overflow-hidden select-none focus-visible:[outline:2px_solid_#7778df] focus-visible:outline-offset-[-3px] data-fan-dragging:[cursor:grabbing]! max-[600px]:px-[0.15rem]"
      :data-fan-dragging="dragging || undefined"
      :viewBox="fanViewBox"
      :preserveAspectRatio="isCircle ? 'xMidYMid meet' : 'xMidYMax meet'"
      role="group"
      tabindex="0"
      :aria-label="`${viewLabel} degli antenati di ${rootPerson.firstName} ${rootPerson.lastName}. ${navigationModifier.label} più rotellina per zoom, ${navigationModifier.label} più trascinamento per spostare.`"
      @wheel="wheelZoom"
      @pointerdown.capture="startPan"
      @pointermove="movePan"
      @pointerup="endPan"
      @pointercancel="endPan"
      @lostpointercapture="endPan"
      @click.capture="guardClick"
      @contextmenu="preventPanMenu"
      @keydown="keyboardNavigate"
    >
      <g
        v-for="slot in slots.filter((item) => item.generation > 0)"
        :key="`${slot.generation}-${slot.index}`"
        class="group/fan-segment group-data-fan-dragging/fan-canvas:[cursor:grabbing]!"
        :data-empty="!slot.person || undefined"
        :data-actionable="(!slot.person && slot.childId) || undefined"
        :data-details-visible="matchesDetails(slot) || undefined"
        @pointerenter="showDetails(slot, $event)"
        @pointermove="moveDetails(slot, $event)"
        @pointerleave="leaveDetails"
        @focusin="showDetails(slot, $event)"
        @focusout="leaveDetails"
      >
        <path
          class="group-data-fan-dragging/fan-canvas:[cursor:grabbing]! [transition:filter_0.15s,_fill_0.15s] group-has-[[role=button]]/fan-segment:group-hover/fan-segment:[filter:brightness(0.96)_saturate(1.15)] group-data-details-visible/fan-segment:stroke-[#5657d9] group-data-details-visible/fan-segment:stroke-[3px]"
          :d="geometry(slot).path"
          :fill="segmentFill(slot)"
          :stroke="segmentStroke(slot)"
          stroke-width="1.5"
        />
        <g
          v-if="slot.person"
          class="group/fan-person group-data-fan-dragging/fan-canvas:[cursor:grabbing]! cursor-pointer outline-none"
          tabindex="0"
          role="button"
          :aria-describedby="matchesDetails(slot) ? detailsId : undefined"
          :aria-label="`Metti al centro ${slot.person.firstName} ${slot.person.lastName}`"
          :transform="`translate(${geometry(slot).labelX} ${geometry(slot).labelY}) rotate(${geometry(slot).rotation})`"
          @click="emit('selectPerson', slot.person.id)"
          @keydown.enter.prevent="emit('selectPerson', slot.person.id)"
          @keydown.space.prevent="emit('selectPerson', slot.person.id)"
        >
          <text
            class="group-data-fan-dragging/fan-canvas:[cursor:grabbing]! fill-[#24283c] [paint-order:stroke] stroke-[rgba(255,_255,_255,_0.58)] stroke-[2px] [stroke-linejoin:round] group-focus-visible/fan-person:fill-[#5657d9]"
            text-anchor="middle"
            :font-size="Math.max(9, 14 - slot.generation * 0.8)"
            font-weight="750"
          >
            <tspan
              class="group-data-fan-dragging/fan-canvas:[cursor:grabbing]!"
              x="0"
              dy="-2"
            >
              {{ personName(slot.person, slot.generation) }}
            </tspan>
            <tspan
              x="0"
              dy="14"
              class="group-data-fan-dragging/fan-canvas:[cursor:grabbing]! fill-[#73798c] text-[9px] font-[650] tracking-[0.02em]"
            >
              {{ years(slot.person) }}
            </tspan>
          </text>
        </g>
        <g
          v-else-if="slot.childId"
          class="group/fan-add group-data-fan-dragging/fan-canvas:[cursor:grabbing]! cursor-pointer outline-none"
          tabindex="0"
          role="button"
          :aria-label="`Aggiungi ${slot.expectedGender === 'male' ? 'padre' : 'madre'} mancante`"
          :transform="`translate(${geometry(slot).labelX} ${geometry(slot).labelY})`"
          @click.stop="addMissingParent(slot)"
          @keydown.enter.prevent="addMissingParent(slot)"
          @keydown.space.prevent="addMissingParent(slot)"
        >
          <circle
            class="group-data-fan-dragging/fan-canvas:[cursor:grabbing]! fill-white stroke-[#aeb4c7] stroke-[1.5] [transition:fill_0.15s,_stroke_0.15s,_transform_0.15s] group-hover/fan-add:fill-[#5657d9] group-hover/fan-add:stroke-[#5657d9] group-hover/fan-add:[transform:scale(1.08)] group-focus-visible/fan-add:fill-[#5657d9] group-focus-visible/fan-add:stroke-[#5657d9] group-focus-visible/fan-add:[transform:scale(1.08)]"
            r="14"
          />
          <Plus
            class="group-data-fan-dragging/fan-canvas:[cursor:grabbing]! p-0 w-[16px] h-[16px] text-[#686f84] pointer-events-none group-hover/fan-add:text-white group-focus-visible/fan-add:text-white"
            :x="-8"
            :y="-8"
            :size="16"
          />
        </g>
      </g>

      <g
        class="group-data-fan-dragging/fan-canvas:[cursor:grabbing]! cursor-default outline-none [filter:drop-shadow(0_8px_16px_rgba(40,_42,_82,_0.2))]"
        tabindex="0"
        role="button"
        :aria-label="`${rootPerson.firstName} ${rootPerson.lastName}, persona al centro`"
      >
        <circle
          class="group-data-fan-dragging/fan-canvas:[cursor:grabbing]!"
          :cx="centerX"
          :cy="centerY"
          :r="rootRadius - 4"
          :fill="rootPerson.color"
        />
        <circle
          class="group-data-fan-dragging/fan-canvas:[cursor:grabbing]!"
          :cx="centerX"
          :cy="centerY"
          :r="rootRadius - 10"
          fill="none"
          stroke="rgba(255,255,255,.34)"
          stroke-width="1.5"
        />
        <text
          class="group-data-fan-dragging/fan-canvas:[cursor:grabbing]!"
          :x="centerX"
          :y="centerY - 4"
          text-anchor="middle"
          fill="white"
          font-size="16"
          font-weight="800"
        >
          <tspan
            class="group-data-fan-dragging/fan-canvas:[cursor:grabbing]!"
            :x="centerX"
          >
            {{ rootPerson.firstName }}
          </tspan>
          <tspan
            class="group-data-fan-dragging/fan-canvas:[cursor:grabbing]!"
            :x="centerX"
            dy="19"
          >
            {{ rootPerson.lastName }}
          </tspan>
          <tspan
            :x="centerX"
            dy="18"
            class="group-data-fan-dragging/fan-canvas:[cursor:grabbing]! text-[10px] font-[650] opacity-82"
          >
            {{ years(rootPerson) }}
          </tspan>
        </text>
      </g>
    </svg>
    <PersonHoverCard
      v-if="hoveredPerson && hoveredSlot"
      :id="detailsId"
      :person="hoveredPerson"
      :generation="hoveredSlot.generation"
      :anchor="detailAnchor"
      @keep-open="keepDetailsOpen"
      @leave="leaveDetails"
      @close="closeDetails"
    />
    <div
      v-if="rootPerson"
      class="p-[0.8rem] grid grid-cols-[minmax(0,_1fr)_minmax(0,_1fr)] gap-3 border-t border-t-[#dfe3ed] bg-[rgba(255,_255,_255,_0.94)] bg-none max-[440px]:grid-cols-[1fr]"
      :aria-label="`Figli e fratelli di ${rootPerson.firstName} ${rootPerson.lastName}`"
    >
      <section
        v-for="group in relativeGroups"
        :key="group.title"
        class="min-w-0"
        :aria-label="group.title"
      >
        <h3
          class="mx-0 flex items-center gap-2 mt-0 mb-2 text-[#363b54] text-[0.875rem] font-extrabold"
        >
          {{ group.title }}
          <span
            class="px-[0.45rem] py-[0.1rem] rounded-2xl bg-[#ececff] bg-none text-[#5051b7] text-[0.75rem]"
          >
            {{ group.people.length }}
          </span>
        </h3>
        <div
          v-if="group.people.length"
          class="p-[2px] grid content-start gap-[0.4rem] max-h-36 overflow-y-auto overscroll-contain max-[440px]:max-h-24"
        >
          <button
            v-for="person in group.people"
            :key="person.id"
            type="button"
            class="p-[0.6rem] border border-[#dfe3ed] flex items-center gap-[0.6rem] w-full rounded-[0.6rem] bg-white bg-none text-left cursor-pointer hover:border-[#9798e2] hover:bg-[#f5f5ff] hover:bg-none focus-visible:[outline:2px_solid_#5657d9] focus-visible:outline-offset-[-2px]"
            :aria-label="`Metti al centro ${person.firstName} ${person.lastName}, ${years(person)}${person.birthPlace ? ', ' + person.birthPlace : ''}`"
            @click="emit('selectPerson', person.id)"
          >
            <span
              class="grid place-items-center [flex:0_0_2.2rem] h-[2.2rem] rounded-[0.55rem] text-white text-[0.875rem] font-extrabold uppercase"
              :style="{ background: person.color }"
              aria-hidden="true"
            >
              {{ person.firstName[0] }}{{ person.lastName[0] }}
            </span>
            <span class="grid flex-1 min-w-0 gap-[0.15rem] wrap-anywhere">
              <strong class="text-[0.875rem] leading-[1.35]">
                {{ person.firstName }} {{ person.lastName }}
              </strong>
              <small class="text-[#626a7f] text-[0.75rem] leading-[1.4]">
                {{ !person.birthDate && !person.deathDate ? 'Date non inserite' : years(person) }}
                <template v-if="person.birthPlace">· {{ person.birthPlace }}</template>
              </small>
            </span>
            <ChevronRight
              class="shrink-0 text-[#7277a8]"
              :size="16"
              aria-hidden="true"
            />
          </button>
        </div>
        <p
          v-else
          class="m-0 text-[#697185] text-[0.8125rem] leading-[1.5]"
        >
          {{ group.empty }}
        </p>
      </section>
    </div>
  </section>
</template>
