<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { ArrowLeft, Maximize2, Minus, Plus } from '@lucide/vue'
import GraphPersonSearch from './GraphPersonSearch.vue'
import PersonHoverCard from './PersonHoverCard.vue'
import {
  ancestorColor,
  ancestorLayout,
  ancestorSvg,
  type AncestorNode,
  type AncestorOrientation,
} from '../services/ancestorLayout'
import { downloadFan, fanPng } from '../services/fanExport'
import type { Person, Relationship } from '../types'

const props = defineProps<{ people: Person[]; relationships: Relationship[]; rootId: string }>()
const emit = defineEmits<{ selectPerson: [personId: string] }>()
const orientation = ref<AncestorOrientation>('horizontal')
const generations = ref(4)
const viewport = ref<HTMLDivElement | null>(null)
const zoom = ref(1)
const busy = ref(false)
const status = ref('')
const failed = ref(false)
const history = ref<string[]>([])
let returning = false
let resizeObserver: ResizeObserver | undefined
const context = document.createElement('canvas').getContext('2d')
const root = computed(() => props.people.find((person) => person.id === props.rootId))
const previous = computed(() =>
  [...history.value]
    .reverse()
    .find((id) => id !== props.rootId && props.people.some((person) => person.id === id)),
)
const result = computed(() => {
  try {
    const chart = ancestorLayout(
      props.people,
      props.relationships,
      props.rootId,
      generations.value,
      orientation.value,
      (text) => {
        if (!context) return [...text].length * 18
        context.font = '600 18px Arial, sans-serif'
        return context.measureText(text).width * 1.15
      },
    )
    return { chart, error: '' }
  } catch (error) {
    return {
      chart: null,
      error: error instanceof Error ? error.message : 'Impossibile visualizzare gli antenati.',
    }
  }
})
const detailsId = useId()
const hoveredNodeId = ref<string | null>(null)
const hoveredNode = computed(() =>
  result.value.chart?.nodes.find((node) => node.id === hoveredNodeId.value),
)
const detailAnchor = ref({ x: 0, y: 0 })
let detailOpenTimer: ReturnType<typeof setTimeout> | undefined
let detailCloseTimer: ReturnType<typeof setTimeout> | undefined

