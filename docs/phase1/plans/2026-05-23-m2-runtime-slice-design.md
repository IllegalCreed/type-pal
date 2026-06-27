# M2 · 运行时垂直切片(探索)Design

> 这是 M2 的**设计文档**(brainstorming 产出),只讲"做什么 / 怎么组织 / 怎么验证"。
> 配套的 step-by-step 实施计划由 writing-plans 阶段产出,落在 `docs/plans/2026-05-23-m2-runtime-slice.md`。

## 与全局文档的关系

- 实现 `../03-development-plan.md` 的 **M2** 节(运行时垂直切片 · 探索)。
- 全部架构 / 决策依据来自 `../02-architecture.md`(四层 / 命令总线 / 协程式步进器)、`../04-decisions.md`(D12–D18 / D20 / D21 / D22–D25)、`../05-events-schema.md`、`../06-testing.md`。
- 消费 M1 产物 `data/extracted/`(`@type-pal/shared` 的 Command / Tilemap / Palette / SpriteFrame 等类型已在 M1 钉死)。
- 对 `pal-extract` 顺手做两项 M1 应做未做的补丁(见下方"对里程碑划分的调整")。

## 对里程碑划分的调整

`../03-development-plan.md` 的 M1 节里写过"该场景所用精灵的索引位图 PNG + 帧偏移 JSON | 各精灵 MKF",M1 实施时收窄到只做 tile bitmap,角色 / NPC sprite 省略了(见 `2026-05-23-m1-pal-extract.md` 末尾"实施过程发现")。M2 的端到端目标是"跑真原版数据" —— 队伍 / NPC 若是占位色块,**渲染路径少走「真索引位图 × 调色板查表 × anchor」**这一段,等于砍了 D12 验证。所以 M2 顺手把这两件 M1 漏的事补上:

| 工作项 | 原 03 安排 | 本设计 |
|---|---|---|
| 切片场景所用角色 / NPC 精灵提取 | M1 设计标 M1,M1 实施跳过 | **M2 顺手补**(队长 + scene 1 NPC) |
| scene 1 事件对象 dump(NPC 列表 + 坐标 + sprite id + 触发段名) | 未定义 | **M2 新增**(`data/extracted/data/scene-1.json`) |
| ~10 个 opcode 具名扩展(M2 跑 scene 1 onEnter / NPC trigger 卡哪具名哪) | M3+ 按需补 | **M2 顺手扩**(M1 留下的兜底机制就是为这种增量准备的) |
| 其他 MKF 补全 / 全场景资源 / 全数据表 | M4 | M4(不变) |
| NPC auto 行为(闲逛 / 待机动画) | 未明确归宿 | **M2 不做**,留 M5 / M6 |

**理由**:M1 的"实施过程发现"明确警告过几次"假设和真实数据不符,直到真跑才暴露"。M2 如果用手写 demo NPC 跑通事件系统,意味着 EventSystem 对真原版 events.json 形态的契合度等 M3 战斗切片时才被验证 —— 风险大。补 sprite + 跑真 scene 1 NPC,M2 的"端到端"就是真的端到端。

## 范围

### 1 Shell 层(浏览器入口 / 主循环 / 输入)

- **bootstrap.ts** —— 装配各层 + 资源加载 + 启动主循环。canvas 已在 M0 的 `index.html` 准备好。装配顺序:① Assets 全部加载完(否则 fail-fast) → ② 初始化 GameState(party 初始坐标取自 scene-1.json 的某约定字段或临时硬编码 / scene-001 onEnter 脚本里通常会设;实施时定) → ③ 把 scene 1 `onEnterLabel` 对应 commands 装进 eventCursor、`mode=event`(进场跑 onEnter 脚本) → ④ 启动主循环。onEnter 跑完撞 `end` 自然切 explore。
- **main-loop.ts** —— `requestAnimationFrame` + 固定步长(100ms / 帧,= 10fps 探索模式)。切后台不补帧。
- **input.ts** ——
  - `KeyboardEvent.code` → 抽象按键(`Up / Down / Left / Right / Confirm / Cancel / Menu`),含 WASD 别名。
  - 双模型 `held`(走路用)+ `pressed`(本 tick 新按下,菜单用)。方向键最新按下优先。
  - **抽象成 `InputSource` 接口**,M2 实现 `KeyboardInputSource`;`ReplayInputSource` / `RecordingInputSource` 留接口(D14 day-1 要求),不实现真 UI / 持久化。

