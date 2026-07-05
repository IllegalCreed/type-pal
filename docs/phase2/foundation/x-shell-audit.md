# 壳层 / 主循环 / 音频 / 过场 / 场景 / 存档 · 三方逐函数审计

> **审计范围**：壳层（shell）10 单元——`sdlpal C 原版` ↔ `一阶段 game 包` ↔ `reforge 重写引擎`。这是 reforge 缺口最大的领域（shell 112 fix 一阶段血泪史，reforge 重写时无人复核）。
>
> **方法**：每单元四步——① sdlpal C 真值（path:line）② 一阶段承接（path:line + fix 史）③ reforge 现状（path:line）④ 缺口 + 行动。每条缺口标 **高/中/低** + **A 原版真值 / B 通用工程教训 / C 旧架构特有** 分类（沿用 harvest 体例）。
>
> **元信息**：
> - 日期：**2026-07-05**
> - git HEAD：`a3828b3035cefd95769a5c290af32ee921641805`
> - 审计员：深度审计员（subagent）
> - 数据源：`reference/sdlpal/`（C 真值）、`packages/game/src/`（一阶段）、`packages/reforge/src/`（reforge）

---

## 0. 总览 · reforge 缺口热图

| # | 单元 | reforge 状态 | 缺口密度 | 最高危 |
|---|---|---|---|---|
| 1 | bootstrap 接线 | ⚠️ 部分 | 中 | soundfont 不预取（高） |
| 2 | 主循环 | ❌ 缺 | 高 | 无 accumulator（高） |
| 3 | 输入 | ✅ 已移植 | 低 | — |
| 4 | 音频 MIDI/BGM | ✅ 四守卫全 | 中 | SFX 无 lastSFX 去重（高） |
| 4b | 音频 SFX | ⚠️ 部分 | 中 | 战斗揭场静默缺（中） |
| 5 | AVI 播放 | ❌ 未实现 | — | N/A（过场未接） |
| 6 | RNG 播放 | ❌ 未实现 | — | N/A（过场未接） |
| 7 | FBP/结局 | ❌ 未实现 | — | N/A（结局未接） |
| 8 | 场景加载 | ⚠️ 部分 | 高 | spriteCache/paletteCache 无界 + 无 onEvict 联动（高） |
| 9 | 游戏状态 | ✅ 架构免疫 | 低 | —（per-role 已解耦） |
| 10 | 存档 | ⚠️ 部分 | 中 | 读档无运行时归一化（中） |

**一句话**：reforge 输入/游戏状态/音频守卫做得扎实；但 **主循环无 accumulator、SFX 去重缺、场景缓存不完整、过场三件套（AVI/RNG/FBP）全无**——一旦接剧情/多场景/战斗全系列，必撞一阶段修过的坑。

---

## 1. bootstrap 接线

### 1.1 sdlpal C 真值（初始化序）

`sdlpal/main.c:88-160` `PAL_Init()`——严格同步序：

| 步 | 函数 | 职责 |
|---|---|---|
| 1 | `PAL_InitGlobals` (main.c:107) | 全局配置 |
| 2 | `VIDEO_Startup` (main.c:112) | 视频 |
| 3 | `PAL_InitUI` (main.c:120) | UI |
| 4 | `PAL_InitText` (main.c:126) | 文本 |
| 5 | `PAL_InitFont` (main.c:132) | 字体 |
| 6 | `PAL_InitInput` (main.c:138) | 输入 |
| 7 | `PAL_InitResources` (main.c:139) | 资源（打开 MKF 文件） |
| 8 | `AUDIO_OpenDevice` (main.c:140) | **音频**（含 native MIDI 探测） |
| 9 | `PAL_AVIInit` (main.c:141) | AVI 解码器 |

`main()`（main.c:464-522）：`PAL_Init()` → `PAL_TrademarkScreen()` → `PAL_SplashScreen()` → `PAL_GameMain()`。**音频在 8 步就绪**，trademark（`PAL_PlayAVI("1.avi")`，main.c:199）才有 BGM。

### 1.2 一阶段承接

`packages/game/src/shell/bootstrap.ts`（1894 行）：

- **soundfont 顶部预取**（`bootstrap.ts:221` `fetch('/soundfont.sf3')`）+ `soundfontSettled` Promise（`:225`）。
- **可玩门 await soundfont**（`bootstrap.ts:1841` `await soundfontSettled`）——**在 trademark/splash/OpeningMenu 之前**。注释（`:1836-1839`）：「必须在视频/菜单发起之前等，否则 1.mp4 在 loading 覆盖层底下开播」。
- 音频解锁（`bootstrap.ts:467` `keydown+pointerdown capture: true` 持续触发 `audio.resume`）——修 2026-06-03 user 实测「AudioContext was not allowed to start」。
- 可玩门（`bootstrap.ts:1848-1850`）：`onPlayable` → `await enterGate` → `audio.resume()`。即「**先等 soundfont，再让用户点进游戏，点的同时解锁音频**」。

### 1.3 reforge 现状

`packages/reforge/src/main.ts:139-203` `main()`：

