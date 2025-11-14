/** 短信通道抽象：mock / aliyun 等实现由 SMS_PROVIDER 决定（07 §11.2） */
export interface SmsPort {
  sendCode(phone: string, code: string): Promise<void>
}

export const SMS_PORT = Symbol('SMS_PORT')
