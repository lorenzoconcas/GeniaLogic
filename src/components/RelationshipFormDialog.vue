<script setup lang="ts">
import FormField from './FormField.vue'
import AppButton from './AppButton.vue'
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
    class="text-[0.95rem]"
    v-if="modal === 'relationship'"
    title="Aggiungi un legame"
    subtitle="Scegli le due persone e descrivi il loro legame. L’ordine conta per la genitorialità."
    fullscreen
    :inactive="!!relationshipPickerTarget"
    @close="modal = null"
  >
    <form
      class="flex h-full min-h-0 flex-col"
      @submit.prevent="submitRelationship"
    >
      <div
        class="grid min-h-0 flex-1 grid-cols-[minmax(0,_0.9fr)_minmax(22rem,_1.1fr)] gap-[1.4rem] overflow-hidden max-[1000px]:grid-cols-[1fr] max-[1000px]:overflow-y-auto"
      >
        <section
          class="min-w-0 min-h-0 overflow-y-auto overscroll-contain pr-1 max-[1000px]:overflow-visible"
        >
          <div
            class="relative grid grid-cols-[minmax(0,_1fr)_minmax(0,_1fr)] gap-5 max-[600px]:grid-cols-[1fr]"
          >
            <PersonSelectionCard
              label="Prima persona"
              :person="relationshipSourcePerson"
              @choose="relationshipPickerTarget = 'source'"
            />
            <button
              type="button"
              class="border border-[#c7caee] inline-grid place-items-center w-10 h-10 flex-none rounded-[0.6rem] bg-paper bg-none text-forest cursor-pointer absolute z-2 top-[2.15rem] left-[50%] [transform:translateX(-50%)] shadow-[0_5px_16px_rgba(38,_42,_74,_0.16)] hover:border-line hover:bg-soft hover:bg-none hover:text-ink disabled:opacity-38 disabled:cursor-not-allowed max-[600px]:static max-[600px]:justify-self-center max-[600px]:[transform:none]"
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
            class="p-3 flex items-center flex-wrap gap-[0.55rem] rounded-[0.6rem] bg-[#f3f4fa] bg-none text-[#4f5569] text-[0.875rem] leading-[1.5] wrap-anywhere mt-4"
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
          <div class="grid grid-cols-[1fr_1fr] gap-3 mt-4 max-[500px]:grid-cols-[1fr]">
            <FormField>
              <span>Data di inizio</span>
              <input
                class="leading-[1.4]"
                v-model="relationshipForm.startDate"
                type="date"
              />
            </FormField>
            <FormField>
              <span>Data di fine</span>
              <input
                class="leading-[1.4]"
                v-model="relationshipForm.endDate"
                type="date"
              />
            </FormField>
            <FormField class="col-span-full max-[500px]:col-auto">
              <span>Nota sul legame</span>
              <textarea
                class="leading-[1.5] resize-y"
                v-model="relationshipForm.notes"
                rows="5"
                maxlength="300"
                placeholder="Facoltativa"
              />
            </FormField>
          </div>
        </section>
        <aside
          class="min-w-0 min-h-0 overflow-y-auto overscroll-contain pr-1 border-l border-l-line pl-[1.4rem] max-[1000px]:px-0 max-[1000px]:overflow-visible max-[1000px]:border-t max-[1000px]:border-t-line max-[1000px]:border-l-0 max-[1000px]:border-l-transparent max-[1000px]:pt-5 max-[1000px]:pb-0"
        >
          <fieldset
            class="p-0 m-0 border-0 border-transparent grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[0.7rem] max-[600px]:grid-cols-[1fr] max-[500px]:grid-cols-[1fr]"
          >
            <legend class="text-[#4f5569] text-[0.9rem] font-[750] col-span-full mb-[0.45rem]">
              Tipo di legame
            </legend>
            <div
              class="group/div last:grid last:col-span-full last:grid-cols-[repeat(2,_minmax(0,_1fr))] grid content-start gap-[0.32rem] max-[600px]:last:col-auto max-[600px]:last:grid-cols-[1fr]"
              v-for="group in relationshipGroups"
              :key="group.name"
            >
              <p
                class="group-last/div:col-span-full mx-0 mt-0 mb-1 text-[#6667cf] text-[0.7rem] font-[850] tracking-[0.11em] uppercase max-[600px]:group-last/div:col-auto"
              >
                {{ group.name }}
              </p>
              <label
                class="border border-line px-3 py-[0.72rem] grid grid-cols-[1fr_auto] items-center gap-[0.55rem] rounded-[0.65rem] cursor-pointer hover:bg-[#f7f5ef] hover:bg-none data-active:border-[#9eb4aa] data-active:bg-[#edf3ef] data-active:bg-none data-active:text-forest"
                v-for="option in group.options"
                :key="option.value"
                :data-active="relationshipForm.type === option.value || undefined"
              >
                <input
                  class="absolute opacity-0"
                  v-model="relationshipForm.type"
                  type="radio"
                  :value="option.value"
                />
                <span>
                  <strong class="block text-[0.95rem] leading-[1.35]">{{ option.label }}</strong>
                  <small class="block mt-1 text-muted text-[0.82rem] leading-[1.5]">
                    {{ option.description }}
                  </small>
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
      <footer
        class="flex flex-none items-center gap-3 mt-[0.9rem] border-t border-t-line bg-paper bg-none pt-[0.9rem] max-[700px]:items-stretch max-[700px]:flex-col"
      >
        <p
          v-if="relationshipError"
          class="p-[0.8rem] m-0 border border-[#e5beb2] flex-1 flex items-start gap-[0.55rem] rounded-[0.7rem] bg-[#fbefeb] bg-none text-[#8f4938] text-[0.8rem] leading-[1.5]"
        >
          <Info
            class="flex-none"
            :size="16"
          />
          {{ relationshipError }}
        </p>
        <div
          class="my-0 flex justify-end gap-2 flex-none mr-0 ml-auto max-[700px]:w-full max-[700px]:ml-0"
        >
          <AppButton
            size="dialog"
            tone="subtle"
            type="button"
            class="max-[700px]:flex-1"
            @click="modal = null"
          >
            Annulla
          </AppButton>
          <AppButton
            size="dialog"
            tone="primary"
            class="max-[700px]:flex-1"
            type="submit"
          >
            <Link2 :size="16" />
            Aggiungi legame
          </AppButton>
        </div>
      </footer>
    </form>
  </ModalShell>

  <ModalShell
    class="text-[0.95rem]"
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
