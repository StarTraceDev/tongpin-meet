import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12

function keyFromEnv(): Buffer | null {
  const raw = process.env.TONGPIN_CONFIG_KEY
  if (raw === undefined || raw.trim() === '') {
    return null
  }
  return createHash('sha256').update(raw).digest()
}

export function hasSecretKey(): boolean {
  return keyFromEnv() !== null
}

/** 明文 → base64(iv:tag:cipher)，密钥由 TONGPIN_CONFIG_KEY 派生 */
export function sealSecret(plain: string): string {
  const key = keyFromEnv()
  if (key === null) {
    throw new Error('TONGPIN_CONFIG_KEY 未配置，无法加密密钥')
  }
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')
}

export function openSecret(box: string): string {
  const key = keyFromEnv()
  if (key === null) {
    throw new Error('TONGPIN_CONFIG_KEY 未配置，无法解密密钥')
  }
  const raw = Buffer.from(box, 'base64')
  const iv = raw.subarray(0, IV_BYTES)
  const tag = raw.subarray(IV_BYTES, IV_BYTES + 16)
  const data = raw.subarray(IV_BYTES + 16)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

export function maskSecret(last4: string): string {
  return `••••${last4}`
}
