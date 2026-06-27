# 第一阶段引擎架构债审查报告（第二阶段重写输入）

> 生成日期:2026-06-22。性质:**不是第一阶段 bug 清单**(bug 审查见 `docs/plans/2026-06-07-sdlpal-diff-audit.md` 与 `2026-06-10-sdlpal-deep-audit.md`,145 条差异已全部收口),而是**「sdlpal C 思维搬进 TS 后留下的结构性耦合」清单**,作为第二阶段(Reforge)新引擎重写的**反面输入**。
>
> 方法:5 个 agent 按 subsystem 并行审计(`game-state` / `event-system` / `battle` / `shell` / `scene+present`),每个 agent 读全文件、给代码锚点(file:line + 片段)与第二阶段痛点判断,主审整合 + 战斗系统补充取证。共扫描 ~25 万行 TS。
>
> **定位**:本报告是 [p0-content-schema](content-schema.md)(schema 已定)与 P1(新引擎 spec,待写)之间的桥梁 —— schema 定了「应该长什么样」,本报告钉死「为什么旧那样不行、新那样必须在哪些点切干净」。每条 finding 都标了对应的 schema 决策或 design-backlog 议题。

## 怎么读这份报告

- **它不是要改第一阶段**。第一阶段铁律是「忠实还原」,这些「债」在第一阶段是优点(忠实于 sdlpal),**第二阶段铁律(见 [READ-FIRST.md](../READ-FIRST.md))要求全新重写、不照搬旧模块结构**,所以这份清单的用途是「重写时绕开这些模式」。
- 每条 finding 的字段:
  - **锚点**:第一阶段代码位置(file:line + 片段)——证据。
  - **为什么是债(第二阶段视角)**:不读 sdlpal,只从「现代化 / 解耦 / 可扩展 / 编辑器友好 / MMO 预留」反推。
  - **对应决策**:本条对应 [p0-content-schema](content-schema.md) 的哪节、或 [design-backlog](../design-backlog.md) 的哪条议题。
- **类别**:foundation(地基)/ interpreter(解释器)/ boundary(边界)/ render(渲染)/ shell(壳层)
- **优先级**:P0(新引擎立不起)/ P1(现代化天花板)/ P2(局部可替换)

## 统计

| 维度 | 数量 |
|---|---|
| finding 总数 | 18 |
| P0(地基,新引擎立不起来必须先动) | 10 |
| P1(现代化天花板) | 5 |
| P2(局部可替换,不阻塞主干) | 3 |

按类别:foundation 6 / interpreter 4 / boundary 2 / render 3 / shell 3

按对应:命中 [p0-content-schema](content-schema.md) §1–§9 全部 9 节、[design-backlog](../design-backlog.md) 议题 1/2/3/4/5/6。

---

## 🔴 P0(10 条)

### P0-1 `GameState` God Object · ~100 字段无分层【foundation】

**锚点**:`game-state.ts:649 export interface GameState` —— 单一 interface 扁平塞了约 100 字段。玩家私有(HP/cash)、世界共享(`rgEventObject`/`allEventObjects`/`rgScene`)、场景层(`npcs`/`sceneCommands`/`camera`)、战斗临时(`battleState`/`postBattleResume`/`prevBattleActions`)、UI 瞬态(`shakeTime`/`fadeState`/`paletteFadeState`)**全平铺在同一层**,只靠注释分块。

跨文件 mutate 热点:`event-system.ts` 32 处、`battle/battle-system.ts` 27 处、`menu/menu-driver.ts` 15 处、`present/present.ts` 54 处直接 `gs.xxx =`。`resetSceneRuntimeForNewGame`(`game-state.ts:1439`)要手工逐一 `gs.xxx = 0`,漏一个就串档(DM25 注释记录 wScreenWave/sWaveProgression/followers 回标题后残留)。

**为什么是债**:无法对任何子系统做独立测试 / 替换(每个系统都拿整个 `gs` 透传);快照必须序列化整坨含 `Map`、`Uint8Array`、函数回调,JSON 不可逆;新增字段要在 `createInitialGameState`/`loadDefaultGame`/`resetSceneRuntimeForNewGame`/`normalizePlayerRolesRuntime` **四处**同步登记(注释 :1748 自承「四处手写易漏」)。

**对应决策**:[p0-content-schema §1 三层状态模型](content-schema.md)—— L1 世界态 / L2 场景静态 / L3 场景运行态。本 finding 是这条决策的**直接证据**:第一阶段正是因为没有这条边界,才堆出一个 100 字段 God Object。

---

### P0-2 SoA 定长数组照搬 + roleId 魔数 6【foundation】

