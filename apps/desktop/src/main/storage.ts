import { readFileSync, renameSync, writeFileSync } from 'node:fs'

export interface StorageCipher {
  encrypt(value: string): string
  decrypt(value: string): string
}

interface StorageShape {
  values: Record<string, string>
}

/**
 * 10.8：数据放 userData 下，写入走「临时文件 + rename」保证不出现半个 JSON。
 * 安全存储（safeStorage 可用时）在 main 里通过 cipher 注入，这里只管持久化。
 */
export function createStorage(
  filePath: string,
  cipher?: StorageCipher,
): {
  get: (key: string) => string | null
  set: (key: string, value: string) => void
  remove: (key: string) => void
} {
  let cache: StorageShape | undefined

  const load = (): StorageShape => {
    if (cache !== undefined) return cache
    try {
      const raw = readFileSync(filePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<StorageShape>
      cache = { values: { ...(parsed.values ?? {}) } }
    } catch {
      cache = { values: {} }
    }
    return cache
  }

  const flush = (state: StorageShape): void => {
    const tmp = `${filePath}.tmp`
    writeFileSync(tmp, JSON.stringify(state), 'utf8')
    renameSync(tmp, filePath)
  }

  return {
    get: (key): string | null => {
      const value = load().values[key]
      if (value === undefined) return null
      try {
        return cipher?.decrypt(value) ?? value
      } catch {
        return null
      }
    },
    set: (key, value): void => {
      const state = load()
      state.values[key] = cipher?.encrypt(value) ?? value
      flush(state)
    },
    remove: (key): void => {
      const state = load()
      delete state.values[key]
      flush(state)
    },
  }
}
