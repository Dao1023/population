/**
 * /marriage 页面「结婚率对比」的 ECharts option 纯函数。
 * 组件只负责交互与渲染，数值/配色/标注逻辑都在这里，便于将来静态导出复用。
 *
 * 数据契约：web/public/data/marriage_rate_series.json
 *   { meta: { unit, denominators }, rows: [{ year, marriages_wan, rates: {crude,...},
 *     denoms: {...}, flags: { general: 'extrapolated' } }] }
 * rates.* 允许为 null（该年该口径不可算），一律断线，绝不补 0。
 */

// 颜色固定：与页面主色一致，四条线在明暗背景上都可分辨
export const RATE_COLORS = {
  crude: '#2563eb',
  age20_39: '#f59e0b',
  age15_49: '#10b981',
  general: '#8b5cf6',
}

// 与 JSON meta.denominators 保持一致，供组件做兜底（数据文件缺 meta 时仍能渲染切换器）
export const RATE_DENOMINATORS = [
  { id: 'crude', label: '总人口', short: '总人口' },
  { id: 'age20_39', label: '20–39 岁人口', short: '20–39 岁' },
  { id: 'age15_49', label: '15–49 岁人口', short: '15–49 岁' },
  { id: 'general', label: '15 岁以上未婚人口', short: '15+ 未婚' },
]

// 默认只看官方粗结婚率 + 主口径适龄率
export const DEFAULT_RATE_IDS = ['crude', 'age20_39']

const TOOLTIP_BASE = {
  backgroundColor: '#ffffff',
  borderColor: '#e7ebf1',
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: '#0f172a', fontSize: 12 },
  extraCssText: 'border-radius:10px;box-shadow:0 8px 24px -12px rgba(15,23,42,0.25);',
}

const AXIS_LINE = { lineStyle: { color: '#e2e8f0' } }
const SPLIT_LINE = { lineStyle: { color: '#eef2f7', type: 'dashed' } }

function denomOf(id) {
  return RATE_DENOMINATORS.find(d => d.id === id) || null
}

function finiteOrNull(v) {
  return Number.isFinite(v) ? v : null
}

function round2(v, digits = 2) {
  if (!Number.isFinite(v)) return null
  return Number(v.toFixed(digits))
}

/**
 * general 口径被标为 extrapolated 的年份可能分处两端（早期外推、近期外推），
 * 按连续区间拆开返回 [{start,end}]；中间有普查实测的年份不受影响。
 */
function extrapolatedSegments(rows) {
  const segs = []
  let cur = null
  rows.forEach((r, i) => {
    if (r?.flags?.general === 'extrapolated') {
      if (!cur) {
        cur = { start: i, end: i }
        segs.push(cur)
      } else {
        cur.end = i
      }
    } else {
      cur = null
    }
  })
  return segs
}

/**
 * 选「最陡」的一条线：按首末两点的相对变化率比较，
 * 这样 4‰ 量级和 60‰ 量级可以在同一把尺子上比，不会被绝对数值大的口径抢占。
 */
function pickSteepest(rows, ids) {
  let best = null
  for (const id of ids) {
    const vals = rows.map(r => finiteOrNull(r?.rates?.[id])).filter(v => v != null)
    if (vals.length < 2) continue
    const first = vals[0]
    const last = vals[vals.length - 1]
    const base = Math.abs(first) || 1
    const change = (last - first) / base
    if (!best || change < best.change) best = { id, change }
  }
  return best?.id || ids[0] || RATE_DENOMINATORS[0].id
}

