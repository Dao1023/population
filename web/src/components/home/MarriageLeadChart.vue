<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { buildMarriageLeadOption } from '../../lib/homeOptions.js'

const props = defineProps({
  data: { type: Array, default: () => [] },
  height: { type: Number, default: 118 },
})

const option = computed(() => buildMarriageLeadOption(props.data))
const hasData = computed(() => Boolean(option.value.series?.length))
</script>

<template>
  <v-chart
    v-if="hasData"
    :option="option"
    :style="{ height: height + 'px', width: '100%' }"
    autoresize
  />
  <div v-else class="text-xs text-[#94a3b8]" :style="{ height: height + 'px' }">暂无结婚数据</div>
</template>
