import { ref, computed } from 'vue'

/**
 * 结婚数据 composable（模块级单例）
 * - 三个 JSON 只 fetch 一次，切页回来不重复请求
 * - ensureLoaded() 幂等；失败后重置，允许重试
 */
const annual = ref([])
const quarterly = ref([])
const provinces = ref([])
const meta = ref(null)
// 结婚率序列：{ meta: { unit, denominators }, rows: [...] }
const rates = ref({ meta: null, rows: [] })
const loading = ref(true)
const error = ref(null)

let loadPromise = null

async function fetchJson(name) {
  const base = import.meta.env.BASE_URL
  const res = await fetch(`${base}data/${name}`)
  if (!res.ok) throw new Error(`加载 ${name} 失败（HTTP ${res.status}）`)
  return res.json()
}

function ensureLoaded() {
  if (loadPromise) return loadPromise
  loading.value = true
  error.value = null
  loadPromise = Promise.all([
    fetchJson('marriage_annual.json'),
    fetchJson('marriage_quarterly.json'),
    fetchJson('marriage_provinces.json'),
    fetchJson('marriage_meta.json'),
    // 率序列由独立脚本产出：缺失时只让这一张图空着，不拖垮整页
    fetchJson('marriage_rate_series.json').catch(() => ({ meta: null, rows: [] })),
  ])
    .then(([a, q, p, m, r]) => {
      annual.value = a
      quarterly.value = q
      provinces.value = p
      meta.value = m
      rates.value = {
        meta: r?.meta ?? null,
        rows: Array.isArray(r?.rows) ? r.rows : [],
      }
      loading.value = false
    })
    .catch(e => {
      error.value = e?.message || '数据加载失败'
      loading.value = false
      loadPromise = null // 允许重试
      throw e
    })
  return loadPromise
}

const latest = computed(() => annual.value[annual.value.length - 1] || null)
const previous = computed(() => annual.value[annual.value.length - 2] || null)

const yearOverYear = computed(() => {
  if (!latest.value || !previous.value || !previous.value.marriages_wan) return null
  return (latest.value.marriages_wan / previous.value.marriages_wan - 1) * 100
})

const lowestYear = computed(() => {
  if (!annual.value.length) return null
  return annual.value.reduce((min, r) => (r.marriages_wan < min.marriages_wan ? r : min), annual.value[0])
})

const kpis = computed(() => {
  const y = latest.value
  const prev = previous.value
  if (!y || !prev) return []
  const yoy = yearOverYear.value
  return [
    {
      key: 'marriages-latest',
      label: `${y.year} 年结婚登记`,
      value: y.marriages_wan.toFixed(1),
      unit: '万对',
      note: yoy == null ? '' : `同比 ${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%（${prev.year} 年 ${prev.marriages_wan.toFixed(1)} 万对）`,
      tone: 'primary',
    },
    {
      key: 'marriages-low',
      label: `${prev.year} 年结婚登记`,
      value: prev.marriages_wan.toFixed(1),
      unit: '万对',
      note: `2000 年以来最低${lowestYear.value?.year === prev.year ? '' : '（非最低）'}`,
      tone: 'neutral',
    },
    {
      key: 'divorces-latest',
      label: `${y.year} 年离婚登记`,
      value: y.divorces_wan == null ? '—' : y.divorces_wan.toFixed(1),
      unit: '万对',
      note: '初步数，口径待确认',
      tone: 'warning',
    },
    {
      key: 'ratio-latest',
      label: `${y.year} 年离结比`,
      value: y.divorce_marriage_ratio == null ? '—' : y.divorce_marriage_ratio.toFixed(3),
      unit: '',
      note: `离婚对数 ÷ 结婚对数（${prev.year} 年 ${prev.divorce_marriage_ratio?.toFixed(3) ?? '—'}）`,
      tone: 'danger',
    },
  ]
})

const hasPartialYear = computed(() => quarterly.value.some(r => r.year >= 2026))

export function useMarriageData() {
  return {
    annual,
    quarterly,
    provinces,
    meta,
    rates,
    loading,
    error,
    ensureLoaded,
    latest,
    previous,
    yearOverYear,
    lowestYear,
    kpis,
    hasPartialYear,
  }
}
