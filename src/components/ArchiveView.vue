<script setup lang="ts">
import { Save, Download, FolderOpen, Upload, Edit3, FilePlus2 } from '@lucide/vue'
const name = defineModel<string>('name', { required: true })
defineProps<{ updatedAt: string }>()
const emit = defineEmits<{ save: []; open: []; create: [] }>()
</script>

<template>
  <section class="view-toolbar">
    <div>
      <p class="eyebrow">Dati e sicurezza</p>
      <h1>Archivio</h1>
      <p>Gestisci il file esterno e la copia automatica su questo dispositivo.</p>
    </div>
  </section>
  <section class="archive-grid">
    <article class="archive-card featured">
      <div class="archive-card-icon"><Save :size="24" /></div>
      <p class="eyebrow">Copia portatile</p>
      <h2>Salva il tuo archivio</h2>
      <p>
        Il formato
        <strong>.genia</strong>
        è compresso e non è leggibile direttamente in un editor di testo. Non è cifrato: conservalo
        in un luogo sicuro.
      </p>
      <button
        class="button primary"
        @click="emit('save')"
      >
        <Download :size="16" />
        Salva file .genia
      </button>
    </article>
    <article class="archive-card">
      <div class="archive-card-icon"><FolderOpen :size="24" /></div>
      <p class="eyebrow">Importazione</p>
      <h2>Apri un archivio</h2>
      <p>
        Carica un file .genia creato in precedenza. L’albero aperto sostituirà quello attualmente
        visibile.
      </p>
      <button
        class="button secondary"
        @click="emit('open')"
      >
        <Upload :size="16" />
        Scegli un file
      </button>
    </article>
    <article class="archive-card">
      <div class="archive-card-icon"><Edit3 :size="24" /></div>
      <p class="eyebrow">Identità</p>
      <h2>Nome dell’albero</h2>
      <label class="field">
        <span>Nome archivio</span>
        <input
          v-model.trim="name"
          maxlength="80"
        />
      </label>
      <p class="microcopy">
        Ultimo aggiornamento:
        {{
          new Intl.DateTimeFormat('it-IT', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(updatedAt))
        }}
      </p>
    </article>
    <article class="archive-card danger-card">
      <div class="archive-card-icon"><FilePlus2 :size="24" /></div>
      <p class="eyebrow">Riparti</p>
      <h2>Nuovo albero</h2>
      <p>Crea un archivio vuoto. Prima esporta quello attuale se vuoi conservarne una copia.</p>
      <button
        class="button danger"
        @click="emit('create')"
      >
        <FilePlus2 :size="16" />
        Nuovo albero
      </button>
    </article>
  </section>
</template>
