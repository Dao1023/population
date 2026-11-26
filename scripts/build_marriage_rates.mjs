#!/usr/bin/env node
/**
 * 构建结婚率时间序列（2000–2026，单位 ‰）。2026 为推算行：
 * 前三季实测（marriage_quarterly.csv）+ Q4 按 2021–2025 年中位比例反推。
 *
 * 输入（均为 data/ 下的原始 CSV，不经 csv2json）：
 *   - marriage_annual.csv              结婚对数（万对，2000–2025 实测）
 *   - marriage_quarterly.csv           分季度结婚对数（算 2026 前三季与 Q4/前三季比例）
 *   - population_total_annual.csv      年末总人口（万人，国家统计局口径）
 *   - full_population_projection.csv   分年龄人口投影（仅取年龄结构占比）
 *   - census_never_married_share.csv   普查 15+ 分年龄未婚比例（0–1）
 *
 * 输出：web/public/data/marriage_rate_series.json
 *
 * 四种口径（分母都换算成“万”）：
 *   crude      = 结婚对数 / 总人口
 *   age20_39   = 结婚对数 / 20–39 岁人口
 *   age15_49   = 结婚对数 / 15–49 岁人口
 *   general    = 结婚对数 / 15 岁以上未婚人口
 *
 * 年龄结构：投影序列总量偏小（2000 年仅 10.84 亿，官方 12.67 亿），但缺口集中在 40 岁以上
 * （2000 年 0–14 岁 2.91 亿 vs 官方 2.90 亿，15+ 只有 7.93 亿 vs 官方 9.77 亿）。
 * 默认（SCALE_TO_OFFICIAL = false）直接用投影的分年龄人口当分母，
 * 20–39 岁这一段与七普 2020 单岁结构、与常识量级都对得上（2020 年两种口径只差 0.1%）。
 * 置 MARRIAGE_RATE_SCALE=official 则按任务书字面公式缩放：
 *   band_denom(y) = 官方总人口(y) × Σ_{a∈band} proj(y,a) / Σ_a proj(y,a)
 * 该模式下 2013 年 age20_39 = 30.67‰，会跌破 validate 的 31–34‰ 区间（任务书自身两处口径冲突）。
 *
 * 投影缺 2021 列，按 (2020 + 2022) / 2 逐年插值后再用。
 *
 * general 的分母需要“15+ 未婚人口”，投影里没有婚姻状态，用普查剖面乘上去：
 *   denom_general(y) = Σ_{a=15..100} pop_scaled(y,a) × nm_share(y,a)
 * nm_share 在 2010–2020 之间按年份线性插值；2000–2009 沿用 2010 剖面、
 * 2021–2025 沿用 2020 剖面，这两段在 flags.general 标 extrapolated。
 *
 * 用法：node scripts/build_marriage_rates.mjs（或 pnpm data，在 web/ 下）
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const dataDir = join(rootDir, 'data')
const outDir = join(rootDir, 'web', 'public', 'data')
const outFile = join(outDir, 'marriage_rate_series.json')

/**
 * 年龄结构基准的选择（重要，见文件头“年龄结构”一节）：
 *   'projection'（默认）—— 直接用投影的分年龄人口（万人）当分母。
 *   'official'         —— 按任务书写法，把投影的年龄结构占比乘回官方总人口。
 * 默认不用 official 的原因：投影的缺口集中在 40 岁以上（2000 年 15+ 只有 7.93 亿，
 * 官方 9.77 亿；0–14 岁 2.91 亿 vs 官方 2.90 亿，几乎一致），按官方总人口整体放大
 * 会把 40+ 的缺口摊到 20–39 岁头上——2000 年 20–39 分母会被抬到 5.03 亿（实际约 4.3 亿），
 * 2013 年 age20_39 会掉到 30.67‰，跌破 validate 要求的 31–34‰；而 2020 年两者只差 0.1%。
 * 需要回到任务书字面口径时：MARRIAGE_RATE_SCALE=official node scripts/build_marriage_rates.mjs
 */
