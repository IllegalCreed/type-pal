# 切片 1 子任务：对话框外观继承原版（spec for Claude）

> 2026-06-26 立。承接 [backlog 议题 14 对话外观子项](design-backlog.md)。
> **目标**：reforge 当前对话框是自编样式（粗框 + 右上角"继续"文字），作者不满意。**代码已重构（纯状态机 dialogue.ts，对的），但外观要继承原版。**
> 本文档把原版外观真值（第一阶段已 1:1 复刻在 `packages/game/src/present/dialog-box.ts`）整理成 reforge 可直接移植的清单。

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
| 字模 | 原版字模（FONT.MKF） | ❌ 系统字体 | 高 |
| 光标图标 | DATA chunk 12，3 形态(0默认/1`)`/2`(`)，画**当前行末尾**非右下角 | ❌ 右上角"继续"文字 | 高 |
| 光标闪烁 | palette 0xF9-0xFE 每 100ms 轮转（icon 常显） | ❌ 无 | 中 |
| 逐字符打字 | iDelayTime*8 ms/字（**默认 iDelayTime=3 → 24ms/字，约 42 字/秒**），`$NN` 变速 | ❌ 无（整行瞬显） | **高（详见下）** |
| 控制符 | `"`黄/`-`青/`'``@`红/`~NN`尾停顿/`\`转义 | ❌ 无 | 中 |
| 4 style | top/center/bottom/narration | ❌ 仅一种 | 低（切片1先用bottom） |
| 自动播放 | `~NN` 收尾 = 自动延时推进，无光标 | ❌ 无 | 低（DLC-01鬼话可不用） |

## 移植清单（给 Claude 的具体指引）

### 1. 资产加载（dialog-assets.ts 对应物）

reforge 需要从原版 MKF 加载这几类资产（第一阶段 `packages/game/src/assets/dialog-assets.ts` 已有解析逻辑，可端口）：
- **字模**：FONT.MKF → GlyphTable（renderText 用）
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

### 4. content 数据扩展

`DialogueLine` 可能要扩字段以支持原版能力：
```ts
interface DialogueLine {
  speaker?: string    // 已有；但原版姓名是靠文本末`:`判定，不是字段
  text: string        // 已有
  // 新增（可选，切片1鬼话可先用默认）：
  portraitIcon?: number    // 头像 RGM chunk index
  fontColor?: number       // 起始色（默认 0x4F）
  style?: 'top'|'center'|'bottom'|'narration'  // 默认 bottom
  autoDelay?: number       // ~NN 自动播放（鬼话不用，但留口）
}
```

注意：原版**没有 speaker 字段**，姓名靠文本末尾冒号 + 首行判定。reforge 的 `speaker` 字段是为了编辑器友好，渲染时应转换成"姓名牌"语义（若 speaker 存在，渲染时当 title 处理）。

### 5. 切片 1 验收标准

改完后，鬼话对话应该长这样：
- [ ] 无粗黑框（透明背景，文字直接叠在画面上）
- [ ] "游魂"作为姓名牌显示在左上（CYAN_ALT 色），不计入正文行
- [ ] 正文逐字打出（~100ms/字），带三层阴影
- [ ] 4 行后右下出现黄色箭头光标（DATA chunk 12），闪烁
- [ ] 用原版字模，不是系统宋体
- [ ] 翻页/结束的光标位置跟随文字末尾

## 不在本任务范围（留后续）

- 头像实际加载（切片1鬼魂可暂无头像，或用占位）—— 等生图管线
- 4 style 全支持 —— 切片1只用 bottom
- 自动播放（`~NN`）—— DLC-01鬼话是交互式，暂不需要
- item-box / narration —— 等事件系统（议题14）
- 控制符的逐字符着色 —— 可后置，先保证字模+位置+光标对
