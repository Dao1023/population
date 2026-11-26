/**
 * /marriage 页面的 ECharts option 纯函数。
 * 组件只负责渲染，所有数值/排序/配色逻辑都在这里，便于将来静态导出复用。
 */

import { graphic } from 'echarts/core'

export const MARRIAGE_COLORS = {
  marriage: '#2563eb',
  marriageSoft: '#bfdbfe',
  // 反推年份（2026）用浅一档的蓝，实心、实线，与实测年份区分
  marriageEstimate: '#60a5fa',
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

/* ---------------------------------------------------------------- 年度折线 */
/**
 * 年度结婚/离婚。数据源是 marriage_annual.json（2000–2025 实测），
 * 页面运行时把 marriage_rate_series.json 里 estimated=true 的 2026 行拼到末尾。
 * 2026 用浅一档的实心点（不用虚线、不用斜纹），标签「≈数值」从数据算；离婚无 2026 数据，留空。
 */
export function buildAnnualOption(annual = []) {
  if (!annual.length) return {}
  const rows = [...annual].sort((a, b) => a.year - b.year)
  const years = rows.map(r => String(r.year))

  const marriages = rows.map(r => {
    if (r.estimated !== true) return r.marriages_wan
    return {
      value: r.marriages_wan,
      symbol: 'circle',
      symbolSize: 8,
      itemStyle: { color: MARRIAGE_COLORS.marriageEstimate },
      label: {
        show: true,
        // 末点在右边界：留出右侧留白（grid.right）后把标签放在点的右侧，
        // 既不裁切，也不会被从左上斜下的折线穿过
        position: 'right',
        distance: 6,
        color: '#475569',
        fontSize: 10,
        formatter: () => `≈${Math.round(r.marriages_wan)}`,
      },
    }
  })

  // 离婚分年数据自 2010 年起公布：之前保持 null，让折线自然断开，绝不补 0
  const lastDivorceYear = rows.filter(r => r.divorces_wan != null).at(-1)?.year
  const divorces = rows.map(r => {
    if (r.divorces_wan == null) return null
    if (r.year === lastDivorceYear) {
      // 2025 离婚为初步数：空心符号与正式数区分
      return {
        value: r.divorces_wan,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: '#ffffff', borderColor: MARRIAGE_COLORS.divorce, borderWidth: 2 },
      }
    }
    return r.divorces_wan
  })

  // 峰值/谷底只从实测年份里找：反推年份不参与「历史极值」标注
  const actual = rows.filter(r => r.estimated !== true)
  const peak = actual.reduce((a, r) => (r.marriages_wan > a.marriages_wan ? r : a), actual[0])
  const trough = actual.reduce((a, r) => (r.marriages_wan < a.marriages_wan ? r : a), actual[0])

  return {
    animationDuration: 500,
    // right 留 46：末点（2026）右侧要放「≈598」标签，太窄会被画布裁掉
    grid: { left: 8, right: 46, top: 46, bottom: 4, containLabel: true },
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
      axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1', type: 'dashed' } },
      formatter(params) {
        const year = Number(params[0]?.axisValue)
        const row = rows.find(r => r.year === year)
        if (!row) return ''
        let html = `<div style="font-weight:600;margin-bottom:4px">${year} 年</div>`
        html += `结婚登记 <b>${wan(row.marriages_wan)}</b> 万对${row.estimated ? '（推算）' : ''}<br/>`
        if (row.divorces_wan != null) {
          const tag = year === lastDivorceYear ? '（初步数）' : ''
          html += `离婚登记 <b>${wan(row.divorces_wan)}</b> 万对${tag}`
        } else if (lastDivorceYear != null && year > lastDivorceYear) {
          html += '离婚登记 <span style="color:#94a3b8">尚未公布</span>'
        } else {
          html += '离婚登记 <span style="color:#94a3b8">无分年数据</span>'
        }
        if (row.estimated) {
          html += `<div style="margin-top:4px;color:#94a3b8;font-size:11px">2026 为前三季实测 + Q4 反推，非最终数</div>`
        }
        return html
      },
    },
    xAxis: {
      type: 'category',
      data: years,
      boundaryGap: false,
      axisLine: AXIS_LINE,
      axisTick: { show: false },
      // 每 5 年一个刻度，但强制保留最后一年（2026 是推算年，不能被自动间隔吞掉）
      axisLabel: {
        color: MARRIAGE_COLORS.axis,
        fontSize: 10,
        interval: index => index === years.length - 1 || (index % 5 === 0 && index !== years.length - 2),
      },
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
        type: 'line',
        data: marriages,
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: true,
        lineStyle: { width: 2.5, color: MARRIAGE_COLORS.marriage },
        itemStyle: { color: MARRIAGE_COLORS.marriage },
        // 浅色面积渐变，只做视觉分层，不抢折线
        areaStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(37,99,235,0.12)' },
            { offset: 1, color: 'rgba(37,99,235,0.01)' },
          ]),
        },
        markPoint: {
          symbol: 'circle',
          symbolSize: 6,
          label: {
            show: true,
            color: '#334155',
            fontSize: 10,
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: [1, 3],
            borderRadius: 3,
            formatter: params => params.value,
          },
          data: [
            {
              name: '峰值',
              coord: [String(peak.year), peak.marriages_wan],
              value: `${peak.year} 峰值 ${wan(peak.marriages_wan)}`,
              label: { position: 'top' },
              itemStyle: { color: MARRIAGE_COLORS.marriage },
            },
            {
              name: '谷底',
              coord: [String(trough.year), trough.marriages_wan],
              value: `${trough.year} 谷底 ${wan(trough.marriages_wan)}`,
              // 谷底在右端附近，标签向左偏移避免小屏被裁
              label: { position: 'bottom', distance: 8, offset: [-34, 0] },
              itemStyle: { color: '#64748b' },
            },
          ],
        },
      },
      {
        name: '离婚登记',
        type: 'line',
        data: divorces,
        symbol: 'circle',
        symbolSize: 3,
        showSymbol: true,
        connectNulls: false,
        lineStyle: { width: 1.8, color: MARRIAGE_COLORS.divorce },
        itemStyle: { color: MARRIAGE_COLORS.divorce, borderColor: MARRIAGE_COLORS.divorce },
      },
    ],
  }
}

