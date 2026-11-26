<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { buildScenarioOption } from '../../lib/homeOptions.js'

const props = defineProps({
  actual: { type: Array, default: () => [] },
  scenario: { type: Array, default: () => [] },
  bandPct: { type: Number, default: 0.08 },
  height: { type: Number, default: 320 },
})

const option = computed(() =>
  buildScenarioOption({ actual: props.actual, scenario: props.scenario, bandPct: props.bandPct }),
)
const hasData = computed(() => Boolean(option.value.series?.length))
</script>

<template>
  <v-chart
    v-if="hasData"
    :option="option"
    :style="{ height: height + 'px', width: '100%' }"
    autoresize
  />
  <div
    v-else
    class="flex items-center justify-center rounded-xl bg-[#f8fafc] text-xs text-[#94a3b8]"
    :style="{ height: height + 'px' }"
  >
    暂无情景数据
  </div>
</template>
