<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import AppIcon from '../components/AppIcon.vue'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{
  payload?: { meetingNo?: string; name?: string } | undefined
}>()

const auth = useAuthStore()

/** 会议号在输入里带分组空格，提交/校验一律用去掉空格的 9 位 digits */
const digits = ref((props.payload?.meetingNo ?? '').replace(/\D/g, '').slice(0, 9))
const name = ref(props.payload?.name ?? '')
const autoAudio = ref(true)
const autoVideo = ref(false)
const autoMic = ref(true)

const checks = [
  {
    label: '自动连接音频',
    value: autoAudio,
    toggle: (): void => {
      autoAudio.value = !autoAudio.value
    },
  },
  {
    label: '入会开启摄像头',
    value: autoVideo,
    toggle: (): void => {
      autoVideo.value = !autoVideo.value
    },
  },
  {
    label: '入会开启麦克风',
    value: autoMic,
    toggle: (): void => {
      autoMic.value = !autoMic.value
    },
  },
]

const canJoin = computed(() => digits.value.length === 9 && name.value.trim() !== '')

const displayNo = computed(() => digits.value.replace(/(\d{3})(?=\d)/g, '$1 '))

function onInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  digits.value = value.replace(/\D/g, '').slice(0, 9)
  ;(event.target as HTMLInputElement).value = displayNo.value
}

onMounted(async () => {
  if (auth.user === null) {
    try {
      await auth.loadMe()
    } catch {
      // 未登录时名称留空，用户自己填
    }
  }
  if (name.value === '' && auth.user !== null) name.value = auth.user.name
})
</script>

<template>
  <div class="sub-window">
    <header class="sub-title">加入会议</header>

    <div class="sub-body">
      <label class="field-label" for="join-no">会议号</label>
      <input
        id="join-no"
        class="fld"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        placeholder="请输入会议号"
        :value="displayNo"
        @input="onInput"
      />

      <label class="field-label" for="join-name">您的名称</label>
      <input id="join-name" v-model="name" class="fld" type="text" placeholder="请输入名称" />

      <p class="field-label">会议设置</p>
      <div
        v-for="item in checks"
        :key="item.label"
        class="check"
        role="checkbox"
        tabindex="0"
        :aria-checked="item.value.value"
        @click="item.toggle()"
        @keydown.space.prevent="item.toggle()"
        @keydown.enter.prevent="item.toggle()"
      >
        <span class="box" :class="{ on: item.value.value }">
          <AppIcon v-if="item.value.value" name="check" :size="10" :stroke-width="3" />
        </span>
        {{ item.label }}
      </div>
    </div>

    <footer class="sub-foot">
      <button class="btn-primary btn-lg btn-block" type="button" :disabled="!canJoin">
        加入会议
      </button>
    </footer>
  </div>
</template>

<style scoped>
.sub-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--tp-canvas);
}

.sub-title {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  height: 36px;
  font-size: 18px;
  font-weight: 500;
  color: var(--tp-text-title);
  -webkit-app-region: drag;
}

.sub-body {
  flex: 1;
  min-height: 0;
  padding: 0 24px;
  overflow: auto;
}

.field-label {
  display: block;
  margin: 18px 0 8px;
  font-size: 14px;
  color: var(--tp-text-primary);
}

.field-label:first-child {
  margin-top: 8px;
}

.fld {
  width: 100%;
  height: 32px;
  padding: 0 11px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-s);
  background: var(--tp-canvas);
  color: var(--tp-text-primary);
  font-family: inherit;
  font-size: 14px;
  outline: none;
}

.fld::placeholder {
  color: var(--tp-text-placeholder);
}

.fld:focus {
  border-color: var(--tp-brand);
}

.check {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 13px;
  color: var(--tp-text-primary);
  cursor: pointer;
}

.box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  padding: 0;
  border: 1px solid var(--tp-border);
  border-radius: 3px;
  background: var(--tp-canvas);
  color: #fff;
  cursor: pointer;
}

.box.on {
  border-color: var(--tp-brand);
  background: var(--tp-brand);
}

.sub-foot {
  flex: none;
  padding: 16px 24px 20px;
}

.btn-primary {
  height: 40px;
  border: 1px solid var(--tp-brand);
  border-radius: var(--tp-radius-s);
  background: var(--tp-brand);
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
}

.btn-block {
  width: 100%;
}

.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
