<script setup lang="ts">
import { Check, ChevronRight, UserRound } from '@lucide/vue'
import type { Person } from '../types'

defineProps<{ label: string; person?: Person }>()
defineEmits<{ choose: [] }>()

function fullName(person: Person) {
  return `${person.firstName} ${person.lastName}`
}

function details(person: Person) {
  const date = (value: string) => value.split('-').reverse().join('/')
  return [
    person.birthDate ? `N. ${date(person.birthDate)}` : 'Nascita non indicata',
    person.deathDate ? `† ${date(person.deathDate)}` : '',
    person.birthPlace,
  ]
    .filter(Boolean)
    .join(' · ')
}
</script>

<template>
  <section class="min-w-0">
    <p class="mx-0 mt-0 mb-[0.55rem] text-[#4f5569] text-[1rem] font-[750]">{{ label }}</p>
    <button
      class="p-[0.8rem] border border-[#bdbfeb] flex items-center gap-3 w-full min-h-[6.7rem] rounded-xl bg-[#f4f4ff] bg-none text-[#181b2d] cursor-pointer hover:border-[#7778df] hover:bg-[#eeeeff] hover:bg-none focus-visible:[outline:3px_solid_rgba(86,_87,_217,_0.2)] focus-visible:outline-offset-[2px]"
      type="button"
      :aria-label="`${label}: ${person ? fullName(person) : 'nessuna persona selezionata'}. Apri ricerca`"
      @click="$emit('choose')"
    >
      <span
        class="grid place-items-center w-[2.6rem] h-[2.6rem] flex-none rounded-[0.65rem] text-white text-[0.875rem] font-extrabold uppercase"
        :style="{ background: person?.color ?? '#73798c' }"
      >
        <template v-if="person">{{ person.firstName[0] }}{{ person.lastName[0] }}</template>
        <UserRound
          v-else
          :size="20"
        />
      </span>
      <span class="grid min-w-0 flex-1 gap-1 text-left wrap-anywhere">
        <strong class="text-[1rem] leading-[1.3]">
          {{ person ? fullName(person) : 'Scegli una persona' }}
        </strong>
        <small
          class="text-[#596176] text-[0.78rem] leading-[1.4]"
          v-if="person"
        >
          {{ details(person) }}
        </small>
        <small
          class="text-[#596176] text-[0.78rem] leading-[1.4]"
          v-else
        >
          Cerca per nome, data o luogo
        </small>
      </span>
      <Check
        v-if="person"
        :size="17"
        class="flex-none text-[#5657d9]"
      />
      <ChevronRight
        v-else
        :size="18"
        class="flex-none text-[#5657d9]"
      />
    </button>
  </section>
</template>
