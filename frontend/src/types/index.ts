export interface Tick { time: string; price: number; bid: number; ask: number; volume: number }
export interface OrderBook { bids: [number,number][]; asks: [number,number][]; midPrice: number; spread: number }
export interface GridConfig { lowerPrice: number; upperPrice: number; gridCount: number; capitalPerGrid: number; initialCapital: number }
export interface GridScheme {
  id: string
  name: string
  lowerPrice: number
  upperPrice: number
  gridCount: number
  capitalPerGrid: number
  enabled: boolean
  createdAt: number
  updatedAt: number
}
export interface GridOrder { id: number; price: number; side: string; quantity: number; status: string; profit: number }
export interface GridResult { orders: GridOrder[]; totalProfit: number; returnRate: number; sharpeRatio: number; maxDrawdown: number; winRate: number; equityCurve: number[] }
