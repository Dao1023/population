import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs'
import { join, resolve, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const dataDir = join(rootDir, 'data')
const outputDir = join(rootDir, 'web', 'public', 'data')

/** 解析一行 CSV，支持双引号包裹与 "" 转义 */
function parseLine(line) {
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
      } else {
        value += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      cells.push(value)
      value = ''
    } else {
      value += ch
    }
  }
  cells.push(value)
  return cells
}

const NUMBER_RE = /^-?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/

/** 单元格转换：空串 -> null，纯数字 -> Number，其余保留字符串 */
function convert(raw) {
  const text = (raw ?? '').trim()
  if (text === '') return null
  if (NUMBER_RE.test(text)) {
    const n = Number(text)
    if (Number.isFinite(n)) return n
  }
  return text
}

export function csvToJson(csvText) {
  // 去 BOM，统一换行
  const text = csvText.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const lines = text.split('\n').filter(line => line.trim() !== '')
  if (!lines.length) return []
  const headers = parseLine(lines[0]).map(h => convert(h))
  return lines.slice(1).map(line => {
    const values = parseLine(line)
    const obj = {}
    headers.forEach((h, i) => {
      const key = h === null ? `column_${i}` : String(h)
      obj[key] = convert(values[i])
    })
    return obj
  })
}

// 确保 output 目录存在
mkdirSync(outputDir, { recursive: true })

// 只在构建期参与计算、前端不直接请求的 CSV，不产出 JSON（避免把 363KB 的死文件发到线上）
const SKIP_CSV = new Set([
  'full_population_projection.csv', // 仅 build_marriage_rates.mjs 读年龄结构；前端页首屏不需要
  'census_never_married_share.csv', // 仅 build_marriage_rates.mjs 读
  'population_total_annual.csv', // 仅 build_marriage_rates.mjs 读；总人口已并入 marriage_rate_series.json
])

// 1) data 顶层所有 CSV -> JSON（人口 4 个 + 婚姻 3 个，继续用同名 json）
const files = readdirSync(dataDir).filter(f => f.endsWith('.csv') && !SKIP_CSV.has(f)).sort()
if (!files.length) {
  console.error(`data 目录下没有 CSV：${dataDir}`)
  process.exit(1)
}

for (const file of files) {
  const csv = readFileSync(join(dataDir, file), 'utf-8')
  const json = csvToJson(csv)
  const outFile = file.replace(/\.csv$/, '.json')
  writeFileSync(join(outputDir, outFile), JSON.stringify(json))
  console.log(`${file} -> ${outFile} (${json.length} rows)`)
}

// 2) 元数据 JSON 直接复制到 public（不参与 CSV 转换）
const metaFiles = readdirSync(dataDir).filter(f => f.endsWith('_meta.json'))
for (const file of metaFiles) {
  const raw = readFileSync(join(dataDir, file), 'utf-8').replace(/^\uFEFF/, '')
  const parsed = JSON.parse(raw)
  writeFileSync(join(outputDir, basename(file)), JSON.stringify(parsed, null, 2))
  console.log(`${file} -> ${basename(file)}`)
}

if (!existsSync(join(outputDir, 'marriage_meta.json'))) {
  console.log('提示：未找到 marriage_meta.json，仅转换 CSV。')
}

console.log('Done!')
