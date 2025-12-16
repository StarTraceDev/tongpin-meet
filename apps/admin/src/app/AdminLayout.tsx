import { Button, Layout, Space, Typography } from 'antd'
import type { ReactElement } from 'react'
import { Outlet } from 'react-router'

import { useAuth } from './AuthProvider'

/** M11-1 只放最小外壳，侧栏 / 面包屑 / 主题切换在 M11-2 补齐。 */
export function AdminLayout(): ReactElement {
  const { user, signOut } = useAuth()

  return (
    <Layout className="admin-layout">
      <Layout.Header className="admin-header">
        <Typography.Title level={4} className="admin-header-title">
          同频会议 · 管理后台
        </Typography.Title>
        <Space>
          <Typography.Text>{user?.name ?? '未登录'}</Typography.Text>
          <Button onClick={signOut}>退出登录</Button>
        </Space>
      </Layout.Header>
      <Layout.Content className="admin-content">
        <Outlet />
      </Layout.Content>
    </Layout>
  )
}
