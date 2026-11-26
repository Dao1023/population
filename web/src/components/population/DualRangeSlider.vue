<script setup>
import { computed } from 'vue'

const props = defineProps({
  min: Number,
  max: Number,
  start: Number,
  end: Number,
})

const emit = defineEmits(['update:start', 'update:end'])

const rangeStyle = computed(() => {
  const total = props.max - props.min
  const left = ((props.start - props.min) / total) * 100
  const right = ((props.max - props.end) / total) * 100
  return { left: left + '%', right: right + '%' }
})

function onStartInput(e) {
  emit('update:start', Math.min(Number(e.target.value), props.end))
}

function onEndInput(e) {
  emit('update:end', Math.max(Number(e.target.value), props.start))
}
</script>

<template>
  <div class="flex items-center gap-4">
    <span class="text-sm font-mono">{{ start }}</span>
    <div class="dual-range flex-1">
      <div class="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-base-content/15">
        <div class="absolute top-0 bottom-0 rounded-full bg-primary/50" :style="rangeStyle"></div>
      </div>
      <input type="range" :min="min" :max="max" :value="start" @input="onStartInput" />
      <input type="range" :min="min" :max="max" :value="end" @input="onEndInput" />
    </div>
    <span class="text-sm font-mono">{{ end }}</span>
  </div>
</template>

<style>
.dual-range {
  position: relative;
  height: 30px;
}

.dual-range input[type="range"] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  pointer-events: none;
  margin: 0;
  padding: 0;
  outline: none;
  z-index: 2;
}

.dual-range input[type="range"]::-webkit-slider-runnable-track {
  background: transparent;
}

.dual-range input[type="range"]::-moz-range-track {
  background: transparent;
}

.dual-range input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  pointer-events: all;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #5b21b6;
  border: 3px solid white;
  cursor: pointer;
  margin-top: -7px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.dual-range input[type="range"]::-moz-range-thumb {
  pointer-events: all;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #5b21b6;
  border: 3px solid white;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
</style>