**锚点**:`game-state.ts:530-554 PlayerRolesRuntime` —— 23 个 `number[]`/`number[][]` 全是定长 6(roleId)/ 5(元素)/ 6×6(装备槽×roleId)/ 32×6(魔法槽×roleId),直接照搬 sdlpal `WORD rgwHP[MAX_PLAYER_ROLES]`。魔数 `6` 散落(`:1711`/`:1760`/`:1787`),没有 `MAX_PLAYER_ROLES` 集中定义。

`rgwEquipment: number[][]` 是 `[slotIdx][roleId]`(`:538`),但 C 布局是 roleId 在内层(`p[operand[1] * MAX_PLAYER_ROLES + role]`,`:571`)→ 已经因为 C struct 内存布局歧义在 `EquipmentEffectRoles` 上产生 row-index hack(`:583-599` 注释「非 stat row 的 0x17 写入 → log skip」)。

更隐晦的是 roleId 3=巫后、4=阿奴的名字指针对调(CLAUDE.md 锚点: `rgwName@0x220 = [36,37,38,40,39,41]`)→ `rgwHP[3]`(巫后血量)与 `rgwName[3]=40`(阿奴名字)**不同轴**。一个「角色」在 SoA 里被拆成 23 个独立数组,没有 `Role { hp, mp, name, ... }` 实体。

**为什么是债**:「加一个角色」「角色可变数量」「同 role 两份独立 HP」全做不到;跨数组一致性靠各 opcode 手工同步,**三套回写路径**(`writeBackBattleRolesToRuntime` 只回写 HP/MP,升级另写,Extra 槽不回写)。MMO 实例化根本无从谈起。

**对应决策**:[p0-content-schema §9 角色/实体状态建模(实例 + 组件 + 外观解耦)](content-schema.md)。本 finding 钉死了为什么要拆「身份 = 实例 id」「状态 = 实例组件」「外观 = 由装备算」—— 原版把这三件事焊死在 roleId 上。

---

### P0-3 下标当身份 · 三套语义混用 · 412 处【foundation】

**锚点**:三种下标身份混用 ——
- `partyMembers: number[]`(`game-state.ts:671`,slot→roleId)
- `followerFrozenOffset[1..]`(`:749`,slot 索引)
- `partyScriptedFrame: Record<number, number>`(`:666`,key 是 memberIdx)
- `prevBattleActions: Map<number, BattleAction>`(`:1078`,key 是 roleId)

注释 `:1074` 自承「原版按战斗槽保存会在换队后串到其他角色,这里按角色归属恢复」—— 打了补丁但根因未除。

更糟的是 NPC 有**两套下标身份**:`npcs[id-1]`(scene-local,`:294`)vs `allEventObjects[globalId]`(全局 0-based,`:1173`),靠 `sliceSceneEventObjects`(`:2008`)切片引用桥接。全代码库下标式访问(`rgwHP[|rgwMP[|partyMembers[|.npcs[|rgwEquipment[|rgwMagic[`) **412 处 / 39 文件**;`gs.<mutableField> =` 赋值 **496 处 / 37 文件**。

**为什么是债**:换队 / 离队 / 重新入队时所有按 slot 存的状态要手工清理;调试时 `partyMembers[2]` 是谁必须查表;新增内容(加 NPC、改队伍)会牵动他者 —— 直接违反第二阶段铁律第 5 条「杜绝下标式身份、加删内容不牵动他者」。编辑器做出来加删 NPC 会让别的 NPC 串号。

**对应决策**:[p0-content-schema §2 稳定身份(杜绝下标)](content-schema.md)。本 finding 是这条铁律的**量化证据**(412 处),也是 [design-backlog 议题 1「核心系统重写」](../design-backlog.md)的根因之一。

---

### P0-4 19 个模块级 handler 单例 + 无 command/event bus【boundary】

**锚点**:`event-system.ts:537-991` 有 **19 个模块级 `let _xxxHandler`** 单例(`_fetchPalette`/`_getPalette`/`_sceneLoader`/`_mapReloader`/`_obstacleChecker`/`_startBattleHandler`/`_shopMenuHandler`/`_rngPlayHandler`/`_showFbpHandler`/`_scrollFbpHandler`/`_endingAnimationHandler`/`_loadLastSaveHandler`/`_quitHandler`/`_refreshEquipmentsHandler`/`_objectPoisons`/`_enemyObjectsTable`/`_storeTable`...),每个配 `setXxx(fn)` setter,bootstrap 启动时逐个注入。

`CommandBus` 类型虽传入 `tickEventSystem(gs,input,bus)`,但 opcode 执行**不走 bus** —— 绝大多数副作用是 `gs.直接写` + handler 闭包。测试已大量 `setGlobalEvents([])` reset 互相污染(`event-system.test.ts:1197` 等)。

