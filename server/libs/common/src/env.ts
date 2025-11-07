import { existsSync } from 'node:fs'

/**
 * 本地开发从 server/.env 读环境变量（Node 20.12+ 内置，不引 dotenv）。
 * 生产环境直接给进程环境，没有 .env 就跳过。
 */
export function loadEnvFile(file = '.env'): void {
  if (existsSync(file)) process.loadEnvFile(file)
}