- **BGM 懒初始化**（`main.ts:146` `createBgmPlayer`；`audio/bgm.ts:74-113` `ensureInit`）：首次 `play()` 才 `fetch('/soundfont.sf3')`。**boot 期完全不预取**。
- 音频解锁（`main.ts:149-150`）`pointerdown+keydown { once: true, capture: true }` `bgm.resume()`——**`once: true`**（与一阶段「持续触发」相反）。
- 无可玩门：`switchScene`（`main.ts:377`）await 完直接 `requestAnimationFrame(tick)`（`main.ts:2039`）。
- soundfont 同步性：`getPalette`（`main.ts:227`）**async**（同 W7 缺口，见 §8）。

### 1.4 缺口

| 缺口 | 等级 | 分类 | 详情 |
|---|---|---|---|
| **G1.1 soundfont 不预取** | **高** | B | reforge boot 不 fetch soundfont，首次 BGM 触发才拉 ~6MB（`bgm.ts:88`）。一阶段血泪：慢网下 trademark/AVI 中途 soundfont 才 ready，BGM 在视频后半段才响。**接 trademark/splash/演出必撞**。行动：照搬 `bootstrap.ts:221-225` 顶部 `fetch` + `await soundfontSettled` 在 `requestAnimationFrame(tick)` 之前。 |
| **G1.2 音频解锁 `once: true`** | 中 | B | `main.ts:150` 用 `{ once: true }`，首个手势后即摘监听。一阶段 `bootstrap.ts:462-467` 明记「不能用 once」：用户切 tab 回来 ctx 重新 suspended，once 已摘 → BGM/SFX 全哑。行动：去掉 `once: true`，`bgm.resume()`/`sfx.ensureCtx()` 内部已幂等。 |
| **G1.3 可玩门缺** | 低 | B | 一阶段 `enterGate`（用户点「进入游戏」）解 autoplay 锁 + 预热视频。reforge 现阶段 dev 直开无妨；**生产部署前**需补，否则 autoplay policy 下首帧 BGM/视频受困。 |

---

## 2. 主循环

### 2.1 sdlpal C 真值

`game.c:60-86` `PAL_GameMain()` 主循环：

```c
dwTime = SDL_GetTicks();
while (TRUE) {
    PAL_LoadResources();          // res.c:191 按需加载（场景/全局）
    PAL_ClearKeyState();          // 每帧清键（边沿语义）
    PAL_DelayUntil(dwTime);       // palcommon.h:283 阻塞到 dwTime（PROCESS_EVENT + SDL_Delay(1)）
    dwTime = SDL_GetTicks() + FRAME_TIME;  // **下一截止从当前时刻起算 → 永不补帧**
    PAL_StartFrame();             // play.c:513
}
```

关键（`palcommon.h:283-289` `PAL_DelayUntil` 宏 + `game.h:27-28` `FPS=10` / `FRAME_TIME=100ms`）：**阻塞节流，一次循环一帧，慢帧只顺延、永不补**。

`PAL_StartFrame`（`play.c:513-600`）：`PAL_GameUpdate(TRUE)` → 若 `fEnteringScene` 早退 → `PAL_UpdateParty` → `PAL_MakeScene` → `VIDEO_UpdateScreen` → 按键路由（Menu/UseItem/Equip/Magic/Status/Search/Flee）。

### 2.2 一阶段承接

`packages/game/src/shell/main-loop.ts`（181 行，9 个 fix）：

- **`advanceRafFrame`**（`main-loop.ts:66-137`）rAF + accumulator 三不变量：
  - ① `interval = logicIntervalMs(gs)`（`main-loop.ts:49-51`：battle 40ms / explore 100ms，**fade 不提速逻辑**——DM 修 2026-05-30 解耦「香兰报信瞬移」根因）。
  - ② **DM31 永不补帧**（`main-loop.ts:90-94` + `:114-115`）：`accumulator -= interval; if (accumulator > interval) accumulator = 0`——每 rAF 至多 1 tick，残留 >1 interval（真积压）才丢弃，<interval 余量结转（DM31-修：battle 40ms 在 60Hz 慢 25% 根因）。
  - ③ present 门控（`main-loop.ts:122-135`）：tick 时 / 各类 fade 进行中才 present。
- mode 切 clamp（`main-loop.ts:62` 注释）：`accumulator > 3×interval → 设为 interval`（避免 explore→battle 一下 catch-up 多 tick）。
- fade 清键边界（`main-loop.ts:78-87` DM30）：`waiting === 'scene-fade'` 才 `suppressHeldForFade`，纯色表 ramp（FadeOut/FadeIn/ColorFade）不清键（修「战后 fadeout 卡键」）。

### 2.3 reforge 现状

`packages/reforge/src/main.ts:1673-1705` `tick(t)`：

