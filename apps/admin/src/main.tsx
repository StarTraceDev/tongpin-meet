import '@ant-design/v5-patch-for-react-19'
import '@tongpin/tokens'
import './styles/global.css'

import { ConfigProvider, theme } from 'antd'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import { AuthProvider } from './app/AuthProvider'
import { router } from './app/router'

const container = document.getElementById('app')

if (container === null) {
  throw new Error('缺少 #app 容器')
}

// 主色只在 05 §8 的 token 里定义，这里读变量而不是再写一份 hex
const brandColor = getComputedStyle(document.documentElement).getPropertyValue('--tp-brand').trim()
// 入口防闪烁脚本已经把主题写进 html，AntD 跟着切算法才不会在暗色下留白卡片
const isDark = document.documentElement.classList.contains('dark')

createRoot(container).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: brandColor === '' ? {} : { colorPrimary: brandColor },
      }}
    >
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ConfigProvider>
  </StrictMode>,
)
