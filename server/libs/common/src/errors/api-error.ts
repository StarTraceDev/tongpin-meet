import { HttpException } from '@nestjs/common'

/**
 * 业务错误：code 用 `@tongpin/shared` 里定义的五位错误码，title 是给用户看的一句话。
 * 只有它能让响应里出现 30xxx / 40xxx 这类业务段；框架抛出的异常走通用码。
 */
export class ApiError extends HttpException {
  constructor(
    readonly code: number,
    readonly title: string,
    status: number,
    readonly detail?: string,
  ) {
    super({ code, title, detail }, status)
  }
}