### 2 Present 层(索引帧缓冲 / 绘制)

- **framebuffer.ts** —— 320×200 索引色帧缓冲(`Uint8Array`),每帧调色板查表写入 `ImageData`,再 `putImageData` 上屏。`<canvas>` 已是 320×200 物理像素 + CSS 缩放,无需额外缩放代码(D12)。
- **draw-tilemap.ts** —— 读 tilemap cells + 当前相机位置 + tile bitmap 表,把可见区域写进帧缓冲。原版 tilemap 是**菱形错排**(每行错半格),按 sdlpal `map.c` 的渲染方式实施。
- **draw-sprite.ts** —— 索引位图 + anchor 渲染。每像素 = 调色板下标,直接写帧缓冲(下标 0 = 透明,与原版一致)。
- **draw-dialog-box.ts** —— 对话框背景 + Unifont CN 字形(D11)。字库准备:Unifont CN 子集打包进 `packages/game/src/assets/font/`(只取出现在切片对话里的字符,避免拉全字库)。
- **present.ts** —— 一个 tick 末走一遍:画 tilemap → 画 NPC sprites → 画队长 sprite → 叠对话框(若 `dialogBox` 非空)→ flush 帧缓冲到 canvas。

### 3 Core 层(GameState / 模式机 / 系统 / 命令总线)

- **game-state.ts** —— 单一真相源(D6 + 02 约定),可序列化。M2 字段:
  ```ts
  interface GameState {
    party: { col: number; row: number; facing: Facing }   // 仅队长
    camera: { col: number; row: number }                    // 派生量也可,先存
    npcs: NpcState[]                                        // 从 scene-1.json 加载
    mode: 'explore' | 'event'
    eventCursor?: { commands: Command[]; labelMap: Record<string, number>; ip: number; waiting?: 'dialog' }
    dialogBox?: { text: string; style: DialogBoxStyle }
    currentDialogStyle: DialogBoxStyle                       // 由 0x003B-0x003E 累积
    frameNum: number
  }
  ```
  > 注:`eventCursor.commands` / `labelMap` M2 内 inline 持有(单场景成本不高、好实现)。M5 存档落 IndexedDB 时改成 `{ sceneId, ip, waiting }`,EventSystem 通过 Assets 反查 commands —— 此重构不破坏 M2 接口形状。
- **mode.ts** —— 顶层模式机分发(M2 只有 `explore` / `event` 两态)。
- **command-bus.ts** —— 同步队列 FIFO。M2 内 Core 系统 `bus.emit(cmd)` 入栈,tick 末 Present 一把 `drain()`。**可等待命令的异步回执机制 M2 不激活**(M2 只有 `showDialog`,完成判定走 Core 内部 `waiting='dialog'` + `pressed=Confirm` 标志,不需要跨层回执);接口形状(`bus.emit` 返回一个 `cmdId`,Present 可 `bus.complete(cmdId)`)留下,M3 转场 / 视频时激活。
- **scene-system.ts** —— `explore` 模式 tick:
  - 读 `held` → 计算下一格 → 查 tilemap cell 的碰撞位 → 写回 party。
  - 读 `pressed=Confirm` → 看 facing 前格有没有 NPC,有则按 NPC.triggerLabel 查 label→index 映射、装 eventCursor(`commands` 指向已加载的 scene-001 commands 数组、`ip` = label 对应 index)、切 `mode=event`。
  - 相机:简单跟随 party,带边界 clamp(到地图边缘不再滚)。
