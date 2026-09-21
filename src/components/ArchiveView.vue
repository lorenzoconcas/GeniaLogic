<script setup lang="ts">
import FormField from './FormField.vue'
import AppButton from './AppButton.vue'
import { Save, Download, FolderOpen, Upload, Edit3, FilePlus2 } from '@lucide/vue'
const name = defineModel<string>('name', { required: true })
defineProps<{ updatedAt: string }>()
const emit = defineEmits<{ save: []; open: []; create: [] }>()
</script>

<template>
  <section
    class="flex items-end justify-between gap-4 mb-4 max-[760px]:items-start max-[500px]:gap-2"
  >
    <div>
      <p
        class="m-0 text-[#6667df] text-[0.61rem] font-[850] tracking-[0.16em] uppercase last:mx-0 last:mt-[0.38rem] last:mb-0 last:text-muted last:text-[0.73rem] max-[760px]:last:hidden"
      >
        Dati e sicurezza
      </p>
      <h1
        class="mx-0 mt-[0.15rem] mb-0 font-display text-[clamp(1.75rem,_2.5vw,_2.25rem)] font-[850] tracking-[-0.055em] leading-[1.05] max-[760px]:text-[1.65rem]"
      >
        Archivio
      </h1>
      <p
        class="last:mx-0 last:mt-[0.38rem] last:mb-0 last:text-muted last:text-[0.73rem] max-[760px]:last:hidden"
      >
        Gestisci il file esterno e la copia automatica su questo dispositivo.
      </p>
    </div>
  </section>
  <section
    class="grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[0.8rem] max-[760px]:grid-cols-[1fr]"
  >
    <article
      class="p-5 border border-[#d0d1f3] min-h-68 rounded-xl bg-transparent bg-[linear-gradient(145deg,_#f0f0ff,_#f8f8ff)] shadow-[0_10px_30px_rgba(24,_27,_45,_0.06)] max-[760px]:min-h-0"
    >
      <div
        class="grid place-items-center w-[2.8rem] h-[2.8rem] mb-[1.2rem] rounded-[0.8rem] bg-forest bg-none text-white"
      >
        <Save :size="24" />
      </div>
      <p class="m-0 text-[#6667df] text-[0.61rem] font-[850] tracking-[0.16em] uppercase">
        Copia portatile
      </p>
      <h2 class="mx-0 mt-[0.35rem] mb-[0.55rem] font-display text-[1.25rem]">
        Salva il tuo archivio
      </h2>
      <p class="mx-0 max-w-136 min-h-14 mt-0 mb-[1.1rem] text-muted text-[0.7rem] leading-[1.6]">
        Il formato
        <strong>.genia</strong>
        è compresso e non è leggibile direttamente in un editor di testo. Non è cifrato: conservalo
        in un luogo sicuro.
      </p>
      <AppButton
        tone="primary"
        @click="emit('save')"
      >
        <Download :size="16" />
        Salva file .genia
      </AppButton>
    </article>
    <article
      class="p-5 border border-line min-h-68 rounded-xl bg-paper bg-none shadow-[0_10px_30px_rgba(24,_27,_45,_0.06)] max-[760px]:min-h-0"
    >
      <div
        class="grid place-items-center w-[2.8rem] h-[2.8rem] mb-[1.2rem] rounded-[0.8rem] bg-soft bg-none text-forest"
      >
        <FolderOpen :size="24" />
      </div>
      <p class="m-0 text-[#6667df] text-[0.61rem] font-[850] tracking-[0.16em] uppercase">
        Importazione
      </p>
      <h2 class="mx-0 mt-[0.35rem] mb-[0.55rem] font-display text-[1.25rem]">Apri un archivio</h2>
      <p class="mx-0 max-w-136 min-h-14 mt-0 mb-[1.1rem] text-muted text-[0.7rem] leading-[1.6]">
        Carica un file .genia creato in precedenza. L’albero aperto sostituirà quello attualmente
        visibile.
      </p>
      <AppButton
        tone="secondary"
        @click="emit('open')"
      >
        <Upload :size="16" />
        Scegli un file
      </AppButton>
    </article>
    <article
      class="p-5 border border-line min-h-68 rounded-xl bg-paper bg-none shadow-[0_10px_30px_rgba(24,_27,_45,_0.06)] max-[760px]:min-h-0"
    >
      <div
        class="grid place-items-center w-[2.8rem] h-[2.8rem] mb-[1.2rem] rounded-[0.8rem] bg-soft bg-none text-forest"
      >
        <Edit3 :size="24" />
      </div>
      <p class="m-0 text-[#6667df] text-[0.61rem] font-[850] tracking-[0.16em] uppercase">
        Identità
      </p>
      <h2 class="mx-0 mt-[0.35rem] mb-[0.55rem] font-display text-[1.25rem]">Nome dell’albero</h2>
      <FormField class="max-w-112">
        <span>Nome archivio</span>
        <input
          class="leading-[1.4]"
          v-model.trim="name"
          maxlength="80"
        />
      </FormField>
      <p class="mx-0 mt-[0.7rem] mb-0 text-muted text-[0.58rem]">
        Ultimo aggiornamento:
        {{
          new Intl.DateTimeFormat('it-IT', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(updatedAt))
        }}
      </p>
    </article>
    <article
      class="p-5 border border-[#e5cfc8] min-h-68 rounded-xl bg-[#faf4f1] bg-none shadow-[0_10px_30px_rgba(24,_27,_45,_0.06)] max-[760px]:min-h-0"
    >
      <div
        class="grid place-items-center w-[2.8rem] h-[2.8rem] mb-[1.2rem] rounded-[0.8rem] bg-[#f0ddd6] bg-none text-terracotta"
      >
        <FilePlus2 :size="24" />
      </div>
      <p class="m-0 text-[#6667df] text-[0.61rem] font-[850] tracking-[0.16em] uppercase">
        Riparti
      </p>
      <h2 class="mx-0 mt-[0.35rem] mb-[0.55rem] font-display text-[1.25rem]">Nuovo albero</h2>
      <p class="mx-0 max-w-136 min-h-14 mt-0 mb-[1.1rem] text-muted text-[0.7rem] leading-[1.6]">
        Crea un archivio vuoto. Prima esporta quello attuale se vuoi conservarne una copia.
      </p>
      <AppButton
        tone="danger"
        @click="emit('create')"
      >
        <FilePlus2 :size="16" />
        Nuovo albero
      </AppButton>
    </article>
  </section>
</template>
