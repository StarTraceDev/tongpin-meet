import { Alert, App, Button, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { Can } from '@/app/Can'

import { FEEDBACK_TRANSITIONS } from '@tongpin/shared'
import type { FeedbackCategory, FeedbackItem, FeedbackStatus } from '@tongpin/shared'

import { createFeedback, fetchFeedbacks, handleFeedback } from '@/features/feedbacks/api'
import {
  categoryMeta,
  formatFeedbackTime,
  sourceLabel,
  statusMeta,
} from '@/features/feedbacks/labels'

const CATEGORY_OPTIONS: FeedbackCategory[] = ['SUGGESTION', 'COMPLAINT', 'ISSUE', 'OTHER']
const STATUS_OPTIONS: FeedbackStatus[] = ['PENDING', 'PROCESSING', 'RESOLVED', 'REJECTED']

type Editor =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'handle'; item: FeedbackItem }

type HandleForm = { status: FeedbackStatus; reply?: string }
type CreateForm = { category: FeedbackCategory; content: string; contact?: string }

export function FeedbacksPage(): React.JSX.Element {
  const { message } = App.useApp()
  const [createForm] = Form.useForm<CreateForm>()
  const [handleForm] = Form.useForm<HandleForm>()
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [status, setStatus] = useState<FeedbackStatus | null>(null)
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editor, setEditor] = useState<Editor>({ open: false })

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const result = await fetchFeedbacks({
        page,
        pageSize,
        ...(status === null ? {} : { status }),
        ...(category === null ? {} : { category }),
        ...(keyword === '' ? {} : { keyword }),
      })
      setItems(result.items)
      setTotal(result.total)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取反馈失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, status, category, keyword])

  useEffect(() => {
    void reload()
  }, [reload])

  const submitCreate = async (): Promise<void> => {
    const values = await createForm.validateFields()
    setSaving(true)
    try {
      await createFeedback({
        category: values.category,
        content: values.content.trim(),
        contact: values.contact?.trim() === '' ? null : values.contact?.trim(),
      })
      void message.success('已代录反馈')
      setEditor({ open: false })
      createForm.resetFields()
      await reload()
    } catch (cause) {
      void message.error(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const submitHandle = async (): Promise<void> => {
    if (editor.open === false || editor.mode !== 'handle') {
      return
    }
    const values = await handleForm.validateFields()
    setSaving(true)
    try {
      await handleFeedback(editor.item.id, {
        status: values.status,
        reply: values.reply?.trim() === '' ? null : values.reply?.trim(),
      })
      void message.success('已更新反馈状态')
      setEditor({ open: false })
      await reload()
    } catch (cause) {
      void message.error(cause instanceof Error ? cause.message : '处理失败')
    } finally {
      setSaving(false)
    }
  }

  const openHandle = (item: FeedbackItem): void => {
    const next = FEEDBACK_TRANSITIONS[item.status][0]
    setEditor({ open: true, mode: 'handle', item })
    handleForm.setFieldsValue({ status: next, reply: item.reply ?? '' })
  }

  const columns: ColumnsType<FeedbackItem> = [
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (value: string) => formatFeedbackTime(value),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (value: FeedbackCategory): React.JSX.Element => {
        const meta = categoryMeta(value)
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (value: string) => <span title={value}>{value}</span>,
    },
    {
      title: '联系方式',
      dataIndex: 'contact',
      key: 'contact',
      width: 160,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 120,
      render: (value: 'ADMIN' | 'USER') => sourceLabel(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: FeedbackStatus): React.JSX.Element => {
        const meta = statusMeta(value)
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '处理人',
      dataIndex: 'handledName',
      key: 'handledName',
      width: 110,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_value, item): React.JSX.Element => {
        const reply = item.reply
        return (
          <Can perm="feedback:write">
            <Space size="small" wrap>
              <Button type="link" size="small" onClick={() => openHandle(item)}>
                {item.status === 'PENDING' ? '开始处理' : '处理'}
              </Button>
              {reply !== null && (
                <span title={reply}>
                  <Typography.Text type="secondary" className="feedbacks-reply">
                    {reply}
                  </Typography.Text>
                </span>
              )}
            </Space>
          </Can>
        )
      },
    },
  ]

  const handleOptions =
    editor.open && editor.mode === 'handle'
      ? FEEDBACK_TRANSITIONS[editor.item.status].map((next) => ({
          value: next,
          label: statusMeta(next).label,
        }))
      : []

  return (
    <div className="feedbacks">
      <header className="feedbacks-head">
        <div>
          <Typography.Title level={2} className="feedbacks-title">
            反馈管理
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="feedbacks-subtitle">
            待处理 → 处理中 → 已解决 / 已驳回，状态只按这条链路流转。
          </Typography.Paragraph>
        </div>
        <Can perm="feedback:write">
          <Button type="primary" onClick={() => setEditor({ open: true, mode: 'create' })}>
            代录反馈
          </Button>
        </Can>
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

      <Space wrap className="feedbacks-filters">
        <Input.Search
          allowClear
          placeholder="搜索内容或联系方式"
          className="feedbacks-keyword"
          onSearch={(value) => {
            setPage(1)
            setKeyword(value.trim())
          }}
        />
        <Select
          allowClear
          placeholder="全部状态"
          className="feedbacks-status"
          value={status}
          onChange={(value: FeedbackStatus | undefined) => {
            setPage(1)
            setStatus(value ?? null)
          }}
          options={STATUS_OPTIONS.map((value) => ({ value, label: statusMeta(value).label }))}
        />
        <Select
          allowClear
          placeholder="全部分类"
          className="feedbacks-status"
          value={category}
          onChange={(value: FeedbackCategory | undefined) => {
            setPage(1)
            setCategory(value ?? null)
          }}
          options={CATEGORY_OPTIONS.map((value) => ({ value, label: categoryMeta(value).label }))}
        />
      </Space>

      <Table<FeedbackItem>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 1150 }}
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
        locale={{ emptyText: '还没有反馈' }}
      />

      <Modal
        open={editor.open && editor.mode === 'create'}
        title="代录反馈"
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        destroyOnHidden
        onOk={() => void submitCreate()}
        onCancel={() => setEditor({ open: false })}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{ category: 'OTHER' as FeedbackCategory }}
        >
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select
              options={CATEGORY_OPTIONS.map((value) => ({
                value,
                label: categoryMeta(value).label,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请填写反馈内容' }]}
          >
            <Input.TextArea rows={5} maxLength={2000} showCount />
          </Form.Item>
          <Form.Item name="contact" label="联系方式">
            <Input placeholder="手机号 / 邮箱，可选" maxLength={100} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={editor.open && editor.mode === 'handle'}
        title="处理反馈"
        okText="提交"
        cancelText="取消"
        confirmLoading={saving}
        destroyOnHidden
        onOk={() => void submitHandle()}
        onCancel={() => setEditor({ open: false })}
      >
        {editor.open && editor.mode === 'handle' && (
          <Typography.Paragraph type="secondary" className="feedbacks-modal-content">
            {editor.item.content}
          </Typography.Paragraph>
        )}
        <Form form={handleForm} layout="vertical">
          <Form.Item name="status" label="流转到" rules={[{ required: true }]}>
            <Select options={handleOptions} />
          </Form.Item>
          <Form.Item name="reply" label="回复">
            <Input.TextArea
              rows={4}
              maxLength={1000}
              showCount
              placeholder="会展示给处理人和提交人记录"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
