# M3 - 迁移脚本去内联、按场景分片与体积门禁

Status: draft
Phase: phase2
Capability: M3(脚本迁移)
Coding Owner: Codex(待三签准入)
Reviewer: Opus + GLM
Visual Verification Owner: Codex + Opus
Unavailable Agents: none
Branch: main

## 目标

彻底取消 `goto/call/条件跳转` 目标的递归复制，并把脚本按“场景本地 / 跨场景共享 / 全局业务域”切成可独立加载的 chunk。每个可达脚本体只存一次，控制流边只存 O(1) 的具名跨 chunk 引用；进入一个场景时不得把全游戏脚本常驻内存。迁移后全库脚本总体积不得超过源 `all.json` 一个数量级，并为后续每次迁移建立自动失败门禁。

## 用户裁决(2026-07-13)

- 本问题必须彻查，不能只修几个超大巡逻实体。
- 不能因为 `goto` 导致场景脚本膨胀。
- 所有迁移后脚本总体积相对 `data/extracted/events/all.json` 至少保持在同一数量级；本卡把它定义为 **不超过 10 倍**。
- 必须保持场景脚本解耦：加载当前场景时只加载该场景脚本及实际依赖的共享 chunk；跨场景 call/goto 允许按需加载目标脚本 chunk，但不得因此加载目标场景地图、实体或全库脚本。

## 现状量化

统一以 UTF-8 字节计数：

| 指标 | 当前值 | 相对源 |
|---|---:|---:|
| `all.json` 磁盘 pretty | 5,470,901 B | 1.00x |
| `all.json` 规范化紧凑 JSON | 2,274,228 B | 1.00x |
| 原始指令数 | 43,503 | 1.00x |
| 迁移后脚本根规范化紧凑 JSON | 44,751,237 B | **19.68x** |
| 迁移后脚本根独立 pretty JSON | 110,156,998 B | **20.14x** |
| 迁移后递归 Command 节点 | 990,160 | 22.76x |

- 最大 8 棵循环 auto 树占 25,180,678 B 紧凑 JSON；删掉它们会暂时降到 19,570,559 B(8.61x)，但这只是碰巧过线，非循环共享 DAG 仍可被内联放大。
- 当前超过 10MB 的场景有 `s005` 25MB、`s035` 41MB、`s049` 32MB；最大单实体 auto 紧凑 JSON 约 4.25MB / 92,514 个递归命令。
- `MAX_ARM_BODY` 当前只检查顶层 `arm.length`，嵌套 `branch.then/onNo/onLose` 不计入预算，无法阻止结构树爆炸。
- `749c1ce3` 对 `s019/s176/s186` 的 34 个实体移植旧 depth-3 巡逻树只是临时止血。
- 第一阶段 D18 切片现状：295 个 `events/scene-*.json` 合计 3,958,558 B，`shared.json` 926,307 B，总计 4,884,865 B，仅为 `all.json` 的 **0.89x**。说明“可达性归属 + shared”能做到不复制；后来回退全局数组是旧运行时寻址/存档模型的问题，不是分片原则失败。

## 范围

- 范围内：按场景/共享/全局业务域分片的脚本库、`callScript/jumpScript` 跨 chunk 具名控制流、按需 resolver + LRU、迁移 CFG/SCC/归属算法、loader/editor round-trip、存档只存引用、脚本覆盖层、全库体积/单 chunk/驻留量门禁、运行行为回归。
- 范围外：把原版 opcode/IP 解释器带回运行时、紧凑化所有项目 JSON、无关内容域重迁、可视化脚本库编辑 UI。
- 明确不做：继续提高/降低 `MAX_ARM_DEPTH` 来碰运气；靠 compact JSON 掩盖 AST 复制；只在 auto 回环处打补丁后宣布根治。

## 上下文锚点

