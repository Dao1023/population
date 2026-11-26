<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import VChart from 'vue-echarts'
import { buildProvinceMapOption } from '../../lib/marriageOptions.js'
import { loadChinaMap } from '../../lib/chinaMap.js'

const props = defineProps({
  data: { type: Array, default: () => [] },
  metric: { type: String, default: 'ratio' },
})

const ready = ref(false)
const loading = ref(true)
const error = ref('')

// v-chart 根节点是 x-vue-echarts（自带 height:100%），高度必须走内联 style，
// 用 window 宽度切成 小屏 300 / 桌面 400
const narrow = ref(typeof window !== 'undefined' && window.innerWidth < 640)
const mapHeight = computed(() => (narrow.value ? 300 : 400))

const option = computed(() => buildProvinceMapOption(props.data, props.metric))
const hasData = computed(() => Boolean(option.value.series?.length))

function syncViewport() {
  narrow.value = window.innerWidth < 640
}

async function ensureMap() {
  loading.value = true
  error.value = ''
  try {
    await loadChinaMap()
    ready.value = true
  } catch (e) {
    ready.value = false
    error.value = e?.message || '地图数据加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  window.addEventListener('resize', syncViewport)
  ensureMap()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
})
</script>

<template>
  <div class="w-full">
    <!-- 地图 GeoJSON 单独异步加载：先占位，不白屏 -->
    <div
      v-if="loading"
      class="w-full animate-pulse rounded-lg bg-[#eef2f7]"
      :style="{ height: mapHeight + 'px' }"
      aria-busy="true"
      aria-label="正在加载中国地图"
    ></div>

    <div
      v-else-if="error"
      class="flex w-full flex-col items-center justify-center gap-2 text-center"
      :style="{ height: mapHeight + 'px' }"
    >
      <span class="text-xs font-medium text-[#dc2626]">地图加载失败</span>
      <span class="max-w-xs break-words text-[11px] text-[#94a3b8]">{{ error }}</span>
      <button type="button" class="btn btn-primary btn-sm" @click="ensureMap">重试</button>
    </div>

    <v-chart
      v-else-if="ready && hasData"
      :option="option"
      :style="{ height: mapHeight + 'px', width: '100%' }"
      autoresize
    />
    <div
      v-else
      class="flex w-full items-center justify-center text-xs text-[#94a3b8]"
      :style="{ height: mapHeight + 'px' }"
    >
      暂无省份数据
    </div>
  </div>
</template>
