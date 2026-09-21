<script setup lang="ts">
import FormField from './FormField.vue'
import AppButton from './AppButton.vue'
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
    class="text-[0.95rem]"
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
    <form @submit.prevent="submitCoupleChild">
      <div
        class="p-[0.8rem] border border-[#e4d5b8] flex items-center gap-3 mb-4 rounded-xl bg-[#fbf6ec] bg-none"
      >
        <div
          class="grid place-items-center w-[2.4rem] h-[2.4rem] flex-none rounded-[0.65rem] bg-[#efe0c3] bg-none text-[#8d672e] last:grid last:gap-[0.15rem] last:min-w-0"
        >
          <Heart :size="18" />
        </div>
        <div class="last:grid last:gap-[0.15rem] last:min-w-0">
          <span class="text-[#8d672e] text-[0.7rem] font-[850] tracking-[0.08em] uppercase">
            Genitori
          </span>
          <strong class="overflow-hidden text-ellipsis text-ink font-display text-[1rem]">
            {{ fullName(findPerson(pendingCouple.sourceId)) }}
            <small class="text-muted font-sans text-[0.78rem] font-semibold">e</small>
            {{ fullName(findPerson(pendingCouple.targetId)) }}
          </strong>
        </div>
      </div>
      <div class="grid grid-cols-[1fr_1fr] gap-3 max-[500px]:grid-cols-[1fr]">
        <FormField>
          <span>Nome *</span>
          <input
            class="leading-[1.4]"
            v-model="childForm.firstName"
            required
            autofocus
            maxlength="60"
            placeholder="Nome"
          />
        </FormField>
        <FormField>
          <span>Cognome *</span>
          <input
            class="leading-[1.4]"
            v-model="childForm.lastName"
            required
            maxlength="60"
            placeholder="Cognome"
          />
          <small class="mt-[-0.05rem] text-[#777e92] text-[0.72rem] leading-[1.4]">
            Suggerito in base ai genitori; puoi specificarne uno diverso.
          </small>
        </FormField>
        <FormField>
          <span>Genere</span>
          <select
            class="leading-[1.4]"
            v-model="childForm.gender"
          >
            <option value="unspecified">Non specificato</option>
            <option value="female">Donna</option>
            <option value="male">Uomo</option>
            <option value="nonbinary">Non binario</option>
          </select>
        </FormField>
        <FormField>
          <span>Data di nascita</span>
          <input
            class="leading-[1.4]"
            v-model="childForm.birthDate"
            type="date"
          />
        </FormField>
        <FormField class="col-span-full max-[500px]:col-auto">
          <span>Luogo di nascita</span>
          <input
            class="leading-[1.4]"
            v-model="childForm.birthPlace"
            maxlength="100"
            placeholder="Città o località"
          />
        </FormField>
      </div>
      <fieldset
        class="px-0 mx-0 my-4 grid grid-cols-[1fr_1fr] gap-3 border-t border-t-line border-r-0 border-r-transparent border-b-0 border-b-transparent border-l-0 border-l-transparent pt-4 pb-0 max-[500px]:grid-cols-[1fr]"
      >
        <legend class="w-full pt-4 text-[#4f5569] text-[0.9rem] font-[750]">
          Tipo di legame con ciascun genitore
        </legend>
        <FormField>
          <span>{{ fullName(findPerson(pendingCouple.sourceId)) }}</span>
          <select
            class="leading-[1.4]"
            v-model="childForm.firstParentType"
          >
            <option value="biological-parent">Genitore biologico</option>
            <option value="adoptive-parent">Genitore adottivo</option>
            <option value="foster-parent">Genitore affidatario</option>
          </select>
        </FormField>
        <FormField>
          <span>{{ fullName(findPerson(pendingCouple.targetId)) }}</span>
          <select
            class="leading-[1.4]"
            v-model="childForm.secondParentType"
          >
            <option value="biological-parent">Genitore biologico</option>
            <option value="adoptive-parent">Genitore adottivo</option>
            <option value="foster-parent">Genitore affidatario</option>
          </select>
        </FormField>
      </fieldset>
      <fieldset class="p-0 m-0 border-0 border-transparent flex flex-wrap gap-2">
        <legend class="text-[#4f5569] text-[0.9rem] font-[750] w-full mb-[0.45rem]">
          Colore della scheda
        </legend>
        <button
          class="border-[2px] border-paper grid place-items-center w-[1.85rem] h-[1.85rem] rounded-full text-white shadow-[0_0_0_1px_var(--color-line)] cursor-pointer data-active:shadow-[0_0_0_2px_var(--color-paper),_0_0_0_4px_var(--color-forest)]"
          v-for="color in personColors"
          :key="color"
          type="button"
          :style="{ background: color }"
          :data-active="childForm.color === color || undefined"
          :aria-label="`Scegli colore ${color}`"
          @click="childForm.color = color"
        >
          <Check
            v-if="childForm.color === color"
            :size="15"
          />
        </button>
      </fieldset>
      <div class="flex justify-end gap-2 mt-[1.1rem]">
        <AppButton
          size="dialog"
          tone="subtle"
          type="button"
          @click="
            () => {
              modal = null
              pendingCoupleId = null
            }
          "
        >
          Annulla
        </AppButton>
        <AppButton
          size="dialog"
          tone="primary"
          type="submit"
        >
          <UserRoundPlus :size="17" />
          Aggiungi alla coppia
        </AppButton>
      </div>
    </form>
  </ModalShell>
</template>
