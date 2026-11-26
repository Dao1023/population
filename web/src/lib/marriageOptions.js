/**
 * /marriage 页面的 ECharts option 纯函数。
 * 组件只负责渲染，所有数值/排序/配色逻辑都在这里，便于将来静态导出复用。
 */

export const MARRIAGE_COLORS = {
  marriage: '#2563eb',
  marriageSoft: '#bfdbfe',
  divorce: '#f59e0b',
  divorcePrelim: '#fde68a',
  ratio: '#ef4444',
  province: '#3b82f6',
  axis: '#94a3b8',
  grid: '#eef2f7',
  text: '#0f172a',
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
const SPLIT_LINE = { lineStyle: { color: MARRIAGE_COLORS.grid, type: 'dashed' } }

function wan(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—'
}

/* ---------------------------------------------------------------- 年度双柱 */
export function buildAnnualOption(annual = []) {
  if (!annual.length) return {}
  const years = annual.map(r => String(r.year))
  const last = annual[annual.length - 1]

  const marriages = annual.map(r => r.marriages_wan)
  const divorces = annual.map(r => {
    if (r.divorces_wan == null) return null
    if (r.year === last.year && r.divorces_wan != null) {
      // 2025 离婚为初步数：浅色 + 虚线描边，与正式数区分
      return {
        value: r.divorces_wan,
        itemStyle: {
          color: MARRIAGE_COLORS.divorcePrelim,
          borderColor: MARRIAGE_COLORS.divorce,
          borderWidth: 1,
          borderType: 'dashed',
          borderRadius: [4, 4, 0, 0],
        },
      }
    }
    return r.divorces_wan
  })

  return {
    animationDuration: 500,
    grid: { left: 8, right: 12, top: 42, bottom: 4, containLabel: true },
    legend: {
      top: 4,
      left: 0,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 16,
      textStyle: { color: '#475569', fontSize: 11 },
    },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter(params) {
        const year = Number(params[0]?.axisValue)
        const rows = annual.find(r => r.year === year)
        if (!rows) return ''
        let html = `<div style="font-weight:600;margin-bottom:4px">${year} 年</div>`
        html += `结婚登记 <b>${wan(rows.marriages_wan)}</b> 万对<br/>`
        if (rows.divorces_wan != null) {
          const tag = year === last.year ? '（初步数）' : ''
          html += `离婚登记 <b>${wan(rows.divorces_wan)}</b> 万对${tag}`
        } else {
          html += '离婚登记 <span style="color:#94a3b8">无分年数据</span>'
        }
        return html
      },
    },
    xAxis: {
      type: 'category',
      data: years,
      axisLine: AXIS_LINE,
      axisTick: { show: false },
      axisLabel: { color: MARRIAGE_COLORS.axis, fontSize: 10, interval: 5 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: SPLIT_LINE,
      axisLabel: { color: MARRIAGE_COLORS.axis, fontSize: 10 },
    },
    series: [
      {
        name: '结婚登记',
        type: 'bar',
        data: marriages,
        barMaxWidth: 16,
        itemStyle: { color: MARRIAGE_COLORS.marriage, borderRadius: [3, 3, 0, 0] },
      },
      {
        name: '离婚登记',
        type: 'bar',
        data: divorces,
        barMaxWidth: 16,
        itemStyle: { color: MARRIAGE_COLORS.divorce, borderRadius: [3, 3, 0, 0] },
      },
    ],
  }
}

/* ---------------------------------------------------------------- 季度柱状 */
export function buildQuarterlyOption(quarterly = []) {
  if (!quarterly.length) return {}
  const labels = quarterly.map(r => `${r.year}Q${r.quarter}`)
  const values = quarterly.map(r => {
    if (r.year >= 2026) {
      // 2026 年只有前三季：空心柱，提醒不要与全年值直接比较
      return {
        value: r.marriages_wan,
        itemStyle: {
          color: 'transparent',
          borderColor: MARRIAGE_COLORS.marriage,
          borderWidth: 1.5,
          borderRadius: [3, 3, 0, 0],
        },
      }
    }
    return r.marriages_wan
  })

  return {
    animationDuration: 500,
    grid: { left: 8, right: 12, top: 16, bottom: 4, containLabel: true },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter(params) {
        const p = params[0]
        if (!p) return ''
        const row = quarterly[p.dataIndex]
        const extra = row.year >= 2026 ? '<br/><span style="color:#94a3b8;font-size:11px">截至 9 月 30 日，仅前三季</span>' : ''
        return `<div style="font-weight:600;margin-bottom:4px">${row.year} 年第 ${row.quarter} 季度</div>结婚登记 <b>${wan(row.marriages_wan)}</b> 万对${extra}`
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: AXIS_LINE,
      axisTick: { show: false },
      axisLabel: { color: MARRIAGE_COLORS.axis, fontSize: 10, interval: 3, rotate: 45, margin: 8 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: SPLIT_LINE,
      axisLabel: { color: MARRIAGE_COLORS.axis, fontSize: 10 },
    },
    series: [
      {
        name: '结婚登记',
        type: 'bar',
        data: values,
        barMaxWidth: 14,
        itemStyle: { color: MARRIAGE_COLORS.marriage, borderRadius: [3, 3, 0, 0] },
      },
    ],
  }
}

/* ---------------------------------------------------------------- 离结比折线 */
export function buildRatioOption(annual = []) {
  const rows = annual.filter(r => r.divorces_wan != null && r.divorce_marriage_ratio != null)
  if (!rows.length) return {}
  const years = rows.map(r => String(r.year))
  const values = rows.map(r => Number(r.divorce_marriage_ratio.toFixed(3)))
  const peakIdx = values.indexOf(Math.max(...values))
  const lastIdx = values.length - 1
  const points = [
    {
      name: '峰值',
      coord: [years[peakIdx], values[peakIdx]],
      value: `${rows[peakIdx].year} 峰值 ${values[peakIdx].toFixed(3)}`,
      itemStyle: { color: MARRIAGE_COLORS.ratio },
      symbolSize: 7,
      // 峰值靠右，label 右对齐向左展开，避免被画布右缘裁掉
      label: { position: 'top', align: 'right' },
    },
    {
      name: '最新',
      coord: [years[lastIdx], values[lastIdx]],
      value: `${rows[lastIdx].year} ${values[lastIdx].toFixed(3)}`,
      itemStyle: { color: MARRIAGE_COLORS.marriage },
      symbolSize: 7,
      // 末点在右边界，label 放到点的左侧
      label: { position: 'left', align: 'right', distance: 8 },
    },
  ]

  return {
    animationDuration: 500,
    grid: { left: 8, right: 16, top: 40, bottom: 4, containLabel: true },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      formatter(params) {
        const p = params[0]
        if (!p) return ''
        const row = rows[p.dataIndex]
        return `<div style="font-weight:600;margin-bottom:4px">${row.year} 年</div>离结比 <b>${row.divorce_marriage_ratio.toFixed(3)}</b><br/><span style="color:#94a3b8;font-size:11px">离婚 ${wan(row.divorces_wan)} 万对 ÷ 结婚 ${wan(row.marriages_wan)} 万对</span>`
      },
    },
    xAxis: {
      type: 'category',
      data: years,
      boundaryGap: false,
      axisLine: AXIS_LINE,
      axisTick: { show: false },
      axisLabel: { color: MARRIAGE_COLORS.axis, fontSize: 10, interval: 1 },
    },
    yAxis: {
      type: 'value',
      name: '离结比',
      min: 0,
      max: 0.7,
      nameTextStyle: { color: MARRIAGE_COLORS.axis, fontSize: 10, padding: [0, 0, 0, -8] },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: SPLIT_LINE,
      axisLabel: { color: MARRIAGE_COLORS.axis, fontSize: 10 },
    },
    series: [
      {
        name: '离结比',
        type: 'line',
        data: values,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2.5, color: MARRIAGE_COLORS.ratio },
        itemStyle: { color: MARRIAGE_COLORS.ratio },
        areaStyle: { color: 'rgba(239,68,68,0.07)' },
        markPoint: {
          symbol: 'circle',
          symbolSize: 7,
          label: {
            show: true,
            position: 'top',
            color: '#334155',
            fontSize: 10,
            backgroundColor: 'rgba(255,255,255,0.88)',
            padding: [1, 3],
            borderRadius: 3,
            formatter: params => params.value,
          },
          data: points,
        },
      },
    ],
  }
}

