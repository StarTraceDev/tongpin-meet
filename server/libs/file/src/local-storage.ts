import { Injectable } from '@nestjs/common'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

import type { StorageProvider } from './storage'

function safeKey(key: string): string {
  const segments = key.split('/').filter((segment) => segment.length > 0)
  if (segments.some((segment) => segment === '..' || segment === '.')) {
    throw new Error(`非法存储键：${key}`)
  }
  return segments.map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, '_')).join('/')
}

/** 本地磁盘存储：STORAGE_DIR 可配，默认 server/storage */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly root: string

  constructor() {
    this.root = resolve(process.env.STORAGE_DIR ?? join(process.cwd(), 'storage'))
  }

  private pathOf(key: string): string {
    return join(this.root, safeKey(key))
  }

  async write(key: string, data: Buffer): Promise<void> {
    const target = this.pathOf(key)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, data)
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.pathOf(key))
  }

  async exists(key: string): Promise<boolean> {
    try {
      const info = await stat(this.pathOf(key))
      return info.isFile()
    } catch {
      return false
    }
  }

  async remove(key: string): Promise<void> {
    await rm(this.pathOf(key), { force: true })
  }
}
