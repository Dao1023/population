<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] }, // [{ name, age }]
  min: { type: Number, default: 20 },
  max: { type: Number, default: 90 },
})

const TICKS = [20, 30, 40, 50, 60, 70, 80, 90]
// 标签错层阈值（占横轴百分比）：小于该距离就换一行，避免 51 / 53 这类相邻年龄压字
const GAP_THRESHOLD = 20

const pos = age => ((age - props.min) / (props.max - props.min)) * 100

const placed = computed(() => {
  const lastInRow = [null, null, null, null]
  return props.items.map(item => {
    const p = pos(item.age)
    let row = 3
    for (let r = 0; r < 4; r++) {
      if (lastInRow[r] == null || p - lastInRow[r] >= GAP_THRESHOLD) {
        row = r
        break
      }
    }
    lastInRow[row] = p
    return { ...item, p, row }
  })
})
</script>

<template>
  <div class="relative h-[140px] w-full select-none px-2">
    <!-- 内层比例容器：left 直接用百分比，不依赖 calc 乘法 -->
    <div class="absolute inset-x-2 bottom-0 top-0">
      <!-- 横轴 -->
      <div class="absolute inset-x-0 bottom-[18px] h-px bg-[#e2e8f0]"></div>

      <!-- 年龄刻度 -->
      <div
        v-for="tick in TICKS"
        :key="tick"
        class="absolute bottom-0 -translate-x-1/2 text-[9px] tabular-nums text-[#94a3b8]"
        :style="{ left: `${pos(tick)}%` }"
      >
        {{ tick }}
      </div>

      <!-- 11 个点 -->
      <div
        v-for="item in placed"
        :key="`dot-${item.name}`"
        class="absolute bottom-[14px] -translate-x-1/2"
        :style="{ left: `${item.p}%` }"
      >
        <span
          class="block rounded-full"
          :class="item.name === '婚房' ? 'h-2.5 w-2.5 bg-[#1d4ed8] ring-[3px] ring-[#dbeafe]' : 'h-2 w-2 bg-[#60a5fa]'"
        ></span>
      </div>

      <!-- 名称标签：三行错层，细线连回轴上的点 -->
      <div
        v-for="item in placed"
        :key="`label-${item.name}`"
        class="absolute -translate-x-1/2"
        :style="{ left: `${item.p}%`, bottom: `${28 + item.row * 22}px` }"
      >
        <i
          class="absolute left-1/2 top-full w-px -translate-x-1/2 bg-[#e2e8f0]"
          :style="{ height: `${item.row * 22 + 12}px` }"
        ></i>
        <span
          class="relative whitespace-nowrap rounded-full bg-white px-1 text-[9.5px] font-semibold leading-4 text-[#334155]"
        >
          {{ item.name }}<span class="ml-0.5 font-medium tabular-nums text-[#94a3b8]">{{ item.age }}</span>
        </span>
      </div>
    </div>
  </div>
</template>
