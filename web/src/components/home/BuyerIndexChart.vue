<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { buildBuyerIndexOption } from '../../lib/homeOptions.js'

const props = defineProps({
  housingIndex: { type: Array, default: () => [] },
  populationIndex: { type: Array, default: () => [] },
  height: { type: Number, default: 112 },
})

const option = computed(() =>
  buildBuyerIndexOption({ housingIndex: props.housingIndex, populationIndex: props.populationIndex }),
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
  <div v-else class="text-xs text-[#94a3b8]" :style="{ height: height + 'px' }">暂无指数数据</div>
</template>
