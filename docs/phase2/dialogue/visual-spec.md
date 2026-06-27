# 切片 1 子任务：对话框外观继承原版（spec for Claude）

> 2026-06-26 立。承接 [backlog 议题 14 对话外观子项](../design-backlog.md)。
> **目标**：reforge 当前对话框是自编样式（粗框 + 右上角"继续"文字），作者不满意。**代码已重构（纯状态机 dialogue.ts，对的），但外观要继承原版。**
> 本文档把原版外观真值（第一阶段已 1:1 复刻在 `packages/game/src/present/dialog-box.ts`）整理成 reforge 可直接移植的清单。
>
> **⚠ 2026-06-27 修正**：原稿误称字模 = 原版 FONT.MKF。实为 **GNU Unifont CN 简体点阵**（第一阶段实现，见 §1）——原版 FONT.MKF 是繁体 BIG5、简体缺字 + 无 Latin，做不了 ② 的 i18n（zh + 将来 en）。② 字体端口 Unifont，**不碰 FONT.MKF**。

## 原则

- **行为 = 已重构的纯状态机**（`packages/reforge/src/dialogue.ts` 的 start/advance/currentLine）。**不动。**
- **外观 = 原版真值**（`packages/game/src/present/dialog-box.ts` 已 1:1 port sdlpal）。**移植。**
- 两者解耦：外观是渲染函数 + sprite 资产，行为是状态机。

## reforge 当前缺口（对照原版）

| 外观项 | 原版真值（dialog-box.ts） | reforge 现状 | 优先级 |
|---|---|---|---|
| 框背景 | **不画 box**（透明 typing 多行），仅 narration/item-box 画 SingleLineBox | ❌ 画了粗黑框 | 高 |
| 头像 | RGM.MKF RLE，top@(48-w/2,55-h/2) / bottom@(270-w/2,144-h/2) | ❌ 无 | 高 |
| 姓名牌 | `:` 结尾判定，CYAN_ALT(0x8C) 色，独立位置(top@(80,8)/bottom@(4,108))，不计入行 | ❌ 自绘"游魂："同行 | 高 |
| 正文位置 | top@(96/44,26) bottom@(20/44,126)，行高 18px，4 行/屏 | ❌ 简陋分行 | 高 |
| 字体色 | FONT_COLOR_DEFAULT 0x4F + 三层阴影(+1,0)/(0,+1)/(+1,+1) color0 | ❌ 系统宋体 | 高 |
| 字模 | **简体点阵 GNU Unifont CN**（第一阶段实现，**非**原版 FONT.MKF） | ❌ 系统字体 | 高 |
| 光标图标 | DATA chunk 12，3 形态(0默认/1`)`/2`(`)，画**当前行末尾**非右下角 | ❌ 右上角"继续"文字 | 高 |
| 光标闪烁 | palette 0xF9-0xFE 每 100ms 轮转（icon 常显） | ❌ 无 | 中 |
| 逐字符打字 | iDelayTime*8 ms/字（**默认 iDelayTime=3 → 24ms/字，约 42 字/秒**），`$NN` 变速 | ❌ 无（整行瞬显） | **高（详见下）** |
| 控制符 | `"`黄/`-`青/`'``@`红/`~NN`尾停顿/`\`转义 | ❌ 无 | 中 |
| 4 style | top/center/bottom/narration | ❌ 仅一种 | 低（切片1先用bottom） |
| 自动播放 | `~NN` 收尾 = 自动延时推进，无光标 | ❌ 无 | 低（DLC-01鬼话可不用） |

## 移植清单（给 Claude 的具体指引）

### 1. 资产加载（dialog-assets.ts 对应物）

reforge 需要这几类对话资产（第一阶段已有解析逻辑，可端口）。**⚠ 字模不走 MKF**（见下），头像 / 光标才是原版 MKF：
- **字模**：⚠ **不是 FONT.MKF**。第一阶段用 **GNU Unifont CN**（简体点阵 BDF → `data/font/glyphs.json`），端口 `packages/game/src/present/font.ts`（`loadGlyphs` + `renderText` / `renderColoredText`，已含三层阴影 + 逐字上色）。原版 FONT.MKF 是繁体 BIG5、简体缺字 + 无 Latin，做不了 ② 的 i18n，故弃用。
- **头像**：RGM.MKF RLE chunk → portraitFrames: Map<number, DialogSprite>
- **光标图标**：DATA.MKF chunk 12 → iconFrames: Map<number, DialogSprite>（frame 0/1/2）
- **narration box**（可选，切片1可不做）：SPRITEUI frame 44/45/46

### 2. 渲染函数（替代 main.ts 里的 drawDialogueBox）

直接 port `dialog-box.ts` 的 `drawDialogBox`，但：
- 输入从 `Framebuffer` 改为 `CanvasRenderingContext2D`（reforge 用 Canvas2D）
- 像素写入从 `fb.writePixel` 改为 ImageData 操作或 drawImage（参考 render.ts 的 bakeFrame）
- 保持所有**位置常量、色值、判定逻辑**不变（这些是 sdlpal 真值）

关键函数（port 时保留原版签名/常量）：
- `getDialogTextPos(style, hasPortrait)` — 正文位置
- `getDialogTitlePos(style, hasPortrait)` — 姓名牌位置
- `getPortraitPos(style, w, h)` — 头像位置
- `isCharacterNameLine(text)` / `shouldRenderAsTitle` — 姓名判定
- `parseDialogText` — 控制符解析（逐字符色 + 打字时序）
- `drawTextLine` — 三层阴影文字

### 3. 关键真值速查（避免再查 sdlpal）

```
字体色（palette index）：
  DEFAULT = 0x4F (79)   普通对话默认
  YELLOW  = 0x2D (45)   " toggle（仅 !isDialog）
  RED     = 0x1A (26)   ' toggle
  CYAN    = 0x8D (141)  - toggle
  RED_ALT = 0x17 (23)   @ toggle
  CYAN_ALT= 0x8C (140)  姓名牌色

