<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, ref } from 'vue'

import AppIcon from '../components/AppIcon.vue'
import { initialOf, listContacts, type Contact } from '../apis/contact'

const contacts = ref<Contact[]>([])
const selectedId = ref<string | null>(null)
const keyword = ref('')
const loading = ref(false)
const error = ref('')
const remarks = ref<Record<string, string>>({})

const LETTERS = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const filtered = computed<Contact[]>(() => {
  const q = keyword.value.trim().toLowerCase()
  if (q === '') return contacts.value
  return contacts.value.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.phone.includes(q) ||
      item.dept.toLowerCase().includes(q),
  )
})

const groups = computed<{ letter: string; items: Contact[] }[]>(() => {
  const buckets = new Map<string, Contact[]>()
  for (const item of filtered.value) {
    const letter = initialOf(item.name)
    const list = buckets.get(letter)
    if (list === undefined) buckets.set(letter, [item])
    else list.push(item)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a === '#' ? -1 : b === '#' ? 1 : a.localeCompare(b)))
    .map(([letter, items]) => ({
      letter,
      items: items.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
    }))
})

const availableLetters = computed(() => new Set(groups.value.map((group) => group.letter)))
const selected = computed<Contact | null>(
  () => contacts.value.find((item) => item.id === selectedId.value) ?? null,
)

const selectedDate = computed<string>(() => {
  if (selected.value === null) return ''
  const date = new Date(selected.value.createdAt)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
})

const remark = computed<string>(() => {
  if (selected.value === null) return ''
  return remarks.value[selected.value.id] ?? ''
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    contacts.value = await listContacts()
  } catch {
    error.value = '读取通讯录失败（后端没起或没有用户管理权限）'
  } finally {
    loading.value = false
  }
}

function scrollToLetter(letter: string): void {
  if (!availableLetters.value.has(letter)) return
  document.getElementById(`contact-group-${letter}`)?.scrollIntoView({ block: 'start' })
}

async function editRemark(): Promise<void> {
  if (selected.value === null) return
  try {
    const result = await ElMessageBox.prompt('给这个联系人加个备注', '设置备注', {
      inputValue: remark.value,
      confirmButtonText: '保存',
      cancelButtonText: '取消',
    })
    remarks.value = { ...remarks.value, [selected.value.id]: result.value.trim() }
  } catch {
    // 取消
  }
}

function removeSelected(): void {
  if (selected.value === null) return
  const id = selected.value.id
  contacts.value = contacts.value.filter((item) => item.id !== id)
  selectedId.value = null
  ElMessage.success('已从通讯录移除（本地生效，服务端暂无好友接口）')
}

function openNewFriends(): void {
  ElMessage.info('新朋友需要好友关系接口，服务端暂未提供')
}

onMounted(load)
</script>

<template>
  <div class="contacts-page">
    <section class="pane-left contacts-left">
      <header class="contacts-head">
        <h1>通讯录</h1>
        <button class="icon-btn" type="button" title="添加联系人" @click="openNewFriends">
          <AppIcon name="user-plus" :size="20" />
        </button>
      </header>

      <div class="search-box contacts-search">
        <AppIcon name="search" :size="16" />
        <input v-model="keyword" type="text" placeholder="搜索" />
      </div>

      <button class="new-friend" type="button" @click="openNewFriends">
        <span class="new-friend-icon"><AppIcon name="user-plus" :size="20" /></span>
        <span class="new-friend-text">新朋友</span>
        <AppIcon name="right" :size="16" />
      </button>

      <div class="contacts-scroll">
        <p v-if="loading" class="contacts-tip">加载中…</p>
        <p v-else-if="error !== ''" class="contacts-tip">{{ error }}</p>
        <p v-else-if="groups.length === 0" class="contacts-tip">暂无联系人</p>

        <div v-for="group in groups" :id="`contact-group-${group.letter}`" :key="group.letter">
          <p class="group-label">{{ group.letter }}</p>
          <button
            v-for="item in group.items"
            :key="item.id"
            class="contact-row"
            :class="{ active: item.id === selectedId }"
            type="button"
            @click="selectedId = item.id"
          >
            <span class="contact-avatar"><AppIcon name="user" :size="20" /></span>
            <span class="contact-name">{{ item.name }}</span>
          </button>
        </div>
      </div>

      <div class="alphabet">
        <button
          v-for="letter in LETTERS"
          :key="letter"
          type="button"
          :class="{ on: availableLetters.has(letter) }"
          @click="scrollToLetter(letter)"
        >
          {{ letter }}
        </button>
      </div>
    </section>

    <section class="pane-right contacts-right">
      <header class="contacts-right-head">联系人详情</header>

      <div v-if="selected !== null" class="contact-detail">
        <div class="contact-card">
          <div class="contact-card-top">
            <span class="contact-big-avatar"><AppIcon name="user" :size="34" /></span>
            <div>
              <p class="contact-title">{{ selected.name }}</p>
              <p class="contact-account">账号：{{ selected.phone }}</p>
            </div>
          </div>
          <button class="contact-remark" type="button" @click="editRemark">
            <span>{{ remark === '' ? '设置备注' : remark }}</span>
            <AppIcon name="right" :size="16" />
          </button>
        </div>

        <div class="contact-facts">
          <div class="fact-row">
            <span>昵称</span>
            <span>{{ selected.name }}</span>
          </div>
          <div class="fact-row">
            <span>联系方式</span>
            <span class="fact-link">{{ selected.phone }}</span>
          </div>
          <div class="fact-row">
            <span>所属部门</span>
            <span>{{ selected.dept }}</span>
          </div>
          <div class="fact-row">
            <span>申请日期</span>
            <span>{{ selectedDate }}</span>
          </div>
        </div>

        <button class="contact-delete" type="button" @click="removeSelected">删除</button>
      </div>

      <div v-else class="contacts-empty">
        <div class="empty-art"><AppIcon name="inbox" :size="76" :stroke-width="1.1" /></div>
        <p>暂无相关内容</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.contacts-page {
  display: flex;
  height: 100%;
  min-height: 0;
  background: var(--tp-canvas);
}

