import {
  Alert,
  App,
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { useCallback, useEffect, useState } from 'react'

import type { AnnouncementItem } from '@tongpin/shared'

import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  updateAnnouncement,
} from '@/features/announcements/api'
import { announcementStatusMeta, formatAnnouncementTime } from '@/features/announcements/labels'

type FormValues = {
  title: string
  content: string
  pinned: boolean
  publishAt: Dayjs
  expireAt: Dayjs | null
}

type Editor = { open: false; item: null } | { open: true; item: AnnouncementItem | null }

export function AnnouncementsPage(): React.JSX.Element {
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const [items, setItems] = useState<AnnouncementItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editor, setEditor] = useState<Editor>({ open: false, item: null })

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const result = await fetchAnnouncements({
        page,
        pageSize,
        ...(keyword === '' ? {} : { keyword }),
      })
      setItems(result.items)
      setTotal(result.total)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取公告失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, keyword])

  useEffect(() => {
    void reload()
  }, [reload])

  const openCreate = (): void => {
    setEditor({ open: true, item: null })
    form.setFieldsValue({
      title: '',
      content: '',
      pinned: false,
      publishAt: dayjs().add(1, 'hour').second(0).millisecond(0),
      expireAt: null,
    })
  }

  const openEdit = (item: AnnouncementItem): void => {
    setEditor({ open: true, item })
    form.setFieldsValue({
      title: item.title,
      content: item.content,
      pinned: item.pinned,
      publishAt: dayjs(item.publishAt),
      expireAt: item.expireAt === null ? null : dayjs(item.expireAt),
    })
  }

  const submit = async (): Promise<void> => {
    const values = await form.validateFields()
    const payload = {
      title: values.title.trim(),
      content: values.content.trim(),
      pinned: values.pinned,
      publishAt: values.publishAt.toISOString(),
      expireAt: values.expireAt === null ? null : values.expireAt.toISOString(),
    }
    setSaving(true)
    try {
      if (editor.item === null) {
        await createAnnouncement(payload)
        void message.success('公告已创建')
      } else {
        await updateAnnouncement(editor.item.id, payload)
        void message.success('公告已更新')
      }
      setEditor({ open: false, item: null })
      await reload()
    } catch (cause) {
      void message.error(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const togglePinned = async (item: AnnouncementItem, pinned: boolean): Promise<void> => {
    setToggling(item.id)
    try {
      await updateAnnouncement(item.id, { pinned })
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, pinned } : row)))
      void message.success(pinned ? '已置顶' : '已取消置顶')
    } catch (cause) {
      void message.error(cause instanceof Error ? cause.message : '置顶操作失败')
    } finally {
      setToggling(null)
    }
  }

  const remove = async (id: string): Promise<void> => {
    try {
      await deleteAnnouncement(id)
      void message.success('公告已删除')
      await reload()
    } catch (cause) {
      void message.error(cause instanceof Error ? cause.message : '删除失败')
    }
  }

  const columns: ColumnsType<AnnouncementItem> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (value: string, item) => (
        <Space size="small">
          <Typography.Text strong>{value}</Typography.Text>
          {item.pinned && <Tag color="gold">置顶</Tag>}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: AnnouncementItem['status']): React.JSX.Element => {
        const meta = announcementStatusMeta(value)
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '发布时间',
      dataIndex: 'publishAt',
      key: 'publishAt',
      width: 160,
      render: (value: string) => formatAnnouncementTime(value),
    },
    {
      title: '过期时间',
      dataIndex: 'expireAt',
      key: 'expireAt',
      width: 160,
      render: (value: string | null) => formatAnnouncementTime(value),
    },
    {
      title: '创建人',
      dataIndex: 'createdByName',
      key: 'createdByName',
      width: 120,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '置顶',
      key: 'pinned',
      width: 80,
      render: (_value, item) => (
        <Switch
          checked={item.pinned}
          loading={toggling === item.id}
          onChange={(checked) => void togglePinned(item, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 130,
      render: (_value, item) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEdit(item)}>
            编辑
          </Button>
          <Popconfirm title={`删除「${item.title}」？`} onConfirm={() => void remove(item.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="announcements">
      <header className="announcements-head">
        <div>
          <Typography.Title level={2} className="announcements-title">
            系统公告
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="announcements-subtitle">
            公告按发布时间自动上线，过期时间可选；置顶的公告排在最前。
          </Typography.Paragraph>
        </div>
        <Button type="primary" onClick={openCreate}>
          新建公告
        </Button>
      </header>

      {error !== null && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={() => void reload()}>
              重试
            </Button>
          }
        />
      )}

      <Input.Search
        allowClear
        placeholder="按标题搜索"
        className="announcements-keyword"
        onSearch={(value) => {
          setPage(1)
          setKeyword(value.trim())
        }}
      />

      <Table<AnnouncementItem>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 1000 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (count) => `共 ${count} 条`,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage)
            setPageSize(nextSize)
          },
        }}
        locale={{ emptyText: '还没有公告' }}
      />

      <Modal
        open={editor.open}
        title={editor.item === null ? '新建公告' : '编辑公告'}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        destroyOnHidden
        width={680}
        onOk={() => void submit()}
        onCancel={() => setEditor({ open: false, item: null })}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请填写标题' }]}>
            <Input maxLength={100} showCount placeholder="例如：系统维护通知" />
          </Form.Item>
          <Form.Item
            name="content"
            label="正文"
            rules={[{ required: true, message: '请填写正文' }]}
          >
            <Input.TextArea rows={6} maxLength={5000} showCount placeholder="支持 Markdown" />
          </Form.Item>
          <Form.Item
            name="publishAt"
            label="发布时间"
            rules={[{ required: true, message: '请选择发布时间' }]}
          >
            <DatePicker showTime format="YYYY-MM-DD HH:mm" className="announcements-time" />
          </Form.Item>
          <Form.Item name="expireAt" label="过期时间">
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              className="announcements-time"
              placeholder="留空表示长期有效"
            />
          </Form.Item>
          <Form.Item name="pinned" label="置顶" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
