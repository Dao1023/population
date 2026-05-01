import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const dataDir = join(rootDir, 'data')
const outputDir = join(rootDir, 'web', 'public', 'data')

function csvToJson(csv) {
  const lines = csv.trim().split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    const values = line.split(',')
    const obj = {}
    headers.forEach((h, i) => {
      const v = values[i]?.trim()
      obj[h.trim()] = isNaN(v) || v === '' ? v : Number(v)
    })
    return obj
  })
}

// 确保 output 目录存在
mkdirSync(outputDir, { recursive: true })

// 遍历 data 目录
const files = readdirSync(dataDir).filter(f => f.endsWith('.csv'))

for (const file of files) {
  const csv = readFileSync(join(dataDir, file), 'utf-8')
  const json = csvToJson(csv)
  const outFile = file.replace('.csv', '.json')
  writeFileSync(join(outputDir, outFile), JSON.stringify(json))
  console.log(`${file} -> ${outFile} (${json.length} rows)`)
}

console.log('Done!')
