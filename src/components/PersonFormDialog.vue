<script setup lang="ts">
import type { TreeEditor } from '../composables/useTreeEditor'
import ModalShell from './ModalShell.vue'
import { Check } from '@lucide/vue'
import { personColors } from '../data'

const props = defineProps<{ editor: TreeEditor }>()
const { modal, editingPersonId, personForm, submitPerson } = props.editor
</script>

<template>
  <ModalShell
    v-if="modal === 'person'"
    :title="editingPersonId ? 'Modifica persona' : 'Aggiungi una persona'"
    subtitle="Inserisci ciò che conosci: potrai completare la scheda in seguito."
    wide
    @close="modal = null"
  >
    <form
      class="form-grid"
      @submit.prevent="submitPerson"
    >
      <label class="field">
        <span>Nome *</span>
        <input
          v-model="personForm.firstName"
          required
          autofocus
          maxlength="60"
          placeholder="es. Elena"
        />
      </label>
      <label class="field">
        <span>Cognome *</span>
        <input
          v-model="personForm.lastName"
          required
          maxlength="60"
          placeholder="es. Moretti"
        />
      </label>
      <label class="field">
        <span>Cognome alla nascita</span>
        <input
          v-model="personForm.birthName"
          maxlength="60"
          placeholder="Se diverso"
        />
      </label>
      <label class="field">
        <span>Soprannome</span>
        <input
          v-model="personForm.nickname"
          maxlength="60"
        />
      </label>
      <label class="field">
        <span>Genere</span>
        <select v-model="personForm.gender">
          <option value="unspecified">Non specificato</option>
          <option value="female">Donna</option>
          <option value="male">Uomo</option>
          <option value="nonbinary">Non binario</option>
        </select>
      </label>
      <label class="field">
        <span>Luogo di nascita</span>
        <input
          v-model="personForm.birthPlace"
          maxlength="100"
          placeholder="Città o località"
        />
      </label>
      <label class="field">
        <span>Data di nascita</span>
        <input
          v-model="personForm.birthDate"
          type="date"
        />
      </label>
      <label class="field">
        <span>Data di morte</span>
        <input
          v-model="personForm.deathDate"
          type="date"
          :min="personForm.birthDate"
        />
      </label>
      <label class="field full">
        <span>Professione o ruolo</span>
        <input
          v-model="personForm.occupation"
          maxlength="100"
        />
      </label>
      <label class="field full">
        <span>Ricordo o nota biografica</span>
        <textarea
          v-model="personForm.notes"
          rows="3"
          maxlength="700"
          placeholder="Una storia, un dettaglio, qualcosa da ricordare…"
        />
      </label>
      <fieldset class="color-field full">
        <legend>Colore della scheda</legend>
        <button
          v-for="color in personColors"
          :key="color"
          type="button"
          :style="{ background: color }"
          :class="{ active: personForm.color === color }"
          :aria-label="`Scegli colore ${color}`"
          @click="personForm.color = color"
        >
          <Check
            v-if="personForm.color === color"
            :size="15"
          />
        </button>
      </fieldset>
      <div class="form-actions full">
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
          <Check :size="16" />
          {{ editingPersonId ? 'Salva modifiche' : 'Aggiungi persona' }}
        </button>
      </div>
    </form>
  </ModalShell>
</template>
