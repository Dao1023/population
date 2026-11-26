/**
 * 数据校验：跑在 csv2json 之后，校验 web/public/data 里的产物。
 * 任何一条断言失败 -> process.exit(1)。
 *
 * 用法：pnpm validate（在 web/ 下）或 node scripts/validate_data.mjs
 */
import { readFileSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const dataDir = join(rootDir, 'web', 'public', 'data')

const failures = []
let passed = 0

function load(name) {
  const path = join(dataDir, name)
  try {
    return JSON.parse(readFileSync(path, 'utf-8').replace(/^\uFEFF/, ''))
  } catch (e) {
    failures.push(`${name} 读取/解析失败：${e.message}`)
    return null
  }
}

function check(label, condition, detail = '') {
  if (condition) {
    passed++
    console.log(`  ✓ ${label}${detail ? ' — ' + detail : ''}`)
  } else {
    failures.push(`${label}${detail ? ' — ' + detail : ''}`)
    console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`)
  }
}

function near(actual, expected, tol) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= tol
}

const quarterly = load('marriage_quarterly.json')
const annual = load('marriage_annual.json')
const provinces = load('marriage_provinces.json')
const meta = load('marriage_meta.json')

console.log('\n[季度] marriage_quarterly.json')
if (quarterly) {
  check('行数 = 39', quarterly.length === 39, `实际 ${quarterly.length}`)
  const keys = quarterly.map(r => `${r.year}Q${r.quarter}`)
  check('首期 = 2017Q1', keys[0] === '2017Q1', keys[0])
  check('末期 = 2026Q3', keys[keys.length - 1] === '2026Q3', keys[keys.length - 1])
  check('无重复期', new Set(keys).size === quarterly.length)
  check('2026Q4 尚未公布', !keys.includes('2026Q4'))
  check(
    '数值均为正数',
    quarterly.every(r => Number.isFinite(r.marriages_wan) && r.marriages_wan > 0),
  )
  const y2025 = quarterly.filter(r => r.year === 2025).reduce((s, r) => s + r.marriages_wan, 0)
  check('2025 四季度合计 = 731.0', near(y2025, 731.0, 0.1), y2025.toFixed(2))
}

console.log('\n[年度] marriage_annual.json')
if (annual) {
  check('行数 = 26', annual.length === 26, `实际 ${annual.length}`)
  const years = annual.map(r => r.year)
  check('年份 2000–2025 连续', years.every((y, i) => y === 2000 + i), `${years[0]}–${years[years.length - 1]}`)
  const get = y => annual.find(r => r.year === y)
  check('2013 = 1346.9', near(get(2013)?.marriages_wan, 1346.9, 0.01), String(get(2013)?.marriages_wan))
  check('2024 = 610.6（历史最低）', near(get(2024)?.marriages_wan, 610.6, 0.01), String(get(2024)?.marriages_wan))
  check('2025 = 731.0', near(get(2025)?.marriages_wan, 731.0, 0.01), String(get(2025)?.marriages_wan))
  check('2025 离婚 = 274.3', near(get(2025)?.divorces_wan, 274.3, 0.01), String(get(2025)?.divorces_wan))
  check(
    '2010 前无离婚数（按设计留空）',
    annual.filter(r => r.year < 2010).every(r => r.divorces_wan === null),
  )
  const ratioBad = annual
    .filter(r => Number.isFinite(r.divorces_wan) && Number.isFinite(r.divorce_marriage_ratio))
    .filter(r => Math.abs(r.divorce_marriage_ratio - r.divorces_wan / r.marriages_wan) >= 0.002)
  check('离结比 = 离婚对数 ÷ 结婚对数（误差 < 0.002）', ratioBad.length === 0, `异常 ${ratioBad.length} 条`)
}

console.log('\n[季度 vs 年度]')
if (quarterly && annual) {
  const byYear = new Map()
  for (const r of quarterly) {
    byYear.set(r.year, (byYear.get(r.year) || 0) + r.marriages_wan)
  }
  let worst = 0
  let worstYear = null
  for (const [year, sum] of byYear) {
    const target = annual.find(r => r.year === year)
    if (!target) {
      // 2026 年只有前三季，年度表尚未收录，属预期
      console.log(`  · ${year} 年只有前三季（年度表未收录），跳过合计比对`)
      continue
    }
    if (byYear.get(year) && quarterly.filter(r => r.year === year).length < 4) {
      console.log(`  · ${year} 年不足四季，跳过合计比对`)
      continue
    }
    const diff = Math.abs(sum - target.marriages_wan)
    if (diff > worst) {
      worst = diff
      worstYear = year
    }
    const rel = diff / target.marriages_wan
    check(
      `${year} 季度合计 ≈ 年度值`,
      rel < 0.015,
      `${sum.toFixed(1)} vs ${target.marriages_wan.toFixed(1)}（差 ${diff.toFixed(1)}，${(rel * 100).toFixed(2)}%）`,
    )
  }
  console.log(`  · 最大偏差：${worstYear} 年 ${worst.toFixed(1)} 万对`)
}

console.log('\n[省份] marriage_provinces.json')
if (provinces) {
  check('行数 = 31', provinces.length === 31, `实际 ${provinces.length}`)
  check('年份一律 2024（表头「2025」实为 2024 口径）', provinces.every(r => r.year === 2024))
  check('省份无重复', new Set(provinces.map(r => r.province)).size === provinces.length)
  const sumM = provinces.reduce((s, r) => s + (r.marriages_wan || 0), 0)
  const sumD = provinces.reduce((s, r) => s + (r.divorces_wan || 0), 0)
  check('省合计结婚 = 610.55 ± 0.1', near(sumM, 610.55, 0.1), sumM.toFixed(2))
  check('省合计离婚 = 351.30 ± 0.1', near(sumD, 351.3, 0.1), sumD.toFixed(2))
  const totalFirst = provinces.reduce((s, r) => s + (r.first_marriage_wan || 0), 0)
  const nationalFirstShare = totalFirst / (2 * sumM)
  check('全国初婚占比 ≈ 75.1%', near(nationalFirstShare, 0.751, 0.005), (nationalFirstShare * 100).toFixed(1) + '%')
  const ratioBad = provinces.filter(
    r => !near(r.divorce_marriage_ratio, r.divorces_wan / r.marriages_wan, 0.002),
  )
  check('省离结比 = 离婚对数 ÷ 结婚对数（误差 < 0.002）', ratioBad.length === 0, `异常 ${ratioBad.length} 条`)
  const hl = provinces.find(r => r.province === '黑龙江')
  const gd = provinces.find(r => r.province === '广东')
  check('黑龙江离结比 ≈ 0.811', near(hl?.divorce_marriage_ratio, 0.811, 0.002), hl?.divorce_marriage_ratio?.toFixed(3))
  check('广东离结比 ≈ 0.472', near(gd?.divorce_marriage_ratio, 0.472, 0.002), gd?.divorce_marriage_ratio?.toFixed(3))
  check(
    '初婚占比落在 (0,1)',
    provinces.every(r => {
      const v = r.first_marriage_wan / (2 * r.marriages_wan)
      return v > 0 && v < 1
    }),
  )
}

console.log('\n[元数据] marriage_meta.json')
if (meta) {
  check('含数据截止时点', Boolean(meta.cutoff?.quarterly && meta.cutoff?.annual))
  check('含来源', Boolean(meta.source))
  check('注明 2025 离婚为初步数', JSON.stringify(meta).includes('初步数'))
}

console.log('\n[结婚率] marriage_rate_series.json')
const rateSeries = load('marriage_rate_series.json')
if (rateSeries) {
  const rows = Array.isArray(rateSeries.rows) ? rateSeries.rows : []
  const RATE_IDS = ['crude', 'age20_39', 'age15_49', 'general']
  const byYear = y => rows.find(r => r.year === y)
  const rateOf = (y, id) => byYear(y)?.rates?.[id]
  const inRange = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi

  check('行数 = 27', rows.length === 27, `实际 ${rows.length}`)
  const years = rows.map(r => r.year)
  check(
    '年份 2000–2026 连续',
    years.length === 27 && years.every((y, i) => y === 2000 + i),
    `${years[0]}–${years[years.length - 1]}`,
  )
  check('2026 行 estimated === true', byYear(2026)?.estimated === true, String(byYear(2026)?.estimated))
  check(
    '2026 全年推算在 560–640 万对',
    inRange(byYear(2026)?.marriages_wan, 560, 640),
    `${byYear(2026)?.marriages_wan} 万对`,
  )
  check(
    'meta.estimate_note 说明推算方法',
    typeof rateSeries.meta?.estimate_note === 'string' && rateSeries.meta.estimate_note.includes('Q4'),
  )
  check('单位 = ‰', rateSeries.meta?.unit === '‰', String(rateSeries.meta?.unit))
  check(
    'meta.denominators 四个口径齐全',
    JSON.stringify((rateSeries.meta?.denominators || []).map(d => d.id)) === JSON.stringify(RATE_IDS),
  )

  check('crude 2013 ∈ [9.5, 10.5]‰', inRange(rateOf(2013, 'crude'), 9.5, 10.5), `${rateOf(2013, 'crude')}‰`)
  check('crude 2024 ∈ [4.2, 4.5]‰', inRange(rateOf(2024, 'crude'), 4.2, 4.5), `${rateOf(2024, 'crude')}‰`)
  check(
    'age20_39 2013 ∈ [31, 34]‰',
    inRange(rateOf(2013, 'age20_39'), 31, 34),
    `${rateOf(2013, 'age20_39')}‰`,
  )
  check(
    '任一行 rate 不为 NaN',
    rows.every(r => RATE_IDS.every(id => {
      const v = r?.rates?.[id]
      return v === null || (Number.isFinite(v) && !Number.isNaN(v))
    })),
    rows.filter(r => RATE_IDS.some(id => Number.isNaN(r?.rates?.[id]))).map(r => r.year).join(',') || '无 NaN',
  )
  check(
    'denoms 与 rates 同为数值（不为占位 0）',
    rows.every(r => r.denoms && Number.isFinite(r.denoms.pop_20_39_wan) && r.denoms.pop_20_39_wan > 0),
  )

  for (const y of [2000, 2013, 2024, 2025, 2026]) {
    const r = byYear(y)
    if (!r) continue
    console.log(
      `  · ${y}: crude=${r.rates.crude} age20_39=${r.rates.age20_39} age15_49=${r.rates.age15_49}` +
        ` general=${r.rates.general}（20–39=${r.denoms.pop_20_39_wan}万，15+未婚=${r.denoms.pop_15plus_unmarried_wan}万）`,
    )
  }
}

console.log('')
if (failures.length) {
  console.error(`校验失败：${failures.length} 项未通过（通过 ${passed} 项）`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`全部通过：${passed} 项断言`)
