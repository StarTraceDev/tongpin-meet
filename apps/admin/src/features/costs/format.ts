export function formatMoney(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`
}

export function formatMoneyTick(cents: number): string {
  if (cents === 0) return '¥0'
  if (cents < 100) return `¥${(cents / 100).toFixed(2)}`
  return `¥${(cents / 100).toFixed(0)}`
}

export function formatCostDay(date: string): string {
  return date.slice(5)
}
