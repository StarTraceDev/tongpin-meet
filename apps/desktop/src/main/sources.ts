import type { CaptureSourceKind, CaptureSourceListing } from '@tongpin/platform'

/**
 * desktopCapturer 的源 id 三平台都带前缀：`screen:0:0`、`window:123`。
 * 不额外调 API 判断类型，省一次遍历。
 */
export function sourceKind(id: string): CaptureSourceKind {
  return id.startsWith('screen:') ? 'screen' : 'window'
}

/** 只依赖 desktopCapturer 源码里用到的字段，测试不用造整个 NativeImage */
export interface DesktopSourceLike {
  id: string
  name: string
  thumbnail: { toDataURL(): string }
}

/** 屏幕排前面，同类型按名称排；窗口标题为空时给个可读的兜底 */
export function toCaptureListings(sources: readonly DesktopSourceLike[]): CaptureSourceListing[] {
  return sources
    .map((source): CaptureSourceListing => {
      const kind = sourceKind(source.id)
      const name = source.name.trim()
      return {
        id: source.id,
        name: name === '' ? (kind === 'screen' ? '未命名屏幕' : '未命名窗口') : name,
        kind,
        thumbnail: source.thumbnail.toDataURL(),
      }
    })
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'screen' ? -1 : 1
      return a.name.localeCompare(b.name, 'zh-CN')
    })
}