- 已拍板决策 / 铁律：遵守 `docs/phase2/READ-FIRST.md`；保持单一 clean ScriptRunner，不恢复原版 opcode 兼容执行器；脚本引用使用稳定业务 id，不暴露原始 IP 给作者 UI。
- 既有设计：`docs/phase2/foundation/script-model-m3-design.md:101-116,134-140` 已明确“goto 单前驱内联、多前驱提共享 Script(callScript)”和 M3c `callScript` 共享库；当前实现漏掉了共享库部分，才退化为递归内联。
- 分片真值：`docs/phase1/04-decisions.md:24`、`docs/phase1/05-events-schema.md:113-127` 与 `packages/pal-extract/src/events/slice.ts:1-203` 已实现“单场景可达归 scene、多个场景可达归 shared、全局物品/法术/敌 AI 强制 shared”。`docs/phase2/foundation/content-schema.md:23-40,50-67,125-147` 又明确第二阶段场景自包含、跨场景稳定 ref、`scenes/ + shared/`。
- 第一阶段回退教训：commit `6b58f9e8` 改成单一 `all.json`，是因为旧 cursor 曾内嵌 commands 导致存档带入 5.5MB、全局 IP/本地 IP 混用、raw 跳转目标与全局物品/战斗入口漏切。第二阶段必须用稳定 ref + chunk resolver + 完整 typed edge catalog 解决，不能照搬“全局数组常驻”。
- 代码锚点：
  - `packages/migrate/src/translate-events.ts:103-108`：现有 depth/body 护栏。
  - `packages/migrate/src/translate-events.ts:295-322`：具名 goto 当前直接切换 `at` 继续内联。
  - `packages/migrate/src/translate-events.ts:377-408`：条件跳转 `inlineArm` 与路径相关 `armMemo`。
  - `packages/migrate/src/translate-events.ts:861-893`：`0x04` call 当前递归内联。
  - `packages/migrate/src/migrate-content.ts:1384-1397`：trigger/auto 共用翻译上下文。
  - `packages/pal-extract/src/events/opcodes.ts:229-283`：旧切片单目标表；尚不足以表达 0x07 双臂、0x6D 双脚本指针等多目标边。
  - `packages/pal-extract/src/events/slice.ts:46-203`：第一阶段可达性切片与 shared 归属算法。
  - `packages/content/src/script.ts:28-178`：当前 Command / ScriptStage schema 尚无脚本引用。
  - `packages/reforge/src/script-runner.ts:251-289`：runner 顺序执行与 stop 收口。
  - `packages/reforge/src/loader.ts:41-108,204-243`：项目内容加载面。
  - `packages/editor/src/core/project-io.ts:66-114`：编辑器 content round-trip 面。
  - `packages/migrate/scripts/migrate-content.mts:93-107`：现有全量写盘会覆盖整个 pal content。
  - `packages/migrate/scripts/patch-scene-stages.mts:1-15`：现有离线补丁依赖盘上手工内容，不是可重复 overlay。
- 已知坑 / 审计：`docs/phase2/foundation/n-event-script-audit.md`、`am-asset-migrate-audit.md`、`phase1-knowledge-harvest.md` E6。
- 不得重新引入：递归内联跳转目标、路径相关结果写入全局 memo、trigger/auto 语义混用、全量写盘抹掉手工演出。
- 相关测试：`translate-events.test.ts`、`migrate-content.test.ts`、`pal-project.test.ts`、`script-runner.test.ts`、`loader.test.ts`、`project-io.test.ts`。

## Draft: 设计与风险

### A. 体积审计与硬门禁

新增可独立运行的脚本体积审计，固定输出以下三个口径：

1. `normalizedRatio = migratedNormalizedScriptBytes / sourceNormalizedBytes <= 10`。
2. `prettyRatio = migratedPrettyScriptBytes / sourceAllJsonFileBytes <= 10`。
3. `nodeRatio = migratedRecursiveCommandNodes / sourceCommandCount <= 10`。

其中迁移脚本总量包括全部 scene 的 `onEnter/onTeleport/trigger/auto` 根和共享脚本库；不得漏算嵌套臂或运行时换页脚本。另加每场景实际文件 `<10MB`、每个脚本根 `<1MB` 门禁。审计必须进入仓库 `pnpm check`，不是一次性统计脚本。

### B. clean 分片脚本库

新增可选内容域 `manifest.content.scripts -> content/scripts/`，不建立启动时整包加载的单一 `scripts.json`：

```ts
interface ScriptRef {
  chunk: string // 例如 scene/s001、shared/c03、global/items-00
  id: string    // chunk 内稳定脚本 id
}

interface ScriptChunkV1 {
  version: 1
  id: string
  imports?: string[]
  scripts: Record<string, Command[]>
}
```

