/** Recharts 只吃具体颜色，统一从 05 §8 的 token 读，组件里不出现 hex */
export interface ChartPalette {
  brand: string
  brandSoft: string
  success: string
  warning: string
  muted: string
  text: string
  border: string
  surface: string
}

export function readChartPalette(): ChartPalette {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string): string => style.getPropertyValue(name).trim() || 'currentColor'

  return {
    brand: read('--tp-brand'),
    brandSoft: read('--tp-brand-soft'),
    success: read('--tp-success'),
    warning: read('--tp-warning'),
    muted: read('--tp-text-tertiary'),
    text: read('--tp-text-secondary'),
    border: read('--tp-border'),
    surface: read('--tp-surface'),
  }
}
