<script setup lang="ts">
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
  <section class="view-toolbar">
    <div>
      <p class="eyebrow">Indice</p>
      <h1>Persone</h1>
      <p>Tutte le persone custodite in questo archivio.</p>
    </div>
    <button
      class="button primary"
      @click="emit('add')"
    >
      <Plus :size="17" />
      Aggiungi persona
    </button>
  </section>
  <section class="content-panel">
    <div class="list-toolbar">
      <label class="search-box">
        <Search :size="17" />
        <input
          v-model="search"
          type="search"
          placeholder="Cerca nome, cognome o luogo…"
        />
      </label>
      <span>
        <ListFilter :size="15" />
        {{ filteredPeople.length }} risultati
      </span>
    </div>
    <div
      v-if="filteredPeople.length"
      class="people-grid"
    >
      <article
        v-for="person in filteredPeople"
        :key="person.id"
        class="person-tile"
        @click="emit('select', person.id)"
      >
        <div
          class="tile-avatar"
          :style="{ background: person.color }"
        >
          {{ initials(person) }}
        </div>
        <div class="min-w-0">
          <h2>{{ fullName(person) }}</h2>
          <p>
            {{ lifeLabel(person) }}
            <template v-if="person.birthPlace">· {{ person.birthPlace }}</template>
          </p>
          <span v-if="person.occupation">{{ person.occupation }}</span>
        </div>
        <button
          class="icon-button"
          aria-label="Modifica persona"
          @click.stop="emit('edit', person)"
        >
          <MoreHorizontal :size="17" />
        </button>
      </article>
    </div>
    <div
      v-else
      class="empty-small"
    >
      <Users :size="28" />
      <h2>Nessuna persona trovata</h2>
      <p>Prova a cambiare la ricerca oppure aggiungi una nuova persona.</p>
    </div>
  </section>
</template>