- `content/scripts/index.json` 只保存 chunk 元数据(path/hash/bytes/imports)，不存全局脚本体；运行时引用自带 `{chunk,id}`，无需加载一张“全脚本 id -> 地址”巨表才能寻址。
- chunk 三类：`scene/<sceneId>` 放只属于该场景执行路径的脚本；`shared/<shard>` 放被多个场景真实执行的 SCC；`global/<domain-shard>` 放物品、法术、敌 AI、角色/毒等不属于具体场景的入口。
- shared/global 以 SCC 为不可拆单元做**稳定哈希分桶**：SCC 取最小稳定 script id 为主 id，按固定 hash 落入域内 shard；shard 数由首次全量审计选定后写死在迁移配置，禁止按当前大小顺序装箱导致新增一条脚本就重排后续所有 ref。目标 256KiB/chunk，硬上限 1MiB；单 SCC 自身超过 1MiB 直接门禁失败，不得再用一个超大 shared 文件兜底。
- `Command` 新增 `callScript{ref,self?}`(执行完返回调用点)与 `jumpScript{ref,self?}`(尾转移，不返回原体)；`self` 显式承载原版 0x04 改属主及实体根脚本的执行属主，禁止靠解析 id 猜。
- scene 的 `ScriptStage[]` 继续作为持久页阶段壳，保留 `next: advance | number`；迁移生成的 stage body 可缩为一条 `callScript`。动态 `setEntityAuto/setEntityTrigger/setSceneOnTeleport` 的迁移产物也必须保存 `ScriptRef`，不得把目标 stages 再嵌进去。
- 这是 clean AST 的具名控制流，不是原版 IP/opcode 解释器。普通手写工程可继续使用 inline stages；迁移产物必须使用 ref，二者走同一个 ScriptRunner。
- loader/FSA/HTTP/编辑器序列化必须完整 round-trip `scripts/`；脚本树查看器至少能按 ref 打开目标，不要求本卡新增完整共享库编辑 UI。

### B2. 归属规则：执行边与绑定边分开

- 先把 43,503 条源指令拆成基本块并求 SCC。`goto/call/条件分支/战斗败逃` 是**执行边**：按所有执行根的可达集合决定 scene-local 或 shared。
- `0x24/0x25`(改实体 auto/trigger)和 `0x6D`(改目标场景 onEnter/onTeleport)是**绑定边**：目标脚本归目标实体所在 scene 或目标 scene，不因“设置动作发生在别的场景”错误提升到 caller 场景；全局业务根绑定时仍引用目标 chunk。
- 如果同一 SCC 被两个以上 scene 的执行边真正调用，归 shared；如果只被一个 scene 执行，即使原始地址落在别的剧情区间，也归该 scene。归属只看稳定 root/edge，不按 `all.json` 地址邻近猜。
- 控制流边目录必须由一个 typed edge extractor 统一产出，覆盖：fall-through、end advance/reset、具名 goto、0x04、0x06、0x07 双臂、0x0A、现有全部 `JUMP_TARGET_OPERAND`、0x24/0x25、0x6D 的 op1+op2、0xA2 相对多目标，以及物品/法术/敌人/角色/毒数据表的全局入口。禁止继续使用“每 opcode 只能一个 target operand”的旧表作为唯一真值。

### C. Runner 控制流语义

- 新增 `ScriptChunkStore`/`resolveScript(ref)`：当前场景加载时只预取 `scene/<id>` 和它的直接执行依赖；跨 chunk call/jump 若未驻留则异步加载目标 chunk，绝不触发 `loadSceneDef` 或地图/实体/素材加载。
- chunk cache 使用 lease + LRU：当前 scene chunk 和正在执行的 runner 引用必须 pin；场景切换先 abort runner、释放 lease，再允许淘汰。默认驻留脚本序列化字节预算 8MiB；依赖闭包超过预算即审计失败，而不是退回全库常驻。
- `jumpScript` 通过 runner 内部尾转移循环切换目标体，不递归压栈；循环 goto 因此保持常量内存并可持续执行。
- `callScript` 使用受控调用栈，callee 正常结束后返回；仅真实 0x04 使用。设置明确的调用深度故障诊断，但不得把合法 goto 环误算成 call 深度。
- `AbortSignal`、`paceMs`、`selfId`、`stopScript` 必须跨引用保持；call 返回时恢复 caller self，jump 时把目标 self 带入尾转移；auto 的 100ms 指令节拍不能因拆库变快或变慢。
- `jumpScript` 从任何嵌套 branch 抛出的尾转移必须穿透当前命令体，由当前脚本执行循环接管；不得落穿执行父体后续。
- 存档和 `WorldScriptState` 只能持久化 `ScriptRef + stage/cursor`，禁止保存 `Command[]/ScriptStage[]`；这条直接封死第一阶段“游标把整库脚本 structuredClone 进存档”的回归。

