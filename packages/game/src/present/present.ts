import type { Palette, PlayerRoles, Tilemap } from '@type-pal/shared'
import { applyDitherSteps, DITHER_TOTAL_STEPS } from './dither-fade.js'
import type { IndexedImage } from '../assets/png.js'
import type { BusEntry } from '../core/command-bus.js'
import type { GameState } from '../core/game-state.js'
import { getOverworldSpriteNum, projectRuntimeToBattleRoles } from '../core/game-state.js'
import type { BattlePresent, BattleAssets } from './battle/present-battle.js'
import { type Framebuffer, SCREEN_W, SCREEN_H } from './framebuffer.js'
import { drawTilemap, repairTilemapSeams, addCoverTileEntries, type TileImages, type DrawEntry } from './draw-tilemap.js'
import { drawSprite, type SpriteImage } from './draw-sprite.js'
import { applyScreenWave } from './screen-wave.js'
import { applyScreenShake } from './screen-shake.js'
import {
  drawDialogBox,
  FONT_COLOR_CYAN,
  FONT_COLOR_CYAN_ALT,
  FONT_COLOR_DEFAULT,
  FONT_COLOR_RED,
  FONT_COLOR_RED_ALT,
  FONT_COLOR_YELLOW,
  type DialogBoxDrawCtx,
} from './dialog-box.js'
import { drawMenuStack } from './menu/draw-menu.js'
import { drawConfirmBox } from './menu/draw-confirm.js'
import { computeFollowerRenderItems } from './follower-render.js'
import { computeFollowerWorldPos } from './follower-pos.js'
import type { BattleBgAsset } from './battle/draw-battle-bg.js'
import type { GlyphTable } from './font.js'
import { isWalkable } from '../core/scene-system.js'
import { stepPaletteFade } from '../core/palette-fade.js'

export interface PresentContext {
  tilemap: Tilemap
  tileImages: TileImages
  /** 队伍 sprite 兜底帧。sdlpal `scene.c:750-755` 站立公式 `wFrame = wDirection * walkFrames`;
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
  /** T10b:items catalog(InventoryMenu / Equip / 商店 渲染用)。 */
  items?: import('@type-pal/shared').Item[]
  /**
   * M5.6 T10d:PlayerStatus 全屏背景 — sdlpal `STATUS_BACKGROUND_FBPNUM = 0`
   * (ui.h:83 真值 + uigame.c:1089 `PAL_MKFDecompressChunk(..., STATUS_BACKGROUND_FBPNUM, fpFBP)`)。
   * 数据源 = FBP.MKF chunk 0 → M4 P2.T4 已 dump 到 images/battle/bg/000.png。
   * loadAll 通过 battleBgs.get(0) 拿到;bootstrap 注入此字段。
   */
  statusBg?: BattleBgAsset
  /** C6:中毒数据(object-poisons.json id→{level,color})— PlayerStatus 毒 row 显示(uigame.c:1245-1253)。 */
  objectPoisons?: Map<number, { level: number; color: number }>
  /**
   * M5.6 T10d:PlayerStatus 渲染需 PlayerRoles 全字段(stat / equipment / avatar / maxHP 等)。
   * 与 BattleAssets.playerRoles 同源(LoadedAssets.playerRoles)。
   */
  playerRoles?: PlayerRoles
  /**
   * M5.6 T10d:DATA.MKF chunk 14 LevelUpExp[100],下一等级所需累积经验。
   * sdlpal uigame.c:1218 `gpGlobals->g.rgLevelUpExp[rgwLevel[role]]`(RoleNextExp 数字)。
   */
  levelUpExp?: number[]
  /**
   * C5(2026-05-28):EquipItemMenu 全屏背景 — sdlpal `EQUIPMENU_BACKGROUND_FBPNUM = 1`
   * (ui.h:118 + uigame.c:1822 `PAL_MKFDecompressChunk(...)` + PAL_FBPBlitToSurface 真值)。
   * 数据源 = FBP.MKF chunk 1 → battleBgs.get(1)。bootstrap 注入。
   */
  equipBg?: BattleBgAsset
  /** C7(2026-05-29):InGameMagicMenu 渲染需 spells catalog(spell name + magicNumber)。 */
  spells?: import('@type-pal/shared').Spell[]
  /** C7(2026-05-29):InGameMagicMenu 渲染需 magics catalog(costMP)。 */
  magics?: import('@type-pal/shared').Magic[]
}

/** sdlpal `palcommon.h`:kDirSouth=0 / kDirWest=1 / kDirNorth=2 / kDirEast=3。 */
const FACING_TO_DIRECTION: Record<'down' | 'left' | 'up' | 'right', number> = {
  down: 0, left: 1, up: 2, right: 3,
}

function getPartyWalkFrames(gs: GameState, roleId: number, ctx: PresentContext): number {
  const runtime = gs.PlayerRolesRuntime.rgwWalkFrames?.[roleId]
  const fromStatic = ctx.playerRoles?.roles[roleId]?.walkFrames
  const fromCtx = ctx.partyWalkFrames
  return runtime && runtime > 0
    ? runtime
    : (fromStatic && fromStatic > 0 ? fromStatic : (fromCtx > 0 ? fromCtx : 3))
}

