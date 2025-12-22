import { Injectable } from '@nestjs/common'

import { ERROR_CODES } from '../../../../packages/shared/src/constants/error-codes'

import type {
  SmsLogList,
  SmsLogsQuery,
  SmsProviderAction,
  SmsProviderCreateInput,
  SmsProviderItem,
  SmsProviderList,
  SmsProviderUpdateInput,
  SmsTemplateAction,
  SmsTemplateCreateInput,
  SmsTemplateItem,
  SmsTemplateList,
  SmsTemplateUpdateInput,
} from '@tongpin/shared/types'

import { ApiError } from '../../common/src/errors/api-error'
import { hasSecretKey, maskSecret, sealSecret } from '../../common/src/crypto/secret-box'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'

interface ProviderRowLike {
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

interface TemplateRowLike {
  id: string
  code: string
  name: string
  content: string
  providerId: string | null
  enabled: boolean
  createdAt: Date
  provider: { name: string } | null
}

function toProvider(row: ProviderRowLike): SmsProviderItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    endpoint: row.endpoint,
    accessKeyId: row.accessKeyId,
    secretMasked: maskSecret(row.secretLast4),
    signName: row.signName,
    templateCode: row.templateCode,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
  }
}

function toTemplate(row: TemplateRowLike): SmsTemplateItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    content: row.content,
    providerId: row.providerId,
    providerName: row.provider?.name ?? null,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
  }
}

/** 06 §11.8 短信配置：密钥只写不读，读接口只回掩码 */
@Injectable()
export class SmsConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async providers(): Promise<SmsProviderList> {
    const rows = await this.prisma.smsProvider.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    return { items: rows.map(toProvider) }
  }

  async createProvider(input: SmsProviderCreateInput): Promise<SmsProviderAction> {
    this.requireKey()
    const taken = await this.prisma.smsProvider.findFirst({
      where: { code: input.code, deletedAt: null },
    })
    if (taken !== null) {
      throw new ApiError(
        ERROR_CODES.SYSTEM_SMS_PROVIDER_TAKEN,
        `服务商编码 ${input.code} 已被占用`,
        409,
      )
    }
    const row = await this.prisma.smsProvider.create({
      data: {
        code: input.code,
        name: input.name,
        endpoint: input.endpoint ?? null,
        accessKeyId: input.accessKeyId,
        ...this.sealPair(input.secret),
        signName: input.signName,
        templateCode: input.templateCode ?? null,
        enabled: input.enabled ?? true,
      },
    })
    return { provider: toProvider(row) }
  }

  async updateProvider(id: string, input: SmsProviderUpdateInput): Promise<SmsProviderAction> {
    await this.requireProvider(id)
    const secret = input.secret === undefined ? {} : this.sealPair(input.secret)
    const row = await this.prisma.smsProvider.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.endpoint === undefined ? {} : { endpoint: input.endpoint }),
        ...(input.accessKeyId === undefined ? {} : { accessKeyId: input.accessKeyId }),
        ...(input.signName === undefined ? {} : { signName: input.signName }),
        ...(input.templateCode === undefined ? {} : { templateCode: input.templateCode }),
        ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
        ...secret,
      },
    })
    return { provider: toProvider(row) }
  }

  async removeProvider(id: string): Promise<void> {
    await this.requireProvider(id)
    await this.prisma.smsProvider.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async templates(): Promise<SmsTemplateList> {
    const rows = await this.prisma.smsTemplate.findMany({
      where: { deletedAt: null },
      include: { provider: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { items: rows.map(toTemplate) }
  }

  async createTemplate(input: SmsTemplateCreateInput): Promise<SmsTemplateAction> {
    const taken = await this.prisma.smsTemplate.findFirst({
      where: { code: input.code, deletedAt: null },
    })
    if (taken !== null) {
      throw new ApiError(
        ERROR_CODES.SYSTEM_SMS_TEMPLATE_TAKEN,
        `模板编码 ${input.code} 已被占用`,
        409,
      )
    }
    const row = await this.prisma.smsTemplate.create({
      data: {
        code: input.code,
        name: input.name,
        content: input.content,
        providerId: input.providerId ?? null,
        enabled: input.enabled ?? true,
      },
      include: { provider: { select: { name: true } } },
    })
    return { template: toTemplate(row) }
  }

  async updateTemplate(id: string, input: SmsTemplateUpdateInput): Promise<SmsTemplateAction> {
    await this.requireTemplate(id)
    const row = await this.prisma.smsTemplate.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.content === undefined ? {} : { content: input.content }),
        ...(input.providerId === undefined ? {} : { providerId: input.providerId }),
        ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
      },
      include: { provider: { select: { name: true } } },
    })
    return { template: toTemplate(row) }
  }

  async removeTemplate(id: string): Promise<void> {
    await this.requireTemplate(id)
    await this.prisma.smsTemplate.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async logs(query: SmsLogsQuery): Promise<SmsLogList> {
    const where = {
      ...(query.phone === undefined || query.phone === ''
        ? {}
        : { phone: { contains: query.phone } }),
      ...(query.status === undefined ? {} : { status: query.status }),
    }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.smsLog.count({ where }),
      this.prisma.smsLog.findMany({
        where,
        include: { provider: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ])
    return {
      items: rows.map((row): SmsLogList['items'][number] => ({
        id: row.id,
        phone: row.phone,
        template: row.template,
        providerName: row.provider?.name ?? null,
        status: row.status as SmsLogList['items'][number]['status'],
        error: row.error,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }

  private sealPair(secret: string): { secretCipher: string; secretLast4: string } {
    this.requireKey()
    return { secretCipher: sealSecret(secret), secretLast4: secret.slice(-4) }
  }

  private requireKey(): void {
    if (!hasSecretKey()) {
      throw new ApiError(
        ERROR_CODES.SYSTEM_SECRET_KEY_MISSING,
        '服务端未配置 TONGPIN_CONFIG_KEY，无法保存短信密钥',
        500,
      )
    }
  }

  private async requireProvider(id: string): Promise<void> {
    const row = await this.prisma.smsProvider.findFirst({ where: { id, deletedAt: null } })
    if (row === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '服务商不存在', 404)
    }
  }

  private async requireTemplate(id: string): Promise<void> {
    const row = await this.prisma.smsTemplate.findFirst({ where: { id, deletedAt: null } })
    if (row === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '模板不存在', 404)
    }
  }
}
