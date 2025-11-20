<script setup lang="ts">
import type { Meeting, Paginated } from '@tongpin/shared/types'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { request } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const meetings = ref<Meeting[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const result = await request<Paginated<Meeting>>('/meetings?page=1&pageSize=5&scope=hosting')
    meetings.value = result.items
  } catch {
    error.value = '加载会议列表失败（后端没起或 token 失效）'
  } finally {
    loading.value = false
  }
})

async function logout(): Promise<void> {
  auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <el-container class="page">
    <el-header class="header">
      <strong>同频会议</strong>
      <span class="spacer" />
      <span v-if="auth.user !== null">{{ auth.user.name }}（{{ auth.user.phone }}）</span>
      <el-button text @click="logout">退出登录</el-button>
    </el-header>
    <el-main>
      <h2>我主持的会议</h2>
      <el-alert v-if="error !== ''" :title="error" type="warning" :closable="false" show-icon />
      <el-skeleton v-if="loading" :rows="3" animated />
      <el-empty v-else-if="meetings.length === 0" description="还没有会议" />
      <el-table v-else :data="meetings">
        <el-table-column prop="meetingNo" label="会议号" width="140" />
        <el-table-column prop="title" label="主题" />
        <el-table-column prop="status" label="状态" width="120" />
        <el-table-column prop="startAt" label="开始时间" width="220" />
      </el-table>
    </el-main>
  </el-container>
</template>

<style scoped>
.page {
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.spacer {
  flex: 1;
}
</style>
