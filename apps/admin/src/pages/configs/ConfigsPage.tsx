import {
  Alert,
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { Can } from '@/app/Can'

import type { ConfigItem, FeatureFlagItem } from '@tongpin/shared'

import {
  createConfig,
  deleteConfig,
  fetchConfigs,
  fetchFeatureFlags,
  updateConfig,
  updateFeatureFlag,
} from '@/features/configs/api'
import { formatConfigTime, formatConfigValue, parseConfigJson } from '@/features/configs/format'

type EditorState = { open: false; editing: null } | { open: true; editing: ConfigItem | null }

type ConfigForm = { key: string; description?: string; value: string }

export function ConfigsPage(): React.JSX.Element {
  const { message } = App.useApp()
  const [form] = Form.useForm<ConfigForm>()
  const [tab, setTab] = useState('configs')
  const [configs, setConfigs] = useState<ConfigItem[]>([])
  const [flags, setFlags] = useState<FeatureFlagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>({ open: false, editing: null })
  const [saving, setSaving] = useState(false)
  const [savingFlag, setSavingFlag] = useState<string | null>(null)

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const [configList, flagList] = await Promise.all([fetchConfigs(), fetchFeatureFlags()])
      setConfigs(configList.items)
      setFlags(flagList.items)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取配置失败')
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
    form.setFieldsValue({ key: '', description: '', value: '{\n  \n}' })
  }

  const openEdit = (item: ConfigItem): void => {
    setEditor({ open: true, editing: item })
    form.setFieldsValue({
      key: item.key,
      description: item.description ?? '',
      value: JSON.stringify(item.value, null, 2),
    })
  }

  const submit = async (): Promise<void> => {
    const values = await form.validateFields()
    const parsed = parseConfigJson(values.value)
    if (!parsed.ok) {
      void message.error(parsed.message)
      return
    }
    setSaving(true)
    try {
      if (editor.editing === null) {
        await createConfig({
          key: values.key.trim(),
          value: parsed.value,
          description: values.description?.trim() === '' ? null : values.description?.trim(),
        })
        void message.success(`已新增 ${values.key}`)
      } else {
        await updateConfig(editor.editing.key, {
          value: parsed.value,
          description: values.description?.trim() === '' ? null : values.description?.trim(),
        })
        void message.success(`已更新 ${editor.editing.key}`)
      }
      setEditor({ open: false, editing: null })
      await reload()
    } catch (cause) {
      void message.error(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (key: string): Promise<void> => {
    try {
      await deleteConfig(key)
      void message.success(`已删除 ${key}`)
      await reload()
    } catch (cause) {
      void message.error(cause instanceof Error ? cause.message : '删除失败')
    }
  }

  const toggleFlag = async (flag: FeatureFlagItem, enabled: boolean): Promise<void> => {
    setSavingFlag(flag.key)
    try {
      const result = await updateFeatureFlag(flag.key, { enabled })
      setFlags((current) => current.map((item) => (item.key === flag.key ? result.flag : item)))
      void message.success(`${flag.key} 已${enabled ? '开启' : '关闭'}`)
    } catch (cause) {
      void message.error(cause instanceof Error ? cause.message : '切换失败')
    } finally {
      setSavingFlag(null)
    }
  }

  const changeRollout = async (flag: FeatureFlagItem, rolloutPct: number | null): Promise<void> => {
    if (rolloutPct === null || rolloutPct === flag.rolloutPct) {
      return
    }
    setSavingFlag(flag.key)
    try {
      const result = await updateFeatureFlag(flag.key, { rolloutPct })
      setFlags((current) => current.map((item) => (item.key === flag.key ? result.flag : item)))
      void message.success(`${flag.key} 放量 ${rolloutPct}%`)
    } catch (cause) {
      void message.error(cause instanceof Error ? cause.message : '放量修改失败')
    } finally {
      setSavingFlag(null)
    }
  }

  const configColumns: ColumnsType<ConfigItem> = [
    {
      title: '配置键',
      dataIndex: 'key',
      key: 'key',
      width: 240,
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      render: (value: unknown) => (
        <Tooltip title={<pre className="configs-json">{JSON.stringify(value, null, 2)}</pre>}>
          <Typography.Text type="secondary">{formatConfigValue(value)}</Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '更新人',
      dataIndex: 'updatedByName',
      key: 'updatedByName',
      width: 110,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 130,
      render: (value: string) => formatConfigTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_value, item) => (
        <Can perm="config:write">
          <Space size="small">
            <Button type="link" size="small" onClick={() => openEdit(item)}>
              编辑
            </Button>
            <Popconfirm title={`删除 ${item.key}？`} onConfirm={() => void remove(item.key)}>
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        </Can>
      ),
    },
  ]

  const flagColumns: ColumnsType<FeatureFlagItem> = [
    {
      title: '开关键',
      dataIndex: 'key',
      key: 'key',
      width: 200,
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean) => (enabled ? <Tag color="green">已开启</Tag> : <Tag>已关闭</Tag>),
    },
    {
      title: '总开关',
      key: 'toggle',
      width: 90,
      render: (_value, flag) => (
        <Switch
          checked={flag.enabled}
          loading={savingFlag === flag.key}
          onChange={(checked) => void toggleFlag(flag, checked)}
        />
      ),
    },
    {
      title: '放量 %',
      key: 'rolloutPct',
      width: 110,
      render: (_value, flag) => (
        <InputNumber
          min={0}
          max={100}
          size="small"
          value={flag.rolloutPct}
          onChange={(value) => void changeRollout(flag, value)}
        />
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 130,
      render: (value: string) => formatConfigTime(value),
    },
  ]

  return (
    <div className="configs">
      <header className="configs-head">
        <div>
          <Typography.Title level={2} className="configs-title">
            系统配置
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="configs-subtitle">
            配置值按 JSON 保存，写入会记录操作人；功能开关按百分比灰度放量。
          </Typography.Paragraph>
        </div>
        {tab === 'configs' && (
          <Can perm="config:write">
            <Button type="primary" onClick={openCreate}>
              新增配置
            </Button>
          </Can>
        )}
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

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'configs',
            label: '配置项',
            children: (
              <Table<ConfigItem>
                rowKey="key"
                size="middle"
                loading={loading}
                columns={configColumns}
                dataSource={configs}
                pagination={false}
                scroll={{ x: 900 }}
                locale={{ emptyText: '还没有配置项' }}
              />
            ),
          },
          {
            key: 'flags',
            label: '功能开关',
            children: (
              <Table<FeatureFlagItem>
                rowKey="key"
                size="middle"
                loading={loading}
                columns={flagColumns}
                dataSource={flags}
                pagination={false}
                scroll={{ x: 760 }}
                locale={{ emptyText: '还没有功能开关' }}
              />
            ),
          },
        ]}
      />

      <Modal
        open={editor.open}
        title={editor.editing === null ? '新增配置' : `编辑 ${editor.editing.key}`}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        destroyOnHidden
        width={640}
        onOk={() => void submit()}
        onCancel={() => setEditor({ open: false, editing: null })}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="key"
            label="配置键"
            rules={[
              { required: true, message: '请填写配置键' },
              {
                pattern: /^[a-z][a-z0-9_.-]*$/,
                message: '小写字母开头，只能含小写字母、数字、_ . -',
              },
            ]}
          >
            <Input placeholder="meeting.maxParticipants" disabled={editor.editing !== null} />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input placeholder="可选" maxLength={200} />
          </Form.Item>
          <Form.Item
            name="value"
            label="值（JSON）"
            rules={[{ required: true, message: '请填写值' }]}
          >
            <Input.TextArea rows={8} spellCheck={false} className="configs-value" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
