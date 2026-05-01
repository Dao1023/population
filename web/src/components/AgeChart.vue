<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'

const props = defineProps({
  year: Number,
  ages: Array,
  populations: Array,
})

const chartOption = computed(() => {
  const populations = props.populations
  const a = props.ages
  if (!a.length) return {}

  const maxPop = Math.max(...populations)

  return {
    animation: false,
    title: {
      text: `${props.year} 年人口年龄分布`,
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
</script>

<template>
  <v-chart :option="chartOption" style="height: 420px; width: 100%" autoresize />
</template>
