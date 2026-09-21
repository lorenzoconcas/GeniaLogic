<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { CalendarDays, MapPin, Plus } from '@lucide/vue'
import type { Person } from '../types'

defineProps<{ data: { person: Person; selected: boolean; highlighted?: boolean } }>()
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
  <div
    class="[&_.vue-flow\_\_handle]:size-[6px] [&_.vue-flow\_\_handle]:border [&_.vue-flow\_\_handle]:border-paper [&_.vue-flow\_\_handle]:bg-forest border border-[#dce0eb] py-[0.65rem] relative flex items-center gap-[0.65rem] w-48 min-h-[5.1rem] rounded-[0.6rem] bg-paper bg-none pr-[1.35rem] pl-[0.65rem] shadow-[0_8px_22px_rgba(24,_27,_45,_0.09)] [transition:border-color_0.16s,_box-shadow_0.16s,_transform_0.16s] hover:[transform:translateY(-2px)] hover:shadow-[0_11px_25px_rgba(48,_45,_38,_0.14)] data-selected:border-forest data-selected:shadow-[0_0_0_3px_rgba(49,_93,_80,_0.12),_0_11px_25px_rgba(48,_45,_38,_0.13)] data-search-highlighted:border-[#5657d9] data-search-highlighted:bg-[#f4f4ff] data-search-highlighted:bg-none data-search-highlighted:shadow-[0_0_0_4px_#5657d947,_0_10px_28px_#35367b33]"
    :data-selected="data.selected || undefined"
    :data-search-highlighted="data.highlighted || undefined"
  >
    <span
      v-if="data.highlighted"
      class="px-2 py-1 absolute bottom-[calc(100%_+_0.5rem)] left-0 rounded-[0.35rem] bg-[#4546bc] bg-none text-white text-[0.875rem] font-bold whitespace-nowrap"
    >
      Persona trovata
    </span>
    <Handle
      id="target-top"
      type="target"
      :position="Position.Top"
    />
    <Handle
      id="source-left"
      class="opacity-0 pointer-events-none"
      type="source"
      :position="Position.Left"
    />
    <Handle
      id="source-right"
      class="opacity-0 pointer-events-none"
      type="source"
      :position="Position.Right"
    />
    <Handle
      id="target-left"
      class="opacity-0 pointer-events-none"
      type="target"
      :position="Position.Left"
    />
    <Handle
      id="target-right"
      class="opacity-0 pointer-events-none"
      type="target"
      :position="Position.Right"
    />
    <button
      class="nodrag nopan border-[2px] border-paper absolute z-4 top-[-0.62rem] right-[-0.62rem] grid place-items-center w-[1.85rem] h-[1.85rem] rounded-full bg-[#5657d9] bg-none text-white shadow-[0_5px_13px_rgba(57,_58,_155,_0.28)] cursor-pointer [transition:transform_0.15s,_background_0.15s,_box-shadow_0.15s] hover:[transform:scale(1.08)] hover:bg-[#4546bc] hover:bg-none hover:shadow-[0_7px_17px_rgba(57,_58,_155,_0.34)] focus-visible:[outline:3px_solid_rgba(86,_87,_217,_0.28)] focus-visible:outline-offset-[2px]"
      type="button"
      :aria-label="`Aggiungi parente a ${data.person.firstName} ${data.person.lastName}`"
      title="Aggiungi parente"
      @click.stop="emit('addRelative', data.person.id)"
    >
      <Plus
        :size="16"
        stroke-width="2.5"
      />
    </button>
    <div
      class="grid place-items-center w-11 h-11 flex-none rounded-lg text-white text-[0.72rem] font-[850] tracking-[0.04em]"
      :style="{ background: data.person.color }"
    >
      {{ initials(data.person) }}
    </div>
    <div class="min-w-0">
      <p class="truncate font-display text-[15px] font-semibold">
        {{ data.person.firstName }} {{ data.person.lastName }}
      </p>
      <p class="mt-1 flex items-center gap-1 text-[10px] text-muted">
        <CalendarDays :size="11" />
        {{ years(data.person) }}
      </p>
      <p
        v-if="data.person.birthPlace"
        class="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted"
      >
        <MapPin :size="11" />
        {{ data.person.birthPlace }}
      </p>
    </div>
    <Handle
      id="source-bottom"
      type="source"
      :position="Position.Bottom"
    />
  </div>
</template>