- **event-system.ts** —— 协程式步进器(D15 + 05),`event` 模式 tick:
  - 不在 waiting 状态:**循环**取当前 ip 的命令直到撞到 waitable(`showDialog`)、`end`、或 mode 切换。这一帧内连跑多条命令对应原版 trigger "整段跑完,中途阻塞" 的语义(避免每 tick 1 条造成 onEnter 几十条 raw 拖出 1-2 秒画面冻结)。死循环保护:单 tick 最多跑 256 条,超就抛错 + log(防 goto 回跳 + raw skip 形成无限循环)。
  - 每条命令 `switch on op`:
    - `sequence` —— 不会出现(原版反汇编不产此命令;若 M2 后期手写新内容用上,加载时展平)
    - `showDialog` —— 读 `text`(disasm 已内联) + 当前 `currentDialogStyle` → 设 `dialogBox` + `waiting='dialog'` + `bus.emit({op:'showDialogBox', text, style})` + **break 出本 tick 循环**
    - `goto` —— 查 label→index 映射跳转(`ip = labelMap[cmd.to]`)
    - `end` —— 清 eventCursor + 清 dialogBox,切 `mode=explore`,**break**
    - `setDialogStyleTop/Center/Bottom/Narration`(M2 新增具名,见下) —— 更新 `currentDialogStyle`,ip++
    - **未具名 raw**(目前 events.json 大头) —— **no-op skip + console.debug(ip, opcode, operands)**,ip++。理由:scene 1 onEnter 段大量 raw 是无关紧要的环境设定(setBGM / setPalette / 设事件对象初始状态等),抛错会让 M2 寸步难行;skip 让流程往前走,卡到真关键的 op 时(死循环 / 进战斗 / 切场景)再具名。
  - waiting 状态:每 tick 看 `pressed=Confirm` → 清 waiting,ip++,**继续循环**取下一条(下一条若是 showDialog 即同一 tick 内立刻进入下一句对话的 waiting,无空帧)。

### 4 Assets 层

- **loader.ts** —— 启动期一次性加载:
  - `tilemap-1.json` + `scene-1.json`(新)+ `palette-0.json`(选一个,scene 1 的默认调色板)
  - 全部 323 个 `tile-scene-1-*.png`(索引位图,8-bit grayscale PNG,像素 = 调色板下标)
  - 队长 sprite + scene 1 出现的所有 NPC sprite(`sprite-NNN-frame-MM.png` + `sprite-NNN.json`)
  - scene-001.json 事件文件(M2 用其中的 NPC trigger 段)
- 失败 = fail-fast,canvas 上画红字 `assets missing: <path>`,不重试。
- 资源路径:M2 用 Vite 配置(`server.fs.allow` 或 publicDir symlink)把 monorepo 根 `data/extracted/` 暴露给 dev server;`vite build` 时把 `data/extracted/` 拷进 `dist/`。**实施时决定具体方案**(symlink 是首选,简单)。

### 5 pal-extract 增量(顺手补 M1 的债)

- **角色 / NPC sprite 提取(切片)** ——
  - 复用 M1 的 `io/rle.ts` + `resources/sprite.ts`(parseSpriteChunk 已踩坑)
  - sprite 源 MKF + chunk 号按 sdlpal `palcommon.c` / `global.c` 查,实施时定
  - 至少覆盖:队长(4 方向 × 走路帧),scene 1 全部 NPC 的待机帧
  - 产物 `images/sprite-NNN-frame-MM.png` + `data/sprite-NNN.json`(SpriteFrame 数组,含 anchor)
- **scene 1 事件对象 dump** —— 新产物 `data/extracted/data/scene-1.json`,schema:
  ```ts
  interface SceneObjects {
    sceneId: number
    mapNum: number
    onEnterLabel: string            // scene 进入即跑的脚本入口在 scene-001.json 里的标签
    eventObjects: {
      id: number
      x: number
      y: number
      sSpriteNum: number
      triggerLabel?: string         // scene-001.json 里被 M1 disasm 放在该 NPC trigger ip 上的标签
      autoLabel?: string            // 同上,auto 入口
    }[]
  }
  ```
  数据源 = SSS.MKF chunk 0(EventObject 数组)+ chunk 1(Scene 数组),M1 已解析。**注**:M1 实测每个 `scene-NNN.json` 只有一个段 `scene-N.entries`,内含整场景全部可达指令;入口靠 label 区分(`L_59` 这种标签由 M1 disasm 自动放在原始 chunk 4 各 entry ip 上)。`scene.ts` 把原始 EventObject 的 trigger / auto 入口 ip 反查到对应 label 名,dump 进 `scene-1.json`,运行时按 label 索引到 commands 数组。
- **~10 个 opcode 具名扩展** —— `events/opcodes.ts` 注册表里给以下 opcode 具名(实施时按 sdlpal `script.c` 对清楚字段):
  - `0x003B-0x003E` `setDialogStyle{Top,Center,Bottom,Narration}`(M2 EventSystem 必读)
  - **跑 scene 1 onEnter / NPC trigger 时发现的卡点 opcode**(预计 5-10 个,实施时具名)
  - 其他 raw 留 raw,M3+ 按玩法增量补