**为什么是债**:模块级单例 = 全局可变状态,**无法多实例 / 并行战斗 / 编辑器沙箱 / 单元测试隔离**。这条直接堵死 MMO 预留(铁律第 5 条「给 MMO 留状态分层口」)—— 多玩家、多场景实例化全卡死,因为 `setGlobalEvents` 改的是进程级 module 状态。也没有 effect/command 边界,无法做「录制所有副作用 → 回放 / 撤销 / 网络同步」。

**对应决策**:[p0-content-schema §1 三层状态模型](content-schema.md)(L1/L2/L3 必须是实例字段,不是 module 全局)、[design-backlog 议题 1](../design-backlog.md)。新引擎的核心运行时对象必须是**可实例化的**,handler 注入收敛为显式 `RuntimeDeps`。

---

### P0-5 解释器三份重复 switch · 164 opcode 无 handler 表【interpreter】

**锚点**:opcode dispatch 被拆成三份重复 switch ——
- `tickEventSystem`(`event-system.ts:1894`,~920 行,字符串 tag + 部分内联 raw)
- `applyRawOpcode`(`:3474-4841`,97 个 `OP_*` case,~1370 行,最长函数)
- `runScript`(`:2872-3072`,**几乎完整复制** `tickEventSystem` 的 end/goto/showDialog/raw 分支)

每个 switch 各自维护 `ip++` / `return` 语义,没有统一 opcode handler 接口。CLAUDE.md 已记 0x8A 漏事件侧 → 石长老战变手动。

**为什么是债**:新增 / 修改 opcode 要改 3 个 switch + `mode.ts:42` 的 `waiting` 白名单 + `tickSceneAutoFadeIn`;漏一处就是静默 bug。**更关键**:第二阶段 P2 编辑器要做「可视化事件编辑」,opcode 没有 handler 表就无法做「节点 → 行为」的注册式映射 —— 编辑器拖一个「移动精灵」节点,引擎里找不到对应的 handler 注册项。

**对应决策**:[p0-content-schema §6 事件 & 演出建模](content-schema.md)(「原版 opcode 走兼容执行器,新创作走时间线模型」)。两条路径都需要 `Map<Opcode, OpcodeHandler>` 注册表作为骨架 —— 本 finding 钉死了为什么不能照搬旧的 switch 结构。

---

### P0-6 双解释器 fall-through · 签名不一致 · 语义差只在注释【interpreter】

**锚点**:`battle-opcodes.ts:361 dispatchBattleOpcode`(44 case,只处理战斗特定 op)→ 未消费时 `runScript`(`event-system.ts:2970-3005`)fall 到 `applyRawOpcode`。两侧签名不一致:`applyRawOpcode(gs, opcode, operands[3], eventObjId?, cursor?)` vs `dispatchBattleOpcode(opcode, operands[], ctx)`。

同一 op(如 `OP_SHAKE_SCREEN`)在战斗侧要**特殊改写**(`:2983` 不走 `applyRawOpcode` 的 `gs.shakeTime=`,改写 `battleCtx.pendingScreenShake`),靠 `// D26` 注释钉住。`0x50` battle 里静默无效、`0x4F FadeToRed` 仍只 event 侧,都是这类坑。

**为什么是债**:「哪些 op 在两侧语义不同」这信息只存在于散落注释里,没有 `OpcodeRuntime` 表声明「此 op 在 explore/battle 各是什么行为」。统一解释器前要先考古,迁移成本高。

**对应决策**:[p0-content-schema §6](content-schema.md)。新引擎 OpcodeHandler 接口应显式声明 `explore` / `battle` 两套副作用(或单一解释器 + per-mode 适配层)—— 本 finding 说明「探索侧 / 战斗侧 opcode 语义本来就不同」是真问题,不能假装统一。

---

### P0-7 解释器状态机:13 种 `waiting` 字符串散落【interpreter】

**锚点**:`waiting` 字段有 13 个字面量值(frame-wait / camera-pan / fade-screen / palette-fade / scene-fade / scene-load / shop / rng-play / show-fbp / scroll-fbp / ending-anim / dialog / confirm / wait-key / delay / quit)。`tickEventSystem:1493-1640` 是约 130 行 `if (cursor.waiting === 'xxx') return` 早返回链;`mode.ts:38-42` 还**另开一份**白名单决定是否跑 autoScript。

CLAUDE.md 记录的「`paletteFadeState` 孤儿曾致香兰报信永久吞键」「切场景全黑两层」根因都在这。

**为什么是债**:状态转移无单一来源,新增一个 blocking opcode 要改至少 4 处。13 个字符串是隐式状态机,没有 transition 表 —— 漏一个收尾就是孤儿状态。第二阶段想做「时钟虚拟化 / 确定性回放 / SSR / 编辑器单步」全卡死,因为阻塞源是三套不一致机制混用:时间类(`performance.now()` 轮询)、资源类(等 bootstrap 回调)、模态 UI(注入 handler),时间类还**直接依赖 wall-clock** 无法在测试里快进。