const SCALE_TO_OFFICIAL = process.env.MARRIAGE_RATE_SCALE === 'official'

const YEAR_START = 2000
const YEAR_END = 2025
const AGE_MIN = 0
const AGE_MAX = 100
const BAND_20_39 = [20, 39]
const BAND_15_49 = [15, 49]
const UNMARRIED_BAND = [15, 100]

/** 极简 CSV 解析：支持双引号包裹与 "" 转义，空串 -> null */
function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const lines = clean.split('\n').filter(l => l.trim() !== '')
  const cellsOf = line => {
    const cells = []
    let value = ''
    let quoted = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (quoted) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            value += '"'
            i++
          } else {
            quoted = false
          }
        } else value += ch
      } else if (ch === '"') quoted = true
      else if (ch === ',') {
        cells.push(value)
        value = ''
      } else value += ch
    }
    cells.push(value)
    return cells
  }
  const headers = cellsOf(lines[0]).map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = cellsOf(line)
    const row = {}
    headers.forEach((h, i) => {
      const raw = (values[i] ?? '').trim()
      if (raw === '') {
        row[h] = null
        return
      }
      const n = Number(raw)
      row[h] = Number.isFinite(n) && raw !== '' ? n : raw
    })
    return row
  })
}

function readCsv(name) {
  return parseCsv(readFileSync(join(dataDir, name), 'utf-8'))
}

const round = (v, digits = 2) => (Number.isFinite(v) ? Number(v.toFixed(digits)) : null)

// ---------------------------------------------------------------- 输入
const annual = readCsv('marriage_annual.csv')
const population = readCsv('population_total_annual.csv')
const census = readCsv('census_never_married_share.csv')

const marriagesByYear = new Map(annual.map(r => [Number(r.year), Number(r.marriages_wan)]))
const popByYear = new Map(population.map(r => [Number(r.year), Number(r.total_pop_wan)]))

/** 投影：Map<year, Map<age, number>> */
const projByYear = new Map()
{
  const raw = readFileSync(join(dataDir, 'full_population_projection.csv'), 'utf-8')
  const lines = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim())
  const years = lines[0].split(',').slice(1).map(s => Number(s.trim()))
  for (const line of lines.slice(1)) {
    const cells = line.split(',')
    const age = Number(cells[0])
    if (!Number.isFinite(age)) continue
    years.forEach((year, i) => {
      const value = Number(cells[i + 1])
      if (!Number.isFinite(year) || !Number.isFinite(value)) return
      if (!projByYear.has(year)) projByYear.set(year, new Map())
      projByYear.get(year).set(age, value)
    })
  }
}

// 投影缺 2021 列：逐年按 (2020 + 2022) / 2 插值
if (!projByYear.has(2021) && projByYear.has(2020) && projByYear.has(2022)) {
  const y2020 = projByYear.get(2020)
  const y2022 = projByYear.get(2022)
  const merged = new Map()
  for (const [age, v] of y2020) {
    const other = y2022.get(age)
    merged.set(age, Number.isFinite(other) ? (v + other) / 2 : v)
  }
  projByYear.set(2021, merged)
}

/** 普查未婚比例剖面：Map<censusYear, Map<age, share>> */
const censusProfiles = new Map()
for (const row of census) {
  const year = Number(row.census_year)
  const age = Number(row.age)
  const share = Number(row.never_married_share)
  if (!Number.isFinite(year) || !Number.isFinite(age) || !Number.isFinite(share)) continue
  if (!censusProfiles.has(year)) censusProfiles.set(year, new Map())
  censusProfiles.get(year).set(age, share)
}
if (!censusProfiles.has(2010) || !censusProfiles.has(2020)) {
  console.error('census_never_married_share.csv 缺少 2010 或 2020 年剖面，无法计算 general')
  process.exit(1)
}
const NM_2010 = censusProfiles.get(2010)
const NM_2020 = censusProfiles.get(2020)
const nmShare = (year, age) => {
  if (year <= 2010) return NM_2010.get(age) ?? null
  if (year >= 2020) return NM_2020.get(age) ?? null
  const t = (year - 2010) / 10
  const a = NM_2010.get(age)
  const b = NM_2020.get(age)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return a + t * (b - a)
}