- **不在 M2 范围的 pal-extract 工作**:剩余 MKF 格式补全(F / PAT / SOUNDS 等)、全场景资源、全数据表 → M4 不变。

### 6 测试基建增量

- 核心层 Vitest 单测(主战场,见"测试策略")
- 一条 E2E Vitest(headless 主循环 + 录好的输入序列,验证 D14 输入接口可回放性)
- **不**做:Present 截图快照(M7)、sdlpal 差分(M3)、`.RPG` 解析(M3+)、dev 调试面板(按需)。

## 不在 M2 范围

- 场景切换 / 传送 / 转场(只 scene 1 一个场景)
- NPC auto 行为(NPC 站着不动)
- 战斗触发(M3)
- 菜单(M5)
- 存档 / 读档(M5)
- 音频 / 视频(M6)
- 调色板循环动画 —— 若 scene 1 用的 palette 有 cycles 字段非空就跑、没有就 skip,不主动追求
- 输入录制 / 回放的真 UI / 持久化(只留接口形状)

## 模块组织

### `packages/game/src/`(M2 新建大头)

```
packages/game/src/
├── main.ts                              # 改:删 M0 hello-world,改成 import './shell/bootstrap.js'
├── main.test.ts                         # 改 / 删:M0 测试无意义,改成 bootstrap 装配的烟雾测试或删
├── shell/
│   ├── bootstrap.ts                     # 新建,装配 + 启动
│   ├── main-loop.ts                     # 新建,rAF 主循环
│   ├── input.ts                         # 新建,InputSource 接口 + KeyboardInputSource
│   └── *.test.ts
├── present/
│   ├── framebuffer.ts                   # 新建,320×200 索引缓冲 + 调色板查表
│   ├── draw-tilemap.ts                  # 新建,菱形错排
│   ├── draw-sprite.ts                   # 新建,索引位图 + anchor + 透明色
│   ├── draw-dialog-box.ts               # 新建,Unifont CN 字形
│   ├── present.ts                       # 新建,一帧装配 + 命令消费
│   ├── font.ts                          # 新建,Unifont CN 子集 → glyph 表
│   └── *.test.ts
├── core/
│   ├── game-state.ts                    # 新建
│   ├── mode.ts                          # 新建
│   ├── command-bus.ts                   # 新建
│   ├── scene-system.ts                  # 新建
│   ├── event-system.ts                  # 新建
│   └── *.test.ts
├── assets/
│   ├── loader.ts                        # 新建
│   ├── png.ts                           # 新建,8-bit grayscale PNG → Uint8Array(索引数组)
│   └── *.test.ts
└── data/font/
    └── unifont-cn-subset.<ext>          # 新建,Unifont CN 子集打包(实施时定格式)
```

### `packages/pal-extract/src/`(M2 增量)

```
packages/pal-extract/src/
├── resources/
│   ├── sprite.ts                        # 改:M1 已有,M2 加 extractCharacterSprites(...)
│   └── scene.ts                         # 新建,dump scene-1.json
├── events/
│   └── opcodes.ts                       # 改:加 ~10 个 opcode 具名条目
└── cli.ts                               # 改:总装时多产出上面两类文件
```

### `packages/shared/src/`(M2 增量)

```
packages/shared/src/
├── events.ts                            # 改:加 SetDialogStyleCommand + 其他 M2 具名 opcode 对应 Command 类型
├── resources.ts                         # 改:加 SceneObjects(NPC 列表)+ DialogBoxStyle 联合类型
└── input.ts                             # 新建,InputSource / InputSnapshot / AbstractKey 类型(共享只用于类型,运行时实现在 game)
```

`shared` 加 `input.ts` 看起来"游戏运行时类型不应跨包",但 D14 的 record/replay 文件格式是序列化的 InputSnapshot[],未来 e2e 测试 / dev 工具可能落到 pal-extract 侧(如生成确定性输入回放),把类型定义住、双向引用,有备无患。M2 内目前只 game 包用。

### 关键不变量

