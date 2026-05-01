<script setup>
import { ref, onMounted, computed, watch } from 'vue'
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
  loading, error, loadData, simulate, yearRange,
  fertilityOverride, femaleRatio, generationTime,
  hotspots, hotspotChartData,
} = usePopulation()

const currentYear = ref(2020)
const playing = ref(false)
let timer = null

const result = computed(() => simulate(currentYear.value))

const chartOption = computed(() => {
  const { ages, populations, stats } = result.value
  if (!ages.length) return {}

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
      data: ages,
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
        const age = ages[i]
        const ratio = pop / maxPop
        const item = {
          value: pop,
          itemStyle: {
            color: age >= 60
              ? `rgba(239, 68, 68, ${0.3 + ratio * 0.7})`
              : age >= 15
                ? `rgba(59, 130, 246, ${0.3 + ratio * 0.7})`
                : `rgba(34, 197, 94, ${0.3 + ratio * 0.7})`,
          },
        }
        return item
      }),
      barMaxWidth: 12,
    }],
  }
})

const hotspotChartOption = computed(() => {
  const { years, series } = hotspotChartData.value
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
          <div class="stat-value text-secondary">{{ (result.stats.total / 100000000).toFixed(2) }}亿</div>
        </div>
        <div class="stat">
          <div class="stat-title">中位年龄</div>
          <div class="stat-value">{{ result.stats.medianAge }}岁</div>
        </div>
        <div class="stat">
          <div class="stat-title">养老抚养比</div>
          <div class="stat-value text-accent">{{ (result.stats.dependencyRatio * 100).toFixed(1) }}%</div>
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
