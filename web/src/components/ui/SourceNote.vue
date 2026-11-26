<script setup>
defineProps({
  source: { type: String, required: true },
  caliber: { type: String, required: true },
  asof: { type: String, required: true },
  // 首页每屏只留一行来源注，用 compact；子页保留三段式
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <!-- 统一图注：数据来源 / 口径 / 时点 -->
  <div
    v-if="compact"
    class="border-t border-[#eef2f7] px-1 pt-3 text-[11px] leading-relaxed text-[#94a3b8]"
  >
    <p class="break-words">
      <span class="font-semibold text-[#64748b]">来源</span> {{ source }}
      <span class="mx-1 text-[#cbd5e1]">·</span>
      <span class="font-semibold text-[#64748b]">口径</span> {{ caliber }}
      <span class="mx-1 text-[#cbd5e1]">·</span>
      <span class="font-semibold text-[#64748b]">时点</span> {{ asof }}
    </p>
  </div>

  <div v-else class="border-t border-[#eef2f7] px-1 pt-3 text-[11.5px] leading-relaxed text-[#64748b]">
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
