<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { buildWaterfallOption } from '../../lib/homeOptions.js'

const props = defineProps({
  start: { type: Number, required: true },
  end: { type: Number, required: true },
  startYear: { type: Number, required: true },
  endYear: { type: Number, required: true },
  populationEffect: { type: Number, required: true },
  populationShare: { type: Number, required: true },
  intensityShare: { type: Number, required: true },
  height: { type: Number, default: 340 },
})

const option = computed(() =>
  buildWaterfallOption({
    start: props.start,
    end: props.end,
    startYear: props.startYear,
    endYear: props.endYear,
    populationEffect: props.populationEffect,
    populationShare: props.populationShare,
    intensityShare: props.intensityShare,
  }),
)
</script>

<template>
  <v-chart :option="option" :style="{ height: height + 'px', width: '100%' }" autoresize />
</template>
