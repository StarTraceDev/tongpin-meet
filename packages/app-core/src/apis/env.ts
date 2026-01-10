/**
 * 运行时环境变量统一入口（10-M13 O12）。
 * 只在这里读 import.meta.env，业务代码不直接碰。
 */
export interface AppEnv {
  /** 后端 API 前缀，Electron 打包后同样走内置常量 */
  apiBase: string
  /** 普通请求默认超时；长轮询显式传 0 关闭 */
  requestTimeoutMs: number
}

export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000

export function readEnv(): AppEnv {
  const base: unknown = import.meta.env.VITE_API_BASE
  return {
    apiBase: typeof base === 'string' && base.length > 0 ? base : '/api/v1',
    requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
  }
}
