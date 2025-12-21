import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'

import type { AdminRoleOption, AdminUserItem, AdminUsersQuery } from '@tongpin/shared'

import {
  createUser,
  fetchRoleOptions,
  fetchUsers,
  resetUserPassword,
  setUserDisabled,
  setUserRoles,
  updateUser,
} from '@/features/users/api'
import { formatLastLogin, userStatusMeta } from '@/features/users/labels'

const PAGE_SIZES = ['10', '20', '50']

interface EditorValues {
  phone?: string
  name: string
  email?: string
  password?: string
  roleIds?: string[]
}

interface PasswordValues {
  password: string
}

const initialQuery: AdminUsersQuery = { page: 1, pageSize: 20 }

export function UsersPage(): React.JSX.Element {
  const { message } = App.useApp()
  const [query, setQuery] = useState<AdminUsersQuery>(initialQuery)
  const [keyword, setKeyword] = useState('')
  const [data, setData] = useState<AdminUserItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [roles, setRoles] = useState<AdminRoleOption[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUserItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [passwordUser, setPasswordUser] = useState<AdminUserItem | null>(null)
  const [rolesUser, setRolesUser] = useState<AdminUserItem | null>(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [editorForm] = Form.useForm<EditorValues>()
  const [passwordForm] = Form.useForm<PasswordValues>()

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchUsers(query)
      .then((result) => {
        if (!active) return
        setData(result.items)
        setTotal(result.total)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : '加载用户失败')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return (): void => {
      active = false
    }
  }, [query, reloadKey])

  useEffect(() => {
    let active = true
    fetchRoleOptions()
      .then((items) => {
        if (active) setRoles(items)
      })
      .catch(() => {
        if (active) setRoles([])
      })
    return (): void => {
      active = false
    }
  }, [])

  const reload = (): void => setReloadKey((key) => key + 1)

  const openCreate = (): void => {
    setEditing(null)
    editorForm.resetFields()
    editorForm.setFieldsValue({ roleIds: [] })
    setEditorOpen(true)
  }

  const openEdit = (user: AdminUserItem): void => {
    setEditing(user)
    editorForm.resetFields()
    editorForm.setFieldsValue({ name: user.name, email: user.email ?? undefined })
    setEditorOpen(true)
  }

  const submitEditor = async (): Promise<void> => {
    const values = await editorForm.validateFields()
    setSaving(true)
    try {
      if (editing === null) {
        const input = {
          phone: values.phone ?? '',
          name: values.name,
          password: values.password ?? '',
          roleIds: values.roleIds ?? [],
          ...(values.email === undefined || values.email === '' ? {} : { email: values.email }),
        }
        await createUser(input)
        message.success('已新增用户')
      } else {
        await updateUser(editing.id, {
          name: values.name,
          email: values.email === undefined || values.email === '' ? null : values.email,
        })
        message.success('已保存修改')
      }
      setEditorOpen(false)
      reload()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const submitPassword = async (): Promise<void> => {
    if (passwordUser === null) return
    const values = await passwordForm.validateFields()
    setSaving(true)
    try {
      await resetUserPassword(passwordUser.id, values.password)
      message.success(`已重置 ${passwordUser.name} 的密码`)
      setPasswordUser(null)
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '重置失败')
    } finally {
      setSaving(false)
    }
  }

  const submitRoles = async (): Promise<void> => {
    if (rolesUser === null) return
    setSaving(true)
    try {
      await setUserRoles(rolesUser.id, selectedRoleIds)
      message.success(`已更新 ${rolesUser.name} 的角色`)
      setRolesUser(null)
      reload()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '更新角色失败')
    } finally {
      setSaving(false)
    }
  }

  const toggleDisabled = async (user: AdminUserItem): Promise<void> => {
    setPendingId(user.id)
    try {
      await setUserDisabled(user.id, user.status === 'ACTIVE')
      message.success(user.status === 'ACTIVE' ? `已禁用 ${user.name}` : `已启用 ${user.name}`)
      reload()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '操作失败')
    } finally {
      setPendingId(null)
    }
  }

  const columns: ColumnsType<AdminUserItem> = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (_value, user) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{user.name}</Typography.Text>
          <Typography.Text type="secondary" className="users-role-summary">
            {user.roles.map((role) => role.name).join('、') || '未分配角色'}
          </Typography.Text>
        </Space>
      ),
    },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 140 },
    {
      title: '部门',
      dataIndex: 'deptName',
      key: 'deptName',
      width: 120,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (_value, user): React.JSX.Element => {
        const meta = userStatusMeta(user.status)
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '最近登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 150,
      render: (value: string | null) => formatLastLogin(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      render: (_value, user) => (
        <Space size="small" wrap>
          <Button type="link" size="small" onClick={() => openEdit(user)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setRolesUser(user)
              setSelectedRoleIds(user.roles.map((role) => role.id))
            }}
          >
            分配角色
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setPasswordUser(user)
              passwordForm.resetFields()
            }}
          >
            重置密码
          </Button>
          <Popconfirm
            title={user.status === 'ACTIVE' ? `禁用 ${user.name}？` : `启用 ${user.name}？`}
            description={
              user.status === 'ACTIVE'
                ? '该用户会被立即踢下线，之后无法登录。'
                : '恢复后可以重新登录。'
            }
            okText="确认"
            cancelText="取消"
            onConfirm={() => {
              void toggleDisabled(user)
            }}
          >
            <Button
              type="link"
              size="small"
              danger={user.status === 'ACTIVE'}
              loading={pendingId === user.id}
            >
              {user.status === 'ACTIVE' ? '禁用' : '启用'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <section className="users">
      <header className="users-head">
        <div>
          <Typography.Title level={2} className="dashboard-title">
            用户管理
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            新增、编辑、禁用与分配角色；密码重置会立即踢掉该用户的登录会话。
          </Typography.Paragraph>
        </div>
        <Button type="primary" onClick={openCreate}>
          新增用户
        </Button>
      </header>

      <Space className="users-filters" wrap>
        <Input.Search
          key={keyword}
          allowClear
          placeholder="搜索手机号或姓名"
          className="users-keyword"
          defaultValue={keyword}
          onSearch={(value) => {
            const next = value.trim()
            setKeyword(next)
            setQuery((prev) => ({ ...prev, keyword: next === '' ? undefined : next, page: 1 }))
          }}
        />
        <Select
          allowClear
          placeholder="全部状态"
          className="users-status"
          value={query.status}
          options={[
            { value: 'ACTIVE', label: '正常' },
            { value: 'DISABLED', label: '已禁用' },
          ]}
          onChange={(value: AdminUsersQuery['status']) => {
            setQuery((prev) => ({ ...prev, status: value, page: 1 }))
          }}
        />
      </Space>

      {error !== null && (
        <Typography.Paragraph type="danger" className="users-error">
          {error}{' '}
          <Button size="small" onClick={reload}>
            重试
          </Button>
        </Typography.Paragraph>
      )}

      <Table<AdminUserItem>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={data}
        scroll={{ x: 1000 }}
        locale={{ emptyText: '没有符合条件的用户' }}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZES,
          showTotal: (count) => `共 ${count} 个用户`,
          onChange: (page, pageSize) => setQuery((prev) => ({ ...prev, page, pageSize })),
        }}
      />

      <Modal
        open={editorOpen}
        title={editing === null ? '新增用户' : `编辑 ${editing.name}`}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        onOk={() => {
          void submitEditor()
        }}
        onCancel={() => setEditorOpen(false)}
        destroyOnHidden
      >
        <Form form={editorForm} layout="vertical" preserve={false}>
          {editing === null && (
            <Form.Item
              name="phone"
              label="手机号"
              rules={[
                { required: true, message: '请填写手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
              ]}
            >
              <Input placeholder="11 位手机号" />
            </Form.Item>
          )}
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请填写姓名' }]}>
            <Input maxLength={30} placeholder="真实姓名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ type: 'email', message: '邮箱格式不正确' }]}
          >
            <Input placeholder="可选" />
          </Form.Item>
          {editing === null && (
            <>
              <Form.Item
                name="password"
                label="初始密码"
                rules={[
                  { required: true, message: '请填写初始密码' },
                  { min: 8, message: '密码至少 8 位' },
                ]}
              >
                <Input.Password placeholder="8–64 位，交给用户后请尽快修改" />
              </Form.Item>
              <Form.Item name="roleIds" label="角色">
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="可稍后分配"
                  options={roles.map((role) => ({ value: role.id, label: role.name }))}
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      <Modal
        open={passwordUser !== null}
        title={passwordUser === null ? '重置密码' : `重置 ${passwordUser.name} 的密码`}
        okText="重置"
        cancelText="取消"
        confirmLoading={saving}
        onOk={() => {
          void submitPassword()
        }}
        onCancel={() => setPasswordUser(null)}
        destroyOnHidden
      >
        <Form form={passwordForm} layout="vertical" preserve={false}>
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请填写新密码' },
              { min: 8, message: '密码至少 8 位' },
            ]}
          >
            <Input.Password placeholder="8–64 位" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={rolesUser !== null}
        title={rolesUser === null ? '分配角色' : `分配 ${rolesUser.name} 的角色`}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        onOk={() => {
          void submitRoles()
        }}
        onCancel={() => setRolesUser(null)}
        destroyOnHidden
      >
        <Select
          mode="multiple"
          className="users-role-select"
          placeholder="选择一个或多个角色"
          value={selectedRoleIds}
          options={roles.map((role) => ({ value: role.id, label: role.name }))}
          onChange={(value: string[]) => setSelectedRoleIds(value)}
        />
      </Modal>
    </section>
  )
}
