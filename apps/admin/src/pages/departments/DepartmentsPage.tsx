import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  TreeSelect,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { Can } from '@/app/Can'

import type { DeptNode } from '@tongpin/shared'

import {
  createDepartment,
  deleteDepartment,
  fetchDepartments,
  updateDepartment,
} from '@/features/departments/api'
import { expandableIds, toDeptOptions } from '@/features/departments/tree'

interface EditorValues {
  name: string
  parentId?: string | null
  sort?: number
}

interface EditorState {
  open: boolean
  editing: DeptNode | null
  parentId: string | null
}

const closedEditor: EditorState = { open: false, editing: null, parentId: null }

export function DepartmentsPage(): React.JSX.Element {
  const { message } = App.useApp()
  const [items, setItems] = useState<DeptNode[]>([])
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [editor, setEditor] = useState<EditorState>(closedEditor)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [form] = Form.useForm<EditorValues>()

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchDepartments()
      .then((data) => {
        if (!active) return
        setItems(data)
        setExpandedKeys(expandableIds(data))
        setError(null)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : '加载部门失败')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return (): void => {
      active = false
    }
  }, [reloadKey])

  const reload = (): void => setReloadKey((key) => key + 1)

  const openCreate = (parentId: string | null): void => {
    setEditor({ open: true, editing: null, parentId })
    form.resetFields()
    form.setFieldsValue({ parentId, sort: 0 })
  }

  const openEdit = (node: DeptNode): void => {
    setEditor({ open: true, editing: node, parentId: node.parentId })
    form.resetFields()
    form.setFieldsValue({ name: node.name, parentId: node.parentId, sort: node.sort })
  }

  const submit = async (): Promise<void> => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      if (editor.editing === null) {
        await createDepartment({
          name: values.name,
          parentId: values.parentId ?? null,
          sort: values.sort ?? 0,
        })
        message.success('已新增部门')
      } else {
        await updateDepartment(editor.editing.id, {
          name: values.name,
          parentId: values.parentId ?? null,
          sort: values.sort ?? 0,
        })
        message.success('已保存部门')
      }
      setEditor(closedEditor)
      reload()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (node: DeptNode): Promise<void> => {
    setRemovingId(node.id)
    try {
      await deleteDepartment(node.id)
      message.success(`已删除 ${node.name}`)
      reload()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '删除失败')
    } finally {
      setRemovingId(null)
    }
  }

  const columns: ColumnsType<DeptNode> = [
    {
      title: '部门',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (_value, node) => <Typography.Text strong>{node.name}</Typography.Text>,
    },
    { title: '排序', dataIndex: 'sort', key: 'sort', width: 100 },
    {
      title: '子部门',
      key: 'children',
      width: 100,
      render: (_value, node) => node.children.length,
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      render: (_value, node) => (
        <Can perm="dept:write">
          <Space size="small" wrap>
            <Button type="link" size="small" onClick={() => openCreate(node.id)}>
              新增子部门
            </Button>
            <Button type="link" size="small" onClick={() => openEdit(node)}>
              编辑
            </Button>
            <Popconfirm
              title={`删除 ${node.name}？`}
              description="部门下还有子部门或成员时不能删除。"
              okText="确认"
              cancelText="取消"
              onConfirm={() => {
                void remove(node)
              }}
            >
              <Button type="link" size="small" danger loading={removingId === node.id}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        </Can>
      ),
    },
  ]

  const treeOptions = toDeptOptions(items)

  return (
    <section className="departments">
      <header className="departments-head">
        <div>
          <Typography.Title level={2} className="dashboard-title">
            部门管理
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            部门树支持多级；有子部门或成员的部门不能删除。
          </Typography.Paragraph>
        </div>
        <Can perm="dept:write">
          <Button type="primary" onClick={() => openCreate(null)}>
            新增根部门
          </Button>
        </Can>
      </header>

      {error !== null && (
        <Typography.Paragraph type="danger">
          {error}{' '}
          <Button size="small" onClick={reload}>
            重试
          </Button>
        </Typography.Paragraph>
      )}

      <Table<DeptNode>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={false}
        scroll={{ x: 720 }}
        expandable={{
          expandedRowKeys: expandedKeys,
          onExpandedRowsChange: (keys: readonly React.Key[]): void => {
            setExpandedKeys(keys.map((key) => String(key)))
          },
        }}
        locale={{ emptyText: '还没有部门' }}
      />

      <Modal
        open={editor.open}
        title={
          editor.editing === null
            ? editor.parentId === null
              ? '新增根部门'
              : '新增子部门'
            : `编辑 ${editor.editing.name}`
        }
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        destroyOnHidden
        onOk={() => {
          void submit()
        }}
        onCancel={() => setEditor(closedEditor)}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="部门名称"
            rules={[{ required: true, message: '请填写部门名称' }]}
          >
            <Input maxLength={20} placeholder="如：产品部" />
          </Form.Item>
          <Form.Item name="parentId" label="上级部门">
            <TreeSelect
              allowClear
              treeDefaultExpandAll
              placeholder="不选表示根部门"
              treeData={treeOptions}
            />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber min={0} max={9999} className="departments-sort" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}
