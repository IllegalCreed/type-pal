// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-BATTLE-REGISTRY-1（GLM）：BattleSpriteLibrary 注册门与缺失回落的
 * 当前合同。目标源 BattleSpriteLibrary.tsx（锚 355 组件、455 proofReady、577 beginUsage、
 * 702 deleteAsset、1323 BattleSpriteInlinePreview 装载）。
 *
 * 旧断言去重（旧 file/title → 已证合同 → 本组缺口；只测缺口）：
 * - BattleSpriteLibrary.c02-g02（Cursor，10 例）：导入面板全链——取消/失败恢复/同字节复用/
 *   id 后缀派生（boss-enemy→boss-enemy-2）/中文前缀回退/undo 选择回落；不重复。
 * - BattleSpriteLibrary.c02-g01（Cursor，10 例）：外部替换与草稿/证明/消费者快照交错——
 *   证明失效窗口应用禁用（G01-01）、确认窗口竞态 fail-closed（G01-05/06）、会话层 ABI 证明
 *   （G01-07）、外部替换后草稿保留（G01-08）、外部新增消费者使替换面板关闭（G01-04）；不重复。
 * - BattleSpriteLibrary.c02-g04（Cursor，10 例）：删除源文件全链（入口互斥/确认/undo/redo/
 *   引用未就绪禁用/磁盘字节与登记不符拒绝 G04-07/连续删除/两步链/引用阻断）。G04-07 的输入是
 *   「字节存在但解码校验不符」，本组 BR-02 是「字节读取端口整体失败（缺失回落）」——失败层
 *   不同（读取 IO vs 解码校验），读取失败下的预览回落、证明门与删除 fail-closed 形态未证。
 * - BattleSpriteLibrary.c02-g05（Cursor，10 例）：undo 历史链（含 G05-03 新增用途 undo/redo、
 *   G05-10 撤销后 id 复用 base）；本组不重复断言 undo 选择回流，仅保留最小保存门断言。
 * - BattleSpriteLibrary.c02-g07（Cursor，10 例）：G07-09 证「4 帧资产新增玩家用途被帧数门
 *   拒绝」（defaultBattleSpriteProfile 帧数门，锚 battle-sprite-import.ts:36-38）；本组 BR-01
 *   证的是其上层的解码证明门（proofReady，消息「帧源尚未完成解码校验」全旧测 grep 零命中），
 *   门与输入不同。
 * - BattleSpriteLibrary.kimi-workflows（K01）：真实 PNG 导入/替换单帧/追加/删帧/缩帧替换/
 *   拖放；glm-m / glm-ui-wave：计时草稿/改名/删除用途回流；BattleSpriteLibrary.test.tsx：
 *   mock 预览下的深链/筛选/回落；均不重复。
 * - core/battle-sprite-commands.residual.test.ts:74 已直测 AddBattleSpriteCommand 重复 id
 *   抛错（命令层）；UI 层「用途创建草稿遇外部抢注」经核 unreachable（见下），不另立合同。
 *
 * 主动放弃分支（举证）：
 * - UI 层重复 id 抢注竞态（beginUsage 派生 id → 外部 Add 同 id → 应用被拒）unreachable：
 *   宿主一旦回喂 focusObjectId（App/DataMode 真实调用域），任何外部 dispatch 改变
 *   battleSprites 身份都会重触发 BattleSpriteLibrary.tsx:461-478 焦点效果，其尾部
 *   setCreatingUsage(false) 先丢弃创建草稿（同 G01-04 替换面板关闭机制，475-477 三行一体），
 *   应用按钮随之不可达；不喂 focus 的宿主无法打开 A_ENEMY 草稿（点行即上报 focus）。
 *   实测确认：外部抢注后「新用途尚未写入项目」消失、零提交、无重复 id 落库（行为与
 *   G01-04 同族，登记不测）。命令层拒绝由 residual:74 直测。
 * - applyDefinitionDraft 入口的 not-ready 报错（BattleSpriteLibrary.tsx:618）：「应用修改」
 *   按钮 disabled={!proofReady || ...}（1647），UI 不可达；证明门由 BR-01 经 beginUsage 入口证。
 * - BattleSpriteUploader.tsx / EnemyBattleSpriteThumbnail.tsx：C03-G05 ×10 + F04 ×2 已覆盖
 *   上传器全输入域（缺省猜测/网格/整除/取消/色盘迟到与失败/在途/坏文件/重选/onApply 拒绝），
 *   Thumbnail 旧测 ×5 已覆盖可见性门/共享缓存/容量与 revision 键/失败逐出重试/迟到帧防串；
 *   本卡无新增合同，登记不补。
 * - deleteAsset 的 readBytes 拒绝与 decode 拒绝共用同一 catch（BattleSpriteLibrary.tsx:728-730），
 *   G04-07 已证 decode 分支；BR-02 证 readBytes 分支后不再重复 decode 形态。
 *
 * 基建复用 cursor-asset-r1 battle suite（真实 EditSession/EditorAssetReader/InlinePreview/
 * Uploader，不 mock 产品组件）；唯一注入是 FileSource.readBytes 的按路径闸门（宿主磁盘端口，
 * 等价真实 IO 迟到/缺失），不 mock 被测函数。所有等待均包在 act 内，定向运行零 act 警告。
 */
