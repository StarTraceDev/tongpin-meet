/**
 * 开发种子数据：1 超管 + 3 部门 + 3 用户 + 2 会议（06 §M2 / 07 §11.4）。
 * 幂等：固定 ID + upsert，重复执行不会产生重复行。
 */
import { existsSync } from 'node:fs'

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../libs/infra/src/generated/prisma/client'
import { PERMISSIONS } from '@tongpin/shared/constants'
import argon2 from 'argon2'

if (existsSync('.env')) process.loadEnvFile()

const connectionString = process.env.DATABASE_URL
if (!connectionString)
  throw new Error('缺少 DATABASE_URL，先复制 server/.env.example 为 server/.env')

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

const DEPARTMENTS = [
  { id: 'seed_dept_tech', name: '产品技术部', sort: 1 },
  { id: 'seed_dept_market', name: '市场运营部', sort: 2 },
  { id: 'seed_dept_hr', name: '人力行政部', sort: 3 },
] as const

const USERS = [
  {
    id: 'seed_user_admin',
    phone: '13800000000',
    name: '系统管理员',
    password: 'admin123',
    deptId: 'seed_dept_tech',
    role: 'SUPER_ADMIN',
  },
  {
    id: 'seed_user_zhang',
    phone: '13800000001',
    name: '张三',
    password: 'user123',
    deptId: 'seed_dept_tech',
    role: 'MEMBER',
  },
  {
    id: 'seed_user_li',
    phone: '13800000002',
    name: '李四',
    password: 'user123',
    deptId: 'seed_dept_market',
    role: 'MEMBER',
  },
] as const

const MEETINGS = [
  {
    id: 'seed_meeting_weekly',
    meetingNo: '100000001',
    title: '产品周会',
    startAt: nextWorkday(10),
    endAt: nextWorkday(11),
    hostId: 'seed_user_admin',
    roomName: 'lk_seed_weekly',
  },
  {
    id: 'seed_meeting_review',
    meetingNo: '100000002',
    title: '季度复盘',
    startAt: daysFromNow(7, 14),
    endAt: daysFromNow(7, 16),
    hostId: 'seed_user_admin',
    roomName: 'lk_seed_review',
  },
] as const

function daysFromNow(days: number, hour: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, 0, 0, 0)
  return d
}

function nextWorkday(hour: number): Date {
  const d = daysFromNow(1, hour)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
  return d
}

async function main(): Promise<void> {
  for (const dept of DEPARTMENTS) {
    await prisma.dept.upsert({
      where: { id: dept.id },
      update: { name: dept.name, sort: dept.sort },
      create: dept,
    })
  }

  await prisma.role.upsert({
    where: { code: 'SUPER_ADMIN' },
    update: { name: '超级管理员', permissions: [...PERMISSIONS], builtin: true },
    create: {
      code: 'SUPER_ADMIN',
      name: '超级管理员',
      permissions: [...PERMISSIONS],
      builtin: true,
    },
  })
  await prisma.role.upsert({
    where: { code: 'MEMBER' },
    update: { name: '普通员工', permissions: ['meeting:read', 'meeting:export'], builtin: true },
    create: {
      code: 'MEMBER',
      name: '普通员工',
      permissions: ['meeting:read', 'meeting:export'],
      builtin: true,
    },
  })

  const roles = await prisma.role.findMany({ where: { code: { in: ['SUPER_ADMIN', 'MEMBER'] } } })
  const roleId = (code: string): string => {
    const role = roles.find((r) => r.code === code)
    if (!role) throw new Error(`角色 ${code} 不存在`)
    return role.id
  }

  for (const user of USERS) {
    const passwordHash = await argon2.hash(user.password, { type: argon2.argon2id })
    await prisma.user.upsert({
      where: { phone: user.phone },
      update: { name: user.name, deptId: user.deptId, passwordHash, status: 'ACTIVE' },
      create: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        deptId: user.deptId,
        passwordHash,
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roleId(user.role) } },
      update: {},
      create: { userId: user.id, roleId: roleId(user.role) },
    })
  }

  const hostKeyHash = await argon2.hash('123456', { type: argon2.argon2id })
  for (const meeting of MEETINGS) {
    const settings = { muteOnJoin: true, watermark: false, allowGuest: false, autoRecord: false }
    await prisma.meeting.upsert({
      where: { meetingNo: meeting.meetingNo },
      update: { title: meeting.title, startAt: meeting.startAt, endAt: meeting.endAt },
      create: {
        id: meeting.id,
        meetingNo: meeting.meetingNo,
        title: meeting.title,
        hostId: meeting.hostId,
        roomName: meeting.roomName,
        status: 'SCHEDULED',
        startAt: meeting.startAt,
        endAt: meeting.endAt,
        settings,
        hostKey: hostKeyHash,
      },
    })
    const members = [
      { userId: 'seed_user_admin', role: 'HOST' },
      { userId: 'seed_user_zhang', role: 'ATTENDEE' },
      { userId: 'seed_user_li', role: 'ATTENDEE' },
    ] as const
    for (const member of members) {
      await prisma.meetingParticipant.upsert({
        where: { meetingId_userId: { meetingId: meeting.id, userId: member.userId } },
        update: { role: member.role },
        create: {
          meetingId: meeting.id,
          userId: member.userId,
          role: member.role,
          mediaState: { audioOn: true, videoOn: true, screenSharing: false },
        },
      })
    }
  }

  const [users, meetings, depts] = await Promise.all([
    prisma.user.count(),
    prisma.meeting.count(),
    prisma.dept.count(),
  ])
  console.log(
    `seed 完成：users=${users} meetings=${meetings} depts=${depts}（hostKey=123456，仅开发环境）`,
  )
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
