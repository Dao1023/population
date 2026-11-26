<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'

const props = defineProps({
  hotspotData: Object,
})

const chartOption = computed(() => {
  const { years, series } = props.hotspotData
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
</script>

<template>
  <v-chart :option="chartOption" style="height: 350px; width: 100%" autoresize />
</template>