import type { FileSource } from '@type-pal/reforge'
import { act } from 'react'
import { expect, test, vi } from 'vitest'
import {
  type CursorBattleProject,
  enemyProfile,
  loadCursorBattleProject,
} from '../__tests__/cursor-asset-r1/battle-sprite-fixtures.js'
import {
  A_ENEMY,
  A_IDLE,
  applyButton,
  clickButtonByText,
  noticeErrors,
  openTab,
  STANDARD_SPECS,
  setupBattleSuite,
} from '../__tests__/cursor-asset-r1/battle-sprite-ui.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'

const suite = setupBattleSuite()

const GATE_MISSING = 'glm-reg-missing: 磁盘字节缺失'

interface BytesGate {
  source: FileSource
  /** 放行被扣留的读取（迟到 IO 到达）。 */
  release(): void
  /** 让后续读取立即失败（持久缺失）。 */
  fail(reason: Error): void
}

/**
 * 宿主磁盘端口闸门：仅拦截目标路径的 readBytes，其余委托原 source。
 * 等价真实场景中 IO 迟到（挂起）或文件缺失（立即失败）；不触碰产品代码。
 */
function gateBytes(source: FileSource, path: string): BytesGate {
  let mode: 'held' | 'open' | 'reject' = 'held'
  const waiters: Array<{ resolve: () => void; reject: (reason: Error) => void }> = []
  const gated: FileSource = {
    readText: (rel, signal) => source.readText(rel, signal),
    readJson: (rel, signal) => source.readJson(rel, signal),
    urlFor: (rel) => source.urlFor(rel),
    async readBytes(rel, signal) {
      if (rel !== path || mode === 'open') return source.readBytes(rel, signal)
      if (mode === 'reject') throw new Error(GATE_MISSING)
      await new Promise<void>((resolve, reject) => waiters.push({ resolve, reject }))
      return source.readBytes(rel, signal)
    },
    dispose: () => source.dispose?.(),
  }
  return {
    source: gated,
    release() {
      mode = 'open'
      for (const waiter of waiters.splice(0)) waiter.resolve()
    },
    fail(reason: Error) {
      mode = 'reject'
      for (const waiter of waiters.splice(0)) waiter.reject(reason)
    },
  }
}

interface MountedGated {
  project: CursorBattleProject
  gate: BytesGate
  mounted: Awaited<ReturnType<typeof suite.mount>>
}

async function mountGated(
  name: string,
  asset: string,
  options: { view?: 'definition' | 'asset'; focus: string; fail?: boolean },
): Promise<MountedGated> {
  const project = await loadCursorBattleProject(name, STANDARD_SPECS)
  const gate = gateBytes(project.source, project.seeded.get(asset)!.path)
  if (options.fail) gate.fail(new Error(GATE_MISSING))
  const mounted = await suite.mountProject(project, {
    view: options.view ?? 'definition',
    focus: options.focus,
    source: gate.source,
  })
  return { project, gate, mounted }
}

/**
 * act 安全等待：沉睡在 act 域内（异步链的 setState 落在 act 里，退出时统一 flush、
 * 零 act 警告），断言在域外读 DOM/会话。vitest 的 vi.waitFor 不能包进 act —— 它轮询的
 * DOM 文本要等 act 退出才 flush，互相等待死锁（实测 8s 超时不回绑）。
 */
async function waitUntilActSafe(predicate: () => boolean, what: string, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`等待超时: ${what}`)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  }
}

async function waitProofText(
  mounted: Awaited<ReturnType<typeof suite.mount>>,
  frames: number,
  consumers: number,
): Promise<void> {
  const text = `${frames} 帧 · ${consumers} 个用途定义`
  await waitUntilActSafe(
    () => mounted.host.textContent?.includes(text) ?? false,
    `证明文本 ${text}`,
  )
}

async function openEnemyUsageDraft(host: HTMLElement): Promise<void> {
  // beginUsage 被门拒绝时菜单保持打开；重复打开前先探测，避免 toggle 关闭。
  if (!host.querySelector('[aria-label="新增用途类型"]')) {
    await clickButtonByText(host, '新增用途')
  }
  const menu = host.querySelector<HTMLDivElement>('[aria-label="新增用途类型"]')
  expect(menu, '新增用途类型菜单').not.toBeNull()
  const enemyKind = [...menu!.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === '敌人',
  )
  expect(enemyKind, '敌人用途入口').toBeDefined()
  await act(async () => enemyKind!.click())
}