```ts
function tick(t: number): void {
  const dt = lastT ? Math.min(t - lastT, 100) : 0  // 钳 dt 防后台爆步
  lastT = t
  nowMs = t
  // 计时器/fade/dialog resolve
  advanceMoves(dt)         // 走位
  deriveMounts()           // 挂载
  tickHostiles(dt)         // 遇敌
  const pressed = keyboard.consumePressed()
  if (activeBattle) { activeBattle.tick(dt, pressed); ...; return }
  // 菜单/对话/探索输入路由（每 rAF 一帧）
  ...
  render()
  requestAnimationFrame(tick)
}
```

**关键问题**：reforge **没有 accumulator**——每个 rAF 帧都跑完整逻辑（菜单输入、走位推进、hostile tick），dt 直接喂给 `advanceMoves(dt)` / `tickHostiles(dt)`。仅走步用 `stepAcc`（`main.ts:1980-2002` `while (stepAcc >= STEP_MS) stepAcc -= STEP_MS`）做了累加器。

### 2.4 缺口

| 缺口 | 等级 | 分类 | 详情 |
|---|---|---|---|
| **G2.1 无全局 accumulator，逻辑随 rAF 频率跑** | **高** | A+B | reforge tick 每 rAF（60/120/144Hz）都执行逻辑（hostile tick、菜单输入、计时器兑现）。sdlpal 一帧=一逻辑 tick（10fps）。后果：① 高刷屏 reforge 逻辑快 6-14×（计时器/对话自动关/hostile 追逐全快）；② `advanceMoves(dt)` 用 wall-clock dt 推实体——与 sdlpal「每 tick 固定位移」语义不同。**接战斗/演出必撞**。行动：照搬 `main-loop.ts:66-137` 的 accumulator（`accumulator -= interval; clamp`）。 |
| **G2.2 走步 stepAcc 有累加，但 hostile/move 用 dt** | 中 | B | `advanceMoves(dt)`（`main.ts:630` `entityMoves.set(... acc: 0 ...)`）、`tickHostiles(dt)`（`main.ts:1131`）按 wall-clock dt 推进。sdlpal 是「每逻辑 tick 固定步」（`play.c:240 dwFrameNum++`）。两模型不冲突时 OK，但**确定性 replay / record 会断**（高刷屏 vs 60Hz 不同步）。行动：与 G2.1 一并改 tick 驱动，dt 仅用于渲染插值。 |
| **G2.3 dt 钳 100ms 非顺延** | 低 | B | `main.ts:1674` `Math.min(t - lastT, 100)`——把 dt 钳到 100ms 但仍喂 dt。sdlpal 是「顺延不补」：慢帧只跑 1 tick。reforge 钳 dt 后仍 `advanceMoves(100)` 一步 = 隐式补帧（虽单步）。与 G2.1 同根。 |

---

## 3. 输入

### 3.1 sdlpal C 真值

`reference/sdlpal/input.c`：

- **后按优先**（`input.c:180-189` `PAL_GetCurrDirection`）：扫 `dwKeyOrder[]` 取 maxCount 方向；`input.c:213` `if (!fRepeat)` 才更新 `dwKeyOrder`——OS 连发（`fRepeat=true`）会把按住的键顶回末位、挤掉后按键，**必须过滤**。
- 按键掩码 `dwKeyPress |= key`（`input.c:240`）边沿累计；`PAL_ClearKeyState`（每帧 `game.c:70` 清）。
- `PAL_KeyDown/KeyUp`（`input.c:191-280`）方向 → `kDirSouth/West/North/East`。

### 3.2 一阶段承接

`packages/game/src/shell/input.ts:73-76`：注释明引 `input.c:213 if (!fRepeat)`——`!e.repeat` 时才 `delete-then-add` 重排 held，OS 连发不重排（修 user 报「依然是固定优先级」）。`input.ts:111` pressed 清空（`PAL_ClearKeyState` 等价）。

### 3.3 reforge 现状

`packages/reforge/src/input.ts:12-20`：

```ts
target.addEventListener('keydown', (e) => {
  if (!e.repeat) {
    this.pressed.add(e.key)
    this.held.delete(e.key)   // 后按优先
    this.held.add(e.key)
  }
  if (MOVE_KEYS.has(e.key) || ...) e.preventDefault()
})
```

注释（`input.ts:17`）明引「一阶段 shell/input.ts 同坑，对齐 sdlpal input.c:213 !fRepeat」。`lastDownOf`（`:42-46`）取末位命中 = 后按优先。`consumePressed`（`:49-53`）边沿消费清空。

### 3.4 缺口

| 缺口 | 等级 | 分类 | 详情 |
|---|---|---|---|
| — | — | — | **无缺口**。reforge input.ts 忠实移植 sdlpal 后按优先 + 边沿语义，注释引证完整。✅ |

---

## 4. 音频（MIDI BGM + SFX）

### 4.1 sdlpal C 真值

- **MIDI**（`midi.c:49-100`）：`native_midi_detect()` 探测；`iNumRIX == g_iMidiCurrent` 同曲不重启（`:52`）；`native_midi_start(g_pMidi, fLoop)`（`:100`）。
- **SFX**（`sound.c:769-772`）`SOUND_Play` 头部：

