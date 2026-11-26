/**
 * 首页六屏的 ECharts option 纯函数。
 * 组件只负责渲染；数值、坐标、配色都在这里，模板里不出现裸数字数组。
 */

export const HOME_COLORS = {
  primary: '#2563eb',
  primaryDeep: '#1d4ed8',
  soft: '#93c5fd',
  pale: '#dbeafe',
  pulse: '#f59e0b',
  muted: '#94a3b8',
  axis: '#94a3b8',
  grid: '#eef2f7',
  text: '#0f172a',
  band: 'rgba(37,99,235,0.10)',
}

const TOOLTIP_BASE = {
  backgroundColor: '#ffffff',
  borderColor: '#e7ebf1',
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: '#0f172a', fontSize: 12 },
  extraCssText: 'border-radius:10px;box-shadow:0 8px 24px -12px rgba(15,23,42,0.25);',
}

const AXIS_LINE = { lineStyle: { color: '#e2e8f0' } }
const SPLIT_LINE = { lineStyle: { color: HOME_COLORS.grid, type: 'dashed' } }

const MINUS = '−'

export function wan(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—'
}

/* ------------------------------------------------------------ 第 1 屏：年度折线 */

export function buildAnnualHeroOption(annual = []) {
  if (!annual.length) return {}
  const years = annual.map(r => String(r.year))
  const values = annual.map(r => r.marriages_wan)
  const peak = annual.reduce((m, r) => (r.marriages_wan > m.marriages_wan ? r : m), annual[0])
  const trough = annual.reduce((m, r) => (r.marriages_wan < m.marriages_wan ? r : m), annual[0])
  const peakIdx = annual.indexOf(peak)
  const troughIdx = annual.indexOf(trough)

  return {
    animation: true,
    grid: { left: 6, right: 20, top: 40, bottom: 4, containLabel: true },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      formatter(params) {
        const p = params[0]
        return `${p.axisValue} 年<br/><b>${wan(p.value)}</b> 万对`
      },
    },
    xAxis: {
      type: 'category',
      data: years,
      boundaryGap: false,
      axisLine: AXIS_LINE,
      axisTick: { show: false },
      axisLabel: { color: HOME_COLORS.axis, fontSize: 10, interval: 4 },
    },
    yAxis: {
      type: 'value',
      min: 500,
      max: 1400,
      interval: 300,
      axisLabel: { color: HOME_COLORS.axis, fontSize: 10 },
      splitLine: SPLIT_LINE,
    },
    series: [
      {
        name: '结婚登记',
        type: 'line',
        smooth: 0.25,
        showSymbol: false,
        data: values,
        lineStyle: { width: 2.4, color: HOME_COLORS.primary },
        itemStyle: { color: HOME_COLORS.primary },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(37,99,235,0.18)' },
              { offset: 1, color: 'rgba(37,99,235,0.01)' },
            ],
          },
        },
        markPoint: {
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: { color: HOME_COLORS.primary, borderColor: '#ffffff', borderWidth: 2 },
          label: {
            show: true,
            color: '#334155',
            fontSize: 10.5,
            fontWeight: 600,
            formatter: p => p.name,
          },
          data: [
            {
              name: `${peak.year} 峰值 ${peak.marriages_wan}`,
              value: peak.marriages_wan,
              coord: [peakIdx, peak.marriages_wan],
              label: { position: 'top' },
            },
            {
              name: `${trough.year} 谷底 ${trough.marriages_wan}`,
              value: trough.marriages_wan,
              coord: [troughIdx, trough.marriages_wan],
              label: { position: 'bottom' },
            },
          ],
        },
      },
    ],
  }
}

/* ------------------------------------------------------------ 第 2 屏：瀑布 */

/**
 * 4 段瀑布：2013 年总量 → 人口结构效应 → 结婚强度效应 → 2024 年总量。
 * 用「透明占位 + 可见段」两组堆叠柱实现，段与段之间不留缝。
 */
