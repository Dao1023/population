/**
 * /marriage 页面「结婚率对比」的 ECharts option 纯函数。
 * 组件只负责交互与渲染，数值/配色/标注逻辑都在这里，便于将来静态导出复用。
 *
 * 数据契约：web/public/data/marriage_rate_series.json
 *   { meta: { unit, denominators }, rows: [{ year, marriages_wan, rates: {crude,...},
 *     denoms: {...}, flags: { general: 'extrapolated' }, estimated? }] }
 * rates.* 允许为 null（该年该口径不可算），一律断线，绝不补 0。
 *
 * 画法：已发布/估算的数据一律实线。general 口径在 2000–2009、2021–2026 的未婚分母
 * 是按普查剖面外推的，但结婚对数本身来自统计，因此只用文字说明估算范围，不用虚线区分。
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

    // 所有年份一律实线：已发布数据直接用；general 的外推年份只在文字里说明。
    const item = {
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
      data: values,
    }

    // 标注点：2013 是结婚对数峰值年，2024 是最近的完整年；
    // 值缺失就跳过（不允许凭坐标硬造点）。
    if (id === steepestId) {
      const points = MARK_YEARS.map(year => {
        const i = data.findIndex(r => Number(r.year) === year)
        const value = i >= 0 ? values[i] : null
        if (value == null) return null
        return {
          year,
          value,
          // 2024 靠右，标签向左展开并略微下移，避开折线；2013 在中部，放上方即可
          label:
            year >= 2024
              ? { position: 'left', distance: 8, align: 'right', offset: [0, 9] }
              : { position: 'top', distance: 6, align: 'center' },
        }
      }).filter(Boolean)

      item.markPoint = {
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
        data: points.map(p => ({
          name: String(p.year),
          year: p.year,
          coord: [String(p.year), p.value],
          value: p.value,
          label: p.label,
        })),
      }
    }

    series.push(item)
  }

  // 提示框按年份一次性汇总，不随 series 逐条列
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
          const valueText =
            v == null
              ? '<span style="color:#94a3b8">—</span>'
              : `<b style="color:${RATE_COLORS[id]}">${v.toFixed(2)}</b> ${unit}`
          html += `<div style="line-height:1.6">${def.label} ${valueText}</div>`
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
      axisLabel: {
        color: '#94a3b8',
        fontSize: 10,
        // 每 5 年一个刻度，强制保留最后一年
        interval: index => index === years.length - 1 || (index % 5 === 0 && index !== years.length - 2),
      },
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
