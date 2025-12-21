import {
  ApartmentOutlined,
  DashboardOutlined,
  MenuOutlined,
  TeamOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import {
  Avatar,
  Breadcrumb,
  Button,
  Drawer,
  Dropdown,
  Grid,
  Layout,
  Menu,
  Space,
  Typography,
} from 'antd'
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
  const screens = Grid.useBreakpoint()
  const narrow = screens.lg === false
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const labels = breadcrumbLabels(matches)
  const crumbs =
    labels.length === 0 ? [{ title: '首页' }] : labels.map((label) => ({ title: label }))
  const initial = user?.name.trim().slice(0, 1) ?? ''

  const menuItems: MenuProps['items'] = [
    { key: '/', label: '仪表盘', icon: <DashboardOutlined /> },
    { key: '/meetings', label: '会议管理', icon: <VideoCameraOutlined /> },
    { key: '/users', label: '用户管理', icon: <TeamOutlined /> },
    { key: '/departments', label: '部门管理', icon: <ApartmentOutlined /> },
  ]

  const navigation = (
    <Menu
      className="admin-menu"
      mode="inline"
      theme="light"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={({ key }): void => {
        navigate(key)
        setDrawerOpen(false)
      }}
    />
  )

  const userMenu: MenuProps = {
    items: [{ key: 'signOut', label: '退出登录' }],
    onClick: ({ key }): void => {
      if (key === 'signOut') {
        signOut()
      }
    },
  }

  return (
    <Layout className="admin-layout" hasSider={!narrow}>
      {narrow ? null : (
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
          {navigation}
        </Layout.Sider>
      )}
      <Layout className="admin-body">
        <Layout.Header className="admin-header">
          <Space size="small">
            {narrow ? (
              <Button
                type="text"
                icon={<MenuOutlined />}
                aria-label="打开导航"
                onClick={(): void => setDrawerOpen(true)}
              />
            ) : null}
            <Breadcrumb items={crumbs} />
          </Space>
          <Space size="middle">
            <ThemeToggle />
            <Dropdown menu={userMenu} trigger={['click']}>
              <Button type="text" className="admin-user">
                <Avatar size="small" className="admin-avatar">
                  {initial}
                </Avatar>
                <Typography.Text className="admin-user-name">
                  {user?.name ?? '未登录'}
                </Typography.Text>
              </Button>
            </Dropdown>
          </Space>
        </Layout.Header>
        <Layout.Content className="admin-content">
          <Outlet />
        </Layout.Content>
      </Layout>
      {narrow ? (
        <Drawer
          placement="left"
          width={216}
          open={drawerOpen}
          title="同频会议 · 管理台"
          onClose={(): void => setDrawerOpen(false)}
          styles={{ body: { padding: 0 } }}
        >
          {navigation}
        </Drawer>
      ) : null}
    </Layout>
  )
}
