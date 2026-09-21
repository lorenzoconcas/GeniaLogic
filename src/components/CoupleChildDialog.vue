<script setup lang="ts">
import { toRefs } from 'vue'
import type { FamilyTree } from '../types'
import type { TreeEditor } from '../composables/useTreeEditor'
import ModalShell from './ModalShell.vue'
import { Check, UserRoundPlus, Heart } from '@lucide/vue'
import { personColors } from '../data'
import { fullName } from '../services/personPresentation'

const props = defineProps<{ editor: TreeEditor; tree: FamilyTree }>()
const { tree } = toRefs(props)
const { modal, pendingCoupleId, childForm, pendingCouple, submitCoupleChild } = props.editor
function findPerson(id: string) {
  return tree.value.people.find((person) => person.id === id)
}
</script>

<template>
  <ModalShell
    v-if="modal === 'couple-child' && pendingCouple"
    title="Aggiungi un discendente"
    subtitle="Crea la persona e collegala a entrambi i componenti della coppia."
    wide
    @close="
      () => {
        modal = null
        pendingCoupleId = null
      }
    "
  >
    <form
      class="child-form"
      @submit.prevent="submitCoupleChild"
    >
      <div class="couple-summary">
        <div class="couple-summary-icon"><Heart :size="18" /></div>
        <div>
          <span>Genitori</span>
          <strong>
            {{ fullName(findPerson(pendingCouple.sourceId)) }}
            <small>e</small>
            {{ fullName(findPerson(pendingCouple.targetId)) }}
          </strong>
        </div>
      </div>
      <div class="form-grid">
        <label class="field">
          <span>Nome *</span>
          <input
            v-model="childForm.firstName"
            required
            autofocus
            maxlength="60"
            placeholder="Nome"
          />
        </label>
        <label class="field">
          <span>Cognome *</span>
          <input
            v-model="childForm.lastName"
            required
            maxlength="60"
            placeholder="Cognome"
          />
          <small class="field-hint">
            Suggerito in base ai genitori; puoi specificarne uno diverso.
          </small>
        </label>
        <label class="field">
          <span>Genere</span>
          <select v-model="childForm.gender">
            <option value="unspecified">Non specificato</option>
            <option value="female">Donna</option>
            <option value="male">Uomo</option>
            <option value="nonbinary">Non binario</option>
          </select>
        </label>
        <label class="field">
          <span>Data di nascita</span>
          <input
            v-model="childForm.birthDate"
            type="date"
          />
        </label>
        <label class="field full">
          <span>Luogo di nascita</span>
          <input
            v-model="childForm.birthPlace"
            maxlength="100"
            placeholder="Città o località"
          />
        </label>
      </div>
      <fieldset class="parentage-types">
        <legend>Tipo di legame con ciascun genitore</legend>
        <label class="field">
          <span>{{ fullName(findPerson(pendingCouple.sourceId)) }}</span>
          <select v-model="childForm.firstParentType">
            <option value="biological-parent">Genitore biologico</option>
            <option value="adoptive-parent">Genitore adottivo</option>
            <option value="foster-parent">Genitore affidatario</option>
          </select>
        </label>
        <label class="field">
          <span>{{ fullName(findPerson(pendingCouple.targetId)) }}</span>
          <select v-model="childForm.secondParentType">
            <option value="biological-parent">Genitore biologico</option>
            <option value="adoptive-parent">Genitore adottivo</option>
            <option value="foster-parent">Genitore affidatario</option>
          </select>
        </label>
      </fieldset>
      <fieldset class="color-field">
        <legend>Colore della scheda</legend>
        <button
          v-for="color in personColors"
          :key="color"
          type="button"
          :style="{ background: color }"
          :class="{ active: childForm.color === color }"
          :aria-label="`Scegli colore ${color}`"
          @click="childForm.color = color"
        >
          <Check
            v-if="childForm.color === color"
            :size="15"
          />
        </button>
      </fieldset>
      <div class="form-actions">
        <button
          type="button"
          class="button subtle"
          @click="
            () => {
              modal = null
              pendingCoupleId = null
            }
          "
        >
          Annulla
        </button>
        <button
          class="button primary"
          type="submit"
        >
          <UserRoundPlus :size="17" />
          Aggiungi alla coppia
        </button>
      </div>
    </form>
  </ModalShell>
</template>