- **核心层无浏览器依赖** —— `core/` 下任何文件不 import `document` / `window` / `requestAnimationFrame` / `HTMLCanvasElement`,可在 Node + Vitest 直接跑。这是 D14 录制回放、D21 sdlpal 差分、自主端到端回放 测试的基石。
- **GameState 是唯一真相源** —— 4 个系统读写它,Present 只读它 + drain 命令总线。
- **命令总线只单向** —— Core → Present,反方向输入走 InputSource。
- **AbstractKey 是核心层与 Shell 的契约** —— Core 只见 AbstractKey,不知道 `KeyboardEvent.code` 长啥样。
- **资源路径只在 Assets 层** —— Core / Present 不知道资源放哪,只见已加载好的 typed 数据。
- **opcode 注册表仍是单一数据源**(M1 不变) —— M2 新增的具名 opcode 也走 `events/opcodes.ts` 注册表,disasm / recompile 双向对偶,round-trip 仍逐字节通过。

## 数据流(典型 NPC 触发)

```
[Space keydown]
  → KeyboardInputSource.pressed.add(Confirm)
  → 主循环 tick:input.nextSnapshot()
  → SceneSystem.tick(snapshot, gs):
      Confirm + facing 前格有 NPC → 查 NPC.triggerLabel → labelMap[label] = idx
                                  → eventCursor = { commands: scene001Commands, ip: idx }
                                  → mode=event
  → tick 末 Present.drain(bus):画 tilemap → sprites(此 tick 暂无对话框)
  → 下一 tick(100ms 后):
  → EventSystem.tick(snapshot, gs)(event 模式):
      循环取 commands[ip]:
        setDialogStyle... → currentDialogStyle 更新,ip++,继续
        raw / goto / 其它非 waitable → 处理,ip 更新,继续
        showDialog → 设 dialogBox + waiting='dialog' + emit,break
  → tick 末 Present.drain():画 tilemap → sprites → 叠加对话框
  → [Space keydown 再次] → pressed.add(Confirm)
  → 下一 tick EventSystem.tick():
      waiting + Confirm → 清 waiting + ip++
      继续循环:下一条若再是 showDialog → 同 tick 内再 break(用户感知:连续对话顺畅)
                若是 end → 清 eventCursor + dialogBox + mode=explore + break
```

> 注:scene 1 **onEnter 段**(`onEnterLabel`)在 bootstrap 装配阶段就装进 eventCursor + 切 mode=event,主循环一启动第一 tick 就开始跑;onEnter 整段(几十条 raw + end)在第一 tick 内连跑完(loop-until-waitable),撞 end 切 explore,玩家看到地图后即可走。

## 错误处理

- **资源加载失败**(fetch 404 / JSON parse 错 / PNG 解码失败) → canvas 上画红字 `assets missing: <path>`,主循环不启动。个人自用,不重试。
- **碰撞表越界**(camera / party 算到 cells 范围外) → 视作不可走 / 不渲染,不抛错。
- **EventSystem 撞到完全未登记的 raw opcode** —— 不会发生(M1 已全部 ~97 个登记,raw 只是没给字段具名)。
- **EventSystem 撞到具名 op 但字段缺**(例如 showDialog 没 messageIndex) → 抛错 + log(数据问题,要现场看)。
- **跨段 goto 失败**(label 不在加载的 commands 里) → 抛错 + log(数据问题)。
- **未知抽象按键** —— InputSource 内 swallow,只产已知键。
- **Input record/replay 接口** M2 只暴露形状,无错误处理。

## 测试策略

按 `../06-testing.md` 的"重档"路线(D21)。M2 落实四类:

### 1 核心层 Vitest 单测(主战场)

- **CommandBus**:`emit` / `drain` 行为、空 bus、多次 emit。
- **SceneSystem**:
  - 喂极小 fixture tilemap(手造 4×4)+ 初始 GameState + 一串合成 InputSnapshot → 断言 party.col/row/facing 变化序列。
  - 碰撞:fixture cell 标"不可走",断言 party 撞墙不动。
  - NPC 触发:fixture 含一个 NPC,party 走到面前 + Confirm → 断言 mode = event + eventCursor 装载正确。
- **EventSystem**:
  - 喂手造 commands(`showDialog` → `end`)+ 模拟 Confirm pressed → 断言 GameState.dialogBox / mode 转换 + bus.emit 序列。
  - raw skip 行为:喂 commands 含 raw → 断言 ip 前进且不抛错。
  - `setDialogStyleXxx` → 断言 currentDialogStyle 更新。
  - goto / label:喂带 label 的 commands → 断言跳转。
- **Input**:`KeyboardInputSource` 输入 → snapshot 行为(held/pressed 分离、最新方向优先)。`KeyboardEvent` 用 jsdom 或手造 `{code:'Space'}` mock。

