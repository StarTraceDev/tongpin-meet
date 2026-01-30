import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/** 会中可停靠的面板（10-M13 §二：面板是 inset 挤压，不改变窗口宽度） */
export type SidePanelKey =
  'members' | 'chat' | 'minutes' | 'intelligence' | 'break' | 'checkin' | 'vote' | 'files'

/**
 * 面板三态的唯一真相（10-M13 O14）：
 * - opened + active = 单面板 / 多面板的选中态
 * - detached = 已脱离成子窗口，主窗里不再占位
 * 组件不各自持有一份，脱离/合并都改这里。
 */
export const usePanelsStore = defineStore('panels', () => {
  const opened = ref<SidePanelKey[]>([])
  const active = ref<SidePanelKey | null>(null)
  const detached = ref<SidePanelKey[]>([])

  /** 主窗里实际占位的面板（脱离的让出空间给舞台） */
  const visible = computed<SidePanelKey[]>(() =>
    opened.value.filter((key) => !detached.value.includes(key)),
  )

  const hasPanels = computed<boolean>(() => visible.value.length > 0)

  function open(key: SidePanelKey): void {
    if (!opened.value.includes(key)) opened.value = [...opened.value, key]
    active.value = key
  }

  function close(key: SidePanelKey): void {
    opened.value = opened.value.filter((item) => item !== key)
    detached.value = detached.value.filter((item) => item !== key)
    if (active.value === key) active.value = opened.value[0] ?? null
  }

  function activate(key: SidePanelKey): void {
    if (opened.value.includes(key)) active.value = key
  }

  function setDetached(key: SidePanelKey, value: boolean): void {
    if (value) {
      if (!detached.value.includes(key)) detached.value = [...detached.value, key]
      if (active.value === key) active.value = visible.value[0] ?? null
    } else {
      detached.value = detached.value.filter((item) => item !== key)
      if (!opened.value.includes(key)) opened.value = [...opened.value, key]
      active.value = key
    }
  }

  function reset(): void {
    opened.value = []
    active.value = null
    detached.value = []
  }

  return {
    opened,
    active,
    detached,
    visible,
    hasPanels,
    open,
    close,
    activate,
    setDetached,
    reset,
  }
})
