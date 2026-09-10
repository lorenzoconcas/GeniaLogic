<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Person } from '../types'
import { personDetailRows, placePersonDetails } from '../services/personDetails'

const props = defineProps<{ id: string; person: Person; generation: number; anchor: { x: number; y: number } }>()
const emit = defineEmits<{ keepOpen: []; leave: []; close: [] }>()
const card = ref<HTMLElement | null>(null)
const position = ref({ x: 0, y: 0 })
const ready = ref(false)
const rows = computed(() => personDetailRows(props.person))
let observer: ResizeObserver | undefined

function positionCard() {
  if (!card.value) return
  const bounds = card.value.getBoundingClientRect()
  position.value = placePersonDetails(props.anchor, bounds, { width: window.innerWidth, height: window.innerHeight })
  ready.value = true
}
function escape(event: KeyboardEvent) { if (event.key === 'Escape') emit('close') }
function scroll(event: Event) {
  if (!(event.target instanceof Node) || !card.value?.contains(event.target)) emit('close')
}
watch(() => props.anchor, positionCard, { flush: 'post' })
onMounted(() => {
  observer = new ResizeObserver(positionCard)
  if (card.value) observer.observe(card.value)
  positionCard()
  window.addEventListener('resize', positionCard)
  window.addEventListener('scroll', scroll, true)
  window.addEventListener('keydown', escape)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', positionCard)
  window.removeEventListener('scroll', scroll, true)
  window.removeEventListener('keydown', escape)
})
</script>

<template>
  <Teleport to="body">
    <aside :id="id" ref="card" class="person-hover-card" role="tooltip" :style="{ left: `${position.x}px`, top: `${position.y}px`, visibility: ready ? 'visible' : 'hidden' }" @pointerenter="emit('keepOpen')" @pointerleave="emit('leave')">
      <p class="hover-generation">{{ generation === 0 ? 'Persona al centro' : `Generazione ${generation}` }}</p>
      <h3>{{ person.firstName }} {{ person.lastName }}</h3>
      <dl><div v-for="row in rows" :key="row.label"><dt>{{ row.label }}</dt><dd>{{ row.value }}</dd></div></dl>
      <section v-if="person.notes?.trim()" class="hover-notes"><h4>Note</h4><p>{{ person.notes }}</p></section>
    </aside>
  </Teleport>
</template>

<style scoped>
.person-hover-card { position:fixed; z-index:90; width:23rem; max-width:calc(100vw - 16px); max-height:min(35rem, calc(100dvh - 16px)); overflow:auto; overscroll-behavior:contain; padding:1rem; border:1px solid #bfc3e4; border-radius:.8rem; background:#fff; color:#24283c; box-shadow:0 12px 40px #24283c30; overflow-wrap:anywhere; }
.hover-generation { margin:0 0 .3rem; font-size:.875rem; font-weight:700; color:#5657b9; }
.person-hover-card h3 { margin:0 0 .85rem; font-size:1.2rem; line-height:1.35; font-weight:800; }
.person-hover-card dl { display:grid; gap:.6rem; margin:0; }
.person-hover-card dl>div { display:grid; grid-template-columns:7rem minmax(0,1fr); gap:.65rem; }
.person-hover-card dt { color:#626a7f; font-size:.875rem; }
.person-hover-card dd { margin:0; font-size:1rem; line-height:1.35; }
.hover-notes { margin-top:.85rem; border-top:1px solid #e1e4ee; padding-top:.75rem; }
.hover-notes h4 { margin:0 0 .3rem; font-size:.875rem; color:#626a7f; font-weight:700; }
.hover-notes p { margin:0; font-size:1rem; line-height:1.5; white-space:pre-wrap; }
</style>
