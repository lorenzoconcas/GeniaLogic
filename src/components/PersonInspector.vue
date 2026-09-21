<script setup lang="ts">
import { computed } from 'vue'
import {
  X,
  Edit3,
  Link2,
  Trash2,
  UserRoundPlus,
  ChevronRight,
  CalendarDays,
  MapPin,
} from '@lucide/vue'
import type { FamilyTree, Person, Relationship } from '../types'
import { coupleTypeValues } from '../editorOptions'
import {
  fullName,
  initials,
  lifeLabel,
  dateLabel,
  relationshipLabel,
} from '../services/personPresentation'
const props = defineProps<{ person: Person; tree: FamilyTree }>()
const emit = defineEmits<{
  close: []
  edit: [person: Person]
  connect: [personId: string]
  remove: [person: Person]
  addRelative: []
  addChild: [relationship: Relationship]
  removeRelationship: [relationshipId: string]
  select: [personId: string]
}>()
const personRelationships = computed(() =>
  props.tree.relationships.filter(
    (relationship) =>
      relationship.sourceId === props.person.id || relationship.targetId === props.person.id,
  ),
)
function findPerson(id: string) {
  return props.tree.people.find((person) => person.id === id)
}
</script>

<template>
  <aside
    class="p-4 border border-line w-68 [flex:0_0_17rem] overflow-y-auto rounded-[0.8rem] bg-paper bg-none shadow-panel max-[1050px]:w-60 max-[1050px]:basis-60 max-[760px]:w-full max-[760px]:mt-3 max-[760px]:max-h-[none]"
  >
    <div class="flex items-center justify-between">
      <p class="m-0 text-[#6667df] text-[0.61rem] font-[850] tracking-[0.16em] uppercase">
        Scheda persona
      </p>
      <button
        class="border border-transparent inline-grid place-items-center w-8 h-8 flex-none rounded-[0.6rem] bg-transparent bg-none text-muted cursor-pointer hover:border-line hover:bg-soft hover:bg-none hover:text-ink"
        aria-label="Chiudi scheda"
        @click="emit('close')"
      >
        <X :size="17" />
      </button>
    </div>
    <div class="flex items-center gap-3 mt-[0.85rem]">
      <div
        class="grid place-items-center w-[3.1rem] h-[3.1rem] flex-none rounded-[0.9rem] text-white text-[0.78rem] font-[850] tracking-[0.05em]"
        :style="{ background: person.color }"
      >
        {{ initials(person) }}
      </div>
      <div>
        <h2 class="m-0 font-display text-[1.08rem] font-[850] tracking-[-0.035em] leading-[1.1]">
          {{ fullName(person) }}
        </h2>
        <p class="mx-0 mt-1 mb-0 text-muted text-[0.65rem]">{{ lifeLabel(person) }}</p>
      </div>
    </div>
    <div class="flex gap-[0.35rem] mt-[0.9rem]">
      <button
        class="border border-line inline-flex items-center justify-center gap-[0.3rem] min-h-8 flex-1 rounded-[0.55rem] bg-transparent bg-none text-[#5d615a] text-[0.64rem] font-[750] cursor-pointer hover:bg-soft hover:bg-none last:[flex:0_0_2rem]"
        @click="emit('edit', person)"
      >
        <Edit3 :size="15" />
        Modifica
      </button>
      <button
        class="border border-line inline-flex items-center justify-center gap-[0.3rem] min-h-8 flex-1 rounded-[0.55rem] bg-transparent bg-none text-[#5d615a] text-[0.64rem] font-[750] cursor-pointer hover:bg-soft hover:bg-none last:[flex:0_0_2rem]"
        @click="emit('connect', person.id)"
      >
        <Link2 :size="15" />
        Collega
      </button>
      <button
        class="hover:bg-[#f8e9e4]! hover:bg-none! hover:text-terracotta! border border-line inline-flex items-center justify-center gap-[0.3rem] min-h-8 flex-1 rounded-[0.55rem] bg-transparent bg-none text-[#5d615a] text-[0.64rem] font-[750] cursor-pointer last:[flex:0_0_2rem]"
        title="Elimina persona"
        aria-label="Elimina persona"
        @click="emit('remove', person)"
      >
        <Trash2 :size="15" />
      </button>
    </div>
    <button
      class="border border-[#cacbf0] px-[0.7rem] py-[0.68rem] grid grid-cols-[1.5rem_1fr_auto] items-center gap-[0.55rem] w-full mt-[0.55rem] rounded-[0.6rem] bg-[#f4f4ff] bg-none text-[#4f50c5] text-left cursor-pointer hover:border-[#8d8ee7] hover:bg-[#ececff] hover:bg-none"
      @click="emit('addRelative')"
    >
      <UserRoundPlus :size="17" />
      <span class="text-[0.75rem] font-extrabold">
        <small class="block mb-[0.12rem] text-[#7c82a0] text-[0.58rem] font-bold">
          Nuova persona collegata
        </small>
        Aggiungi parente
      </span>
      <ChevronRight :size="16" />
    </button>
    <dl
      class="px-0 py-[0.9rem] mx-0 grid gap-[0.55rem] mt-4 mb-0 border-t border-t-line border-b border-b-line"
    >
      <div
        class="flex justify-between gap-[0.6rem]"
        v-if="person.birthDate"
      >
        <dt class="flex items-center gap-[0.3rem] text-muted text-[0.61rem]">
          <CalendarDays :size="14" />
          Nascita
        </dt>
        <dd class="m-0 text-[0.63rem] font-[750] text-right">{{ dateLabel(person.birthDate) }}</dd>
      </div>
      <div
        class="flex justify-between gap-[0.6rem]"
        v-if="person.birthPlace"
      >
        <dt class="flex items-center gap-[0.3rem] text-muted text-[0.61rem]">
          <MapPin :size="14" />
          Luogo
        </dt>
        <dd class="m-0 text-[0.63rem] font-[750] text-right">{{ person.birthPlace }}</dd>
      </div>
      <div
        class="flex justify-between gap-[0.6rem]"
        v-if="person.occupation"
      >
        <dt class="flex items-center gap-[0.3rem] text-muted text-[0.61rem]">Professione</dt>
        <dd class="m-0 text-[0.63rem] font-[750] text-right">{{ person.occupation }}</dd>
      </div>
      <div
        class="flex justify-between gap-[0.6rem]"
        v-if="person.birthName"
      >
        <dt class="flex items-center gap-[0.3rem] text-muted text-[0.61rem]">
          Cognome alla nascita
        </dt>
        <dd class="m-0 text-[0.63rem] font-[750] text-right">{{ person.birthName }}</dd>
      </div>
    </dl>
    <div
      v-if="person.notes"
      class="p-3 mt-[0.9rem] border-l-[3px] border-l-[#7778ea] rounded-[0.35rem] bg-[#f3f3ff] bg-none"
    >
      <p
        class="m-0 text-[#6667df] text-[0.61rem] font-[850] tracking-[0.16em] uppercase last:mx-0 last:mt-[0.35rem] last:mb-0 last:text-[#50556a] last:font-sans last:text-[0.68rem] last:leading-[1.55]"
      >
        Memoria
      </p>
      <p
        class="last:mx-0 last:mt-[0.35rem] last:mb-0 last:text-[#50556a] last:font-sans last:text-[0.68rem] last:leading-[1.55]"
      >
        “{{ person.notes }}”
      </p>
    </div>
    <div class="mt-4">
      <p class="m-0 text-muted text-[0.67rem] font-extrabold tracking-[0.12em] uppercase">Legami</p>
      <div
        v-for="rel in personRelationships"
        :key="rel.id"
        class="grid grid-cols-[minmax(0,_1fr)_auto_2rem] items-center border-b border-b-[#e7e9f0]"
      >
        <button
          class="group/person-link-main border-0 border-transparent px-0 py-[0.65rem] grid grid-cols-[1fr_auto_0.8rem] items-center gap-[0.4rem] min-w-0 bg-transparent bg-none text-left cursor-pointer"
          @click="
            () => {
              emit('select', rel.sourceId === person.id ? rel.targetId : rel.sourceId)
            }
          "
        >
          <span class="col-span-full text-[#6667cf] text-[0.56rem] font-extrabold uppercase">
            {{ relationshipLabel(rel.type) }}
          </span>
          <strong
            class="group-hover/person-link-main:text-[#5657d9] overflow-hidden text-ellipsis whitespace-nowrap font-display text-[0.72rem]"
          >
            {{ fullName(findPerson(rel.sourceId === person.id ? rel.targetId : rel.sourceId)) }}
          </strong>
          <ChevronRight :size="13" />
        </button>
        <button
          v-if="coupleTypeValues.has(rel.type)"
          class="border-0 border-transparent grid place-items-center w-[1.85rem] h-[1.85rem] rounded-[0.45rem] bg-transparent bg-none text-[#6667cf] cursor-pointer hover:bg-[#eeeeff] hover:bg-none hover:text-[#4f50c5]"
          :aria-label="`Aggiungi un discendente con ${fullName(findPerson(rel.sourceId === person.id ? rel.targetId : rel.sourceId))}`"
          title="Aggiungi figlio/a"
          @click="emit('addChild', rel)"
        >
          <UserRoundPlus :size="14" />
        </button>
        <button
          class="border-0 border-transparent grid place-items-center w-[1.85rem] h-[1.85rem] rounded-[0.45rem] bg-transparent bg-none text-[#9a9fb0] cursor-pointer hover:bg-[#fff0f2] hover:bg-none hover:text-[#d84e68]"
          :aria-label="`Rimuovi legame con ${fullName(findPerson(rel.sourceId === person.id ? rel.targetId : rel.sourceId))}`"
          title="Rimuovi legame"
          @click="emit('removeRelationship', rel.id)"
        >
          <Trash2 :size="14" />
        </button>
      </div>
      <p
        v-if="!personRelationships.length"
        class="mx-0 mt-[0.55rem] mb-0 text-muted text-[0.65rem]"
      >
        Nessun legame ancora.
      </p>
    </div>
  </aside>
</template>
