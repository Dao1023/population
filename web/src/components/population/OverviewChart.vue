<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'

const props = defineProps({
  stats: Array,
})

const chartOption = computed(() => {
  const stats = props.stats
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
</script>

<template>
  <v-chart :option="chartOption" style="height: 350px; width: 100%" autoresize />
</template>