```c
if (player->lastSFX == iSoundNum)   // 同号上一份未播完 → 拒
    return FALSE;
player->lastSFX = iSoundNum;
```

`sound.c:930` `player->lastSFX = 0`（缓冲消费完复位）。语义=**同一编号在上一份未播完前不能再触发**。

### 4.2 一阶段承接

**audio-midi.ts**（94831 行 bootstrap 同包，`shell/audio-midi.ts`）：四守卫全带——secure context（`:86`）、RIFF 魔数（`:113`）、CC91=0 + lockController（`:35 reverbAmount=0`）、skipToFirstNoteOn（应在 init options）。

**audio.ts**（`shell/audio.ts`）：
- **SFX 同号去重**（`audio.ts:52-66` `createSfxDedup`）：`tryPlay(id)` 同号且未播完 → false，否则记 `lastSFX=id`；`markEnded(id)` 复位。注释引 `sound.c:769-772`。
- **战斗 BGM 揭场静默**（`audio.ts:81-94` `pickMusicTrack`）：`inBattle && battleIntroActive → return 0`（揭场 360ms 期间静默）。注释引 `battle.c:717-728`：停场景曲(1s 淡出) → Delay(200) → SwitchScreen 揭场(360ms) → 才起战斗曲。修「遇敌瞬间场景曲掐断、战斗曲零延迟炸响」。
- 战斗胜利曲（`audio.ts:102-107` `battleVictoryTrack`）：`isBoss ? 2 : 3`，不循环（`battle.c:1030-1032`）。

### 4.3 reforge 现状

**bgm.ts**（159 行）——四守卫**全移植**：
- secure context（`bgm.ts:79-84`）：`window.isSecureContext` 检测，给准确提示。
- RIFF 魔数（`bgm.ts:91-97`）：`magic !== 'RIFF'` 抛详细错。
- CC91=0 + lockController（`bgm.ts:100-105`）：16 通道全设 0 + lock。
- skipToFirstNoteOn: false（`bgm.ts:106`）。
- 同曲不重启（`bgm.ts:121-124` `playing === track`）、stop 语义（`:117-119` track<=0 停）、setEnabled 记账（`:133-143`）、resume 防重入（`:144-156`）。

**sfx.ts**（70 行）——**缺 lastSFX 去重**：
- `play(id)`（`sfx.ts:22-34`）：`id<=0 || !enabled` 早退；否则 `load(id).then(buf => src.start())`——**无同号检查**，同 id 连发会叠音。
- 解码 Promise 缓存（`sfx.ts:52-68`）：并发同 id 只 fetch 一次（✅）。

**战斗 BGM**（`main.ts:723-726`）：`bgm.play(battleTrack)`——**无揭场静默门**（无 battleIntroActive 等价）。
**胜利曲**（`main.ts:866`）：`bgm.play(3, false)`——硬编码 3，无 boss 分支（boss 未立项，暂可）。
**战后恢复场景曲**（`main.ts:900-903`）：✅ 有（`bgm.play(sys:music ?? scene.musicId)`）。

### 4.4 缺口

| 缺口 | 等级 | 分类 | 详情 |
|---|---|---|---|
| **G4.1 SFX 无 lastSFX 去重** | **高** | A | `sfx.ts:22-34` 无 `player->lastSFX` 等价。后果：同号音效（如多敌同帧死、连击）叠音爆响，违背原版。行动：照搬 `audio.ts:52-66 createSfxDedup`——`play` 前 `tryPlay(id)`，AudioBufferSource `onended` 时 `markEnded(id)`。 |
| **G4.2 战斗 BGM 揭场静默缺** | **中** | A | `main.ts:726` 进战斗直接 `bgm.play(battleTrack)`，无揭场门。后果：遇敌瞬间场景曲掐断、战斗曲零延迟炸响（一阶段血泪）。行动：`main.ts` startBattle 内引入 `battleIntroActive` 概念（battle-session 进场 dither 期），揭场完才 `bgm.play(battleTrack)`。 |
| G4.3 胜利曲无 boss 分支 | 低 | A | `main.ts:866` 硬编码 `bgm.play(3,false)`。boss 战应 track 2（`battle.c:1030`）。boss 立项时补。 |
| G4.4 BGM 懒初始化（同 G1.1） | 高 | B | 见 §1.4 G1.1。 |

---

## 5. AVI 播放

### 5.1 sdlpal C 真值

`aviplay.c`（811 行）：`PAL_PlayAVI` 解 RIFF AVI 容器，逐 chunk 渲染帧 + 喂音频（`:702-704` `PAL_RenderAVIFrameToSurface` + `VIDEO_DrawSurfaceToScreen`）。**跳过键**（`aviplay.c:711` `g_InputState.dwKeyPress & (kKeyMenu | kKeySearch)` → `fEndPlay=TRUE`）+ `UTIL_Delay(500)`（`:747`）。sdlpal 用单源 `g_InputState.dwKeyPress`——跳过键被消费后**不会泄漏**给别处。

