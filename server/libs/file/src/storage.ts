/** 文件存储抽象：本地磁盘与 MinIO 共用同一接口（M10 接对象存储时只换实现） */
export interface StorageProvider {
  write(key: string, data: Buffer): Promise<void>
  read(key: string): Promise<Buffer>
  exists(key: string): Promise<boolean>
  remove(key: string): Promise<void>
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER')
