<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { buildProvinceOption } from '../../lib/marriageOptions.js'

const props = defineProps({
  data: { type: Array, default: () => [] },
  metric: { type: String, default: 'ratio' },
  height: { type: Number, default: 760 },
})

const option = computed(() => buildProvinceOption(props.data, props.metric))
const hasData = computed(() => Boolean(option.value.series?.length))
</script>

<template>
  <v-chart
    v-if="hasData"
    :option="option"
    :style="{ height: height + 'px', width: '100%' }"
    autoresize
  />
  <div v-else class="flex items-center justify-center text-xs text-[#94a3b8]" :style="{ height: height + 'px' }">
    暂无省份数据
  </div>
</template>
