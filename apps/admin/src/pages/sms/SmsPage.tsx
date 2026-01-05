import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { Can } from '@/app/Can'

import type {
  SmsLogItem,
  SmsLogsQuery,
  SmsProviderCreateInput,
  SmsProviderItem,
  SmsProviderUpdateInput,
  SmsTemplateCreateInput,
  SmsTemplateItem,
  SmsTemplateUpdateInput,
} from '@tongpin/shared'

import {
  createSmsProvider,
  createSmsTemplate,
  deleteSmsProvider,
  deleteSmsTemplate,
  fetchSmsLogs,
  fetchSmsProviders,
  fetchSmsTemplates,
  updateSmsProvider,
  updateSmsTemplate,
} from '@/features/sms/api'
import { formatSmsTime, smsLogStatusMeta } from '@/features/sms/labels'

interface ProviderValues {
  code: string
  name: string
  endpoint?: string
  accessKeyId: string
  secret?: string
  signName: string
  templateCode?: string
  enabled: boolean
}

interface TemplateValues {
  code: string
  name: string
  content: string
  providerId?: string | null
  enabled: boolean
}

interface ProviderEditor {
  open: boolean
  editing: SmsProviderItem | null
}

interface TemplateEditor {
  open: boolean
  editing: SmsTemplateItem | null
}

const closedProvider: ProviderEditor = { open: false, editing: null }
const closedTemplate: TemplateEditor = { open: false, editing: null }

