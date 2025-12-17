import { DashboardOutlined } from '@ant-design/icons'
import { Avatar, Breadcrumb, Button, Dropdown, Layout, Menu, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { Outlet, useLocation, useMatches, useNavigate } from 'react-router'

import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from './AuthProvider'
import { breadcrumbLabels } from './navigation'

export function AdminLayout(): ReactElement {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const matches = useMatches()
  const [collapsed, setCollapsed] = useState(false)

  const labels = breadcrumbLabels(matches)
  const crumbs =
    labels.length === 0 ? [{ title: '首页' }] : labels.map((label) => ({ title: label }))
  const initial = user?.name.trim().slice(0, 1) ?? ''

  const menuItems: MenuProps['items'] = [{ key: '/', label: '仪表盘', icon: <DashboardOutlined /> }]

  const userMenu: MenuProps = {
    items: [{ key: 'signOut', label: '退出登录' }],
    onClick: ({ key }): void => {
      if (key === 'signOut') {
        signOut()
      }
    },
  }

  return (
    <Layout className="admin-layout" hasSider>
      <Layout.Sider
        className="admin-sider"
        theme="light"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={216}
        collapsedWidth={64}
      >
        <div className="admin-brand">{collapsed ? '同' : '同频会议 · 管理台'}</div>
        <Menu
          className="admin-menu"
          mode="inline"
          theme="light"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }): void => {
            navigate(key)
          }}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header className="admin-header">
          <Breadcrumb items={crumbs} />
          <Space size="middle">
            <ThemeToggle />
            <Dropdown menu={userMenu} trigger={['click']}>
              <Button type="text" className="admin-user">
                <Avatar size="small" className="admin-avatar">
                  {initial}
                </Avatar>
                <Typography.Text>{user?.name ?? '未登录'}</Typography.Text>
              </Button>
            </Dropdown>
          </Space>
        </Layout.Header>
        <Layout.Content className="admin-content">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