/* 左栏 340 + 字母索引（索引贴在右边缘，不占内容宽度） */
.contacts-left {
  position: relative;
  display: flex;
  flex: none;
  flex-direction: column;
  width: 340px;
  padding: 38px 0 0;
  border-right: 1px solid var(--tp-border);
}

.contacts-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.contacts-head h1 {
  margin: 0;
  color: var(--tp-text-title);
  font-size: 20px;
  font-weight: 600;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--tp-radius-s);
  background: transparent;
  color: var(--tp-text-secondary);
  cursor: pointer;
}

.icon-btn:hover {
  background: var(--tp-fill);
}

.contacts-search {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  margin: 14px 16px 10px;
  padding: 0 10px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-s);
  color: var(--tp-text-placeholder);
}

.contacts-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--tp-text-primary);
  font-family: inherit;
  font-size: 13px;
}

.new-friend {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 8px;
  padding: 8px;
  border: 0;
  border-radius: var(--tp-radius-m);
  background: transparent;
  color: var(--tp-text-primary);
  font-family: inherit;
  font-size: 15px;
  cursor: pointer;
}

.new-friend:hover {
  background: var(--tp-fill);
}

.new-friend-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--tp-radius-m);
  background: linear-gradient(160deg, #ffc46b, #ff9f0a);
  color: #fff;
}

.new-friend-text {
  flex: 1;
  text-align: left;
}

.contacts-scroll {
  flex: 1;
  min-height: 0;
  padding: 4px 8px 0;
  overflow-y: auto;
}

.contacts-tip {
  margin: 24px 12px;
  color: var(--tp-text-tertiary);
  font-size: 13px;
}

.group-label {
  margin: 10px 8px 2px;
  color: var(--tp-text-tertiary);
  font-size: 12px;
}

.contact-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: var(--tp-radius-m);
  background: transparent;
  color: var(--tp-text-primary);
  font-family: inherit;
  font-size: 15px;
  text-align: left;
  cursor: pointer;
}

.contact-row:hover {
  background: var(--tp-fill);
}

.contact-row.active {
  background: var(--tp-fill);
}

.contact-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--tp-radius-m);
  background: #e8ecf6;
  color: #9aa9c6;
}

.contact-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alphabet {
  position: absolute;
  top: 132px;
  right: 2px;
  bottom: 12px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0;
}

.alphabet button {
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--tp-text-placeholder);
  font-family: inherit;
  font-size: 10px;
  line-height: 17px;
  cursor: default;
}

.alphabet button.on {
  color: var(--tp-text-secondary);
  cursor: pointer;
}

.contacts-right {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
}

.contacts-right-head {
  flex: none;
  height: 40px;
  padding: 0 16px;
  border-bottom: 1px solid var(--tp-border-light);
  color: var(--tp-text-title);
  font-size: 15px;
  font-weight: 600;
  line-height: 40px;
}

.contact-detail {
  width: 380px;
  margin: 32px auto 0;
}

.contact-card {
  padding: 16px;
  border-radius: var(--tp-radius-m);
  background: var(--tp-fill);
}

.contact-card-top {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--tp-border);
}

.contact-big-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: var(--tp-radius-m);
  background: #e2e7f2;
  color: #9aa9c6;
}

.contact-title {
  margin: 0;
  color: var(--tp-text-title);
  font-size: 20px;
  font-weight: 600;
}

.contact-account {
  margin: 6px 0 0;
  color: var(--tp-text-secondary);
  font-size: 13px;
}

.contact-remark {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px 0 0;
  border: 0;
  background: transparent;
  color: var(--tp-text-primary);
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
}

.contact-facts {
  margin-top: 20px;
  padding: 4px 16px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-m);
}

.fact-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  border-bottom: 1px solid var(--tp-border-light);
  color: var(--tp-text-primary);
  font-size: 14px;
}

.fact-row:last-child {
  border-bottom: 0;
}

.fact-link {
  color: var(--tp-brand);
}

.contact-delete {
  width: 100%;
  height: 44px;
  margin-top: 20px;
  border: 0;
  border-radius: var(--tp-radius-s);
  background: #f56c6c;
  color: #fff;
  font-family: inherit;
  font-size: 15px;
  cursor: pointer;
}

.contacts-empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--tp-text-tertiary);
  font-size: 13px;
}

.contacts-empty .empty-art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 232px;
  height: 232px;
  border-radius: 50%;
  background: var(--tp-fill);
  color: #dcdfe6;
}
</style>
