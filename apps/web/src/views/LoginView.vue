<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const phone = ref('13800000000')
const password = ref('admin123')
const loading = ref(false)
const error = ref('')

async function submit(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    await auth.login({ phone: phone.value, password: password.value })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect)
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <el-card class="login-card">
      <h1>同频会议</h1>
      <p class="hint">M5-2 会补齐短信 / 扫码入口，这里先打通密码登录</p>
      <el-form label-position="top" @submit.prevent="submit">
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
        <el-alert v-if="error !== ''" :title="error" type="error" :closable="false" show-icon />
        <el-button class="submit" type="primary" native-type="submit" :loading="loading"
          >登录</el-button
        >
      </el-form>
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
  width: 360px;
}

.hint {
  color: #8a919f;
  font-size: 13px;
  margin: 0 0 16px;
}

.submit {
  width: 100%;
  margin-top: 8px;
}
</style>
