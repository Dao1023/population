<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { usePopulation } from '../composables/usePopulation.js'
import AgeChart from '../components/population/AgeChart.vue'
import OverviewChart from '../components/population/OverviewChart.vue'
import HotspotChart from '../components/population/HotspotChart.vue'
import DualRangeSlider from '../components/population/DualRangeSlider.vue'

const {
  loading, error, loadData, yearRange, ages,
  timeline, timelineStats,
  fertilityOverride, femaleRatio,
  hotspots, hotspotChartData, hotspotSigma,
} = usePopulation()

const currentYear = ref(2020)
const playing = ref(false)
let timer = null

const displayStart = ref(2000)
const displayEnd = ref(2100)

const currentPopulations = computed(() => {
  const entry = timeline.value.find(t => t.year === currentYear.value)
  return entry ? entry.populations : []
})

const currentStats = computed(() => {
  const entry = timelineStats.value.find(t => t.year === currentYear.value)
  return entry || { total: 0, medianAge: 0, dependencyRatio: 0 }
})

const filteredStats = computed(() =>
  timelineStats.value.filter(s => s.year >= displayStart.value && s.year <= displayEnd.value))

const filteredHotspotData = computed(() => {
  const { years, series } = hotspotChartData.value
  const indices = []
  const filteredYears = []
  years.forEach((y, i) => {
    if (y >= displayStart.value && y <= displayEnd.value) {
      indices.push(i)
      filteredYears.push(y)
    }
  })
  return {
    years: filteredYears,
    series: series.map(s => ({
      name: s.name,
      data: indices.map(i => s.data[i]),
    })),
  }
})

function play() {
  if (playing.value) {
    stop()
    return
  }
  playing.value = true
  timer = setInterval(() => {
    if (currentYear.value < yearRange.value.max) {
      currentYear.value++
    } else {
      stop()
    }
  }, 200)
}

function stop() {
  playing.value = false
  clearInterval(timer)
  timer = null
}

onMounted(() => loadData())

// 切页时停表，避免离开人口页后 setInterval 继续跑
onUnmounted(() => {
  stop()
})
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <!-- 加载状态 -->
    <div v-if="loading" class="flex min-h-[60vh] items-center justify-center">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else-if="error" class="alert alert-error mx-auto mt-10 max-w-2xl">
      <span>{{ error }}</span>
    </div>

    <div v-else class="space-y-4">
      <!-- 标题 -->
      <div class="pb-1 pt-4">
        <p class="kick"><i class="block h-1 w-1 rounded-full bg-[#2563eb]"></i>人口结构</p>
        <h1 class="mt-3 text-2xl font-bold tracking-tight text-[#0f172a]">中国人口结构预测</h1>
        <p class="mt-1 text-sm text-[#64748b]">1951 → 2200，拖动时间轴看年龄金字塔的变化</p>
      </div>

      <!-- 统计卡片 -->
      <div class="stats stats-horizontal w-full overflow-x-auto rounded-2xl border border-[#e7ebf1] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-18px_rgba(16,24,40,0.28)]">
        <div class="stat">
          <div class="stat-title">年份</div>
          <div class="stat-value text-primary">{{ currentYear }}</div>
        </div>
        <div class="stat">
          <div class="stat-title">总人口</div>
          <div class="stat-value text-secondary">{{ (currentStats.total / 100000000).toFixed(2) }}亿</div>
        </div>
        <div class="stat">
          <div class="stat-title">中位年龄</div>
          <div class="stat-value">{{ currentStats.medianAge }}岁</div>
        </div>
        <div class="stat">
          <div class="stat-title">养老抚养比</div>
          <div class="stat-value text-accent">{{ (currentStats.dependencyRatio * 100).toFixed(1) }}%</div>
        </div>
      </div>

      <!-- 年龄分布图 -->
      <div class="panel p-2">
        <AgeChart :year="currentYear" :ages="ages" :populations="currentPopulations" />
      </div>

      <!-- 年份播放器 -->
      <div class="panel p-4">
        <div class="flex items-center gap-4">
          <button class="btn btn-primary btn-sm" @click="play">
            {{ playing ? '暂停' : '播放' }}
          </button>
          <button class="btn btn-ghost btn-sm" @click="currentYear = 2020; stop()">重置</button>
          <input
            type="range"
            :min="yearRange.min"
            :max="yearRange.max"
            v-model.number="currentYear"
            class="range range-primary range-sm flex-1"
            @input="stop"
          />
          <span class="w-16 text-right font-mono text-sm">{{ currentYear }}</span>
        </div>
      </div>

      <!-- 参数调节 -->
      <div class="panel p-4">
        <h2 class="mb-3 text-base font-semibold">参数调节</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="label">
              <span class="label-text">生育率覆盖 ({{ fertilityOverride ?? '原始' }})</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.05"
              :value="fertilityOverride ?? 0.7"
              @input="fertilityOverride = $event.target.value === '0.70' && fertilityOverride === null ? null : Number($event.target.value)"
              class="range range-sm range-secondary"
            />
            <button
              v-if="fertilityOverride !== null"
              class="btn btn-xs btn-ghost mt-1"
              @click="fertilityOverride = null"
            >恢复原始数据</button>
          </div>
          <div>
            <label class="label">
              <span class="label-text">女性比例 {{ (femaleRatio * 100).toFixed(0) }}%</span>
            </label>
            <input
              type="range"
              min="0.3"
              max="0.7"
              step="0.01"
              v-model.number="femaleRatio"
              class="range range-sm range-secondary"
            />
          </div>
        </div>
      </div>

      <!-- 时间窗口 -->
      <div class="panel px-4 py-3">
        <DualRangeSlider
          :min="yearRange.min"
          :max="yearRange.max"
          :start="displayStart"
          :end="displayEnd"
          @update:start="displayStart = $event"
          @update:end="displayEnd = $event"
        />
      </div>

      <!-- 人口总览图 -->
      <div class="panel p-2">
        <OverviewChart :stats="filteredStats" />
      </div>

      <!-- 消费热点指数图 -->
      <div class="panel p-2">
        <HotspotChart :hotspotData="filteredHotspotData" />
      </div>

      <!-- 消费热点中心年龄 -->
      <div class="panel p-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold">消费热点中心年龄</h2>
          <button class="btn btn-xs btn-ghost" @click="hotspots.forEach(h => h.enabled = !h.enabled)">{{ hotspots.every(h => h.enabled) ? '全不选' : '全选' }}</button>
        </div>
        <div class="mb-2">
          <div class="py-1 text-sm">分布宽度 σ = {{ hotspotSigma }}</div>
          <input type="range" v-model.number="hotspotSigma" min="0.1" max="3" step="0.1" class="range range-sm range-accent" />
        </div>
        <div class="divider my-1"></div>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div v-for="h in hotspots" :key="h.name">
            <label class="flex cursor-pointer items-center gap-2 py-1">
              <input type="checkbox" v-model="h.enabled" class="checkbox checkbox-sm checkbox-accent" />
              <span class="label-text text-sm">{{ h.name }} {{ h.centerAge }}岁</span>
            </label>
            <input
              type="range"
              v-model.number="h.centerAge"
              min="0"
              max="100"
              step="1"
              class="range range-sm range-accent"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
