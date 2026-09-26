import { describe, expect, test } from 'vitest'
import { flowOf, preview, settle, target } from './__tests__/playback-canonical-fixtures.js'

describe('Canonical preview effect boundaries', () => {
  test('item labels, default counts and signed money are logs without modifying authored data', async () => {
    const r = preview()
    await r.run([
      { kind: 'giveItem', itemId: 'potion' },
      { kind: 'loseItem', itemId: 'potion', count: 3 },
      { kind: 'giveItem', itemId: 'unknown', count: 2 },
      { kind: 'loseItem', itemId: 'unknown' },
      { kind: 'giveMoney', delta: 8 },
      { kind: 'giveMoney', delta: -9 },
    ])
    expect(r.p.view.logs).toEqual([
      '🎁 得 药草（potion） ×1',
      '📤 失 药草（potion） ×3',
      '🎁 得 未知物品（unknown） ×2',
      '📤 失 未知物品（unknown） ×1',
      '💰 +8 钱',
      '💰 -9 钱',
    ])
  })

  test('audio and ambience log ordered requests instead of performing real playback', async () => {
    const r = preview()
    await r.run([
      { kind: 'playSound', asset: 'sfx.bell' },
      { kind: 'playMusic', asset: 'music.town' },
      { kind: 'stopMusic' },
      { kind: 'setAmbience', ambience: 'night' },
    ])
    expect(r.p.view.logs).toEqual([
      '🔊 音效 sfx.bell',
      '🎵 音乐 music.town',
      '停止音乐',
      '🌗 切氛围 night',
    ])
    expect(r.p.view.fadeBlack).toBe(0)
  })

  test('frame animation optional bounds, rate, video and both shop modes retain request identity', async () => {
    const r = preview()
    await r.run([
      { kind: 'playFrameAnimation', asset: 'anim.intro' },
      {
        kind: 'playFrameAnimation',
        asset: 'anim.outro',
        startFrame: 2,
        endFrame: 5,
        frameRate: 12,
      },
      { kind: 'playVideo', asset: 'video.intro' },
      { kind: 'openShop', shop: 2, mode: 'buy' },
      { kind: 'openShop', shop: 3, mode: 'sell' },
    ])
    expect(r.p.view.logs).toEqual([
      '🎞 帧动画 anim.intro (0..末帧)(编辑器预览桩)',
      '🎞 帧动画 anim.outro (2..5 @ 12fps)(编辑器预览桩)',
      '🎬 过场视频 video.intro(编辑器预览桩)',
      '🏪 商店 #2(买)',
      '🏪 商店 #3(卖)',
    ])
  })

  test('party membership, followers and entity ownership effects remain explicit logs', async () => {
    const r = preview()
    await r.run([
      { kind: 'setParty', members: ['hero', 'friend'] },
      { kind: 'setFollowers', sprites: ['cat', 'dog'] },
      { kind: 'setFollowers', sprites: [] },
      { kind: 'takeEntity', target },
      { kind: 'releaseEntity', target },
      { kind: 'releaseEntity' },
      { kind: 'mountParty', target },
      { kind: 'ride', target, to: { col: 4, row: 6, height: 0 }, speed: 'fast' },
      { kind: 'unmountParty' },
    ])
    expect(r.p.view.logs).toEqual([
      '👥 队伍变更 → hero, friend',
      '👣 编外跟随者 → cat, dog',
      '👣 编外跟随者 → (清空)',
      '🔒 接管 npc',
      '🔓 归还 npc',
      '🔓 归还 (全部)',
      '🛶 挂载队伍 → npc',
      '🛶 骑行 npc → (4,6)',
      '🚶 下载具',
    ])
    expect(r.p.view.entity.size).toBe(0)
  })

  test('camera pan, explicit snap and reset preserve ordered coordinate diagnostics', async () => {
    const r = preview()
    await r.run([
      { kind: 'cameraPan', dx: 3, dy: -4, frames: 5 },
      { kind: 'cameraSnap', to: { col: 2, row: 7, height: 1 } },
      { kind: 'cameraSnap' },
    ])
    expect(r.p.view.logs).toEqual(['🎥 镜头平移 (3,-4)×5', '🎥 镜头定位 (2,7)', '🎥 镜头回正'])
  })

  test('member facing preserves leader gesture; leader default clears it and nudge clears the next gesture', async () => {
    const r = preview(),
      p = r.p
    await r.start(
      flowOf([
        { kind: 'setPartyFacing', facing: 'left', gesture: 3 },
        { kind: 'setPartyFacing', facing: 'up', gesture: 8, member: 1 },
        { kind: 'wait', ms: 10 },
        { kind: 'setPartyFacing', facing: 'right' },
        { kind: 'wait', ms: 10 },
        { kind: 'setPartyFacing', facing: 'down', gesture: 4 },
        { kind: 'nudgeParty', dx: 16, dy: 8 },
      ]),
    )
    expect(p.view.player.gesture).toBe(3)
    expect(p.view.player.facing).toBe('up')
    p.tick(10)
    await settle()
    expect(p.view.player.gesture).toBeNull()
    p.tick(10)
    await settle()
    expect(p.view.player).toEqual({
      pos: { col: 1, row: 0, height: 2 },
      facing: 'down',
      gesture: null,
      spriteId: null,
    })
    expect(p.mode).toBe('done')
    r.unchanged()
  })

  test('teleport without facing retains facing and actor sprite swap only changes preview', async () => {
    const r = preview(),
      p = r.p
    await r.run([
      { kind: 'setPartyFacing', facing: 'up' },
      { kind: 'teleportParty', pos: { col: 6, row: 9, height: 3 } },
      { kind: 'setActorSprite', actor: 'hero', sprite: 'hero.night' },
    ])
    expect(p.view.player).toEqual({
      pos: { col: 6, row: 9, height: 3 },
      facing: 'up',
      gesture: null,
      spriteId: 'hero.night',
    })
    expect(p.view.logs).toEqual(['🎭 hero 换精灵 hero.night'])
  })

  test('battle stub takes victory not lose/flee, while teleport stub really executes onFail', async () => {
    const r = preview()
    await r.run([
      {
        kind: 'startBattle',
        enemyTeamId: 'team.preview',
        auto: true,
        boss: true,
        fieldId: 0,
        music: null,
        onLose: [{ kind: 'giveMoney', delta: -99 }],
        onFlee: [{ kind: 'giveMoney', delta: -88 }],
      },
      { kind: 'teleportOut', onFail: [{ kind: 'giveMoney', delta: -1 }] },
      { kind: 'giveMoney', delta: 2 },
    ])
    expect(r.p.view.logs).toEqual([
      '⚔ 战斗 敌队 team.preview → 按胜利继续',
      '🌀 传送出口(引路蜂)→ 编辑器预览按「不灵」',
      '💰 -1 钱',
      '💰 +2 钱',
    ])
  })

  test('self chase waits a real preview interval and save/game-over are diagnostics only', async () => {
    const r = preview(),
      p = r.p
    await r.start(
      flowOf([{ kind: 'chasePlayer' }, { kind: 'loadLastSave' }, { kind: 'gameOver' }]),
      { self: target },
    )
    expect(p.view.logs).toEqual(['👣 npc 追逐玩家一步'])
    p.tick(159)
    await settle()
    expect(p.view.logs).toHaveLength(1)
    p.tick(1)
    await settle()
    expect(p.view.logs).toEqual([
      '👣 npc 追逐玩家一步',
      '📂 读最近存档(预览不执行)',
      '💀 战败流程:渐红 + 文案 + 读档(预览不执行)',
    ])
    expect(p.mode).toBe('done')
    r.unchanged()
  })
})
