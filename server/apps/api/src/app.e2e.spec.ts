import { type INestApplication, Body, Controller, Module, Post } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'

import { configureApp } from '../../../libs/common/src/bootstrap'
import { AppModule } from './app.module'

/** 只在测试里用的回显接口，用来验证全局 ZodValidationPipe 真的接上了 */
class EchoDto {
  static readonly schema = z.object({ name: z.string().min(1) })
}

@Controller('_echo')
class EchoController {
  @Post()
  echo(@Body() body: EchoDto): EchoDto {
    return body
  }
}

@Module({ controllers: [EchoController] })
class EchoModule {}

describe('api 进程', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule, EchoModule] }).compile()
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
    const res = await request(app.getHttpServer()).get('/api/v1/meetings/nope')

    expect(res.status).toBe(404)
    expect(res.headers['content-type']).toContain('application/problem+json')
    expect(res.headers['x-request-id']).toBeTruthy()
    expect(res.body).toMatchObject({
      status: 404,
      code: 10000,
      instance: '/api/v1/meetings/nope',
    })
  })

  it('全局管道拦住非法入参：400 / 10001，且 detail 指出字段', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/_echo').send({ name: '' })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ status: 400, code: 10001 })
    expect(String(res.body.detail)).toContain('name')
  })

  it('合法入参被 schema 解析，多余字段被剔除', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/_echo')
      .send({ name: '周会', extra: 'stripped' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ name: '周会' })
  })
})
