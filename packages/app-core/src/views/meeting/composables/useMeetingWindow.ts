import { ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'

import { usePlatform } from '../../../platform'
import { ROUTE_NAMES } from '../../../router/names'

/**
 * 会议室窗口：桌面端是独立子窗口（1065×710，SubWindowKey='meeting'），
 * web 端就是当前 tab 的一条路由。关窗/全屏/开面板都收在这里。
 */
export function useMeetingWindow(): {
  isDesktop: boolean
  fullscreen: Ref<boolean>
  toggleFullscreen: () => Promise<void>
  openPanel: (
    key: 'meetingDetail' | 'checkin' | 'vote' | 'members' | 'panelChat',
    payload?: Record<string, unknown>,
  ) => void
  closeRoom: () => void
} {
  const platform = usePlatform()
  const router = useRouter()
  const fullscreen = ref(false)
  const isDesktop = platform.kind === 'electron'

  async function toggleFullscreen(): Promise<void> {
    fullscreen.value = !fullscreen.value
    await platform.window.setFullscreen(fullscreen.value)
  }

  function openPanel(
    key: 'meetingDetail' | 'checkin' | 'vote' | 'members' | 'panelChat',
    payload?: Record<string, unknown>,
  ): void {
    void platform.window.openSub(key, payload === undefined ? {} : { payload })
  }

  function closeRoom(): void {
    if (isDesktop) {
      void platform.window.closeAllSubs()
      void platform.window.closeSub('meeting')
      return
    }
    void router.replace({ name: ROUTE_NAMES.home })
  }

  return { isDesktop, fullscreen, toggleFullscreen, openPanel, closeRoom }
}
