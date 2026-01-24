<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppIcon from '../components/AppIcon.vue'
import { ROUTE_NAMES } from '../router/names'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const menuOpen = ref(false)

const initials = computed(() => auth.user?.name?.slice(0, 1) ?? '')
const onHome = computed(() => route.name === ROUTE_NAMES.home)
const onRecordings = computed(() => route.name === ROUTE_NAMES.recordings)
const onSettings = computed(() => route.name === ROUTE_NAMES.settings)
const onContacts = computed(() => route.name === ROUTE_NAMES.contacts)

function onLogout(): void {
  menuOpen.value = false
  auth.logout()
  void router.replace({ name: ROUTE_NAMES.login })
}
</script>

<template>
  <div class="app-shell">
    <div class="shell-drag" aria-hidden="true" />

    <aside class="shell-sidebar">
      <button
        class="shell-avatar"
        type="button"
        :title="auth.user?.name ?? '账号'"
        @click="menuOpen = !menuOpen"
      >
        <span v-if="initials !== ''">{{ initials }}</span>
      </button>

      <nav class="shell-nav" aria-label="主导航">
        <button
          class="nav-item"
          :class="{ active: onHome }"
          type="button"
          @click="router.push({ name: ROUTE_NAMES.home })"
        >
          <AppIcon name="video" :size="22" />
          <span>会议</span>
        </button>
        <button
          class="nav-item"
          :class="{ active: onContacts }"
          type="button"
          @click="router.push({ name: ROUTE_NAMES.contacts })"
        >
          <AppIcon name="users" :size="22" />
          <span>通讯录</span>
        </button>
        <button
          class="nav-item"
          :class="{ active: onRecordings }"
          type="button"
          @click="router.push({ name: ROUTE_NAMES.recordings })"
        >
          <AppIcon name="record" :size="22" />
          <span>录制</span>
        </button>
      </nav>

      <div class="shell-bottom">
        <button
          class="nav-item"
          :class="{ active: onSettings }"
          type="button"
          @click="router.push({ name: ROUTE_NAMES.settings })"
        >
          <AppIcon name="settings" :size="22" />
        </button>
      </div>

      <div v-if="menuOpen" class="account-menu">
        <p class="account-name">{{ auth.user?.name ?? '未登录' }}</p>
        <p class="account-phone">{{ auth.user?.phone ?? '' }}</p>
        <button class="account-item" type="button" @click="onLogout">退出登录</button>
      </div>
    </aside>

    <main class="shell-body">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  display: flex;
  height: 100%;
  overflow: hidden;
  background: var(--tp-canvas);
}

/* macOS hiddenInset：顶部留给红绿灯，同时作为可拖拽区 */
.shell-drag {
  position: absolute;
  inset: 0 0 auto 0;
  height: 36px;
  -webkit-app-region: drag;
  z-index: 3;
}

.shell-sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: none;
  width: 92px;
  padding-top: 38px;
  background: var(--tp-shell-bg);
  -webkit-app-region: drag;
}

.shell-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  margin-bottom: 16px;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(160deg, #ffd6a5, #ff9a76);
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.shell-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  align-items: center;
  -webkit-app-region: no-drag;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 64px;
  padding: 8px 0 6px;
  border: 0;
  border-radius: var(--tp-radius-s);
  background: transparent;
  color: var(--tp-text-secondary);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}

.nav-item:hover {
  background: var(--tp-fill-hover);
}

.nav-item.active {
  color: var(--tp-brand);
}

.shell-bottom {
  margin-top: auto;
  padding-bottom: 18px;
  -webkit-app-region: no-drag;
}

.account-menu {
  position: absolute;
  top: 88px;
  left: 8px;
  z-index: 10;
  width: 180px;
  padding: 12px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-m);
  background: var(--tp-canvas);
  box-shadow: var(--tp-shadow-2);
  -webkit-app-region: no-drag;
}

.account-name {
  margin: 0;
  font-size: 13px;
  color: var(--tp-text-primary);
}

.account-phone {
  margin: 2px 0 10px;
  font-size: 12px;
  color: var(--tp-text-tertiary);
}

.account-item {
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: var(--tp-radius-s);
  background: transparent;
  color: var(--tp-text-secondary);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.account-item:hover {
  background: var(--tp-fill);
  color: var(--tp-text-primary);
}

.shell-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
</style>
