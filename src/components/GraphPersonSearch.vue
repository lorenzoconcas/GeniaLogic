<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'
import { Check, Search, X } from '@lucide/vue'
import type { Person } from '../types'
import { namesakeIds, personSearchDetails, searchPeople } from '../services/personSearch'

const props = defineProps<{ people: Person[]; selectedId: string | null }>()
const emit = defineEmits<{ selectPerson: [personId: string] }>()
const query = ref('')
const open = ref(false)
const input = ref<HTMLInputElement | null>(null)
const resultsElement = ref<HTMLDivElement | null>(null)
const resultsId = useId()
const results = computed(() => searchPeople(props.people, query.value))
const namesakes = computed(() => namesakeIds(props.people))
const showResults = computed(() => open.value && Boolean(query.value.trim()))

function selectPerson(person: Person) {
  input.value?.focus()
  open.value = false
  emit('selectPerson', person.id)
}

function close() {
  input.value?.focus()
  open.value = false
}

function clear() {
  query.value = ''
  input.value?.focus()
}

function leave(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) open.value = false
}

async function focusResult(direction: 1 | -1) {
  open.value = true
  await nextTick()
  const buttons = resultsElement.value?.querySelectorAll<HTMLButtonElement>('.graph-search-result')
  if (!buttons?.length) return
  const current = [...buttons].indexOf(document.activeElement as HTMLButtonElement)
  const index = current === -1 ? (direction === 1 ? 0 : buttons.length - 1) : (current + direction + buttons.length) % buttons.length
  buttons[index]?.focus()
}
</script>

<template>
  <div class="graph-person-search" @focusout="leave" @keydown.esc.stop.prevent="close" @keydown.down.prevent="focusResult(1)" @keydown.up.prevent="focusResult(-1)">
    <div class="graph-search-field">
      <Search :size="18" aria-hidden="true" />
      <input ref="input" v-model="query" type="search" aria-label="Cerca una persona nel grafico" placeholder="Cerca nome, cognome, anno o luogo…" autocomplete="off" :aria-controls="showResults ? resultsId : undefined" @input="open = true" @focus="open = true" @click="open = true" />
      <button v-if="query" type="button" class="graph-search-clear" aria-label="Cancella ricerca" @click="clear"><X :size="18" /></button>
    </div>
    <div v-if="showResults" :id="resultsId" class="graph-search-dropdown">
      <p class="graph-search-count" role="status">{{ results.length }} {{ results.length === 1 ? 'persona trovata' : 'persone trovate' }}</p>
      <div ref="resultsElement" class="graph-search-results" aria-label="Risultati della ricerca persone">
        <button v-for="person in results" :key="person.id" class="graph-search-result" type="button" :aria-pressed="person.id === selectedId" @mousedown.prevent @click="selectPerson(person)">
          <span class="graph-search-avatar" :style="{ background: person.color }" aria-hidden="true">{{ person.firstName[0] }}{{ person.lastName[0] }}</span>
          <span class="graph-search-identity"><strong>{{ person.firstName }} {{ person.lastName }}</strong><small>{{ personSearchDetails(person) }}</small><small v-if="namesakes.has(person.id)" class="graph-search-reference">Rif. {{ person.id }}</small></span>
          <Check v-if="person.id === selectedId" :size="18" aria-label="Persona selezionata" />
        </button>
        <p v-if="!results.length" class="graph-search-empty">Nessuna corrispondenza. Prova un altro nome, anno o luogo.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.graph-person-search { position:relative; flex:1; min-width:0; max-width:34rem; }
.graph-search-field { display:flex; align-items:center; gap:.5rem; min-height:2.75rem; padding:.35rem .65rem; border:1px solid #cbd0e0; border-radius:.6rem; background:#fff; color:#596176; }
.graph-search-field:focus-within { outline:2px solid #7778df; outline-offset:1px; }
.graph-search-field>svg { flex-shrink:0; }
.graph-search-field input { flex:1; width:100%; min-width:0; border:0; outline:none; background:transparent; color:#24283c; font-size:1rem; }
.graph-search-field input::-webkit-search-cancel-button { appearance:none; }
.graph-search-clear { display:grid; place-items:center; flex-shrink:0; min-width:2rem; min-height:2rem; border:0; border-radius:.35rem; background:#f1f2f9; color:#555c70; cursor:pointer; }
.graph-search-dropdown { position:absolute; z-index:20; top:calc(100% + .5rem); left:0; width:min(34rem, calc(100vw - 4rem)); max-width:calc(100% + 3.1rem); border:1px solid #cbd0e0; border-radius:.65rem; background:#fff; box-shadow:0 12px 35px #24283c26; overflow:hidden; }
.graph-search-count { margin:0; padding:.65rem .8rem; background:#f5f6fb; color:#596176; font-size:.875rem; }
.graph-search-results { max-height:min(19rem, 45dvh); overflow-y:auto; overscroll-behavior:contain; }
.graph-search-result { display:flex; align-items:center; gap:.65rem; width:100%; border:0; border-top:1px solid #e5e7ef; padding:.75rem; background:#fff; text-align:left; cursor:pointer; }
.graph-search-result:hover,.graph-search-result[aria-pressed=true] { background:#f0f0ff; }
.graph-search-result:focus-visible { outline:2px solid #5657d9; outline-offset:-3px; }
.graph-search-result>svg { flex-shrink:0; color:#5657d9; }
.graph-search-avatar { display:grid; place-items:center; flex:0 0 2.4rem; height:2.4rem; border-radius:.55rem; color:#fff; font-weight:800; text-transform:uppercase; }
.graph-search-identity { display:grid; flex:1; min-width:0; gap:.2rem; overflow-wrap:anywhere; }
.graph-search-identity strong { font-size:1rem; line-height:1.35; color:#24283c; }
.graph-search-identity small { font-size:.875rem; line-height:1.4; color:#596176; }
.graph-search-identity .graph-search-reference { color:#4f50ad; font-size:.8125rem; }
.graph-search-empty { margin:0; padding:1rem; color:#596176; font-size:1rem; }
</style>
