import { ref, computed } from 'vue'

/**
 * 人口模拟 composable
 * 加载原始数据，根据参数实时模拟人口分布
 */
export function usePopulation() {
  const ageDistribution = ref([])   // [{age, population}]
  const fertilityForecast = ref([]) // [{year, fertility_rate}]
  const mortalityRate = ref([])     // [{age, mortality_rate}]
  const loading = ref(true)
  const error = ref(null)

  // 可调参数
  const fertilityOverride = ref(null) // 覆盖生育率，null 表示用原始数据
  const femaleRatio = ref(0.5)        // 女性比例
  const generationTime = ref(30)      // 生育代际时间

  // 消费热点配置
  const HOTSPOT_SIGMA = 5
  const hotspots = ref([
    { name: '公寓', centerAge: 26 },
    { name: '婚房', centerAge: 31 },
    { name: '改善房', centerAge: 42 },
    { name: '装修', centerAge: 46 },
    { name: '大学费', centerAge: 51 },
    { name: '汽车', centerAge: 53 },
    { name: '医疗', centerAge: 60 },
    { name: '养老', centerAge: 65 },
    { name: '旅行', centerAge: 70 },
    { name: '药物', centerAge: 77 },
    { name: '养老院', centerAge: 84 },
  ])

  async function loadData() {
    try {
      loading.value = true
      const [ageRes, fertRes, mortRes] = await Promise.all([
        fetch('/data/population_age_distribution.json').then(r => r.json()),
        fetch('/data/fertility_rate_forecast.json').then(r => r.json()),
        fetch('/data/mortality_rate.json').then(r => r.json()),
      ])
      ageDistribution.value = ageRes.map(d => ({ age: d.age, population: d['2020'] }))
      fertilityForecast.value = fertRes
      mortalityRate.value = mortRes
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  /**
   * 模拟指定年份的人口分布
   * @param {number} targetYear - 目标年份
   * @returns {{ ages: number[], populations: number[], stats: object }}
   */
  function simulate(targetYear) {
    if (!ageDistribution.value.length) return { ages: [], populations: [], stats: {} }

    const baseYear = 2020

    // 构建死亡率查找表
    const mortMap = {}
    for (const d of mortalityRate.value) {
      mortMap[d.age] = d.mortality_rate
    }

    // 复制基准人口
    const pop = ageDistribution.value.map(d => d.population)
    const ages = ageDistribution.value.map(d => d.age)

    if (targetYear === baseYear) {
      return { ages, populations: pop, stats: calcStats(ages, pop) }
    }

    if (targetYear > baseYear) {
      // 正向模拟
      for (let year = baseYear + 1; year <= targetYear; year++) {
        // 获取当年生育率
        let fertilityRate
        if (fertilityOverride.value !== null) {
          fertilityRate = fertilityOverride.value
        } else {
          const found = fertilityForecast.value.find(d => d.year === year)
          fertilityRate = found ? found.fertility_rate : 0.7
        }

        // 计算新生儿
        const newborns = calcNewborns(pop, ages, fertilityRate, femaleRatio.value, generationTime.value)

        // 年龄推移
        for (let i = pop.length - 1; i > 0; i--) {
          pop[i] = pop[i - 1]
        }
        pop[0] = newborns

        // 应用死亡率
        for (let i = 0; i < pop.length; i++) {
          pop[i] = Math.round(pop[i] * (1 - (mortMap[ages[i]] || 0)))
        }
      }
    } else {
      // 反向推算
      for (let year = baseYear; year > targetYear; year--) {
        for (let i = 0; i < pop.length - 1; i++) {
          pop[i] = pop[i + 1]
        }
        pop[pop.length - 1] = 0
      }
    }

    return { ages, populations: pop.map(Math.round), stats: calcStats(ages, pop) }
  }

  function calcNewborns(pop, ages, fertilityRate, femaleRatio, generationTime) {
    let fertilePop = 0
    for (let i = 0; i < ages.length; i++) {
      if (ages[i] >= 15 && ages[i] <= 49) {
        fertilePop += pop[i]
      }
    }
    return Math.round(fertilePop * femaleRatio * fertilityRate / generationTime)
  }

  function calcStats(ages, populations) {
    const total = populations.reduce((a, b) => a + b, 0)
    if (total === 0) return { total: 0, medianAge: 0, dependencyRatio: 0 }

    // 中位年龄
    let cumulative = 0
    let medianAge = 0
    for (let i = 0; i < ages.length; i++) {
      cumulative += populations[i]
      if (cumulative >= total / 2) {
        medianAge = ages[i]
        break
      }
    }

    // 养老抚养比 (60+ / <60)
    let young = 0, old = 0
    for (let i = 0; i < ages.length; i++) {
      if (ages[i] < 60) young += populations[i]
      else old += populations[i]
    }
    const dependencyRatio = young > 0 ? old / young : 0

    return { total, medianAge, dependencyRatio }
  }

  /**
   * 高效模拟时间线上所有年份的人口分布
   */
  function simulateTimeline(startYear, endYear) {
    if (!ageDistribution.value.length) return []

    const baseYear = 2020
    const ages = ageDistribution.value.map(d => d.age)

    const mortMap = {}
    for (const d of mortalityRate.value) mortMap[d.age] = d.mortality_rate
    const fertMap = {}
    for (const d of fertilityForecast.value) fertMap[d.year] = d.fertility_rate

    const timeline = []
    const basePop = ageDistribution.value.map(d => d.population)

    // 正向模拟
    if (endYear >= baseYear) {
      const pop = [...basePop]
      if (baseYear >= startYear) timeline.push({ year: baseYear, populations: [...pop] })
      for (let year = baseYear + 1; year <= endYear; year++) {
        const fertilityRate = fertilityOverride.value ?? (fertMap[year] ?? 0.7)
        const newborns = calcNewborns(pop, ages, fertilityRate, femaleRatio.value, generationTime.value)
        for (let i = pop.length - 1; i > 0; i--) pop[i] = pop[i - 1]
        pop[0] = newborns
        for (let i = 0; i < pop.length; i++) {
          pop[i] = Math.round(pop[i] * (1 - (mortMap[ages[i]] || 0)))
        }
        if (year >= startYear) timeline.push({ year, populations: [...pop] })
      }
    }

    // 反向推算
    if (startYear < baseYear) {
      const pop = [...basePop]
      const backward = []
      for (let year = baseYear - 1; year >= startYear; year--) {
        for (let i = 0; i < pop.length - 1; i++) pop[i] = pop[i + 1]
        pop[pop.length - 1] = 0
        backward.push({ year, populations: [...pop] })
      }
      backward.reverse()
      timeline.unshift(...backward)
    }

    return timeline
  }

  // 消费热点指数数据
  const hotspotChartData = computed(() => {
    const timeline = simulateTimeline(yearRange.value.min, yearRange.value.max)
    if (!timeline.length) return { years: [], series: [] }

    const years = timeline.map(t => t.year)
    const ages = ageDistribution.value.map(d => d.age)

    const series = hotspots.value.map(h => ({
      name: h.name,
      data: timeline.map(t => {
        let intensity = 0
        for (let i = 0; i < ages.length; i++) {
          const w = Math.exp(-0.5 * ((ages[i] - h.centerAge) / HOTSPOT_SIGMA) ** 2)
          intensity += t.populations[i] * w
        }
        return Math.round(intensity)
      }),
    }))

    return { years, series }
  })

  // 可模拟的年份范围
  const yearRange = computed(() => {
    if (!fertilityForecast.value.length) return { min: 1951, max: 2200 }
    return { min: 1951, max: fertilityForecast.value[fertilityForecast.value.length - 1].year }
  })

  return {
    loading,
    error,
    loadData,
    simulate,
    yearRange,
    // 可调参数
    fertilityOverride,
    femaleRatio,
    generationTime,
    // 消费热点
    hotspots,
    hotspotChartData,
  }
}
