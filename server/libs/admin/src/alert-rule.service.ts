import { Injectable } from '@nestjs/common'

import { ERROR_CODES } from '../../../../packages/shared/src/constants'
import type {
  AlertRuleAction,
  AlertRuleCreateInput,
  AlertRuleItem,
  AlertRuleList,
  AlertRuleUpdateInput,
} from '../../../../packages/shared/src/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'

type RuleRow = {
  id: string
  name: string
  metric: string
  comparator: string
  threshold: number
  channel: string
  target: string | null
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

/** 06 §11.11 告警规则；阈值是数字，通知方式决定 target 怎么填 */
@Injectable()
export class AlertRuleService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AlertRuleList> {
    const rows = await this.prisma.alertRule.findMany({
      where: { deletedAt: null },
      orderBy: [{ enabled: 'desc' }, { createdAt: 'asc' }],
    })
    return { items: rows.map((row) => this.toItem(row as RuleRow)) }
  }

  async create(input: AlertRuleCreateInput): Promise<AlertRuleAction> {
    const existing = await this.prisma.alertRule.findUnique({ where: { name: input.name } })
    if (existing !== null) {
      throw new ApiError(ERROR_CODES.SYSTEM_ALERT_NAME_TAKEN, '规则名称已存在', 409)
    }
    const row = await this.prisma.alertRule.create({
      data: {
        name: input.name,
        metric: input.metric,
        comparator: input.comparator,
        threshold: input.threshold,
        channel: input.channel,
        target: input.target ?? null,
        enabled: input.enabled,
      },
    })
    return { rule: this.toItem(row as RuleRow) }
  }

  async update(id: string, input: AlertRuleUpdateInput): Promise<AlertRuleAction> {
    await this.requireRule(id)
    if (input.name !== undefined) {
      const duplicate = await this.prisma.alertRule.findFirst({
        where: { name: input.name, id: { not: id } },
      })
      if (duplicate !== null) {
        throw new ApiError(ERROR_CODES.SYSTEM_ALERT_NAME_TAKEN, '规则名称已存在', 409)
      }
    }
    const row = await this.prisma.alertRule.update({
      where: { id },
      data: {
        name: input.name,
        metric: input.metric,
        comparator: input.comparator,
        threshold: input.threshold,
        channel: input.channel,
        target: input.target === undefined ? undefined : (input.target ?? null),
        enabled: input.enabled,
      },
    })
    return { rule: this.toItem(row as RuleRow) }
  }

  async remove(id: string): Promise<void> {
    await this.requireRule(id)
    await this.prisma.alertRule.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  private async requireRule(id: string): Promise<void> {
    const row = await this.prisma.alertRule.findFirst({ where: { id, deletedAt: null } })
    if (row === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '告警规则不存在', 404)
    }
  }

  private toItem(row: RuleRow): AlertRuleItem {
    return {
      id: row.id,
      name: row.name,
      metric: row.metric as AlertRuleItem['metric'],
      comparator: row.comparator as AlertRuleItem['comparator'],
      threshold: row.threshold,
      channel: row.channel as AlertRuleItem['channel'],
      target: row.target,
      enabled: row.enabled,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }
}
