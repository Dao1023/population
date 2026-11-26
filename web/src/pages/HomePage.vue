<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useMarriageData } from '../composables/useMarriageData.js'
import { COPY, DECOMPOSITION, SCENARIO, BUYER, HOTSPOTS, FUTURE_PAGES, ENTRIES } from '../content/home.js'
import HomeSection from '../components/home/HomeSection.vue'
import AnnualHeroChart from '../components/home/AnnualHeroChart.vue'
import FallWaterfall from '../components/home/FallWaterfall.vue'
import QuarterPulseChart from '../components/home/QuarterPulseChart.vue'
import BuyerIndexChart from '../components/home/BuyerIndexChart.vue'
import MarriageLeadChart from '../components/home/MarriageLeadChart.vue'
import HotspotAgeRuler from '../components/home/HotspotAgeRuler.vue'
import ScenarioBandChart from '../components/home/ScenarioBandChart.vue'

const { annual, quarterly, loading, error, ensureLoaded } = useMarriageData()

onMounted(() => {
  ensureLoaded().catch(() => {})
})

function retry() {
  ensureLoaded().catch(() => {})
}

/* ---------------------------------------------------------------- 公共小工具 */

const wan1 = v => (Number.isFinite(v) ? v.toFixed(1) : '—')

function pctLabel(value) {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`
}

const yearRow = year => annual.value.find(r => r.year === year) || null

/* ---------------------------------------------------------------- 第 1 屏 */

const peak = computed(() =>
  annual.value.length
    ? annual.value.reduce((m, r) => (r.marriages_wan > m.marriages_wan ? r : m), annual.value[0])
    : null,
)
const trough = computed(() =>
  annual.value.length
    ? annual.value.reduce((m, r) => (r.marriages_wan < m.marriages_wan ? r : m), annual.value[0])
    : null,
)
const dropWan = computed(() =>
  peak.value && trough.value ? Math.round(peak.value.marriages_wan - trough.value.marriages_wan) : null,
)
const latestYear = computed(() => annual.value[annual.value.length - 1] || null)
const s1Big = computed(() => (trough.value ? wan1(trough.value.marriages_wan) : '—'))
const hasData = computed(() => annual.value.length > 0)

/* ---------------------------------------------------------------- 第 2 屏 */

const s2 = computed(() => {
  if (!peak.value || !trough.value) return null
  return {
    start: peak.value.marriages_wan,
    end: trough.value.marriages_wan,
    startYear: peak.value.year,
    endYear: trough.value.year,
  }
})

/* ---------------------------------------------------------------- 第 3 屏 */

const qWan = (year, quarter) =>
  quarterly.value.find(r => r.year === year && r.quarter === quarter)?.marriages_wan ?? null

const sumThreeQuarters = year =>
  [1, 2, 3].reduce((sum, q) => sum + (qWan(year, q) ?? 0), 0)

const quarterlySummary = computed(() => {
  if (!quarterly.value.length) return null
  const y2025 = yearRow(2025)?.marriages_wan
  const y2024 = yearRow(2024)?.marriages_wan
  if (!y2025 || !y2024) return null

  const growth = Math.round(y2025 - y2024)
  const pulsePct = pctLabel((y2025 / y2024 - 1) * 100)
  const q2 = qWan(2025, 2) / qWan(2024, 2) - 1
  const q3 = qWan(2025, 3) / qWan(2024, 3) - 1

  const three2026 = sumThreeQuarters(2026)
  const three2025 = sumThreeQuarters(2025)
  const three2024 = sumThreeQuarters(2024)
  const yoy2026 = (three2026 / three2025 - 1) * 100
  const gap2024 = (three2026 / three2024 - 1) * 100

  return {
    growth,
    pulsePct,
    q2Pct: pctLabel(q2 * 100),
    q3Pct: pctLabel(q3 * 100),
    three2026: wan1(three2026),
    yoy2026: pctLabel(yoy2026),
    gap2024: Math.abs(gap2024).toFixed(1) + '%',
  }
})

/* ---------------------------------------------------------------- 第 4 屏 */

const buyerStats = computed(() => {
  const decay = (1 - BUYER.housingIndex[1].value) / (1 - BUYER.populationIndex[1].value)
  return {
    multiple: Math.round(decay),
    housing: BUYER.housingIndex[1].value.toFixed(3),
    population: BUYER.populationIndex[1].value.toFixed(3),
  }
})

const marriageLead = computed(() => {
  const y2024 = yearRow(2024)?.marriages_wan
  const y2025 = yearRow(2025)?.marriages_wan
  return {
    y2024: wan1(y2024),
    y2025: wan1(y2025),
  }
})

/* ---------------------------------------------------------------- 第 5 屏 */

const scenarioLede = computed(() => {
  const at = year => SCENARIO.points.find(p => p.year === year)?.value
  return COPY.s5.lede({
    y2030: at(2030),
    y2040: at(2040),
    y2050: at(2050),
  })
})

const scenarioActual = computed(() => annual.value.filter(r => r.year >= 2012))
</script>

<template>
  <div>
    <!-- ============================================================ 第 1 屏 -->
    <section class="grid gap-5 pb-5 pt-9 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-10">
      <div class="min-w-0">
        <p class="kick"><i class="block h-1 w-1 rounded-full bg-[#2563eb]"></i>{{ COPY.s1.no }} {{ COPY.s1.tag }}</p>
        <h1 class="mt-4 text-[31px] font-bold leading-[1.2] tracking-[-0.025em] text-[#0f172a] sm:text-[42px] lg:text-[50px]">
          <template v-if="dropWan != null">{{ dropWan }}</template>
          <span v-else class="inline-block h-[0.82em] w-[2.2em] animate-pulse rounded-md bg-[#e7ebf1] align-middle"></span>
          万对婚姻，去哪了
        </h1>
      </div>
      <p class="max-w-[34em] border-l-2 border-[#2563eb] pl-4 text-sm leading-7 text-[#64748b] max-lg:border-l-0 max-lg:pl-0">
        {{ COPY.s1.lede }}
      </p>
    </section>

    <section class="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
      <!-- 巨型数字 -->
      <div class="panel relative flex min-h-[230px] flex-col justify-between gap-5 overflow-hidden p-6">
        <div class="pointer-events-none absolute -right-12 -top-12 h-[160px] w-[160px] rounded-full" style="background: radial-gradient(circle, rgba(37, 99, 235, 0.1), rgba(37, 99, 235, 0) 70%)"></div>
        <div>
          <div class="text-xs font-medium tracking-wide text-[#64748b]">2024 年全国结婚登记</div>
          <div class="mt-2 text-[62px] font-extrabold leading-[0.95] tracking-[-0.04em] tabular-nums text-[#0f172a] sm:text-[76px]">
            <template v-if="hasData">{{ s1Big }}</template>
            <span v-else class="inline-block h-[0.8em] w-[2.6em] animate-pulse rounded-md bg-[#e7ebf1] align-middle"></span>
            <span class="ml-1 align-baseline text-[0.3em] font-semibold tracking-normal text-[#64748b]">万对</span>
          </div>
        </div>
        <div v-if="peak && latestYear" class="grid grid-cols-2 gap-3">
          <div class="rounded-lg bg-[#f8fafc] px-3 py-2">
            <div class="text-[10px] text-[#94a3b8]">{{ peak.year }} 年峰值</div>
            <div class="mt-0.5 text-[17px] font-bold leading-none tabular-nums text-[#334155]">
              {{ wan1(peak.marriages_wan) }}<span class="ml-0.5 text-[10px] font-medium text-[#94a3b8]">万对</span>
            </div>
          </div>
          <div class="rounded-lg bg-[#f8fafc] px-3 py-2">
            <div class="text-[10px] text-[#94a3b8]">{{ latestYear.year }} 年回升</div>
            <div class="mt-0.5 text-[17px] font-bold leading-none tabular-nums text-[#2563eb]">
              {{ wan1(latestYear.marriages_wan) }}<span class="ml-0.5 text-[10px] font-medium text-[#94a3b8]">万对</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 border-t border-[#eef2f7] pt-3 text-[11.5px] text-[#64748b]">
          <i class="block h-1.5 w-1.5 flex-none rounded-full bg-[#22c55e] shadow-[0_0_0_3px_rgba(34,197,94,0.15)]"></i>
          <span>2000 年至今全量年值 · 2024 年为历史最低</span>
        </div>
      </div>

      <!-- 折线图 -->
      <div class="panel flex flex-col p-5">
        <div class="mb-1 flex items-center justify-between gap-3">
          <b class="text-[12.5px] font-semibold tracking-wide text-[#334155]">结婚登记对数 · 万对</b>
          <span class="whitespace-nowrap rounded-full border border-[#e7ebf1] bg-[#f8fafc] px-2.5 py-0.5 text-[11px] tabular-nums text-[#64748b]">
            2000–{{ latestYear?.year || '2025' }}
          </span>
        </div>
        <div v-if="loading" class="h-[240px] animate-pulse rounded-xl bg-[#f1f5f9]"></div>
        <AnnualHeroChart v-else :data="annual" :height="240" />
        <p v-if="error" class="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-[#dc2626]">
          数据加载失败：{{ error }}
          <button class="btn btn-xs btn-outline" @click="retry">重试</button>
        </p>
      </div>
    </section>

    <!-- ============================================================ 第 2 屏 -->
    <HomeSection
      v-if="s2"
      :no="COPY.s2.no"
      :tag="COPY.s2.tag"
      :title="COPY.s2.title(dropWan)"
      :lede="COPY.s2.lede"
      :caption="COPY.s2.caption"
      :source="DECOMPOSITION.source"
      :caliber="DECOMPOSITION.caliber"
      :asof="DECOMPOSITION.asof"
    >
      <FallWaterfall
        v-if="!loading"
        :start="s2.start"
        :end="s2.end"
        :start-year="s2.startYear"
        :end-year="s2.endYear"
        :population-effect="DECOMPOSITION.populationEffectWan"
        :population-share="DECOMPOSITION.populationShare"
        :intensity-share="DECOMPOSITION.intensityShare"
        :height="340"
      />
      <div v-else class="h-[340px] animate-pulse rounded-xl bg-[#f1f5f9]"></div>
    </HomeSection>

    <!-- ============================================================ 第 3 屏 -->
    <HomeSection
      v-if="quarterlySummary"
      :no="COPY.s3.no"
      :tag="COPY.s3.tag"
      :title="COPY.s3.title(quarterlySummary.growth)"
      :lede="COPY.s3.lede({ year: 2025, value: wan1(yearRow(2025)?.marriages_wan), pct: quarterlySummary.pulsePct })"
      :caption="COPY.s3.caption({ yoy: quarterlySummary.yoy2026, gap: quarterlySummary.gap2024 })"
      :source="COPY.s3.source"
      :caliber="COPY.s3.caliber"
      :asof="COPY.s3.asof"
    >
      <div class="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#64748b]">
        <span class="inline-flex items-center gap-1.5">
          <i class="block h-2.5 w-2.5 rounded-[2px] bg-[#2563eb]/80"></i>2017–2024
        </span>
        <span class="inline-flex items-center gap-1.5">
          <i class="block h-2.5 w-2.5 rounded-[2px] bg-[#f59e0b]"></i>2025 脉冲
        </span>
        <span class="inline-flex items-center gap-1.5">
          <i class="block h-2.5 w-2.5 rounded-[2px] border-[1.5px] border-[#2563eb] bg-transparent"></i>2026 前三季（空心）
        </span>
      </div>
      <QuarterPulseChart v-if="!loading" :data="quarterly" :height="300" />
      <div v-else class="h-[300px] animate-pulse rounded-xl bg-[#f1f5f9]"></div>
      <p class="mt-2 text-[11.5px] leading-relaxed text-[#64748b]">
        2025 年 Q2 同比 {{ quarterlySummary.q2Pct }}、Q3 {{ quarterlySummary.q3Pct }}：政策把登记从 Q1 挪到了 Q2、Q3。
        2026 年前三季 {{ quarterlySummary.three2026 }} 万对。
      </p>
    </HomeSection>

    <!-- ============================================================ 第 4 屏 -->
    <HomeSection
      :no="COPY.s4.no"
      :tag="COPY.s4.tag"
      :title="COPY.s4.title()"
      :lede="COPY.s4.lede"
      :source="COPY.s4.source"
      :caliber="COPY.s4.caliber"
      :asof="COPY.s4.asof"
    >
      <div class="grid gap-3 lg:grid-cols-3">
        <!-- 买房的人 -->
        <div class="flex flex-col rounded-xl border border-[#eef2f7] bg-[#fbfcfe] p-4">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-[14px] font-bold text-[#0f172a]">买房的人</h3>
            <RouterLink to="/population" class="text-[11.5px] font-semibold text-[#2563eb] hover:underline">
              人口结构 →
            </RouterLink>
          </div>
          <p class="mt-2 text-[12.5px] leading-6 text-[#475569]">
            婚房需求的高峰在 <b class="text-[#0f172a]">31 岁</b>。31 岁人口 2018 年
            {{ BUYER.peakWan }} 万，2025 年 {{ BUYER.midWan }} 万，2030 年 {{ BUYER.endWan }} 万。
          </p>

          <div class="mt-3 flex items-end justify-between gap-2 rounded-lg bg-white px-3 py-2.5">
            <div v-for="s in [
              { y: BUYER.peakYear, v: BUYER.peakWan },
              { y: BUYER.midYear, v: BUYER.midWan },
              { y: BUYER.endYear, v: BUYER.endWan },
            ]" :key="s.y" class="text-center">
              <div class="text-[15px] font-bold leading-none tabular-nums text-[#0f172a]">{{ s.v }}</div>
              <div class="mt-1 text-[9.5px] tabular-nums text-[#94a3b8]">{{ s.y }}</div>
            </div>
          </div>

          <div class="mt-3 flex items-center gap-3 text-[9.5px] text-[#94a3b8]">
            <span class="inline-flex items-center gap-1">
              <i class="block h-0.5 w-3 bg-[#2563eb]"></i>婚房需求指数
            </span>
            <span class="inline-flex items-center gap-1">
              <i class="block h-0.5 w-3 border-t border-dashed border-[#94a3b8]"></i>总人口
            </span>
          </div>
          <BuyerIndexChart
            :housing-index="BUYER.housingIndex"
            :population-index="BUYER.populationIndex"
            :height="104"
          />
          <p class="mt-auto pt-1 text-[11.5px] leading-5 text-[#64748b]">
            2030 年婚房指数 {{ buyerStats.housing }}，总人口 {{ buyerStats.population }}：
            跌幅是总人口的 <b class="text-[#0f172a]">{{ buyerStats.multiple }} 倍</b>。
          </p>
        </div>

        <!-- 研究生育的人 -->
        <div class="flex flex-col rounded-xl border border-[#eef2f7] bg-[#fbfcfe] p-4">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-[14px] font-bold text-[#0f172a]">研究生育的人</h3>
            <RouterLink to="/marriage" class="text-[11.5px] font-semibold text-[#2563eb] hover:underline">
              结婚趋势 →
            </RouterLink>
          </div>
          <p class="mt-2 text-[12.5px] leading-6 text-[#475569]">
            结婚是出生的先行指标，通常领先约一年。2024 年
            <b class="text-[#0f172a]">{{ marriageLead.y2024 }}</b> 万对是历史最低，2025 年回到
            <b class="text-[#0f172a]">{{ marriageLead.y2025 }}</b> 万对。
          </p>
          <MarriageLeadChart :data="annual" :height="118" />
          <div class="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[11px] text-[#64748b]">
            <span class="font-semibold text-[#334155]">结婚登记</span>
            <span class="text-[#2563eb]">→</span>
            <span class="rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-semibold text-[#2563eb]">领先约一年</span>
            <span class="text-[#2563eb]">→</span>
            <span class="font-semibold text-[#334155]">出生</span>
          </div>
          <p class="mt-auto pt-2 text-[11.5px] leading-5 text-[#64748b]">
            出生数不在这里画：投影里的 0 岁人口不等于官方出生数，两者不能同轴比较。
          </p>
        </div>

        <!-- 做投资的人 -->
        <div class="flex flex-col rounded-xl border border-[#eef2f7] bg-[#fbfcfe] p-4">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-[14px] font-bold text-[#0f172a]">做投资的人</h3>
            <RouterLink to="/population" class="text-[11.5px] font-semibold text-[#2563eb] hover:underline">
              消费热点 →
            </RouterLink>
          </div>
          <p class="mt-2 text-[12.5px] leading-6 text-[#475569]">
            11 个消费热点各挂在一个年龄上。队列往前走，需求就跟着挪。
          </p>
          <div class="mt-1 rounded-lg bg-white px-1 pb-1">
            <HotspotAgeRuler :items="HOTSPOTS" />
          </div>
          <p class="mt-auto pt-2 text-[11.5px] leading-5 text-[#64748b]">
            婚房 31 岁、改善房 42 岁、大学费 51 岁、养老 65 岁——中间隔着的是同一批人的不同阶段。
          </p>
        </div>
      </div>
    </HomeSection>

    <!-- ============================================================ 第 5 屏 -->
    <HomeSection
      :no="COPY.s5.no"
      :tag="COPY.s5.tag"
      :title="COPY.s5.title()"
      :lede="scenarioLede"
      :caption="COPY.s5.caption"
      :source="SCENARIO.source"
      :caliber="SCENARIO.caliber"
      :asof="SCENARIO.asof"
    >
      <template #aside>
        <span class="whitespace-nowrap rounded-full border border-[#dbeafe] bg-[#eff6ff] px-2.5 py-1 text-[11px] font-semibold text-[#2563eb]">
          情景推演，非预测
        </span>
      </template>
      <ScenarioBandChart
        v-if="!loading"
        :actual="scenarioActual"
        :scenario="SCENARIO.points"
        :band-pct="SCENARIO.bandPct"
        :height="320"
      />
      <div v-else class="h-[320px] animate-pulse rounded-xl bg-[#f1f5f9]"></div>
    </HomeSection>

    <!-- ============================================================ 第 6 屏 -->
    <section class="panel mt-4 p-4 sm:p-5 lg:p-6">
      <p class="kick"><i class="block h-1 w-1 rounded-full bg-[#2563eb]"></i>{{ COPY.s6.no }} {{ COPY.s6.tag }}</p>
      <h2 class="mt-3 text-[20px] font-bold leading-snug tracking-[-0.015em] text-[#0f172a] sm:text-[25px]">
        {{ COPY.s6.title() }}
      </h2>
      <p class="mt-2 text-[13.5px] leading-7 text-[#475569]">{{ COPY.s6.lede }}</p>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <RouterLink
          v-for="entry in ENTRIES"
          :key="entry.to"
          :to="entry.to"
          class="group flex items-center justify-between gap-4 rounded-xl border border-[#e7ebf1] bg-[#fbfcfe] p-4 transition hover:border-[#bfdbfe] hover:bg-[#f8fbff]"
        >
          <span class="min-w-0">
            <span class="block text-[17px] font-bold text-[#0f172a]">{{ entry.title }}</span>
            <span class="mt-1 block text-[12.5px] leading-6 text-[#64748b]">{{ entry.desc }}</span>
          </span>
          <span class="text-xl text-[#2563eb] transition group-hover:translate-x-0.5">→</span>
        </RouterLink>
      </div>

      <div class="mt-5 border-t border-[#eef2f7] pt-3">
        <p class="text-[11.5px] leading-6 text-[#94a3b8]">
          以后还会有：
          <span v-for="name in FUTURE_PAGES" :key="name" class="mr-3 text-[#b6c0cd]">{{ name }}</span>
        </p>
        <p class="mt-1 text-[11px] leading-6 text-[#94a3b8]">
          数据来源：民政部、国家统计局 · 本站为数据可视化项目，仅供参考，不构成任何预测或投资建议。
        </p>
      </div>
    </section>
  </div>
</template>
