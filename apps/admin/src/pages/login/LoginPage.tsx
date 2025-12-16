import { Alert, Button, Card, Form, Input } from 'antd'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { useAuth } from '../../app/AuthProvider'

interface LoginValues {
  phone: string
  password: string
}

interface LoginLocationState {
  from?: string
}

export function LoginPage(): ReactElement {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user !== null) {
    return <Navigate to="/" replace />
  }

  const handleFinish = async (values: LoginValues): Promise<void> => {
    setSubmitting(true)
    setError(null)

    try {
      await signIn({ phone: values.phone.trim(), password: values.password })
      const state = location.state as LoginLocationState | null
      navigate(state?.from ?? '/', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '登录失败，请稍后再试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="admin-login">
      <Card className="admin-login-card">
        <h1 className="admin-login-title">同频会议 · 管理后台</h1>
        <p className="admin-login-hint">请使用管理员账号登录，账号由运营在后台分配。</p>
        {error === null ? null : (
          <Alert className="admin-login-error" type="error" showIcon message={error} />
        )}
        <Form<LoginValues> layout="vertical" requiredMark={false} onFinish={handleFinish}>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
            ]}
          >
            <Input inputMode="numeric" autoComplete="username" placeholder="11 位手机号" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password autoComplete="current-password" placeholder="登录密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            登录
          </Button>
        </Form>
      </Card>
    </main>
  )
}
