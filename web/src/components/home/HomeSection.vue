<script setup>
import SourceNote from '../ui/SourceNote.vue'

defineProps({
  no: { type: String, required: true },
  tag: { type: String, required: true },
  title: { type: String, required: true },
  lede: { type: String, default: '' },
  caption: { type: String, default: '' },
  source: { type: String, default: '' },
  caliber: { type: String, default: '' },
  asof: { type: String, default: '' },
})
</script>

<template>
  <!-- 每屏统一结构：小标题 → 一句结论 → 图/内容 → 一行来源注 -->
  <section class="panel mt-4 overflow-hidden p-4 sm:p-5 lg:p-6">
    <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div class="min-w-0">
        <p class="kick"><i class="block h-1 w-1 rounded-full bg-[#2563eb]"></i>{{ no }} {{ tag }}</p>
        <h2 class="mt-3 text-[20px] font-bold leading-snug tracking-[-0.015em] text-[#0f172a] sm:text-[25px]">
          {{ title }}
        </h2>
        <p v-if="lede" class="mt-2 max-w-[48em] text-[13.5px] leading-7 text-[#475569]">
          {{ lede }}
        </p>
      </div>
      <slot name="aside" />
    </div>

    <div class="mt-4"><slot /></div>

    <p v-if="caption" class="mt-2.5 text-[12px] leading-6 text-[#64748b]">{{ caption }}</p>

    <SourceNote
      v-if="source"
      class="mt-4"
      compact
      :source="source"
      :caliber="caliber"
      :asof="asof"
    />
  </section>
</template>
