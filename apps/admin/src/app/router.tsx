import { createBrowserRouter, Navigate } from 'react-router'

import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { DepartmentsPage } from '../pages/departments/DepartmentsPage'
import { LoginPage } from '../pages/login/LoginPage'
import { AlertsPage } from '../pages/alerts/AlertsPage'
import { AnnouncementsPage } from '../pages/announcements/AnnouncementsPage'
import { AuditLogsPage } from '../pages/audit/AuditLogsPage'
import { ConfigsPage } from '../pages/configs/ConfigsPage'
import { FeedbacksPage } from '../pages/feedbacks/FeedbacksPage'
import { CostsPage } from '../pages/costs/CostsPage'
import { ExportsPage } from '../pages/exports/ExportsPage'
import { HostPage } from '../pages/host/HostPage'
import { MeetingsPage } from '../pages/meetings/MeetingsPage'
import { RolesPage } from '../pages/roles/RolesPage'
import { AiPage } from '../pages/ai/AiPage'
import { SmsPage } from '../pages/sms/SmsPage'
import { UsersPage } from '../pages/users/UsersPage'
import { AdminLayout } from './AdminLayout'
import { RequireAuth } from './RequireAuth'
import { RequirePermission } from './Can'

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
      {
        index: true,
        handle: { crumb: '仪表盘' },
        element: (
          <RequirePermission perm="stats:read">
            <DashboardPage />
          </RequirePermission>
        ),
      },
      {
        path: 'meetings',
        handle: { crumb: '会议管理' },
        element: (
          <RequirePermission perm="meeting:read">
            <MeetingsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'roles',
        handle: { crumb: '角色权限' },
        element: (
          <RequirePermission perm="user:read">
            <RolesPage />
          </RequirePermission>
        ),
      },
      {
        path: 'configs',
        handle: { crumb: '系统配置' },
        element: (
          <RequirePermission perm="config:read">
            <ConfigsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'audit',
        handle: { crumb: '审计日志' },
        element: (
          <RequirePermission perm="audit:read">
            <AuditLogsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'announcements',
        handle: { crumb: '系统公告' },
        element: (
          <RequirePermission perm="announcement:read">
            <AnnouncementsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'feedbacks',
        handle: { crumb: '反馈管理' },
        element: (
          <RequirePermission perm="feedback:read">
            <FeedbacksPage />
          </RequirePermission>
        ),
      },
      {
        path: 'host',
        handle: { crumb: '主机监控' },
        element: (
          <RequirePermission perm="stats:read">
            <HostPage />
          </RequirePermission>
        ),
      },
      {
        path: 'costs',
        handle: { crumb: '成本统计' },
        element: (
          <RequirePermission perm="cost:read">
            <CostsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'alerts',
        handle: { crumb: '告警规则' },
        element: (
          <RequirePermission perm="alert:read">
            <AlertsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'exports',
        handle: { crumb: '下载中心' },
        element: (
          <RequirePermission perm="stats:read">
            <ExportsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'sms',
        handle: { crumb: '短信配置' },
        element: (
          <RequirePermission perm="sms:read">
            <SmsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'ai',
        handle: { crumb: 'AI 配置' },
        element: (
          <RequirePermission perm="ai:read">
            <AiPage />
          </RequirePermission>
        ),
      },
      {
        path: 'users',
        handle: { crumb: '用户管理' },
        element: (
          <RequirePermission perm="user:read">
            <UsersPage />
          </RequirePermission>
        ),
      },
      {
        path: 'departments',
        handle: { crumb: '部门管理' },
        element: (
          <RequirePermission perm="dept:write">
            <DepartmentsPage />
          </RequirePermission>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
