<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'primary' | 'secondary' | 'subtle' | 'danger'
    size?: 'compact' | 'dialog' | 'sidebar'
  }>(),
  {
    tone: 'subtle',
    size: 'compact',
  },
)

// Complete class names keep Tailwind's scanner and the button variants in sync.
const tones = {
  primary:
    'border-transparent bg-[linear-gradient(135deg,_#6263e4,_#4d4ec9)] bg-transparent text-white shadow-[0_7px_18px_rgba(86,_87,_217,_0.24)] hover:bg-forest-hover hover:bg-none',
  secondary: 'border-[#c7caee] bg-[#f7f7ff] bg-none text-forest hover:border-forest',
  subtle: 'border-line bg-paper bg-none text-[#555952] hover:bg-[#f4f1ea] hover:bg-none',
  danger: 'border-[#c67d69] bg-[#a84f3c] bg-none text-white',
}
const sizes = {
  compact: 'min-h-[2.35rem] text-[0.76rem]',
  dialog: 'min-h-[2.7rem] text-[0.9rem]',
  sidebar: 'min-h-11 text-[0.875rem]',
}
</script>

<template>
  <button
    class="border px-[0.85rem] py-[0.55rem] inline-flex items-center justify-center gap-[0.45rem] rounded-[0.55rem] font-[750] cursor-pointer [transition:transform_0.16s,_background_0.16s,_border-color_0.16s,_box-shadow_0.16s] hover:enabled:[transform:translateY(-1px)] disabled:opacity-42 disabled:cursor-not-allowed"
    :class="[tones[tone], sizes[size]]"
  >
    <slot />
  </button>
</template>
