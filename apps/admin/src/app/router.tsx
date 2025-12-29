import { createBrowserRouter, Navigate } from 'react-router'

import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { DepartmentsPage } from '../pages/departments/DepartmentsPage'
import { LoginPage } from '../pages/login/LoginPage'
import { AlertsPage } from '../pages/alerts/AlertsPage'
import { AuditLogsPage } from '../pages/audit/AuditLogsPage'
import { ConfigsPage } from '../pages/configs/ConfigsPage'
import { CostsPage } from '../pages/costs/CostsPage'
import { HostPage } from '../pages/host/HostPage'
import { MeetingsPage } from '../pages/meetings/MeetingsPage'
import { RolesPage } from '../pages/roles/RolesPage'
import { AiPage } from '../pages/ai/AiPage'
import { SmsPage } from '../pages/sms/SmsPage'
import { UsersPage } from '../pages/users/UsersPage'
import { AdminLayout } from './AdminLayout'
import { RequireAuth } from './RequireAuth'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    handle: { crumb: '首页' },
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, handle: { crumb: '仪表盘' }, element: <DashboardPage /> },
      { path: 'meetings', handle: { crumb: '会议管理' }, element: <MeetingsPage /> },
      { path: 'roles', handle: { crumb: '角色权限' }, element: <RolesPage /> },
      { path: 'configs', handle: { crumb: '系统配置' }, element: <ConfigsPage /> },
      { path: 'audit', handle: { crumb: '审计日志' }, element: <AuditLogsPage /> },
      { path: 'host', handle: { crumb: '主机监控' }, element: <HostPage /> },
      { path: 'costs', handle: { crumb: '成本统计' }, element: <CostsPage /> },
      { path: 'alerts', handle: { crumb: '告警规则' }, element: <AlertsPage /> },
      { path: 'sms', handle: { crumb: '短信配置' }, element: <SmsPage /> },
      { path: 'ai', handle: { crumb: 'AI 配置' }, element: <AiPage /> },
      { path: 'users', handle: { crumb: '用户管理' }, element: <UsersPage /> },
      { path: 'departments', handle: { crumb: '部门管理' }, element: <DepartmentsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