**对应决策**:[p0-content-schema §6](content-schema.md) + [design-backlog 议题 5「演出/cutscene 系统」](../design-backlog.md)(「黑屏拆正交两维:底层冻结与否 × 遮罩层内容」)。新引擎要显式 `Interpreter` 对象 + continuation 抽象 + 注入时钟。

---

### P0-8 `all.json` 扁平全局数组 + 全局 ip 空间【interpreter】

**锚点**:`bootstrap.ts:1182-1187` fetch `events/all.json` → `flatMap(seg => seg.commands)` → **压成一个扁平全局数组** `setGlobalEvents(allCommands)`,存入模块级 `let _globalCommands`(`event-system.ts:731`)和 `_globalLabelMap`(`:732`)。所有 cursor(trigger / onEnter / autoScript / poison / battle)**共享同一全局 ip 空间**索引这一个数组(`jumpToGlobalIp:3557`、`resolveLabelIp:795`)。

场景事件靠额外 fetch `events/scene-${mapNum}.json`,但**脚本本体仍在全局数组** —— scene json 只是触发器/对象元数据。边界靠注释维持,代码层无类型区分(同一个 `Command[]` 既是全局脚本又是 autoScript 片段)。

**为什么是债**:单一全局可变数组是经典 C `lprgScriptEntry[]` 直译,所有 ip 都是脆弱下标(违反铁律第 5 条)。扁平化丢掉了 `segments` 的结构边界,无法把「场景 X 的事件」作为可装卸单元 —— 这正是第二阶段「场景自包含」目标(p0 schema §4)的反面。编辑器里想只改某场景的事件都做不到隔离。

**对应决策**:[p0-content-schema §4 场景包(自包含) + §8 迁移器](content-schema.md)(「拆 `all.json` 全局脚本 → 各场景 + `shared/`,label 局部化」)。本 finding 是这条迁移步骤的**存在性证据**:迁移器必须干这件事,因为旧引擎就是靠全局数组耦合的。

---

### P0-9 cutscene 独占靠 `gs.suspendRaf` 全局 flag · 打穿 core/shell 边界【boundary】

**锚点**:`bootstrap.ts` 里 `gs.suspendRaf = true/false` 被设了约 **30 次**(`:1005/1018/1029/1049/1280/1307/1329/1364/1617/1758/1852...`),每个 `try/finally` 成对。主循环 `bootstrap.ts:496 if (gs.suspendRaf) return` short-circuit present。

四个 player(avi/rng/fbp/ending)**各自直接 `flushToCanvas` 绕过 present 层**(`rng-player.ts:209`、`fbp-player.ts:95/109`、`ending-player.ts:174`),各自 `await sleep()` 驱动帧 —— 与主循环 rAF 完全并行,**两套时钟**。资源 fetch 散落各 handler(`bootstrap.ts:1350 fetchMgoSprite` 内联、rng/fbp 各自 manifest)。

**最危险的一点**:`core` 的 `GameState.eventCursor.waiting` 反过来引用 `'rng-play'`/`'show-fbp'`/`'scroll-fbp'`/`'ending-anim'` 等 **shell 概念**(`game-state.ts:252-256`)—— **core 知道了 shell 的播放器类型,core/shell 边界被打穿**。

**为什么是债**:任何 cutscene 改动都要同时改 core 字段 + shell flag;两套时钟无法确定性回放;core 知道 cutscene 类型 = 强耦合。这条不解决,CutsceneController / ModeController 都立不起来。CLAUDE.md「SW 预缓存 4 坑」「time-based 状态要有兜底收尾人」都是这条债的衍生。

**对应决策**:[p0-content-schema §6](content-schema.md)(「黑屏拆正交两维」)+ [design-backlog 议题 5](../design-backlog.md)。新引擎要 `CutsceneController` 统一抽象(独占画面、抢键、时钟虚拟化),core 只产「播 cutscene X」的 effect,不知道 cutscene 怎么播。

---

### P0-10 普遍直接 mutate · 无快照 / 事件溯源【foundation】

**锚点**:`loadDefaultGame`(`game-state.ts:1394`)、`resetSceneRuntimeForNewGame`(`:1439`)大段 `gs.xxx = 0` mutate,无 diff、无事件。存档 = `structuredClone(gs)`(注释 `:1741`、`:308` 自承「瞬态随 deepClone 入档」),整对象深拷贝含不可序列化的 `Map`(prevBattleActions)、`Uint8Array`(fadeState.backupPixels :1266)。

战斗与大世界状态靠**手工双向投影**:`projectRuntimeToBattleRoles`(`:1502`)按 roleId 重建 battle role 对象,战斗内 hp 改动写回原 role 的 HP 槽;`writeBackBattleRolesToRuntime`(`:1681`)按 roleId 回写 —— 不是不可变 snapshot。

