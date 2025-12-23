import { Injectable } from '@nestjs/common'

import { ERROR_CODES } from '../../../../packages/shared/src/constants/error-codes'

import type {
  AiProviderAction,
  AiProviderCreateInput,
  AiProviderItem,
  AiProviderList,
  AiProviderUpdateInput,
  AiRouteAction,
  AiRouteCreateInput,
  AiRouteItem,
  AiRouteList,
  AiRouteUpdateInput,
  AiUsageList,
  AiUsageQuery,
} from '@tongpin/shared/types'

import { ApiError } from '../../common/src/errors/api-error'
import { hasSecretKey, maskSecret, sealSecret } from '../../common/src/crypto/secret-box'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'

interface ProviderRowLike {
  id: string
  code: string
  name: string
  baseUrl: string
  apiKeyLast4: string
  model: string
  enabled: boolean
  createdAt: Date
}

interface RouteRowLike {
  id: string
  scene: string
  providerId: string | null
  modelOverride: string | null
  enabled: boolean
  provider: { name: string } | null
}

function toProvider(row: ProviderRowLike): AiProviderItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    baseUrl: row.baseUrl,
    model: row.model,
    apiKeyMasked: maskSecret(row.apiKeyLast4),
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
  }
}

function toRoute(row: RouteRowLike): AiRouteItem {
  return {
    id: row.id,
    scene: row.scene,
    providerId: row.providerId,
    providerName: row.provider?.name ?? null,
    modelOverride: row.modelOverride,
    enabled: row.enabled,
  }
}

/** 06 §11.9 AI 配置：密钥只写不读，用量按场景筛选并汇总 */
@Injectable()
export class AiConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async providers(): Promise<AiProviderList> {
    const rows = await this.prisma.aiProvider.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    return { items: rows.map(toProvider) }
  }

  async createProvider(input: AiProviderCreateInput): Promise<AiProviderAction> {
    const taken = await this.prisma.aiProvider.findFirst({
      where: { code: input.code, deletedAt: null },
    })
    if (taken !== null) {
      throw new ApiError(
        ERROR_CODES.SYSTEM_AI_PROVIDER_TAKEN,
        `服务商编码 ${input.code} 已被占用`,
        409,
      )
    }
    const row = await this.prisma.aiProvider.create({
      data: {
        code: input.code,
        name: input.name,
        baseUrl: input.baseUrl,
        model: input.model,
        enabled: input.enabled ?? true,
        ...this.sealPair(input.apiKey),
      },
    })
    return { provider: toProvider(row) }
  }

  async updateProvider(id: string, input: AiProviderUpdateInput): Promise<AiProviderAction> {
    await this.requireProvider(id)
    const row = await this.prisma.aiProvider.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.baseUrl === undefined ? {} : { baseUrl: input.baseUrl }),
        ...(input.model === undefined ? {} : { model: input.model }),
        ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
        ...(input.apiKey === undefined ? {} : this.sealPair(input.apiKey)),
      },
    })
    return { provider: toProvider(row) }
  }

  async removeProvider(id: string): Promise<void> {
    await this.requireProvider(id)
    await this.prisma.aiProvider.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async routes(): Promise<AiRouteList> {
    const rows = await this.prisma.aiRoute.findMany({
      include: { provider: { select: { name: true } } },
      orderBy: { scene: 'asc' },
    })
    return { items: rows.map(toRoute) }
  }

  async createRoute(input: AiRouteCreateInput): Promise<AiRouteAction> {
    const taken = await this.prisma.aiRoute.findUnique({ where: { scene: input.scene } })
    if (taken !== null) {
      throw new ApiError(ERROR_CODES.SYSTEM_AI_ROUTE_TAKEN, `场景 ${input.scene} 已有路由`, 409)
    }
    const row = await this.prisma.aiRoute.create({
      data: {
        scene: input.scene,
        providerId: input.providerId ?? null,
        modelOverride: input.modelOverride ?? null,
        enabled: input.enabled ?? true,
      },
      include: { provider: { select: { name: true } } },
    })
    return { route: toRoute(row) }
  }

  async updateRoute(id: string, input: AiRouteUpdateInput): Promise<AiRouteAction> {
    await this.requireRoute(id)
    const row = await this.prisma.aiRoute.update({
      where: { id },
      data: {
        ...(input.providerId === undefined ? {} : { providerId: input.providerId }),
        ...(input.modelOverride === undefined ? {} : { modelOverride: input.modelOverride }),
        ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
      },
      include: { provider: { select: { name: true } } },
    })
    return { route: toRoute(row) }
  }

  async removeRoute(id: string): Promise<void> {
    await this.requireRoute(id)
    await this.prisma.aiRoute.delete({ where: { id } })
  }

  async usage(query: AiUsageQuery): Promise<AiUsageList> {
    const where = query.scene === undefined || query.scene === '' ? {} : { scene: query.scene }
    const [totals, rows] = await Promise.all([
      this.prisma.aiUsage.aggregate({
        where,
        _count: { _all: true },
        _sum: { promptTokens: true, completionTokens: true, costCents: true },
      }),
      this.prisma.aiUsage.findMany({
        where,
        include: { provider: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ])
    return {
      items: rows.map((row): AiUsageList['items'][number] => ({
        id: row.id,
        scene: row.scene,
        providerName: row.provider?.name ?? null,
        promptTokens: row.promptTokens,
        completionTokens: row.completionTokens,
        costCents: row.costCents,
        createdAt: row.createdAt.toISOString(),
      })),
      total: totals._count._all,
      page: query.page,
      pageSize: query.pageSize,
      totals: {
        calls: totals._count._all,
        promptTokens: totals._sum.promptTokens ?? 0,
        completionTokens: totals._sum.completionTokens ?? 0,
        costCents: totals._sum.costCents ?? 0,
      },
    }
  }

  private sealPair(apiKey: string): { apiKeyCipher: string; apiKeyLast4: string } {
    if (!hasSecretKey()) {
      throw new ApiError(
        ERROR_CODES.SYSTEM_SECRET_KEY_MISSING,
        '服务端未配置 TONGPIN_CONFIG_KEY，无法保存 AI 密钥',
        500,
      )
    }
    return { apiKeyCipher: sealSecret(apiKey), apiKeyLast4: apiKey.slice(-4) }
  }

  private async requireProvider(id: string): Promise<void> {
    const row = await this.prisma.aiProvider.findFirst({ where: { id, deletedAt: null } })
    if (row === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, 'AI 服务商不存在', 404)
    }
  }

  private async requireRoute(id: string): Promise<void> {
    const row = await this.prisma.aiRoute.findUnique({ where: { id } })
    if (row === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, 'AI 路由不存在', 404)
    }
  }
}
