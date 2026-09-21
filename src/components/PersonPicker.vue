<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Search, UserRound } from '@lucide/vue'
import type { Person } from '../types'

const props = withDefaults(
  defineProps<{
    people: Person[]
    modelValue: string
    label: string
    fill?: boolean
    autofocusSearch?: boolean
  }>(),
  { fill: false, autofocusSearch: false },
)
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()
const search = ref('')
const selected = computed(() => props.people.find((person) => person.id === props.modelValue))
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it')
    .trim()
const fullName = (person: Person) => `${person.firstName} ${person.lastName}`
const nameCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const person of props.people) {
    const key = normalize(fullName(person))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
})
const isNamesake = (person: Person) => (nameCounts.value.get(normalize(fullName(person))) ?? 0) > 1
const results = computed(() => {
  const terms = normalize(search.value).split(/\s+/).filter(Boolean)
  return props.people
    .filter((person) => {
      const text = normalize(
        [
          fullName(person),
          person.birthName,
          person.nickname,
          person.birthDate,
          person.deathDate,
          person.birthPlace,
          person.occupation,
          person.id,
        ]
          .filter(Boolean)
          .join(' '),
      )
      return terms.every((term) => text.includes(term))
    })
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName, 'it', { sensitivity: 'base' }) ||
        a.firstName.localeCompare(b.firstName, 'it', { sensitivity: 'base' }) ||
        (a.birthDate ?? '').localeCompare(b.birthDate ?? '') ||
        a.id.localeCompare(b.id),
    )
})
function details(person: Person) {
  const date = (value: string) => value.split('-').reverse().join('/')
  return [
    person.birthDate ? `N. ${date(person.birthDate)}` : 'Nascita non indicata',
    person.deathDate ? `† ${date(person.deathDate)}` : '',
    person.birthPlace,
    person.nickname ? `«${person.nickname}»` : '',
    person.occupation,
  ]
    .filter(Boolean)
    .join(' · ')
}
// Keep the exchanged selection visible even if the previous search does not match it.
watch(
  () => props.modelValue,
  () => {
    search.value = ''
  },
)
</script>

<template>
  <fieldset
    class="group/person-picker p-0 m-0 border-0 border-transparent min-w-0 data-person-picker-fill:flex data-person-picker-fill:min-h-0 data-person-picker-fill:h-full data-person-picker-fill:flex-col"
    :data-person-picker-fill="fill || undefined"
  >
    <legend class="mb-[0.55rem] text-[#4f5569] text-[1rem] font-[750]">{{ label }}</legend>
    <div
      class="p-[0.7rem] border border-[#bdbfeb] flex items-center gap-[0.65rem] min-w-0 min-h-[6.7rem] rounded-[0.65rem] bg-[#f4f4ff] bg-none"
      aria-live="polite"
    >
      <div
        class="grid place-items-center w-[2.4rem] h-[2.4rem] flex-none rounded-[0.6rem] text-white text-[0.875rem] font-extrabold uppercase"
        :style="{ background: selected?.color ?? '#73798c' }"
      >
        <template v-if="selected">{{ selected.firstName[0] }}{{ selected.lastName[0] }}</template>
        <UserRound
          v-else
          :size="20"
        />
      </div>
      <div
        v-if="selected"
        class="grid flex-1 gap-1 min-w-0 text-left wrap-anywhere"
      >
        <strong class="text-[1rem] leading-[1.3]">{{ fullName(selected) }}</strong>
        <small class="text-[#596176] text-[0.8125rem] leading-[1.45]">
          {{ details(selected) }}
        </small>
        <small
          v-if="isNamesake(selected)"
          class="text-[#4f50ad] text-[0.75rem] leading-[1.45]"
        >
          Rif. {{ selected.id }}
        </small>
      </div>
      <div
        v-else
        class="grid flex-1 gap-1 min-w-0 text-left wrap-anywhere"
      >
        <strong class="text-[1rem] leading-[1.3]">Scegli una persona</strong>
      </div>
      <Check
        v-if="selected"
        :size="17"
        class="shrink-0 text-[#5657d9]"
      />
    </div>
    <label
      class="p-[0.55rem] border border-[#d6d9e4] flex items-center gap-[0.45rem] mt-[0.65rem] rounded-[0.55rem] text-[#6e7588] focus-within:[outline:2px_solid_#7778df] focus-within:outline-offset-[2px]"
    >
      <Search :size="17" />
      <input
        class="border-0 border-transparent w-full min-w-0 outline-none bg-transparent bg-none text-[#181b2d] text-[0.875rem]"
        v-model="search"
        type="search"
        :autofocus="autofocusSearch"
        :aria-label="`Cerca ${label.toLocaleLowerCase('it')}`"
        placeholder="Nome, cognome, anno o luogo…"
      />
    </label>
    <p class="mx-0 my-[0.4rem] text-[#6e7588] text-[0.75rem]">
      {{ results.length }} persone · ordine per cognome
    </p>
    <div
      class="border border-[#dfe3ed] max-h-60 overflow-y-auto overscroll-contain rounded-[0.65rem] group-data-person-picker-fill/person-picker:min-h-36 group-data-person-picker-fill/person-picker:max-h-[none] group-data-person-picker-fill/person-picker:flex-1"
      :aria-label="`Persone per ${label.toLocaleLowerCase('it')}`"
    >
      <button
        v-for="person in results"
        :key="person.id"
        type="button"
        class="p-[0.7rem] flex items-center gap-[0.65rem] min-w-0 w-full border-t-0 border-t-transparent border-r-0 border-r-transparent border-b border-b-[#e8eaf1] border-l-0 border-l-transparent bg-white bg-none cursor-pointer last:border-b-0 last:border-b-transparent hover:bg-[#f0f0ff] hover:bg-none data-chosen:bg-[#f0f0ff] data-chosen:bg-none focus-visible:[outline:2px_solid_#5657d9] focus-visible:outline-offset-[-3px]"
        :data-chosen="person.id === modelValue || undefined"
        :aria-pressed="person.id === modelValue"
        @click="emit('update:modelValue', person.id)"
      >
        <span
          class="grid place-items-center w-[2.4rem] h-[2.4rem] flex-none rounded-[0.6rem] text-white text-[0.875rem] font-extrabold uppercase"
          :style="{ background: person.color }"
        >
          {{ person.firstName[0] }}{{ person.lastName[0] }}
        </span>
        <span class="grid flex-1 gap-1 min-w-0 text-left wrap-anywhere">
          <strong class="text-[1rem] leading-[1.3]">{{ fullName(person) }}</strong>
          <small class="text-[#596176] text-[0.8125rem] leading-[1.45]">
            {{ details(person) }}
          </small>
          <small
            v-if="isNamesake(person)"
            class="text-[#4f50ad] text-[0.75rem] leading-[1.45]"
          >
            Rif. {{ person.id }}
          </small>
        </span>
        <Check
          v-if="person.id === modelValue"
          :size="16"
          class="shrink-0 text-[#5657d9]"
        />
      </button>
      <p
        v-if="!results.length"
        class="p-4 m-0 text-[#6e7588] text-[0.875rem]"
      >
        Nessuna corrispondenza. Prova un altro nome, anno o luogo.
      </p>
    </div>
  </fieldset>
</template>
