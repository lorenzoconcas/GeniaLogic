<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowLeft, ChevronDown, ChevronRight, Plus } from '@lucide/vue'
import type { Gender, Person, Relationship } from '../types'
import { closeRelatives } from '../services/closeRelatives'

const props = defineProps<{
  people: Person[]
  relationships: Relationship[]
  rootId: string
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
const canvasHeight = computed(() => outerRadius.value + rootRadius + 88)
const centerX = computed(() => canvasWidth.value / 2)
const centerY = computed(() => outerRadius.value + 38)

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
  const segmentAngle = Math.PI / 2 ** slot.generation
  const startAngle = Math.PI - (slot.index + 1) * segmentAngle
  const endAngle = Math.PI - slot.index * segmentAngle
  const middleAngle = (startAngle + endAngle) / 2
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
    rotation: 90 - middleAngle * 180 / Math.PI,
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
  <section class="radial-tree" aria-label="Albero genealogico radiale">
    <header class="radial-toolbar">
      <button class="radial-back" type="button" :disabled="!previousPerson" :title="previousPerson ? `Torna a ${previousPerson.firstName} ${previousPerson.lastName}` : 'Nessuna persona precedente'" aria-label="Indietro nella vista radiale" @click="goBack"><ArrowLeft :size="18" />Indietro</button>
      <div><span>Persona al centro</span><strong>{{ rootPerson ? `${rootPerson.firstName} ${rootPerson.lastName}` : 'Nessuna persona' }}</strong></div>
      <label><span>Generazioni</span><span class="generation-select"><select v-model.number="generations"><option v-for="count in [3, 4, 5, 6]" :key="count" :value="count">{{ count }}</option></select><ChevronDown :size="14" /></span></label>
    </header>

    <svg v-if="rootPerson" class="fan-canvas" :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`" preserveAspectRatio="xMidYMax meet" role="img" :aria-label="`Ventaglio degli antenati di ${rootPerson.firstName} ${rootPerson.lastName}`">
      <g v-for="slot in slots.filter(item => item.generation > 0)" :key="`${slot.generation}-${slot.index}`" class="fan-segment" :class="{ empty: !slot.person, actionable: !slot.person && slot.childId }">
        <path :d="geometry(slot).path" :fill="segmentFill(slot)" :stroke="segmentStroke(slot)" stroke-width="1.5" />
        <g v-if="slot.person" class="fan-person" tabindex="0" role="button" :aria-label="`Metti al centro ${slot.person.firstName} ${slot.person.lastName}`" :transform="`translate(${geometry(slot).labelX} ${geometry(slot).labelY}) rotate(${geometry(slot).rotation})`" @click="emit('selectPerson', slot.person.id)" @keydown.enter.prevent="emit('selectPerson', slot.person.id)" @keydown.space.prevent="emit('selectPerson', slot.person.id)">
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
.radial-toolbar { position:relative; z-index:5; margin:.75rem .75rem 0; display:flex; align-items:center; justify-content:space-between; gap:1rem; border:1px solid rgba(218,221,234,.9); border-radius:.65rem; background:rgba(255,255,255,.92); padding:.55rem .7rem; box-shadow:0 5px 18px rgba(35,39,68,.07); backdrop-filter:blur(8px); }
.radial-toolbar>div { display:grid; flex:1; gap:.12rem; min-width:0; }
.radial-back { display:inline-flex; align-items:center; justify-content:center; gap:.35rem; flex-shrink:0; min-height:2.5rem; border:1px solid #d8dbea; border-radius:.5rem; background:#f7f8fc; padding:.45rem .6rem; color:#4546bc; font-size:.875rem; font-weight:750; cursor:pointer; }
.radial-back:hover:not(:disabled) { background:#eeeeff; border-color:#9293e4; }
.radial-back:disabled { opacity:.45; cursor:default; }
.radial-toolbar span { color:#73798c; font-size:.58rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
.radial-toolbar strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.72rem; }
.radial-toolbar label { display:flex; align-items:center; gap:.45rem; }
.generation-select { position:relative; display:flex; align-items:center; }
.generation-select select { appearance:none; min-width:3.2rem; border:1px solid #d8dbea; border-radius:.5rem; background:#f7f8fc; padding:.38rem 1.35rem .38rem .55rem; color:#35394d; font-size:.72rem; font-weight:800; outline:none; cursor:pointer; }
.generation-select svg { position:absolute; right:.35rem; color:#73798c; pointer-events:none; }
.fan-canvas { display:block; width:100%; height:100%; min-height:0; padding:.4rem .7rem .2rem; }
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
