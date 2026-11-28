// @vitest-environment jsdom
/** Exercise the preview with loaded RLE resources, real painted pixels, and the frame clock. */

import { act } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  assertDistinctFrameColors,
  expectedBattleRgb,
} from '../__tests__/battle-sprite-pixel-oracle.js'
import {
  type BattleSpriteProject,
  DISTINCT_COLOR_PICKS,
  enemyProfile,
  loadBattleSpriteProject,
} from '../__tests__/battle-sprite-project.js'
import {
  colorCensus,
  opaqueBounds,
  pixelAt,
  requireRealCanvas2d,
  uniformOpaque,
} from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import { installBrowserHardwarePorts } from '../__tests__/cursor-asset-r1/image-ports.js'
import {
  controlByLabel,
  fillAndBlur,
  pickCombobox,
  stubNodeTestHost,
} from '../__tests__/cursor-asset-r1/kit.js'
import {
  advance,
  pollUntil,
  releaseIntervalClock,
  useIntervalClock,
} from '../__tests__/cursor-asset-r1/timing.js'
import {
  enemyDef,
  type MountedEnemyAnim,
  mountEnemyAnim,
  unmountEnemyAnim,
} from '../__tests__/enemy-animation-test-host.js'

const MAIN = 'battle-sprite.authored.enemy-preview-main'
const ALT = 'battle-sprite.authored.enemy-preview-alt'
const NOMAGIC = 'battle-sprite.authored.enemy-preview-nomagic'
const ZEROACT = 'battle-sprite.authored.enemy-preview-zeroact'
const SIZED = 'battle-sprite.authored.enemy-preview-sized'

let mounted: MountedEnemyAnim | undefined
let project: BattleSpriteProject

beforeEach(async () => {
  await stubNodeTestHost()
  installBrowserHardwarePorts()
  requireRealCanvas2d()
  useIntervalClock()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  project = await loadBattleSpriteProject('enemy-preview', [
    {
      asset: MAIN,
      label: '主精灵',
      frameCount: 5,
      colorPicks: [0, 1, 2, 3, 4],
      definitions: [{ id: 'enemy-main', label: '敌主', profile: enemyProfile(2, 1, 2) }],
    },
    {
      asset: ALT,
      label: '备用精灵',
      frameCount: 3,
      colorPicks: [5, 6, 7].map((index) => DISTINCT_COLOR_PICKS[index]!),
      definitions: [{ id: 'enemy-alternate', label: '敌副', profile: enemyProfile(1, 1, 1) }],
    },
    {
      asset: NOMAGIC,
      label: '无施法精灵',
      frameCount: 4,
      colorPicks: [1, 2, 3, 4],
      definitions: [{ id: 'enemy-no-magic', label: '无施法', profile: enemyProfile(2, 0, 2) }],
    },
    {
      asset: ZEROACT,
      label: '瞬时动作精灵',
      frameCount: 5,
      colorPicks: [4, 3, 2, 1, 0],
      definitions: [
        { id: 'enemy-instant', label: '零行动', profile: enemyProfile(2, 1, 2, { act: 0 }) },
      ],
    },
    {
      asset: SIZED,
      label: '异尺寸精灵',
      frameCount: 2,
      colorPicks: [0, 1],
      frameSizes: [
        [8, 8],
        [12, 10],
      ],
      definitions: [{ id: 'enemy-variable-size', label: '异尺寸', profile: enemyProfile(2, 0, 0) }],
    },
  ])
  for (const [asset, count] of [
    [MAIN, 5],
    [ALT, 3],
    [NOMAGIC, 4],
    [ZEROACT, 5],
    [SIZED, 2],
  ] as const)
    assertDistinctFrameColors(
      project,
      asset,
      Array.from({ length: count }, (_, index) => index),
    )
})

