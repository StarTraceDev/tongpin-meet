<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { confirmQrSession } from '../apis/auth'
import { ApiError } from '../apis/http'

const route = useRoute()
const router = useRouter()

const sessionId = ref(typeof route.query.id === 'string' ? route.query.id : '')
const code = ref('')
const submitting = ref(false)
const message = ref('')

async function confirm(): Promise<void> {
  submitting.value = true
  message.value = ''
  try {
    await confirmQrSession(sessionId.value, code.value)
    message.value = '已确认，回到被登录的设备即可继续'
  } catch (err) {
    message.value = err instanceof ApiError ? err.message : '确认失败'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="device-page">
    <el-card class="card">
      <h2>确认设备登录</h2>
      <p class="hint">在另一台设备的登录页复制会话 ID 和 6 位设备码，在这里确认。</p>
      <el-form label-position="top" @submit.prevent="confirm">
        <el-form-item label="会话 ID">
          <el-input v-model="sessionId" placeholder="qrSession id" />
        </el-form-item>
        <el-form-item label="设备码">
          <el-input v-model="code" maxlength="6" placeholder="6 位数字" />
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="submitting">确认登录</el-button>
      </el-form>
      <el-alert
        v-if="message !== ''"
        class="message"
        :title="message"
        type="success"
        :closable="false"
        show-icon
      />
      <el-button class="back" text @click="router.replace('/')">回首页</el-button>
    </el-card>
  </div>
</template>

<style scoped>
.device-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.card {
  width: 400px;
}

.hint {
  color: #8a919f;
  font-size: 13px;
  margin: 0 0 16px;
}

.message {
  margin-top: 12px;
}

.back {
  margin-top: 8px;
}
</style>