### D. 迁移器改为图注册，不再展开边

- 迁移上下文维护 `ScriptRegistry`，键至少包含 `label + owner + 入口对话态摘要`，状态为 `unseen/translating/done`。首次遇到目标时登记并翻译一次；再次遇到(含正在翻译的循环)只发引用。入口态摘要承接 Opus R2：goto 同体续走时的 slot/portrait/speaker 不得因拆 chunk 被 fresh reset。
- 具名 `goto`、条件跳转命中臂、确认否臂、战斗败/逃臂等尾转移统一发 `jumpScript`；跳 0 仍发 `stopScript`。
- 真实 `0x04` 发 `callScript`；不得与 goto 共用“内联后补 stop”逻辑。
- 删除 `inlineArm` 递归复制与依赖它的 `armMemo/MAX_ARM_DEPTH` 主路径。护栏改为“注册脚本数量、单脚本递归节点、真实 call 深度”诊断，不再把 goto 深度当内容规模。
- 对 43,503 条源指令构建全库可达图，报告每个基本块/SCC 的前驱数、执行根集合、目标归属、未解析引用和不可达脚本；所有控制流边在 JSON 中必须是常量大小引用。

### E. 可重复迁移与手工演出保护

- 在写新脚本产物前，先把 `patch-scene-stages.mts` 的有效转换和 pal 手工演出整理为纯函数/显式 overlay，并在内存迁移结果上应用；不得再依赖“先读盘上旧产物再补”。
- 覆盖清单至少钉住 `s000/s001` 的 dither、speaker、center、李大娘两段式、对白锚点，以及现有脚本补丁脚本列出的 playVideo、四技、coveredBy、隐蛊等历史定制。
- 产品同步只允许改 manifest 的 scripts 目录、`content/scripts/**` 和明确列出的 scene 脚本绑定 JSON Pointer；实体静态字段、地图、资源、locale 等非脚本数据出现 diff 即失败。
- 全量生成必须可重复：连续运行两次第二次零 diff。

### 已知风险

- 风险：`jumpScript` 被实现成普通 await call，目标结束后落穿父体。缓解：独立尾转移信号 + runner 循环，单测钉嵌套 branch 穿透。
- 风险：owner 专门化仍产生跨 NPC 重复。缓解：先以正确性优先，10 倍总门禁约束；若仍超标，再单开 self 引用 schema，不在本卡暗加魔法字符串。
- 风险：共享库改变 auto 节拍或 stop/stage 语义。缓解：确定性 fake clock 比对引用前后命令轨迹、等待序列和 stage 结果。
- 风险：跨场景引用触发加载整个目标 scene，重新制造内存耦合。缓解：ScriptRef 只指 scripts 目录 chunk，resolver API 不接触 SceneDef/地图/实体 loader；网络与缓存测试钉死。
- 风险：chunk 过碎造成大量 HTTP 请求，过大又变相常驻。缓解：SCC 不拆、256KiB 目标装箱、1MiB 硬上限、依赖预取和 lease-LRU。
- 风险：旧切片漏 0x07/0x6D/全局数据入口。缓解：typed edge extractor + script.c/数据表完整目录 + 43,503 指令图覆盖，不复用单目标表直接下结论。
- 风险：全库重迁抹掉人工演出。缓解：overlay 先落、golden 先过，之后才允许写盘；白名单外 diff 直接退出非零。

### Codex 主审立场(2026-07-13)

- 结论：**原“auto 回环检测 + 定点替换”和“启动时单文件全局 scripts.json”均 counter；本按场景/共享/global-domain 分片方案 agree**。
- 理由：路径循环检测不能约束非循环 DAG；单文件共享库虽解决磁盘复制，却仍要求进入一个场景时加载全游戏脚本。`{chunk,id}` 引用 + SCC 归属 + 按需 resolver 才同时满足 O(1) 控制流边、10 倍总量和场景内存解耦。
- 是否建议进入 build：否，schema/loader/runner/editor/migration 跨包变更，等待 Opus + GLM 复核签字。

### Opus 上一版主审立场(2026-07-13,已被分片修订取代，待重签)