调用点：`main.c:199` `PAL_PlayAVI("1.avi")`（trademark）、`main.c:237` `PAL_PlayAVI("2.avi")`（splash）、`ending.c:418-420` `PAL_PlayAVI("4.avi"/"5.avi")`（结局）。

### 5.2 一阶段承接

`packages/game/src/shell/avi-player.ts`（mp4，AVI 已离线 ffmpeg 转 mp4）：
- **跳过键泄漏防护**（`avi-player.ts:107-120`）：`e.stopImmediatePropagation()`——注释（`:109-111`）明记「sdlpal 用单源 g_InputState，无并行监听器；不 stopImmediatePropagation 的话，跳过 splash 的同一个 Space keydown 会继续冒泡进 KeyboardInputSource」。
- 跳过后 `UTIL_Delay(500)` 等价（`:112` DL27）。
- 跳过键列表（`avi-player.ts:57`）：`Space/Enter/Escape`。

### 5.3 reforge 现状

**完全未实现**。`grep -r "avi|playAvi|AVI" packages/reforge/src/` 无命中。无视频元素、无跳过逻辑。

### 5.4 缺口

| 缺口 | 等级 | 分类 | 详情 |
|---|---|---|---|
| **G5.1 AVI 全缺** | **中** | A | trademark（1.avi/2.avi）+ 结局（4.avi/5.avi）全无。**接 DOS 开场或结局必撞**。行动：移植一阶段 `avi-player.ts`（mp4 + 跳过键 stopImmediatePropagation + DL27 500ms 缓冲）。当前 reforge 走编辑器 dev，过场未接是合理阶段缺口，但**立项前必须知会此坑**。 |
| G5.2 跳过键泄漏防护（待移植） | 中 | B | 见上。一阶段 `stopImmediatePropagation` 是 reforge 多监听器架构下必带。 |

---

## 6. RNG 播放

### 6.1 sdlpal C 真值

`rngplay.c:372-448` `PAL_RNGPlay(iNumRNG, iStartFrame, iEndFrame, iSpeed)`：
- 帧率：`iDelay = perfFreq / (iSpeed==0 ? 16 : iSpeed)`（`:399`），`PAL_DelayUntilPC(iTime)`（`:442`）。
- 逐帧：`PAL_RNGReadFrame` → `Decompress` → `PAL_RNGBlitToSurface` → `VIDEO_UpdateScreen(NULL)`（`:416-428`）。**VIDEO_UpdateScreen 内部施震**（g_wShakeTime!=0 时每帧对视频本身震 + `shakeTime--`）。
- 首帧后 `fNeedToFadeIn` 消费（`:433-437` `PAL_FadeIn`）。
- **无跳过键**（全片每帧 UpdateScreen 递减 shake）。

### 6.2 一阶段承接

`packages/game/src/shell/rng-player.ts`（265 行）：
- **in-flight Promise 缓存**（`rng-player.ts:91-94, 119-125`）：`rngChunkCache.set(chunkIdx, p)` **同步缓存 Promise**（非结果），`Promise.all(frames.map(fetchFrame))` 并发取帧复用同一 Promise → 只解码一次。注释（`:93-94`）明记「旧版缓存结果 Map 且 set 在 await 之后 → N 并发全 cache-miss，重复解码整个 chunk N 次（O(N²)），山神庙酒剑仙 5 秒黑屏根因」。
- **震屏计数推进**（`rng-player.ts:238-242`）：每显示帧 `applyScreenShake` + `shakeTime--`；**跳过时一次性结清剩余帧 shake**（`:255-260` `shakeTime = max(0, shakeTime - remaining)`）——注释「跳过坠落视频又把残余震屏带进下一场景」。
- 跳过键（`:177` onKey）。

### 6.3 reforge 现状

**完全未实现**。`grep -r "rng|playRng|RNG" packages/reforge/src/` 无命中。

### 6.4 缺口

| 缺口 | 等级 | 分类 | 详情 |
|---|---|---|---|
| **G6.1 RNG 全缺** | **中** | A | trademark（rngplay 6）、坠落视频、酒剑仙过场全无。行动：移植一阶段 `rng-player.ts`（in-flight Promise 缓存 + 震屏推进 + 跳过结清）。**必带 in-flight Promise 缓存**（O(N²) 黑屏陷阱）和**震屏计数推进**（漏接 0x35 震屏泄漏进下一场景）。 |
| G6.2 in-flight Promise 缓存（待移植） | 高 | B | 见上。 |
| G6.3 震屏计数推进（待移植） | 中 | A+B | 见上。 |

---

## 7. FBP / 结局

### 7.1 sdlpal C 真值

`ending.c`：
- `PAL_ShowFBP`（`ending.c:49-150`）：fade==0 瞬时整屏 blit；fade>0 **96 步 palette-index nibble 渐变**（高 nibble 首触即跳、低 nibble ±1 migrate，`ending.c:111-121`），每步 `RestoreScreen + flush + UTIL_Delay((wFade+1)*10)`（`:134`）。HACKHACK（`:144`）chunk==win95?68:49 跳过最终 blit。
- `PAL_ScrollFBP`（`:153-280`）：上滚 FBP，每线 `UTIL_Delay(800/wScrollSpeed)`（`:273`）。
- `PAL_EndingAnimation`（`:282-394`）：上下两半 FBP + RNG 帧叠加。
- `PAL_EndingScreen`（`:396-512`）：`PAL_PlayAVI("4.avi"/"5.avi")` → 失败则 `AUDIO_PlayMusic(0x1a)` + `PAL_RNGPlay(...)` → `PAL_FadeOut(2)`。