export function buildWaterfallOption({
  start,
  end,
  startYear,
  endYear,
  populationEffect,
  populationShare,
  intensityShare,
}) {
  const intensity = Number((end - start - populationEffect).toFixed(1))
  const popAbs = Math.abs(populationEffect)
  const intAbs = Math.abs(intensity)
  const startBottom = 0
  const popBottom = end + intAbs
  const intBottom = end
  const endBottom = 0

  const totalLabel = value => ({
    show: true,
    position: 'top',
    distance: 7,
    color: HOME_COLORS.text,
    fontSize: 12.5,
    fontWeight: 700,
    formatter: () => `${wan(value)}`,
  })
  const deltaLabel = (value, share) => ({
    show: true,
    position: 'top',
    distance: 7,
    color: HOME_COLORS.primary,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 16,
    formatter: () => `${MINUS}${Math.round(value)}\n${share}%`,
  })

  return {
    animationDuration: 600,
    grid: { left: 6, right: 14, top: 46, bottom: 4, containLabel: true },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter(params) {
        const i = params[0]?.dataIndex
        if (i === 0) return `${startYear} 年<br/>结婚登记 <b>${wan(start)}</b> 万对`
        if (i === 3) return `${endYear} 年<br/>结婚登记 <b>${wan(end)}</b> 万对`
        if (i === 1) {
          return `人口结构效应<br/><b>${MINUS}${wan(popAbs, 0)}</b> 万对（${populationShare}%）<br/><span style="color:#94a3b8;font-size:11px">25–34 岁人口减少 14.8%</span>`
        }
        return `结婚强度效应<br/><b>${MINUS}${Math.round(intAbs)}</b> 万对（${intensityShare}%）<br/><span style="color:#94a3b8;font-size:11px">分年龄结婚比例下降</span>`
      },
    },
    xAxis: {
      type: 'category',
      data: [`${startYear} 年`, '人口结构', '结婚强度', `${endYear} 年`],
      axisLine: AXIS_LINE,
      axisTick: { show: false },
      axisLabel: { color: '#475569', fontSize: 11.5, fontWeight: 600, margin: 10 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1500,
      interval: 500,
      axisLabel: { color: HOME_COLORS.axis, fontSize: 10, formatter: v => `${v}` },
      splitLine: SPLIT_LINE,
    },
    series: [
      {
        name: '连接',
        type: 'line',
        step: 'end',
        silent: true,
        symbol: 'none',
        lineStyle: { color: '#cbd5e1', width: 1, type: [3, 3] },
        emphasis: { disabled: true },
        tooltip: { show: false },
        data: [start, end + intAbs, end, end],
        z: 1,
      },
      {
        name: '占位',
        type: 'bar',
        stack: 'waterfall',
        silent: true,
        barMaxWidth: 92,
        itemStyle: { color: 'transparent' },
        emphasis: { disabled: true },
        data: [startBottom, popBottom, intBottom, endBottom],
        z: 1,
      },
      {
        name: '结婚登记',
        type: 'bar',
        stack: 'waterfall',
        barMaxWidth: 92,
        data: [
          {
            value: start,
            itemStyle: { color: HOME_COLORS.primaryDeep, borderRadius: [5, 5, 0, 0] },
            label: totalLabel(start),
          },
          {
            value: popAbs,
            itemStyle: { color: HOME_COLORS.soft, borderRadius: [4, 4, 0, 0] },
            label: deltaLabel(popAbs, populationShare),
          },
          {
            value: intAbs,
            itemStyle: { color: HOME_COLORS.soft, borderRadius: [4, 4, 0, 0] },
            label: deltaLabel(intAbs, intensityShare),
          },
          {
            value: end,
            itemStyle: { color: HOME_COLORS.primary, borderRadius: [5, 5, 0, 0] },
            label: totalLabel(end),
          },
        ],
        z: 2,
      },
    ],
  }
}

/* ------------------------------------------------------------ 第 3 屏：季度柱 */

