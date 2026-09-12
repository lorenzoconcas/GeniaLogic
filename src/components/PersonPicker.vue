<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Search, UserRound } from '@lucide/vue'
import type { Person } from '../types'

const props = withDefaults(defineProps<{ people: Person[]; modelValue: string; label: string; fill?: boolean; autofocusSearch?: boolean }>(), { fill: false, autofocusSearch: false })
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()
const search = ref('')
const selected = computed(() => props.people.find(person => person.id === props.modelValue))
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it').trim()
const fullName = (person: Person) => `${person.firstName} ${person.lastName}`
const nameCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const person of props.people) {
    const key = normalize(fullName(person))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
})
const isNamesake = (person: Person) => (nameCounts.value.get(normalize(fullName(person))) ?? 0) > 1
const results = computed(() => {
  const terms = normalize(search.value).split(/\s+/).filter(Boolean)
  return props.people.filter(person => {
    const text = normalize([fullName(person), person.birthName, person.nickname, person.birthDate, person.deathDate, person.birthPlace, person.occupation, person.id].filter(Boolean).join(' '))
    return terms.every(term => text.includes(term))
  }).sort((a, b) => a.lastName.localeCompare(b.lastName, 'it', { sensitivity: 'base' })
    || a.firstName.localeCompare(b.firstName, 'it', { sensitivity: 'base' })
    || (a.birthDate ?? '').localeCompare(b.birthDate ?? '') || a.id.localeCompare(b.id))
})
function details(person: Person) {
  const date = (value: string) => value.split('-').reverse().join('/')
  return [person.birthDate ? `N. ${date(person.birthDate)}` : 'Nascita non indicata',
    person.deathDate ? `† ${date(person.deathDate)}` : '', person.birthPlace,
    person.nickname ? `«${person.nickname}»` : '', person.occupation].filter(Boolean).join(' · ')
}
// Keep the exchanged selection visible even if the previous search does not match it.
watch(() => props.modelValue, () => { search.value = '' })
</script>

<template>
  <fieldset class="person-picker" :class="{ 'person-picker-fill': fill }">
    <legend>{{ label }}</legend>
    <div class="picker-selected" aria-live="polite">
      <div class="picker-avatar" :style="{ background: selected?.color ?? '#73798c' }"><template v-if="selected">{{ selected.firstName[0] }}{{ selected.lastName[0] }}</template><UserRound v-else :size="20" /></div>
      <div v-if="selected" class="picker-identity"><strong>{{ fullName(selected) }}</strong><small>{{ details(selected) }}</small><small v-if="isNamesake(selected)" class="picker-reference">Rif. {{ selected.id }}</small></div>
      <div v-else class="picker-identity"><strong>Scegli una persona</strong></div>
      <Check v-if="selected" :size="17" class="picker-check" />
    </div>
    <label class="picker-search"><Search :size="17" /><input v-model="search" type="search" :autofocus="autofocusSearch" :aria-label="`Cerca ${label.toLocaleLowerCase('it')}`" placeholder="Nome, cognome, anno o luogo…" /></label>
    <p class="picker-count">{{ results.length }} persone · ordine per cognome</p>
    <div class="picker-results" :aria-label="`Persone per ${label.toLocaleLowerCase('it')}`">
      <button v-for="person in results" :key="person.id" type="button" class="picker-option" :class="{ chosen: person.id === modelValue }" :aria-pressed="person.id === modelValue" @click="emit('update:modelValue', person.id)">
        <span class="picker-avatar" :style="{ background: person.color }">{{ person.firstName[0] }}{{ person.lastName[0] }}</span>
        <span class="picker-identity"><strong>{{ fullName(person) }}</strong><small>{{ details(person) }}</small><small v-if="isNamesake(person)" class="picker-reference">Rif. {{ person.id }}</small></span>
        <Check v-if="person.id === modelValue" :size="16" class="picker-check" />
      </button>
      <p v-if="!results.length" class="picker-empty">Nessuna corrispondenza. Prova un altro nome, anno o luogo.</p>
    </div>
  </fieldset>
</template>

<style scoped>
.person-picker { min-width:0; margin:0; padding:0; border:0; }
.person-picker legend { margin-bottom:.55rem; color:#4f5569; font-size:1rem; font-weight:750; }
.picker-selected,.picker-option { display:flex; align-items:center; gap:.65rem; min-width:0; padding:.7rem; }
.picker-selected { min-height:6.7rem; border:1px solid #bdbfeb; border-radius:.65rem; background:#f4f4ff; }
.picker-avatar { display:grid; place-items:center; width:2.4rem; height:2.4rem; flex:0 0 auto; border-radius:.6rem; color:white; font-size:.875rem; font-weight:800; text-transform:uppercase; }
.picker-identity { display:grid; flex:1; gap:.25rem; min-width:0; text-align:left; overflow-wrap:anywhere; }
.picker-identity strong { font-size:1rem; line-height:1.3; }
.picker-identity small { color:#596176; font-size:.8125rem; line-height:1.45; }
.picker-identity .picker-reference { font-size:.75rem; color:#4f50ad; }
.picker-check { flex-shrink:0; color:#5657d9; }
.picker-search { display:flex; align-items:center; gap:.45rem; margin-top:.65rem; border:1px solid #d6d9e4; border-radius:.55rem; padding:.55rem; color:#6e7588; }
.picker-search input { width:100%; min-width:0; border:0; outline:none; background:transparent; color:#181b2d; font-size:.875rem; }
.picker-search:focus-within { outline:2px solid #7778df; outline-offset:2px; }
.picker-count { margin:.4rem 0; color:#6e7588; font-size:.75rem; }
.picker-results { max-height:15rem; overflow-y:auto; overscroll-behavior:contain; border:1px solid #dfe3ed; border-radius:.65rem; }
.person-picker-fill { display:flex; min-height:0; height:100%; flex-direction:column; }
.person-picker-fill .picker-results { min-height:9rem; max-height:none; flex:1; }
.picker-option { width:100%; border:0; border-bottom:1px solid #e8eaf1; background:white; cursor:pointer; }
.picker-option:last-child { border-bottom:0; }
.picker-option:hover,.picker-option.chosen { background:#f0f0ff; }
.picker-option:focus-visible { outline:2px solid #5657d9; outline-offset:-3px; }
.picker-empty { margin:0; padding:1rem; color:#6e7588; font-size:.875rem; }
</style>