### 7.2 一阶段承接

`packages/game/src/shell/fbp-player.ts`（140 行）：忠实移植 `PAL_ShowFBP`——96 步 nibble 渐变（`RG_INDEX = [0,3,1,5,2,4]`）、HACKHACK chunk 跳过、MGO effectSprite overlay（每步 `(now/150)%numFrames`）。注释引 `ending.c:48-150`。

`packages/game/src/shell/ending-player.ts`（273 行）：结局序列编排（FBP/ScrollFBP/RNG/AVI 组合）。

### 7.3 reforge 现状

**完全未实现**。`grep -r "fbp|ShowFBP|PAL_Ending|ending" packages/reforge/src/` 无命中。

### 7.4 缺口

| 缺口 | 等级 | 分类 | 详情 |
|---|---|---|---|
| **G7.1 FBP/结局全缺** | **低**（远期） | A | reforge 当前是 slice1 室内可玩 + 战斗 demo，结局是项目末期关注。行动：移植一阶段 `fbp-player.ts`（96 步 nibble 渐变 + HACKHACK + effectSprite overlay）和 `ending-player.ts`（序列编排）。**立项时知会 nibble 渐变算法不可简化为 RGBA 淡入**（原版是 palette-index 级渐进，rgba 化会失真）。 |

---

## 8. 场景加载

### 8.1 sdlpal C 真值

`res.c:191-280` `PAL_LoadResources`（按 `bLoadFlags`）：
- `kLoadScene`：`PAL_FreeMap`（`:246`）→ `PAL_LoadMap(wMapNum, fpMAP, fpGOP)`（`:252`）→ 加载 event object sprites（`:277`）。
- `kLoadGlobalData`：`PAL_InitGameData` + `AUDIO_PlayMusic(wNumMusic)`（`:222-224`）。

`scene.c:471-481` `PAL_MakeScene`：**不清屏**（W1 漏黑根因）。

### 8.2 一阶段承接

`packages/game/src/core/scene-system.ts`（30456 行）+ `bootstrap.ts:615-628` 场景资产 LRU：
- **SceneAssetsCache 三件套**（`bootstrap.ts:615-628`）：① `protect: () => currentSceneId`（宁超 cap 不淘汰当前场景）② `onEvict: (sceneId) => tileImagesBySceneId.delete(sceneId)`（联动清理并行 tile 缓存）③ 命中刷新 recency（`bootstrap.ts:369-372` tileImagesBySceneId 路由）。
- 注释（`bootstrap.ts:617-620`）：「淘汰联动必须一致，否则 SceneAssets 命中会跳过 fetchSceneTileImages → tileImages 缺失 → 黑屏无 tile」。

### 8.3 reforge 现状

`packages/reforge/src/main.ts:200-245` 内联缓存：
- `mapCache`（`main.ts:203`）LRU cap16 + **protect**（`:221` `oldest === mapNum break`）+ recency touch（`:209-210` delete-then-set）。✅ protect + recency 有。
- **无 onEvict 联动**（`:222 mapCache.delete(oldest)` 只删 mapCache，不清理 spriteCache/paletteCache）。
- `paletteCache`（`:226`）：**无 cap、无 evict**——无界增长（256 调色板最多，实际可接受，但理论缺口）。
- `sceneDefCache`（`:234`）：无界，但场景数有限（223），可接受。
- `spriteByNum`（`:246`）：**无界、无 evict**——精灵跨场景累积（注释 `:201` 明示「精灵跨场景累积」是设计意图）。但烤 RGBA canvas 比 index tile 大 4×（harvest W5 警告），多场景切换内存压力。

### 8.4 缺口

| 缺口 | 等级 | 分类 | 详情 |
|---|---|---|---|
| **G8.1 mapCache 无 onEvict 联动** | **高** | B+C | `main.ts:222` 只删 mapCache，不动 spriteByNum。当前 spriteByNum 设计为跨场景累积（无 evict），但若将来加 sprite LRU，onEvict 联动是必备模式（一阶段 `bootstrap.ts:624-625` 教训：联动不一致 → 黑屏）。行动：sprite 加 LRU 时必须 onEvict 同步清 mapCache 的 tile 引用，反之亦然。**接多场景前照搬三件套**。 |
| **G8.2 spriteByNum 无界** | 中 | B | `main.ts:246` 永不淘汰。harvest W5 警告：baked RGBA canvas 比 index tile 大 4×，223 场景 × N 精灵 → 内存爆。行动：加 sprite LRU（cap N + protect 当前场景精灵 + onEvict 联动 mapCache）。 |
| G8.3 paletteCache 无 LRU | 低 | B | `main.ts:226` 无界。调色板数有限（≤256），实际可接受。低优。 |
| **G8.4 PAL_MakeScene 不清屏（W1 漏黑）** | **高** | A | sdlpal `scene.c:471-481` 不清屏，靠上一帧残留填缝。reforge `render.ts`（Canvas2D drawImage）每帧 clear → 接缝漏黑（harvest W1 已标 ❌ 未免疫）。行动：见 harvest W1（离屏整图 alpha 合成 / 接缝预填充到 baked tile）。**本审计单元 8 范围内确认此坑仍在**。 |
| G8.5 setPalette async（W7） | 高 | A | `main.ts:227 getPalette` async。同 tick `FadeOut→setPalette→SetRNG→PlayRNG` 会读旧 palette（harvest W7）。行动：bootstrap 预载 PAT 全块成同步 Map。 |

