import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Statistic,
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
  AiProviderCreateInput,
  AiProviderItem,
  AiProviderUpdateInput,
  AiRouteCreateInput,
  AiRouteItem,
  AiRouteUpdateInput,
  AiUsageItem,
  AiUsageQuery,
  AiUsageTotals,
} from '@tongpin/shared'

import {
  createAiProvider,
  createAiRoute,
  deleteAiProvider,
  deleteAiRoute,
  fetchAiProviders,
  fetchAiRoutes,
  fetchAiUsage,
  updateAiProvider,
  updateAiRoute,
} from '@/features/ai/api'
import { formatAiTime, formatCost, formatTokens, sceneLabel } from '@/features/ai/labels'

interface ProviderValues {
  code: string
  name: string
  baseUrl: string
  model: string
  apiKey?: string
  enabled: boolean
}

interface RouteValues {
  scene: string
  providerId?: string | null
  modelOverride?: string
  enabled: boolean
}

type ProviderEditor = { open: boolean; editing: AiProviderItem | null }
type RouteEditor = { open: boolean; editing: AiRouteItem | null }

const closedProvider: ProviderEditor = { open: false, editing: null }
const closedRoute: RouteEditor = { open: false, editing: null }
const EMPTY_TOTALS: AiUsageTotals = { calls: 0, promptTokens: 0, completionTokens: 0, costCents: 0 }

