export interface MatchLike {
  handle?: unknown
}

function readCrumb(handle: unknown): string | null {
  if (typeof handle !== 'object' || handle === null || !('crumb' in handle)) {
    return null
  }

  const crumb: unknown = (handle as { crumb?: unknown }).crumb

  return typeof crumb === 'string' && crumb !== '' ? crumb : null
}

/** 面包屑取路由 handle.crumb，顺序与 useMatches 一致。 */
export function breadcrumbLabels(matches: readonly MatchLike[]): string[] {
  const labels: string[] = []

  for (const match of matches) {
    const label = readCrumb(match.handle)

    if (label !== null) {
      labels.push(label)
    }
  }

  return labels
}
