<script setup>
import { computed, onMounted, ref } from 'vue'
import { useMarriageData } from '../composables/useMarriageData.js'
import { PROVINCE_METRICS, getProvinceMetric } from '../lib/marriageOptions.js'
import AnnualMarriageChart from '../components/marriage/AnnualMarriageChart.vue'
import QuarterlyMarriageChart from '../components/marriage/QuarterlyMarriageChart.vue'
import DivorceRatioChart from '../components/marriage/DivorceRatioChart.vue'
import ProvinceRankChart from '../components/marriage/ProvinceRankChart.vue'
import ProvinceMapChart from '../components/marriage/ProvinceMapChart.vue'
import SourceNote from '../components/ui/SourceNote.vue'

const { annual, quarterly, provinces, meta, loading, error, ensureLoaded, kpis } = useMarriageData()

const provinceMetric = ref('ratio')
const metricDef = computed(() => getProvinceMetric(provinceMetric.value))
const provinceHeight = computed(() =>
  provinces.value.length ? Math.max(520, provinces.value.length * 24 + 24) : 520,
)

const TONE_CLASS = {
  primary: 'text-[#2563eb]',
  neutral: 'text-[#0f172a]',
  warning: 'text-[#d97706]',
  danger: 'text-[#dc2626]',
}

const sourceText = computed(
  () => meta.value?.source || '民政部婚姻登记统计（用户提供 Excel）',
)
const asOfText = computed(() => {
  const c = meta.value?.cutoff
  if (!c) return '年度截至 2025 年（2025 年离婚为初步数）；季度截至 2026-09-30；省份为 2024 年'
  return `年度截至 ${c.annual}（2025 年离婚为初步数）；季度截至 ${c.quarterly}；省份为 2024 年`
})

onMounted(() => {
  ensureLoaded().catch(() => {})
})

