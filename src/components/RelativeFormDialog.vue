<script setup lang="ts">
import { toRefs } from 'vue'
import type { Person } from '../types'
import type { TreeEditor } from '../composables/useTreeEditor'
import ModalShell from './ModalShell.vue'
import { Check, UserRoundPlus, Users } from '@lucide/vue'
import { personColors } from '../data'
import { relativeChoices } from '../editorOptions'
import { fullName } from '../services/personPresentation'

const props = defineProps<{ editor: TreeEditor; selectedPerson: Person | null }>()
const { selectedPerson } = toRefs(props)
const {
  modal,
  relativeForm,
  relativeKind,
  selectedRelativeChoice,
  automaticChildSpouse,
  chooseRelative,
  submitRelative,
} = props.editor
</script>

<template>
  <ModalShell
    v-if="modal === 'relative' && selectedPerson"
    :title="`Aggiungi un parente a ${selectedPerson.firstName}`"
    subtitle="Crea la persona e il legame in un solo passaggio."
    wide
    @close="modal = null"
  >
    <form
      class="relative-form"
      @submit.prevent="submitRelative"
    >
      <fieldset class="relative-types">
        <legend>Chi vuoi aggiungere?</legend>
        <button
          v-for="choice in relativeChoices"
          :key="choice.value"
          type="button"
          :class="{ active: relativeKind === choice.value }"
          @click="chooseRelative(choice.value)"
        >
          <span>{{ choice.label }}</span>
          <small>{{ choice.description }}</small>
          <Check
            v-if="relativeKind === choice.value"
            :size="16"
          />
        </button>
      </fieldset>
      <div class="relative-summary">
        <UserRoundPlus :size="18" />
        <span>
          Stai aggiungendo
          <strong>{{ selectedRelativeChoice.label.toLowerCase() }}</strong>
          a
          <strong>{{ fullName(selectedPerson) }}</strong>
          .
        </span>
      </div>
      <div
        v-if="automaticChildSpouse"
        class="relative-summary"
        role="status"
      >
        <Users :size="18" />
        <span>
          Il coniuge
          <strong>{{ fullName(automaticChildSpouse) }}</strong>
          verrà collegato automaticamente come secondo genitore biologico.
        </span>
      </div>
      <div class="form-grid">
        <label class="field">
          <span>Nome *</span>
          <input
            v-model="relativeForm.firstName"
            required
            autofocus
            maxlength="60"
            placeholder="Nome"
          />
        </label>
        <label class="field">
          <span>Cognome *</span>
          <input
            v-model="relativeForm.lastName"
            required
            maxlength="60"
            placeholder="Cognome"
          />
          <small
            v-if="selectedRelativeChoice.copySurname"
            class="field-hint"
          >
            Proposto da {{ selectedPerson.lastName }}: puoi cambiarlo.
          </small>
        </label>
        <label
          v-if="relativeKind === 'spouse' || relativeKind === 'partner'"
          class="field full"
        >
          <span>Genere</span>
          <select v-model="relativeForm.gender">
            <option value="unspecified">Non specificato</option>
            <option value="female">Donna</option>
            <option value="male">Uomo</option>
            <option value="nonbinary">Non binario</option>
          </select>
        </label>
        <label class="field">
          <span>Data di nascita</span>
          <input
            v-model="relativeForm.birthDate"
            type="date"
          />
        </label>
        <label class="field">
          <span>Data di decesso</span>
          <input
            v-model="relativeForm.deathDate"
            type="date"
          />
        </label>
        <label class="field full">
          <span>Luogo di nascita</span>
          <input
            v-model="relativeForm.birthPlace"
            maxlength="100"
            placeholder="Città o località"
          />
        </label>
        <fieldset class="color-field full">
          <legend>Colore della scheda</legend>
          <button
            v-for="color in personColors"
            :key="color"
            type="button"
            :style="{ background: color }"
            :class="{ active: relativeForm.color === color }"
            :aria-label="`Scegli colore ${color}`"
            @click="relativeForm.color = color"
          >
            <Check
              v-if="relativeForm.color === color"
              :size="15"
            />
          </button>
        </fieldset>
      </div>
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
          <UserRoundPlus :size="17" />
          Aggiungi {{ selectedRelativeChoice.label.toLowerCase() }}
        </button>
      </div>
    </form>
  </ModalShell>
</template>
