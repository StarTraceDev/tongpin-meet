import {
  App,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'

import type { Permission, RoleCreateInput, RoleItem } from '@tongpin/shared'

import { createRole, deleteRole, fetchRoles, updateRole } from '@/features/roles/api'
import { PERMISSION_GROUPS, permissionLabel } from '@/features/roles/labels'

interface EditorValues {
  name: string
  code: string
}

interface EditorState {
  open: boolean
  editing: RoleItem | null
}

const closedEditor: EditorState = { open: false, editing: null }

function permissionsOf(role: RoleItem | null): Permission[] {
  return role?.permissions ?? []
}

export function RolesPage(): React.JSX.Element {
  const { message } = App.useApp()
  const [items, setItems] = useState<RoleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [editor, setEditor] = useState<EditorState>(closedEditor)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [form] = Form.useForm<EditorValues>()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const lockPermissions = editor.editing?.code === 'SUPER_ADMIN'

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchRoles()
      .then((data) => {
        if (!active) return
        setItems(data.items)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof Error ? cause.message : '加载角色失败')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return (): void => {
      active = false
    }
  }, [reloadKey])

  function openCreate(): void {
    setEditor({ open: true, editing: null })
    setPermissions([])
    form.setFieldsValue({ name: '', code: '' })
  }

  function openEdit(role: RoleItem): void {
    setEditor({ open: true, editing: role })
    setPermissions(permissionsOf(role))
    form.setFieldsValue({ name: role.name, code: role.code })
  }

  async function submit(): Promise<void> {
    let values: EditorValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setSaving(true)
    try {
      if (editor.editing === null) {
        const input: RoleCreateInput = {
          name: values.name,
          code: values.code,
          permissions,
        }
        await createRole(input)
        message.success('已创建角色')
      } else {
        await updateRole(editor.editing.id, {
          name: values.name,
          ...(lockPermissions ? {} : { permissions }),
        })
        message.success(`已更新 ${values.name}`)
      }
      setEditor(closedEditor)
      setReloadKey((key) => key + 1)
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function remove(role: RoleItem): Promise<void> {
    setRemovingId(role.id)
    try {
      await deleteRole(role.id)
      message.success(`已删除 ${role.name}`)
      setReloadKey((key) => key + 1)
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '删除失败')
    } finally {
      setRemovingId(null)
    }
  }

  const columns: ColumnsType<RoleItem> = [
    {
      title: '角色',
      key: 'name',
      width: 200,
      render: (_value, role) => (
        <Space size="small">
          <Typography.Text strong>{role.name}</Typography.Text>
          {role.builtin ? <Tag>内置</Tag> : null}
        </Space>
      ),
    },
    { title: '编码', dataIndex: 'code', key: 'code', width: 160 },
    {
      title: '权限',
      key: 'permissions',
      width: 380,
      render: (_value, role): React.JSX.Element => {
        if (role.permissions.length === 0) {
          return <Typography.Text type="secondary">未分配</Typography.Text>
        }
        const labels = role.permissions.map(permissionLabel)
        const preview = labels.slice(0, 3).join('、')
        return (
          <Tooltip title={labels.join('、')}>
            <Typography.Text>
              {labels.length <= 3 ? preview : `${preview} 等 ${labels.length} 项`}
            </Typography.Text>
          </Tooltip>
        )
      },
    },
    { title: '用户数', dataIndex: 'userCount', key: 'userCount', width: 100 },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_value, role) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEdit(role)}>
            编辑
          </Button>
          <Popconfirm
            title={`删除 ${role.name}？`}
            description="内置角色或仍有用户的角色不能删除。"
            okText="删除"
            cancelText="取消"
            disabled={role.builtin}
            onConfirm={() => remove(role)}
          >
            <Button
              type="link"
              size="small"
              danger
              disabled={role.builtin}
              loading={removingId === role.id}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <section className="roles">
      <header className="roles-head">
        <div>
          <Typography.Title level={3} className="roles-title">
            角色权限
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="roles-desc">
            角色决定后台能做什么；权限点与 03 §5.6 一一对应，内置角色不可删除。
          </Typography.Paragraph>
        </div>
        <Button type="primary" onClick={openCreate}>
          新增角色
        </Button>
      </header>

      {error !== null && (
        <Typography.Paragraph type="danger">
          {error}{' '}
          <Button size="small" onClick={() => setReloadKey((key) => key + 1)}>
            重试
          </Button>
        </Typography.Paragraph>
      )}

      <Table<RoleItem>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={false}
        scroll={{ x: 1000 }}
        locale={{ emptyText: '还没有角色' }}
      />

      <Modal
        open={editor.open}
        title={editor.editing === null ? '新增角色' : `编辑 ${editor.editing.name}`}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        destroyOnHidden
        width={640}
        onOk={() => void submit()}
        onCancel={() => setEditor(closedEditor)}
      >
        <Form form={form} layout="vertical" initialValues={{ name: '', code: '' }}>
          <Form.Item
            name="name"
            label="角色名称"
            rules={[
              { required: true, message: '请填写角色名称' },
              { max: 20, message: '最多 20 字' },
            ]}
          >
            <Input placeholder="例如：运营" maxLength={20} />
          </Form.Item>
          <Form.Item
            name="code"
            label="角色编码"
            extra={
              editor.editing === null
                ? '大写字母开头，可含数字与下划线；创建后不可修改'
                : '编码创建后不可修改'
            }
            rules={[
              { required: true, message: '请填写角色编码' },
              {
                pattern: /^[A-Z][A-Z0-9_]{1,31}$/,
                message: '大写字母开头，只能含大写字母、数字和下划线',
              },
            ]}
          >
            <Input
              placeholder="OPS"
              maxLength={32}
              disabled={editor.editing !== null}
              onChange={(event) => {
                form.setFieldValue('code', event.target.value.toUpperCase())
              }}
            />
          </Form.Item>
          <Form.Item label="权限">
            {lockPermissions ? (
              <Typography.Paragraph type="secondary">
                超级管理员固定拥有全部权限，不可修改。
              </Typography.Paragraph>
            ) : null}
            <div className="role-permissions">
              {PERMISSION_GROUPS.map((group) => (
                <div className="role-permission-group" key={group.title}>
                  <Typography.Text strong>{group.title}</Typography.Text>
                  <Checkbox.Group
                    disabled={lockPermissions}
                    value={permissions}
                    options={group.options.map((option) => ({
                      label: option.label,
                      value: option.code,
                    }))}
                    onChange={(next) => {
                      const groupCodes = group.options.map((option) => option.code)
                      const others = permissions.filter((code) => !groupCodes.includes(code))
                      setPermissions([...others, ...(next as Permission[])])
                    }}
                  />
                </div>
              ))}
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}
