<script setup lang="ts">
import type { QrSession } from '@tongpin/shared/types'
import { onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { createQrSession, pollQrSession, sendSmsCode } from '@/api/auth'
import { ApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const tab = ref<'password' | 'sms' | 'device'>('password')
const error = ref('')
const loading = ref(false)

const phone = ref('13800000000')
const password = ref('admin123')
const smsPhone = ref('13800000001')
const smsCode = ref('')
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const qr = ref<QrSession | null>(null)
const qrState = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null

function stopTimers(): void {
  if (countdownTimer !== null) clearInterval(countdownTimer)
  if (pollTimer !== null) clearInterval(pollTimer)
  countdownTimer = null
  pollTimer = null
}

onUnmounted(stopTimers)

function destination(): string {
  return typeof route.query.redirect === 'string' ? route.query.redirect : '/'
}

function fail(err: unknown): void {
  error.value = err instanceof ApiError ? err.message : '操作失败，请稍后重试'
}

async function submitPassword(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    await auth.login({ phone: phone.value, password: password.value })
    await router.replace(destination())
  } catch (err) {
    fail(err)
  } finally {
    loading.value = false
  }
}

async function requestCode(): Promise<void> {
  error.value = ''
  try {
    await sendSmsCode(smsPhone.value)
    countdown.value = 60
    countdownTimer = setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) stopTimers()
    }, 1000)
  } catch (err) {
    fail(err)
  }
}

async function submitSms(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    await auth.loginSms({ phone: smsPhone.value, code: smsCode.value })
    await router.replace(destination())
  } catch (err) {
    fail(err)
  } finally {
    loading.value = false
  }
}

async function startDeviceLogin(): Promise<void> {
  error.value = ''
  qrState.value = ''
  try {
    qr.value = await createQrSession()
    qrState.value = '等待另一台已登录设备确认…'
    pollTimer = setInterval(async () => {
      if (qr.value === null) return
      try {
        const poll = await pollQrSession(qr.value.id)
        if (poll.status === 'CONFIRMED' && poll.session !== undefined) {
          stopTimers()
          auth.adoptSession(poll.session)
          await router.replace(destination())
          return
        }
        if (poll.status === 'REJECTED' || poll.status === 'EXPIRED') {
          stopTimers()
          qrState.value = poll.status === 'REJECTED' ? '已被拒绝' : '设备码已过期，请重新生成'
        }
      } catch {
        stopTimers()
        qrState.value = '轮询中断，请刷新重试'
      }
    }, 2000)
  } catch (err) {
    fail(err)
  }
}
</script>

<template>
  <div class="login-page">
    <el-card class="login-card">
      <h1>同频会议</h1>
      <el-tabs v-model="tab">
        <el-tab-pane label="密码登录" name="password">
          <el-form label-position="top" @submit.prevent="submitPassword">
            <el-form-item label="手机号">
              <el-input v-model="phone" autocomplete="username" placeholder="11 位手机号" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input
                v-model="password"
                type="password"
                autocomplete="current-password"
                show-password
              />
            </el-form-item>
            <el-button class="submit" type="primary" native-type="submit" :loading="loading"
              >登录</el-button
            >
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="短信登录" name="sms">
          <el-form label-position="top" @submit.prevent="submitSms">
            <el-form-item label="手机号">
              <el-input v-model="smsPhone" placeholder="11 位手机号">
                <template #append>
                  <el-button :disabled="countdown > 0" @click="requestCode">
                    {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="验证码">
              <el-input
                v-model="smsCode"
                maxlength="6"
                placeholder="6 位数字（开发环境看服务端日志）"
              />
            </el-form-item>
            <el-button class="submit" type="primary" native-type="submit" :loading="loading"
              >登录 / 注册</el-button
            >
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="设备码" name="device">
          <p class="hint">
            扫码需移动端，本期用设备码：生成后到任一已登录浏览器打开 /device 确认。
          </p>
          <el-button v-if="qr === null" type="primary" @click="startDeviceLogin"
            >生成设备码</el-button
          >
          <div v-else class="device">
            <div class="code">{{ qr.code }}</div>
            <p class="hint">会话 ID：{{ qr.id }}</p>
            <router-link :to="{ name: 'device', query: { id: qr.id } }"
              >在新标签打开确认页</router-link
            >
            <p v-if="qrState !== ''" class="hint">{{ qrState }}</p>
          </div>
        </el-tab-pane>
      </el-tabs>

      <el-alert v-if="error !== ''" :title="error" type="error" :closable="false" show-icon />
    </el-card>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.login-card {
  width: 380px;
}

.hint {
  color: #8a919f;
  font-size: 13px;
  margin: 0 0 12px;
}

.submit {
  width: 100%;
  margin-top: 8px;
}

.device {
  text-align: center;
}

.code {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 8px;
  margin: 12px 0;
}
</style>
