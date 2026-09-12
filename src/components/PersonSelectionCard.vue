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
  ].filter(Boolean).join(' · ')
}
</script>

<template>
  <section class="person-selection">
    <p>{{ label }}</p>
    <button type="button" :aria-label="`${label}: ${person ? fullName(person) : 'nessuna persona selezionata'}. Apri ricerca`" @click="$emit('choose')">
      <span class="selection-avatar" :style="{ background: person?.color ?? '#73798c' }"><template v-if="person">{{ person.firstName[0] }}{{ person.lastName[0] }}</template><UserRound v-else :size="20" /></span>
      <span class="selection-identity"><strong>{{ person ? fullName(person) : 'Scegli una persona' }}</strong><small v-if="person">{{ details(person) }}</small><small v-else>Cerca per nome, data o luogo</small></span>
      <Check v-if="person" :size="17" class="selection-status" /><ChevronRight v-else :size="18" class="selection-status" />
    </button>
  </section>
</template>

<style scoped>
.person-selection { min-width:0; }
.person-selection>p { margin:0 0 .55rem; color:#4f5569; font-size:1rem; font-weight:750; }
.person-selection>button { display:flex; align-items:center; gap:.75rem; width:100%; min-height:6.7rem; border:1px solid #bdbfeb; border-radius:.75rem; background:#f4f4ff; padding:.8rem; color:#181b2d; cursor:pointer; }
.person-selection>button:hover { border-color:#7778df; background:#eeeeff; }
.person-selection>button:focus-visible { outline:3px solid rgba(86,87,217,.2); outline-offset:2px; }
.selection-avatar { display:grid; place-items:center; width:2.6rem; height:2.6rem; flex:0 0 auto; border-radius:.65rem; color:white; font-size:.875rem; font-weight:800; text-transform:uppercase; }
.selection-identity { display:grid; min-width:0; flex:1; gap:.25rem; text-align:left; overflow-wrap:anywhere; }
.selection-identity strong { font-size:1rem; line-height:1.3; }
.selection-identity small { color:#596176; font-size:.78rem; line-height:1.4; }
.selection-status { flex:0 0 auto; color:#5657d9; }
</style>
