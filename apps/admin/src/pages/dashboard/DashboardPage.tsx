import { Card, Typography } from 'antd'
import type { ReactElement } from 'react'

import { useAuth } from '../../app/AuthProvider'

export function DashboardPage(): ReactElement {
  const { user } = useAuth()

  return (
    <Card>
      <Typography.Title level={3}>工作台</Typography.Title>
      <Typography.Paragraph>
        欢迎回来，{user?.name ?? '管理员'}。数据概览与实时房间将在后续版本接入。
      </Typography.Paragraph>
    </Card>
  )
}