### 2 集成 / E2E Vitest(一条)

- **headless 主循环**:把主循环抽到一个不依赖 rAF 的 `tickN(n, source)` 函数 + 录好的 InputSnapshot[](向右走 3 步 → Confirm → Confirm)→ 用 `ReplayInputSource` 喂 → 跑 N tick → 断言最终 GameState mode=explore + dialogBox 已清。
- 这条同时验证 D14 输入接口的可回放性。

### 3 dev 验证清单(手测)

- `pnpm dev` → 浏览器开 → 看到 scene 1 真实地图 + 真队长 sprite + 真 NPC sprite
- 方向键(或 WASD)走路,墙撞不动
- 走到任一 NPC 面前 → Space → 看到 scene-001.json 里那段 trigger 真版对话(用真原版台词)
- 再 Space → 对话消失,可继续走
- 控制台日志:raw skip 时 console.debug 输出 opcode + ip,便于后续具名追加

### 4 pal-extract 增量回归

- M1 已有的 91 个单测继续跑全绿(对 sprite.ts / opcodes.ts 改动不破坏 round-trip)。
- 全量 events round-trip 仍逐字节通过(M2 新具名 opcode 必须严格对偶)。
- 新加的 sprite 提取 + scene-1.json dump 各加几个 fixture 单测。

## 完成定义

1. `pnpm dev` 跑通 dev 验证清单(见上)
2. `pnpm extract` 重跑产出新加的 sprite / scene-1.json,M1 已有产物字节级不变
3. `pnpm check` 全部包 typecheck + 单测绿(含 M1 旧测试 + M2 新测试)
4. 全量 events round-trip 仍逐字节通过
5. `../03-development-plan.md` 的 M2 状态更新到"已完成",指向 M3
6. `../04-decisions.md` 加 D26+(若有新决策,如 sprite 提取移到 M2、Vite 资源暴露方式等)
7. README 当前状态更新到 M2 已完成

## 第三方依赖

`game` 包目前 deps 只有 `@type-pal/shared` + devDep `vite`。M2:

- **运行时**:不加新 deps。Unifont 字库以二进制 / JSON 资源形式打包进 `src/data/font/`,不引第三方字体库。
- **dev**:若 Vite 配置需要插件做资源暴露(symlink 不行时),可加最小插件;尽量靠 Vite 内置 `server.fs.allow` 解决。
- **测试**:Vitest 已有。`KeyboardEvent` mock 用 jsdom(若已在 root devDep 里则不加,否则放 `game` 包 devDep)。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| 跑 scene 1 onEnter / NPC trigger 时碰到的 raw opcode 远超预期(具名工作量爆) | EventSystem 默认 no-op skip 而非抛错,即便 raw 没具名也不卡;具名只挑"真卡执行流"的 opcode(死循环 / 进战斗 / 跳场景),其他 raw skip 不影响 M2 完成定义 |
| 角色 sprite 在 MGO.MKF 的 chunk 号 / 帧布局与 tile sprite 不同(M1 踩过坑) | 参 sdlpal `palcommon.c` 的 sprite 解析路径;实施时先 dump 一个验证再批量 |
| NPC 渲染顺序(精灵深度排序)/ 菱形错排实现细节 | 按 sdlpal `map.c` 的渲染逻辑实施;M2 切片单场景,深度问题可手测 |
| Unifont 字库子集如何按需打包(全字库太大) | 实施时跑一遍切片对话用到的所有字符 → 子集 → 落进 `src/data/font/`;切片增长后再扩 |
| Vite 把 monorepo 外 `data/extracted/` 暴露给 dev server 的最简方案 | 首选 `packages/game/public/extracted/` symlink → `../../data/extracted/`,vite 默认行为即可;失败则 `server.fs.allow` |
| 入口怎么对到 scene-001.json | 实测 M1 每个 scene-NNN.json 只一个段 `scene-N.entries`(全部可达指令合并),入口靠 `label` 区分。`scene-1.json`(新)dump 每个入口对应的 label 名;EventSystem 启动时一次性建 `label→index` 映射,按 label 入口跳转 |
| dialog box 的 Confirm 关闭可能跟"按 Space 走下一步"冲突 | M2 简化:对话框显示帧的 Confirm 不再走 SceneSystem(模式机隔离 — event 模式 SceneSystem 不 tick) |
