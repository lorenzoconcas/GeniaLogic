<script setup lang="ts">
import AppButton from './AppButton.vue'
import { computed } from 'vue'
import { Plus, Search, ListFilter, MoreHorizontal, Users } from '@lucide/vue'
import type { Person } from '../types'
import { fullName, initials, lifeLabel } from '../services/personPresentation'
const props = defineProps<{ people: Person[] }>()
const search = defineModel<string>('search', { required: true })
const emit = defineEmits<{ add: []; edit: [person: Person]; select: [personId: string] }>()
const filteredPeople = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('it')
  if (!term) return props.people
  return props.people.filter((person) =>
    `${person.firstName} ${person.lastName} ${person.birthName ?? ''} ${person.birthPlace ?? ''}`
      .toLocaleLowerCase('it')
      .includes(term),
  )
})
</script>

<template>
  <section
    class="flex items-end justify-between gap-4 mb-4 max-[760px]:items-start max-[500px]:gap-2"
  >
    <div>
      <p
        class="m-0 text-[#6667df] text-[0.61rem] font-[850] tracking-[0.16em] uppercase last:mx-0 last:mt-[0.38rem] last:mb-0 last:text-muted last:text-[0.73rem] max-[760px]:last:hidden"
      >
        Indice
      </p>
      <h1
        class="mx-0 mt-[0.15rem] mb-0 font-display text-[clamp(1.75rem,_2.5vw,_2.25rem)] font-[850] tracking-[-0.055em] leading-[1.05] max-[760px]:text-[1.65rem]"
      >
        Persone
      </h1>
      <p
        class="last:mx-0 last:mt-[0.38rem] last:mb-0 last:text-muted last:text-[0.73rem] max-[760px]:last:hidden"
      >
        Tutte le persone custodite in questo archivio.
      </p>
    </div>
    <AppButton
      tone="primary"
      class="max-[500px]:px-[0.6rem] max-[500px]:py-2 max-[500px]:text-[0.66rem]"
      @click="emit('add')"
    >
      <Plus :size="17" />
      Aggiungi persona
    </AppButton>
  </section>
  <section
    class="border border-line min-h-[calc(100%_-_5.4rem)] overflow-hidden rounded-[0.8rem] bg-paper bg-none shadow-panel"
  >
    <div class="px-4 py-[0.8rem] flex items-center justify-between gap-4 border-b border-b-line">
      <label
        class="border border-line px-[0.7rem] py-[0.55rem] flex items-center gap-[0.55rem] w-[min(25rem,_70%)] rounded-[0.7rem] bg-[#f9f8f4] bg-none text-muted max-[500px]:w-full"
      >
        <Search :size="17" />
        <input
          class="border-0 border-transparent min-w-0 flex-1 outline-none bg-transparent bg-none text-ink text-[0.72rem]"
          v-model="search"
          type="search"
          placeholder="Cerca nome, cognome o luogo…"
        />
      </label>
      <span
        class="flex items-center gap-[0.35rem] text-muted text-[0.65rem] font-bold max-[500px]:hidden"
      >
        <ListFilter :size="15" />
        {{ filteredPeople.length }} risultati
      </span>
    </div>
    <div
      v-if="filteredPeople.length"
      class="p-4 grid grid-cols-[repeat(auto-fill,_minmax(16rem,_1fr))] gap-[0.65rem] max-[760px]:grid-cols-[1fr]"
    >
      <article
        v-for="person in filteredPeople"
        :key="person.id"
        class="p-3 border border-line grid grid-cols-[2.8rem_1fr_auto] items-center gap-[0.7rem] rounded-[0.6rem] bg-white bg-none cursor-pointer [transition:transform_0.16s,_border-color_0.16s,_box-shadow_0.16s] hover:border-[#b7c5bf] hover:[transform:translateY(-2px)] hover:shadow-[0_8px_20px_rgba(48,_45,_38,_0.08)]"
        @click="emit('select', person.id)"
      >
        <div
          class="grid place-items-center w-[2.8rem] h-[2.8rem] rounded-xl text-white text-[0.7rem] font-[850]"
          :style="{ background: person.color }"
        >
          {{ initials(person) }}
        </div>
        <div class="min-w-0">
          <h2
            class="m-0 overflow-hidden text-ellipsis whitespace-nowrap font-display text-[0.9rem]"
          >
            {{ fullName(person) }}
          </h2>
          <p class="mx-0 mt-[0.15rem] mb-0 text-muted text-[0.58rem]">
            {{ lifeLabel(person) }}
            <template v-if="person.birthPlace">· {{ person.birthPlace }}</template>
          </p>
          <span
            class="block mt-[0.3rem] text-[#8b6844] text-[0.55rem] font-bold"
            v-if="person.occupation"
          >
            {{ person.occupation }}
          </span>
        </div>
        <button
          class="border border-transparent inline-grid place-items-center w-8 h-8 flex-none rounded-[0.6rem] bg-transparent bg-none text-muted cursor-pointer hover:border-line hover:bg-soft hover:bg-none hover:text-ink"
          aria-label="Modifica persona"
          @click.stop="emit('edit', person)"
        >
          <MoreHorizontal :size="17" />
        </button>
      </article>
    </div>
    <div
      v-else
      class="p-8 border border-[#cfc9bd] flex min-h-80 flex-1 flex-col items-center justify-center [border-top-style:dashed] [border-right-style:dashed] [border-bottom-style:dashed] [border-left-style:dashed] rounded-[1.1rem] bg-[rgba(253,_252,_248,_0.6)] bg-none text-center text-muted"
    >
      <Users :size="28" />
      <h2 class="mx-0 my-[0.4rem] font-display text-[1.45rem]">Nessuna persona trovata</h2>
      <p class="mx-0 max-w-108 mt-0 mb-[1.2rem] text-muted text-[0.72rem] leading-[1.6]">
        Prova a cambiare la ricerca oppure aggiungi una nuova persona.
      </p>
    </div>
  </section>
</template>
