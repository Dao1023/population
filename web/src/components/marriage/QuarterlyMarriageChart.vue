<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { buildQuarterlyOption } from '../../lib/marriageOptions.js'

const props = defineProps({
  data: { type: Array, default: () => [] },
  height: { type: Number, default: 300 },
})

const option = computed(() => buildQuarterlyOption(props.data))
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
    暂无季度数据
  </div>
</template>
