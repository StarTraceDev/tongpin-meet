import '@ant-design/v5-patch-for-react-19'
import '@tongpin/tokens'
import './styles/global.css'

import { App as AntdApp, ConfigProvider, theme } from 'antd'
import { StrictMode } from 'react'
import type { ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import { AuthProvider } from './app/AuthProvider'
import { router } from './app/router'
import { ThemeProvider, useTheme } from './app/theme'

const container = document.getElementById('app')

if (container === null) {
  throw new Error('缺少 #app 容器')
}

// 主色只在 05 §8 的 token 里定义，这里读变量而不是再写一份 hex
const brandColor = getComputedStyle(document.documentElement).getPropertyValue('--tp-brand').trim()

function Root(): ReactElement {
  const { resolved } = useTheme()

  return (
    <ConfigProvider
      theme={{
        algorithm: resolved === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: brandColor === '' ? {} : { colorPrimary: brandColor },
      }}
    >
      <AntdApp>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  )
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  </StrictMode>,
)
