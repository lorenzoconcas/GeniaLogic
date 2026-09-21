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
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null))
    open.value = false
}

async function focusResult(direction: 1 | -1) {
  open.value = true
  await nextTick()
  const buttons = resultsElement.value?.querySelectorAll<HTMLButtonElement>('.graph-search-result')
  if (!buttons?.length) return
  const current = [...buttons].indexOf(document.activeElement as HTMLButtonElement)
  const index =
    current === -1
      ? direction === 1
        ? 0
        : buttons.length - 1
      : (current + direction + buttons.length) % buttons.length
  buttons[index]?.focus()
}
</script>

<template>
  <div
    class="relative flex-1 min-w-0 max-w-136"
    @focusout="leave"
    @keydown.esc.stop.prevent="close"
    @keydown.down.prevent="focusResult(1)"
    @keydown.up.prevent="focusResult(-1)"
  >
    <div
      class="border border-[#cbd0e0] px-[0.65rem] py-[0.35rem] flex items-center gap-2 min-h-11 rounded-[0.6rem] bg-white bg-none text-[#596176] focus-within:[outline:2px_solid_#7778df] focus-within:outline-offset-[1px]"
    >
      <Search
        class="shrink-0"
        :size="18"
        aria-hidden="true"
      />
      <input
        class="border-0 border-transparent flex-1 w-full min-w-0 outline-none bg-transparent bg-none text-[#24283c] text-[1rem] [&::-webkit-search-cancel-button]:appearance-none"
        ref="input"
        v-model="query"
        type="search"
        aria-label="Cerca una persona nel grafico"
        placeholder="Cerca nome, cognome, anno o luogo…"
        autocomplete="off"
        :aria-controls="showResults ? resultsId : undefined"
        @input="open = true"
        @focus="open = true"
        @click="open = true"
      />
      <button
        v-if="query"
        type="button"
        class="border-0 border-transparent grid place-items-center shrink-0 min-w-8 min-h-8 rounded-[0.35rem] bg-[#f1f2f9] bg-none text-[#555c70] cursor-pointer"
        aria-label="Cancella ricerca"
        @click="clear"
      >
        <X :size="18" />
      </button>
    </div>
    <div
      v-if="showResults"
      :id="resultsId"
      class="border border-[#cbd0e0] absolute z-20 top-[calc(100%_+_0.5rem)] left-0 w-[min(34rem,_calc(100vw_-_4rem))] max-w-[calc(100%_+_3.1rem)] rounded-[0.65rem] bg-white bg-none shadow-[0_12px_35px_#24283c26] overflow-hidden"
    >
      <p
        class="m-0 px-[0.8rem] py-[0.65rem] bg-[#f5f6fb] bg-none text-[#596176] text-[0.875rem]"
        role="status"
      >
        {{ results.length }} {{ results.length === 1 ? 'persona trovata' : 'persone trovate' }}
      </p>
      <div
        ref="resultsElement"
        class="max-h-[min(19rem,_45dvh)] overflow-y-auto overscroll-contain"
        aria-label="Risultati della ricerca persone"
      >
        <button
          v-for="person in results"
          :key="person.id"
          class="p-3 flex items-center gap-[0.65rem] w-full border-t border-t-[#e5e7ef] border-r-0 border-r-transparent border-b-0 border-b-transparent border-l-0 border-l-transparent bg-white bg-none text-left cursor-pointer hover:bg-[#f0f0ff] hover:bg-none [&[aria-pressed=true]]:bg-[#f0f0ff] [&[aria-pressed=true]]:bg-none focus-visible:[outline:2px_solid_#5657d9] focus-visible:outline-offset-[-3px]"
          type="button"
          :aria-pressed="person.id === selectedId"
          @mousedown.prevent
          @click="selectPerson(person)"
        >
          <span
            class="grid place-items-center [flex:0_0_2.4rem] h-[2.4rem] rounded-[0.55rem] text-white font-extrabold uppercase"
            :style="{ background: person.color }"
            aria-hidden="true"
          >
            {{ person.firstName[0] }}{{ person.lastName[0] }}
          </span>
          <span class="grid flex-1 min-w-0 gap-[0.2rem] wrap-anywhere">
            <strong class="text-[1rem] leading-[1.35] text-[#24283c]">
              {{ person.firstName }} {{ person.lastName }}
            </strong>
            <small class="text-[0.875rem] leading-[1.4] text-[#596176]">
              {{ personSearchDetails(person) }}
            </small>
            <small
              v-if="namesakes.has(person.id)"
              class="text-[0.8125rem] leading-[1.4] text-[#4f50ad]"
            >
              Rif. {{ person.id }}
            </small>
          </span>
          <Check
            class="shrink-0 text-[#5657d9]"
            v-if="person.id === selectedId"
            :size="18"
            aria-label="Persona selezionata"
          />
        </button>
        <p
          v-if="!results.length"
          class="p-4 m-0 text-[#596176] text-[1rem]"
        >
          Nessuna corrispondenza. Prova un altro nome, anno o luogo.
        </p>
      </div>
    </div>
  </div>
</template>
