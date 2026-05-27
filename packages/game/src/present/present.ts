import type { Palette, Tilemap } from '@type-pal/shared'
import type { IndexedImage } from '../assets/png.js'
import type { BusEntry } from '../core/command-bus.js'
import type { GameState } from '../core/game-state.js'
import type { BattlePresent, BattleAssets } from './battle/present-battle.js'
import { type Framebuffer, SCREEN_W, SCREEN_H } from './framebuffer.js'
import { drawTilemap, addCoverTileEntries, type TileImages, type DrawEntry } from './draw-tilemap.js'
import { drawSprite, type SpriteImage } from './draw-sprite.js'
import { drawDialogBox, type DialogBoxDrawCtx } from './dialog-box.js'
import { drawMenuStack } from './menu/draw-menu.js'
import type { BattleBgAsset } from './battle/draw-battle-bg.js'
import type { GlyphTable } from './font.js'

export interface PresentContext {
  tilemap: Tilemap
  tileImages: TileImages
  /** 队长 sprite 全帧。sdlpal `scene.c:750-755` 站立公式 `wFrame = wDirection * walkFrames`;
   *  WIN95 party sprite 默认 12 帧 = 4 方向 × 3 帧。本字段为完整 frame 数组,
   *  presentFrame 按 `gs.party.facing` + walkFrames 取站立帧。 */
  partyFrames: SpriteImage[]
  /** sdlpal `PlayerRoles.rgwWalkFrames[role]`,默认 3(scene.c:752 `if (i == 0) i = 3`)。 */
  partyWalkFrames: number
  npcSprites: Map<number, SpriteImage>
  /**
   * M5 Sync.2 fix3 pose:NPC 全帧映射(sprite id → 全 frames[])。
   * opcode 0x0014/0x0016/0x000F 设的 `npc.scriptedFrame` 用这个取真帧。
   * 缺省 / 没设 scriptedFrame 时 fallback 到 npcSprites(frame 0)。
   */
  npcSpriteFrames?: Map<number, SpriteImage[]>
  /** M4 P4.T3: Unifont glyph table(启动时 loadGlyphs 注入,缺省则所有文字渲染为 tofu)。 */
  glyphs?: GlyphTable
  /** M5 Sync.2: 对话框资产(portrait + key icon sprite map);bootstrap 注入。 */
  dialogAssets?: DialogBoxDrawCtx
  /** M5.6 W0.d:SPRITEUI 71 frame(menu box 9-slice 用前 18 个) */
  uiSpriteFrames?: IndexedImage[]
  /**
   * M5.6 T17:OpeningMenu 全屏背景(sdlpal `MAINMENU_BACKGROUND_FBPNUM = 2` WIN95 真值)。
   * 数据源 = FBP.MKF chunk 2 → M4 P2.T4 已 dump 到 images/battle/bg/002.png。
   * loadAll 通过 battleBgs.get(2) 拿到;bootstrap 注入此字段。
   */
  openingMenuBg?: BattleBgAsset
  /**
   * M5.6 T10b:BALL.MKF 物品图标(audit 第 1 漏洞已修)— 251 chunk → IndexedImage map。
   * key = chunkIndex(对应 OBJECT.item.wBitmap)。InventoryMenu fullscreen UI / Equip /
   * 商店 / addItem dialog 渲染时取。
   */
  itemIcons?: Map<number, IndexedImage>
}

/** sdlpal `palcommon.h`:kDirSouth=0 / kDirWest=1 / kDirNorth=2 / kDirEast=3。 */
const FACING_TO_DIRECTION: Record<'down' | 'left' | 'up' | 'right', number> = {
  down: 0, left: 1, up: 2, right: 3,
}

/**
 * M5 P0.0 System A:1 OUR unit = 1 sdlpal pixel(无缩放)。
 * sdlpal scene.c PAL_SceneDrawSprites 真值:screen = world - viewport。
 * gs.camera 语义 = sdlpal viewport(屏幕左上 world 坐标);
 * party world = viewport + partyoffset(160, 112),partyoffset 常量定义在 game-state.ts。
 */