**为什么是债**:无 undo / replay / 时间旅行调试;多系统并发改同一 gs 字段(event-system 32 处 + menu-driver 15 处 + battle-system 27 处)无仲裁,回归靠 `docs/plans/*` 手记;存档体积大且脆(含 Map/Uint8Array)。**这条对 MMO 预留是硬伤** —— 没有 effect/command 边界,将来网络同步、客户端预测、服务端权威都得从零搭。

**对应决策**:[p0-content-schema §1 三层状态模型](content-schema.md)(L1 世界态 = 跟存档走,必须可序列化)+ roadmap §3 第 5 条「给 MMO 预留状态分层」。新引擎 core 应产 effect/command,持久层消费;瞬态不能进存档。

---

## 🟠 P1(5 条)

### P1-1 palette-indexed framebuffer · 无 alpha · palette 当状态根【render】

**锚点**:`framebuffer.ts:20-49 createFramebuffer` —— `Uint8Array(width*height)` 8-bit 索引 + 每帧 `for i: data[i*4]=palette[idx]` 全屏扫;`alpha=255` 硬写(`:44`)。

palette 不是色表而是**渲染状态的根**:`present.ts:193 stepPaletteFade` 直接 mutate `gs.palette.colors`;`:219-223` game-over remap 扫全屏像素把 idx `from→to`;`:584-590` 同样全屏扫 `paletteFadeState.remap`;`applyScreenWave` 在 indices 上逐行卷动;`applyDialogIconPaletteShift`(`:722-737`)轮转 `palette[0xF9..0xFE]`。半透明 UI / 粒子 / 多层视差没法表达,只能靠 palette nibble dither(`applyDitherSteps`,`present.ts:617-632`,sdlpal VIDEO_FadeScreen 72 帧算法)。

**为什么是债**:**铁律第 4 条「现代化、解耦、可扩展,给时间/天气/地图多层留位置」的天花板就在这**。所有现代效果(时间 / 天气 / 光照 / 多层 blend)都得挤进一个 Uint8Array + 一个 256 色 palette。当前架构「干净但天花板低」—— 想支持时间 / 天气 / 光照,要么保留 indexed fb + 加 post-processing LUT 层(可行但受限),要么整体换 RGBA + GPU。

**对应决策**:[design-backlog 议题 2 动态时间、议题 3 天气、议题 6 遮挡现代化](../design-backlog.md)。新引擎保留 indexed fb 作「风格层」(像素风骨),但在其上加 RGBA + GPU 后处理层;palette 从「状态根」降级为「资产」。

---

### P1-2 `present.ts` 上帝调用链 + DrawEntry 闭包数组【render】

**锚点**:`presentFrame`(`present.ts:166-675`,**510 行**)按 sdlpal `PAL_MakeScene` 顺序线性装配,顶部 **6 个早返回分支**(suspendRaf:178 / deathHold:208 / gameOver:214 / blackScreenHold:231 / sceneLoading:241 / paletteFade freeze:248),每个分支自己决定「画什么/不画什么」。mode 分叉在外层(`presentBattleFrame` `:752` 独立,menu 走 `drawMenuStack` `:644`)。

party/follower/0x98-follower/NPC 各自 push `entries.push({baseY, draw, id})`(`:292-578`)→ `entries.sort + for e of entries e.draw(fb)` —— sdlpal `PAL_SceneDrawSprites` 的 port,**每帧 alloc 几十个闭包**,GC 压力(第二阶段想稳定 60fps 得换对象池或 sorted index 数组)。状态判断散落:`gs.paletteFadeState` 在 present.ts 被读 5 次、`gs.menuStack` 2 次、`gs.fadeState` 2 次。

**为什么是债**:加 cutscene / weather / lighting layer 没有插入口,只能在 510 行函数中段插分支;没有 RenderGraph / scene-graph 抽象。第二阶段现代化必然的「换皮 / 响应式 / 动画过渡」无插入口。

**对应决策**:[design-backlog 议题 5 演出 cutscene、议题 6 遮挡](../design-backlog.md)。新引擎要 RenderGraph / layer 注册表,DrawEntry 用对象池或 sorted index 数组(不每帧 alloc)。

---

### P1-3 tilemap CPU 光栅 + `repairTilemapSeams` workaround【render】

**锚点**:`draw-tilemap.ts:92-151 drawTilemap` —— 双层(0/1)各自 `for r in [-1..height] for c in [-1..width]` 扫描,每 cell lower/upper 两张 tile。`repairTilemapSeams`(`:169-208`,注释「原版 PAL_MakeScene 不清屏,接缝处显示上一帧邻接地形;我们每帧 fb.clear() 露黑」)每帧最多 16 趟 8-邻接 dilation 填缝(`present.ts:270-279` + 模块级 `seamCoverageBuf` singleton,64KB coverage buffer)。