test('BR-01 注册门：解码证明未就绪时新增用途被拒且零提交；证明绑定后同入口入库并过保存门', async () => {
  const { gate, mounted: m } = await mountGated('glm-reg-gate', A_ENEMY, { focus: 'enemy-red' })
  const historyAtMount = m.session.getHistoryVersion()

  // 扣留期：证明未绑定（0 帧），新增用途被门拒绝，不产生草稿、零提交。
  await waitProofText(m, 0, 1)
  await openEnemyUsageDraft(m.host)
  expect(noticeErrors(m.notices).at(-1)).toBe('帧源尚未完成解码校验，请稍后再新增用途。')
  expect(m.host.textContent).not.toContain('新用途尚未写入项目')
  expect(m.session.getHistoryVersion()).toBe(historyAtMount)
  expect(
    m.session.getState().battleSprites.filter((entry) => entry.asset === A_ENEMY),
  ).toHaveLength(1)

  // 放行（迟到 IO 到达）：证明绑定后同一入口可用，草稿按资源标签派生稳定 id。
  gate.release()
  await waitProofText(m, 6, 1)
  await openEnemyUsageDraft(m.host)
  expect(m.host.textContent).toContain('新用途尚未写入项目')
  expect(m.host.textContent).toContain('c02-enemy')

  await act(async () => {
    applyButton(m.host).click()
  })
  await waitUntilActSafe(
    () =>
      m.session.getState().battleSprites.filter((entry) => entry.asset === A_ENEMY).length === 2,
    '新用途入库',
  )
  expect(m.session.getHistoryVersion()).toBe(historyAtMount + 1)
  const added = m.session.getState().battleSprites.find((entry) => entry.id === 'c02-enemy')
  expect(added?.asset).toBe(A_ENEMY)
  expect(added?.profile).toEqual(enemyProfile(2, 0, 4))
  assertProjectSaveValid(m.session.getState())
})

test('BR-02 缺失回落：源字节读取失败时预览报错、用途门拒绝、删除 fail-closed，目录与历史保持', async () => {
  const { mounted: m } = await mountGated('glm-reg-missing', A_IDLE, {
    view: 'asset',
    focus: A_IDLE,
    fail: true,
  })
  const historyAtMount = m.session.getHistoryVersion()

  // 预览以 alert 回落读取失败，证明门关闭（0 帧），目录行仍在。
  await waitUntilActSafe(() => {
    const alert = m.host.querySelector<HTMLElement>('.sprite-resource-load-state.error')
    return (
      alert?.getAttribute('role') === 'alert' &&
      (alert.textContent?.includes(GATE_MISSING) ?? false)
    )
  }, '预览读取失败 alert')
  await waitProofText(m, 0, 0)
  expect(
    [...m.host.querySelectorAll('.sprite-resource-row .ds-catalog-row__meta')].map(
      (node) => node.textContent,
    ),
  ).toContain(A_IDLE)

  // 新增用途入口走同一证明门（asset 视图默认落源文件页签，先切到动作页签）。
  await openTab(m.host, '动作')
  await openEnemyUsageDraft(m.host)
  expect(noticeErrors(m.notices).at(-1)).toBe('帧源尚未完成解码校验，请稍后再新增用途。')

  // 删除源文件：确认后读取失败 fail-closed —— catalog/历史不变，错误通知回落。
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  const deleteButton = [...m.host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === '删除源文件',
  )
  expect(deleteButton, '删除源文件入口').toBeDefined()
  await act(async () => {
    deleteButton!.click()
  })
  expect(confirm).toHaveBeenCalledWith('永久移除未使用帧源“C02闲置”？')
  // settle 信号：删除要么被读取失败挡下（错误通知），要么错误地提交（历史/catalog 变化）；
  // 两种结局都算落定，业务方向由后续断言判定。
  await waitUntilActSafe(
    () =>
      noticeErrors(m.notices).some((message) => message.includes(GATE_MISSING)) ||
      m.session.getHistoryVersion() !== historyAtMount ||
      m.session.getState().assetCatalog.assets[A_IDLE] === undefined,
    '删除闭环落定（fail-closed 通知或提交）',
  )
  expect(m.session.getState().assetCatalog.assets[A_IDLE]).toBeDefined()
  expect(m.session.getHistoryVersion()).toBe(historyAtMount)
  expect(noticeErrors(m.notices).at(-1)).toContain(GATE_MISSING)
  assertProjectSaveValid(m.session.getState())
})