function pixelToScreen(
  pos: { x: number; y: number },
  camera: { x: number; y: number },
): { sx: number; sy: number } {
  return {
    sx: pos.x - camera.x,
    sy: pos.y - camera.y,
  }
}

export function presentFrame(
  fb: Framebuffer,
  gs: GameState,
  ctx: PresentContext,
): void {
  // M5.6 T18:全屏 modal 播放期间(AVI / RNG / splash)暂停 canvas render,
  // DOM <video> overlay 或自管渲染层接管视觉。
  if (gs.suspendRaf) {
    return
  }

  // sdlpal `fEnteringScene = TRUE` 真值:`PAL_StartFrame` 早期 return,不调 PAL_MakeScene →
  // 屏幕冻结。我们 port:跳过整个 render,fb 保留上一帧 = 旧 scene + dialog 像素。
  // fadeScreen 启动时清 fEnteringScene → 渲染 + backupPixels 拷冻结画面 → 渐变。
  if (gs.fEnteringScene) {
    return
  }

  // sdlpal video.c:VIDEO_BackupScreen 真值:opcode 0x73 触发那一瞬间,把当前屏幕快照存到 gpScreenBak。
  // 在 fadeState 第一次出现的那帧(backupPixels 还没拷),从上一帧 fb.indices 拷一份(fb 没被
  // clear 前还留着上一帧的像素)→ fadeState.backupPixels。
  // 用于后续 fade 帧用 sdlpal 真 rgIndex stride-6 dither pattern blend 主角"在两个 buffer 都画"
  // 故全程可见(不会被纯黑 overlay 盖住)。
  if (gs.fadeState && !gs.fadeState.backupPixels) {
    gs.fadeState.backupPixels = new Uint8Array(fb.indices)
  }

  fb.clear()

  // sdlpal `PAL_MakeScene` (scene.c:480-491) 真实流程:
  //   1a. PAL_MapBlitToSurface(layer 0)— 底层全画
  //   1b. PAL_MapBlitToSurface(layer 1)— **顶层也全画**(cover tile 候选)
  //   2.  PAL_SceneDrawSprites():Y-sort sprites + cover tile entries(重画 layer-1 tile 盖 sprite)
  //
  // P0.b 第一版误以为"layer 1 只在 cover tile 触发时画" — 实际是**两层都全画 + cover tile 重画**。
  // 全画保证物体(椅子/桌子/柱子)无论 sprite 接近与否都完整可见;cover tile 重画用 Y-sort
  // 让 "高 y 的 tile 盖低 y 的 sprite" 真生效(屋顶/柱子顶盖住 sprite 头部)。

  // 1. tilemap layer 0(底层 — 地砖、墙基)
  drawTilemap(fb, ctx.tilemap, ctx.tileImages, gs.camera, 0)

  // 2. tilemap layer 1(顶层 — 桌子 / 椅子 / 柱子 / 屋顶 / 门 — sdlpal scene.c:481 全画)
  drawTilemap(fb, ctx.tilemap, ctx.tileImages, gs.camera, 1)

  // 3. 收集所有精灵 entries(party + NPCs),Y-sort 后逐一绘制。
  //    同时计算每个精灵的 cover tiles(sdlpal PAL_CalcCoverTiles port),
  //    cover tile 是**重画**已被全画过一次的 layer-1 tile,Y-sort 让重画位置
  //    跟 sprite 正确叠加(高 y 的 cover tile 排后 → 重画时盖 sprite)。
  //    参考 sdlpal scene.c:181-362 PAL_SceneDrawSprites。
  const entries: DrawEntry[] = []

  // --- party ---
  const { sx: partySX, sy: partySY } = pixelToScreen(gs.party, gs.camera)
  const direction = FACING_TO_DIRECTION[gs.party.facing]
  const walkFrames = ctx.partyWalkFrames
  let frameIdx: number
  // sdlpal 真值优先级:walking=true(PAL_UpdatePartyGestures(TRUE) scene.c:678-685)
  // 直接覆写 rgParty[0].wFrame,无视任何之前的 scripted pose。
  // walking=false 时,opcode 0x15 setPartyDirectionAndFrame 写的 partyScriptedFrame[0] 生效
  // (剧情固定姿势 — 捂头/倒地等);再 fallback 站立帧 direction*walkFrames。
  if (gs.walkingFrame.walking) {
    if (walkFrames === 4) {
      frameIdx = direction * 4 + gs.walkingFrame.stepFrame
    } else {
      const iStepFrameLeader = [0, 1, 0, 2][gs.walkingFrame.stepFrame] ?? 0
      frameIdx = direction * walkFrames + iStepFrameLeader
    }
  } else {
    const partyLeaderScriptedFrame = gs.partyScriptedFrame[0]
    if (partyLeaderScriptedFrame !== undefined) {
      frameIdx = partyLeaderScriptedFrame
    } else {
      // 站立帧:dir * walkFrames(sdlpal scene.c:750-755)
      frameIdx = direction * walkFrames
    }
  }
  // Sync.2 fix4:若 gs.partyLeaderSpriteId 设(由 opcode 0x65 setPlayerSprite 写入)→
  //              切换到对应 sprite group(从 ctx.npcSpriteFrames 取);否则用 ctx.partyFrames(bootstrap 默认)。
  // 用于剧情切换主角 pose sprite group(捂头 / 倒地 / 大侠 等)。
  let activePartyFrames: SpriteImage[] = ctx.partyFrames
  if (gs.partyLeaderSpriteId !== undefined && ctx.npcSpriteFrames) {
    const overrideFrames = ctx.npcSpriteFrames.get(gs.partyLeaderSpriteId)
    if (overrideFrames && overrideFrames.length > 0) {
      activePartyFrames = overrideFrames
    }
  }
  const partyFrame = activePartyFrames[frameIdx] ?? activePartyFrames[0]
  if (partyFrame) {
    // sdlpal scene.c:224-226:party pos.y = party.y - viewport.y + wLayer + 10,iLayer = wLayer + 6
    // wLayer=0 → pos.y = party.y - viewport.y + 10,iLayer = 6。
    // sort key = pos.y = world.y + 10(viewport 相消)。
    // blit_y = pos.y - height - iLayer = world.y + 10 - height - 6 = world.y + 4 - height。
    // 我们 drawSprite(fb, frame, cx, cy) 会在 cy - anchorY 处画顶边。
    // 原版 blit 用 top-left;我们用 anchor 中心底部 → 等价。
    const capturedFrame = partyFrame
    const capturedSX = partySX
    const capturedSY = partySY
    entries.push({
      // sdlpal party sort key: world.y + 10(wLayer=0)
      baseY: gs.party.y + 10,
      draw: (f) => drawSprite(f, capturedFrame, capturedSX, capturedSY),
      id: 'party',
    })
    // cover tiles for party
    // sdlpal scene.c:226 真值:iLayer = wLayer + 6(party 默认 wLayer=0 → iLayer=6)
    addCoverTileEntries(
      entries,
      ctx.tilemap,
      ctx.tileImages,
      gs.party.x,
      gs.party.y + 10,        // sy = party.y + 10,与 party sort key 一致
      capturedFrame.width,
      capturedFrame.height,
      gs.camera,
      'party',
      6,                       // iLayer(party 默认 wLayer=0 → 6;runtime gs.wLayer 待补)
    )
  }

  // --- followers (partyMembers[1..]) ---
  // sdlpal scene.c:692-707 PAL_UpdatePartyGestures follower 部分:
  //   第 1 个 follower(partyMembers[1])占 trail[1] 位 + 偏移:
  //     isWS = (dir == West || dir == South) → left / down
  //     isWN = (dir == West || dir == North) → left / up
  //     offsetX = isWS ? 16 : -16
  //     offsetY = isWN ? 8 : -8
  //
  // M5 简版:只做 partyMembers[1],使用 partyFrames(主角占位 sprite)。
  // partyMembers[2] 后续留 M5+(需 ctx.partyMemberSprites 多角色 map)。
  if (gs.partyMembers.length > 1 && gs.trail.length > 1) {
    const t = gs.trail[1]!
    // sdlpal scene.c:692-707 offset 公式
    const isWS = t.dir === 'left' || t.dir === 'down'   // West || South
    const isWN = t.dir === 'left' || t.dir === 'up'     // West || North
    const offX = isWS ? 16 : -16
    const offY = isWN ? 8 : -8
    const followerWorldX = t.x + offX
    const followerWorldY = t.y + offY
    const { sx: followerSX, sy: followerSY } = pixelToScreen(
      { x: followerWorldX, y: followerWorldY },
      gs.camera,
    )
    // follower frame: dir 用 trail[1].dir(M5 简版;sdlpal 真值用 trail[2].dir)
    const followerDir = FACING_TO_DIRECTION[t.dir]
    let followerFrameIdx: number
    if (gs.walkingFrame.walking) {
      if (walkFrames === 4) {
        followerFrameIdx = followerDir * 4 + gs.walkingFrame.stepFrame
      } else {
        const iStepFrameFollower = [0, 1, 0, 2][gs.walkingFrame.stepFrame] ?? 0
        followerFrameIdx = followerDir * walkFrames + iStepFrameFollower
      }
    } else {
      followerFrameIdx = followerDir * walkFrames
    }
    const followerFrame = ctx.partyFrames[followerFrameIdx] ?? ctx.partyFrames[0]
    if (followerFrame) {
      const capturedFrame = followerFrame
      const capturedSX = followerSX
      const capturedSY = followerSY
      entries.push({
        baseY: followerWorldY + 10,
        draw: (f) => drawSprite(f, capturedFrame, capturedSX, capturedSY),
        id: 'party-member-1',
      })
      addCoverTileEntries(
        entries,
        ctx.tilemap,
        ctx.tileImages,
        followerWorldX,
        followerWorldY + 10,
        capturedFrame.width,
        capturedFrame.height,
        gs.camera,
        'party-member-1',
        6,                     // follower iLayer 同 party = 6
      )
    }
  }

  // --- NPCs ---
  for (const npc of gs.npcs) {
    // Sync.2 fix4 + fix10:sdlpal scene.c PAL_ApplyWave hide check —
    //   sState == kObjStateHidden(=0)或 sState < 0 都隐(scene 1 cutscene 后
    //   setSceneObjectState[12,0,0] 把 npc id=11 sprite 628 拿锅李大娘隐起来,让 sprite 55 走的李大娘 take over)。
    //   注:bootstrap 把 npc.sState 从 eo.state 真值初始化为 1(kObjStateNormal),所以默认 sState=1 显示。
    if (npc.sState !== undefined && npc.sState <= 0) continue
    // port sdlpal scene.c:262-280 真值 NPC 帧渲染:
    //   iFrame = wCurrentFrameNum (= scriptedFrame, 0..3 cycle)
    //   if (nSpriteFrames == 3):  // 标准 walking NPC,每方向 3 帧
    //     iFrame = (iFrame == 2 ? 0 : iFrame == 3 ? 2 : iFrame)
    //   spriteIdx = wDirection * nSpriteFrames + iFrame
    //
    // 帧映射 0→0, 1→1, 2→0, 3→2 — cycle 视觉 stand-foot1-stand-foot2 自然走路。
    // 之前 bug:直接 `frames[scriptedFrame]`,frame=3 时索引到 `frames[3]` = 下一方向
    // 的 stand 帧 → 视觉看像"转身"。
    //
    // nSpriteFrames 推断:frames.length / 4(4 方向):12→3 walking, 4→1 single-pose, 1→0 static
    let sprite: SpriteImage | undefined
    if (npc.scriptedFrame !== undefined && ctx.npcSpriteFrames) {
      const frames = ctx.npcSpriteFrames.get(npc.spriteNum)
      if (frames && frames.length > 0) {
        const dir = npc.facing ? FACING_TO_DIRECTION[npc.facing] : 0
        const nSpriteFrames = frames.length === 1 ? 0
          : (frames.length % 4 === 0 ? frames.length / 4 : 1)
        let iFrame = npc.scriptedFrame
        // sdlpal scene.c:268-276 真值 nSpriteFrames==3 时 2/3 重映射
        if (nSpriteFrames === 3) {
          if (iFrame === 2) iFrame = 0
          else if (iFrame === 3) iFrame = 2
        }
        const idx = dir * nSpriteFrames + iFrame
        sprite = frames[idx] ?? frames[0]
      }
    }
    if (!sprite) {
      sprite = ctx.npcSprites.get(npc.spriteNum)
    }
    if (!sprite) continue
    const { sx, sy } = pixelToScreen(npc, gs.camera)
    // sdlpal scene.c:301-316 真值(sLayer 来自 EVENTOBJECT,signed i16):
    //   pos.y  = eo.y - vp.y + sLayer*8 + 9     (sort key)
    //   iLayer = sLayer*8 + 2
    //   blit_y = pos.y - height - iLayer
    //          = eo.y - vp.y + 7 - height       (sLayer*8 项相消)
    // → blit anchor (cy) = npc.y - vp.y + 7;screen sy = npc.y - vp.y + SCREEN_CENTER_Y,
    //   故 drawSprite cy = sy + 7(sLayer 不进 blit,只进 sort key 和 cover sy)。
    const sLayer = npc.sLayer ?? 0
    const sortY = npc.y + sLayer * 8 + 9
    const iLayer = sLayer * 8 + 2
    const capturedSprite = sprite
    const capturedSX = sx
    const capturedSY = sy
    const capturedNpcId = npc.id
    entries.push({
      baseY: sortY,
      draw: (f) => drawSprite(f, capturedSprite, capturedSX, capturedSY + 7),
      id: `npc-${capturedNpcId}`,
    })
    // cover tiles for NPC — sy 与 iLayer 都用 sLayer 计算
    addCoverTileEntries(
      entries,
      ctx.tilemap,
      ctx.tileImages,
      npc.x,
      sortY,
      capturedSprite.width,
      capturedSprite.height,
      gs.camera,
      `npc-${capturedNpcId}`,
      iLayer,
    )
  }

  // 4. Y-sort(sdlpal scene.c:327-348 bubble sort;我们用 stable Array.sort)。
  //    sort key = baseY 升序。同 baseY 时保稳定顺序(入数组先后)。
  entries.sort((a, b) => a.baseY - b.baseY)

  // 5. 按排序后顺序绘制所有精灵 + cover tile。
  for (const e of entries) e.draw(fb)

  // 6. 对话框(最上层)
  if (gs.dialogBox) {
    drawDialogBox(fb, gs.dialogBox, ctx.glyphs, {
      ...ctx.dialogAssets,
      uiSpriteFrames: ctx.uiSpriteFrames,
    })
  }

  // 7. fadeState — port sdlpal video.c:1130-1280 VIDEO_FadeScreen 真值 **per-frame 1 step**。
  //
  //    sdlpal 算法 72 帧(12 outer × 6 inner):
  //    ```c
  //    for (i = 0; i < 12; i++)
  //      for (j = 0; j < 6; j++)
  //        for (k = rgIndex[j]; k < total; k += 6) {
  //          a = current[k]; b = backupCur[k];
  //          if (i > 0) {
  //            if ((a & 0x0F) > (b & 0x0F)) b++;
  //            else if ((a & 0x0F) < (b & 0x0F)) b--;
  //          }
  //          backupCur[k] = (a & 0xF0) | (b & 0x0F);
  //        }
  //        display backupCur
  //    ```
  //
  //    每帧只跑 1 个 (i, j) step,所以 72 帧每帧都视觉不同(=真平滑)。
  //    backupPixels 在 fadeState 启动时快照,然后每帧被 mutate(累积逼近 current)。
  //
  //    **关键**:主角 sprite 在 backup(旧场景)和 current(新场景)都画过,所以 fade 全程主角可见
  //    (palette nibble 渐变,不会突然消失)。
  if (gs.fadeState && gs.fadeState.backupPixels) {
    const { totalMs, startTimeMs, appliedSteps, backupPixels } = gs.fadeState
    const current = fb.indices as Uint8Array
    const rgIndex = [0, 3, 1, 5, 2, 4] as const
    const TOTAL_STEPS = 72  // sdlpal video.c:1178 真值 12 outer × 6 inner

    // time-based:elapsedMs / totalMs * 72 = target step。raf 慢就一帧多跑几步追上。
    const elapsedMs = performance.now() - startTimeMs
    const progress = Math.min(elapsedMs / totalMs, 1)
    const targetSteps = Math.floor(progress * TOTAL_STEPS)

    for (let stepIdx = appliedSteps; stepIdx < targetSteps; stepIdx++) {
      const outerI = Math.floor(stepIdx / 6)
      const innerJ = stepIdx % 6
      const phaseOffset = rgIndex[innerJ]!
      for (let k = phaseOffset; k < current.length; k += 6) {
        const a = current[k]!
        let b = backupPixels[k]!
        if (outerI > 0) {
          const aLow = a & 0x0F
          const bLow = b & 0x0F
          if (aLow > bLow) b++
          else if (aLow < bLow) b--
        }
        backupPixels[k] = ((a & 0xF0) | (b & 0x0F)) & 0xFF
      }
    }
    gs.fadeState.appliedSteps = targetSteps

    // 显示 backupPixels(累积态)— 不是 current。fade 全程主角可见因为两 buffer 都画过。
    current.set(backupPixels)
  }

  // M5.6 W0.d:菜单 modal 覆盖最顶层,在 fadeState 后画(避免被 fade 覆盖)。
  // gs.menuStack 空时 drawMenuStack 立即 return,无开销。
  if (gs.menuStack.length > 0 && ctx.uiSpriteFrames) {
    drawMenuStack(fb, gs, ctx.uiSpriteFrames, ctx.glyphs, ctx.openingMenuBg)
  }
}

