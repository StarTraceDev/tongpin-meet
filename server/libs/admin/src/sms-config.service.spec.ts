import { afterEach, describe, expect, it, vi } from 'vitest'

import { hasSecretKey } from '../../common/src/crypto/secret-box'
import { ERROR_CODES } from '../../../../packages/shared/src/constants/error-codes'

import { SmsConfigService } from './sms-config.service'

import type { PrismaService } from '../../infra/src/prisma/prisma.service'

interface ProviderRow {
  id: string
  code: string
  name: string
  endpoint: string | null
  accessKeyId: string
  secretLast4: string
  signName: string
  templateCode: string | null
  enabled: boolean
  createdAt: Date
}

const provider: ProviderRow = {
  id: 'p_1',
  code: 'ALIYUN',
  name: '阿里云',
  endpoint: 'https://dysmsapi.aliyuncs.com',
  accessKeyId: 'LTAI-test',
  secretLast4: '9f2c',
  signName: '同频会议',
  templateCode: null,
  enabled: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

function createPrisma(): Record<string, unknown> {
  return {
    smsProvider: {
      findMany: vi.fn(async (): Promise<ProviderRow[]> => [provider]),
      findFirst: vi.fn(async (): Promise<ProviderRow | null> => null),
      create: vi.fn(async () => provider),
      update: vi.fn(async () => provider),
    },
    smsTemplate: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
    smsLog: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
    },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  }
}

function service(prisma: Record<string, unknown>): SmsConfigService {
  return new SmsConfigService(prisma as unknown as PrismaService)
}

describe('SmsConfigService 服务商', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('列表只返回密钥掩码', async () => {
    const [item] = (await service(createPrisma()).providers()).items

    expect(item?.secretMasked).toBe('••••9f2c')
    expect(JSON.stringify(item)).not.toContain('secretCipher')
  })

  it('未配置 TONGPIN_CONFIG_KEY 时拒绝写入密钥', async () => {
    vi.stubEnv('TONGPIN_CONFIG_KEY', '')

    await expect(
      service(createPrisma()).createProvider({
        code: 'ALIYUN',
        name: '阿里云',
        accessKeyId: 'LTAI',
        secret: 'super-secret',
        signName: '同频会议',
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.SYSTEM_SECRET_KEY_MISSING, status: 500 })
  })

  it('编码重复时 409', async () => {
    vi.stubEnv('TONGPIN_CONFIG_KEY', 'test-key')
    const prisma = createPrisma()
    vi.mocked(prisma.smsProvider as { findFirst: () => Promise<ProviderRow | null> }).findFirst =
      vi.fn(async (): Promise<ProviderRow | null> => provider)

    await expect(
      service(prisma).createProvider({
        code: 'ALIYUN',
        name: '阿里云',
        accessKeyId: 'LTAI',
        secret: 'super-secret',
        signName: '同频会议',
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.SYSTEM_SMS_PROVIDER_TAKEN, status: 409 })
  })

  it('写入时加密且只留后四位', async () => {
    vi.stubEnv('TONGPIN_CONFIG_KEY', 'test-key')
    const prisma = createPrisma()

    await service(prisma).createProvider({
      code: 'ALIYUN',
      name: '阿里云',
      accessKeyId: 'LTAI',
      secret: 'super-secret',
      signName: '同频会议',
    })

    const call = vi.mocked(
      prisma.smsProvider as { create: (args: unknown) => Promise<ProviderRow> },
    ).create.mock.calls[0]?.[0] as { data: { secretCipher: string; secretLast4: string } }
    expect(call.data.secretCipher).not.toContain('super-secret')
    expect(call.data.secretLast4).toBe('cret')
  })

  it('不改密钥时不要求环境密钥', async () => {
    vi.stubEnv('TONGPIN_CONFIG_KEY', '')
    const prisma = createPrisma()
    vi.mocked(prisma.smsProvider as { findFirst: () => Promise<ProviderRow | null> }).findFirst =
      vi.fn(async (): Promise<ProviderRow | null> => provider)

    await expect(
      service(prisma).updateProvider('p_1', { name: '阿里云短信' }),
    ).resolves.toBeDefined()
    expect(hasSecretKey()).toBe(false)
  })
})

describe('SmsConfigService 模板与日志', () => {
  it('模板列表带服务商名称', async () => {
    const prisma = createPrisma()
    vi.mocked(prisma.smsTemplate as { findMany: () => Promise<unknown[]> }).findMany = vi.fn(
      async (): Promise<unknown[]> => [
        {
          id: 't_1',
          code: 'LOGIN_CODE',
          name: '登录验证码',
          content: '您的验证码是 {code}',
          providerId: 'p_1',
          enabled: true,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          provider: { name: '阿里云' },
        },
      ],
    )

    const [item] = (await service(prisma).templates()).items

    expect(item).toMatchObject({ providerName: '阿里云', code: 'LOGIN_CODE' })
  })

  it('日志按手机号与状态过滤并分页', async () => {
    const prisma = createPrisma()
    vi.mocked(prisma.smsLog as { count: () => Promise<number> }).count = vi.fn(async () => 1)
    vi.mocked(prisma.smsLog as { findMany: () => Promise<unknown[]> }).findMany = vi.fn(
      async (): Promise<unknown[]> => [
        {
          id: 'l_1',
          phone: '13800000000',
          template: 'LOGIN_CODE',
          status: 'FAILED',
          error: '签名错误',
          createdAt: new Date('2026-01-03T00:00:00.000Z'),
          provider: { name: '阿里云' },
        },
      ],
    )

    const result = await service(prisma).logs({
      page: 2,
      pageSize: 10,
      phone: '138',
      status: 'FAILED',
    })

    expect(result).toMatchObject({ total: 1, page: 2, pageSize: 10 })
    expect(result.items[0]).toMatchObject({ providerName: '阿里云', status: 'FAILED' })
  })
})