/* ---------------------------------------------------------------- 季度折线 + 环比柱 */
// 环比柱：上升绿、下降红（用户指定口径）
export const QOQ_COLORS = { up: 'rgba(22,163,74,0.72)', down: 'rgba(220,38,38,0.72)' }

/** 季度环比（%）：与上一季度相比；序列首期无上一期，返回 null。 */
export function quarterlyQoQ(quarterly = []) {
  const rows = [...quarterly].sort((a, b) => a.year - b.year || a.quarter - b.quarter)
  return rows.map((r, i) => {
    if (i === 0) return null
    const prev = rows[i - 1].marriages_wan
    if (!Number.isFinite(prev) || prev <= 0) return null
    return Number((((r.marriages_wan - prev) / prev) * 100).toFixed(2))
  })
}

/**
 * 已公布的数据一律实线：2017Q1 → 2026Q3 一条连续实线。
 * 2026 只有前三季，用页面图注说明，不再单独画虚线。
 * 柱＝季度环比（较上一季度），走右轴百分比；左轴仍是万对。
 * 环比未做季节调整，Q1 转负、Q2 转正主要是季节性，图注已提醒。
 */
export function buildQuarterlyOption(quarterly = []) {
  if (!quarterly.length) return {}
  const rows = [...quarterly].sort((a, b) => a.year - b.year || a.quarter - b.quarter)
  const labels = rows.map(r => `${r.year}Q${r.quarter}`)
  const values = rows.map(r => r.marriages_wan)
  const qoq = quarterlyQoQ(rows)
  const barData = qoq.map(v =>
    v == null ? null : { value: v, itemStyle: { color: v >= 0 ? QOQ_COLORS.up : QOQ_COLORS.down } },
  )
  // 标 2025Q2 而不是全局最高点：全局最高在 2017Q1（序列起点），
  // 标它等于标"数据从哪儿开始"，对读者没信息量。
  const pulseIdx = rows.findIndex(r => r.year === 2025 && r.quarter === 2)
  const pulse = pulseIdx >= 0 ? { i: pulseIdx, value: rows[pulseIdx].marriages_wan } : null

  return {
    animationDuration: 500,
    grid: { left: 8, right: 6, top: 36, bottom: 4, containLabel: true },
    legend: {
      show: true,
      top: 0,
      right: 0,
      itemWidth: 14,
      itemHeight: 8,
      itemGap: 14,
      textStyle: { color: MARRIAGE_COLORS.axis, fontSize: 10 },
      // 柱子是绿/红双色，图例给一个色块反而误导，所以图例只留折线，柱的含义写进图注
      data: ['结婚登记（万对）'],
    },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: { type: 'line', link: [{ xAxisIndex: 'all' }], lineStyle: { color: '#cbd5e1', width: 1 } },
      formatter(params) {
        const list = Array.isArray(params) ? params : [params]
        const idx = list.find(Boolean)?.dataIndex
        if (idx == null) return ''
        const row = rows[idx]
        const v = qoq[idx]
        const qoqColor = v == null ? '#94a3b8' : v >= 0 ? '#16a34a' : '#dc2626'
        const qoqText = v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
        const extra = row.year >= 2026 ? '<br/><span style="color:#94a3b8;font-size:11px">截至 9 月 30 日，仅前三季</span>' : ''
        return (
          `<div style="font-weight:600;margin-bottom:4px">${row.year} 年第 ${row.quarter} 季度</div>` +
          `结婚登记 <b>${wan(row.marriages_wan)}</b> 万对<br/>` +
          `环比 <b style="color:${qoqColor}">${qoqText}</b><span style="color:#94a3b8">（较上季度）</span>${extra}`
        )
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: AXIS_LINE,
      axisTick: { show: false },
      axisLabel: { color: MARRIAGE_COLORS.axis, fontSize: 10, interval: 3, rotate: 45, margin: 8 },
    },
    yAxis: [
      {
        type: 'value',
        // 左轴：登记对数，横向网格线由它负责
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: SPLIT_LINE,
        axisLabel: { color: MARRIAGE_COLORS.axis, fontSize: 10 },
      },
      {
        // 右轴：环比百分比，只画标签不画网格线，避免两套横线打架
        type: 'value',
        position: 'right',
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: MARRIAGE_COLORS.axis, fontSize: 10, formatter: '{value}%' },
      },
    ],
    series: [
      {
        name: '季度环比（%）',
        type: 'bar',
        yAxisIndex: 1,
        data: barData,
        barWidth: '46%',
        z: 2,
        itemStyle: { borderRadius: [2, 2, 0, 0] },
        markLine: {
          silent: true,
          symbol: 'none',
          label: { show: false },
          lineStyle: { color: '#cbd5e1', width: 1, type: 'solid' },
          data: [{ yAxis: 0 }],
        },
      },
      {
        name: '结婚登记（万对）',
        type: 'line',
        yAxisIndex: 0,
        data: values,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 4,
        z: 3,
        lineStyle: { width: 2, color: MARRIAGE_COLORS.marriage },
        itemStyle: { color: MARRIAGE_COLORS.marriage },
        markPoint: pulse
          ? {
              symbol: 'circle',
              symbolSize: 7,
              itemStyle: { color: MARRIAGE_COLORS.marriage },
              label: {
                position: 'top',
                offset: [10, -6],
                color: MARRIAGE_COLORS.text,
                fontSize: 10,
                formatter: () => `2025Q2 脉冲 ${wan(pulse.value)}`,
              },
              data: [{ coord: [pulse.i, pulse.value] }],
            }
          : undefined,
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

/* ------------------------------------------------- 地图：省名对齐（长名 → 短名） */
// GeoJSON（阿里 DataV 100000_full）用全称，数据用短名；此处只做精确查表，
// 不做 startsWith / includes 之类的模糊匹配，新增省份时补一行即可。
export const PROVINCE_ALIAS = {
  北京市: '北京',
  天津市: '天津',
  河北省: '河北',
  山西省: '山西',
  内蒙古自治区: '内蒙古',
  辽宁省: '辽宁',
  吉林省: '吉林',
  黑龙江省: '黑龙江',
  上海市: '上海',
  江苏省: '江苏',
  浙江省: '浙江',
  安徽省: '安徽',
  福建省: '福建',
  江西省: '江西',
  山东省: '山东',
  河南省: '河南',
  湖北省: '湖北',
  湖南省: '湖南',
  广东省: '广东',
  广西壮族自治区: '广西',
  海南省: '海南',
  重庆市: '重庆',
  四川省: '四川',
  贵州省: '贵州',
  云南省: '云南',
  西藏自治区: '西藏',
  陕西省: '陕西',
  甘肃省: '甘肃',
  青海省: '青海',
  宁夏回族自治区: '宁夏',
  新疆维吾尔自治区: '新疆',
  台湾省: '台湾',
  香港特别行政区: '香港',
  澳门特别行政区: '澳门',
}

/** 长名 → 短名；未收录的名字原样返回（例如空名的南海诸岛界线） */
export function toShortProvinceName(name) {
  return PROVINCE_ALIAS[name] ?? name
}

export const MAP_COLORS = {
  low: '#e0edff',
  mid: '#7fa5dd',
  high: '#1e3a8a',
  empty: '#f1f5f9',
  border: '#ffffff',
}

// 地图上有、但婚姻登记数据里没有的地区：固定灰色，不参与色阶，tooltip 显示「暂无数据」
export const NO_DATA_PROVINCES = ['台湾', '香港', '澳门']

/* ---------------------------------------------------------------- 省份地图 */
export function buildProvinceMapOption(provinces = [], metricKey = 'ratio') {
  if (!provinces.length) return {}
  const metric = getProvinceMetric(metricKey)
  const rows = provinces
    .map(p => ({
      name: toShortProvinceName(p.province),
      raw: p,
      value: metric.value(p),
    }))
    .filter(r => Number.isFinite(r.value))
    .sort((a, b) => b.value - a.value)

  if (!rows.length) return {}
  const byName = new Map(rows.map(r => [r.name, r]))
  const values = rows.map(r => r.value)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  // 色阶端点必须等于真实极值：如果两端各留 4% 余量，图例上标的"低/高"
  // 就不是数据里的最低/最高，读者会以为还有更极端的省没画出来。
  const factor = Math.pow(10, metric.decimals)
  const vMin = Math.round(lo * factor) / factor
  const vMax = Math.round(hi * factor) / factor

  return {
    animationDuration: 500,
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'item',
      formatter(params) {
        const row = byName.get(params.name)
        if (!row) {
          return `<div style="font-weight:600;margin-bottom:2px">${params.name || '南海诸岛'}</div><span style="color:#94a3b8">暂无数据</span>`
        }
        const p = row.raw
        return [
          `<div style="font-weight:600;margin-bottom:4px">${row.name} · ${row.value.toFixed(metric.decimals)}${metric.unit}</div>`,
          `<span style="color:#64748b">${metric.label}</span>`,
          `<span style="color:#94a3b8;font-size:11px">结婚 ${wan(p.marriages_wan)} 万对 · 离婚 ${wan(p.divorces_wan)} 万对</span>`,
        ].join('<br/>')
      },
    },
    visualMap: {
      type: 'continuous',
      seriesIndex: 0,
      min: vMin,
      max: vMax,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 8,
      itemWidth: 11,
      itemHeight: 120,
      itemGap: 8,
      textGap: 10,
      precision: metric.decimals,
      text: [`高 ${vMax}${metric.unit}`, `低 ${vMin}${metric.unit}`],
      textStyle: { color: '#94a3b8', fontSize: 10 },
      inRange: { color: [MAP_COLORS.low, MAP_COLORS.mid, MAP_COLORS.high] },
      outOfRange: { color: MAP_COLORS.empty },
    },
    series: [
      {
        name: metric.label,
        type: 'map',
        map: 'china',
        roam: false,
        selectedMode: false,
        // 保持地图本身的比例，别被容器拉扁平
        preserveAspect: true,
        aspectScale: 1,
        // 只把大陆+海南/台湾纳入布局框，南海诸岛不参与排版
        boundingCoords: [
          [73.4, 53.7],
          [135.2, 17.6],
        ],
        top: 6,
        bottom: 30,
        left: 6,
        right: 6,
        // 移动端不显示省名，避免互相压字
        label: { show: false },
        itemStyle: {
          // 无数据region（港澳台等）保持浅灰，不参与色阶
          areaColor: MAP_COLORS.empty,
          borderColor: MAP_COLORS.border,
          borderWidth: 1,
        },
        emphasis: {
          label: { show: true, color: '#0f172a', fontSize: 11, fontWeight: 600 },
          itemStyle: {
            areaColor: '#fbbf24',
            borderColor: '#ffffff',
            borderWidth: 1.5,
            shadowBlur: 8,
            shadowColor: 'rgba(15,23,42,0.2)',
          },
        },
        data: [
          ...rows.map(r => ({ name: r.name, value: Number(r.value.toFixed(metric.decimals)) })),
          // 港澳台：显式给 null 值（不是 0），命中 outOfRange 灰，且 tooltip 才有内容
          ...NO_DATA_PROVINCES.filter(name => !byName.has(name)).map(name => ({ name, value: null })),
        ],
      },
    ],
  }
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
