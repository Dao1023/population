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
import VChart from 'vue-echarts'
import { usePopulation } from './composables/usePopulation.js'

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
  hotspots, hotspotChartData,
} = usePopulation()

const currentYear = ref(2020)
const playing = ref(false)
let timer = null

const displayStart = ref(2000)
const displayEnd = ref(2100)

const rangeStyle = computed(() => {
  const total = yearRange.value.max - yearRange.value.min
  const left = ((displayStart.value - yearRange.value.min) / total) * 100
  const right = ((yearRange.value.max - displayEnd.value) / total) * 100
  return { left: left + '%', right: right + '%' }
})

// 当前年份数据（从缓存时间线查找，不再重复模拟）
const currentPopulations = computed(() => {
  const entry = timeline.value.find(t => t.year === currentYear.value)
  return entry ? entry.populations : []
})

const currentStats = computed(() => {
  const entry = timelineStats.value.find(t => t.year === currentYear.value)
  return entry || { total: 0, medianAge: 0, dependencyRatio: 0 }
})

// 时间窗口过滤
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

// 年龄分布柱状图
const chartOption = computed(() => {
  const populations = currentPopulations.value
  const a = ages.value
  if (!a.length) return {}

  const maxPop = Math.max(...populations)

  return {
    animation: false,
    title: {
      text: `${currentYear.value} 年人口年龄分布`,
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      formatter(params) {
        const d = params[0]
        return `年龄: ${d.name}<br/>人口: ${d.value.toLocaleString()}`
      },
    },
    grid: { left: 60, right: 40, top: 50, bottom: 60 },
    xAxis: {
      type: 'category',
      data: a,
      name: '年龄',
      axisLabel: { interval: 4 },
    },
    yAxis: {
      type: 'value',
      name: '人口',
      axisLabel: {
        formatter: v => v >= 10000000 ? (v / 10000000).toFixed(1) + '千万'
          : v >= 10000 ? (v / 10000).toFixed(0) + '万'
          : v,
      },
    },
    series: [{
      type: 'bar',
      data: populations.map((pop, i) => {
        const age = a[i]
        const ratio = pop / maxPop
        return {
          value: pop,
          itemStyle: {
            color: age >= 60
              ? `rgba(239, 68, 68, ${0.3 + ratio * 0.7})`
              : age >= 15
                ? `rgba(59, 130, 246, ${0.3 + ratio * 0.7})`
                : `rgba(34, 197, 94, ${0.3 + ratio * 0.7})`,
          },
        }
      }),
      barMaxWidth: 12,
    }],
  }
})

// 人口总览时间图
const overviewChartOption = computed(() => {
  const stats = filteredStats.value
  if (!stats.length) return {}

  const years = stats.map(s => s.year)

  return {
    animation: false,
    title: { text: '人口总览', left: 'center' },
    tooltip: {
      trigger: 'axis',
      formatter(params) {
        let html = `${params[0].axisValue} 年<br/>`
        for (const p of params) {
          const val = p.seriesName === '总人口' || p.seriesName === '劳动人口'
            ? (p.value / 100000000).toFixed(2) + '亿'
            : p.seriesName === '中位年龄'
              ? p.value + '岁'
              : p.value.toFixed(1) + '%'
          html += `${p.marker}${p.seriesName}: ${val}<br/>`
        }
        return html
      },
    },
    legend: { bottom: 0 },
    grid: { left: 60, right: 60, top: 50, bottom: 40 },
    xAxis: {
      type: 'category',
      data: years,
      name: '年份',
      axisLabel: { interval: 19 },
    },
    yAxis: [
      {
        type: 'value',
        name: '人口',
        position: 'left',
        axisLabel: {
          formatter: v => (v / 100000000).toFixed(1) + '亿',
        },
      },
      {
        type: 'value',
        name: '年龄 / %',
        position: 'right',
      },
    ],
    series: [
      {
        name: '总人口',
        type: 'line',
        data: stats.map(s => s.total),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2 },
        yAxisIndex: 0,
      },
      {
        name: '劳动人口',
        type: 'line',
        data: stats.map(s => s.workingPop),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2 },
        yAxisIndex: 0,
      },
      {
        name: '中位年龄',
        type: 'line',
        data: stats.map(s => s.medianAge),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2 },
        yAxisIndex: 1,
      },
      {
        name: '养老抚养比',
        type: 'line',
        data: stats.map(s => Math.round(s.dependencyRatio * 1000) / 10),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, type: 'dashed' },
        yAxisIndex: 1,
      },
    ],
  }
})

