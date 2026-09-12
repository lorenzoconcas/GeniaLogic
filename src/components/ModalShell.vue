<script setup lang="ts">
import { X } from '@lucide/vue'

withDefaults(defineProps<{ title: string; subtitle?: string; wide?: boolean; fullscreen?: boolean; closable?: boolean; inactive?: boolean }>(), { closable: true, inactive: false })
defineEmits<{ close: [] }>()
</script>

<template>
  <div class="modal-backdrop" :inert="inactive || undefined" :aria-hidden="inactive || undefined" @mousedown.self="closable && $emit('close')">
    <section class="modal-panel" :class="{ 'modal-wide': wide, 'modal-fullscreen': fullscreen }" role="dialog" :aria-modal="!inactive" :aria-label="title">
      <header class="modal-header">
        <div><p class="eyebrow">GeniaLogic</p><h2>{{ title }}</h2><p v-if="subtitle">{{ subtitle }}</p></div>
        <button v-if="closable" class="icon-button" aria-label="Chiudi" title="Chiudi" @click="$emit('close')"><X :size="18" /></button>
      </header>
      <div class="modal-body"><slot /></div>
    </section>
  </div>
</template>