模块级 mutable 单例:`present.ts:155 seamCoverageBuf`、`screen-wave.ts:17 s_waveIndex`、`follower-pos.ts:17 frozenOffset` —— 纯函数面具下的隐式状态。

**为什么是债**:完全是 CPU 光栅化思路。上 WebGL/WebGPU instanced tile draw 时整段弃;模块级单例阻塞并发 / 分块渲染。`repairTilemapSeams` 这段 ~40 行 + 64KB buffer + 16 趟全屏扫描是「我们每帧 clear 露黑」的 workaround —— 换成 GPU + tile padding 自动消失。

**对应决策**:[p0-content-schema §5 地图 Schema(多层 + 碰撞层)](content-schema.md)(「N 视觉层 + 独立碰撞层」)+ [design-backlog 议题 4 地图分层扩展](../design-backlog.md)。新引擎用 GPU instancing,tile padding 消接缝;mutable 单例收敛为实例字段。

---

### P1-4 `bootstrap.ts` 1711 行 God 函数【shell】

**锚点**:`bootstrap()` 是单一 async 函数,`213-1880+` 行无拆分。所有模块装配在闭包内(`new BattlePresent()` `:407`、30 字段的 `presentCtx` 对象字面量 `:373-403`、`battleAssets` 15 字段手填 `:408-423`),装配顺序硬编码、强耦合(`createInitialGameState` → `makeWorkingPalette` → `sliceSceneEventObjects` → `BattlePresent` → `LoopContext` → `startRafLoop`)。`window.__tpgs = gs`(`:1912`)单例泄漏。

**为什么是债**:装配和实现混在一起,无法独立替换任何子系统、无法 mock 任何依赖做单测;新增模块只能在 God 函数里加片段。第二阶段要么整体推翻,要么花大成本拆 DI 容器。

**对应决策**:[design-backlog 议题 1 核心系统重写](../design-backlog.md)。新引擎要 DI 容器或显式 `RuntimeDeps` 装配对象;`window.__tpgs` 改为可选的 dev hook 注入。

---

### P1-5 follower 硬编码偏移 + trail 上限 3【foundation】

**锚点**:`follower-pos.ts:33-84 computeFollowerWorldPos` —— `m===2` 与其它分支写死 `offX/offY`(`:67-73`,`East||West ? -16 : +16`),不是数据驱动。`frozenOffset` 数组(`:17`)是骑乘/静止冻结快照,0xA1(全队聚拢)在 event-system 写 `{0,-1}` 重叠偏移。

多跟随者上限 = trail 深度:`follower-pos.ts:38 trail.length<=1 return null`;`follower-render.ts:51 trail[3+k]`;trail 在 `scene-system.ts:505 unshift + length=5` 截断 —— **总跟随者上限 = 3**(2 队员 + N 个 0x98 follower 各占 trail[2/3/4])。

上下层:`gs.wLayer`(`present.ts:341 baseY: gs.party.y + gs.wLayer + 10`)只在 sort key + cover iLayer 上生效,**blit 位置 wLayer 相消**(`present.ts:333-335` 注释)—— 即「视觉不抬高,只改遮挡序」。

**为什么是债**:队列扩容 / 宠物 / 召唤兽 / 真 Z 轴(桥下走 / 飞行)= 改 trail 数据结构 + 偏移表 + sort key 公式三处。第二阶段想做的「真立交 / 楼层」(p0 schema §5)无地基。

**对应决策**:[p0-content-schema §5 地图 Schema(真立交/楼层)](content-schema.md)。新引擎 follower 数据驱动(偏移表 + 容量配置);Z 轴进 sort key 且影响 blit 位置。

---

## 🟡 P2(3 条)

### P2-1 mode 是 switch + 输入无路由 + player capture 抢键【shell】

**锚点**:`mode.ts:15-88 tickByMode` 是 `switch (gs.mode)` if-else 链;`:85-87` battle/menu→event 同帧双驱动 hack(注释自承消除露帧,正是 CLAUDE.md「C 阻塞异步化丢同帧后续」的直接证据)。

`input.ts` **不是单例**(算优点 —— `KeyboardInputSource` 是类),但**没有路由表**:每个 mode 的 tick 各自从 `InputSnapshot` 按需读,`suppressHeldForFade`(`input.ts:107-118`)把 fade 领域知识塞进输入源。cutscene player 各自 `window.addEventListener('keydown', onKey, true)` capture 抢键(`rng-player.ts:145`、`fbp-player.ts:78`、`ending-player.ts:151`),与常驻的 `KeyboardInputSource` 抢键,靠 `stopImmediatePropagation` 互防泄漏(`avi-player.ts:94`)。

