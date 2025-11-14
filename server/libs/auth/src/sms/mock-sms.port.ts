import { Injectable, Logger } from '@nestjs/common'

import type { SmsPort } from './sms.port'

/** 本地/测试用：不真发短信，把验证码写日志（生产换 aliyun 实现） */
@Injectable()
export class MockSmsPort implements SmsPort {
  private readonly logger = new Logger('MockSms')

  async sendCode(phone: string, code: string): Promise<void> {
    this.logger.log(`[mock] ${phone} 的验证码是 ${code}`)
  }
}