- 历史结论：对“单文件全局共享库” **agree，附 R1-R3 必落修正**。用户随后追加场景懒加载约束，本签名不自动覆盖新的 chunk schema/归属/LRU，推进签字已恢复 pending；R1-R3 仍全部保留为新方案必改项。
- 合法性：`script-model-m3-design.md` §3 层3 + M3c **原设计本就规定**"goto 单前驱内联、多前驱提共享
  Script(callScript)、共享段 `shared/L_35639`、callScript 目标全部提名"——本方案是回归原架构,
  实现漏掉共享库才退化成递归内联。锚点核实(translate-events.ts:295-322 goto 切 `at` 同体续走 /
  861-893 0x04 memo 防重译但仍逐站点 `push(...calleeBody)` 复制),卡内现状描述准确。
- 逐项复核：
  - **schema(Draft B)**:`Record<string, Command[]>` 命令体 + scene 保留 ScriptStage 持久页壳,
    分层正确(stage=实体持久状态机,共享体=控制流目标,不混)。owner 专门化(`@e312`)是正确的
    分期:命令体内实体 id 是显式烘焙(铁律5 杜绝下标的代价),跨 NPC 真共享需 self-relative
    引用 = 另一张 schema 卡;10 倍门禁作总闸,风险2 的处置顺序对。
  - **call/jump 语义(Draft C)**:jumpScript 尾转移(常量栈,循环可持续)vs callScript 受控栈
    (0x04 含 op1 改属主 → `self`),映射原版语义正确;二者不得共用"内联后补 stop"路径 ✓。
    嵌套 branch 尾转移穿透 + "call 内 goto 不越过 call 边界、链终仍返回 caller"已列测试单 ✓。
  - **注册算法(Draft D)**:label+owner 键 + unseen/translating/done 三态,translating 态处理
    环 = 结构性消灭递归复制,O(1) 边成立;统一发 jumpScript(放弃单前驱内联优化)是更简单
    安全的取舍,体积由门禁兜底。前驱数/SCC/不可达报告 ✓。
  - **门禁(Draft A)**:三口径定义清楚、含共享库与嵌套臂、进 pnpm check ✓。⚠ 量化警示:卡内
    自算"删 8 棵循环树后 8.61x"——距 10x 余量仅 14%,owner 专门化 + 引用开销可能回弹;若
    首轮审计超标,风险2 的 self-relative 引用卡**立即转必做**,不再是"若仍超标再议"。
  - **overlay(Draft E)**:纯函数 overlay + JSON Pointer 白名单 + 双跑零 diff,方向对;⚠ build
    时注意 overlay 锚点须按**语义定位**(label/实体 id/内容匹配),不可按旧产物结构位置——
    全量重迁后 onEnter 可能缩成一条 callScript,结构位置全变。
- **R1-R3 必落修正(build 范围)**:
  - **R1 尾转移让出保证**:每次 jumpScript 尾转移必须保证至少一次事件循环让出(pace 下限或
    显式 yield)——纯同步命令体的 jump 环(理论存在)否则会同步自旋占死主线程;验收"不死循环
    占满主线程"须有此机制背书,不能只靠"原版循环都带 wait"的经验假设。
  - **R2 对话样式态跨引用保真(本审最重要发现)**:当前 goto 是**同 walkBody 续走**——
    slot/portrait/activeSpeaker 跨 goto **延续**;改为 jumpScript 引用后目标体 fresh 启动
    (样式重置为默认)。mid-style 的 goto(跳转点样式态非默认且目标体含先于样式 op 的对话)
    语义会**静默改变**(top+立绘 → bottom 素框)。这正是 armMemo 路径相关性存在的原因,删它
    必须显式承接:CFG 构建时**统计"跳转点携带非默认对话样式态且目标体入口对话依赖它"的边数**,
    非零则按入口态专门化注册(键加样式摘要)或落人工清单;golden 无法全覆盖此类边,必须靠
    迁移期统计钉死。(0x04 现实现 callee 已 fresh,无此问题。)
  - **R3 resolver 归属与缺引用运行时诊断**:runner 构造注入 `resolveScript(id) → Command[]`
    接口,loader(HTTP/FSA)与 editor Playback 各自供给——editor 预览经同一 runner 免费获得
    解析,不另写模拟;运行时引用缺失 = 显式报错停脚本(诊断含 id 与调用点),不得静默跳过
    ——迁移期"无孤儿"校验只覆盖迁移产物,手写工程需运行时兜底。
