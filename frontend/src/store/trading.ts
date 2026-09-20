import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import type { Tick, OrderBook, GridConfig, GridResult, GridScheme } from '@/types'

const SCHEMES_KEY = 'grid-schemes'
const SELECTED_SCHEME_KEY = 'grid-selected-scheme'

function loadSchemes(): GridScheme[] {
  try { return JSON.parse(localStorage.getItem(SCHEMES_KEY) || '[]') } catch { return [] }
}

export const useTradingStore = defineStore('trading', () => {
  const loading = ref(false)
  const ticks = ref<Tick[]>([])
  const orderBook = ref<OrderBook | null>(null)
  const gridResult = ref<GridResult | null>(null)
  const wsConnected = ref(false)
  const config = ref<GridConfig>({ lowerPrice: 95, upperPrice: 115, gridCount: 20, capitalPerGrid: 1000, initialCapital: 100000 })

  const schemes = ref<GridScheme[]>(loadSchemes())
  const selectedScheme = ref<string | null>(localStorage.getItem(SELECTED_SCHEME_KEY))

  // 刷新后恢复选中的方案，并把方案参数回填到输入框
  const restored = schemes.value.find(s => s.name === selectedScheme.value)
  if (restored) Object.assign(config.value, restored.params)
  else selectedScheme.value = null

  function persistSchemes() {
    localStorage.setItem(SCHEMES_KEY, JSON.stringify(schemes.value))
    if (selectedScheme.value) localStorage.setItem(SELECTED_SCHEME_KEY, selectedScheme.value)
    else localStorage.removeItem(SELECTED_SCHEME_KEY)
  }

  function saveScheme(rawName: string): { ok: boolean; message: string } {
    const name = rawName.trim()
    if (!name) return { ok: false, message: '方案名称不能为空' }
    const c = config.value
    if (c.lowerPrice >= c.upperPrice) return { ok: false, message: '下限价格不合格：必须小于上限价格' }
    if (!Number.isFinite(c.gridCount) || c.gridCount < 1) return { ok: false, message: '网格数量不合格：必须大于等于 1' }
    if (!Number.isFinite(c.capitalPerGrid) || c.capitalPerGrid <= 0) return { ok: false, message: '每格资金不合格：必须大于 0' }
    const params = { lowerPrice: c.lowerPrice, upperPrice: c.upperPrice, gridCount: c.gridCount, capitalPerGrid: c.capitalPerGrid }
    const existing = schemes.value.find(s => s.name === name)
    if (existing) {
      existing.params = params
      persistSchemes()
      return { ok: true, message: `已覆盖同名方案「${name}」` }
    }
    schemes.value.push({ name, params, enabled: true })
    persistSchemes()
    return { ok: true, message: `已保存新方案「${name}」` }
  }

  function selectScheme(name: string) {
    const s = schemes.value.find(x => x.name === name)
    if (!s) return
    selectedScheme.value = name
    Object.assign(config.value, s.params)
    persistSchemes()
  }

  function toggleScheme(name: string) {
    const s = schemes.value.find(x => x.name === name)
    if (!s) return
    s.enabled = !s.enabled
    persistSchemes()
  }

  // 方案存储的参数与当前输入框取值是否已不一致
  function isSchemeDirty(s: GridScheme): boolean {
    const c = config.value
    return s.params.lowerPrice !== c.lowerPrice || s.params.upperPrice !== c.upperPrice ||
      s.params.gridCount !== c.gridCount || s.params.capitalPerGrid !== c.capitalPerGrid
  }

  let ws: WebSocket | null = null
  function connectWS() {
    ws = new WebSocket(`ws://${location.hostname}:8000/ws`)
    ws.onopen = () => { wsConnected.value = true }
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)
        if (d.ticks) ticks.value = d.ticks.slice(-60)
        if (d.orderBook) orderBook.value = d.orderBook
      } catch {}
    }
    ws.onclose = () => { wsConnected.value = false }
  }

  async function runBacktest() {
    loading.value = true
    // 选中的方案处于启用状态时，回测取方案存储的参数；停用或未选方案时取输入框当前值
    const sel = schemes.value.find(s => s.name === selectedScheme.value)
    const payload = sel && sel.enabled ? { ...config.value, ...sel.params } : config.value
    try { const { data } = await axios.post('/api/backtest', payload) ; gridResult.value = data }
    finally { loading.value = false }
  }

  function disconnectWS() { ws?.close(); ws = null; wsConnected.value = false }

  return { loading, ticks, orderBook, gridResult, wsConnected, config, schemes, selectedScheme, saveScheme, selectScheme, toggleScheme, isSchemeDirty, connectWS, runBacktest, disconnectWS }
})