// 消费热点指数图
const hotspotChartOption = computed(() => {
  const { years, series } = filteredHotspotData.value
  if (!years.length) return {}

  return {
    animation: false,
    title: {
      text: '消费热点指数',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      formatter(params) {
        let html = `${params[0].axisValue} 年<br/>`
        for (const p of params) {
          const val = p.value >= 100000000
            ? (p.value / 100000000).toFixed(2) + '亿'
            : p.value >= 10000
              ? (p.value / 10000).toFixed(0) + '万'
              : p.value.toLocaleString()
          html += `${p.marker}${p.seriesName}: ${val}<br/>`
        }
        return html
      },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
    },
    grid: { left: 60, right: 40, top: 50, bottom: 40 },
    xAxis: {
      type: 'category',
      data: years,
      name: '年份',
      axisLabel: { interval: 19 },
    },
    yAxis: {
      type: 'value',
      name: '热度',
      axisLabel: {
        formatter: v => v >= 100000000 ? (v / 100000000).toFixed(1) + '亿'
          : v >= 10000 ? (v / 10000).toFixed(0) + '万'
          : v,
      },
    },
    series: series.map(s => ({
      name: s.name,
      type: 'line',
      data: s.data,
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2 },
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

      <!-- 图表 -->
      <div class="card bg-base-100 shadow">
        <div class="card-body p-2">
          <v-chart :option="chartOption" style="height: 420px; width: 100%" autoresize />
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
          <div class="flex items-center gap-4">
            <span class="text-sm font-mono">{{ displayStart }}</span>
            <div class="dual-range flex-1">
              <div class="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-base-content/15">
                <div class="absolute top-0 bottom-0 rounded-full bg-primary/50" :style="rangeStyle"></div>
              </div>
              <input type="range" :min="yearRange.min" :max="yearRange.max" :value="displayStart" @input="displayStart = Math.min($event.target.value, displayEnd)" />
              <input type="range" :min="yearRange.min" :max="yearRange.max" :value="displayEnd" @input="displayEnd = Math.max($event.target.value, displayStart)" />
            </div>
            <span class="text-sm font-mono">{{ displayEnd }}</span>
          </div>
        </div>
      </div>

      <!-- 人口总览图 -->
      <div class="card bg-base-100 shadow">
        <div class="card-body p-2">
          <v-chart :option="overviewChartOption" style="height: 350px; width: 100%" autoresize />
        </div>
      </div>

      <!-- 消费热点指数图 -->
      <div class="card bg-base-100 shadow">
        <div class="card-body p-2">
          <v-chart :option="hotspotChartOption" style="height: 350px; width: 100%" autoresize />
        </div>
      </div>

      <!-- 消费热点中心年龄 -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title text-base">消费热点中心年龄</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div v-for="h in hotspots" :key="h.name">
              <label class="label py-1">
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

<style>
.dual-range {
  position: relative;
  height: 30px;
}

.dual-range input[type="range"] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  pointer-events: none;
  margin: 0;
  padding: 0;
  outline: none;
  z-index: 2;
}

.dual-range input[type="range"]::-webkit-slider-runnable-track {
  background: transparent;
}

.dual-range input[type="range"]::-moz-range-track {
  background: transparent;
}

.dual-range input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  pointer-events: all;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #5b21b6;
  border: 3px solid white;
  cursor: pointer;
  margin-top: -7px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.dual-range input[type="range"]::-moz-range-thumb {
  pointer-events: all;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #5b21b6;
  border: 3px solid white;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
</style>
