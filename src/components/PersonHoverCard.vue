<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Person } from '../types'
import { personDetailRows, placePersonDetails } from '../services/personDetails'

const props = defineProps<{
  id: string
  person: Person
  generation: number
  anchor: { x: number; y: number }
}>()
const emit = defineEmits<{ keepOpen: []; leave: []; close: [] }>()
const card = ref<HTMLElement | null>(null)
const position = ref({ x: 0, y: 0 })
const ready = ref(false)
const rows = computed(() => personDetailRows(props.person))
let observer: ResizeObserver | undefined

function positionCard() {
  if (!card.value) return
  const bounds = card.value.getBoundingClientRect()
  position.value = placePersonDetails(props.anchor, bounds, {
    width: window.innerWidth,
    height: window.innerHeight,
  })
  ready.value = true
}
function escape(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}
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
    <aside
      :id="id"
      ref="card"
      class="p-4 border border-[#bfc3e4] fixed z-90 w-92 max-w-[calc(100vw_-_16px)] max-h-[min(35rem,_calc(100dvh_-_16px))] overflow-auto overscroll-contain rounded-[0.8rem] bg-white bg-none text-[#24283c] shadow-[0_12px_40px_#24283c30] wrap-anywhere"
      role="tooltip"
      :style="{
        left: `${position.x}px`,
        top: `${position.y}px`,
        visibility: ready ? 'visible' : 'hidden',
      }"
      @pointerenter="emit('keepOpen')"
      @pointerleave="emit('leave')"
    >
      <p class="mx-0 mt-0 mb-[0.3rem] text-[0.875rem] font-bold text-[#5657b9]">
        {{ generation === 0 ? 'Persona al centro' : `Generazione ${generation}` }}
      </p>
      <h3 class="mx-0 mt-0 mb-[0.85rem] text-[1.2rem] leading-[1.35] font-extrabold">
        {{ person.firstName }} {{ person.lastName }}
      </h3>
      <dl class="m-0 grid gap-[0.6rem]">
        <div
          class="grid grid-cols-[7rem_minmax(0,_1fr)] gap-[0.65rem]"
          v-for="row in rows"
          :key="row.label"
        >
          <dt class="text-[#626a7f] text-[0.875rem]">{{ row.label }}</dt>
          <dd class="m-0 text-[1rem] leading-[1.35]">{{ row.value }}</dd>
        </div>
      </dl>
      <section
        v-if="person.notes?.trim()"
        class="mt-[0.85rem] border-t border-t-[#e1e4ee] pt-3"
      >
        <h4 class="mx-0 mt-0 mb-[0.3rem] text-[0.875rem] text-[#626a7f] font-bold">Note</h4>
        <p class="m-0 text-[1rem] leading-[1.5] whitespace-pre-wrap">{{ person.notes }}</p>
      </section>
    </aside>
  </Teleport>
</template>
