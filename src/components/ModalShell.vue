<script setup lang="ts">
import { X } from '@lucide/vue'

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    wide?: boolean
    fullscreen?: boolean
    closable?: boolean
    inactive?: boolean
  }>(),
  { closable: true, inactive: false },
)
defineEmits<{ close: [] }>()
</script>

<template>
  <div
    class="p-[1.2rem] fixed inset-0 z-100 grid place-items-center overflow-x-hidden overflow-y-auto bg-[rgba(38,_39,_35,_0.48)] bg-none backdrop-blur-[5px] max-[700px]:has-data-modal-fullscreen:p-0 max-[500px]:p-0 max-[500px]:items-end"
    :inert="inactive || undefined"
    :aria-hidden="inactive || undefined"
    @mousedown.self="closable && $emit('close')"
  >
    <section
      class="group/modal-panel p-[1.4rem] border border-[rgba(255,_255,_255,_0.5)] w-[min(32rem,_100%)] max-h-[calc(100dvh_-_2.4rem)] overflow-y-auto rounded-[1.15rem] bg-paper bg-none shadow-[0_28px_80px_rgba(20,_20,_18,_0.28)] animate-modal-in data-modal-wide:w-[min(47rem,_100%)] data-modal-fullscreen:flex data-modal-fullscreen:w-[calc(100vw_-_2.4rem)] data-modal-fullscreen:h-[calc(100dvh_-_2.4rem)] data-modal-fullscreen:max-h-[none] data-modal-fullscreen:flex-col data-modal-fullscreen:overflow-hidden max-[700px]:data-modal-fullscreen:p-4 max-[700px]:data-modal-fullscreen:w-full max-[700px]:data-modal-fullscreen:h-dvh max-[700px]:data-modal-fullscreen:rounded-none max-[500px]:w-full max-[500px]:max-h-[92dvh] max-[500px]:rounded-[1.15rem_1.15rem_0_0] max-[500px]:data-modal-wide:w-full max-[500px]:data-modal-wide:max-h-[92dvh] max-[500px]:data-modal-wide:rounded-[1.15rem_1.15rem_0_0]"
      :data-modal-wide="wide || undefined"
      :data-modal-fullscreen="fullscreen || undefined"
      role="dialog"
      :aria-modal="!inactive"
      :aria-label="title"
    >
      <header
        class="group-data-modal-fullscreen/modal-panel:flex-none flex items-start justify-between gap-4 mb-[1.15rem]"
      >
        <div>
          <p
            class="m-0 text-[#6667df] text-[0.7rem] font-[850] tracking-[0.16em] uppercase last:mx-0 last:mt-[0.45rem] last:mb-0 last:text-muted last:text-[0.95rem] last:leading-[1.55]"
          >
            GeniaLogic
          </p>
          <h2 class="mx-0 mt-[0.35rem] mb-0 font-display text-[1.75rem] leading-[1.2]">
            {{ title }}
          </h2>
          <p
            class="last:mx-0 last:mt-[0.45rem] last:mb-0 last:text-muted last:text-[0.95rem] last:leading-[1.55]"
            v-if="subtitle"
          >
            {{ subtitle }}
          </p>
        </div>
        <button
          v-if="closable"
          class="border border-transparent inline-grid place-items-center w-8 h-8 flex-none rounded-[0.6rem] bg-transparent bg-none text-muted cursor-pointer hover:border-line hover:bg-soft hover:bg-none hover:text-ink"
          aria-label="Chiudi"
          title="Chiudi"
          @click="$emit('close')"
        >
          <X :size="18" />
        </button>
      </header>
      <div
        class="group-data-modal-fullscreen/modal-panel:min-h-0 group-data-modal-fullscreen/modal-panel:flex-1 group-data-modal-fullscreen/modal-panel:overflow-hidden text-[0.95rem]"
      >
        <slot />
      </div>
    </section>
  </div>
</template>