function retry() {
  ensureLoaded().catch(() => {})
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <!-- 标题区 -->
    <header class="pb-5 pt-9">
      <p class="kick"><i class="block h-1 w-1 rounded-full bg-[#2563eb]"></i>结婚趋势</p>
      <h1 class="mt-4 text-3xl font-bold tracking-tight text-[#0f172a]">结婚趋势</h1>
      <p class="mt-2 text-sm text-[#64748b]">2000–2025，从 1346.9 万对到 610.6 万对</p>
      <p class="mt-1 text-[11.5px] text-[#94a3b8]">1346.9 万对为 2013 年峰值，610.6 万对为 2024 年最低值</p>
    </header>

    <!-- 加载态：骨架屏，不白屏 -->
    <div v-if="loading" class="space-y-4" aria-busy="true" aria-live="polite">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div v-for="i in 4" :key="i" class="panel animate-pulse p-4">
          <div class="h-3 w-20 rounded bg-[#eef2f7]"></div>
          <div class="mt-3 h-7 w-24 rounded bg-[#eef2f7]"></div>
          <div class="mt-2 h-2.5 w-28 rounded bg-[#f1f5f9]"></div>
        </div>
      </div>
      <div class="panel h-[360px] animate-pulse"></div>
      <div class="panel h-[320px] animate-pulse"></div>
      <p class="text-center text-xs text-[#94a3b8]">正在加载结婚数据…</p>
    </div>

    <!-- 错误态 -->
    <div v-else-if="error" class="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span class="text-sm font-medium text-[#dc2626]">数据加载失败</span>
      <span class="max-w-md break-words text-xs text-[#94a3b8]">{{ error }}</span>
      <button class="btn btn-primary btn-sm" @click="retry">重试</button>
    </div>

    <div v-else class="space-y-4">
      <!-- KPI -->
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div v-for="k in kpis" :key="k.key" class="panel p-4">
          <p class="text-[11.5px] text-[#64748b]">{{ k.label }}</p>
          <p class="mt-2 flex items-baseline gap-1">
            <span class="text-[26px] font-bold leading-none tabular-nums" :class="TONE_CLASS[k.tone]">{{ k.value }}</span>
            <span class="text-[11.5px] text-[#94a3b8]">{{ k.unit }}</span>
          </p>
          <p class="mt-2 text-[11px] leading-snug text-[#94a3b8]">{{ k.note }}</p>
        </div>
      </div>

      <!-- 年度双柱 -->
      <section class="panel p-4 sm:p-5">
        <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 class="text-base font-semibold text-[#0f172a]">年度结婚与离婚登记</h2>
          <span class="text-[11px] text-[#94a3b8]">2000–2025 · 单位：万对</span>
        </div>
        <AnnualMarriageChart :data="annual" :height="340" class="mt-2" />
        <p class="mt-1 text-[11.5px] leading-relaxed text-[#64748b]">
          离婚分年数据自 2010 年起公布；2025 年离婚为<b>初步数</b>，以空心点表示，不宜据此判断婚姻稳定性回升。
        </p>
      </section>

      <!-- 季度柱状 -->
      <section class="panel p-4 sm:p-5">
        <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 class="text-base font-semibold text-[#0f172a]">季度结婚登记</h2>
          <span class="text-[11px] text-[#94a3b8]">2017Q1–2026Q3 · 单位：万对</span>
        </div>
        <QuarterlyMarriageChart :data="quarterly" :height="300" class="mt-2" />
        <p class="mt-1 text-[11.5px] leading-relaxed text-[#64748b]">
          2026 年数据截至 9 月 30 日，不与全年值同轴比较；空心柱为 2026 年前三季。
        </p>
      </section>

      <!-- 离结比折线 -->
      <section class="panel p-4 sm:p-5">
        <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 class="text-base font-semibold text-[#0f172a]">离结比走势</h2>
          <span class="text-[11px] text-[#94a3b8]">2010–2025</span>
        </div>
        <DivorceRatioChart :data="annual" :height="300" class="mt-2" />
        <p class="mt-1 text-[11.5px] leading-relaxed text-[#64748b]">
          离结比 = 离婚登记对数 ÷ 结婚登记对数。2024 年升至 0.575 的峰值，2025 年回落至 0.375（离婚为初步数）。
        </p>
      </section>

      <!-- 省份区：地图看空间分布，排名看高低 -->
      <section class="panel p-4 sm:p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-semibold text-[#0f172a]">31 省结婚与离婚</h2>
            <p class="mt-0.5 text-[11px] text-[#94a3b8]">{{ metricDef.note }} · 2024 年</p>
          </div>
          <label class="flex items-center gap-2 text-[11.5px] text-[#64748b]">
            <span class="whitespace-nowrap">指标</span>
            <select
              v-model="provinceMetric"
              class="select select-sm w-[7.5rem] border-[#e2e8f0] bg-white text-xs text-[#0f172a]"
            >
              <option v-for="m in PROVINCE_METRICS" :key="m.key" :value="m.key">{{ m.label }}</option>
            </select>
          </label>
        </div>
        <ProvinceMapChart :data="provinces" :metric="provinceMetric" class="mt-3" />
        <p class="mt-1 text-[11.5px] leading-relaxed text-[#64748b]">
          离结比 = 离婚对数 ÷ 结婚登记对数；2024 年数据
        </p>

        <div class="mt-5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-[#eef2f7] pt-4">
          <h3 class="text-sm font-semibold text-[#0f172a]">排名</h3>
          <span class="text-[11px] text-[#94a3b8]">{{ metricDef.label }} · 降序</span>
        </div>
        <ProvinceRankChart :data="provinces" :metric="provinceMetric" :height="provinceHeight" class="mt-2" />
        <p class="mt-1 text-[11.5px] leading-relaxed text-[#64748b]">
          表中标题写作「2025 年」，但 31 省合计 610.55 万对与 2024 年全国数一致，按 2024 年计。
        </p>
      </section>

      <SourceNote
        :source="sourceText"
        caliber="结婚 / 离婚为登记对数（万对）；离结比 = 离婚对数 ÷ 结婚登记对数；初婚 / 再婚为人数，占比 = 人数 ÷ (2 × 结婚登记对数)"
        :asof="asOfText"
      />
    </div>
  </div>
</template>