/* ---------------------------------------------------------------- 省份排行 */
export const PROVINCE_METRICS = [
  {
    key: 'ratio',
    label: '离结比',
    unit: '%',
    decimals: 1,
    value: p => (p.divorces_wan / p.marriages_wan) * 100,
    note: '离婚登记对数 ÷ 结婚登记对数',
  },
  {
    key: 'marriages',
    label: '结婚对数',
    unit: '万对',
    decimals: 1,
    value: p => p.marriages_wan,
    note: '结婚登记对数',
  },
  {
    key: 'first',
    label: '初婚占比',
    unit: '%',
    decimals: 1,
    value: p => (p.first_marriage_wan / (2 * p.marriages_wan)) * 100,
    note: '初婚人数 ÷ (2 × 结婚登记对数)',
  },
  {
    key: 'remarriage',
    label: '再婚占比',
    unit: '%',
    decimals: 1,
    value: p => (p.remarriage_wan / (2 * p.marriages_wan)) * 100,
    note: '再婚人数 ÷ (2 × 结婚登记对数)',
  },
]

export function getProvinceMetric(key) {
  return PROVINCE_METRICS.find(m => m.key === key) || PROVINCE_METRICS[0]
}

export function buildProvinceOption(provinces = [], metricKey = 'ratio') {
  if (!provinces.length) return {}
  const metric = getProvinceMetric(metricKey)
  // 降序后反转：ECharts 横向条形图索引 0 在最下方
  const rows = provinces
    .map(p => ({ province: p.province, raw: p, value: metric.value(p) }))
    .sort((a, b) => b.value - a.value)
    .reverse()

  return {
    animationDuration: 500,
    grid: { left: 8, right: 52, top: 8, bottom: 4, containLabel: true },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'item',
      formatter(params) {
        const row = rows[params.dataIndex]
        const p = row.raw
        return [
          `<div style="font-weight:600;margin-bottom:4px">${p.province}</div>`,
          `${metric.label} <b>${row.value.toFixed(metric.decimals)}</b>${metric.unit}`,
          `<span style="color:#94a3b8;font-size:11px">结婚 ${wan(p.marriages_wan)} 万对 · 离婚 ${wan(p.divorces_wan)} 万对</span>`,
        ].join('<br/>')
      },
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: SPLIT_LINE,
      axisLabel: {
        color: MARRIAGE_COLORS.axis,
        fontSize: 10,
        formatter: v => (metric.unit === '%' ? `${v}%` : `${v}`),
      },
    },
    yAxis: {
      type: 'category',
      data: rows.map(r => r.province),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#475569', fontSize: 11 },
    },
    series: [
      {
        name: metric.label,
        type: 'bar',
        data: rows.map(r => Number(r.value.toFixed(metric.decimals))),
        barMaxWidth: 12,
        itemStyle: { color: MARRIAGE_COLORS.province, borderRadius: [0, 3, 3, 0] },
        label: {
          show: true,
          position: 'right',
          color: '#64748b',
          fontSize: 10,
          formatter: params => `${params.value.toFixed(metric.decimals)}${metric.unit === '%' ? '%' : ''}`,
        },
      },
    ],
  }
}
