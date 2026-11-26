<script setup>
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import {
  buildRateCompareOption,
  DEFAULT_RATE_IDS,
  RATE_COLORS,
  RATE_DENOMINATORS,
} from '../../lib/marriageRateOptions.js'
import SourceNote from '../ui/SourceNote.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  // 来自 JSON meta.denominators；缺省时用内置口径表兜底
  denominators: { type: Array, default: () => [] },
  height: { type: Number, default: 320 },
})

const selected = ref([...DEFAULT_RATE_IDS])

const options = computed(() => (props.denominators.length ? props.denominators : RATE_DENOMINATORS))

function colorOf(id) {
  return RATE_COLORS[id] || '#64748b'
}

function isSelected(id) {
  return selected.value.includes(id)
}

// 至少留一条线：最后一个选中项不允许取消
function toggle(id) {
  if (isSelected(id)) {
    if (selected.value.length <= 1) return
    selected.value = selected.value.filter(x => x !== id)
  } else {
    selected.value = [...selected.value, id]
  }
}

const option = computed(() => buildRateCompareOption(props.rows, selected.value))
const hasData = computed(() => Boolean(option.value.series?.length))

const yearRange = computed(() => {
  const ys = props.rows.map(r => Number(r?.year)).filter(Number.isFinite)
  if (!ys.length) return ''
  return `${Math.min(...ys)}–${Math.max(...ys)}`
})

const asOf = computed(() => (yearRange.value ? `年度 ${yearRange.value}` : '年度区间待补'))
</script>

<template>
  <section class="panel p-4 sm:p-5">
    <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 class="text-base font-semibold text-[#0f172a]">结婚率对比</h2>
      <span class="text-[11px] text-[#94a3b8]">{{ yearRange }} · 单位：‰</span>
    </div>

    <!-- 多选切换器：选中态用口径色描边 + 浅底，颜色与线条一一对应 -->
    <div class="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="选择分母口径">
      <button
        v-for="d in options"
        :key="d.id"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] transition-colors disabled:cursor-not-allowed"
        :class="
          isSelected(d.id)
            ? 'font-semibold'
            : 'border-[#e7ebf1] bg-white text-[#64748b] hover:border-[#cbd5e1]'
        "
        :style="
          isSelected(d.id)
            ? {
                color: colorOf(d.id),
                borderColor: colorOf(d.id),
                backgroundColor: colorOf(d.id) + '14',
              }
            : undefined
        "
        :aria-pressed="isSelected(d.id)"
        :title="isSelected(d.id) && selected.length === 1 ? '至少保留一条线' : d.label"
        @click="toggle(d.id)"
      >
        <span
          class="h-1.5 w-1.5 rounded-full"
          :style="{ backgroundColor: isSelected(d.id) ? colorOf(d.id) : '#cbd5e1' }"
        ></span>
        <span>{{ d.short || d.label }}</span>
      </button>
    </div>

    <v-chart
      v-if="hasData"
      :option="option"
      :style="{ height: height + 'px', width: '100%' }"
      :not-merge="true"
      autoresize
      class="mt-2"
    />
    <div
      v-else
      class="mt-2 flex items-center justify-center text-xs text-[#94a3b8]"
      :style="{ height: height + 'px' }"
    >
      暂无结婚率数据
    </div>

    <p class="mt-1 text-[11.5px] leading-relaxed text-[#64748b]">
      粗结婚率的分母是总人口；适龄率把分母换成对应年龄段人口，分子仍是结婚登记对数。年龄分母取自项目内模拟人口序列（2020 年普查锚定），早年总量偏小，早年的绝对值宜打折看。2000–2009 与 2021–2026 的未婚分母按 2010/2020 普查剖面外推，数值仍属估算。
    </p>

    <SourceNote
      class="mt-3"
      compact
      source="民政部婚姻登记统计；国家统计局总人口"
      caliber="粗结婚率为官方口径；其余口径只换分母、分子同为结婚登记对数；未婚分母按 2010、2020 年普查长表（10% 抽样）插值"
      :asof="asOf"
    />
  </section>
</template>
