import { createBrowserRouter, Navigate } from 'react-router'

import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { LoginPage } from '../pages/login/LoginPage'
import { MeetingsPage } from '../pages/meetings/MeetingsPage'
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
      { path: 'users', handle: { crumb: '用户管理' }, element: <UsersPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