function partyFrameIndex(direction: number, walkFrames: number, walking: boolean, stepFrame: number): number {
  if (!walking) return direction * walkFrames
  if (walkFrames === 4) return direction * 4 + stepFrame
  const iStepFrameLeader = [0, 1, 0, 2][stepFrame] ?? 0
  return direction * 3 + iStepFrameLeader
}

function drawDialogOverlay(fb: Framebuffer, gs: GameState, ctx: PresentContext): void {
  const dialogCtx: DialogBoxDrawCtx = {
    ...ctx.dialogAssets,
    uiSpriteFrames: ctx.uiSpriteFrames,
    itemIcons: ctx.itemIcons,
    items: ctx.items,
  }
  if (gs.dialogBoxKept) {
    drawDialogBox(fb, gs.dialogBoxKept, ctx.glyphs, dialogCtx)
  }
  if (gs.dialogBox) {
    drawDialogBox(fb, gs.dialogBox, ctx.glyphs, dialogCtx)
  }
  if (gs.eventCursor?.waiting === 'confirm' && ctx.uiSpriteFrames) {
    drawConfirmBox(fb, gs.eventCursor.confirmYes ?? false, ctx.uiSpriteFrames, ctx.glyphs)
  }
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

// 接缝修复用的 coverage mask:复用同一块缓冲(每帧清零),避免每帧 alloc 64KB。
let seamCoverageBuf: Uint8Array | null = null
function getSeamCoverage(width: number, height: number): Uint8Array {
  const len = width * height
  if (!seamCoverageBuf || seamCoverageBuf.length !== len) {
    seamCoverageBuf = new Uint8Array(len)
  } else {
    seamCoverageBuf.fill(0)
  }
  return seamCoverageBuf
}

export function presentFrame(
  fb: Framebuffer,
  gs: GameState,
  ctx: PresentContext,
  // DM32:false = fade-only 补帧(palette/dither fade 进行中)——wave/shake 计数器不推进
  //   (C scene.c:389/video.c:615 计数只随逻辑帧;PAL_SceneFade 期间每 100ms 一步,
  //   rAF 60fps 补帧若推进会让水波快 ~6 倍/震屏提前结束)。
  advanceEffects = true,
): void {
  // M5.6 T18:全屏 modal 播放期间(AVI / RNG / splash)暂停 canvas render,
  // DOM <video> overlay 或自管渲染层接管视觉。
  if (gs.suspendRaf) {
    return
  }

  // 特效 A 调色板 ramp fade —— **在 sceneLoading 冻屏判断之前**应用,因为 ramp 改的是 gs.palette.colors
  // (色表),不依赖 fb 重绘。这样:
  //   - FadeOut(0x50)冻屏(loadScene→FadeOut,sceneLoading 仍 true)→ 对**冻结的旧帧**染色淡黑,
  //     忠实 sdlpal:PAL_FadeOut 不调 PAL_MakeScene,只 VIDEO_SetPalette 渐变**当前** gpScreen
  //     (= 触发脚本前那帧,无 setPartyPos 的瞬移)。若放在 sceneLoading return 之后则冻屏永不淡。
  //   - 非冻屏 fade(FadeIn / SceneFade / 大世界 auto fade-in)→ 下面正常重绘 scene,色表同步 ramp。
  // 自清条件 = "fade 到时 + **没有 waiting 在等它**"。等待中(palette-fade/scene-fade)的 fade 由
  // event-system waiting handler finalize + ip++,present 不碰(抢清会让该 handler 走防御分支重跑同 ip)。
  // 香兰报信卡死回归(2026-06-12):0x50 FadeOut→needToFadeIn 后,演出 0x09 frame-wait 中
  // tickSceneAutoFadeIn 点火的自动渐入不属于任何 waiting(sdlpal PAL_FadeIn 阻塞自完成,scene.c:503);
  // 旧条件 `!gs.eventCursor` 在演出游标存在时永不成立 → paletteFadeState 孤儿 → main-loop 每 rAF
  // suppressHeldForFade 吞键 → 对话等键死锁(香兰报信"空格回车无效")。
  if (gs.paletteFadeState && gs.palette) {
    const pf = gs.paletteFadeState
    stepPaletteFade(gs.palette.colors, pf, performance.now())
    const w = gs.eventCursor?.waiting
    const awaited = w === 'palette-fade' || w === 'scene-fade'
    if (!awaited && performance.now() - pf.startTimeMs >= pf.totalMs) {
      gs.paletteFadeState = undefined // colors 已 = target(stepPaletteFade progress clamp 1)
    }
  }

  // 死亡过渡帧 hold(gs.deathHoldActive):T0 战斗结算 tick → 死亡脚本跑到 0x4F 之间的空窗。
  //   此刻 0x4F 还没执行(palette 未染红)、死亡 dialog 还没出 —— 纯保持战斗最后一帧不重绘,
  //   避免这一两 tick 内露出大世界(= user 报"红屏转黑屏前插了一帧战斗画面"的反向同款空窗)。
  //   一旦死亡脚本跑到 0x4F handler,会清本标记 + 置 gameOverActive(见 event-system 0x4F)。
  if (gs.deathHoldActive) {
    return
  }

  // 战败死亡演出(gs.gameOverActive,死亡脚本 L_41075 的 0x4F 已执行):**保持上一帧(战斗最后一帧)不重绘场景**,
  //   palette 已 ramp(0x4F FadeToRed)→ 战斗帧染红;只在最上层画死亡对话("大侠请重新来过吧")。
  //   **不**走下面 fb.clear() + scene 重绘(否则露大世界,user 报"出字同时回大世界")。0x4E 读档 / 场景重载清标记。
  if (gs.gameOverActive) {
    // M14(2026-06-07 sdlpal 审查):FadeToRed(palette.c:623-629)在 fade 前对战斗定格帧一次性 0x4F→0x4E
    //   remap,使背景 0x4F 像素跟 palette ramp 染红。原 remap 只在下方场景路径(step 5b),game-over 走此
    //   短路不经过 → 战斗帧 0x4F 不染红留色斑。在 drawDialogOverlay **前** remap:背景 0x4F→0x4E(染红),
    //   随后画的死亡对话文字仍用 0x4F → palette skip 0x4F 保原色;每帧幂等(背景首帧后已 0x4E,文字每帧重画)。
    if (gs.paletteFadeState?.remap) {
      const { from, to } = gs.paletteFadeState.remap
      const px = fb.indices
      for (let i = 0; i < px.length; i++) if (px[i] === from) px[i] = to
    }
    drawDialogOverlay(fb, gs, ctx)
    return
  }

  // 0x76 ShowFBP(0xFFFF) 黑屏保持:原版此处 gpScreen 已被填成 index 0,之后脚本继续叠字,
  // 直到 0x51/PAL_MakeScene 再重绘。这里每帧重建黑底 + 对话层,避免普通 scene redraw 把场景露出来。
  if (gs.blackScreenHold) {
    fb.clear()
    drawDialogOverlay(fb, gs, ctx)
    return
  }

  // 结局 RNG 演出对话(sdlpal `g_TextLib.fPlayingRNG`,text.c:1271):拜月跳水动画期间显示对话时,
  //   op5 redraw / 主循环 present 走 `VIDEO_RestoreScreen` 恢复 RNG 动画画面(script.c:3273)再叠对话框,
  //   **不重绘大世界** —— 否则对话间隙把 scene 281 的拜月/替身 event objects 露出来
  //   (user 报"动画时正常、一旦说话大世界就浮现")。rngDialogBackup 由壳层在 RNG 播完时备份;
  //   缺备份(防御:误触发 / 备份前)→ 不短路,退化为下方正常场景重绘。
  if (gs.dialogPlayingRNG && gs.rngDialogBackup) {
    fb.indices.set(gs.rngDialogBackup)
    drawDialogOverlay(fb, gs, ctx)
    return
  }

  // P2#7:scene 切换期间跳过 render,fb 保留上一帧(= 旧 scene 完整帧)。覆盖 ① async 资源加载窗口
  // (避免渲染"旧 tilemap+新坐标"花屏)② onEnter 跑 setPartyPos 等定位 opcode 期间(避免新场景在
  // 旧坐标渲染)③ FadeOut 冻屏淡黑(上面色表已 ramp 冻帧)。直到 onEnter 第一个可渲染 yield
  // (fadeScreen/showDialog,event-system 清 sceneLoading)或 no-onEnter/onEnter-end 清 → camera 已定位。
  if (gs.sceneLoading) {
    return
  }

  // FadeOut(0x50)冻屏淡黑:sdlpal PAL_FadeOut(palette.c:123-190)只 VIDEO_SetPalette 渐黑当前 gpScreen,
  // **从不 PAL_MakeScene 重绘**。故此 fade 期间不重绘 scene,保留上一帧 fb(上面 stepPaletteFade 已渐黑色表)。
  // 否则 fadeout 前一刻脚本改的数据(密道 op0x13 把地板瞬间设回原位)会被实时画出 = "原地地板突然关上" bug。
  if (gs.paletteFadeState?.freeze) {
    return
  }

  // sdlpal video.c:VIDEO_BackupScreen 真值:opcode 0x73 触发那一瞬间,把当前屏幕快照存到 gpScreenBak。
  // fade 第一帧(backupPixels 未拷)从上一帧 fb.indices 拷(fb clear 前还留着上一帧像素 = 冻屏保留的
  // 旧 scene 帧 / 同 scene 内上一帧)。用于后续 fade 帧 sdlpal 真 rgIndex stride-6 dither blend(主角全程可见)。
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

  // 1. tilemap layer 0(底层 — 地砖、墙基)— 记录 coverage 供接缝修复
  const seamCoverage = getSeamCoverage(fb.width, fb.height)
  drawTilemap(fb, ctx.tilemap, ctx.tileImages, gs.camera, 0, seamCoverage)

  // 2. tilemap layer 1(顶层 — 桌子 / 椅子 / 柱子 / 屋顶 / 门 — sdlpal scene.c:481 全画)
  drawTilemap(fb, ctx.tilemap, ctx.tileImages, gs.camera, 1, seamCoverage)

  // 2a. 接缝漏黑修复(血池「黑色三角」):原版 PAL_MakeScene 不清屏,瓦片美术接缝的透明像素
  //     被持久 gpScreen 上的邻接地形遮住;我们每帧 fb.clear() 到 0 → 露黑。把没被任何瓦片
  //     画过的像素用最近邻地形补上。**必须在 wave 之前**(coverage 对应未扭曲的地图像素)。
  repairTilemapSeams(fb, seamCoverage)

  // 2b. 特效 B:屏幕波动(sdlpal scene.c:486 PAL_ApplyWave)— 画完两层地图、画 sprite 之前施加,
  //     只波动地图层(sprite 不受影响,与 sdlpal 同序)。0x71 设 wScreenWave/sWaveProgression 后生效。
  if (gs.wScreenWave !== 0 || gs.sWaveProgression !== 0) {
    applyScreenWave(fb.indices, gs, advanceEffects)
  }

  // 3. 收集所有精灵 entries(party + NPCs),Y-sort 后逐一绘制。
  //    同时计算每个精灵的 cover tiles(sdlpal PAL_CalcCoverTiles port),
  //    cover tile 是**重画**已被全画过一次的 layer-1 tile,Y-sort 让重画位置
  //    跟 sprite 正确叠加(高 y 的 cover tile 排后 → 重画时盖 sprite)。
  //    参考 sdlpal scene.c:181-362 PAL_SceneDrawSprites。
  const entries: DrawEntry[] = []

  // --- party ---
  const { sx: partySX, sy: partySY } = pixelToScreen(gs.party, gs.camera)
  const direction = FACING_TO_DIRECTION[gs.party.facing]
  const leaderRoleId = gs.partyMembers[0] ?? 0
  const walkFrames = getPartyWalkFrames(gs, leaderRoleId, ctx)
  let frameIdx: number
  // sdlpal 真值优先级:walking=true(PAL_UpdatePartyGestures(TRUE) scene.c:678-685)
  // 直接覆写 rgParty[0].wFrame,无视任何之前的 scripted pose。
  // walking=false 时,opcode 0x15 setPartyDirectionAndFrame 写的 partyScriptedFrame[0] 生效
  // (剧情固定姿势 — 捂头/倒地等);再 fallback 站立帧 direction*walkFrames。
  if (gs.walkingFrame.walking) {
    frameIdx = partyFrameIndex(direction, walkFrames, true, gs.walkingFrame.stepFrame)
  }
  else {
    const partyLeaderScriptedFrame = gs.partyScriptedFrame[0]
    if (partyLeaderScriptedFrame !== undefined) {
      frameIdx = partyLeaderScriptedFrame
    } else {
      // 站立帧:dir * walkFrames(sdlpal scene.c:750-755)
      frameIdx = partyFrameIndex(direction, walkFrames, false, gs.walkingFrame.stepFrame)
    }
  }
  // 队长也按当前 roleId 查 `PlayerRoles.rgwSpriteNum[role]`(runtime mirror)。
  // 旧字段 partyLeaderSpriteId 只作为旧存档兼容回退。
  let activePartyFrames: SpriteImage[] = ctx.partyFrames
  const leaderSpriteNum = getOverworldSpriteNum(gs, leaderRoleId, ctx.playerRoles)
  if (leaderSpriteNum !== undefined && ctx.npcSpriteFrames) {
    const overrideFrames = ctx.npcSpriteFrames.get(leaderSpriteNum)
    if (overrideFrames && overrideFrames.length > 0) {
      activePartyFrames = overrideFrames
    } else if (leaderRoleId !== 0) {
      activePartyFrames = []
    }
  }
  const partyFrame = activePartyFrames[frameIdx] ?? activePartyFrames[0]
  if (partyFrame) {
    // sdlpal scene.c:224-226:party pos.y = party.y - viewport.y + wLayer + 10,iLayer = wLayer + 6。
    // L3:gs.wLayer(0x6E 设的队伍层,= operand*8,上桥/上下层时非 0)接入 sort key 与 cover iLayer。
    //   sort key = pos.y = world.y + wLayer + 10(viewport 相消)。
    //   blit_y = pos.y - height - iLayer = (world.y+wLayer+10) - height - (wLayer+6) = world.y+4-height
    //     → wLayer 在 blit 相消,精灵屏幕像素位置不随 wLayer 变(cy 仍传 capturedSY + 4)。
    //   wLayer 真实影响:① sort key 排序(同 y 的 NPC/tile 前后序)② cover sx = x - iLayer/2(遮挡列)。
    const capturedFrame = partyFrame
    const capturedSX = partySX
    const capturedSY = partySY
    entries.push({
      // sdlpal party sort key: world.y + wLayer + 10(scene.c:225)
      baseY: gs.party.y + gs.wLayer + 10,
      draw: (f) => drawSprite(f, capturedFrame, capturedSX, capturedSY + 4),
      id: 'party',
    })
    // cover tiles for party
    // sdlpal scene.c:225-226 真值:cover sy=pos.y=world.y+wLayer+10(内部减 iLayer 后 wLayer 相消),
    //   iLayer = wLayer + 6(影响 cover sx = x - iLayer/2)。
    addCoverTileEntries(
      entries,
      ctx.tilemap,
      ctx.tileImages,
      gs.party.x,
      gs.party.y + gs.wLayer + 10, // sy = party.y + wLayer + 10,与 party sort key 一致
      capturedFrame.width,
      capturedFrame.height,
      gs.camera,
      'party',
      gs.wLayer + 6,               // iLayer = wLayer + 6(scene.c:226)
    )
  }

  // --- followers (partyMembers[1..]) ---
  // sdlpal scene.c:213 每个 party member 都用 PAL_GetPlayerSprite(i)(= 该角色 rgwSpriteNum
  //   对应的 MGO sprite),**不是** leader sprite —— 之前简版用 partyFrames 导致 follower
  //   全显示李逍遥(user 2026-05-28 发现)。
  // scene.c:690-730 follower 位置:两 follower 都以 trail[1] 为基,各自偏移不同:
  //   i==1(partyMembers[1]):offX = West||South ? +16 : -16;offY = West||North ? +8 : -8
  //   i==2(partyMembers[2]):offX = East||West ? -16 : +16;offY = +8(恒)
  //   方向帧用 trail[2].wDirection(scene.c:724/728);trail 不足回退 trail[1].dir。
  //   障碍调整(scene.c:712-717):偏移位若撞墙 → 回退到 trail[1](去偏移)。
  if (gs.trail.length > 1) {
    // 位置+朝向(port PAL_UpdatePartyGestures fWalking 闸门,scene.c:658/745):走路 trail+偏移+避障、朝向 trail[2].dir;
    //   静止(演出/骑乘)位置与朝向**双双冻结** = 队长+frozenOffset、冻结朝向。修"上船赵灵儿队列跟随重叠跳变 + 朝向乱"。
    gs.followerFrozenOffset ??= [] // 防御:旧存档/反序列化路径可能无此字段(present-only 缓存)
    const followerState = {
      party: gs.party,
      trail: gs.trail,
      walking: gs.walkingFrame.walking,
      frozenOffset: gs.followerFrozenOffset,
    }
    for (let m = 1; m < gs.partyMembers.length; m++) {
      const roleId = gs.partyMembers[m]!
      const followerWalkFrames = getPartyWalkFrames(gs, roleId, ctx)
      const fpos = computeFollowerWorldPos(followerState, m, (x, y) =>
        isWalkable(ctx.tilemap, x, y, gs.npcs, 0, true),
      )
      if (!fpos) continue
      // 帧/朝向优先级(对齐队长 present.ts:304-314 + sdlpal):
      //   walking=true → trail 帧(PAL_UpdatePartyGestures(TRUE) scene.c:724/728 走路覆盖);
      //   walking=false 且 0x15 写了本队员 scriptedFrame → 用脚本帧。sdlpal 0x15 直接写
      //     rgParty[operand[2]].wFrame(script.c:736,operand[2] 可指跟随者),静止演出期间
      //     PAL_GameUpdate 不调 PAL_UpdatePartyGestures(play.c:24-241)→ 该帧不被 rgTrail 覆盖,
      //     跟随者按脚本朝向渲染(如「等一下,刘兄」李逍遥转身、对话转向面对 NPC scene-system.ts:176)。
      //     之前跟随者只取 trail[2].dir、丢弃 partyScriptedFrame[m] → 该转身的跟随者不转(频繁 bug)。
      //   都不满足 → 站立帧 = trail[2].dir * walkFrames(scene.c:757-764)。
      const followerScriptedFrame = gs.partyScriptedFrame[m]
      let followerFrameIdx: number
      if (!gs.walkingFrame.walking && followerScriptedFrame !== undefined) {
        followerFrameIdx = followerScriptedFrame
      }
      else {
        followerFrameIdx = partyFrameIndex(
          FACING_TO_DIRECTION[fpos.dir],
          followerWalkFrames,
          gs.walkingFrame.walking,
          gs.walkingFrame.stepFrame,
        )
      }
      const followerWorldX = fpos.x
      const followerWorldY = fpos.y
      const { sx, sy } = pixelToScreen({ x: followerWorldX, y: followerWorldY }, gs.camera)

      // 每个 follower 用自己角色的 sprite(rgwSpriteNum[role] → npcSpriteFrames)。
      // 取不到时跳过本帧,不能回退 leader partyFrames,否则切场景/入队资源竞态会把队员画成李逍遥。
      const spriteNum = getOverworldSpriteNum(gs, roleId, ctx.playerRoles)
      const roleFrames = (spriteNum !== undefined && ctx.npcSpriteFrames)
        ? ctx.npcSpriteFrames.get(spriteNum)
        : undefined
      const frames = (spriteNum !== undefined && ctx.npcSpriteFrames)
        ? roleFrames
        : ctx.partyFrames
      if (!frames || frames.length === 0) continue
      const followerFrame = frames[followerFrameIdx] ?? frames[0]
      if (!followerFrame) continue
      const capturedFrame = followerFrame
      const capturedSX = sx
      const capturedSY = sy
      const id = `party-member-${m}`
      entries.push({
        // L3:follower 同 leader 在 scene.c:213-226 同 loop 同公式,sort key 加 gs.wLayer。
        baseY: followerWorldY + gs.wLayer + 10,
        // +4 同 leader:脚底对齐 sdlpal rgParty[i].y+4(wLayer 在 blit 相消)。
        draw: (f) => drawSprite(f, capturedFrame, capturedSX, capturedSY + 4),
        id,
      })
      addCoverTileEntries(
        entries,
        ctx.tilemap,
        ctx.tileImages,
        followerWorldX,
        followerWorldY + gs.wLayer + 10,
        capturedFrame.width,
        capturedFrame.height,
        gs.camera,
        id,
        gs.wLayer + 6,         // follower iLayer = wLayer + 6,同 party
      )
    }
  }

  // --- 0x98 额外跟随者(sdlpal rgParty[maxIdx+i] @ rgTrail[2+i],scene.c:210-226 + 732-743/767-771)---
  //   与队员同 z-sort 队列;位置直取 trail[3+k](无偏移/无障碍回退),恒 3 帧步,各用自己角色 sprite。
  for (const it of computeFollowerRenderItems(
    gs.trail, gs.followers, gs.walkingFrame.walking, gs.walkingFrame.stepFrame,
  )) {
    // sprite:跟随者 sprite num = 0x98 operand **直接当 MGO chunk**(res.c:340 follower 路径,
    //   **不**走队员 rgwSpriteNum[role] 查表)→ ctx.npcSpriteFrames.get(chunk)。临时同行 NPC
    //   (如 scene 102 书生 = chunk 82/83),不在 6 人角色表。chunk 未载入 → 跳过不画(防御)。
    const roleFrames = ctx.npcSpriteFrames?.get(it.spriteNum)
    if (!roleFrames || roleFrames.length === 0) continue
    const frame = roleFrames[it.frameIdx] ?? roleFrames[0]
    if (!frame) continue
    const { sx, sy } = pixelToScreen({ x: it.worldX, y: it.worldY }, gs.camera)
    const id = `follower-${it.followerIndex}`
    const capFrame = frame
    const capSX = sx
    const capSY = sy
    entries.push({
      // L3:0x98 额外跟随者同在 scene.c:210-226 party loop,sort key 加 gs.wLayer。
      baseY: it.worldY + gs.wLayer + 10,
      // +4 同 leader:脚底对齐 sdlpal rgParty[maxIdx+i].y+4(wLayer 在 blit 相消)。
      draw: (f) => drawSprite(f, capFrame, capSX, capSY + 4),
      id,
    })
    addCoverTileEntries(
      entries, ctx.tilemap, ctx.tileImages, it.worldX, it.worldY + gs.wLayer + 10,
      capFrame.width, capFrame.height, gs.camera, id, gs.wLayer + 6,
    )
  }

  // --- NPCs ---
  for (const npc of gs.npcs) {
    // sdlpal scene.c:247-250:state hidden/negative 或正 vanishTime 都不绘制。
    // 负 vanishTime 仍可见,但在 play.c 中暂停 trigger/autoScript 直到回到 0。
    // sState == kObjStateHidden(=0)或 sState < 0 都隐(scene 1 cutscene 后
    //   setSceneObjectState[12,0,0] 把 npc id=11 sprite 628 拿锅李大娘隐起来,让 sprite 55 走的李大娘 take over)。
    //   注:bootstrap 把 npc.sState 从 eo.state 真值初始化为 1(kObjStateNormal),所以默认 sState=1 显示。
    if ((npc.sState !== undefined && npc.sState <= 0) || (npc.sVanishTime ?? 0) > 0) continue
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
    // sdlpal scene.c:262-280 真值:spriteIdx = wDirection * nSpriteFrames + iFrame,
    //   iFrame = wCurrentFrameNum(站立时 = 0)。scriptedFrame 或 facing 任一有值就按方向算帧:
    //   - scriptedFrame 有(走动/pose):iFrame = scriptedFrame
    //   - 仅 facing 有(静止 NPC 朝某向):iFrame = 0(站立帧)→ 之前一律 fallback frame 0
    //     (朝下),苗人等初始朝向丢失(2026-05-28 user 发现)。
    let sprite: SpriteImage | undefined
    if (ctx.npcSpriteFrames && (npc.scriptedFrame !== undefined || npc.facing !== undefined)) {
      const frames = ctx.npcSpriteFrames.get(npc.spriteNum)
      if (frames && frames.length > 0) {
        const dir = npc.facing ? FACING_TO_DIRECTION[npc.facing] : 0
        // nSpriteFrames 用 dump 真值(sdlpal EventObject.nSpriteFrames);为 0 = 非方向性 sprite
        //   → idx = iFrame(忽略方向),躺地醉汉 / 装饰物转向不变帧。dump 缺则回退 frames.length 推断。
        const nSpriteFrames = npc.nSpriteFrames ?? (frames.length === 1 ? 0
          : (frames.length % 4 === 0 ? frames.length / 4 : 1))
        let iFrame = npc.scriptedFrame ?? 0
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
    // 屏外剔除 — port sdlpal scene.c:286-314(血池审查 2026-06-12):**剔除发生在
    // AddSpriteToDraw 与 PAL_CalcCoverTiles 之前** — 屏外对象既不画精灵、也不产生 cover
    // tile。旧码无此剔除 → 刚出屏的对象(如血池触发垫 1018)仍按脚下 cell 产 cover 条目,
    // 把 layer-0 地砖晚序盖到屏内 layer-1 墙体/池沿上 = 走动时屏缘"异常地块"忽隐忽现。
    //   x = eo.x - vp.x - width/2;  if (x >= 320 || x < -width) skip
    //   vy = (eo.y - vp.y + sLayer*8 + 9) - height - sLayer*8 + 2;  if (vy >= 200 || vy < -height) skip
    const cullLeft = sx - Math.floor(sprite.width / 2)
    if (cullLeft >= SCREEN_W || cullLeft < -sprite.width) continue
    const cullVy = sy + 11 - sprite.height // sLayer*8 项相消(+9-...+2 = +11)
    if (cullVy >= SCREEN_H || cullVy < -sprite.height) continue
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

  // 5b. 特效 A FadeToRed(0x4F)fb 像素重映射 — sdlpal palette.c:623-629 `((LPBYTE)pixels)[i]==0x4F → 0x4E`。
  //     在场景+精灵已画、对话框未画时套用:场景里用 idx 0x4F 的像素改 0x4E(随 palette 染红);
  //     随后 step 6 画的对话框文字仍用 0x4F → palette skip 0x4F 保原色 → game-over 文字不被染红。
  //     注:sdlpal 是 fade 起始一次性 remap(其间无 PAL_MakeScene 重画);我们每帧重画 → 每帧 remap(等价)。
  if (gs.paletteFadeState?.remap) {
    const { from, to } = gs.paletteFadeState.remap
    const px = fb.indices  // Uint8Array 内容可变(只读的是引用,非元素);全缓冲扫描天然越界安全。
    for (let i = 0; i < px.length; i++) {
      if (px[i] === from) px[i] = to
    }
  }

  // 6. 对话框/确认框(最上层)
  drawDialogOverlay(fb, gs, ctx)

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

    // time-based:elapsedMs / totalMs * 72 = target step。raf 慢就一帧多跑几步追上。
    const elapsedMs = performance.now() - startTimeMs
    const progress = Math.min(elapsedMs / totalMs, 1)
    const targetSteps = Math.floor(progress * DITHER_TOTAL_STEPS)

    // 复用 nibble-dither 纯 helper(同 battle intro fade D19,dither-fade.ts):推进 [appliedSteps, targetSteps) 步。
    applyDitherSteps(current, backupPixels, appliedSteps, targetSteps)
    gs.fadeState.appliedSteps = targetSteps

    // 显示 backupPixels(累积态)— 不是 current。fade 全程主角可见因为两 buffer 都画过。
    current.set(backupPixels)
  }

  // 注:特效 A 调色板 ramp(palette.c FadeOut/FadeIn/SceneFade/...)已在函数开头(sceneLoading 判断前)
  //     应用 —— ramp gs.palette.colors,与上面 dither fadeState(mutate fb.indices)正交。

  // M5.6 W0.d:菜单 modal 覆盖最顶层,在 fadeState 后画(避免被 fade 覆盖)。
  // gs.menuStack 空时 drawMenuStack 立即 return,无开销。
  // **仅 mode==='menu' 才画**(2026-06-08 物品/手卷 use bug):非 applyToAll 物品 use 时 startOverworldItemScript
  //   切 mode='event' 跑 scriptOnUse 对话,但 menuStack **保留**(为脚本跑完重显 ItemUseMenu picker,对齐
  //   sdlpal play.c:288-302 INNER while)。若此处只看 menuStack 非空就画 → 物品列表盖住 scriptOnUse 对话
  //   (user 报"使用列表没消失遮挡文字")。sdlpal 里 PAL_RunTriggerScript 期间 picker 不画,脚本跑完才重绘。
  //   脚本结束 restoreModeAfterScript 回 mode='menu'(menuStack 非空)→ picker 自然重现。
  if (gs.menuStack.length > 0 && gs.mode === 'menu' && ctx.uiSpriteFrames) {
    drawMenuStack(fb, gs, ctx.uiSpriteFrames, ctx.glyphs, {
      openingMenuBg: ctx.openingMenuBg,
      items: ctx.items,
      itemIcons: ctx.itemIcons,
      statusBg: ctx.statusBg,
      objectPoisons: ctx.objectPoisons, // C6:PlayerStatus 毒 row

      // 菜单(状态/仙术/装备/物品)读运行时角色态 —— 投影 gs.PlayerRolesRuntime → roles,反映
      // 升级后等级/属性、学会的新仙术、战斗受伤的当前 HP。静态 ctx.playerRoles 是 1 级基线,新游戏后即分叉。
      playerRoles: ctx.playerRoles
        ? projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, ctx.playerRoles)
        : undefined,
      // M5.6 T10d:PlayerStatus 头像复用 dialog-assets.portraitFrames(同 RGM PNG 资源)。
      portraitIcons: ctx.dialogAssets?.portraitFrames,
      levelUpExp: ctx.levelUpExp,
      equipBg: ctx.equipBg,
      spells: ctx.spells,
      magics: ctx.magics,
    })
  }

  // G9:屏幕摇晃(sdlpal video.c:571-616 VIDEO_UpdateScreen shake 分支)。
  // sdlpal 在所有层 blit 到 gpScreen 后,UpdateScreen 输出阶段才施加 shake → 我们同序:
  //   全部图层 + 精灵 + fade + 菜单装配完成后,对最终 fb.indices 整幅垂直跳动。
  // opcode 0x0035 设 shakeTime/shakeLevel 后逐帧生效,applyScreenShake 末尾自减 shakeTime 至 0 停。
  //   注:战斗法术 frame.shake(magic.shake → anim-timeline shake 区)在 present-battle.ts BattlePresent.draw
  //   末尾施加(战斗走 presentBattleFrame,不经本函数)→ 此处只认大世界/cutscene 的 gs.shakeTime。
  if (gs.shakeTime !== 0) {
    applyScreenShake(fb.indices, gs, advanceEffects)
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

// dialog 等键箭头的"闪烁" = sdlpal text.c:1408-1426 PAL_DialogWaitForKey 的 palette 轮转(非 show/hide)。
//   wait loop 每 UTIL_Delay(100ms) 对 palette[0xF9..0xFE] **左轮转一格**:
//     t = pal[0xF9]; for i in 0xF9..0xFD: pal[i]=pal[i+1]; pal[0xFE]=t;
//   箭头像素索引落在 0xF8(描边,固定)/0xF9(内部)→ 随轮转循环显示这 6 槽色,产生色彩流动。
//   整圈 6×100ms = 600ms。按键后 PAL_SetPalette 复原(text.c:1442)。
const DLG_ICON_ROT_LO = 0xf9   // 轮转区间 [0xF9, 0xFE]
const DLG_ICON_ROT_LEN = 6     // 共 6 槽
const BLACK_SCREEN_DIALOG_TEXT_COLORS = [
  FONT_COLOR_DEFAULT,
  FONT_COLOR_YELLOW,
  FONT_COLOR_RED,
  FONT_COLOR_RED_ALT,
  FONT_COLOR_CYAN,
  FONT_COLOR_CYAN_ALT,
] as const

function applyBlackScreenDialogPalette(gs: GameState, base: Palette): Palette {
  if (!gs.blackScreenHold || (!gs.dialogBox && !gs.dialogBoxKept)) return base
  // 黑屏提示字是 UI/dialog 层,不应跟随夜晚场景调色板变暗。
  const src = (gs.basePalette ?? base).colors
  const colors = base.colors.slice()
  let changed = false
  for (const idx of BLACK_SCREEN_DIALOG_TEXT_COLORS) {
    const c = src[idx]
    if (!c) continue
    const prev = colors[idx]
    if (!prev || prev[0] !== c[0] || prev[1] !== c[1] || prev[2] !== c[2]) changed = true
    colors[idx] = [c[0], c[1], c[2]]
  }
  return changed ? { ...base, colors } : base
}

/**
 * 当 dialog 处于等键 phase 时,返回 palette 的**瞬态**轮转副本(不改 gs.palette,无需复原);
 * 否则原样返回 base。轮转步数按 wall-clock 100ms/步,与 sdlpal UTIL_Delay(100) 节奏一致。
 */
export function applyDialogIconPaletteShift(gs: GameState, base: Palette): Palette {
  const pal = applyBlackScreenDialogPalette(gs, base)
  const dlg = gs.dialogBox
  if (!dlg || (dlg.phase !== 'waiting-page-key' && dlg.phase !== 'waiting-end-key')) return pal
  // sdlpal text.c:1412-1426/1439-1443 同守卫:center(kDialogCenter)等键也**不**做 0xF9-0xFE palette 轮转
  //   (无箭头 → 无闪烁)。narration 不进等键 phase,故只需排除 center。
  if (dlg.style === 'center') return pal
  const step = Math.floor(performance.now() / 100) % DLG_ICON_ROT_LEN
  if (step === 0) return pal
  const colors = pal.colors.slice()
  // 左轮转 step 格:pal[0xF9+i] = base[0xF9 + ((i+step) % 6)]
  for (let i = 0; i < DLG_ICON_ROT_LEN; i++) {
    colors[DLG_ICON_ROT_LO + i] = pal.colors[DLG_ICON_ROT_LO + ((i + step) % DLG_ICON_ROT_LEN)]!
  }
  return { ...pal, colors }
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
  advanceEffects = true, // DM32:fade-only 补帧不推进特效计数
): boolean {
  if (gs.mode !== 'battle' || !gs.battleState) return false
  fb.clear()
  battle.draw(fb, gs, gs.battleState, commands, assets, gs.frameNum, advanceEffects)
  return true
}
