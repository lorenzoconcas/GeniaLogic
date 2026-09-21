<script setup lang="ts">
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
  <section class="view-toolbar">
    <div>
      <p class="eyebrow">Connessioni</p>
      <h1>Legami</h1>
      <p>Genitorialità e relazioni di coppia, anche nel tempo.</p>
    </div>
    <button
      class="button secondary"
      :disabled="tree.people.length < 2"
      @click="emit('add')"
    >
      <Plus :size="17" />
      Aggiungi legame
    </button>
  </section>
  <section class="content-panel relationship-list">
    <article
      v-for="relationship in tree.relationships"
      :key="relationship.id"
      class="relationship-row"
    >
      <div
        class="relation-icon"
        :class="
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
      <div class="relation-people">
        <strong>{{ fullName(findPerson(relationship.sourceId)) }}</strong>
        <span>{{ relationshipLabel(relationship.type) }}</span>
        <strong>{{ fullName(findPerson(relationship.targetId)) }}</strong>
      </div>
      <div class="relation-dates">
        <span v-if="relationship.startDate">dal {{ dateLabel(relationship.startDate) }}</span>
        <span v-if="relationship.endDate">al {{ dateLabel(relationship.endDate) }}</span>
      </div>
      <button
        v-if="coupleTypeValues.has(relationship.type)"
        class="add-child-button"
        type="button"
        :aria-label="`Aggiungi un discendente a ${fullName(findPerson(relationship.sourceId))} e ${fullName(findPerson(relationship.targetId))}`"
        @click="emit('addChild', relationship)"
      >
        <UserRoundPlus :size="16" />
        <span>Aggiungi figlio/a</span>
      </button>
      <button
        class="icon-button danger-icon"
        :aria-label="`Rimuovi legame ${relationshipLabel(relationship.type)} tra ${fullName(findPerson(relationship.sourceId))} e ${fullName(findPerson(relationship.targetId))}`"
        title="Rimuovi legame"
        @click="emit('remove', relationship.id)"
      >
        <Trash2 :size="16" />
      </button>
    </article>
    <div
      v-if="!tree.relationships.length"
      class="empty-small"
    >
      <Link2 :size="28" />
      <h2>Nessun legame</h2>
      <p>Aggiungi almeno due persone, poi descrivi la loro relazione.</p>
    </div>
  </section>
</template>