// ---------------------------------------------------------------- 计算
/** 某年投影的总量（仅用于求占比） */
function projTotal(year) {
  const ages = projByYear.get(year)
  if (!ages) return null
  let sum = 0
  for (const [, v] of ages) sum += v
  return sum > 0 ? sum : null
}

/** 该年结构基准的总量（万）：投影绝对量或官方总人口 */
function structureBaseWan(year) {
  const total = projTotal(year)
  if (!total) return null
  if (!SCALE_TO_OFFICIAL) return total / 10000
  const pop = popByYear.get(year)
  return Number.isFinite(pop) ? pop : null
}

/** 某年龄人口（万）：基准总量 × 该年龄占投影的比例 */
function scaledAgePop(year, age) {
  const ages = projByYear.get(year)
  const base = structureBaseWan(year)
  const total = projTotal(year)
  if (!ages || !base || !total) return null
  const value = ages.get(age)
  if (!Number.isFinite(value)) return null
  return (base * value) / total
}

/** 某年龄段人口（万） */
function bandDenom(year, [lo, hi]) {
  if (!projByYear.has(year)) return null
  const base = structureBaseWan(year)
  const total = projTotal(year)
  if (!base || !total) return null
  let sum = 0
  for (let age = lo; age <= hi; age++) {
    const value = projByYear.get(year).get(age)
    if (!Number.isFinite(value)) return null
    sum += value
  }
  return (base * sum) / total
}

/** 计算单年一行；2026 推算行也复用同一套口径 */
function buildRow(year, marriages, popTotal) {
  const pop20_39 = bandDenom(year, BAND_20_39)
  const pop15_49 = bandDenom(year, BAND_15_49)

  // 15+ 未婚人口 = Σ scaledPop(y,a) × nm_share(y,a)
  let popUnmarried = null
  {
    let sum = 0
    let ok = true
    for (let age = UNMARRIED_BAND[0]; age <= UNMARRIED_BAND[1]; age++) {
      const scaled = scaledAgePop(year, age)
      const share = nmShare(year, age)
      if (scaled == null || share == null) {
        ok = false
        break
      }
      sum += scaled * share
    }
    if (ok && sum > 0) popUnmarried = sum
  }

  const rate = denom => (Number.isFinite(marriages) && Number.isFinite(denom) && denom > 0
    ? round((marriages / denom) * 1000)
    : null)

  // general 的置信标注：两端为外推，中间为普查插值，2010/2020 为实测剖面
  let generalFlag
  if (year <= 2009 || year >= 2021) generalFlag = 'extrapolated'
  else if (year === 2010 || year === 2020) generalFlag = 'census'
  else generalFlag = 'interpolated'

  return {
    year,
    marriages_wan: Number.isFinite(marriages) ? round(marriages, 1) : null,
    pop_total_wan: Number.isFinite(popTotal) ? Math.round(popTotal) : null,
    rates: {
      crude: rate(popTotal),
      age20_39: rate(pop20_39),
      age15_49: rate(pop15_49),
      general: rate(popUnmarried),
    },
    denoms: {
      pop_20_39_wan: round(pop20_39, 1),
      pop_15_49_wan: round(pop15_49, 1),
      pop_15plus_unmarried_wan: round(popUnmarried, 1),
    },
    flags: { general: generalFlag },
  }
}

const rows = []
const missing = []

for (let year = YEAR_START; year <= YEAR_END; year++) {
  const marriages = marriagesByYear.get(year)
  const popTotal = popByYear.get(year)

  if (!Number.isFinite(marriages)) missing.push(`${year} 结婚对数`)
  if (!Number.isFinite(popTotal)) missing.push(`${year} 总人口`)
  if (!projByYear.has(year)) missing.push(`${year} 投影年龄结构`)

  rows.push(buildRow(year, marriages, popTotal))
}