export function AiPage(): React.JSX.Element {
  const { message } = App.useApp()
  const [providers, setProviders] = useState<AiProviderItem[]>([])
  const [routes, setRoutes] = useState<AiRouteItem[]>([])
  const [providerEditor, setProviderEditor] = useState<ProviderEditor>(closedProvider)
  const [routeEditor, setRouteEditor] = useState<RouteEditor>(closedRoute)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [providerForm] = Form.useForm<ProviderValues>()
  const [routeForm] = Form.useForm<RouteValues>()

  const [usage, setUsage] = useState<AiUsageItem[]>([])
  const [totals, setTotals] = useState<AiUsageTotals>(EMPTY_TOTALS)
  const [usageTotal, setUsageTotal] = useState(0)
  const [usageQuery, setUsageQuery] = useState<AiUsageQuery>({ page: 1, pageSize: 20 })
  const [usageLoading, setUsageLoading] = useState(false)

  async function reloadProviders(): Promise<void> {
    setProviders((await fetchAiProviders()).items)
  }

  async function reloadRoutes(): Promise<void> {
    setRoutes((await fetchAiRoutes()).items)
  }

  useEffect(() => {
    let active = true
    Promise.all([fetchAiProviders(), fetchAiRoutes()])
      .then(([providerData, routeData]) => {
        if (!active) return
        setProviders(providerData.items)
        setRoutes(routeData.items)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof Error ? cause.message : '加载 AI 配置失败')
      })
    return (): void => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    setUsageLoading(true)
    fetchAiUsage(usageQuery)
      .then((data) => {
        if (!active) return
        setUsage(data.items)
        setUsageTotal(data.total)
        setTotals(data.totals)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof Error ? cause.message : '加载用量失败')
      })
      .finally(() => {
        if (active) setUsageLoading(false)
      })
    return (): void => {
      active = false
    }
  }, [usageQuery])

  function openCreateProvider(): void {
    setProviderEditor({ open: true, editing: null })
    providerForm.setFieldsValue({
      code: '',
      name: '',
      baseUrl: '',
      model: '',
      apiKey: '',
      enabled: true,
    })
  }

  function openEditProvider(provider: AiProviderItem): void {
    setProviderEditor({ open: true, editing: provider })
    providerForm.setFieldsValue({
      code: provider.code,
      name: provider.name,
      baseUrl: provider.baseUrl,
      model: provider.model,
      apiKey: '',
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
        const input: AiProviderCreateInput = {
          code: values.code,
          name: values.name,
          baseUrl: values.baseUrl,
          model: values.model,
          apiKey: values.apiKey ?? '',
          enabled: values.enabled,
        }
        await createAiProvider(input)
        message.success('已保存服务商')
      } else {
        const input: AiProviderUpdateInput = {
          name: values.name,
          baseUrl: values.baseUrl,
          model: values.model,
          enabled: values.enabled,
          ...(values.apiKey === undefined || values.apiKey === '' ? {} : { apiKey: values.apiKey }),
        }
        await updateAiProvider(providerEditor.editing.id, input)
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

  function openCreateRoute(): void {
    setRouteEditor({ open: true, editing: null })
    routeForm.setFieldsValue({
      scene: '',
      providerId: null,
      modelOverride: undefined,
      enabled: true,
    })
  }

  function openEditRoute(route: AiRouteItem): void {
    setRouteEditor({ open: true, editing: route })
    routeForm.setFieldsValue({
      scene: route.scene,
      providerId: route.providerId,
      modelOverride: route.modelOverride ?? undefined,
      enabled: route.enabled,
    })
  }

  async function submitRoute(): Promise<void> {
    let values: RouteValues
    try {
      values = await routeForm.validateFields()
    } catch {
      return
    }
    setBusy(true)
    try {
      if (routeEditor.editing === null) {
        const input: AiRouteCreateInput = {
          scene: values.scene,
          providerId: values.providerId ?? null,
          modelOverride:
            values.modelOverride === undefined || values.modelOverride === ''
              ? null
              : values.modelOverride,
          enabled: values.enabled,
        }
        await createAiRoute(input)
        message.success('已保存路由')
      } else {
        const input: AiRouteUpdateInput = {
          providerId: values.providerId ?? null,
          modelOverride:
            values.modelOverride === undefined || values.modelOverride === ''
              ? null
              : values.modelOverride,
          enabled: values.enabled,
        }
        await updateAiRoute(routeEditor.editing.id, input)
        message.success('已更新路由')
      }
      setRouteEditor(closedRoute)
      await reloadRoutes()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  async function removeProvider(provider: AiProviderItem): Promise<void> {
    setBusy(true)
    try {
      await deleteAiProvider(provider.id)
      message.success(`已删除 ${provider.name}`)
      await reloadProviders()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '删除失败')
    } finally {
      setBusy(false)
    }
  }

  async function removeRoute(route: AiRouteItem): Promise<void> {
    setBusy(true)
    try {
      await deleteAiRoute(route.id)
      message.success(`已删除 ${sceneLabel(route.scene)} 路由`)
      await reloadRoutes()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '删除失败')
    } finally {
      setBusy(false)
    }
  }

  const providerColumns: ColumnsType<AiProviderItem> = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: '编码', dataIndex: 'code', key: 'code', width: 130 },
    { title: '默认模型', dataIndex: 'model', key: 'model', width: 170 },
    { title: '接口地址', dataIndex: 'baseUrl', key: 'baseUrl' },
    { title: '密钥', dataIndex: 'apiKeyMasked', key: 'apiKeyMasked', width: 110 },
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
        <Can perm="ai:write">
          <Space size="small">
            <Button type="link" size="small" onClick={() => openEditProvider(provider)}>
              编辑
            </Button>
            <Popconfirm
              title={`删除 ${provider.name}？`}
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

  const routeColumns: ColumnsType<AiRouteItem> = [
    {
      title: '场景',
      dataIndex: 'scene',
      key: 'scene',
      width: 180,
      render: (value: string) => sceneLabel(value),
    },
    {
      title: '服务商',
      dataIndex: 'providerName',
      key: 'providerName',
      width: 160,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '模型覆盖',
      dataIndex: 'modelOverride',
      key: 'modelOverride',
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '状态',
      key: 'enabled',
      width: 90,
      render: (_value, route) => (route.enabled ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_value, route) => (
        <Can perm="ai:write">
          <Space size="small">
            <Button type="link" size="small" onClick={() => openEditRoute(route)}>
              编辑
            </Button>
            <Popconfirm
              title={`删除 ${sceneLabel(route.scene)} 路由？`}
              okText="删除"
              cancelText="取消"
              onConfirm={() => removeRoute(route)}
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

  const usageColumns: ColumnsType<AiUsageItem> = [
    {
      title: '场景',
      dataIndex: 'scene',
      key: 'scene',
      width: 160,
      render: (value: string) => sceneLabel(value),
    },
    {
      title: '服务商',
      dataIndex: 'providerName',
      key: 'providerName',
      width: 150,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '输入 tokens',
      dataIndex: 'promptTokens',
      key: 'promptTokens',
      width: 130,
      render: (value: number) => formatTokens(value),
    },
    {
      title: '输出 tokens',
      dataIndex: 'completionTokens',
      key: 'completionTokens',
      width: 130,
      render: (value: number) => formatTokens(value),
    },
    {
      title: '费用',
      dataIndex: 'costCents',
      key: 'costCents',
      width: 100,
      render: (value: number) => formatCost(value),
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (value: string) => formatAiTime(value),
    },
  ]

  return (
    <section className="ai">
      <header className="ai-head">
        <div>
          <Typography.Title level={3} className="ai-title">
            AI 配置
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="ai-desc">
            服务商密钥只写不读；路由按场景指定服务商与模型覆盖，用量只读。
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
              <div className="ai-tab">
                <div className="ai-toolbar">
                  <Can perm="ai:write">
                    <Button type="primary" onClick={openCreateProvider}>
                      新增服务商
                    </Button>
                  </Can>
                </div>
                <Table<AiProviderItem>
                  rowKey="id"
                  size="middle"
                  columns={providerColumns}
                  dataSource={providers}
                  pagination={false}
                  scroll={{ x: 1000 }}
                  locale={{ emptyText: '还没有 AI 服务商' }}
                />
              </div>
            ),
          },
          {
            key: 'routes',
            label: '场景路由',
            children: (
              <div className="ai-tab">
                <div className="ai-toolbar">
                  <Can perm="ai:write">
                    <Button type="primary" onClick={openCreateRoute}>
                      新增路由
                    </Button>
                  </Can>
                </div>
                <Table<AiRouteItem>
                  rowKey="id"
                  size="middle"
                  columns={routeColumns}
                  dataSource={routes}
                  pagination={false}
                  scroll={{ x: 760 }}
                  locale={{ emptyText: '还没有场景路由' }}
                />
              </div>
            ),
          },
          {
            key: 'usage',
            label: '用量',
            children: (
              <div className="ai-tab">
                <div className="ai-totals">
                  <Statistic title="调用次数" value={totals.calls} />
                  <Statistic title="输入 tokens" value={formatTokens(totals.promptTokens)} />
                  <Statistic title="输出 tokens" value={formatTokens(totals.completionTokens)} />
                  <Statistic title="费用" value={formatCost(totals.costCents)} />
                </div>
                <div className="ai-toolbar">
                  <Select
                    allowClear
                    placeholder="全部场景"
                    className="ai-scene"
                    options={Object.entries({
                      minutes: '会议纪要',
                      qa: 'AI 问答',
                      summary: '会议摘要',
                    }).map(([value, label]) => ({ value, label }))}
                    onChange={(value: string | undefined) => {
                      setUsageQuery((current) => ({ ...current, page: 1, scene: value }))
                    }}
                  />
                </div>
                <Table<AiUsageItem>
                  rowKey="id"
                  size="middle"
                  loading={usageLoading}
                  columns={usageColumns}
                  dataSource={usage}
                  scroll={{ x: 860 }}
                  pagination={{
                    current: usageQuery.page,
                    pageSize: usageQuery.pageSize,
                    total: usageTotal,
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`,
                    onChange: (page, pageSize) => {
                      setUsageQuery((current) => ({ ...current, page, pageSize }))
                    },
                  }}
                  locale={{ emptyText: '还没有用量记录' }}
                />
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={providerEditor.open}
        title={
          providerEditor.editing === null ? '新增 AI 服务商' : `编辑 ${providerEditor.editing.name}`
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
            <Input maxLength={30} placeholder="例如：DeepSeek" />
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
              placeholder="DEEPSEEK"
              onChange={(event) => {
                providerForm.setFieldValue('code', event.target.value.toUpperCase())
              }}
            />
          </Form.Item>
          <Form.Item
            name="baseUrl"
            label="接口地址"
            rules={[{ required: true, message: '请填写接口地址' }]}
          >
            <Input placeholder="https://api.deepseek.com" />
          </Form.Item>
          <Form.Item
            name="model"
            label="默认模型"
            rules={[{ required: true, message: '请填写模型' }]}
          >
            <Input maxLength={80} placeholder="deepseek-chat" />
          </Form.Item>
          <Form.Item
            name="apiKey"
            label="API Key"
            extra={providerEditor.editing === null ? '保存后不再回显' : '留空表示不修改'}
            rules={
              providerEditor.editing === null ? [{ required: true, message: '请填写 API Key' }] : []
            }
          >
            <Input.Password maxLength={200} autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={routeEditor.open}
        title={
          routeEditor.editing === null
            ? '新增场景路由'
            : `编辑 ${sceneLabel(routeEditor.editing.scene)} 路由`
        }
        okText="保存"
        cancelText="取消"
        confirmLoading={busy}
        destroyOnHidden
        width={520}
        onOk={() => void submitRoute()}
        onCancel={() => setRouteEditor(closedRoute)}
      >
        <Form form={routeForm} layout="vertical">
          <Form.Item
            name="scene"
            label="场景"
            rules={[
              { required: true, message: '请填写场景' },
              { pattern: /^[a-z][a-z0-9_-]*$/, message: '小写字母开头，可含数字、_ 和 -' },
            ]}
          >
            <Input
              maxLength={40}
              disabled={routeEditor.editing !== null}
              placeholder="minutes"
              addonAfter="会议纪要"
            />
          </Form.Item>
          <Form.Item name="providerId" label="服务商">
            <Select
              allowClear
              placeholder="不指定则用默认服务商"
              options={providers.map((provider) => ({ value: provider.id, label: provider.name }))}
            />
          </Form.Item>
          <Form.Item name="modelOverride" label="模型覆盖">
            <Input maxLength={80} placeholder="留空则用服务商默认模型" />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}