**为什么是债**:第二阶段做 InputRouter / IntentBus / ModeController 状态机时,现有「每个消费者乱读 + capture 抢键 + 输入源带领域知识」都要推翻。但单文件不大、可替换,不阻塞主干。

**对应决策**:[design-backlog 议题 5 演出 cutscene](../design-backlog.md)。新引擎要 ModeController 状态机 + InputRouter 路由表;输入源不带领域知识。

---

### P2-2 UI 全局坐标过程式 · 无组件树【render】

**锚点**:`draw-menu.ts:101 drawMenuStack` → `drawMenuEntry`(`:113`)按 `entry.kind` switch 分派到 `drawInGameMenu`/`drawInventoryMenu`/`drawPlayerStatus`/...。**函数式分派,不是组件树**:无父子关系、无 layout 容器、无 flex/anchor。

全局屏幕坐标硬编码:`draw-menu.ts:52-61 IN_GAME_MENU_BOX={x:3,y:37}`、`IN_GAME_MENU_ITEM_START={x:16,y:50}`、`SYSTEM_MENU_BOX={x:40,y:60}`、`CASH_BOX={x:0,y:0}` —— 全是 sdlpal `PAL_XY(...)` 真值的字面常量,无相对布局 / 响应式。

唯一可复用组件是 9-slice box(`draw-box.ts:70 drawBox`,SPRITEUI 3×3 网格 + shadow)。但 `draw-inventory.ts`(16KB)、`draw-player-status.ts`(14KB)、`draw-magic.ts`(14KB)各自直接调 `drawBox + renderText + drawNumber`,无组合。`menu-driver.ts`(45KB,core/menu)是单体逻辑驱动,与 draw-* 一一对应但分离。

**为什么是债**:换皮 / 响应式 / 动画过渡(第二阶段现代化 UI 必然需求)→ 整个 menu 层得重写成组件树 + layout 引擎,不能渐进改造。但这是局部债务,新引擎 P2 编辑器阶段才会痛。

**对应决策**:无直接 schema 对应(纯 P1 渲染层决策)。新引擎 UI 走组件树 + layout 引擎。

---

### P2-3 SW / 预缓存 / boot-loading · monkey-patch fetch + 模块单例【shell】

**锚点**:`precache-client.ts` 纯消息层(postMessage 到 SW),与游戏无耦合,`startPrecache/pause/resume` 由 `bootstrap.ts:486-491` 按 `_suspendRaf` 驱动 —— 这条线**干净**。

债务在 `boot-loading.ts:98-122 initBootLoading` —— **monkey-patch `globalThis.fetch`**,包一层计数器后还原。`precache-client.ts:28/32` 用**模块级 `_activeWorker/_pendingStart`** 单例,与「实例化 boot session」冲突。

**为什么是债**:第二阶段继承?SW 预缓存 + 两段进度 UX(虚线/实线)是 type-pal 特色,**值得继承**;但 `globalThis.fetch` monkey-patch 与模块级 SW 单例要重构成 BootSession 实例。是否继承取决于第二阶段是否还做「忠实还原 + 生产部署」目标。

**对应决策**:无直接 schema 对应。新引擎若继承 SW 能力,BootSession 实例化,fetch patch 移除。

---

## ✅ 资产:可直接继承的子系统(1 条)

不是所有旧代码都是债。第一阶段有一个子系统边界设计得很干净,**第二阶段可原样继承思路**:

### A-1 音频意图边界(core 不 import audio)【boundary】

**锚点**:`audio.ts:163-194 MusicBackend` 接口,core **完全不 import** `./shell/audio`(grep `core` 目录对 `shell/audio` 无匹配,只有 shell `bootstrap` import)。

边界是「意图队列」:core 设 `gs.wNumMusic`/`gs.musicLoop`/`pendingSounds: number[]`(SFX 意图);shell `bootstrap.ts:482 syncShellAudio` 每帧 drain + 轮询切曲。`MusicBackend` 抽象 MIDI/OGG 后端,可注入。

唯一小债:`audio.ts:147/156` 模块级可变 `let oggScale/curOggEl/sfxScale`(`setOggVolumeScale/setSfxVolume` 改模块全局)—— 多实例不安全,但当前只一实例,影响低。

**意义**:这条证明了「core 产意图、shell 消费、backend 注入」的边界是可行的 —— 其它子系统(cutscene、present)都做不到这点,是因为它们没建立这个边界。**新引擎的 CutsceneController / EffectBus 都应参考这套模式**:core 产 effect 描述,shell 消费,backend 注入。

---

## 反查表:P0 schema 决策 ↔ 本审计 finding

> 给 P1 新引擎 spec 作者用:写某条 schema 决策的实现时,回查本表看它对应哪几条债,就知道要在哪些点切干净。

