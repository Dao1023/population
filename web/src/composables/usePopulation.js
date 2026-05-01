import { ref, computed } from 'vue'

// 消费标注
export const ANNOTATIONS = {
  26: '公寓',
  31: '婚房',
  42: '改善房',
  46: '装修',
  51: '大学费',
  53: '汽车',
  60: '医疗',
  65: '养老',
  70: '旅行',
  77: '药物',
  84: '养老院',
}

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
  }
}