---

## 9. 游戏状态

### 9.1 sdlpal C 真值

`global.c` `SAVEDGAME_WIN.PlayerRoles`（`:472+`）——**per-role 全局数组**（`rgwHP[PLAYERS]`、`rgwSpriteNum[PLAYERS]` 等）。runtime `gpGlobals->g.PlayerRoles` 全局可变，所有子系统（菜单/战斗/渲染）按下标读写。这是 sdlpal 的核心耦合点。

### 9.2 一阶段承接

`packages/game/src/core/game-state.ts`（108361 行）：`PlayerRolesRuntime`（`:536+`）镜像 sdlpal 数组（`rgwHP: number[]` row 9，`:595`）。注释（`:515`）「用数组 index 对应 roleId（同 rgwHP 等 PLAYERS 数组惯例）」。**保留全局耦合**——harvest C 段标「per-role HP 全局耦合是 P0 债」。

### 9.3 reforge 现状

`packages/content/src/character.ts`：
- `WorldState`（`:5`）：`party: CharacterInstance[]`——**HP 内嵌在每个 CharacterInstance**（`:58-77 hp/maxHP`），非全局数组。
- `CharacterInstance`（`:58`）： roleId + hp/maxHP/mp/maxMP + equipment + level/exp。
- `buildWorld`（`:116`）：对每个 party 角色 instantiate → seedStats → 组装。

**架构解耦**：reforge 把 per-role state 放进 party 数组的对象字段，而非全局 `rgwHP[roleId]`。读写走 `world.party[i].hp`，无全局下标耦合。

### 9.4 缺口

| 缺口 | 等级 | 分类 | 详情 |
|---|---|---|---|
| — | — | — | **架构免疫**。reforge WorldState/CharacterInstance 已解耦全局 per-role 数组（harvest C 段「新架构谁承接语义」✅）。✅ **核实通过**——`world.party[i].hp` 无 `rgwHP[roleId]` 全局耦合。 |

---

## 10. 存档

### 10.1 sdlpal C 真值

`global.c:562-639` `PAL_LoadGame_Common`：原始 struct blob 读取（`fread(s, 1, size, fp)`），`DO_BYTESWAP` 字节序，`memcpy` 拷贝到 `gpGlobals`。**无版本字段**——DOS/WIN 两变体靠 `gConfig.fIsWIN95` 分支（`global.c:689 PAL_LoadGame_WIN` / `:642 PAL_LoadGame_DOS`）。`SAVEDGAME_WIN.wSavedTimes`（`:472`）跨 slot max counter（uigame.c:589-597 `max(GetSavedTimes(1..5))+1`）。槽位 1-5（`MAX_SAVE_SLOTS=5`）。

`global.c:889 PAL_ReloadInNextTick` + `res.c:191 PAL_LoadResources`：读档后下一 tick 才真加载资源。

### 10.2 一阶段承接

`packages/game/src/core/save/api.ts`（97 行）+ `indexed-db.ts`：
- 5 槽（`api.ts:15 MAX_SAVE_SLOTS=5`）。
- `SlotMeta`（`api.ts:17-30`）：partyLevel/cash/sceneId/savedAt/savedTimes（引 `SAVEDGAME_WIN.wSavedTimes` 真值算法 `uigame.c:589-597`）。
- IndexedDB 持久化 + in-memory fallback（`api.ts:51-53 idbAvailable`）。
- `indexed-db.ts:19`：DB version bump → `onupgradeneeded` 清空旧存档（开发期存档可作废）。
- **无运行时归一化**——直接 `structuredClone(gs)` 存/取，依赖 GameState 字段冻结（Sync.1）。

### 10.3 reforge 现状

`packages/reforge/src/save/`：
- `types.ts`：`SAVE_VERSION = 1`（`:8`）；`SavePayload`（`:33-41`）= version + projectId + contentVersion + world + position。
- `store.ts`：`SaveStore` 抽象（`:4-9` putSlot/listMeta/getPayload/getThumb）+ `MemorySaveStore`（`:12-32`）+ `IndexedDbSaveStore`（`:39-94`，DB_VERSION=1，三 store meta/payload/thumb 原子事务）。
- `ops.ts`：`buildMeta`（`:5`）/`buildPayload`（`:21`，写 `version: SAVE_VERSION`）/`captureThumbnail`（`:31`）。
- `browser-state.ts`：浏览界面状态机（覆盖确认/光标移动/分页）。
- 30 槽（auto/quick/m01-m28，`types.ts:11-15`）——比 sdlpal 5 槽扩展。
- **无迁移/归一化函数**——`getPayload` 直返，无 `migrate(payload)` 或 `normalize(world)`。

