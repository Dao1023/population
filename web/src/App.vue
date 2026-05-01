<script setup>
import { ref, onMounted, computed } from 'vue'
import { use as useECharts } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  MarkLineComponent,
  MarkPointComponent,
  LegendComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { usePopulation } from './composables/usePopulation.js'
import AgeChart from './components/AgeChart.vue'
import OverviewChart from './components/OverviewChart.vue'
import HotspotChart from './components/HotspotChart.vue'
import DualRangeSlider from './components/DualRangeSlider.vue'

useECharts([
  BarChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  MarkLineComponent,
  MarkPointComponent,
  LegendComponent,
  CanvasRenderer,
])

const {
  loading, error, loadData, yearRange, ages,
  timeline, timelineStats,
  fertilityOverride, femaleRatio, generationTime,
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
}

onMounted(() => loadData())
</script>

<template>
  <div class="min-h-screen bg-base-200 p-4">
    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else-if="error" class="alert alert-error max-w-2xl mx-auto">
      <span>{{ error }}</span>
    </div>

    <div v-else class="max-w-6xl mx-auto space-y-4">
      <!-- 标题 -->
      <h1 class="text-2xl font-bold text-center">中国人口结构预测</h1>

      <!-- 统计卡片 -->
      <div class="stats stats-horizontal w-full shadow">
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
      <div class="card bg-base-100 shadow">
        <div class="card-body p-2">
          <AgeChart :year="currentYear" :ages="ages" :populations="currentPopulations" />
        </div>
      </div>

      <!-- 年份播放器 -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
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
            <span class="text-sm font-mono w-16 text-right">{{ currentYear }}</span>
          </div>
        </div>
      </div>

      <!-- 参数调节 -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title text-base">参数调节</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div>
              <label class="label">
                <span class="label-text">生育代际时间 {{ generationTime }}年</span>
              </label>
              <input
                type="range"
                min="20"
                max="40"
                step="1"
                v-model.number="generationTime"
                class="range range-sm range-secondary"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 时间窗口 -->
      <div class="card bg-base-100 shadow">
        <div class="card-body py-3">
          <DualRangeSlider
            :min="yearRange.min"
            :max="yearRange.max"
            :start="displayStart"
            :end="displayEnd"
            @update:start="displayStart = $event"
            @update:end="displayEnd = $event"
          />
        </div>
      </div>

      <!-- 人口总览图 -->
      <div class="card bg-base-100 shadow">
        <div class="card-body p-2">
          <OverviewChart :stats="filteredStats" />
        </div>
      </div>

      <!-- 消费热点指数图 -->
      <div class="card bg-base-100 shadow">
        <div class="card-body p-2">
          <HotspotChart :hotspotData="filteredHotspotData" />
        </div>
      </div>

      <!-- 消费热点中心年龄 -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <h2 class="card-title text-base">消费热点中心年龄</h2>
            <button class="btn btn-xs btn-ghost" @click="hotspots.forEach(h => h.enabled = !h.enabled)">{{ hotspots.every(h => h.enabled) ? '全不选' : '全选' }}</button>
          </div>
          <div class="mb-2">
            <div class="text-sm py-1">分布宽度 σ = {{ hotspotSigma }}</div>
            <input type="range" v-model.number="hotspotSigma" min="0.1" max="3" step="0.1" class="range range-sm range-accent" />
          </div>
          <div class="divider my-1"></div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div v-for="h in hotspots" :key="h.name">
              <label class="flex items-center gap-2 cursor-pointer py-1">
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
  </div>
</template>