| schema 决策 | 对应 finding | 切干净的标志 |
|---|---|---|
| §1 三层状态模型(L1/L2/L3) | P0-1, P0-4, P0-10 | GameState 拆成 World/SceneSession/UiSession;瞬态不进存档;core 产 effect |
| §2 稳定身份(杜绝下标) | P0-3 | 全代码库零 `xxx[i]` 当身份,一律 `xxx.byId(id)`;加删内容不牵动他者 |
| §3 世界变量层 | P0-1(部分) | 剧情进度显式命名变量,不靠对象状态隐式记 |
| §4 场景包(自包含) | P0-8 | 事件脚本随场景按需加载,ip 是 scene-local + label,不是全局下标 |
| §5 地图 Schema(多层 + 碰撞) | P1-3, P1-5 | GPU instancing + tile padding;N 视觉层 + 独立碰撞层;follower 数据驱动 |
| §6 事件 & 演出建模 | P0-5, P0-6, P0-7, P0-9 | `Map<Opcode, OpcodeHandler>` 注册表;显式 Interpreter + 注入时钟;CutsceneController 统一抽象;黑屏拆正交两维 |
| §7 内容工程目录 | P0-8 | 独立内容源,scene/<name>/ 自包含,迁移器拆 all.json |
| §8 迁移器 | P0-8, P0-3 | 全局下标 → 稳定 id;拆 all.json → 各场景 + shared/;label 局部化 |
| §9 角色/实体(实例 + 组件 + 外观) | P0-2 | Role 是实体(稳定 id + 可变 stats + equipment slots),不是 SoA 数组;party 存 roleId 引用;外观与 id 解耦 |

## backlog 议题 ↔ 本审计 finding

| backlog 议题 | 对应 finding |
|---|---|
| 1 核心系统重写 | P0-1, P0-3, P0-4, P0-10, P1-4 |
| 2 动态时间 | P1-1 |
| 3 天气 | P1-1 |
| 4 地图分层扩展 | P1-3, P1-5 |
| 5 演出/cutscene 系统 | P0-7, P0-9, P1-2, P2-1 |
| 6 遮挡现代化 | P1-1, P1-2 |
| 7 标签 + 相性 / 克制 | P0-2(角色身份实体化是其前置) |

---

## 横向备注

**三句话总结**:

1. **第一阶段是 sdlpal C 源的高保真直译,正确性极高**(注释密集对齐 C 行号、两轮 audit 145 条差异已清)。本报告列的「债」不是 bug,是「C 思维搬进 TS 后留下的结构性耦合」—— 它们在第一阶段是优点(忠实),在第二阶段是必须绕开的绊脚石。这正是 [READ-FIRST.md](../READ-FIRST.md) 铁律第 3 条「逻辑知识可移植,模块结构不照搬」要防的事。

2. **最危险的一刀是 P0-9(cutscene `suspendRaf` 打穿 core/shell)**,因为 `GameState.eventCursor.waiting` 里塞了 `'rng-play'` 这种纯 shell 概念 —— core 反过来引用了 shell 的播放器类型。第二阶段重写时,这个枚举耦合不清除,CutsceneController / ModeController 都立不起来。

3. **第二阶段铁律第 5 条「杜绝下标式身份」是高优先级的根本原因** —— 它在第一阶段代码里违反了 **412 处 / 39 文件**,而且 roleId/partySlot/globalId/localId 四套身份语义混用。这条不先立,编辑器做出来加删 NPC 会牵动他者。

---

## 已核对无显著差异 / 不在第二阶段范围内

以下子系统本次审计未发现 C 风格结构债,**或**属于第一阶段忠实还原必需、不进第二阶段重写范围:

- **战斗公式 / 魔法伤害**(`formulas.ts` / `magic-damage.ts`):无 roleId/magicId 硬编码特判,数据驱动;这是 [READ-FIRST.md](../READ-FIRST.md) 铁律第 3 条说的「可移植的逻辑知识」,新引擎直接重新实现即可。
- **敌方 AI fallback**(`enemy-ai.ts`):纯函数,同 seed 同 input 必同 output,数据驱动 wMagic/wMagicRate;脚本驱动的 wMagic 改写由上层接入。可移植。
- **RNG / 数学 / 数据结构**(rng.ts / battle-positions.ts / turn-queue.ts / status.ts):纯逻辑,无 C 风格耦合。
- **场景 LRU 缓存**(`loader.ts SceneAssetsCache`):Map 顺序 = LRU,带 protect/onEvict 回调,有测试。缓存本身写得干净 —— 问题在「场景不自包含」(P0-1/P0-8),不在缓存。
- **资源提取器**(`packages/pal-extract`):C→TS port 的真值锚是提取不变式(roundtrip-invariant),不属于运行时引擎,第二阶段重写不涉及(第二阶段内容源是独立工程,见 p0 schema §7/§8)。