afterEach(async () => {
  if (mounted) {
    await unmountEnemyAnim(mounted)
    mounted = undefined
  }
  releaseIntervalClock()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function mountFor(definitionId: string, source?: BattleSpriteProject['source']) {
  mounted = await mountEnemyAnim(project, {
    enemy: enemyDef('enemy-under-preview', definitionId),
    source,
  })
  return mounted
}

/** 等到画布出现不透明像素 = 帧已解码并绘制。 */
async function waitDrawn(m: MountedEnemyAnim): Promise<void> {
  await pollUntil(() => opaqueBounds(m.canvas()) !== undefined, '敌人画布出现不透明像素')
}

function canvasRgb(m: MountedEnemyAnim, x = 0, y = 0): [number, number, number] {
  const [r, g, b] = pixelAt(m.canvas(), x, y)
  return [r, g, b]
}

function modeButton(m: MountedEnemyAnim, label: string): HTMLButtonElement {
  const hit = [...m.host.querySelectorAll<HTMLButtonElement>('fieldset.ea-modes button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  expect(hit, `模式按钮 ${label}`).toBeDefined()
  return hit!
}

async function chooseMode(m: MountedEnemyAnim, label: string): Promise<void> {
  await act(async () => modeButton(m, label).click())
}

test('待机首帧：画布 16×16 整面不透明且色值等于夹具第 0 帧的调色板色', async () => {
  const m = await mountFor('enemy-main')
  await waitDrawn(m)
  expect([m.canvas().width, m.canvas().height]).toEqual([16, 16])
  expect(opaqueBounds(m.canvas())).toEqual({ minX: 0, maxX: 15, minY: 0, maxY: 15, count: 256 })
  expect(uniformOpaque(m.canvas(), { minX: 0, maxX: 15, minY: 0, maxY: 15 })).toEqual([
    ...expectedBattleRgb(project, MAIN, 0),
    255,
  ])
  expect(m.host.textContent).toContain('5 帧')
})

test('待机轮转：每 200ms 换到下一帧色并在序列末回到第 0 帧', async () => {
  const m = await mountFor('enemy-main')
  await waitDrawn(m)
  await advance(200)
  expect(canvasRgb(m)).toEqual(expectedBattleRgb(project, MAIN, 1))
  await advance(200)
  expect(canvasRgb(m)).toEqual(expectedBattleRgb(project, MAIN, 0))
  await advance(199)
  expect(canvasRgb(m), '不足一个周期不换帧').toEqual(expectedBattleRgb(project, MAIN, 0))
})

test('攻击模式序列含上一段末帧：2→3→4 逐 40ms 换色后回绕到 2', async () => {
  const m = await mountFor('enemy-main')
  await waitDrawn(m)
  await chooseMode(m, '攻击')
  expect(modeButton(m, '攻击').getAttribute('aria-pressed')).toBe('true')
  expect(modeButton(m, '待机').getAttribute('aria-pressed')).toBe('false')
  const seen: Array<[number, number, number]> = []
  for (let step = 0; step < 4; step++) {
    seen.push(canvasRgb(m))
    await advance(40)
  }
  expect(seen).toEqual([2, 3, 4, 2].map((frame) => expectedBattleRgb(project, MAIN, frame)))
})

test('单帧施法序列：时钟推进后仍恒定显示第 2 帧色', async () => {
  const m = await mountFor('enemy-main')
  await waitDrawn(m)
  await chooseMode(m, '施法')
  for (let step = 0; step < 4; step++) {
    expect(canvasRgb(m)).toEqual(expectedBattleRgb(project, MAIN, 2))
    await advance(40)
  }
  expect(m.host.textContent).not.toContain('该定义无施法帧')
})

test('无施法帧时施法模式退回最后一个待机帧色并提示', async () => {
  const m = await mountFor('enemy-no-magic')
  await waitDrawn(m)
  await chooseMode(m, '施法')
  expect(canvasRgb(m)).toEqual(expectedBattleRgb(project, NOMAGIC, 1))
  await advance(40)
  expect(canvasRgb(m)).toEqual(expectedBattleRgb(project, NOMAGIC, 1))
  expect(m.host.textContent).toContain('（该定义无施法帧）')
})

test('行动速度 0：攻击模式冻结在最后一个攻击帧色且不再轮转', async () => {
  const m = await mountFor('enemy-instant')
  await waitDrawn(m)
  await chooseMode(m, '攻击')
  expect(canvasRgb(m)).toEqual(expectedBattleRgb(project, ZEROACT, 4))
  await advance(400)
  expect(canvasRgb(m)).toEqual(expectedBattleRgb(project, ZEROACT, 4))
  expect(m.host.textContent).toContain('（0 tick：瞬时显示该动作末帧）')
})

test('异尺寸帧：画布取最大帧×2，小帧底部居中，不透明外接盒精确', async () => {
  const m = await mountFor('enemy-variable-size')
  await waitDrawn(m)
  expect([m.canvas().width, m.canvas().height]).toEqual([24, 20])
  expect(opaqueBounds(m.canvas())).toEqual({ minX: 4, maxX: 19, minY: 4, maxY: 19, count: 256 })
  expect(pixelAt(m.canvas(), 3, 10)[3], '小帧左侧留白').toBe(0)
  expect(pixelAt(m.canvas(), 12, 3)[3], '小帧上方留白').toBe(0)
  expect(canvasRgb(m, 12, 12)).toEqual(expectedBattleRgb(project, SIZED, 0))
})

test('大帧换回小帧：先清除再绘制，不残留大帧像素', async () => {
  const m = await mountFor('enemy-variable-size')
  await waitDrawn(m)
  await advance(200)
  expect(opaqueBounds(m.canvas())).toEqual({ minX: 0, maxX: 23, minY: 0, maxY: 19, count: 480 })
  expect(canvasRgb(m, 0, 0)).toEqual(expectedBattleRgb(project, SIZED, 1))
  await advance(200)
  expect(opaqueBounds(m.canvas())).toEqual({ minX: 4, maxX: 19, minY: 4, maxY: 19, count: 256 })
  expect(colorCensus(m.canvas()).opaque.size).toBe(1)
})

test('切换绑定定义：所选动作模式保持，画布改画新定义攻击序列中的色', async () => {
  const m = await mountFor('enemy-main')
  await waitDrawn(m)
  await chooseMode(m, '攻击')
  await advance(40)
  const trigger = m.host.querySelector<HTMLButtonElement>('[aria-label="敌人战斗精灵"]')!
  await pickCombobox(trigger, '敌副')
  await pollUntil(() => m.host.textContent?.includes('3 帧') === true, '新定义帧数标签')
  await pollUntil(() => opaqueBounds(m.canvas()) !== undefined, '新定义首次绘制')
  expect(modeButton(m, '攻击').getAttribute('aria-pressed')).toBe('true')
  const painted = canvasRgb(m)
  const altAttackSequence = [1, 2].map((frame) => expectedBattleRgb(project, ALT, frame))
  expect(altAttackSequence).toContainEqual(painted)
  for (let frame = 0; frame < 5; frame++)
    expect(expectedBattleRgb(project, MAIN, frame), '不得残留旧定义色').not.toEqual(painted)
})

test('撤销待机帧数：改小后画布停轮转，undo 后恢复双帧轮转', async () => {
  const m = await mountFor('enemy-main')
  await waitDrawn(m)
  await fillAndBlur(controlByLabel<HTMLInputElement>(m.host, '待机帧'), '1')
  await pollUntil(() => {
    const profile = m.session
      .getState()
      .battleSprites.find((def) => def.id === 'enemy-main')?.profile
    return profile?.kind === 'enemy' && profile.idle.count === 1
  }, '待机帧数提交为 1')
  await pollUntil(() => opaqueBounds(m.canvas()) !== undefined, '重载后重新绘制')
  for (let step = 0; step < 3; step++) {
    expect(canvasRgb(m)).toEqual(expectedBattleRgb(project, MAIN, 0))
    await advance(200)
  }
  await act(async () => {
    m.session.undo()
  })
  await pollUntil(() => opaqueBounds(m.canvas()) !== undefined, 'undo 后重新绘制')
  const first = canvasRgb(m)
  await advance(200)
  const second = canvasRgb(m)
  expect(new Set([first.join(), second.join()]).size, 'undo 后两帧轮转').toBe(2)
  expect([first, second].sort()).toEqual(
    [0, 1].map((frame) => expectedBattleRgb(project, MAIN, frame)).sort(),
  )
})

test('interval 清理：模式反复切换不泄漏定时器，卸载后归零', async () => {
  const m = await mountFor('enemy-main')
  await waitDrawn(m)
  const baseline = vi.getTimerCount()
  expect(baseline).toBeGreaterThan(0)
  for (const label of ['攻击', '施法', '待机', '攻击']) {
    await chooseMode(m, label)
    expect(vi.getTimerCount(), `切到${label}后`).toBe(baseline)
  }
  await unmountEnemyAnim(m)
  mounted = undefined
  expect(vi.getTimerCount()).toBe(0)
})

test('Y 偏移提交不重载精灵：画布像素与已选攻击模式原样保留，undo 后字段回到 0', async () => {
  const m = await mountFor('enemy-main')
  await waitDrawn(m)
  await chooseMode(m, '攻击')
  await advance(40)
  const before = canvasRgb(m)
  expect(before).toEqual(expectedBattleRgb(project, MAIN, 3))
  const y = controlByLabel<HTMLInputElement>(m.host, 'Y 偏移')
  await fillAndBlur(y, '-12')
  expect(
    m.session.getState().enemies?.find((enemy) => enemy.id === 'enemy-under-preview')?.yPosOffset,
  ).toBe(-12)
  expect(canvasRgb(m), '提交期间不得出现空白闪烁').toEqual(before)
  expect(modeButton(m, '攻击').getAttribute('aria-pressed')).toBe('true')
  await act(async () => {
    m.session.undo()
  })
  expect(controlByLabel<HTMLInputElement>(m.host, 'Y 偏移').value).toBe('0')
  expect(canvasRgb(m)).toEqual(before)
})
