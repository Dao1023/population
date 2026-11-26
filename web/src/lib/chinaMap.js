/**
 * 中国省级地图注册（模块级单例）
 * - 整个 SPA 生命周期只 fetch / registerMap 一次，切页回来不重复请求
 * - 失败后清空缓存，允许重试
 * - GeoJSON 里的省名是全称（北京市 / 内蒙古自治区 …），注册前按 PROVINCE_ALIAS
 *   精确映射成数据用的短名，避免 series.nameMap 之类的隐式匹配
 */
import { registerMap } from 'echarts/core'
import { toShortProvinceName } from './marriageOptions.js'

let loadPromise = null
let registered = false

function normalizeGeo(geo) {
  if (!geo || !Array.isArray(geo.features)) return geo
  return {
    ...geo,
    features: geo.features.map(f => {
      const name = f?.properties?.name ?? ''
      return {
        ...f,
        properties: { ...f.properties, name: toShortProvinceName(name) },
      }
    }),
  }
}

export function isChinaMapRegistered() {
  return registered
}

export function loadChinaMap() {
  if (registered) return Promise.resolve()
  if (loadPromise) return loadPromise

  const base = import.meta.env.BASE_URL
  loadPromise = fetch(`${base}data/china-provinces.json`)
    .then(res => {
      if (!res.ok) throw new Error(`地图数据加载失败（HTTP ${res.status}）`)
      return res.json()
    })
    .then(geo => {
      registerMap('china', normalizeGeo(geo))
      registered = true
      return geo
    })
    .catch(err => {
      // 失败不缓存，下次调用重新请求
      loadPromise = null
      throw err
    })

  return loadPromise
}