- 命名注:`shared/L_35639@e312` 含原始地址,与"不暴露原始 IP 给作者 UI"不冲突——它是迁移产物的
  稳定不透明 id(唯一可用身份),规则约束的是"不让作者用 IP 推理";手写脚本用语义名,迁移 id
  后续可加语义别名,不在本卡。

## 验收条件

- 结构：迁移产物中 goto/call 类边只出现 `jumpScript/callScript` 的 `{chunk,id}` 引用；禁止生成深层复制目标体。所有 ref 存在、无孤儿、chunk id/脚本 id 稳定。
- 单测：self-loop、A-B 环、多分支 SCC、共享 DAG、多前驱 goto、跨 scene call/goto、0x07 双臂、0x24/25 跨 scene 绑定、0x6D 双目标、0xA2 多目标、嵌套 branch 尾转移、0x04 返回、call 内 goto、jump 0、auto pace/abort/self、trigger stage advance/reset、R2 对话入口态专门化。
- 规模：三个 10 倍口径全过；每场景 `<10MB`、每脚本根 `<1MB`、每 chunk `<1MiB`；输出修复前后 Top 20、SCC/前驱/归属和 scene/shared/global 分布报告。
- 加载与内存：进入 `s001` 时，**脚本相关**网络请求只允许 `scene/s001` chunk 和其依赖 shared shard；不得因脚本解析请求其他 scene 的地图/实体或全库脚本。默认驻留脚本预算 `<=8MiB`，跨场景按需调用结束并释放 lease 后可被 LRU 淘汰。
- 存档：保存中不存在 `Command[]/ScriptStage[]` 脚本体；仅存 ref/stage/cursor。构造 100 次跨场景调用后存档体积不随已访问脚本 chunk 线性增长。
- 覆盖：295 场景 schema + 引用校验全过；typed edge catalog 覆盖 43,503 源指令和所有数据表根，无静默丢边；既有 17 条合法深臂不回退为 `unmigrated`。
- round-trip：HTTP/FSA loader、编辑器打开/保存、clone/zip、脚本预览均保留 `scripts/index.json + chunks`，普通 inline 工程兼容。
- 手工演出：`s000/s001` 与历史 overlay golden 全过；写盘 diff 无白名单外变化；连续迁移两次第二次零 diff。
- 行为：6051 抽查 `s005/s019/s035/s049/s176/s186` 巡逻，连续移动/换向、不死循环占满主线程；开场和普通换场景不回归；构造/复验至少一条跨 scene 脚本引用，确认只加载目标 script chunk 且行为正确。
- 门禁：migrate/content/reforge/editor 定向测试、类型检查和仓库 `pnpm check` 全绿。

## 推进签字

### 进入 build 前:设计签字

- Codex: **agree**(2026-07-13，仅同意按场景/shared/global-domain 分片修订版)
- Opus: pending(上一版单文件全局库 agree 已因用户新增场景懒加载约束失效，R1-R3 继续作为必改项)
- GLM: pending
- counter / 分歧处理：原“循环检测 + 全量重迁”、“仅 auto 定点同步”和“启动时单文件全局 scripts.json”均已作废。分片版必须重新取得 Opus/GLM 签字；Opus R1-R3 沿用。
- 缺签豁免: N/A
- build 准入结论: **blocked(Codex agree，待 Opus/GLM 重审分片版；R1-R3 纳入 build 范围)**

### 进入 done 前:审查签字

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Build: 实现与自测

- Coding Owner: Codex(未准入)
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 交接日志

