import type { AdminRoom } from '@tongpin/shared/types'
import { Table } from 'antd'
import type { TableProps } from 'antd'
import type { ReactElement } from 'react'

import { formatStartedAt } from './format'

interface LiveRoomsTableProps {
  rooms: AdminRoom[]
}

const columns: NonNullable<TableProps<AdminRoom>['columns']> = [
  { title: '会议号', dataIndex: 'meetingNo', width: 120 },
  { title: '会议主题', dataIndex: 'title', ellipsis: true },
  { title: '主持人', dataIndex: 'hostName', width: 120 },
  {
    title: '在线',
    dataIndex: 'onlineCount',
    width: 80,
    align: 'right',
  },
  {
    title: '开始时间',
    dataIndex: 'startedAt',
    width: 150,
    render: (value: string | null): string => formatStartedAt(value),
  },
]

export function LiveRoomsTable({ rooms }: LiveRoomsTableProps): ReactElement {
  return (
    <Table<AdminRoom>
      size="small"
      rowKey="meetingId"
      columns={columns}
      dataSource={rooms}
      pagination={false}
      locale={{ emptyText: '当前没有进行中的会议' }}
      scroll={{ x: 600 }}
    />
  )
}
