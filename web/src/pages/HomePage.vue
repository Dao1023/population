<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'

// 结婚登记对数（万对），2000–2025。里程碑 5 再接 JSON。
const ANNUAL_MARRIAGES = [
  [2000, 848.5], [2001, 805.0], [2002, 786.0], [2003, 811.4], [2004, 867.2],
  [2005, 823.1], [2006, 945.0], [2007, 991.4], [2008, 1098.3], [2009, 1212.2],
  [2010, 1241.0], [2011, 1302.4], [2012, 1323.6], [2013, 1346.9], [2014, 1306.7],
  [2015, 1224.7], [2016, 1142.8], [2017, 1063.1], [2018, 1013.9], [2019, 927.3],
  [2020, 814.3], [2021, 763.6], [2022, 683.5], [2023, 768.0], [2024, 610.6],
  [2025, 731.0],
]

const years = ANNUAL_MARRIAGES.map(([year]) => String(year))
const values = ANNUAL_MARRIAGES.map(([, value]) => value)

const chartOption = computed(() => ({
  animation: true,
  grid: { left: 6, right: 20, top: 40, bottom: 4, containLabel: true },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#ffffff',
    borderColor: '#e7ebf1',
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: '#0f172a', fontSize: 12 },
    formatter(params) {
      const p = params[0]
      return `${p.axisValue} 年<br/><b>${p.value}</b> 万对`
    },
  },
  xAxis: {
    type: 'category',
    data: years,
    boundaryGap: false,
    axisLine: { lineStyle: { color: '#e2e8f0' } },
    axisTick: { show: false },
    axisLabel: { color: '#94a3b8', fontSize: 10, interval: 4 },
  },
  yAxis: {
    type: 'value',
    min: 500,
    max: 1400,
    splitNumber: 3,
    axisLabel: { color: '#94a3b8', fontSize: 10 },
    splitLine: { lineStyle: { color: '#eef2f7' } },
  },
  series: [
    {
      name: '结婚登记',
      type: 'line',
      smooth: 0.25,
      showSymbol: false,
      data: values,
      lineStyle: { width: 2.4, color: '#2563eb' },
      itemStyle: { color: '#2563eb' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(37,99,235,0.18)' },
            { offset: 1, color: 'rgba(37,99,235,0.01)' },
          ],
        },
      },
      markPoint: {
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: '#2563eb', borderColor: '#ffffff', borderWidth: 2 },
        label: {
          show: true,
          color: '#334155',
          fontSize: 10.5,
          fontWeight: 600,
          formatter: (p) => p.name,
        },
        data: [
          { name: '2013 峰值 1346.9', value: 1346.9, coord: [13, 1346.9], label: { position: 'top' } },
          { name: '2024 谷底 610.6', value: 610.6, coord: [24, 610.6], label: { position: 'bottom' } },
        ],
      },
    },
  ],
}))

const upcomingScreens = [
  { no: '02', tag: '拆解', title: '少掉的 736 万对里，只有四分之一是人少了' },
  { no: '03', tag: '近期', title: '2025 年多结了 120 万对，只维持了两个季度' },
  { no: '04', tag: '视角', title: '三个视角：想买房的 / 关心人口的 / 看投资的' },
]
</script>

<template>
  <div>
    <!-- 第 1 屏 -->
    <section class="grid gap-5 pb-5 pt-9 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-10">
      <div>
        <p class="kick"><i class="block h-1 w-1 rounded-full bg-[#2563eb]"></i>01 数据特稿</p>
        <h1 class="mt-4 text-[32px] font-bold leading-[1.2] tracking-[-0.025em] text-[#0f172a] sm:text-[42px] lg:text-[50px]">
          736 万对婚姻，去哪了
        </h1>
      </div>
      <p class="max-w-[34em] border-l-2 border-[#2563eb] pl-4 text-sm leading-7 text-[#64748b] max-lg:border-l-0 max-lg:pl-0">
        2013 到 2024，中国结婚登记少了一半。是人少了，还是婚不结了？
      </p>
    </section>

    <section class="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
      <!-- 巨型数字 -->
      <div class="panel relative flex min-h-[230px] flex-col justify-between gap-5 overflow-hidden p-6">
        <div class="pointer-events-none absolute -right-10 -top-10 h-[150px] w-[150px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.10),rgba(37,99,235,0)_70%)]"></div>
        <div>
          <div class="text-xs font-medium tracking-wide text-[#64748b]">2024 年全国结婚登记</div>
          <div class="mt-2 text-[62px] font-extrabold leading-[0.95] tracking-[-0.04em] tabular-nums text-[#0f172a] sm:text-[76px]">
            611<span class="ml-1 text-[0.3em] font-semibold tracking-normal text-[#64748b]">万对</span>
          </div>
        </div>
        <div class="flex items-center gap-2 border-t border-[#eef2f7] pt-3 text-[11.5px] text-[#64748b]">
          <i class="block h-1.5 w-1.5 flex-none rounded-full bg-[#22c55e] shadow-[0_0_0_3px_rgba(34,197,94,0.15)]"></i>
          数据截至 2025 年，2026 年前三季已出
        </div>
      </div>

      <!-- 折线图 -->
      <div class="panel flex flex-col p-5">
        <div class="mb-1 flex items-center justify-between gap-3">
          <b class="text-[12.5px] font-semibold tracking-wide text-[#334155]">结婚登记对数 · 万对</b>
          <span class="rounded-full border border-[#e7ebf1] bg-[#f8fafc] px-2.5 py-0.5 text-[11px] tabular-nums text-[#64748b]">2000–2025</span>
        </div>
        <VChart class="h-[240px] w-full" :option="chartOption" autoresize />
      </div>
    </section>

    <!-- 后续屏占位 -->
    <div class="mt-6 space-y-3">
      <div
        v-for="screen in upcomingScreens"
        :key="screen.no"
        class="panel flex flex-col gap-3 border-dashed p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <span class="kick w-fit"><i class="block h-1 w-1 rounded-full bg-[#2563eb]"></i>{{ screen.no }} {{ screen.tag }}</span>
          <h2 class="text-base font-semibold text-[#334155]">{{ screen.title }}</h2>
        </div>
        <span class="whitespace-nowrap text-[11.5px] text-[#94a3b8]">第 {{ Number(screen.no) }} 屏 · 建设中</span>
      </div>
    </div>
  </div>
</template>
