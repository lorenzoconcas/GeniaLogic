<script setup lang="ts">
import FormField from './FormField.vue'
import AppButton from './AppButton.vue'
import type { TreeEditor } from '../composables/useTreeEditor'
import ModalShell from './ModalShell.vue'
import { Check } from '@lucide/vue'
import { personColors } from '../data'

const props = defineProps<{ editor: TreeEditor }>()
const { modal, editingPersonId, personForm, submitPerson } = props.editor
</script>

<template>
  <ModalShell
    class="text-[0.95rem]"
    v-if="modal === 'person'"
    :title="editingPersonId ? 'Modifica persona' : 'Aggiungi una persona'"
    subtitle="Inserisci ciò che conosci: potrai completare la scheda in seguito."
    wide
    @close="modal = null"
  >
    <form
      class="grid grid-cols-[1fr_1fr] gap-3 max-[500px]:grid-cols-[1fr]"
      @submit.prevent="submitPerson"
    >
      <FormField>
        <span>Nome *</span>
        <input
          class="leading-[1.4]"
          v-model="personForm.firstName"
          required
          autofocus
          maxlength="60"
          placeholder="es. Elena"
        />
      </FormField>
      <FormField>
        <span>Cognome *</span>
        <input
          class="leading-[1.4]"
          v-model="personForm.lastName"
          required
          maxlength="60"
          placeholder="es. Moretti"
        />
      </FormField>
      <FormField>
        <span>Cognome alla nascita</span>
        <input
          class="leading-[1.4]"
          v-model="personForm.birthName"
          maxlength="60"
          placeholder="Se diverso"
        />
      </FormField>
      <FormField>
        <span>Soprannome</span>
        <input
          class="leading-[1.4]"
          v-model="personForm.nickname"
          maxlength="60"
        />
      </FormField>
      <FormField>
        <span>Genere</span>
        <select
          class="leading-[1.4]"
          v-model="personForm.gender"
        >
          <option value="unspecified">Non specificato</option>
          <option value="female">Donna</option>
          <option value="male">Uomo</option>
          <option value="nonbinary">Non binario</option>
        </select>
      </FormField>
      <FormField>
        <span>Luogo di nascita</span>
        <input
          class="leading-[1.4]"
          v-model="personForm.birthPlace"
          maxlength="100"
          placeholder="Città o località"
        />
      </FormField>
      <FormField>
        <span>Data di nascita</span>
        <input
          class="leading-[1.4]"
          v-model="personForm.birthDate"
          type="date"
        />
      </FormField>
      <FormField>
        <span>Data di morte</span>
        <input
          class="leading-[1.4]"
          v-model="personForm.deathDate"
          type="date"
          :min="personForm.birthDate"
        />
      </FormField>
      <FormField class="col-span-full max-[500px]:col-auto">
        <span>Professione o ruolo</span>
        <input
          class="leading-[1.4]"
          v-model="personForm.occupation"
          maxlength="100"
        />
      </FormField>
      <FormField class="col-span-full max-[500px]:col-auto">
        <span>Ricordo o nota biografica</span>
        <textarea
          class="leading-[1.5] resize-y"
          v-model="personForm.notes"
          rows="3"
          maxlength="700"
          placeholder="Una storia, un dettaglio, qualcosa da ricordare…"
        />
      </FormField>
      <fieldset
        class="p-0 m-0 border-0 border-transparent col-span-full flex flex-wrap gap-2 max-[500px]:col-auto"
      >
        <legend class="text-[#4f5569] text-[0.9rem] font-[750] w-full mb-[0.45rem]">
          Colore della scheda
        </legend>
        <button
          class="border-[2px] border-paper grid place-items-center w-[1.85rem] h-[1.85rem] rounded-full text-white shadow-[0_0_0_1px_var(--color-line)] cursor-pointer data-active:shadow-[0_0_0_2px_var(--color-paper),_0_0_0_4px_var(--color-forest)]"
          v-for="color in personColors"
          :key="color"
          type="button"
          :style="{ background: color }"
          :data-active="personForm.color === color || undefined"
          :aria-label="`Scegli colore ${color}`"
          @click="personForm.color = color"
        >
          <Check
            v-if="personForm.color === color"
            :size="15"
          />
        </button>
      </fieldset>
      <div class="col-span-full flex justify-end gap-2 mt-[1.1rem] max-[500px]:col-auto">
        <AppButton
          size="dialog"
          tone="subtle"
          type="button"
          @click="modal = null"
        >
          Annulla
        </AppButton>
        <AppButton
          size="dialog"
          tone="primary"
          type="submit"
        >
          <Check :size="16" />
          {{ editingPersonId ? 'Salva modifiche' : 'Aggiungi persona' }}
        </AppButton>
      </div>
    </form>
  </ModalShell>
</template>