export function buildQuarterPulseOption(quarterly = []) {
  if (!quarterly.length) return {}
  const labels = quarterly.map(r => `${r.year}Q${r.quarter}`)
  const values = quarterly.map(r => {
    if (r.year >= 2026) {
      return {
        value: r.marriages_wan,
        itemStyle: {
          color: 'transparent',
          borderColor: HOME_COLORS.primary,
          borderWidth: 1.5,
          borderRadius: [3, 3, 0, 0],
        },
      }
    }
    if (r.year === 2025) {
      return {
        value: r.marriages_wan,
        itemStyle: { color: HOME_COLORS.pulse, borderRadius: [3, 3, 0, 0] },
      }
    }
    return {
      value: r.marriages_wan,
      itemStyle: { color: HOME_COLORS.primary, opacity: 0.82, borderRadius: [3, 3, 0, 0] },
    }
  })

  return {
    animationDuration: 600,
    grid: { left: 30, right: 12, top: 18, bottom: 6, containLabel: true },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter(params) {
        const p = params[0]
        if (!p) return ''
        const row = quarterly[p.dataIndex]
        const extra =
          row.year >= 2026
            ? '<br/><span style="color:#94a3b8;font-size:11px">截至 9 月 30 日，仅前三季</span>'
            : row.year === 2025
              ? '<br/><span style="color:#94a3b8;font-size:11px">全国通办后的脉冲</span>'
              : ''
        return `<div style="font-weight:600;margin-bottom:4px">${row.year} 年第 ${row.quarter} 季度</div>结婚登记 <b>${wan(row.marriages_wan)}</b> 万对${extra}`
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: AXIS_LINE,
      axisTick: { show: false },
      axisLabel: { color: HOME_COLORS.axis, fontSize: 9.5, interval: 3, rotate: 45, margin: 8 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 360,
      interval: 120,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: SPLIT_LINE,
      axisLabel: { color: HOME_COLORS.axis, fontSize: 10 },
    },
    series: [
      {
        name: '结婚登记',
        type: 'bar',
        barMaxWidth: 13,
        data: values,
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#cbd5e1', type: 'dashed', width: 1 },
          label: { show: false },
          data: [{ xAxis: '2026Q1' }],
        },
      },
    ],
  }
}

/* ------------------------------------------------------------ 第 4 屏：两条指数线 */

export function buildBuyerIndexOption({ housingIndex = [], populationIndex = [] } = {}) {
  if (!housingIndex.length || !populationIndex.length) return {}
  const years = housingIndex.map(d => String(d.year))

  return {
    animation: true,
    grid: { left: 28, right: 44, top: 12, bottom: 18 },
    tooltip: { show: false },
    xAxis: {
      type: 'category',
      data: years,
      boundaryGap: false,
      axisLine: AXIS_LINE,
      axisTick: { show: false },
      axisLabel: { color: HOME_COLORS.axis, fontSize: 9.5 },
    },
    yAxis: {
      type: 'value',
      min: 0.5,
      max: 1.1,
      interval: 0.2,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: SPLIT_LINE,
      axisLabel: { color: HOME_COLORS.axis, fontSize: 9, formatter: v => v.toFixed(1) },
    },
    series: [
      {
        name: '总人口',
        type: 'line',
        symbol: 'circle',
        symbolSize: 5,
        data: populationIndex.map(d => d.value),
        lineStyle: { width: 1.8, color: HOME_COLORS.muted, type: 'dashed' },
        itemStyle: { color: HOME_COLORS.muted },
        endLabel: {
          show: true,
          color: HOME_COLORS.muted,
          fontSize: 10,
          fontWeight: 600,
          formatter: p => p.value.toFixed(3),
        },
        silent: true,
      },
      {
        name: '婚房需求指数',
        type: 'line',
        symbol: 'circle',
        symbolSize: 5,
        data: housingIndex.map(d => d.value),
        lineStyle: { width: 2.2, color: HOME_COLORS.primary },
        itemStyle: { color: HOME_COLORS.primary },
        areaStyle: { color: 'rgba(37,99,235,0.08)' },
        endLabel: {
          show: true,
          color: HOME_COLORS.primary,
          fontSize: 10.5,
          fontWeight: 700,
          formatter: p => p.value.toFixed(3),
        },
        silent: true,
      },
    ],
  }
}

