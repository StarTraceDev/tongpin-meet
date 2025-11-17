import { type INestApplication, Body, Controller, Module, Post } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { configureApp } from '../../../libs/common/src/bootstrap'
// 必须值导入：emitDecoratorMetadata 要在运行时拿到类，才能让全局管道取到 static schema
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateMeetingDto } from '../../../libs/meeting/src'
import { AppModule } from './app.module'

/** 只在测试里用的探针接口：验证 createZodDto + 全局 ZodValidationPipe 跑通 shared schema */
@Controller('_probe')
class ProbeController {
  @Post('meetings')
  create(@Body() body: CreateMeetingDto): CreateMeetingDto {
    return body
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

const VALID_MEETING = {
  title: '项目周会',
  startAt: '2026-11-06T10:00:00+08:00',
  endAt: '2026-11-06T11:00:00+08:00',
}

describe('api 进程', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, ProbeModule],
    }).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /health 不走 /api/v1 前缀', async () => {
    const res = await request(app.getHttpServer()).get('/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok', app: 'api' })
  })

  it('未知路由返回 problem+json，带 traceId', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/definitely-not-a-route')

    expect(res.status).toBe(404)
    expect(res.headers['content-type']).toContain('application/problem+json')
    expect(res.headers['x-request-id']).toBeTruthy()
    expect(res.body).toMatchObject({
      status: 404,
      code: 10000,
      instance: '/api/v1/definitely-not-a-route',
    })
  })

  it('createZodDto 跑 shared 的 createMeetingSchema：默认值补齐、多余字段剔除', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/_probe/meetings')
      .send({ ...VALID_MEETING, audioOn: true, extra: 'stripped' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      title: '项目周会',
      settings: { muteOnJoin: true, watermark: false, allowGuest: false, autoRecord: false },
      inviteeIds: [],
    })
    expect(res.body).not.toHaveProperty('extra')
    expect(res.body).not.toHaveProperty('audioOn')
  })

  it('refine 失败也走 problem+json：400 / 10001，detail 指到 endAt', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/_probe/meetings')
      .send({ ...VALID_MEETING, endAt: '2026-11-06T09:00:00+08:00' })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ status: 400, code: 10001, title: '请求参数不合法' })
    expect(String(res.body.detail)).toContain('endAt')
    expect(String(res.body.detail)).toContain('结束时间必须晚于开始时间')
  })

  it('必填字段缺失：400，detail 指到 title', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/_probe/meetings')
      .send({ startAt: VALID_MEETING.startAt, endAt: VALID_MEETING.endAt })

    expect(res.status).toBe(400)
    expect(String(res.body.detail)).toContain('title')
  })
})
