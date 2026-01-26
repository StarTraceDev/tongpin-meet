import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

/**
 * UI 级冒烟（PROGRESS §5 #27 的未排期缺口）：
 * 真浏览器登录 → 首页列表 → 入会 → 发起签到 → 结束会议 → 结束页。
 * 建会仍走 API，因为 Web 端没有建会表单（M14 只补了通讯录/录制/设置）。
 */
const API = '/api/v1'
const HOST = { phone: '13800000000', password: 'admin123' }

interface Session {
  tokens: { accessToken: string }
}

interface Meeting {
  id: string
  title: string
}

async function login(request: APIRequestContext): Promise<Session> {
  const response = await request.post(`${API}/auth/sessions:password`, { data: HOST })
  expect(response.ok(), `登录失败：${response.status()}`).toBe(true)
  return (await response.json()) as Session
}

test('登录 → 首页 → 入会 → 签到 → 结束', async ({ page, request }) => {
  const host = await login(request)
  const auth = { authorization: `Bearer ${host.tokens.accessToken}` }
  const start = new Date(Date.now() + 2 * 60_000)
  const end = new Date(start.getTime() + 30 * 60_000)
  const title = `UI 冒烟 ${Date.now()}`

  const created = await request.post(`${API}/meetings`, {
    headers: auth,
    data: { title, startAt: start.toISOString(), endAt: end.toISOString() },
  })
  expect(created.status(), '建会失败').toBe(201)
  const meeting = (await created.json()) as Meeting

  try {
    await page.goto('/login')
    await page.getByPlaceholder('11 位手机号').first().fill(HOST.phone)
    await page.locator('input[type="password"]').fill(HOST.password)
    await page.locator('.submit').first().click()

    const row = page.locator('.meeting-row').filter({ hasText: title })
    await expect(row).toBeVisible()
    await row.click()

    await expect(page.locator('.room-top')).toBeVisible()
    await page.locator('.tool').filter({ hasText: '更多' }).click()
    await page.locator('.more-item').filter({ hasText: '签到' }).click()
    await expect(page.locator('.side-panel')).toBeVisible()
    await page.locator('.sub-primary').filter({ hasText: '立即发起' }).click()
    await expect(page.locator('.checkin-ring-wrap')).toBeVisible()

    await page.locator('.tool.danger').click()
    await expect(page.locator('.leave-pop')).toBeVisible()
    await page.locator('.leave-all').click()

    await expect(page).toHaveURL(new RegExp(`/meetings/${meeting.id}/ended`))
    await expect(page.locator('.header')).toContainText('会议结束')
  } finally {
    // 用例失败时也别把会议留在进行中，避免污染后续冒烟
    await request.post(`${API}/meetings/${meeting.id}:end`, { headers: auth })
  }
})
