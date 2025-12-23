import { afterEach, describe, expect, it, vi } from 'vitest'

import { ERROR_CODES } from '../../../../packages/shared/src/constants/error-codes'

import { AiConfigService } from './ai-config.service'

import type { PrismaService } from '../../infra/src/prisma/prisma.service'

const provider = {
  id: 'ap_1',
  code: 'DEEPSEEK',
  name: 'DeepSeek',
  baseUrl: 'https://api.deepseek.com',
  apiKeyLast4: '9f2c',
  model: 'deepseek-chat',
  enabled: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

function createPrisma(): Record<string, unknown> {
  return {
    aiProvider: {
      findMany: vi.fn(async () => [provider]),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => provider),
      update: vi.fn(async () => provider),
    },
    aiRoute: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
      delete: vi.fn(async () => ({})),
    },
    aiUsage: {
      aggregate: vi.fn(async () => ({
        _count: { _all: 0 },
        _sum: { promptTokens: 0, completionTokens: 0, costCents: 0 },
      })),
      findMany: vi.fn(async () => []),
    },
  }
}

function service(prisma: Record<string, unknown>): AiConfigService {
  return new AiConfigService(prisma as unknown as PrismaService)
}

describe('AiConfigService 服务商', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('列表只返回密钥掩码', async () => {
    const [item] = (await service(createPrisma()).providers()).items

    expect(item?.apiKeyMasked).toBe('••••9f2c')
    expect(JSON.stringify(item)).not.toContain('apiKeyCipher')
  })

  it('缺 TONGPIN_CONFIG_KEY 时 500', async () => {
    vi.stubEnv('TONGPIN_CONFIG_KEY', '')

    await expect(
      service(createPrisma()).createProvider({
        code: 'DEEPSEEK',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat',
        apiKey: 'sk-test',
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.SYSTEM_SECRET_KEY_MISSING, status: 500 })
  })

  it('编码重复时 409', async () => {
    vi.stubEnv('TONGPIN_CONFIG_KEY', 'test-key')
    const prisma = createPrisma()
    vi.mocked(prisma.aiProvider as { findFirst: () => Promise<typeof provider | null> }).findFirst =
      vi.fn(async (): Promise<typeof provider | null> => provider)

    await expect(
      service(prisma).createProvider({
        code: 'DEEPSEEK',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat',
        apiKey: 'sk-test',
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.SYSTEM_AI_PROVIDER_TAKEN, status: 409 })
  })
})

describe('AiConfigService 路由与用量', () => {
  it('路由带服务商名称', async () => {
    const prisma = createPrisma()
    vi.mocked(prisma.aiRoute as { findMany: () => Promise<unknown[]> }).findMany = vi.fn(
      async (): Promise<unknown[]> => [
        {
          id: 'ar_1',
          scene: 'minutes',
          providerId: 'ap_1',
          modelOverride: null,
          enabled: true,
          provider: { name: 'DeepSeek' },
        },
      ],
    )

    const [route] = (await service(prisma).routes()).items

    expect(route).toMatchObject({ scene: 'minutes', providerName: 'DeepSeek' })
  })

  it('场景重复时 409', async () => {
    const prisma = createPrisma()
    vi.mocked(prisma.aiRoute as { findUnique: () => Promise<unknown | null> }).findUnique = vi.fn(
      async (): Promise<unknown | null> => ({ id: 'ar_1' }),
    )

    await expect(service(prisma).createRoute({ scene: 'minutes' })).rejects.toMatchObject({
      code: ERROR_CODES.SYSTEM_AI_ROUTE_TAKEN,
      status: 409,
    })
  })

  it('用量按场景过滤并汇总', async () => {
    const prisma = createPrisma()
    vi.mocked(prisma.aiUsage as { aggregate: () => Promise<unknown> }).aggregate = vi.fn(
      async (): Promise<unknown> => ({
        _count: { _all: 3 },
        _sum: { promptTokens: 1200, completionTokens: 800, costCents: 42 },
      }),
    )
    vi.mocked(prisma.aiUsage as { findMany: () => Promise<unknown[]> }).findMany = vi.fn(
      async (): Promise<unknown[]> => [
        {
          id: 'au_1',
          scene: 'minutes',
          promptTokens: 500,
          completionTokens: 300,
          costCents: 12,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          provider: { name: 'DeepSeek' },
        },
      ],
    )

    const result = await service(prisma).usage({ page: 1, pageSize: 20, scene: 'minutes' })

    expect(result.totals).toEqual({
      calls: 3,
      promptTokens: 1200,
      completionTokens: 800,
      costCents: 42,
    })
    expect(result.items[0]).toMatchObject({ providerName: 'DeepSeek', costCents: 12 })
  })
})
