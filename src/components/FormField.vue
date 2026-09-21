<template>
  <!-- A native label preserves focus and accessible naming for the slotted control. -->
  <label
    class="grid content-start gap-[0.35rem] [&>span]:text-[#4f5569] [&>span]:text-[0.9rem] [&>span]:font-[750] [&_:is(input,select,textarea)]:border [&_:is(input,select,textarea)]:border-[#d6d9e4] [&_:is(input,select,textarea)]:px-[0.85rem] [&_:is(input,select,textarea)]:py-[0.78rem] [&_:is(input,select,textarea)]:w-full [&_:is(input,select,textarea)]:rounded-[0.65rem] [&_:is(input,select,textarea)]:bg-white [&_:is(input,select,textarea)]:bg-none [&_:is(input,select,textarea)]:text-ink [&_:is(input,select,textarea)]:text-[1rem] [&_:is(input,select,textarea)]:outline-none [&_:is(input,select,textarea)]:[transition:border-color_0.15s,_box-shadow_0.15s] [&_:is(input,select,textarea)]:focus:border-forest [&_:is(input,select,textarea)]:focus:shadow-[0_0_0_3px_rgba(49,_93,_80,_0.1)]"
  >
    <slot />
  </label>
</template>
