<script setup>
defineProps({
  source: { type: String, required: true },
  caliber: { type: String, required: true },
  asof: { type: String, required: true },
})
</script>

<template>
  <!-- 统一三段式图注：数据来源 / 口径 / 时点 -->
  <div class="border-t border-[#eef2f7] px-1 pt-3 text-[11.5px] leading-relaxed text-[#64748b]">
    <p class="flex gap-1.5">
      <span class="flex-none font-semibold text-[#475569]">数据来源</span>
      <span class="min-w-0">{{ source }}</span>
    </p>
    <p class="mt-1 flex gap-1.5">
      <span class="flex-none font-semibold text-[#475569]">口径</span>
      <span class="min-w-0">{{ caliber }}</span>
    </p>
    <p class="mt-1 flex gap-1.5">
      <span class="flex-none font-semibold text-[#475569]">时点</span>
      <span class="min-w-0">{{ asof }}</span>
    </p>
  </div>
</template>