export function buildRateCompareOption(rows = [], selectedIds = DEFAULT_RATE_IDS) {
  const data = (Array.isArray(rows) ? rows : [])
    .filter(r => r && Number.isFinite(Number(r.year)))
    .slice()
    .sort((a, b) => a.year - b.year)
  if (!data.length) return {}

  const ids = (Array.isArray(selectedIds) ? selectedIds : DEFAULT_RATE_IDS).filter(id => denomOf(id))
  const walls = ids.length ? ids : DEFAULT_RATE_IDS
  const years = data.map(r => String(r.year))
  const steepestId = pickSteepest(data, walls)

  // 标注点：2013 是结婚对数峰值年，2024 是最近的完整年；
  // 只标最陡线上还存在的年份，值缺失就跳过（不允许凭坐标硬造点）。
  const MARK_YEARS = [2013, 2024]

  const series = []
  for (const id of ids) {
    const def = denomOf(id)
    const color = RATE_COLORS[id]
    const values = data.map(r => finiteOrNull(r?.rates?.[id]))
    // 只有 general 有推算年份，且可能分处两端：实线让出推算年，每段单独一条虚线接出去
    const segments = id === 'general' ? extrapolatedSegments(data) : []
    const inSegment = i => segments.some(s => i >= s.start && i <= s.end)
    const segName = s => {
      const from = data[s.start].year
      const to = data[s.end].year
      return from === to
        ? `${def.label}（${from} 年推算）`
        : `${def.label}（${from}–${to} 年推算）`
    }

    const own = []
    const baseSeries = {
      name: def.label,
      type: 'line',
      symbol: 'circle',
      symbolSize: id === 'crude' ? 4 : 3.5,
      showSymbol: true,
      connectNulls: false,
      z: id === steepestId ? 4 : 3,
      lineStyle: { width: id === 'crude' ? 2.6 : 2, color },
      itemStyle: { color },
      emphasis: { focus: 'series', scale: 1.4 },
    }

    // 实线部分：只把推算年置空
    own.push({
      ...baseSeries,
      data: values.map((v, i) => (inSegment(i) ? null : v)),
    })

    // 虚线部分：每段推算年，两端各借一个实测点作接点，虚实交界处线才不会断
    for (const seg of segments) {
      const from = Math.max(0, seg.start - 1)
      const to = Math.min(values.length - 1, seg.end + 1)
      own.push({
        ...baseSeries,
        name: segName(seg),
        data: values.map((v, i) => (i >= from && i <= to ? v : null)),
        lineStyle: { width: id === 'crude' ? 2.4 : 2, type: 'dashed', color },
        symbolSize: 3,
      })
    }

    // 标注挂到真正承载该点的 series 上（推算年份会落在对应虚线段里）
    if (id === steepestId) {
      const points = MARK_YEARS.map(year => {
        const i = data.findIndex(r => Number(r.year) === year)
        const value = i >= 0 ? values[i] : null
        if (value == null) return null
        const seg = segments.find(s => i >= s.start && i <= s.end)
        return {
          year,
          value,
          index: i,
          seriesName: seg ? segName(seg) : def.label,
          // 2024 靠右，标签向左展开并略微下移，避开折线；2013 在中部，放上方即可
          label:
            year >= 2024
              ? { position: 'left', distance: 8, align: 'right', offset: [0, 9] }
              : { position: 'top', distance: 6, align: 'center' },
        }
      }).filter(Boolean)

      const bySeries = new Map()
      for (const p of points) {
        if (!bySeries.has(p.seriesName)) bySeries.set(p.seriesName, [])
        bySeries.get(p.seriesName).push(p)
      }
      own.forEach(s => {
        const pts = bySeries.get(s.name)
        if (!pts?.length) return
        s.markPoint = {
          symbol: 'circle',
          symbolSize: 7,
          itemStyle: { color, borderColor: '#ffffff', borderWidth: 1.5 },
          label: {
            show: true,
            color: '#334155',
            fontSize: 10,
            // 白描边代替白底：折线从字间穿过但文字仍清楚，也不会在线上留一块空白
            textBorderColor: '#ffffff',
            textBorderWidth: 2.5,
            formatter: params => `${params.data.year} ${Number(params.data.value).toFixed(1)}‰`,
          },
          data: pts.map(p => ({
            name: String(p.year),
            year: p.year,
            coord: [String(p.year), p.value],
            value: p.value,
            label: p.label,
          })),
        }
      })
    }

    series.push(...own)
  }

  // 提示框按年份一次性汇总，不随 series 逐条列，避免虚线段重复一行
  const unit = '‰'
  return {
    animationDuration: 500,
    grid: { left: 8, right: 30, top: 30, bottom: 4, containLabel: true },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1', type: 'dashed' } },
      formatter(params) {
        const p = params?.[0]
        if (!p) return ''
        const row = data[p.dataIndex]
        if (!row) return ''
        let html = `<div style="font-weight:600;margin-bottom:4px">${row.year} 年</div>`
        for (const id of ids) {
          const def = denomOf(id)
          const v = round2(row?.rates?.[id])
          const extrapolated = id === 'general' && row?.flags?.general === 'extrapolated'
          const tag = extrapolated ? '<span style="color:#94a3b8;font-size:11px"> · 推算</span>' : ''
          const valueText =
            v == null
              ? '<span style="color:#94a3b8">—</span>'
              : `<b style="color:${RATE_COLORS[id]}">${v.toFixed(2)}</b> ${unit}`
          html += `<div style="line-height:1.6">${def.label} ${valueText}${tag}</div>`
        }
        html += `<div style="margin-top:4px;color:#94a3b8;font-size:11px">结婚登记 ${row.marriages_wan == null ? '—' : Number(row.marriages_wan).toFixed(1)} 万对</div>`
        return html
      },
    },
    xAxis: {
      type: 'category',
      data: years,
      boundaryGap: false,
      axisLine: AXIS_LINE,
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10, interval: index => index % 5 === 0 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      // 不锁 max：交给 ECharts 取整刻度，顶部留白靠 grid.top，避免出现 63‰ 这类刻度
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: SPLIT_LINE,
      // 单位挂在刻度上：不额外占标题位，移动端也不挤
      axisLabel: {
        color: '#94a3b8',
        fontSize: 10,
        formatter: value => `${value}${unit}`,
      },
    },
    series,
  }
}
