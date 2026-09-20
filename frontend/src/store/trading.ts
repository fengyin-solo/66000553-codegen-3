import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import type { Tick, OrderBook, GridConfig, GridResult, GridScheme } from '@/types'

const STORAGE_SCHEMES = 'grid-schemes'
const STORAGE_SELECTED = 'grid-scheme-selected'

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// 保存前校验：返回错误字段与提示，全部合格时返回 null
export function validateScheme(name: string, cfg: Pick<GridConfig, 'lowerPrice' | 'upperPrice' | 'gridCount' | 'capitalPerGrid'>): string | null {
  if (!name || !name.trim()) return '方案名称不能为空，请填写名称'
  const { lowerPrice, upperPrice, gridCount, capitalPerGrid } = cfg
  if (!Number.isFinite(lowerPrice) || lowerPrice < 50 || lowerPrice > 200) return '「下限价格」不合格：需为 50~200 之间的数值'
  if (!Number.isFinite(upperPrice) || upperPrice < 50 || upperPrice > 200) return '「上限价格」不合格：需为 50~200 之间的数值'
  if (!Number.isFinite(lowerPrice) || !Number.isFinite(upperPrice) || lowerPrice >= upperPrice) return '「下限价格 / 上限价格」互相矛盾：下限价格必须严格小于上限价格'
  if (!Number.isInteger(gridCount) || gridCount < 5 || gridCount > 50) return '「网格数量」不合格：需为 5~50 之间的整数'
  if (!Number.isFinite(capitalPerGrid) || capitalPerGrid < 100 || capitalPerGrid > 50000) return '「每格资金」不合格：需为 100~50000 之间的数值'
  return null
}

export const useTradingStore = defineStore('trading', () => {
  const loading = ref(false)
  const ticks = ref<Tick[]>([])
  const orderBook = ref<OrderBook | null>(null)
  const gridResult = ref<GridResult | null>(null)
  const wsConnected = ref(false)
  const config = ref<GridConfig>({ lowerPrice: 95, upperPrice: 115, gridCount: 20, capitalPerGrid: 1000, initialCapital: 100000 })

  // ---------- 参数方案 ----------
  const schemes = ref<GridScheme[]>(loadSchemes())
  const selectedSchemeId = ref<string | null>(loadSelectedId(schemes.value))

  const selectedScheme = computed<GridScheme | null>(
    () => schemes.value.find(s => s.id === selectedSchemeId.value) ?? null
  )

  // 刷新后仍保留选中的方案：把其参数回填到输入框
  if (selectedScheme.value) {
    config.value.lowerPrice = selectedScheme.value.lowerPrice
    config.value.upperPrice = selectedScheme.value.upperPrice
    config.value.gridCount = selectedScheme.value.gridCount
    config.value.capitalPerGrid = selectedScheme.value.capitalPerGrid
  }

  // 当前表单四个参数与所选方案已对不上（用户切换方案后又改过参数）
  const selectedDirty = computed(() => {
    const s = selectedScheme.value
    if (!s) return false
    const c = config.value
    return s.lowerPrice !== c.lowerPrice
      || s.upperPrice !== c.upperPrice
      || s.gridCount !== c.gridCount
      || s.capitalPerGrid !== c.capitalPerGrid
  })

  function persist() {
    try {
      localStorage.setItem(STORAGE_SCHEMES, JSON.stringify(schemes.value))
      if (selectedSchemeId.value) localStorage.setItem(STORAGE_SELECTED, selectedSchemeId.value)
      else localStorage.removeItem(STORAGE_SELECTED)
    } catch { /* 隐私模式等场景写入失败时静默降级为仅内存 */ }
  }

  function selectScheme(id: string) {
    const s = schemes.value.find(x => x.id === id)
    if (!s) return
    selectedSchemeId.value = id
    config.value.lowerPrice = s.lowerPrice
    config.value.upperPrice = s.upperPrice
    config.value.gridCount = s.gridCount
    config.value.capitalPerGrid = s.capitalPerGrid
    persist()
  }

  function toggleScheme(id: string) {
    const s = schemes.value.find(x => x.id === id)
    if (!s) return
    s.enabled = !s.enabled
    persist()
  }

  // 返回 true 表示保存成功（含同名覆盖），失败时返回错误提示
  function saveScheme(name: string): { ok: boolean; message: string } {
    const trimmed = (name ?? '').trim()
    const invalid = validateScheme(trimmed, config.value)
    if (invalid) return { ok: false, message: invalid }

    const now = Date.now()
    const existing = schemes.value.find(s => s.name === trimmed)
    if (existing) {
      existing.lowerPrice = config.value.lowerPrice
      existing.upperPrice = config.value.upperPrice
      existing.gridCount = config.value.gridCount
      existing.capitalPerGrid = config.value.capitalPerGrid
      existing.updatedAt = now
      selectedSchemeId.value = existing.id
      persist()
      return { ok: true, message: `方案「${trimmed}」已存在，已按当前参数覆盖保存` }
    }

    const scheme: GridScheme = {
      id: genId(),
      name: trimmed,
      lowerPrice: config.value.lowerPrice,
      upperPrice: config.value.upperPrice,
      gridCount: config.value.gridCount,
      capitalPerGrid: config.value.capitalPerGrid,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    }
    schemes.value.push(scheme)
    selectedSchemeId.value = scheme.id
    persist()
    return { ok: true, message: `方案「${trimmed}」保存成功` }
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
    // 选中的方案处于停用状态时，回测取值不生效
    if (selectedScheme.value && !selectedScheme.value.enabled) {
      ElMessage.warning(`方案「${selectedScheme.value.name}」已停用，请先启用或改选其他方案后再回测`)
      return
    }
    loading.value = true
    try { const { data } = await axios.post('/api/backtest', config.value) ; gridResult.value = data }
    finally { loading.value = false }
  }

  function disconnectWS() { ws?.close(); ws = null; wsConnected.value = false }

  return {
    loading, ticks, orderBook, gridResult, wsConnected, config,
    schemes, selectedSchemeId, selectedScheme, selectedDirty,
    selectScheme, toggleScheme, saveScheme,
    connectWS, runBacktest, disconnectWS,
  }
})

function loadSchemes(): GridScheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_SCHEMES)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s): s is GridScheme =>
      s && typeof s.id === 'string' && typeof s.name === 'string'
      && Number.isFinite(s.lowerPrice) && Number.isFinite(s.upperPrice)
      && Number.isFinite(s.gridCount) && Number.isFinite(s.capitalPerGrid)
      && typeof s.enabled === 'boolean'
    )
  } catch { return [] }
}

function loadSelectedId(list: GridScheme[]): string | null {
  try {
    const id = localStorage.getItem(STORAGE_SELECTED)
    if (id && list.some(s => s.id === id)) return id
  } catch { /* ignore */ }
  return null
}