位置（320×200 坐标系）：
  正文 bottom: (hasPortrait?20:44, 126), 行高 18
  姓名 bottom: (hasPortrait?4:12, 108)
  头像 bottom: (270-w/2, 144-h/2)
  正文 top:    (hasPortrait?96:44, 26)
  姓名 top:    (hasPortrait?80:12, 8)
  头像 top:    (48-w/2, 55-h/2)

排版：
  MAX_LINES_PER_PAGE = 4（第 5 行触发等键翻页）
  LINE_HEIGHT_PX = 18
  FRAMES_PER_CHAR = 1（@10fps = 100ms/字）
  iDelayTime 默认 3（每字 3*8=24ms 基数）

光标：
  DATA chunk 12，frame 0=默认箭头 / 1=`)` / 2=(`
  画在当前行末尾（measureText 算 x），非固定位置
  闪烁 = present 层 palette 0xF9-0xFE 轮转，icon 本身常显

姓名判定：
  末字 0xff1a(：) / 0x2236(∶) / 0x3a(:) → 姓名牌
  仅首行 + 非 center style 才当姓名
```

### ⚠️ 打字速度查证（2026-06-26，作者反馈"第一阶段比原版慢"）

**作者感觉是对的。查证结果：**

| 引擎 | 打字表现 | 根因 |
|---|---|---|
| **原版 sdlpal** | **24ms/字，流畅逐字**（iDelayTime=3 × 8） | 真值（text.c:885/1600） |
| 第一阶段 game | 算法 revealAt 24ms/字**数值对**，但 tickDialog 每帧 100ms 才调度一次 → **每 100ms 蹦出 ~4 字，成块卡顿** | 10fps 采样率（`FRAME_MS_EXPLORE=100`）太低，把流畅逐字打成 4 字一跳 |
| reforge | **整行瞬显，无打字** | dialogue.ts 没有 typing 状态，advance() 直接给整行 |

**关键数字：**
- 原版打字 = **24ms/字**（不是 spec 之前误写的 100ms/字 —— 那是 tick 间隔，被误当成每字间隔）
- 流畅逐字需要 **≥40fps 采样**（24ms/字 → 每字一帧需 ~42fps）
- 游戏逻辑主循环 = **10fps**（探索模式，卡顿感是设计）

**新引擎的正确做法（reforge 必须照此，避免重蹈第一阶段覆辙）：**

> **打字动画的时钟必须和逻辑主循环解耦。**

sdlpal 原版就是独立的 `UTIL_Delay(iDelayTime*8)` 阻塞延时（高频），不挂在 10fps 游戏循环上。新引擎应该：

- **渲染层**（present）跑高频（60fps），独立推进"已显示字符数"的视觉进度
- **逻辑层**（core 10fps）只管"对话状态机推进"（start/advance/page/end）
- 打字进度 = `now() - lineStartMs` / `24ms`，**不依赖 tick 帧数**

伪代码：
```ts
// 渲染层每帧（60fps）算一次，不进 tick
const elapsed = performance.now() - state.lineStartMs
const charsShown = Math.floor(elapsed / 24)  // 24ms/字
// 渲染 text.slice(0, charsShown)
```

**这正是 backlog 议题 14 的精神**：对话是状态（core 10fps），打字是演出（present 高频），两者隔离 → 既保留 10fps 的探索卡顿感，又有流畅逐字。第一阶段的 bug 根因就是把打字塞进了 10fps tick。

**对切片 1 的指引**：dialogue.ts 加 `lineStartMs` 字段；渲染层用 `performance.now()` 算 charsShown；逻辑层 advance() 不变。验收时打字应是流畅逐字，不再是 4 字一跳。

### ⚠️ 第二个独立 bug："按一下全显"丢失（作者核心痛点）

> 作者补充：原版按一下回车/空格整段字全显；第一阶段"卡卡的，要按很多遍空格"。这是**和打字速度无关的另一个 bug**，根因在状态机的行间推进逻辑。

**sdlpal 真值**（text.c:1616）：打字中按 Confirm → `fUserSkip=TRUE` → 当前行瞬显 + **同段后续行也瞬显**（fUserSkip 跨行持续）→ 玩家按一下整段全过，行间不等键。

**第一阶段的 bug**（2026-06-26 二次实证，逐行核对 event-system.ts:1714-1831 + dialog-box.ts:512-528 + input.ts:95-102）。

> ⚠️ 本节修正了 1db604b 那版的实证偏差：旧版画的 `lineDoneRenderPending=true → return(1822)` 路径**只对 `~` 尾行成立**（`tickDialog:484` 仅 `currentLineEndedWithTilde` 才设该 flag）。普通行根本不经过 1822。真实根因是两个**独立叠加**的机制，下面分述。

**根因一句话**：sdlpal 的 fUserSkip 是「**同步阻塞调用栈内的一次性连锁瞬显**」；第一阶段把 `PAL_ShowDialogText` 异步化成 10fps tick 状态机后，「一次按键」被 `pressed.clear()` 切成单 tick 边沿，且每个行间转换被 `skip-typing → return` 强行拆成独立 tick（各 100ms），于是「按一下全显」退化成「按一下过一行，且按键容易对不上 tick 被吞」。

**机制 A — 每个行间转换至少多耗 1 tick（100ms）**（主因）

普通行（非 `~`）跳字路径 —— `confirmDialog`（dialog-box.ts:527）走 `phase='line-done'` 且**不**设 `lineDoneRenderPending`：
```
Tick N   按 Confirm → confirmDialog 'skip-typing'(1763) → userSkip=true, phase=line-done, return
Tick N+1 line-done → 1820 lineDoneRenderPending? 否 → 1824 ip++ → 跑下一条 showDialog
Tick N+2 下一行 appendDialogLine(userSkip=true → 瞬显 dialog-box.ts:364-368, phase=line-done) → return
Tick N+3 又 ip++ ...
```
每行额外耗 1 tick = 100ms。一段 4 行 ≈ 300ms 卡顿。

**机制 B — 连续按键被「单 tick 边沿」吞掉**（"要按很多遍"的直接原因）

`input.ts:102 nextSnapshot` 取完 snapshot 立刻 `this.pressed.clear()` → `pressed` 是**单 tick 边沿事件**，一个物理 keydown 只在**一个** logic tick 的 snapshot 里出现。配合 event-system.ts:1748-1750 的相位判定：
```ts
const dialogKey = ds.phase === 'typing'
  ? (input.pressed.has('Confirm') || input.pressed.has('Menu'))  // typing 只认 Confirm/Menu
  : input.pressed.size > 0                                         // line-done/wait 任意键
```
玩家在 Tick N（typing）按 Confirm → 跳字 → return；Tick N+1 此时 `phase=line-done`，玩家若**没在精确这一 tick 再按一次**（人手无法卡 100ms 窗口）→ `dialogKey=false` → 走 1824 自动 ip++。**第一次按键已在 Tick N 被 `pressed.clear()` 消费，不会延续到 N+1。** sdlpal 里这整段是一次同步栈，`dwKeyPress` 在栈内持续有效到函数返回 —— 没有 tick、没有 `pressed.clear()`、没有「按键窗口」。

**`~` 尾行特例**（比文档旧版说的还卡）：`tickDialog:484` 对 `currentLineEndedWithTilde` 设 `lineDoneRenderPending=true` → 1820-1822 命中 → **额外再 return 一 tick**。即 `~` 尾行行间转换 = 2 个 tick（200ms）。

**reforge 必须避开这两个坑**：
- dialogue.ts 当前是纯状态机、**没有 `lineDoneRenderPending` 这种隐式等待态**——保持这个设计。绝不为「修渲染」往状态机塞等待态（渲染问题在渲染层解：确保满行帧被画出，不在逻辑层堵）。
- **fUserSkip 跨行持续语义要忠实 sdlpal**：跳字后同段后续行全部瞬显，直到翻页 / `~` 段末 / 新对话才复位（text.c:1447/1553/1607/1815 四个复位点）。这是"按一下全显"的根。
- **关键：一次按键的"连锁瞬显"必须在同一逻辑步内完成**，不能拆成多个 tick 各自等下一次按键。reforge 应让 advance/advanceAll 在**一次 core tick** 内把「当前页所有未显行」一次性设为瞬显 + 全部入页，而不是每行一个 tick。
- 输入消费要忠实 sdlpal 的 `dwKeyPress`（栈内持续），不要照搬第一阶段的 `pressed.clear()` 单 tick 边沿 + 相位分拆 —— 否则"按一下"必然退化成"按一下过一行"。
- 验收：按一下 Confirm → 整段（当前页所有行）**同帧**瞬显，不再每行卡一下、不要求多次按键。

**这两个 bug 的关系**：打字卡顿（渲染层 10fps）+ 按键要多次（逻辑层等待态）是**独立**的两个问题，原版都没问题所以"丝滑+按一下全显"，第一阶段两个都中招所以"又卡又要按很多遍"。reforge 要两个都做对。

### Bug3:`~NN` 尾行按 Confirm 卡死 / 无限重播（2026-06-26 修，dialog-box.ts + event-system.ts）

**现象**（用户实测，梦境开场第一句 `$10李～逍～遥，李～逍～遥！~30`）：打字中途按回车/空格跳字后，**不停按就永远卡在这句**，第二句出不来；观感像"台词无限重播"。

**sdlpal 真值**（text.c:1546-1554）：`~NN` 尾停顿是**固定时长同步阻塞** `UTIL_Delay(NN*80/7)` ——
- fUserSkip 已瞬显的字，到这里 `VIDEO_UpdateScreen` 刷一帧，然后**无条件等 ~NN**；
- 这个 delay 是同步阻塞，玩家在阻塞期间按的键只是「穿透」进 `dwKeyPress`、delay 照常走完 —— **不可重置、不可加速**；
- delay 结束后 `nCurrentDialogLine=-1; fUserSkip=FALSE; return`（:1552-1554）。

**根因（两层，都和 Bug1 wall-clock 修复 bdf6878 的副作用相关）**：

1. **跳字后卡到完整 doneAt**（Bug3，dialog-box.ts confirmDialog）：Bug1 把 `tickDialog` 打字推进改成 wall-clock（`elapsed = now - lineStartMs`），但 confirmDialog 的 `~` 跳字快进仍只改 `typingFrames`（tick 驱动）。跳字后 tickDialog 仍按 `lineStartMs`（行起始）算 elapsed → 必须**真实墙钟**走到 doneAt（含已消耗的打字时间）才推进 → 跳字后还要等 1.7s（梦境那句）。
2. **反复按 Confirm 无限重置尾停顿**（Bug3-2）：Bug3 最初的修法是跳字时 `lineStartMs = now - lastReveal`（假装此刻末字刚打完）。但玩家反复按时，confirmDialog 每 tick 都执行这条 → lineStartMs 跟着 nowMs 涨 → elapsed 永远 ≈ lastReveal → **永远到不了 doneAt** → 尾停顿被无限重置。

**修法**（对齐 sdlpal，dialog-box.ts confirmDialog）：
- confirmDialog 加 `now?: number` 参数（wall-clock，event-system/battle 传 `gs.nowMs`；缺省回退旧 tick 驱动供 battle）。
- `~` 尾行**首次**跳字：`lineStartMs = now - lastReveal`（假装此刻末字刚打完）→ 后续 tickDialog 算 `elapsed = (now2 - now) + lastReveal`，当 `now2 - now >= ~NN` 时 line-done。即**跳字后只等尾停顿**，忠实 sdlpal。
- `~` 尾行字已全显（`charsRevealed >= len`，已进入尾停顿等待）后再按 Confirm → **`return 'noop'`**（不重设 lineStartMs）→ 尾停顿不被无限重置，墙钟自然走到结束。

**验收**：`~30` 台词打字中途反复按 Confirm → 700ms 内推进到下一句（旧 1.7s / 无限卡死），不再"重播"。反复按无效（noop），忠实 sdlpal 同步阻塞语义。

### 4. content 数据扩展

> ⚠ **2026-06-27 实现回填**:本节是早期草案(fontColor/style/autoDelay 命名)。② 实际定型的字段见 [design §4](visual-design.md)。下面保留草案作历史对照,**以 design §4 为准**。

`DialogueLine` ② 实际字段(design §4 真值):
```ts
interface DialogueLine {
  speaker?: TextId         // 姓名牌 textId;省略=旁白。原版「末尾冒号」→此显式字段
  text: TextId             // 正文 textId(指向 locale 富文本)
  speed?: number           // ms/字,省略=24。原版 $NN 变速
  autoAdvance?: number     // ms;存在=打完停 N ms 自动推进、不等键、不画光标。原版 ~NN
  slot?: 'top' | 'bottom'  // 画哪个面板;默认 bottom。同槽覆盖/异槽共存
  portrait?: { icon: number; side: 'left' | 'right' }  // 头像 chunk + 左右;省略=无
  cursorFrame?: 0 | 1 | 2  // 等键光标形态;省略=0。原版 `(`/`)` 控制符→此字段
}
```

**颜色不进字段**——走 locale 富文本标记 `<yellow>`/`<cyan>`/`<red>`(① parseRichText),`text-render` 解析 spans 着色。

**autoAdvance 尾停顿不可加速**(sdlpal §Bug3 真值,② 已实现):打字中按 space=跳字瞬显;打完进入尾停顿后按 space=noop,必须等时间到。

### 5. 切片 1 验收标准

改完后，鬼话对话应该长这样（**2026-06-27 实现回填:全部已验 OK**）：
- [x] 无粗黑框（透明背景，文字直接叠在画面上）
- [x] "游魂"作为姓名牌显示在上方（CYAN_ALT 色），不计入正文行
- [x] 正文逐字打出（**24ms/字**，非 100ms —— 后者是笔误，见 §打字速度查证），带三层阴影
- [x] 每页 4 显示行后出现光标（DATA chunk 12），6 色轮转闪烁，位置跟随文字末尾
- [x] 用**简体点阵字模**（端口第一阶段 Unifont CN），不是系统宋体
- [x] 长句自动换行 + 按显示行分页（文案服务剧情,不被分辨率绑架）
- [x] slot 共存(同槽覆盖/异槽共存双框)、变速(speed)、autoAdvance(不可加速)、颜色标记、头像(占位)、光标 3 形

## 不在本任务范围（留后续）

- ~~头像实际加载~~ → **已做占位**(PNG);鬼气专属立绘等生图管线
- 4 style 全支持 —— 切片1用 top/bottom(center/narration 留后)
- ~~自动播放（`~NN`）~~ → **已做**(autoAdvance 字段)
- item-box / narration —— 等事件系统（议题14）
- 控制符的逐字符着色 —— **已做**(locale 富文本标记 + spans 着色)