export function flushToCanvas(
  fb: Framebuffer,
  ctx2d: CanvasRenderingContext2D,
  palette: Palette,
): void {
  const img = fb.toImageData(palette)
  ctx2d.putImageData(img, 0, 0)
}

/**
 * M3 T28 战斗一帧入口 —— 委托 BattlePresent.draw 装配。
 *
 * 注意:M2 explore / event 一帧由 `presentFrame` 处理(不消费 commands);
 * 战斗一帧需消费 `commands`(showDamageNum 进 floating nums)。
 *
 * @param fb        屏幕 framebuffer
 * @param gs        GameState(必须 gs.mode='battle' && gs.battleState 存在)
 * @param battle    BattlePresent 实例(持有 floating nums 跨帧状态)
 * @param assets    战斗资源(sprites / bgs / 表)
 * @param commands  本帧 bus.drain() 命令列表
 * @returns true 表示画了战斗帧;false 表示 gs 不是 battle 模式或缺 battleState(调用方应回落 presentFrame)
 */
export function presentBattleFrame(
  fb: Framebuffer,
  gs: GameState,
  battle: BattlePresent,
  assets: BattleAssets,
  commands: BusEntry[],
): boolean {
  if (gs.mode !== 'battle' || !gs.battleState) return false
  fb.clear()
  battle.draw(fb, gs, gs.battleState, commands, assets, gs.frameNum)
  return true
}
