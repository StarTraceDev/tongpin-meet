import { type INestApplication, Logger, type Type } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { loadEnvFile } from './env'
import { ProblemJsonFilter } from './filters/problem-json.filter'
import { ZodValidationPipe } from './pipes/zod-validation.pipe'

export interface BootstrapOptions {
  /** 进程名，只用于日志，如 api / gateway / ai */
  name: string
  module: Type<unknown>
  port: number
  /** 进程独有的装配，比如 gateway 要换 WsAdapter */
  configure?: (app: INestApplication) => void
}

/** 三个进程共用的中间件装配；测试里也直接调它，保证测的就是线上那套 */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api/v1', { exclude: ['health'] })
  app.useGlobalPipes(new ZodValidationPipe())
  app.useGlobalFilters(new ProblemJsonFilter())
  app.enableShutdownHooks()
  return app
}

export async function bootstrap({
  name,
  module,
  port,
  configure,
}: BootstrapOptions): Promise<void> {
  loadEnvFile()
  const app = await NestFactory.create(module)
  configureApp(app)
  configure?.(app)
  await app.listen(port, '0.0.0.0')
  Logger.log(`${name} listening on http://localhost:${port}`, 'Bootstrap')
}

/** 端口非法时直接启动失败，不要静默回退到默认值 */
export function envPort(variable: string, fallback: number): number {
  const raw = process.env[variable]
  if (raw === undefined || raw === '') return fallback
  const port = Number(raw)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`${variable} 不是合法端口: ${raw}`)
  }
  return port
}
