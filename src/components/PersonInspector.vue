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
  <aside class="inspector">
    <div class="inspector-top">
      <p class="eyebrow">Scheda persona</p>
      <button
        class="icon-button"
        aria-label="Chiudi scheda"
        @click="emit('close')"
      >
        <X :size="17" />
      </button>
    </div>
    <div class="profile-head">
      <div
        class="profile-avatar"
        :style="{ background: person.color }"
      >
        {{ initials(person) }}
      </div>
      <div>
        <h2>{{ fullName(person) }}</h2>
        <p>{{ lifeLabel(person) }}</p>
      </div>
    </div>
    <div class="profile-actions">
      <button @click="emit('edit', person)">
        <Edit3 :size="15" />
        Modifica
      </button>
      <button @click="emit('connect', person.id)">
        <Link2 :size="15" />
        Collega
      </button>
      <button
        class="danger-icon"
        title="Elimina persona"
        aria-label="Elimina persona"
        @click="emit('remove', person)"
      >
        <Trash2 :size="15" />
      </button>
    </div>
    <button
      class="quick-relative-button"
      @click="emit('addRelative')"
    >
      <UserRoundPlus :size="17" />
      <span>
        <small>Nuova persona collegata</small>
        Aggiungi parente
      </span>
      <ChevronRight :size="16" />
    </button>
    <dl class="facts">
      <div v-if="person.birthDate">
        <dt>
          <CalendarDays :size="14" />
          Nascita
        </dt>
        <dd>{{ dateLabel(person.birthDate) }}</dd>
      </div>
      <div v-if="person.birthPlace">
        <dt>
          <MapPin :size="14" />
          Luogo
        </dt>
        <dd>{{ person.birthPlace }}</dd>
      </div>
      <div v-if="person.occupation">
        <dt>Professione</dt>
        <dd>{{ person.occupation }}</dd>
      </div>
      <div v-if="person.birthName">
        <dt>Cognome alla nascita</dt>
        <dd>{{ person.birthName }}</dd>
      </div>
    </dl>
    <div
      v-if="person.notes"
      class="story"
    >
      <p class="eyebrow">Memoria</p>
      <p>“{{ person.notes }}”</p>
    </div>
    <div class="person-links">
      <p class="section-label">Legami</p>
      <div
        v-for="rel in personRelationships"
        :key="rel.id"
        class="person-link-row"
      >
        <button
          class="person-link-main"
          @click="
            () => {
              emit('select', rel.sourceId === person.id ? rel.targetId : rel.sourceId)
            }
          "
        >
          <span>{{ relationshipLabel(rel.type) }}</span>
          <strong>
            {{ fullName(findPerson(rel.sourceId === person.id ? rel.targetId : rel.sourceId)) }}
          </strong>
          <ChevronRight :size="13" />
        </button>
        <button
          v-if="coupleTypeValues.has(rel.type)"
          class="person-link-add-child"
          :aria-label="`Aggiungi un discendente con ${fullName(findPerson(rel.sourceId === person.id ? rel.targetId : rel.sourceId))}`"
          title="Aggiungi figlio/a"
          @click="emit('addChild', rel)"
        >
          <UserRoundPlus :size="14" />
        </button>
        <button
          class="person-link-delete"
          :aria-label="`Rimuovi legame con ${fullName(findPerson(rel.sourceId === person.id ? rel.targetId : rel.sourceId))}`"
          title="Rimuovi legame"
          @click="emit('removeRelationship', rel.id)"
        >
          <Trash2 :size="14" />
        </button>
      </div>
      <p
        v-if="!personRelationships.length"
        class="muted-empty"
      >
        Nessun legame ancora.
      </p>
    </div>
  </aside>
</template>
