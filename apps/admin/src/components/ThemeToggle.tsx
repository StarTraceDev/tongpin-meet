import { Segmented } from 'antd'
import type { ReactElement } from 'react'

import type { ThemeMode } from '@tongpin/theme/core'

import { useTheme } from '../app/theme'

const OPTIONS: Array<{ label: string; value: ThemeMode }> = [
  { label: '系统', value: 'system' },
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
]

export function ThemeToggle(): ReactElement {
  const { mode, setMode } = useTheme()

  return (
    <Segmented
      size="small"
      options={OPTIONS}
      value={mode}
      onChange={(value): void => {
        setMode(value as ThemeMode)
      }}
    />
  )
}
