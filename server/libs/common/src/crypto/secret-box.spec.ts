import { afterEach, describe, expect, it, vi } from 'vitest'

import { hasSecretKey, maskSecret, openSecret, sealSecret } from './secret-box'

describe('secret-box', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('同一把环境密钥可以加解密', () => {
    vi.stubEnv('TONGPIN_CONFIG_KEY', 'unit-test-key')

    const box = sealSecret('super-secret')

    expect(box).not.toContain('super-secret')
    expect(openSecret(box)).toBe('super-secret')
    expect(hasSecretKey()).toBe(true)
  })

  it('换密钥后解密失败', () => {
    vi.stubEnv('TONGPIN_CONFIG_KEY', 'key-one')
    const box = sealSecret('super-secret')

    vi.stubEnv('TONGPIN_CONFIG_KEY', 'key-two')

    expect(() => openSecret(box)).toThrow()
  })

  it('缺少环境密钥时拒绝加解密', () => {
    vi.stubEnv('TONGPIN_CONFIG_KEY', '')

    expect(hasSecretKey()).toBe(false)
    expect(() => sealSecret('x')).toThrow(/TONGPIN_CONFIG_KEY/)
  })

  it('掩码只露后四位', () => {
    expect(maskSecret('9f2c')).toBe('••••9f2c')
  })
})
