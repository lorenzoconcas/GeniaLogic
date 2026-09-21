<script setup lang="ts">
import { toRefs } from 'vue'
import type { FamilyTree } from '../types'
import { parentTypeValues } from '../editorOptions'
import type { TreeEditor } from '../composables/useTreeEditor'
import ModalShell from './ModalShell.vue'
import PersonPicker from './PersonPicker.vue'
import PersonSelectionCard from './PersonSelectionCard.vue'
import { Check, ArrowLeftRight, Info, Link2 } from '@lucide/vue'
import { fullName } from '../services/personPresentation'

const props = defineProps<{ editor: TreeEditor; tree: FamilyTree }>()
const { tree } = toRefs(props)
const {
  modal,
  relationshipForm,
  relationshipError,
  relationshipPickerTarget,
  relationshipSourcePerson,
  relationshipTargetPerson,
  relationshipPickerPeople,
  relationshipGroups,
  selectRelationshipPerson,
  swapRelationshipPeople,
  submitRelationship,
} = props.editor
function findPerson(id: string) {
  return tree.value.people.find((person) => person.id === id)
}
</script>

<template>
  <ModalShell
    v-if="modal === 'relationship'"
    title="Aggiungi un legame"
    subtitle="Scegli le due persone e descrivi il loro legame. L’ordine conta per la genitorialità."
    fullscreen
    :inactive="!!relationshipPickerTarget"
    @close="modal = null"
  >
    <form
      class="relationship-form relationship-fullscreen-form"
      @submit.prevent="submitRelationship"
    >
      <div class="relationship-content-grid">
        <section class="relationship-details">
          <div class="relationship-pair-compact">
            <PersonSelectionCard
              label="Prima persona"
              :person="relationshipSourcePerson"
              @choose="relationshipPickerTarget = 'source'"
            />
            <button
              type="button"
              class="icon-button relationship-swap"
              :disabled="!relationshipForm.sourceId || !relationshipForm.targetId"
              aria-label="Inverti prima e seconda persona"
              title="Inverti persone"
              @click="swapRelationshipPeople"
            >
              <ArrowLeftRight :size="19" />
            </button>
            <PersonSelectionCard
              label="Seconda persona"
              :person="relationshipTargetPerson"
              @choose="relationshipPickerTarget = 'target'"
            />
          </div>
          <p
            v-if="
              parentTypeValues.has(relationshipForm.type) &&
              relationshipForm.sourceId &&
              relationshipForm.targetId
            "
            class="relationship-direction"
            aria-live="polite"
          >
            <span>
              {{ relationshipForm.type === 'guardian' ? 'Tutore' : 'Genitore' }}:
              <strong>{{ fullName(findPerson(relationshipForm.sourceId)) }}</strong>
            </span>
            <ChevronRight :size="18" />
            <span>
              {{ relationshipForm.type === 'guardian' ? 'Persona tutelata' : 'Figlio/a' }}:
              <strong>{{ fullName(findPerson(relationshipForm.targetId)) }}</strong>
            </span>
          </p>
          <div class="form-grid compact">
            <label class="field">
              <span>Data di inizio</span>
              <input
                v-model="relationshipForm.startDate"
                type="date"
              />
            </label>
            <label class="field">
              <span>Data di fine</span>
              <input
                v-model="relationshipForm.endDate"
                type="date"
              />
            </label>
            <label class="field full">
              <span>Nota sul legame</span>
              <textarea
                v-model="relationshipForm.notes"
                rows="5"
                maxlength="300"
                placeholder="Facoltativa"
              />
            </label>
          </div>
        </section>
        <aside class="relationship-settings">
          <fieldset class="relationship-types">
            <legend>Tipo di legame</legend>
            <div
              v-for="group in relationshipGroups"
              :key="group.name"
            >
              <p>{{ group.name }}</p>
              <label
                v-for="option in group.options"
                :key="option.value"
                :class="{ active: relationshipForm.type === option.value }"
              >
                <input
                  v-model="relationshipForm.type"
                  type="radio"
                  :value="option.value"
                />
                <span>
                  <strong>{{ option.label }}</strong>
                  <small>{{ option.description }}</small>
                </span>
                <Check
                  v-if="relationshipForm.type === option.value"
                  :size="17"
                />
              </label>
            </div>
          </fieldset>
        </aside>
      </div>
      <footer class="relationship-footer">
        <p
          v-if="relationshipError"
          class="form-error"
        >
          <Info :size="16" />
          {{ relationshipError }}
        </p>
        <div class="form-actions">
          <button
            type="button"
            class="button subtle"
            @click="modal = null"
          >
            Annulla
          </button>
          <button
            class="button primary"
            type="submit"
          >
            <Link2 :size="16" />
            Aggiungi legame
          </button>
        </div>
      </footer>
    </form>
  </ModalShell>

  <ModalShell
    v-if="modal === 'relationship' && relationshipPickerTarget"
    :title="
      relationshipPickerTarget === 'source'
        ? 'Scegli la prima persona'
        : 'Scegli la seconda persona'
    "
    subtitle="Cerca per nome, cognome, anno, luogo o riferimento."
    wide
    @close="relationshipPickerTarget = null"
  >
    <PersonPicker
      :model-value="
        relationshipPickerTarget === 'source'
          ? relationshipForm.sourceId
          : relationshipForm.targetId
      "
      :people="relationshipPickerPeople"
      :label="relationshipPickerTarget === 'source' ? 'Prima persona' : 'Seconda persona'"
      autofocus-search
      @update:model-value="selectRelationshipPerson"
    />
  </ModalShell>
</template>
