import { test, expect } from '@playwright/test'
import { writeFileSync } from 'node:fs'

/**
 * Sync.2 cutscene dump:跑 ts game 开场 cutscene,记录每 tick state-dump,
 * 输出 /tmp/ts-dump.jsonl 用于跟 sdlpal classic build 的 dump 做 line-by-line diff。
 *
 * 不用 skip-intro:走 sdl 同一路径(scene 0 梦境 → loadScene 2 → scene 1 李府 cutscene),
 * Space 推过 dialog 直到稳定 explore mode + 多跑几百 tick。
 */
test('tp-dump sync2 cutscene → /tmp/ts-dump.jsonl', async ({ page }) => {
  await page.goto('/?tp_dump=1')
  await page.waitForSelector('canvas', { timeout: 30_000 })
  await page.waitForFunction(
    () => !!(window as unknown as { __tpDumpBuffer?: string[] }).__tpDumpBuffer,
    { timeout: 10_000 },
  )

  // 等开场梦境 dialog 起来,Space 推进
  await page.waitForTimeout(500)
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Space')
    await page.waitForTimeout(150)
  }
  // 多跑些 tick 让稳定状态落地
  await page.waitForTimeout(2_000)

  const buffer = await page.evaluate(
    () => (window as unknown as { __tpDumpBuffer?: string[] }).__tpDumpBuffer ?? [],
  )
  expect(buffer.length).toBeGreaterThan(50)

  writeFileSync('/tmp/ts-dump.jsonl', buffer.join('\n') + '\n')
  console.log(`[tp-dump] wrote ${buffer.length} frames → /tmp/ts-dump.jsonl`)
})
