import { Injectable } from '@nestjs/common'

import { ERROR_CODES } from '../../../../packages/shared/src/constants'
import type {
  ConfigAction,
  ConfigCreateInput,
  ConfigItem,
  ConfigList,
  ConfigUpdateInput,
  FeatureFlagAction,
  FeatureFlagItem,
  FeatureFlagList,
  FeatureFlagUpdateInput,
} from '../../../../packages/shared/src/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'
import { Prisma } from '../../infra/src/generated/prisma/client'

type ConfigRow = {
  key: string
  value: unknown
  description: string | null
  updatedById: string | null
  updatedAt: Date
}

type FlagRow = {
  key: string
  enabled: boolean
  description: string | null
  rolloutPct: number
  payload: unknown
  updatedAt: Date
}

/** 04 §6.8 管理台系统配置；机读配置与灰度开关放在一起，写入要留操作人 */
@Injectable()
export class ConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async configs(): Promise<ConfigList> {
    const rows = await this.prisma.sysConfig.findMany({ orderBy: { key: 'asc' } })
    const names = await this.userNames(rows.map((row) => row.updatedById))
    return { items: rows.map((row) => this.toItem(row, names)) }
  }

  async create(input: ConfigCreateInput, actorId: string): Promise<ConfigAction> {
    const existing = await this.prisma.sysConfig.findUnique({ where: { key: input.key } })
    if (existing !== null) {
      throw new ApiError(ERROR_CODES.SYSTEM_CONFIG_TAKEN, '配置键已存在', 409)
    }
    const row = await this.prisma.sysConfig.create({
      data: {
        key: input.key,
        value: input.value as Prisma.InputJsonValue,
        description: input.description ?? null,
        updatedById: actorId,
      },
    })
    const names = await this.userNames([actorId])
    return { config: this.toItem(row, names) }
  }

  async update(key: string, input: ConfigUpdateInput, actorId: string): Promise<ConfigAction> {
    const existing = await this.prisma.sysConfig.findUnique({ where: { key } })
    if (existing === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '配置项不存在', 404)
    }
    const row = await this.prisma.sysConfig.update({
      where: { key },
      data: {
        value: input.value === undefined ? undefined : (input.value as Prisma.InputJsonValue),
        description: input.description === undefined ? undefined : (input.description ?? null),
        updatedById: actorId,
      },
    })
    const names = await this.userNames([actorId])
    return { config: this.toItem(row, names) }
  }

  async remove(key: string): Promise<void> {
    const existing = await this.prisma.sysConfig.findUnique({ where: { key } })
    if (existing === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '配置项不存在', 404)
    }
    await this.prisma.sysConfig.delete({ where: { key } })
  }

  async flags(): Promise<FeatureFlagList> {
    const rows = await this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } })
    return { items: rows.map((row) => this.toFlag(row)) }
  }

  async updateFlag(key: string, input: FeatureFlagUpdateInput): Promise<FeatureFlagAction> {
    const existing = await this.prisma.featureFlag.findUnique({ where: { key } })
    if (existing === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '功能开关不存在', 404)
    }
    const row = await this.prisma.featureFlag.update({
      where: { key },
      data: {
        enabled: input.enabled,
        rolloutPct: input.rolloutPct,
        description: input.description === undefined ? undefined : (input.description ?? null),
        payload:
          input.payload === undefined
            ? undefined
            : input.payload === null
              ? Prisma.DbNull
              : (input.payload as Prisma.InputJsonValue),
      },
    })
    return { flag: this.toFlag(row) }
  }

  private async userNames(ids: (string | null)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((id): id is string => id !== null))]
    if (unique.length === 0) {
      return new Map()
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true },
    })
    return new Map(users.map((user) => [user.id, user.name]))
  }

  private toItem(row: ConfigRow, names: Map<string, string>): ConfigItem {
    return {
      key: row.key,
      value: row.value,
      description: row.description,
      updatedById: row.updatedById,
      updatedByName: row.updatedById === null ? null : (names.get(row.updatedById) ?? null),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  private toFlag(row: FlagRow): FeatureFlagItem {
    return {
      key: row.key,
      enabled: row.enabled,
      description: row.description,
      rolloutPct: row.rolloutPct,
      payload: row.payload,
      updatedAt: row.updatedAt.toISOString(),
    }
  }
}
