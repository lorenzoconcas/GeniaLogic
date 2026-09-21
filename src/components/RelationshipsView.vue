<script setup lang="ts">
import AppButton from './AppButton.vue'
import { Plus, GitFork, Users, Heart, UserRoundPlus, Trash2, Link2 } from '@lucide/vue'
import type { FamilyTree, Relationship } from '../types'
import { parentTypeValues, coupleTypeValues } from '../editorOptions'
import { fullName, relationshipLabel, dateLabel } from '../services/personPresentation'
const props = defineProps<{ tree: FamilyTree }>()
const emit = defineEmits<{
  add: []
  addChild: [relationship: Relationship]
  remove: [relationshipId: string]
}>()
function findPerson(id: string) {
  return props.tree.people.find((person) => person.id === id)
}
</script>

<template>
  <section
    class="flex items-end justify-between gap-4 mb-4 max-[760px]:items-start max-[500px]:gap-2"
  >
    <div>
      <p
        class="m-0 text-[#6667df] text-[0.61rem] font-[850] tracking-[0.16em] uppercase last:mx-0 last:mt-[0.38rem] last:mb-0 last:text-muted last:text-[0.73rem] max-[760px]:last:hidden"
      >
        Connessioni
      </p>
      <h1
        class="mx-0 mt-[0.15rem] mb-0 font-display text-[clamp(1.75rem,_2.5vw,_2.25rem)] font-[850] tracking-[-0.055em] leading-[1.05] max-[760px]:text-[1.65rem]"
      >
        Legami
      </h1>
      <p
        class="last:mx-0 last:mt-[0.38rem] last:mb-0 last:text-muted last:text-[0.73rem] max-[760px]:last:hidden"
      >
        Genitorialità e relazioni di coppia, anche nel tempo.
      </p>
    </div>
    <AppButton
      tone="secondary"
      class="max-[500px]:px-[0.6rem] max-[500px]:py-2 max-[500px]:text-[0.66rem]"
      :disabled="tree.people.length < 2"
      @click="emit('add')"
    >
      <Plus :size="17" />
      Aggiungi legame
    </AppButton>
  </section>
  <section
    class="border border-line px-4 py-[0.45rem] min-h-[calc(100%_-_5.4rem)] overflow-hidden rounded-[0.8rem] bg-paper bg-none shadow-panel"
  >
    <article
      v-for="relationship in tree.relationships"
      :key="relationship.id"
      class="px-0 py-[0.72rem] grid grid-cols-[2.4rem_minmax(0,_1fr)_auto_auto_2rem] items-center gap-[0.8rem] border-b border-b-[#e9e5dd] last-of-type:border-b-0 last-of-type:border-b-transparent max-[760px]:grid-cols-[2.4rem_minmax(0,_1fr)_auto_2rem]"
    >
      <div
        class="grid place-items-center w-[2.3rem] h-[2.3rem] rounded-[0.7rem] data-[state~=parent]:bg-[#e6ede9] data-[state~=parent]:bg-none data-[state~=parent]:text-forest data-[state~=couple]:bg-[#f4ead9] data-[state~=couple]:bg-none data-[state~=couple]:text-[#8d672e] data-[state~=sibling]:bg-[#eeeeff] data-[state~=sibling]:bg-none data-[state~=sibling]:text-[#5657d9]"
        :data-state="
          parentTypeValues.has(relationship.type)
            ? 'parent'
            : relationship.type === 'sibling'
              ? 'sibling'
              : 'couple'
        "
      >
        <GitFork
          v-if="parentTypeValues.has(relationship.type)"
          :size="18"
        />
        <Users
          v-else-if="relationship.type === 'sibling'"
          :size="18"
        />
        <Heart
          v-else
          :size="18"
        />
      </div>
      <div class="flex items-center gap-[0.55rem] min-w-0 max-[760px]:flex-wrap">
        <strong class="overflow-hidden text-ellipsis whitespace-nowrap font-display text-[0.78rem]">
          {{ fullName(findPerson(relationship.sourceId)) }}
        </strong>
        <span
          class="px-2 py-[0.3rem] flex-none rounded-[999px] bg-[#f0eee8] bg-none text-muted text-[0.52rem] font-[750]"
        >
          {{ relationshipLabel(relationship.type) }}
        </span>
        <strong class="overflow-hidden text-ellipsis whitespace-nowrap font-display text-[0.78rem]">
          {{ fullName(findPerson(relationship.targetId)) }}
        </strong>
      </div>
      <div class="flex flex-col items-end text-muted text-[0.55rem] max-[760px]:hidden">
        <span v-if="relationship.startDate">dal {{ dateLabel(relationship.startDate) }}</span>
        <span v-if="relationship.endDate">al {{ dateLabel(relationship.endDate) }}</span>
      </div>
      <button
        v-if="coupleTypeValues.has(relationship.type)"
        class="border border-[#cacbf0] px-[0.68rem] py-[0.46rem] inline-flex items-center justify-center gap-[0.38rem] min-h-[2.15rem] rounded-[0.58rem] bg-[#f4f4ff] bg-none text-[#5051c5] text-[0.65rem] font-extrabold whitespace-nowrap cursor-pointer hover:border-[#9293e4] hover:bg-[#ececff] hover:bg-none max-[500px]:p-0 max-[500px]:w-[2.2rem]"
        type="button"
        :aria-label="`Aggiungi un discendente a ${fullName(findPerson(relationship.sourceId))} e ${fullName(findPerson(relationship.targetId))}`"
        @click="emit('addChild', relationship)"
      >
        <UserRoundPlus :size="16" />
        <span class="max-[500px]:hidden">Aggiungi figlio/a</span>
      </button>
      <button
        class="border border-transparent inline-grid place-items-center w-8 h-8 flex-none rounded-[0.6rem] bg-transparent bg-none text-muted cursor-pointer hover:border-line hover:bg-[#f8e9e4]! hover:bg-none! hover:text-terracotta!"
        :aria-label="`Rimuovi legame ${relationshipLabel(relationship.type)} tra ${fullName(findPerson(relationship.sourceId))} e ${fullName(findPerson(relationship.targetId))}`"
        title="Rimuovi legame"
        @click="emit('remove', relationship.id)"
      >
        <Trash2 :size="16" />
      </button>
    </article>
    <div
      v-if="!tree.relationships.length"
      class="p-8 border border-[#cfc9bd] flex min-h-80 flex-1 flex-col items-center justify-center [border-top-style:dashed] [border-right-style:dashed] [border-bottom-style:dashed] [border-left-style:dashed] rounded-[1.1rem] bg-[rgba(253,_252,_248,_0.6)] bg-none text-center text-muted"
    >
      <Link2 :size="28" />
      <h2 class="mx-0 my-[0.4rem] font-display text-[1.45rem]">Nessun legame</h2>
      <p class="mx-0 max-w-108 mt-0 mb-[1.2rem] text-muted text-[0.72rem] leading-[1.6]">
        Aggiungi almeno due persone, poi descrivi la loro relazione.
      </p>
    </div>
  </section>
</template>