### 10.4 缺口

| 缺口 | 等级 | 分类 | 详情 |
|---|---|---|---|
| **G10.1 读档无运行时归一化** | **中** | B | `SAVE_VERSION` 设计有（`types.ts:8`），但 `ops.ts`/`store.ts` 无 `migrate(payload)` 函数。后果：① bump SAVE_VERSION 后旧档读出字段缺失 → 运行时 undefined 崩；② CharacterInstance 加新字段（如 luck），旧档 party 无该字段 → effectiveStat 崩。行动：加 `migratePayload(payload): SavePayload`——按 version 分支补默认值 + 字段填充（`?? defaultValue`）；`getPayload` 后调归一化。**这是任务点名核对的「运行时归一化」缺口，确认存在**。 |
| G10.2 projectId 校验未在 store 层 | 低 | B | `SavePayload.projectId`（`types.ts:36`）注释「读档校验：防把 A 工程存档读进 B 工程」，但 `store.ts getPayload` 不校验——调用方（main.ts browserLoad）需自查。建议 store 层或 ops 层加 `assertProjectMatch`。 |
| G10.3 contentVersion 无迁移挂钩 | 低 | B | `contentVersion`（`types.ts:38`）与 SAVE_VERSION 分轴（格式 vs 内容），但无 content-level migrate 挂钩。工程内容大改时需补。 |
| G10.4 savedTimes 跨 slot counter 缺 | 低 | A | sdlpal `wSavedTimes = max(GetSavedTimes(1..5))+1`（uigame.c:589-597）显示「已存 N 次」。reforge SaveMeta 无此字段。低优（仅显示）。 |

---

## 附录 A · 高危缺口行动清单（按优先级）

> 接剧情/多场景/战斗全系列前**必须**处理，否则必然重蹈一阶段覆辙。

1. **G2.1 主循环无 accumulator**（高）——照搬 `main-loop.ts:66-137`，逻辑 tick 与 rAF 解耦。
2. **G4.1 SFX 无 lastSFX 去重**（高）——照搬 `audio.ts:52-66 createSfxDedup`。
3. **G1.1 soundfont 不预取**（高）——boot 顶部 `fetch` + 可玩门前 `await`。
4. **G8.1 场景缓存无 onEvict 联动**（高）——sprite 加 LRU 时三件套必备。
5. **G8.4 PAL_MakeScene 漏黑（W1）**（高）——harvest 已标，接 dense 场景必撞。
6. **G8.5 setPalette async（W7）**（高）——bootstrap 预载 PAT 同步 Map。
7. **G4.2 战斗 BGM 揭场静默**（中）——startBattle 加 battleIntroActive 门。
8. **G1.2 音频解锁 `once:true`**（中）——切 tab 回来 BGM 哑。
9. **G10.1 读档无归一化**（中）——bump SAVE_VERSION 必崩。
10. **G6.2 RNG in-flight Promise 缓存**（中，过场立项时）——O(N²) 黑屏。
11. **G5.1 AVI 全缺**（中，过场立项时）——trademark/结局。
12. **G7.1 FBP/结局全缺**（低，项目末期）。

---

## 附录 B · 已正确移植（核实通过）

- ✅ **G3 输入**：后按优先 + `!fRepeat` 边沿语义（`input.ts:12-20` 注释引 `input.c:213`）。
- ✅ **G4-bgm 四守卫**：secure context / RIFF / CC91=0+lock / skipToFirstNoteOn=false（`bgm.ts:79-106`）。
- ✅ **G4-bgm 同曲不重启 / stop 语义 / setEnabled 记账 / resume 防重入**（`bgm.ts:117-156`）。
- ✅ **G4 战后恢复场景曲**（`main.ts:900-903`）。
- ✅ **G9 per-role HP 解耦**（`content/character.ts` WorldState/CharacterInstance，无全局数组耦合）。
- ✅ **G8-mapCache protect + recency**（`main.ts:209-221`）。
- ✅ **相机 0x7F 偏移**（`main.ts:285-302 cameraOffset`，harvest W3 已标，本审计复核）。

---

## 附录 C · 审计方法备忘

- 三源对照：每条 sdlpal C path:line ↔ 一阶段 path:line ↔ reforge path:line。
- 锚点强制：所有缺口带 reforge `file:line`，便于直接跳转修复。
- 分类沿用 harvest：A 原版真值 / B 通用工程教训 / C 旧架构特有。
- 不切分支、不提交（按要求）。
- 数据采集：`git rev-parse HEAD = a3828b3035cefd95769a5c290af32ee921641805`，`date = 2026-07-05`。