/* ------------------------------------------------------------ 第 4 屏：结婚折线（迷你） */

export function buildMarriageLeadOption(annual = []) {
  const rows = annual.filter(r => r.year >= 2010)
  if (!rows.length) return {}
  const years = rows.map(r => String(r.year))
  const values = rows.map(r => r.marriages_wan)
  const last = rows[rows.length - 1]
  const prev = rows[rows.length - 2]

  return {
    animation: true,
    grid: { left: 4, right: 30, top: 14, bottom: 14, containLabel: true },
    tooltip: { show: false },
    xAxis: {
      type: 'category',
      data: years,
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: HOME_COLORS.axis, fontSize: 9, interval: 5 },
    },
    yAxis: {
      type: 'value',
      min: 550,
      max: 1400,
      splitNumber: 2,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: SPLIT_LINE,
      axisLabel: { show: false },
    },
    series: [
      {
        type: 'line',
        smooth: 0.2,
        showSymbol: false,
        data: values,
        lineStyle: { width: 2, color: HOME_COLORS.primary },
        itemStyle: { color: HOME_COLORS.primary },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(37,99,235,0.16)' },
              { offset: 1, color: 'rgba(37,99,235,0.01)' },
            ],
          },
        },
        markPoint: {
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: HOME_COLORS.primary, borderColor: '#ffffff', borderWidth: 1.5 },
          label: { show: true, color: '#334155', fontSize: 9.5, fontWeight: 700, formatter: p => p.name },
          data: [
            {
              name: `${prev.marriages_wan}`,
              value: prev.marriages_wan,
              coord: [years.length - 2, prev.marriages_wan],
              label: { position: 'bottom' },
            },
            {
              name: `${last.marriages_wan}`,
              value: last.marriages_wan,
              coord: [years.length - 1, last.marriages_wan],
              label: { position: 'top' },
            },
          ],
        },
      },
    ],
  }
}

/* ------------------------------------------------------------ 第 5 屏：情景带 */

