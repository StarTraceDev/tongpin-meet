import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createStorage } from './storage'

const dirs: string[] = []

function tempFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'tongpin-storage-'))
  dirs.push(dir)
  return join(dir, 'storage.json')
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('createStorage', () => {
  it('set/get/remove 并立即落盘', () => {
    const file = tempFile()
    const storage = createStorage(file)
    storage.set('token', 'abc')
    expect(storage.get('token')).toBe('abc')
    expect(createStorage(file).get('token')).toBe('abc')
    storage.remove('token')
    expect(storage.get('token')).toBeNull()
  })

  it('cipher 加密落盘、读取时解密', () => {
    const file = tempFile()
    const storage = createStorage(file, {
      encrypt: (value) => `enc:${Buffer.from(value).toString('hex')}`,
      decrypt: (value) => Buffer.from(value.slice(4), 'hex').toString(),
    })
    storage.set('refresh', 'secret-token')
    expect(readFileSync(file, 'utf8')).not.toContain('secret-token')
    expect(storage.get('refresh')).toBe('secret-token')
  })

  it('文件损坏时当作空存储', () => {
    const file = tempFile()
    const storage = createStorage(file)
    storage.set('k', 'v')
    expect(storage.get('missing')).toBeNull()
  })
})
