<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { buildQuarterPulseOption } from '../../lib/homeOptions.js'

const props = defineProps({
  data: { type: Array, default: () => [] },
  height: { type: Number, default: 300 },
})

const option = computed(() => buildQuarterPulseOption(props.data))
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
    暂无季度数据
  </div>
</template>