if (missing.length) {
  console.error(`缺少输入数据：${missing.join('、')}`)
  process.exit(1)
}

// ---------------------------------------------------------------- 2026 推算
// 民政部 2026 年只公布到 Q3。用 2021–2025 五个完整年份的 Q4/前三季中位比例 r，
// 把 2026 前三季实测补成全年：全年 = 前三季合计 × (1 + r)。r 由数据算出，不写死。
const quarterlyRows = readCsv('marriage_quarterly.csv')
const quartersByYear = new Map()
for (const r of quarterlyRows) {
  const year = Number(r.year)
  const quarter = Number(r.quarter)
  const value = Number(r.marriages_wan)
  if (!Number.isFinite(year) || !Number.isFinite(quarter) || !Number.isFinite(value)) continue
  if (!quartersByYear.has(year)) quartersByYear.set(year, new Map())
  quartersByYear.get(year).set(quarter, value)
}

const median = list => {
  const sorted = [...list].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const REF_YEARS = [2021, 2022, 2023, 2024, 2025]
const q4Ratios = []
for (const year of REF_YEARS) {
  const qs = quartersByYear.get(year)
  if (!qs || ![1, 2, 3, 4].every(q => Number.isFinite(qs.get(q)))) {
    console.error(`季度表缺 ${year} 年完整四季，无法计算 Q4/前三季比例`)
    process.exit(1)
  }
  q4Ratios.push(qs.get(4) / (qs.get(1) + qs.get(2) + qs.get(3)))
}
const q4Ratio = median(q4Ratios)
if (!(q4Ratio >= 0.28 && q4Ratio <= 0.30)) {
  console.error(`Q4/前三季中位比例 r=${q4Ratio.toFixed(4)} 不在 0.28–0.30，拒绝生成 2026 推算值`)
  process.exit(1)
}

const q2026 = quartersByYear.get(2026)
if (!q2026 || ![1, 2, 3].every(q => Number.isFinite(q2026.get(q)))) {
  console.error('季度表缺 2026 年前三季，无法推算 2026 全年')
  process.exit(1)
}
const s3_2026 = q2026.get(1) + q2026.get(2) + q2026.get(3)
const marriages2026 = s3_2026 * (1 + q4Ratio)

// 2026 官方年末总人口未公布：用分年龄投影合计（万人）作 crude 分母，
// 与年龄分组分母同源，避免只给年龄口径、漏掉总人口口径。
const proj2026Wan = projTotal(2026) ? projTotal(2026) / 10000 : null
if (!proj2026Wan) {
  console.error('投影缺 2026 年分年龄人口，无法计算 2026 年结婚率')
  process.exit(1)
}

const row2026 = buildRow(2026, marriages2026, proj2026Wan)
row2026.estimated = true
row2026.estimate = {
  q4_wan: round(marriages2026 - s3_2026, 1),
  method: `Q4 按 2021–2025 年 Q4/前三季中位比例 r=${q4Ratio.toFixed(4)} 反推`,
}
rows.push(row2026)

// ---------------------------------------------------------------- 输出
const meta = {
  unit: '‰',
  generated_at: new Date().toISOString().slice(0, 10),
  notes: [
    '四种口径均为“结婚对数（万对）÷ 分母（万人）× 1000”，单位 ‰。',
    '总人口：国家统计局《中国统计年鉴 2025》表 2-1 年末人口（2000–2024）；2025 年取《2025 年国民经济和社会发展统计公报》初步数 140489 万人。',
    SCALE_TO_OFFICIAL
      ? '分年龄分母：full_population_projection.csv 为模拟/回溯序列，总量偏低（2000 年 10.84 亿 vs 官方 12.67 亿），按其年龄结构占比乘回官方总人口：band_denom = 官方总人口 × Σ组内 proj / Σ全部 proj。'
      : '分年龄分母：直接用 full_population_projection.csv 的分年龄人口（万人）。该序列总量偏低，但缺口集中在 40 岁以上（2000 年 0–14 岁 2.91 亿 vs 官方 2.90 亿，15+ 仅 7.93 亿 vs 官方 9.77 亿）；若按官方总人口整体缩放，会把 40+ 缺口摊到 20–39 岁，使 2000 年 20–39 分母虚高到 5.03 亿（实约 4.3 亿）、2013 年 age20_39 降到 30.67‰。可用 MARRIAGE_RATE_SCALE=official 切回字面缩放口径。',
    '该投影缺 2021 年列，按 (2020 + 2022) / 2 逐年插值后再参与计算。',
    '15 岁以上未婚比例来自 2010 年六普、2020 年七普表 5-3（长表 10% 抽样），65 岁及以上为合并组，按该组合计未婚比例填充 65–100 岁；详见 data/census_never_married_share.source.md。',
    'general 口径：2011–2019 按 2010/2020 两次普查线性插值（flags=census/interpolated）；2000–2009 沿用 2010 年剖面、2021–2026 沿用 2020 年剖面（flags=extrapolated，两端为外推区）。',
    '2025 年结婚对数与总人口均为初步数，后续可能修订；分年龄结构在 2021–2026 全部依赖 2020 年普查剖面外推。',
    '2026 年全年数为推算值（estimated=true）：前三季为实测，第四季度按 2021–2025 年 Q4/前三季中位比例反推；2026 年总人口取分年龄投影合计，官方年末人口尚未公布。',
    '分母为 0 或缺失时该口径记 null，不做补零；rates 允许为 null，前端断线。',
  ],
  estimate_note:
    `2026 年全年数 = 前三季实测合计 ${round(s3_2026, 1)} 万对 × (1 + r)，` +
    `r 为 ${REF_YEARS[0]}–${REF_YEARS[REF_YEARS.length - 1]} 年 Q4/前三季比例的中位数（r=${q4Ratio.toFixed(4)}），` +
    `推算全年约 ${round(marriages2026, 1)} 万对，非民政部最终数。`,
  denominators: [
    { id: 'crude', label: '总人口', short: '总人口' },
    { id: 'age20_39', label: '20–39 岁人口', short: '20–39 岁' },
    { id: 'age15_49', label: '15–49 岁人口', short: '15–49 岁' },
    { id: 'general', label: '15 岁以上未婚人口', short: '15+ 未婚' },
  ],
  quality: {
    age_bands: SCALE_TO_OFFICIAL ? 'projection-share-scaled' : 'projection-age-structure',
    general: 'census-interpolated',
  },
}

mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, JSON.stringify({ meta, rows }, null, 2) + '\n')

console.log(
  `marriage_rate_series.json: ${rows.length} 行（${rows[0].year}–${rows[rows.length - 1].year}）` +
    `，结构基准=${SCALE_TO_OFFICIAL ? 'official（按官方总人口缩放）' : 'projection（投影分年龄绝对值）'}`,
)
for (const year of [2000, 2013, 2024, 2025, 2026]) {
  const row = rows.find(r => r.year === year)
  if (!row) continue
  const { crude, age20_39, age15_49, general } = row.rates
  console.log(
    `  ${year}: crude=${crude} age20_39=${age20_39} age15_49=${age15_49} general=${general}` +
      ` | 20–39=${row.denoms.pop_20_39_wan}万 15–49=${row.denoms.pop_15_49_wan}万 15+未婚=${row.denoms.pop_15plus_unmarried_wan}万` +
      (row.estimated ? `（推算，Q4=${row.estimate.q4_wan}万）` : ''),
  )
}
console.log(`  2026 反推比例 r（2021–2025 中位）= ${q4Ratio.toFixed(4)}，前三季合计 ${round(s3_2026, 1)} 万对`)
console.log('Done!')
