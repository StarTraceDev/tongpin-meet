import {
  Alert,
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { Can } from '@/app/Can'

import type { AlertRuleItem } from '@tongpin/shared'

import {
  createAlertRule,
  deleteAlertRule,
  fetchAlertRules,
  updateAlertRule,
} from '@/features/alerts/api'
import {
  ALERT_CHANNELS,
  ALERT_COMPARATORS,
  ALERT_METRICS,
  channelLabel,
  ruleCondition,
} from '@/features/alerts/labels'

type EditorState = { open: false; editing: null } | { open: true; editing: AlertRuleItem | null }

type RuleForm = {
  name: string
  metric: AlertRuleItem['metric']
  comparator: AlertRuleItem['comparator']
  threshold: number
  channel: AlertRuleItem['channel']
  target?: string
  enabled: boolean
}

const DEFAULTS: RuleForm = {
  name: '',
  metric: 'cpu',
  comparator: 'GT',
  threshold: 85,
  channel: 'INBOX',
  target: '',
  enabled: true,
}

export function AlertsPage(): React.JSX.Element {
  const { message } = App.useApp()
  const [form] = Form.useForm<RuleForm>()
  const [rules, setRules] = useState<AlertRuleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>({ open: false, editing: null })
  const [saving, setSaving] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const channel = Form.useWatch('channel', form)

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const result = await fetchAlertRules()
      setRules(result.items)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取告警规则失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const run = async (): Promise<void> => {
      if (!active) return
      await reload()
    }
    void run()
    return (): void => {
      active = false
    }
  }, [reload])

  const openCreate = (): void => {
    setEditor({ open: true, editing: null })
    form.setFieldsValue(DEFAULTS)
  }

  const openEdit = (rule: AlertRuleItem): void => {
    setEditor({ open: true, editing: rule })
    form.setFieldsValue({
      name: rule.name,
      metric: rule.metric,
      comparator: rule.comparator,
      threshold: rule.threshold,
      channel: rule.channel,
      target: rule.target ?? '',
      enabled: rule.enabled,
    })
  }

  const submit = async (): Promise<void> => {
    const values = await form.validateFields()
    setSaving(true)
    const payload = {
      name: values.name.trim(),
      metric: values.metric,
      comparator: values.comparator,
      threshold: values.threshold,
      channel: values.channel,
      target: values.target?.trim() === '' ? null : values.target?.trim(),
      enabled: values.enabled,
    }
    try {
      if (editor.editing === null) {
        await createAlertRule(payload)
        void message.success(`已新增「${payload.name}」`)
      } else {
        await updateAlertRule(editor.editing.id, payload)
        void message.success(`已更新「${payload.name}」`)
      }
      setEditor({ open: false, editing: null })
      await reload()
    } catch (cause) {
      void message.error(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (rule: AlertRuleItem, enabled: boolean): Promise<void> => {
    setSavingId(rule.id)
    try {
      const result = await updateAlertRule(rule.id, { enabled })
      setRules((current) => current.map((item) => (item.id === rule.id ? result.rule : item)))
      void message.success(`「${rule.name}」已${enabled ? '启用' : '停用'}`)
    } catch (cause) {
      void message.error(cause instanceof Error ? cause.message : '切换失败')
    } finally {
      setSavingId(null)
    }
  }

  const remove = async (rule: AlertRuleItem): Promise<void> => {
    try {
      await deleteAlertRule(rule.id)
      void message.success(`已删除「${rule.name}」`)
      await reload()
    } catch (cause) {
      void message.error(cause instanceof Error ? cause.message : '删除失败')
    }
  }

  const columns: ColumnsType<AlertRuleItem> = [
    {
      title: '规则',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: '触发条件',
      key: 'condition',
      width: 200,
      render: (_value, rule) => <Typography.Text code>{ruleCondition(rule)}</Typography.Text>,
    },
    {
      title: '通知方式',
      dataIndex: 'channel',
      key: 'channel',
      width: 100,
      render: (value: AlertRuleItem['channel']) => channelLabel(value),
    },
    {
      title: '接收目标',
      dataIndex: 'target',
      key: 'target',
      width: 220,
      ellipsis: true,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean) => (enabled ? <Tag color="green">已启用</Tag> : <Tag>已停用</Tag>),
    },
    {
      title: '开关',
      key: 'toggle',
      width: 90,
      render: (_value, rule) => (
        <Switch
          checked={rule.enabled}
          loading={savingId === rule.id}
          onChange={(checked) => void toggle(rule, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_value, rule) => (
        <Can perm="alert:write">
          <Space size="small">
            <Button type="link" size="small" onClick={() => openEdit(rule)}>
              编辑
            </Button>
            <Popconfirm title={`删除「${rule.name}」？`} onConfirm={() => void remove(rule)}>
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        </Can>
      ),
    },
  ]

  return (
    <div className="alerts">
      <header className="alerts-head">
        <div>
          <Typography.Title level={2} className="alerts-title">
            告警规则
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="alerts-subtitle">
            指标越过阈值时按通知方式推送；站内信不需要额外填写接收地址。
          </Typography.Paragraph>
        </div>
        <Can perm="alert:write">
          <Button type="primary" onClick={openCreate}>
            新增规则
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

      <Table<AlertRuleItem>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={rules}
        pagination={false}
        scroll={{ x: 940 }}
        locale={{ emptyText: '还没有告警规则' }}
      />

      <Modal
        open={editor.open}
        title={editor.editing === null ? '新增规则' : `编辑「${editor.editing.name}」`}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        destroyOnHidden
        width={520}
        onOk={() => void submit()}
        onCancel={() => setEditor({ open: false, editing: null })}
      >
        <Form form={form} layout="vertical" initialValues={DEFAULTS}>
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请填写规则名称' }]}
          >
            <Input placeholder="例如：CPU 持续过高" maxLength={40} />
          </Form.Item>
          <Form.Item name="metric" label="监控指标" rules={[{ required: true }]}>
            <Select
              options={ALERT_METRICS.map((item) => ({ value: item.value, label: item.label }))}
            />
          </Form.Item>
          <Space.Compact block>
            <Form.Item
              name="comparator"
              label="比较"
              rules={[{ required: true }]}
              style={{ width: '40%' }}
            >
              <Select
                options={ALERT_COMPARATORS.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="threshold"
              label="阈值"
              rules={[{ required: true, message: '请填写阈值' }]}
              style={{ flex: 1, marginLeft: 8 }}
            >
              <InputNumber min={0} max={100000} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="channel" label="通知方式" rules={[{ required: true }]}>
            <Select
              options={ALERT_CHANNELS.map((item) => ({ value: item.value, label: item.label }))}
            />
          </Form.Item>
          {channel !== 'INBOX' && (
            <Form.Item
              name="target"
              label={
                channel === 'SMS' ? '接收手机号' : channel === 'EMAIL' ? '接收邮箱' : 'Webhook 地址'
              }
              rules={[{ required: true, message: '请填写接收地址' }]}
            >
              <Input
                placeholder={channel === 'WEBHOOK' ? 'https://...' : '多个用逗号分隔'}
                maxLength={200}
              />
            </Form.Item>
          )}
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
