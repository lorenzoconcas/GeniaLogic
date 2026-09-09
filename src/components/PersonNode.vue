<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { CalendarDays, MapPin, Plus } from '@lucide/vue'
import type { Person } from '../types'

defineProps<{ data: { person: Person; selected: boolean } }>()
const emit = defineEmits<{ addRelative: [personId: string] }>()

function years(person: Person) {
  const born = person.birthDate?.slice(0, 4) || '?'
  const died = person.deathDate?.slice(0, 4)
  return died ? `${born} – ${died}` : `n. ${born}`
}

function initials(person: Person) {
  return `${person.firstName[0] || ''}${person.lastName[0] || ''}`.toUpperCase()
}
</script>

<template>
  <div class="flow-person" :class="{ selected: data.selected }">
    <Handle id="target-top" type="target" :position="Position.Top" />
    <Handle id="source-left" type="source" :position="Position.Left" class="side-handle" />
    <Handle id="source-right" type="source" :position="Position.Right" class="side-handle" />
    <Handle id="target-left" type="target" :position="Position.Left" class="side-handle" />
    <Handle id="target-right" type="target" :position="Position.Right" class="side-handle" />
    <button class="flow-person-add-relative nodrag nopan" type="button" :aria-label="`Aggiungi parente a ${data.person.firstName} ${data.person.lastName}`" title="Aggiungi parente" @click.stop="emit('addRelative', data.person.id)"><Plus :size="16" stroke-width="2.5" /></button>
    <div class="flow-avatar" :style="{ background: data.person.color }">{{ initials(data.person) }}</div>
    <div class="min-w-0">
      <p class="truncate font-display text-[15px] font-semibold">{{ data.person.firstName }} {{ data.person.lastName }}</p>
      <p class="mt-1 flex items-center gap-1 text-[10px] text-muted"><CalendarDays :size="11" />{{ years(data.person) }}</p>
      <p v-if="data.person.birthPlace" class="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted"><MapPin :size="11" />{{ data.person.birthPlace }}</p>
    </div>
    <Handle id="source-bottom" type="source" :position="Position.Bottom" />
  </div>
</template>
