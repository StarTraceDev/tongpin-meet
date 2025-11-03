import { z } from 'zod'

import { phoneSchema } from './common'

/**
 * 04 §6.1 的认证入参。
 * 账号密码的强度规则文档没定（03 §5.5 只有会议密码 4-32），先只做非空，M3 认证模块再收紧。
 */
export const loginByPasswordSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1),
})

export const loginBySmsSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, '验证码是 6 位数字'),
})

export const sendSmsSchema = z.object({
  phone: phoneSchema,
})

/** 设备码登录：PC 显示 6 位码，用户在已登录浏览器输码确认 */
export const qrConfirmSchema = z.object({
  code: z.string().regex(/^\d{6}$/, '设备码是 6 位数字'),
})

export const refreshSessionSchema = z.object({
  refreshToken: z.string().min(1),
})
