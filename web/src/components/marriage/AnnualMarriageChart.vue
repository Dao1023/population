<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { buildAnnualOption } from '../../lib/marriageOptions.js'

const props = defineProps({
  data: { type: Array, default: () => [] },
  height: { type: Number, default: 340 },
})

const option = computed(() => buildAnnualOption(props.data))
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
    暂无年度数据
  </div>
</template>