- 2026-07-13 Opus: 记录指数展开、GitHub 100MB 拒绝、`749c1ce3` 临时止血与循环检测初案。Next: 三方设计。
- 2026-07-13 Codex: 首轮复核发现 trigger/auto、memo、浅层预算和全量覆盖问题，提出 auto 路径检测窄修。Next: 用户复核范围。
- 2026-07-13 User: 裁决必须彻查所有 goto 膨胀，迁移后脚本总体积不得超过 `all.json` 一个数量级。Next: Codex 重做全库设计。
- 2026-07-13 Codex: 量化当前脚本两个字节口径均约 20 倍；确认原 M3 设计预留的 `callScript` 共享库未实现，改为全局脚本库 + O(1) call/jump 引用 + 三重 10 倍门禁 + 可重复 overlay。Next: Opus 复核，不得 build。
- 2026-07-13 Opus: 设计签 **agree + R1-R3 必落**。核实:原 M3 设计 §3/M3c 本就规定共享库(方案=回归原架构);锚点 295-322(goto 同体续走)/861-893(0x04 memo 防重译仍逐站点复制)与卡描述一致。逐项过:schema 分层/call-jump 语义/registry 三态环处理/门禁口径/overlay 均正确。**关键发现 R2**:当前 goto 续走使对话样式态跨 goto 延续,引用化后 fresh 重置 = mid-style goto 对白样式静默改变(armMemo 路径相关的真实原因),CFG 须统计此类边并专门化/人工清单——golden 覆盖不到,必须迁移期统计钉死。R1=尾转移强制让出(防同步自旋);R3=resolver 注入 + 缺引用运行时报错。量化警示:8.61x 距 10x 仅 14% 余量,超标则 self-relative 卡转必做。Evidence: Opus 主审立场。Next: GLM 复核覆盖/体积公式/测试矩阵/R2 统计口径;三签齐后 Codex build(R1-R3 入范围)。未改实现文件。
- 2026-07-13 User: 补充第一阶段历史约束：脚本必须按场景拆分，跨场景调用/跳转不能迫使每场景加载全游戏脚本；具体解耦由 Codex 设计。Next: Codex 复核 phase1 切片与全局数组回退史。
- 2026-07-13 Codex: 核实 D18 切片总量仅 all.json 0.89x；第一阶段 `6b58f9e8` 回退全局数组的原因是 cursor 内嵌脚本导致存档膨胀、全局/本地 IP 混用和控制边/全局根漏收，并非场景分片不可行。方案改为 `{chunk,id}`、scene/shared/global-domain SCC 分片、typed execution/binding edge、按需 resolver + lease-LRU、存档只存 ref。Opus 旧签因 schema/加载边界变化恢复 pending，R1-R3 保留。Next: Opus 重审分片版，不得 build。

## 下一位 Agent 提示词

```text
接手 M3 脚本去内联 + 按场景分片设计复核(Opus 重签)。
任务卡: docs/ops/tasks/M3-wander-arm-explosion.md
当前状态: draft；Codex 已签分片版 agree；你对上一版单文件全局库的 agree 因用户新增场景懒加载约束已恢复 pending；GLM pending，build blocked。
你的角色: Claude Opus，架构/加载边界/运行语义主审；只审设计，不改实现文件。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、docs/phase1/04-decisions.md D18、docs/phase1/05-events-schema.md §文件组织、packages/pal-extract/src/events/slice.ts、commit 6b58f9e8、任务卡 Draft A-E。
用户硬约束: ①迁移脚本总量 ≤ all.json 10 倍；②goto/call 不得复制目标体；③进入一个场景不得加载全游戏脚本，跨场景调用只加载目标 script chunk，不加载目标 scene 数据。
已确认: 第一阶段 295 scene slices + shared 总计 4,884,865B = all.json 0.89x；后来回退全局数组源于旧 cursor/全局IP/漏边问题。新方案使用 ScriptRef{chunk,id}、scene/shared/global-domain SCC 分片、typed execution edge 与 binding edge、256KiB 目标/1MiB 上限、按需 resolver + 8MiB lease-LRU、存档只存 ref。你上一轮 R1 尾跳让出、R2 对话入口态、R3 resolver 诊断全部保留。
请你复核: 1)chunk schema 是否无需全局脚本体/巨型索引即可寻址；2)执行边与 0x24/25/6D 绑定边归属是否正确；3)typed edge catalog 是否覆盖 0x07 双臂、0x6D 双目标、0xA2 和全局数据根；4)稳定哈希分桶是否避免无关 ref 重排且兼顾请求粒度；5)跨 chunk call/jump 的 async、self、stage、pace、abort、lease/LRU 语义；6)存档不嵌脚本；7)256KiB/1MiB/8MiB 门禁；8)R1-R3 在分片版是否仍充分。agree 则重新签 Opus；counter 必须给出同时满足三个用户硬约束的替代方案。
不要做: 不改实现文件；不跑 migrate:content 全量写盘；不推进 build。
输出要求: 更新任务卡 Opus 签字/主审结论/交接日志/下一位提示词并提交仅文档改动；agree 后再交 GLM 做覆盖、体积与测试矩阵复核。
```
