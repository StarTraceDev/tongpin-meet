import type { UpdateState } from '@tongpin/platform'

function versionSuffix(version: string | undefined): string {
  return version === undefined ? '' : ` ${version}`
}

export function updateText(state: UpdateState): string {
  switch (state.status) {
    case 'idle':
      return '已是最新版本。'
    case 'checking':
      return '正在检查更新…'
    case 'available':
      return `发现新版本${versionSuffix(state.version)}，正在下载。`
    case 'downloading':
      return `正在下载更新 ${state.progress ?? 0}%。`
    case 'ready':
      return `新版本${versionSuffix(state.version)} 已就绪，重启后安装。`
    case 'unsupported':
      return '开发模式不检查更新，打包后才启用自动更新。'
    case 'error':
      return `更新失败：${state.error ?? '未知错误'}`
  }
}