function keepDetailsOpen() {
  clearTimeout(detailCloseTimer)
}
function closeDetails() {
  clearTimeout(detailOpenTimer)
  clearTimeout(detailCloseTimer)
  hoveredNodeId.value = null
}
function leaveDetails() {
  clearTimeout(detailOpenTimer)
  clearTimeout(detailCloseTimer)
  detailCloseTimer = setTimeout(closeDetails, 180)
}
function showDetails(node: AncestorNode, event: PointerEvent | FocusEvent) {
  clearTimeout(detailOpenTimer)
  if (
    'pointerType' in event &&
    (event.pointerType === 'touch' || event.buttons || event.metaKey || event.ctrlKey)
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
  if (event.type === 'focusin') hoveredNodeId.value = node.id
  else
    detailOpenTimer = setTimeout(() => {
      hoveredNodeId.value = node.id
    }, 160)
}
function moveDetails(node: AncestorNode, event: PointerEvent) {
  if (event.buttons || event.metaKey || event.ctrlKey) {
    closeDetails()
    return
  }
  if (hoveredNodeId.value === node.id) detailAnchor.value = { x: event.clientX, y: event.clientY }
}
function selectAncestor(personId: string) {
  closeDetails()
  emit('selectPerson', personId)
}
watch([result, zoom], closeDetails)

function fit() {
  closeDetails()
  const chart = result.value.chart,
    el = viewport.value
  if (!chart || !el || !el.clientWidth || !el.clientHeight) return
  zoom.value = Math.min(
    1,
    (el.clientWidth - 24) / chart.width,
    (el.clientHeight - 24) / chart.height,
  )
  el.scrollTo(0, 0)
}
async function zoomBy(factor: number) {
  const el = viewport.value
  if (!el) return
  const old = zoom.value
  const centerX = (el.scrollLeft + el.clientWidth / 2) / old
  const centerY = (el.scrollTop + el.clientHeight / 2) / old
  const chart = result.value.chart
  const minimumZoom = chart
    ? Math.max(
        0.00001,
        Math.min(0.02, (el.clientWidth - 24) / chart.width, (el.clientHeight - 24) / chart.height),
      )
    : 0.02
  zoom.value = Math.min(2, Math.max(minimumZoom, old * factor))
  await nextTick()
  el.scrollTo(centerX * zoom.value - el.clientWidth / 2, centerY * zoom.value - el.clientHeight / 2)
}
function back() {
  if (!previous.value) return
  const id = previous.value
  history.value.splice(history.value.lastIndexOf(id))
  returning = true
  emit('selectPerson', id)
}
watch(
  () => props.rootId,
  (_, old) => {
    if (!returning && old) history.value.push(old)
    returning = false
  },
)
watch(result, async () => {
  status.value = ''
  await nextTick()
  fit()
})
onMounted(() => {
  resizeObserver = new ResizeObserver(fit)
  if (viewport.value) resizeObserver.observe(viewport.value)
  fit()
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  closeDetails()
})

async function exportChart(format: 'svg' | 'png') {
  const chart = result.value.chart
  if (!chart || busy.value) return
  busy.value = true
  failed.value = false
  status.value = 'Preparazione del file…'
  try {
    const svg = ancestorSvg(chart)
    const name = `${root.value?.firstName}-${root.value?.lastName}`
      .replace(/[^\p{L}\p{N}_-]+/gu, '-')
      .slice(0, 100)
    const filename = `GeniaLogic-antenati-${name}-${chart.orientation === 'horizontal' ? 'orizzontale' : 'verticale'}.${format}`
    const blob =
      format === 'svg'
        ? new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
        : await fanPng({ svg, width: chart.width, height: chart.height })
    downloadFan(blob, filename)
    status.value = `${format.toUpperCase()} pronto, con nomi completi e tutte le generazioni visualizzate.`
  } catch (error) {
    failed.value = true
    status.value = error instanceof Error ? error.message : 'Esportazione non riuscita. Prova SVG.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section
    class="flex flex-col w-full h-full min-h-0 bg-[#fafbfe] bg-none"
    aria-label="Vista degli antenati"
  >
    <div class="p-[0.65rem] relative z-10 border-b border-b-[#dce0eb] bg-[#f8f9fd] bg-none">
      <div class="flex items-center gap-[0.55rem]">
        <button
          class="border border-[#cbd0e0] px-[0.6rem] py-[0.4rem] inline-flex items-center justify-center gap-[0.3rem] min-h-10 rounded-lg bg-white bg-none text-[#4546bc] text-[0.875rem] cursor-pointer disabled:opacity-45 disabled:cursor-default focus-visible:[outline:2px_solid_#5657d9] focus-visible:outline-offset-[2px]"
          type="button"
          :disabled="!previous"
          @click="back"
        >
          <ArrowLeft :size="17" />
          Indietro
        </button>
        <GraphPersonSearch
          :people="people"
          :selected-id="rootId"
          @select-person="emit('selectPerson', $event)"
        />
      </div>
      <div class="flex items-center gap-[0.55rem] flex-wrap mt-[0.65rem]">
        <label
          class="flex items-center gap-[0.4rem] text-[#596176] text-[0.875rem] max-[600px]:flex-col max-[600px]:items-start"
        >
          Orientamento
          <select
            class="border border-[#cbd0e0] px-[0.6rem] py-[0.4rem] inline-flex items-center justify-center gap-[0.3rem] min-h-10 rounded-lg bg-white bg-none text-[#4546bc] text-[0.875rem] cursor-pointer focus-visible:[outline:2px_solid_#5657d9] focus-visible:outline-offset-[2px]"
            v-model="orientation"
          >
            <option value="horizontal">Orizzontale →</option>
            <option value="vertical">Verticale ↑</option>
          </select>
        </label>
        <label
          class="flex items-center gap-[0.4rem] text-[#596176] text-[0.875rem] max-[600px]:flex-col max-[600px]:items-start"
        >
          Generazioni
          <select
            class="border border-[#cbd0e0] px-[0.6rem] py-[0.4rem] inline-flex items-center justify-center gap-[0.3rem] min-h-10 rounded-lg bg-white bg-none text-[#4546bc] text-[0.875rem] cursor-pointer focus-visible:[outline:2px_solid_#5657d9] focus-visible:outline-offset-[2px]"
            v-model.number="generations"
          >
            <option
              v-for="n in 10"
              :key="n"
              :value="n"
            >
              {{ n }}
            </option>
          </select>
        </label>
        <div
          class="flex items-center gap-[0.55rem]"
          role="group"
          aria-label="Zoom"
        >
          <button
            class="border border-[#cbd0e0] px-[0.6rem] py-[0.4rem] inline-flex items-center justify-center gap-[0.3rem] min-h-10 rounded-lg bg-white bg-none text-[#4546bc] text-[0.875rem] cursor-pointer disabled:opacity-45 disabled:cursor-default focus-visible:[outline:2px_solid_#5657d9] focus-visible:outline-offset-[2px]"
            type="button"
            aria-label="Riduci zoom"
            @click="zoomBy(1 / 1.3)"
          >
            <Minus :size="17" />
          </button>
          <span class="min-w-10 text-center text-[0.875rem]">{{ Math.round(zoom * 100) }}%</span>
          <button
            class="border border-[#cbd0e0] px-[0.6rem] py-[0.4rem] inline-flex items-center justify-center gap-[0.3rem] min-h-10 rounded-lg bg-white bg-none text-[#4546bc] text-[0.875rem] cursor-pointer disabled:opacity-45 disabled:cursor-default focus-visible:[outline:2px_solid_#5657d9] focus-visible:outline-offset-[2px]"
            type="button"
            aria-label="Aumenta zoom"
            @click="zoomBy(1.3)"
          >
            <Plus :size="17" />
          </button>
          <button
            class="border border-[#cbd0e0] px-[0.6rem] py-[0.4rem] inline-flex items-center justify-center gap-[0.3rem] min-h-10 rounded-lg bg-white bg-none text-[#4546bc] text-[0.875rem] cursor-pointer disabled:opacity-45 disabled:cursor-default focus-visible:[outline:2px_solid_#5657d9] focus-visible:outline-offset-[2px]"
            type="button"
            aria-label="Adatta tutti gli antenati alla vista"
            title="Adatta alla vista"
            @click="fit"
          >
            <Maximize2 :size="17" />
          </button>
        </div>
        <div
          class="flex items-center gap-[0.55rem]"
          role="group"
          aria-label="Esporta antenati"
        >
          <button
            class="border border-[#cbd0e0] px-[0.6rem] py-[0.4rem] inline-flex items-center justify-center gap-[0.3rem] min-h-10 rounded-lg bg-white bg-none text-[#4546bc] text-[0.875rem] cursor-pointer disabled:opacity-45 disabled:cursor-default focus-visible:[outline:2px_solid_#5657d9] focus-visible:outline-offset-[2px]"
            type="button"
            :disabled="busy || !result.chart"
            @click="exportChart('png')"
          >
            PNG
          </button>
          <button
            class="border border-[#cbd0e0] px-[0.6rem] py-[0.4rem] inline-flex items-center justify-center gap-[0.3rem] min-h-10 rounded-lg bg-white bg-none text-[#4546bc] text-[0.875rem] cursor-pointer disabled:opacity-45 disabled:cursor-default focus-visible:[outline:2px_solid_#5657d9] focus-visible:outline-offset-[2px]"
            type="button"
            :disabled="busy || !result.chart"
            @click="exportChart('svg')"
          >
            SVG
          </button>
        </div>
      </div>
      <p class="mx-0 mt-[0.55rem] mb-0 text-[0.875rem] text-[#596176] wrap-anywhere">
        Antenati di
        <strong>{{ root?.firstName }} {{ root?.lastName }}</strong>
      </p>
      <p
        class="mx-0 mt-[0.55rem] mb-0 text-[0.875rem] text-[#596176] wrap-anywhere data-ancestor-error:text-[#a52639]"
        v-if="status"
        role="status"
        :data-ancestor-error="failed || undefined"
      >
        {{ status }}
      </p>
    </div>
    <div
      ref="viewport"
      class="p-[12px] flex-1 min-h-32 overflow-auto overscroll-contain"
      tabindex="0"
      aria-label="Grafico degli antenati: usa lo zoom e scorri per esplorare"
      @scroll="closeDetails"
      @pointerdown.capture="closeDetails"
      @keydown.esc="closeDetails"
    >
      <p
        v-if="result.error"
        class="data-[state~=ancestor-error]:text-[#a52639]"
        role="alert"
      >
        {{ result.error }}
      </p>
      <svg
        class="m-auto block max-w-[none]"
        v-if="result.chart"
        :width="result.chart.width * zoom"
        :height="result.chart.height * zoom"
        :viewBox="`0 0 ${result.chart.width} ${result.chart.height}`"
        font-family="Arial, sans-serif"
        aria-label="Albero degli antenati"
      >
        <text
          x="40"
          y="42"
          font-size="26"
          font-weight="700"
          fill="#24283c"
        >
          Albero degli antenati
        </text>
        <text
          x="40"
          y="74"
          font-size="16"
          fill="#596176"
        >
          Clicca una persona per esplorare i suoi antenati
        </text>
        <path
          v-for="link in result.chart.links"
          :key="link.id"
          :d="link.path"
          fill="none"
          :stroke="link.color"
          :stroke-dasharray="link.dash"
          stroke-width="2"
        >
          <title>{{ link.label }}</title>
        </path>
        <g
          v-for="node in result.chart.nodes"
          :key="node.id"
          class="group/ancestor-person cursor-pointer outline-none"
          :data-details-visible="hoveredNodeId === node.id || undefined"
          role="button"
          tabindex="0"
          :aria-describedby="hoveredNodeId === node.id ? detailsId : undefined"
          :aria-label="`Mostra antenati di ${node.person.firstName} ${node.person.lastName}`"
          @pointerenter="showDetails(node, $event)"
          @pointermove="moveDetails(node, $event)"
          @pointerleave="leaveDetails"
          @focusin="showDetails(node, $event)"
          @focusout="leaveDetails"
          @click="selectAncestor(node.person.id)"
          @keydown.enter.prevent="selectAncestor(node.person.id)"
          @keydown.space.prevent="selectAncestor(node.person.id)"
        >
          <rect
            class="group-hover/ancestor-person:stroke-[#3637b8] group-hover/ancestor-person:stroke-[5] group-hover/ancestor-person:fill-[#ededff] group-focus-visible/ancestor-person:stroke-[#3637b8] group-focus-visible/ancestor-person:stroke-[5] group-focus-visible/ancestor-person:fill-[#ededff] group-data-details-visible/ancestor-person:stroke-[#3637b8] group-data-details-visible/ancestor-person:stroke-[5] group-data-details-visible/ancestor-person:fill-[#ededff]"
            :x="node.x"
            :y="node.y"
            :width="result.chart.cardWidth"
            :height="result.chart.cardHeight"
            rx="12"
            :fill="node.generation ? '#fff' : '#eeefff'"
            :stroke="ancestorColor(node.person)"
            :stroke-width="node.generation ? 2 : 4"
          />
          <text
            text-anchor="middle"
            font-size="18"
            font-weight="600"
            fill="#24283c"
          >
            <tspan
              v-for="(line, index) in node.lines"
              :key="index"
              :x="node.x + result.chart.cardWidth / 2"
              :y="node.y + (result.chart.cardHeight - node.lines.length * 24) / 2 + 19 + index * 24"
            >
              {{ line }}
            </tspan>
          </text>
        </g>
      </svg>
    </div>
    <PersonHoverCard
      v-if="hoveredNode"
      :id="detailsId"
      :person="hoveredNode.person"
      :generation="hoveredNode.generation"
      :anchor="detailAnchor"
      @keep-open="keepDetailsOpen"
      @leave="leaveDetails"
      @close="closeDetails"
    />
    <div
      class="p-[0.65rem] flex flex-wrap gap-3 border-t border-t-[#dce0eb] text-[#596176] text-[0.875rem]"
    >
      <span class="flex items-center gap-[0.4rem]">
        <i class="w-6 border-t-[2px] border-t-[#596176]" />
        Biologico
      </span>
      <span class="flex items-center gap-[0.4rem]">
        <i class="border-[#5657d9] w-6 border-t-[2px] [border-top-style:dashed]" />
        Adottivo
      </span>
      <span class="flex items-center gap-[0.4rem]">
        <i class="border-[#b46619] w-6 border-t-[2px] [border-top-style:dotted]" />
        Affido
      </span>
      <p
        class="m-0 basis-full"
        v-if="result.chart?.nodes.length === 1"
      >
        Nessun antenato registrato per questa persona.
      </p>
      <p
        v-else-if="result.chart?.cycles"
        class="m-0 basis-full data-[state~=ancestor-error]:text-[#a52639]"
      >
        Rilevato un ciclo nei legami: il ramo interessato è interrotto.
      </p>
    </div>
  </section>
</template>