export function buildScenarioOption({ actual = [], scenario = [], bandPct = 0.08 } = {}) {
  if (!actual.length || !scenario.length) return {}
  const lastActual = actual[actual.length - 1]
  const firstYear = actual[0].year
  const lastYear = scenario[scenario.length - 1].year

  // 情景点用线性插值铺满每一年：2025 实测值为起点，2030 / 2035 / … 为锚点
  const anchors = [{ year: lastActual.year, value: lastActual.marriages_wan }, ...scenario]
  const scenValue = year => {
    if (year <= anchors[0].year) return anchors[0].value
    for (let i = 1; i < anchors.length; i++) {
      const a = anchors[i - 1]
      const b = anchors[i]
      if (year <= b.year) {
        const t = (year - a.year) / (b.year - a.year)
        return a.value + (b.value - a.value) * t
      }
    }
    return anchors[anchors.length - 1].value
  }

  const years = []
  for (let y = firstYear; y <= lastYear; y++) years.push(y)

  const actualMap = new Map(actual.map(r => [r.year, r.marriages_wan]))
  const actualData = years.map(y => (y <= lastActual.year ? (actualMap.get(y) ?? null) : null))
  const scenData = years.map(y => (y >= lastActual.year ? Number(scenValue(y).toFixed(1)) : null))
  const bandLow = years.map(y => (y >= lastActual.year ? Number((scenValue(y) * (1 - bandPct)).toFixed(1)) : null))
  const bandWidth = years.map(y =>
    y >= lastActual.year ? Number((scenValue(y) * 2 * bandPct).toFixed(1)) : null,
  )

  const peakPoint = scenario.reduce((m, p) => (p.value > m.value ? p : m), scenario[0])
  const lastPoint = scenario[scenario.length - 1]

  return {
    animationDuration: 700,
    grid: { left: 8, right: 18, top: 42, bottom: 4, containLabel: true },
    legend: {
      top: 2,
      left: 0,
      itemWidth: 12,
      itemHeight: 8,
      itemGap: 18,
      textStyle: { color: '#475569', fontSize: 11 },
      data: ['实测', '情景'],
    },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      formatter(params) {
        const i = params[0]?.dataIndex
        const y = years[i]
        if (y == null) return ''
        const v = y <= lastActual.year ? actualData[i] : scenData[i]
        if (v == null) return ''
        const tag = y <= lastActual.year ? '' : '<br/><span style="color:#94a3b8;font-size:11px">情景推演，非预测</span>'
        return `${y} 年<br/><b>${wan(v)}</b> 万对${tag}`
      },
    },
    xAxis: {
      type: 'category',
      data: years.map(String),
      axisLine: AXIS_LINE,
      axisTick: { show: false },
      axisLabel: {
        color: HOME_COLORS.axis,
        fontSize: 10,
        interval: (idx, value) => [firstYear, 2020, 2030, 2040, 2050].includes(Number(value)),
      },
    },
    yAxis: {
      type: 'value',
      min: 400,
      max: 1400,
      interval: 200,
      axisLabel: { color: HOME_COLORS.axis, fontSize: 10 },
      splitLine: SPLIT_LINE,
    },
    series: [
      {
        name: '区间下沿',
        type: 'line',
        stack: 'band',
        silent: true,
        symbol: 'none',
        lineStyle: { opacity: 0 },
        areaStyle: { color: 'transparent' },
        data: bandLow,
        z: 1,
      },
      {
        name: '±8% 区间',
        type: 'line',
        stack: 'band',
        silent: true,
        symbol: 'none',
        lineStyle: { opacity: 0 },
        areaStyle: { color: HOME_COLORS.band },
        data: bandWidth,
        z: 2,
      },
      {
        name: '实测',
        type: 'line',
        showSymbol: false,
        data: actualData,
        lineStyle: { width: 2.6, color: HOME_COLORS.primaryDeep },
        itemStyle: { color: HOME_COLORS.primaryDeep },
        z: 3,
        markPoint: {
          symbol: 'circle',
          symbolSize: 7,
          itemStyle: { color: HOME_COLORS.primaryDeep, borderColor: '#ffffff', borderWidth: 2 },
          label: { show: true, color: '#334155', fontSize: 10.5, fontWeight: 700, formatter: p => p.name },
          data: [
            {
              name: `${lastActual.marriages_wan}`,
              value: lastActual.marriages_wan,
              coord: [years.indexOf(lastActual.year), lastActual.marriages_wan],
              label: { position: 'top' },
            },
          ],
        },
      },
      {
        name: '情景',
        type: 'line',
        showSymbol: false,
        data: scenData,
        lineStyle: { width: 2.2, color: HOME_COLORS.primary, type: 'dashed' },
        itemStyle: { color: HOME_COLORS.primary },
        z: 4,
        markPoint: {
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: HOME_COLORS.primary, borderColor: '#ffffff', borderWidth: 1.5 },
          label: { show: true, color: HOME_COLORS.primary, fontSize: 10.5, fontWeight: 700, formatter: p => p.name },
          data: [
            {
              name: `${peakPoint.value}`,
              value: peakPoint.value,
              coord: [years.indexOf(peakPoint.year), peakPoint.value],
              label: { position: 'top' },
            },
            {
              name: `${lastPoint.value}`,
              value: lastPoint.value,
              coord: [years.indexOf(lastPoint.year), lastPoint.value],
              label: { position: 'bottom' },
            },
          ],
        },
      },
    ],
  }
}
