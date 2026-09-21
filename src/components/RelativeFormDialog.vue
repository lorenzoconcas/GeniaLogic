<script setup lang="ts">
import FormField from './FormField.vue'
import AppButton from './AppButton.vue'
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
    class="text-[0.95rem]"
    v-if="modal === 'relative' && selectedPerson"
    :title="`Aggiungi un parente a ${selectedPerson.firstName}`"
    subtitle="Crea la persona e il legame in un solo passaggio."
    wide
    @close="modal = null"
  >
    <form @submit.prevent="submitRelative">
      <fieldset
        class="p-0 border-0 border-transparent mx-0 grid grid-cols-[repeat(4,_minmax(0,_1fr))] gap-2 mt-0 mb-4 max-[500px]:grid-cols-[repeat(2,_minmax(0,_1fr))]"
      >
        <legend class="w-full mb-[0.55rem] text-[#4f5569] text-[0.9rem] font-[750]">
          Chi vuoi aggiungere?
        </legend>
        <button
          class="p-[0.6rem] border border-line relative grid min-h-[4.4rem] content-center gap-[0.2rem] rounded-[0.65rem] bg-white bg-none text-left cursor-pointer hover:border-[#b2b4e7] hover:bg-[#fafaff] hover:bg-none data-active:border-[#7071dc] data-active:bg-[#eeeeff] data-active:bg-none data-active:shadow-[0_0_0_2px_rgba(86,_87,_217,_0.1)]"
          v-for="choice in relativeChoices"
          :key="choice.value"
          type="button"
          :data-active="relativeKind === choice.value || undefined"
          @click="chooseRelative(choice.value)"
        >
          <span class="text-[0.9rem] font-extrabold">{{ choice.label }}</span>
          <small class="text-muted text-[0.69rem] leading-[1.3]">{{ choice.description }}</small>
          <Check
            class="absolute right-2 top-2 text-[#5657d9]"
            v-if="relativeKind === choice.value"
            :size="16"
          />
        </button>
      </fieldset>
      <div
        class="px-[0.8rem] py-[0.7rem] flex items-center gap-[0.55rem] mb-4 border-l-[3px] border-l-[#5657d9] rounded bg-[#f5f5ff] bg-none text-[#5e6479] text-[0.82rem]"
      >
        <UserRoundPlus
          class="flex-none text-[#5657d9]"
          :size="18"
        />
        <span>
          Stai aggiungendo
          <strong class="text-[#30334b]">{{ selectedRelativeChoice.label.toLowerCase() }}</strong>
          a
          <strong class="text-[#30334b]">{{ fullName(selectedPerson) }}</strong>
          .
        </span>
      </div>
      <div
        v-if="automaticChildSpouse"
        class="px-[0.8rem] py-[0.7rem] flex items-center gap-[0.55rem] mb-4 border-l-[3px] border-l-[#5657d9] rounded bg-[#f5f5ff] bg-none text-[#5e6479] text-[0.82rem]"
        role="status"
      >
        <Users
          class="flex-none text-[#5657d9]"
          :size="18"
        />
        <span>
          Il coniuge
          <strong class="text-[#30334b]">{{ fullName(automaticChildSpouse) }}</strong>
          verrà collegato automaticamente come secondo genitore biologico.
        </span>
      </div>
      <div class="grid grid-cols-[1fr_1fr] gap-3 max-[500px]:grid-cols-[1fr]">
        <FormField>
          <span>Nome *</span>
          <input
            class="leading-[1.4]"
            v-model="relativeForm.firstName"
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
            v-model="relativeForm.lastName"
            required
            maxlength="60"
            placeholder="Cognome"
          />
          <small
            v-if="selectedRelativeChoice.copySurname"
            class="mt-[-0.05rem] text-[#777e92] text-[0.72rem] leading-[1.4]"
          >
            Proposto da {{ selectedPerson.lastName }}: puoi cambiarlo.
          </small>
        </FormField>
        <FormField
          v-if="relativeKind === 'spouse' || relativeKind === 'partner'"
          class="col-span-full max-[500px]:col-auto"
        >
          <span>Genere</span>
          <select
            class="leading-[1.4]"
            v-model="relativeForm.gender"
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
            v-model="relativeForm.birthDate"
            type="date"
          />
        </FormField>
        <FormField>
          <span>Data di decesso</span>
          <input
            class="leading-[1.4]"
            v-model="relativeForm.deathDate"
            type="date"
          />
        </FormField>
        <FormField class="col-span-full max-[500px]:col-auto">
          <span>Luogo di nascita</span>
          <input
            class="leading-[1.4]"
            v-model="relativeForm.birthPlace"
            maxlength="100"
            placeholder="Città o località"
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
            :data-active="relativeForm.color === color || undefined"
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
      <div class="flex justify-end gap-2 mt-[1.1rem]">
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
          <UserRoundPlus :size="17" />
          Aggiungi {{ selectedRelativeChoice.label.toLowerCase() }}
        </AppButton>
      </div>
    </form>
  </ModalShell>
</template>