export function SmsPage(): React.JSX.Element {
  const { message } = App.useApp()
  const [providers, setProviders] = useState<SmsProviderItem[]>([])
  const [templates, setTemplates] = useState<SmsTemplateItem[]>([])
  const [providerEditor, setProviderEditor] = useState<ProviderEditor>(closedProvider)
  const [templateEditor, setTemplateEditor] = useState<TemplateEditor>(closedTemplate)
  const [busy, setBusy] = useState(false)
  const [providerForm] = Form.useForm<ProviderValues>()
  const [templateForm] = Form.useForm<TemplateValues>()

  const [logs, setLogs] = useState<SmsLogItem[]>([])
  const [logTotal, setLogTotal] = useState(0)
  const [logQuery, setLogQuery] = useState<SmsLogsQuery>({ page: 1, pageSize: 20 })
  const [logsLoading, setLogsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reloadProviders(): Promise<void> {
    const data = await fetchSmsProviders()
    setProviders(data.items)
  }

  async function reloadTemplates(): Promise<void> {
    const data = await fetchSmsTemplates()
    setTemplates(data.items)
  }

  useEffect(() => {
    let active = true
    Promise.all([fetchSmsProviders(), fetchSmsTemplates()])
      .then(([providerData, templateData]) => {
        if (!active) return
        setProviders(providerData.items)
        setTemplates(templateData.items)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof Error ? cause.message : '加载短信配置失败')
      })
    return (): void => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    setLogsLoading(true)
    fetchSmsLogs(logQuery)
      .then((data) => {
        if (!active) return
        setLogs(data.items)
        setLogTotal(data.total)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof Error ? cause.message : '加载发送日志失败')
      })
      .finally(() => {
        if (active) setLogsLoading(false)
      })
    return (): void => {
      active = false
    }
  }, [logQuery])

  function openCreateProvider(): void {
    setProviderEditor({ open: true, editing: null })
    providerForm.setFieldsValue({
      code: '',
      name: '',
      endpoint: undefined,
      accessKeyId: '',
      secret: '',
      signName: '同频会议',
      templateCode: undefined,
      enabled: true,
    })
  }

  function openEditProvider(provider: SmsProviderItem): void {
    setProviderEditor({ open: true, editing: provider })
    providerForm.setFieldsValue({
      code: provider.code,
      name: provider.name,
      endpoint: provider.endpoint ?? undefined,
      accessKeyId: provider.accessKeyId,
      secret: '',
      signName: provider.signName,
      templateCode: provider.templateCode ?? undefined,
      enabled: provider.enabled,
    })
  }

  async function submitProvider(): Promise<void> {
    let values: ProviderValues
    try {
      values = await providerForm.validateFields()
    } catch {
      return
    }
    setBusy(true)
    try {
      if (providerEditor.editing === null) {
        const input: SmsProviderCreateInput = {
          code: values.code,
          name: values.name,
          accessKeyId: values.accessKeyId,
          secret: values.secret ?? '',
          signName: values.signName,
          ...(values.endpoint === undefined || values.endpoint === ''
            ? {}
            : { endpoint: values.endpoint }),
          ...(values.templateCode === undefined || values.templateCode === ''
            ? {}
            : { templateCode: values.templateCode }),
          enabled: values.enabled,
        }
        await createSmsProvider(input)
        message.success('已保存服务商')
      } else {
        const input: SmsProviderUpdateInput = {
          name: values.name,
          accessKeyId: values.accessKeyId,
          signName: values.signName,
          enabled: values.enabled,
          ...(values.endpoint === undefined || values.endpoint === ''
            ? { endpoint: null }
            : { endpoint: values.endpoint }),
          ...(values.templateCode === undefined || values.templateCode === ''
            ? { templateCode: null }
            : { templateCode: values.templateCode }),
          ...(values.secret === undefined || values.secret === '' ? {} : { secret: values.secret }),
        }
        await updateSmsProvider(providerEditor.editing.id, input)
        message.success('已更新服务商')
      }
      setProviderEditor(closedProvider)
      await reloadProviders()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  function openCreateTemplate(): void {
    setTemplateEditor({ open: true, editing: null })
    templateForm.setFieldsValue({
      code: '',
      name: '',
      content: '',
      providerId: null,
      enabled: true,
    })
  }

  function openEditTemplate(template: SmsTemplateItem): void {
    setTemplateEditor({ open: true, editing: template })
    templateForm.setFieldsValue({
      code: template.code,
      name: template.name,
      content: template.content,
      providerId: template.providerId,
      enabled: template.enabled,
    })
  }

  async function submitTemplate(): Promise<void> {
    let values: TemplateValues
    try {
      values = await templateForm.validateFields()
    } catch {
      return
    }
    setBusy(true)
    try {
      if (templateEditor.editing === null) {
        const input: SmsTemplateCreateInput = {
          code: values.code,
          name: values.name,
          content: values.content,
          providerId: values.providerId ?? null,
          enabled: values.enabled,
        }
        await createSmsTemplate(input)
        message.success('已保存模板')
      } else {
        const input: SmsTemplateUpdateInput = {
          name: values.name,
          content: values.content,
          providerId: values.providerId ?? null,
          enabled: values.enabled,
        }
        await updateSmsTemplate(templateEditor.editing.id, input)
        message.success('已更新模板')
      }
      setTemplateEditor(closedTemplate)
      await reloadTemplates()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  async function removeProvider(provider: SmsProviderItem): Promise<void> {
    setBusy(true)
    try {
      await deleteSmsProvider(provider.id)
      message.success(`已删除 ${provider.name}`)
      await reloadProviders()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '删除失败')
    } finally {
      setBusy(false)
    }
  }

  async function removeTemplate(template: SmsTemplateItem): Promise<void> {
    setBusy(true)
    try {
      await deleteSmsTemplate(template.id)
      message.success(`已删除 ${template.name}`)
      await reloadTemplates()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '删除失败')
    } finally {
      setBusy(false)
    }
  }

  const providerColumns: ColumnsType<SmsProviderItem> = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
    { title: '编码', dataIndex: 'code', key: 'code', width: 140 },
    { title: '签名', dataIndex: 'signName', key: 'signName', width: 140 },
    { title: 'AccessKey ID', dataIndex: 'accessKeyId', key: 'accessKeyId' },
    { title: '密钥', dataIndex: 'secretMasked', key: 'secretMasked', width: 120 },
    {
      title: '状态',
      key: 'enabled',
      width: 90,
      render: (_value, provider) =>
        provider.enabled ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_value, provider) => (
        <Can perm="sms:write">
          <Space size="small">
            <Button type="link" size="small" onClick={() => openEditProvider(provider)}>
              编辑
            </Button>
            <Popconfirm
              title={`删除 ${provider.name}？`}
              description="删除后模板与历史日志仍会保留。"
              okText="删除"
              cancelText="取消"
              onConfirm={() => removeProvider(provider)}
            >
              <Button type="link" size="small" danger loading={busy}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        </Can>
      ),
    },
  ]

  const templateColumns: ColumnsType<SmsTemplateItem> = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
    { title: '编码', dataIndex: 'code', key: 'code', width: 150 },
    { title: '内容', dataIndex: 'content', key: 'content' },
    {
      title: '服务商',
      dataIndex: 'providerName',
      key: 'providerName',
      width: 130,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '状态',
      key: 'enabled',
      width: 90,
      render: (_value, template) =>
        template.enabled ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_value, template) => (
        <Can perm="sms:write">
          <Space size="small">
            <Button type="link" size="small" onClick={() => openEditTemplate(template)}>
              编辑
            </Button>
            <Popconfirm
              title={`删除 ${template.name}？`}
              okText="删除"
              cancelText="取消"
              onConfirm={() => removeTemplate(template)}
            >
              <Button type="link" size="small" danger loading={busy}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        </Can>
      ),
    },
  ]

  const logColumns: ColumnsType<SmsLogItem> = [
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 140 },
    { title: '模板', dataIndex: 'template', key: 'template', width: 160 },
    {
      title: '服务商',
      dataIndex: 'providerName',
      key: 'providerName',
      width: 130,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_value, log): React.JSX.Element => {
        const meta = smsLogStatusMeta(log.status)
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '失败原因',
      dataIndex: 'error',
      key: 'error',
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (value: string) => formatSmsTime(value),
    },
  ]

  return (
    <section className="sms">
      <header className="sms-head">
        <div>
          <Typography.Title level={3} className="sms-title">
            短信配置
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="sms-desc">
            密钥只写不读，列表只显示后四位；模板支持 {'{code}'} 占位符。
          </Typography.Paragraph>
        </div>
      </header>

      {error !== null && <Typography.Paragraph type="danger">{error}</Typography.Paragraph>}

      <Tabs
        defaultActiveKey="providers"
        items={[
          {
            key: 'providers',
            label: '服务商',
            children: (
              <div className="sms-tab">
                <div className="sms-toolbar">
                  <Can perm="sms:write">
                    <Button type="primary" onClick={openCreateProvider}>
                      新增服务商
                    </Button>
                  </Can>
                </div>
                <Table<SmsProviderItem>
                  rowKey="id"
                  size="middle"
                  columns={providerColumns}
                  dataSource={providers}
                  pagination={false}
                  scroll={{ x: 960 }}
                  locale={{ emptyText: '还没有服务商' }}
                />
              </div>
            ),
          },
          {
            key: 'templates',
            label: '模板',
            children: (
              <div className="sms-tab">
                <div className="sms-toolbar">
                  <Can perm="sms:write">
                    <Button type="primary" onClick={openCreateTemplate}>
                      新增模板
                    </Button>
                  </Can>
                </div>
                <Table<SmsTemplateItem>
                  rowKey="id"
                  size="middle"
                  columns={templateColumns}
                  dataSource={templates}
                  pagination={false}
                  scroll={{ x: 900 }}
                  locale={{ emptyText: '还没有模板' }}
                />
              </div>
            ),
          },
          {
            key: 'logs',
            label: '发送日志',
            children: (
              <div className="sms-tab">
                <div className="sms-toolbar">
                  <Input.Search
                    allowClear
                    placeholder="按手机号筛选"
                    className="sms-phone"
                    onSearch={(value) => {
                      setLogQuery((current) => ({ ...current, page: 1, phone: value }))
                    }}
                  />
                  <Select
                    allowClear
                    placeholder="全部状态"
                    className="sms-status"
                    options={[
                      { value: 'SENT', label: '已发送' },
                      { value: 'FAILED', label: '失败' },
                    ]}
                    onChange={(value: 'SENT' | 'FAILED' | undefined) => {
                      setLogQuery((current) => ({ ...current, page: 1, status: value }))
                    }}
                  />
                </div>
                <Table<SmsLogItem>
                  rowKey="id"
                  size="middle"
                  loading={logsLoading}
                  columns={logColumns}
                  dataSource={logs}
                  scroll={{ x: 900 }}
                  pagination={{
                    current: logQuery.page,
                    pageSize: logQuery.pageSize,
                    total: logTotal,
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`,
                    onChange: (page, pageSize) => {
                      setLogQuery((current) => ({ ...current, page, pageSize }))
                    },
                  }}
                  locale={{ emptyText: '还没有发送记录' }}
                />
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={providerEditor.open}
        title={
          providerEditor.editing === null ? '新增服务商' : `编辑 ${providerEditor.editing.name}`
        }
        okText="保存"
        cancelText="取消"
        confirmLoading={busy}
        destroyOnHidden
        width={560}
        styles={{ body: { maxHeight: '60vh', overflowY: 'auto' } }}
        onOk={() => void submitProvider()}
        onCancel={() => setProviderEditor(closedProvider)}
      >
        <Form form={providerForm} layout="vertical">
          <Form.Item
            name="name"
            label="服务商名称"
            rules={[{ required: true, message: '请填写名称' }]}
          >
            <Input maxLength={30} placeholder="例如：阿里云" />
          </Form.Item>
          <Form.Item
            name="code"
            label="服务商编码"
            extra="大写字母开头；创建后不可修改"
            rules={[
              { required: true, message: '请填写编码' },
              { pattern: /^[A-Z][A-Z0-9_]{1,31}$/, message: '只能含大写字母、数字和下划线' },
            ]}
          >
            <Input
              maxLength={32}
              disabled={providerEditor.editing !== null}
              placeholder="ALIYUN"
              onChange={(event) => {
                providerForm.setFieldValue('code', event.target.value.toUpperCase())
              }}
            />
          </Form.Item>
          <Form.Item name="endpoint" label="接口地址">
            <Input placeholder="https://dysmsapi.aliyuncs.com" />
          </Form.Item>
          <Form.Item
            name="accessKeyId"
            label="AccessKey ID"
            rules={[{ required: true, message: '请填写 AccessKey ID' }]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            name="secret"
            label="AccessKey Secret"
            extra={providerEditor.editing === null ? '保存后不再回显' : '留空表示不修改'}
            rules={
              providerEditor.editing === null ? [{ required: true, message: '请填写 Secret' }] : []
            }
          >
            <Input.Password maxLength={200} autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="signName"
            label="短信签名"
            rules={[{ required: true, message: '请填写签名' }]}
          >
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item name="templateCode" label="默认模板 Code">
            <Input maxLength={60} placeholder="SMS_123456" />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={templateEditor.open}
        title={templateEditor.editing === null ? '新增模板' : `编辑 ${templateEditor.editing.name}`}
        okText="保存"
        cancelText="取消"
        confirmLoading={busy}
        destroyOnHidden
        width={560}
        onOk={() => void submitTemplate()}
        onCancel={() => setTemplateEditor(closedTemplate)}
      >
        <Form form={templateForm} layout="vertical">
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请填写名称' }]}
          >
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item
            name="code"
            label="模板编码"
            rules={[{ required: true, message: '请填写编码' }]}
          >
            <Input
              maxLength={32}
              disabled={templateEditor.editing !== null}
              placeholder="LOGIN_CODE"
            />
          </Form.Item>
          <Form.Item
            name="content"
            label="模板内容"
            rules={[{ required: true, message: '请填写内容' }]}
          >
            <Input.TextArea
              rows={3}
              maxLength={500}
              placeholder="您的验证码是 {code}，5 分钟内有效。"
            />
          </Form.Item>
          <Form.Item name="providerId" label="服务商">
            <Select
              allowClear
              placeholder="不指定"
              options={providers.map((provider) => ({ value: provider.id, label: provider.name }))}
            />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}
