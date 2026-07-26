# N3-1 - 结构化控制流、实体具名行为与内部脚本退役

Status: rework
Phase: phase2
Capability: N2 / N3 / N6 / E2 / MG1 / MG2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: GLM（P7 schema delta + 最终架构/数据合并代审）
Visual Verification Owner: Codex + User
Unavailable Agents: Kimi（额度耗尽；用户批准 P3-P7 由 GLM 合并代审，保留补审债务）
Branch: main

## 目标

把 PAL 迁移留下的 `scene/*/L-*`、`shared/scc-*`、`jumpScript` 和动态脚本指针，从作者可见的
内容模型中退役。实体/NPC 直接拥有可创建、命名、编辑、引用和切换的行为槽；普通分支、循环和
多阶段行为使用结构化控制流或具名状态机表达；只有真正跨调用方复用的业务逻辑进入共享脚本库。
脚本分片、chunk 和运行时块只作为可再生存储/编译实现存在，不再冒充作者必须理解和维护的内容。

用户最终应看到“把 e2495 的触发行为切换为『交出天书后』”，而不是“跳到
`scene/s154/L-...` 内部脚本”；也不需要先找到一个没有创建、命名、删除闭环的“迁移内部实现”
才能理解 NPC 后续会做什么。

## 下游验收依赖（用户裁决）

- 2026-07-24：C8 与 ED-5I 虽已完成 N3-1 前的实现和三方审查，但其稳定脚本引用、物品用途脚本、
  脚本选择/反跳和剧情物品引用闭包仍依赖本卡终态。N3-1 未完成前，两卡不得最终验收或标 done。
- N3-1 完成后必须把 C8/ED-5I 作为下游回归门禁：复验 267/268/270 用途、canonical 脚本选择与
  反跳、剧情物品引用分组、删除 fail-closed、保存重开、MG2 零计划和代表运行时流程；Codex /
  Kimi / GLM 补记回归结论后再交用户验收。

## 范围

- 范围内:
  - 建立可复现的源 CFG、迁移脚本体、入口绑定、引用、循环、不可达体和共享尾部审计。
  - 为实体的 trigger/auto 通道设计具名行为槽；需要同时切换多通道时，设计具名行为模式。
  - 为场景 onEnter/onTeleport 等动态覆写建立同样可命名、可引用的本地 hook 变体，不再写裸
    `ScriptRef`。
  - 把可还原的 goto 图迁成嵌套分支、结构化循环和阶段/状态机；不可约图必须成为作者可见、可命名、
    可完整浏览的状态机，不能继续藏成私有块。
  - 保留真正跨场景/跨实体复用的作者共享脚本；调用方显示业务名和稳定 id。
  - 把 chunk、shard、存储壳和可选运行时 lowering 降为透明实现；若落盘生成物存在，必须可由
    canonical author model 确定性重建。
  - 更新 content schema、迁移器、运行时、存档/世界态、编辑器和引用/删除安全，并全量重迁 PAL。
- 范围外:
  - 不重写 PAL 全部剧情文案、演出节奏或游戏设计。
  - 不把所有一次性脚本强行提取成共享脚本。
  - 不把 SpriteDef 已承接的预制动作或 HostileBehavior 已承接的敌对行为重新脚本化。
  - 不在本卡顺带解决物品/仙术/角色等所有名称选择器；这些继续由各资源工作台的稳定引用闭环处理。
- 明确不做:
  - 不提供 goto、裸地址、chunk id、`jumpScript` 或“内部脚本 id”的作者插入入口。
  - 不以“把所有内部块列出来”冒充编辑闭环。
  - 不把不可约图静默丢弃、无限内联或复制到每个调用方。
  - 不直接修改 `projects/pal` 生成产物，不以 overlay 手改掩盖迁移器缺陷。
  - 不在三方设计签字齐之前修改任何实现文件或冻结 schema。

## 上下文锚点

### 已拍板决策 / 铁律

- `AGENTS.md`：schema、save、migration、跨包公共接口属于高风险任务，进入 build 与 done 前均须
  Codex / Kimi / GLM 三方签字；迁移问题必须先修上游。
- `docs/phase2/READ-FIRST.md:9-15`：第二阶段架构第一，迁移语义不等于架构合格；发现原版管线
  过渡态后必须主动现代化。
- `docs/phase2/READ-FIRST.md:16-20`：演出使用干净、显式脚本，不复刻旧引擎的隐式机制。
- `docs/phase2/READ-FIRST.md:26-27`：迁移缺陷修真源、全量重迁、双跑幂等，不单点修补 PAL 产物。
- `docs/phase2/foundation/phase1-knowledge-harvest.md:142-154`：autoScript 必须用真实执行链验证，
  不能用手写近似模拟；触发脚本与自动行为的历史语义不能在重构中混为一谈。
- `docs/phase2/foundation/phase1-knowledge-harvest.md:310-312`：一阶段 call stack 是旧架构机制，
  二阶段目标应是结构化 AST，而不是把 IP/label 换一个名字继续暴露。
- `docs/ops/tasks/R2-script-single-model.md`：唯一语义命令模型和迁移 fail-loud 继续成立；本卡不复活旧
  opcode 解释器。
- `docs/ops/tasks/N6-shared-script-authoring.md`：作者共享脚本的稳定 id、引用安全、lazy load 和 MG2
  规则继续成立；但“迁移内部脚本默认隐藏、从引用进入编辑”的过渡边界被本次产品裁决收窄，
  不得再当最终作者模型。
- 用户 2026-07-23 裁决:
  - “内部脚本/私有块”完全脱离创建、命名、删除和全局浏览闭环，不能作为最终设计。
  - e2493/e2495 这类 NPC 应直接挂多个具名行为，切换指令选择目标行为，不应指向匿名内部块。
  - 共享脚本只服务真正复用；仅因 goto、回环或存储去重产生的块不等于业务共享。

### 代码锚点

- `packages/content/src/script.ts:14-19`：`ScriptBinding` 当前允许 inline stages 或裸 `ScriptRef`，
  把作者行为和分片实现混在同一公共 schema。
- `packages/content/src/script.ts:205-212`：`setEntityAuto`、`setEntityTrigger` 和场景 hook 覆写直接
  携带脚本绑定。
- `packages/content/src/script.ts:224-229`：`callScript` 与 `jumpScript` 同时存在于作者可见
  `Command` 联合。
- `packages/content/src/script.ts:334-366`：现有 `ScriptStage` / `EntityPage` 已能承接阶段与
  trigger/auto，是具名行为模型的现有地基，不能另造第二套平行实体系统。
- `packages/content/src/index.ts:80-89`：HostileBehavior 已证明标准行为应折叠为声明式数据，不能
  为本卡重新脚本化。
- `packages/content/src/index.ts:119-148`：场景已有 onEnter/onTeleport 作者语义，动态变体应归回
  场景本地 hook 模型，而不是裸脚本指针。
- `packages/migrate/src/script-graph.ts:33-49,88-155,158-222`：源入口、typed edge、Tarjan SCC 与
  可达性已有统一图分析地基。
- `packages/migrate/src/translate-events.ts:181-205`：当前 registry id 由 scene/shared、label、
  owner 和对话入口态派生，仍是迁移实现身份。
- `packages/migrate/src/translate-events.ts:264-276`：稳定作者别名目前只是一层 call 到内部 target，
  造成“共享脚本是空壳、真实逻辑在内部块”的用户困惑。
- `packages/migrate/src/translate-events.ts:722-755,843-888`：goto 与分支臂通过 `jumpScript` /
  target registry 截断控制流，循环和 join 尚未恢复成作者结构。
- `packages/migrate/src/translate-events.ts:1397-1466`：0x04、0x24、0x25 被翻译为内部引用和动态
  `ScriptRef`，是 e2493/e2495 问题的上游根因。
- `packages/migrate/src/migrate-content.ts:1885-1890`：所有共享归属按 SCC 首地址命名为
  `scc-L-*`；只读审计已证明现存 13 个该前缀节点实际全部无环，命名与语义不符。
- `packages/migrate/src/migrate-content.ts:2341-2383`：场景根统一外置为单条 `callScript` 存储壳；
  这种存储去重不得泄漏成作者脚本层级。
- `packages/reforge/src/script-runner.ts:395-417,720-760`：运行时分别解释 call、jump 和动态脚本绑定；
  结构化模型落地后应只消费作者语义或编译产物，不把旧图身份写回世界态。
- `packages/reforge/src/main.ts:1950-1979`：动态切换目前直接 mutate 活体 `pages[0]`，
  没有稳定行为槽或可持久、可检查的活动模式。
- `packages/editor/src/core/scene-script-view.ts:25-71`：编辑器只能按 id 模式识别并透明展开场景根壳，
  说明存储层已泄漏到 UI。
- `packages/editor/src/core/script-library-catalog.ts:11-71`：当前“迁移内部实现”目录靠 id 猜来源，
  能浏览但不能形成作者 CRUD 闭环。
- `packages/editor/src/ui/CommandForm.tsx:1254-1352` 与
  `packages/editor/src/ui/ScriptTree.tsx:368-410`：动态行为和跳转仍展示“内部引用 + 裸 id”。
- `packages/editor/src/ui/SharedScriptTab.tsx:777-920`：内部体被放进共享脚本工作区，并明确限制
  rename/delete；这是诊断过渡界面，不是最终 UX。

### 已知坑 / 审计结论

以下为 2026-07-23 两轮只读审计的冻结前基线。当前统计方法尚未入仓；build 第一批必须把同口径
审计脚本和机器可读报告提交入仓，任何数字变化都要解释来源，不能在卡内手改终值。

#### 迁移产物脚本体与引用

| 指标 | 当前结果 | 含义 |
|---|---:|---|
| 脚本体总数 | 11,447 | 迁移产物中的可寻址 body，不等于作者共享脚本数 |
| 场景根存储体 | 6,453 | onEnter/onTeleport/entity stage 的外置壳目标 |
| 场景内部体 | 4,975 | goto/join/循环/状态入口等迁移控制流 |
| `shared/scc-*` | 13 | 全部 runtime reachable，但全部无环；“SCC 共享脚本”命名错误 |
| 作者根 `shared/user/*` | 6 | 当前 6 个根均通过 call 再进入内部 target，未真正拥有业务 body |
| 递归脚本引用 | 3,857 | `callScript` 675、`jumpScript` 2,642、`setEntityAuto.script` 342、`setEntityTrigger.script` 198 |
| 外部入口绑定 | 5,942 | 全部可解析；5,935 场景根、6 作者根、1 个 s018 直接绑定内部体的异常 |
| runtime reachable body | 8,102 | 当前运行闭包 |
| unreachable body | 3,345 | 全部可解释为已折叠行为的残留，应从上游剪枝而非继续落盘 |

3,345 个不可达体的已知分账:

- 863 个 body / 387 个实体：旧 auto 图已经物化为 SpriteDef actions。
- 2,482 个 body / 828 个实体：标准敌对行为已经折叠为 HostileBehavior。

#### 循环、共享尾部与源 CFG

| 指标 | 当前结果 | 处理要求 |
|---|---:|---|
| 迁移体循环 SCC | 676 个 / 778 body | 全部 scene-internal；620 自环、10 个二节点、46 个三节点 |
| runtime reachable 循环 | 331 个 / 433 body | 必须分类为结构化循环、领域行为或具名状态机 |
| 已折叠残留循环 | 345 个 / 345 body | 随不可达体从迁移真源剪枝 |
| runtime reachable 共享尾部 | 532 | 530 个 scene-internal + 2 个 `shared/scc-*`；“多前驱”不自动等于业务共享 |
| 源命令 | 43,503 | 现有脚本图完整输入 |
| 源 CFG edge | 42,680 | execution/binding/recovery 的既有 typed edge |
| Tarjan component | 40,205 | 迁移规划基线 |
| 源循环 component | 326 | 与产物循环统计口径不同，必须在入仓审计中并列解释 |

#### 审计发现的实现风险

- `shared/scc-*` 名字混淆了控制流、归属和物理分桶；当前 13 个节点全无环已证明它不是可靠领域名。
- address `0` 同时可能被当空指针和回到自身的控制值，审计必须按 opcode 语义区分。
- 0x6D 后代需要目标 scene 上下文；丢失上下文会把场景本地行为误判为 global/shared。
- registry 身份目前纳入对话入口态，但未完整纳入 `lastRngChunk`、`pendingAuto` 等迁移上下文；
  合并 body 前必须证明入口/出口状态相容。
- `callScript` 的“callee stop 后 caller 继续”和 `jumpScript` 的尾转移语义不同，不能机械互换或全量内联。
- 共享尾部可能只是 CFG join；若直接复制会指数膨胀，若直接升为共享 API 又会污染作者库。
- M3/N6 的 lazy chunk、MG2 三方合并和作者自建脚本都已投入使用，重构不能静默丢用户内容。

### 不得重新引入

- 原版地址、IP、数组位置、chunk/shard 或 hash 派生 id 作为作者身份。
- “迁移体能运行，所以作者模型合格”的过渡态思维。
- 隐藏但不可创建/命名/删除/索引的 canonical private block。
- 一个共享脚本列表同时混放业务复用、场景本地行为、CFG join 和物理存储分片。
- 运行时 mutate 静态 SceneDef/EntityDef 后把变化隐式带到下一次进入场景。
- 为避免控制流设计而新增通用 raw JSON、万能 goto 或第二解释器。
- 只删 UI 入口但保留生成产物、schema 和存档继续依赖匿名内部块。

### 相关测试

- `packages/migrate/src/script-graph.test.ts`：typed edge、Tarjan SCC 与 root 可达性。
- `packages/migrate/src/translate-events.test.ts`：call/jump、对话入口/出口态和 0x24/0x25 翻译。
- `packages/migrate/src/pal-sprite-action-census.test.ts`：预制动作折叠后的脚本可达性与引用。
- `packages/migrate/src/script-library-audit.test.ts`：迁移脚本引用与 root 壳审计。
- `packages/editor/src/core/scene-script-view.test.ts`：场景存储壳透明展开的现有边界。
- `packages/editor/src/core/script-references.test.ts`：call/jump/binding 引用图、循环和删除安全。
- `packages/reforge/src/script-runner.test.ts`：call 返回、jump 尾转移、self 和深度保护。

## 目标模型

以下是设计方向，不是未经三签即可落地的字段名；Kimi / GLM / Codex 必须在设计签字中冻结最终
schema、存档升级策略和迁移批次。

### 1. Canonical author model 与 generated execution model 分层

- canonical content 只保存作者能创建、命名、编辑、引用、复制和删除的对象:
  - 场景/实体本地具名行为；
  - 结构化命令、分支、循环和状态机；
  - 真正跨调用方复用的具名共享脚本。
- chunk/shard 仍可作为 IO 分片；若运行时需要把结构化 AST lowering 为 block graph，该图是带
  content hash 的可再生编译产物，不是作者真值，不被其它 canonical 内容用裸 id 引用。
- 编辑器正常工作区只展示 canonical author model；工程诊断可另开只读“迁移源图/编译产物”视图，
  但不能要求作者在其中完成日常编辑。

### 2. 实体具名行为槽

示意形状（字段名待设计签字冻结）:

```ts
entity.behaviors.trigger['初次交谈'] = TriggerSpec
entity.behaviors.trigger['交出天书后'] = TriggerSpec
entity.behaviors.auto['原地待机'] = AutoBehavior
entity.behaviors.auto['巡逻'] = AutoBehavior
```

- trigger 与 auto 是独立通道，避免原版 0x24/0x25 的差异被强行合并。
- 同时切换多个通道/外观/交互方式的剧情状态可用具名 mode 原子绑定多个槽，不靠连续指令约定。
- 切换指令引用 `entity + channel/mode + local behavior id`；UI 显示业务名和稳定 id，并能直接跳到
  该实体槽位。
- 活动槽使用稳定语义 id 存入 world/save 覆写；运行时解析到静态定义，不复制或 mutate
  `pages[0]`。
- 删除、改名、复制和移动行为必须走引用索引与 editor `apply/invert`；受引用项禁止静默删除。

### 3. 场景本地 hook 变体

- onEnter/onTeleport 的复杂变体属于 SceneDef，而非全局共享库或匿名内部块。
- 动态切换引用场景内具名 hook 变体；简单传送出口仍可直接用结构化 `loadScene` 配置。
- 只有跨多个场景真正复用的业务流程才调用共享脚本。

### 4. 结构化控制流

- 普通条件图恢复为嵌套 `branch` / `switch`。
- 自然循环恢复为 `while`、`until` 等结构化节点，并明确 tick/yield、退出条件和最大保护。
- NPC 巡逻、自动逐帧动画、敌对追逐等已存在领域模型的图继续折叠为领域数据/预制动作，不造通用循环。
- 多入口、跨阶段或不可约图恢复为具名状态机：状态、转移、入口、退出和外部事件都在一个作者对象中
  完整可见；不得拆成散落的 private blocks。
- `jumpScript` 不再是作者命令；`callScript` 只调用作者共享脚本，并保留明确的 return/self 契约。

### 5. 真正共享脚本

- 共享的判据是业务语义与作者意图，不是“有多个前驱”“被多个分片引用”或“Tarjan 分到同一组”。
- 6 个现有 `shared/user/*` 根必须逐个重判归属：能回归领域模块的直接结构化，只有真正跨调用方
  复用的剩余根才直接拥有 canonical 业务 body；不能再以空壳 call 到匿名内部目标。
- 共享脚本保留 N6 的稳定 id、元数据、self 契约、引用保护和 lazy load；参数系统不在本卡凭空扩张。

## 分批策略

每一批都必须先改上游迁移/模型，再重生成 PAL；不得先在 `projects/pal` 试写终态。任何批次发现
统计口径或语义不成立，任务留在 build 或转 blocked，不跨批堆债。

P1 版本冻结后，P2-P6 的“重生成 PAL”专指在临时目录/内存中生成完整影子 target、计算 MG2
plan 并跑全量验证，不向用户工程发布半迁移 v5；P7 才用同一事务发布 project、baseline、
transition ledger、save compatibility sidecar 与最后的 manifest。

1. **P0 审计入仓与基线冻结**
   - 提交只读 `script-control-flow-audit`，同时输出源 CFG、迁移 body、入口绑定、引用种类、可达性、
     SCC、共享尾部、折叠来源和异常清单。
   - 对账本卡全部数字，解释源 CFG 与产物图的口径差异；给每个 body 分类而非只给总数。
   - 单独钉死 e2493/e2495、s018 异常、6 个作者根、13 个 `shared/scc-*` 和 532 个共享尾部。
2. **P1 schema / save / compiler 边界冻结**
   - 三方评审实体行为槽、场景 hook、结构化循环、状态机、共享脚本和可再生 lowering。
   - 设计旧存档/旧工程升级：任何持久脚本 ref 必须迁成稳定行为 id，缺失目标 fail-loud。
   - 确定 MG2 如何合并作者行为槽、状态机和共享脚本，不以生成 block 做冲突键。
3. **P2 上游剪枝与错误命名退役**
   - 在迁移器折叠 SpriteDef action / HostileBehavior 后剪掉 3,345 个不可达残留。
   - 解决 s018 直接绑定内部体；停止生成语义错误的 `shared/scc-*` 名字。
   - 重迁后双跑零计划，并证明无作者内容被删除。
4. **P3 无环控制流结构化**
   - 单前驱、状态相容的无环 tail 原位合并；diamond 恢复为 branch/switch。
   - 合并前比较对话状态、self、RNG、pending battle/auto 等入口/出口上下文。
   - 体积与 chunk 门禁防止复制膨胀。
5. **P4 实体/场景具名行为迁移**
   - 按全部 command site 迁移 388 个 `setEntityAuto`、202 个 `setEntityTrigger` 与 61 个 scene
     hook setter（60 onEnter + 1 onTeleport）；P0 的 342/198 是 stored-body ScriptRef
     reference 子口径，不能充当删除 legacy command 的覆盖总数。
   - e2493/e2495 成为端到端金丝雀：实体检查器可看到全部槽，切换命令按名字选择并直接跳转。
   - 运行时与存档只记录活动槽/模式 id，不再记录或 mutate 目标 ScriptRef/body。
6. **P5 循环与状态机恢复**
   - 331 个 runtime reachable 循环逐类迁为结构化 loop、领域行为或具名状态机。
   - 不可约图若暂不能结构化，必须以完整可编辑状态机暂存，不允许匿名 private block。
   - 回归 auto 行为的让步/节拍和 call-vs-jump 的退出语义。
7. **P6 共享脚本收口与旧模型退役**
   - 识别 532 个共享尾部中的真实业务复用；其余归回局部结构/状态机。
   - 6 个作者根直接拥有 body；共享库不再列迁移/存储实现。
   - **共享脚本判据回归”通用函数”本义（用户 2026-07-24 裁决）**：共享脚本只服务真正跨
     调用方复用的业务演出逻辑，不是”逻辑复杂就放共享”。当前 6 个 `shared/user/pal-item-use/*`
     中，268 炼蛊皿已迁为 `craftRecipe`、270 紫金葫芦已迁为 `drawFromResourcePool`——这两个
     已回归物品模块结构化编辑，不再放共享脚本。P6 审计时应优先把剩余 runScript 物品中能
     结构化的（如灵珠场景交互若能抽象为通用机制）也回归物品模块；只保留真正无法结构化
     且跨处复用的才留在共享脚本。共享脚本的最终数量应远少于当前 532 个”共享尾部”。
   - **物品私有脚本分层（用户 2026-07-25 裁决）**：当前 `runScript` 物品（267 土灵珠、265 水灵珠、
     266 火灵珠、280 包袱、290 天书、293 手卷）的脚本只被对应单一物品使用，没有跨处复用。
     语义上它们不是”共享脚本”——不应放在共享脚本库中、不应跳转到共享脚本模块编辑。
     P6 必须引入**物品私有脚本**（item-private script）作为第三种物品用途表达方式：
     ①结构化 effect（healHp/craftRecipe/drawFromResourcePool 等，物品工作台内联编辑）；
     ②**物品私有脚本**（逻辑复杂但只服务该物品，在物品工作台内联编辑，不跳转共享脚本模块）；
     ③共享脚本引用（真正跨处复用的通用演出，物品工作台选择 + 反跳共享脚本模块）。
     上述 6 个 `shared/user/pal-item-use/*` 中只被单一物品使用的应转为物品私有脚本；
     物品工作台的 `ItemUseEffectEditor` 对物品私有脚本应提供内联编辑入口（展开脚本正文），
     而非”打开脚本 ↗”跳转到共享脚本模块。schema 层面需要区分物品私有脚本和共享脚本的
     身份与存储归属——物品私有脚本归物品定义拥有，不进共享脚本库索引。
   - 从 canonical schema、插入菜单、编辑器、运行时和存档升级链移除作者可见
     `jumpScript`、匿名 binding 和”迁移内部实现”。
8. **P7 全量重迁、验收与文档**
   - 全量重迁 PAL、连续二跑零 diff、MG2 三方合并场景覆盖、全仓静态扫描与代表剧情浏览器验证。
   - 更新 script model、共享脚本作者指南、存档升级说明和 capability map 的实际状态。

## 验收条件

### 功能 / 数据模型

- canonical 工程中不存在作者可见的 `scene/*/L-*`、`shared/scc-*`、地址/hash 派生内部脚本身份。
- canonical `Command` 中不再允许作者级 `jumpScript` 或动态行为裸 `ScriptRef`；旧工程升级后为 0。
- 实体检查器能创建、复制、重命名、编辑、删除 trigger/auto 行为槽；可选择活动槽并反查全部引用。
- 行为切换指令按 `实体 + 具名行为槽/模式` 编辑，树行显示名称和稳定 id，点击可直达定义。
- e2493/e2495 的换触发流程完整闭环，无内部 target；保存、重开、undo/redo 与运行时切换一致。
- onEnter/onTeleport 变体可在场景内完整编辑；简单出口无需创建脚本，复杂 hook 可具名引用。
- 所有 runtime reachable 循环均归为结构化 loop、领域行为或具名状态机；不存在匿名 fallback 私有块。
- 共享脚本库只含作者具名且真正跨调用方复用的业务脚本；6 个现有作者根完成逐个归属，
  可结构化者回归领域模块，剩余共享根拥有真实 body，不再桥接内部块。
- 运行时可选编译/分片产物完全可再生，删除后可由 canonical content 重建并得到相同语义 hash。

### 审计 / 迁移

- 入仓审计报告覆盖 43,503 源命令、全部迁移 body、全部四类 ScriptRef/binding、全部外部入口和
  全部 SCC；未分类数为 0。
- 3,345 个已折叠不可达体从上游不再生成；若基线因其它任务变化，报告逐项说明差异。
- s018 的直接内部绑定有明确归属并完成迁移；13 个错误 `shared/scc-*` 身份归零。
- 全部 388 auto + 202 trigger + 61 scene hook setter 迁到具名行为/hook；342/198 的引用子口径
  同时逐项闭合，外部入口、调用和状态机目标无悬空引用，最终 legacy command kind=0。
- 每个迁移批次都有根因测试、全量重迁、非脚本白名单、MG2 冲突测试和连续二跑
  `writes=0 / deletes=0 / conflicts=0`。

### 测试

- content：schema guard、稳定行为 id、引用完整性、删除安全、旧工程/旧存档升级。
- migrate：typed CFG 全边、结构化分支、自然循环、不可约状态机、入口/出口状态相容、折叠后剪枝、
  确定性生成和体积门禁。
- reforge：行为槽解析与持久覆写、trigger/auto 独立切换、mode 原子切换、loop yield/退出保护、
  状态机转换、共享 call return/self 和 lazy load。
- editor：行为 CRUD 的 apply/invert、名称选择、引用跳转、受引用删除、保存重开、项目导入导出。
- PAL 金丝雀至少覆盖 e2493/e2495、一个 onTeleport 动态 hook、一个 auto 自环、一个多状态 NPC、
  一个 item author root 和一个真正共享业务脚本。
- 下游回归：C8/ED-5I 的 267/268/270 用途、canonical 脚本选择/反跳、剧情物品引用闭包、
  删除守卫、保存重开与 MG2 零计划全部通过；结果写回两张任务卡的 N3-1 后回归签字。
- `pnpm check`、`pnpm lint`、editor build、migrate 全量门禁全部通过。

### 文档

- 更新脚本模型文档，清楚区分 canonical author model、runtime/compiler model 和 storage shards。
- 更新共享脚本作者指南：何时用本地行为、状态机、共享脚本、模板和领域动作。
- 更新存档/contentVersion 升级文档与迁移审计说明。
- 只有完成实际实现和三方审查后才更新 capability map，不在 draft 阶段提前宣称 done。

### 视觉 / 手工验证

- 6010：实体行为槽、切换指令、状态机、共享脚本和引用面板均可完成完整 CRUD；无裸内部 id。
- 6010：720 / 900 / 1280 宽度下列表、树、检查器和跳转入口无横向溢出或遮挡。
- 6051：e2493/e2495 切换前后触发正确；auto/trigger 独立；存档重载后活动行为一致。
- 迁移源图/编译产物若保留诊断页，必须明确“只读诊断”，且不占用共享脚本作者工作区。

## 推进签字

签字是阶段门禁。初始建卡门禁由 Codex / GLM / Kimi 三方签设计 `agree`
（2026-07-23 齐），附 R1-R5（Kimi）与 G1-G7（GLM）build 必落钉；P1 冻结子门禁另于
2026-07-24 三方 `agree` 齐；两处均无 counter。

### 进入 build 前:设计签字

- Codex: agree（2026-07-23；认可 canonical author model 与 generated execution/storage model
  分层、实体具名 trigger/auto 行为槽、场景本地 hook、结构化控制流/状态机以及 P0-P7
  上游优先迁移策略；最终字段、存档升级与 MG2 冲突键仍须 Kimi / GLM 设计审查冻结）
- Kimi: **agree（2026-07-23；附 R1-R5 build 必落钉，见「主审立场」）**。架构/schema/存档/MG2
  逐项压测并抽查代码：实体具名行为槽方向成立——现状 `main.ts:1950-1979` 直接 mutate 活体
  `pages[0]`（scene 为入场 `structuredClone`，不写回 def），`script.ts:205-206` 注释自认"暂不持久、
  留给页注册表设计"，本卡正是补上该 deferred 设计；trigger/auto 独立通道（0x24/0x25 差异不被
  合并）+ mode 原子绑多槽与现有 EntityPage 地基（script.ts:358-366）兼容。call/jump 语义差异
  实证（script-runner.ts:395-417 callee stop 后 caller 继续；:757-760 尾转移 ScriptJump）已被卡内
  风险正确识别。e2493/e2495 根因实证（translate-events.ts:1432-1466：0x24/0x25 → registerTarget
  派生匿名内部 id）。卡内数字勾稽全部自洽（675+2,642+342+198=3,857；6,453+4,975+13+6=11,447；
  5,935+6+1=5,942；863+2,482=3,345；620+10+46=676；433+345=778；530+2=532）；GLM 口径修正
  （G1）与我方独立事实互洽，最终值以 P0 入仓审计冻结为准。
  **发现的真实缺口升为必落钉而非 counter**：MG2 现无 rename/remap 机制（身份锚=script id
  字符串、body 整条原子），本卡每批都在换/删 id，P1 必须交付旧 id→新身份映射产物并由 MG2
  消费（R1）；contentVersion/SAVE_VERSION 版本轴未在卡内点名，P1 冻结必须显式裁定（R2）。
  无架构 counter。
- GLM: **agree（2026-07-15）**。覆盖/迁移/审计/测试矩阵审查通过，附 G1-G7 必改项与三项统计口径修正
  （见「GLM 数据审查」）。顶层 11,447 bodies / 13 scc / 6 作者根 / 5,935 场景根绑定成立；
  可达性与递归引用数字因入口覆盖范围不同存在口径差异，P0 入仓审计必须冻结同口径脚本。
- counter / 分歧处理: 当前无 counter；Kimi agree 附 R1-R5、GLM agree 附 G1-G7 必落钉。任一方 counter 时留在 draft 或转 blocked；三方无法收敛时交用户拍板并写回。
- 缺签豁免: N/A
- build 准入结论: **build allowed（2026-07-23；Codex / Kimi / GLM 三方 agree，无 counter；
  R1-R5 与 G1-G7 为 build 必落钉）。该准入允许 P0；P1 schema/save/runtime/MG2 实现另受
  “P1 设计推进签字”子门禁约束，不能把本行解释成 P1 已获准。Status 翻 build 由 Coding Owner
  接手时执行。**

### 进入 done 前:审查签字

- Codex: pending（P2 阶段自验 `accept` 不等于整个 N3-1 最终验收）
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

- 当前 `ScriptRef + internal body` 可继续作为诊断/编译过渡态，但不能继续作为 canonical author model。
- 作者层以“本地具名行为 + 结构化控制流/状态机 + 真正共享脚本”三类对象为唯一真相源。
- 实体 trigger/auto 独立建槽；跨通道原子变化用 mode，不用隐式连续命令。
- 场景 hook 变体归场景本地；物理分片和运行时 lowering 与作者作用域正交并默认隐藏。
- 本卡先冻结审计和 schema，再分批迁移；不接受“大爆炸一次重写”或“先改 UI 再补数据”。

### 已知风险

- 风险：机械内联破坏 call 返回、jump 尾转移、stop、段推进和对话持续态。
  - 缓解：入仓 CFG/entry-exit state 审计；按图类型分批，金丝雀与属性测试并行。
- 风险：循环恢复错误导致 autoScript 速度、yield 或退出条件变化。
  - 缓解：loop schema 显式节拍/让步；用真实迁移命令序列和 6051 行为验证，不手写近似。
- 风险：不可约图被硬塞入结构化 AST，产生复制爆炸或语义漂移。
  - 缓解：具名状态机是一等作者对象；编译器只 lowering，不反向污染作者模型。
- 风险：行为槽与现有 EntityPage、entityState、entityStage 重复建模。
  - 缓解：优先演进现有 page/stage；设计签字必须给出唯一状态权威和存档键。
- 风险：MG2 把上游新结构与用户已编辑内部 body 合并错位。
  - 缓解：先定义 canonical identity 和旧 body 归属映射；每批三方合并 fixture + 冲突 fail-loud。
- 风险：剪枝误删仍可由动态 binding 到达的体。
  - 缓解：入口扫描必须同时覆盖静态根、author roots、setEntityAuto/Trigger、scene hook、物品/技能/
    战斗/全局入口；s018 异常单独钉死。
- 风险：共享尾部判定只看多前驱，把 CFG join 错升为公共 API。
  - 缓解：共享需要业务名、作者元数据和跨 owner 复用理由；多前驱只是审计线索。
- 风险：lazy load/chunk 体积因结构化内容复制而退化。
  - 缓解：canonical 合并与物理分片分开；编译产物可去重但不泄漏身份，继续执行 `<1MiB` 门禁。
- 风险：任务跨度过大导致长期分支和难审。
  - 缓解：严格按 P0-P7 小批次推进；每批独立证据与回滚边界，Coding Owner 仍保持唯一。

### 主审立场

- Reviewer: Kimi（架构/schema/公共接口主审）+ GLM（覆盖/迁移/测试矩阵主审）
- 结论: **Kimi agree（2026-07-23）**——canonical author model 与 generated execution/storage model
  分层、实体具名行为槽、场景本地 hook、结构化控制流/状态机方向逐项成立，无架构 counter。
- 必改项（R，build 必落钉；与 GLM G1-G7 互补，不重复）:
  - **R1 MG2 归属映射与墓碑机制（G6 的机制落地）**：实证 MG2 无任何 rename/remap——身份锚 =
    文件路径 + 登记域 id + 脚本虚拟视图的 script id 字符串，body 整条原子合并
    （migration-merge.ts:90-113,355；script-library-normalize.ts:54-101）。本卡 P2 剪 3,345 体、
    P3 合并 tail、P4 重键 342+198 绑定、P6 重键共享脚本，每批都在换/删 id；按现逻辑作者未改的
    旧 id 随 theirs 静默 delete+add（归属链丢失），作者改过的以 delete-modify 冲突拦下（零写盘兜底
    成立但不是归属迁移）。**P1 必须交付**：迁移器每批输出确定性的 旧 id → 新身份 映射产物
    （含"已折叠/已剪枝"墓碑），MG2 消费它做归属重键或显式命名冲突；P2 剪枝必须凭该产物证明
    零作者内容丢失，不得裸 delete+add。
  - **R2 版本轴与旧档升级纪律（G4 的精确化）**：(a) canonical Command 联合变更（作者 jumpScript
    退役、行为槽/hook 变体/状态机落地）必须 bump contentVersion v4→v5，走 open-local 升级器链
    （open-local.ts:40-81 既有 8 升级器模式）+ loader/validate 硬闸（loader.ts:193-194），不做
    "v4 内部静默变形"。(b) SAVE_VERSION 策略必须显式裁定：当前 SAVE_VERSION=4 从未真正 bump
    （save/ops.ts:76 仅挂点注释），全部旧档兼容 = 逐字段 `??=` + fail-loud。新增实体活动槽 Record
    可按 `??=` 惯例缺省——**旧档无持久 mutate 态是结构性事实**（WorldScriptState 无 auto/trigger
    字段，scene 为运行时克隆；GLM G4 的"把 mutate 态迁成持久态"应精确化为"新增持久层，旧档
    按缺省处理"，不存在要抢救的旧档指针）。但 sceneScriptOverrides 是持久的且可携带 ScriptRef
    值（指向 `scene/<scene>/override/<slot>/L-*/stage-*` 内部 id），内部 id 退役后旧档必断：必须凭
    R1 映射迁到具名 hook 变体 id，缺失 fail-loud——这是 SAVE_VERSION 首个版本化迁移的候选，
    不允许静默丢弃玩家剧情进度。
  - **R3 唯一状态权威（槽 vs page vs entityStage）**：P1 schema freeze 必须钉死：具名行为槽与
    EntityPage 的包含关系（优先演进现有 page/stage，不另造平行实体系统）；槽身份不得携带
    `d-<hash>` 对话入口态（入口/出口相容性由 P3 审计证明后才允许合并）；`world.entityStage`
    的旧数字只允许经迁移映到活动槽内稳定 `StageId/StateId`（切槽按显式语义回 initial），防
    重排与跨槽段号串扰；trigger mode
    （0x40 on/range）与槽内容正交；mode 原子绑多槽时不复制 EntityPage 外观字段语义。运行时
    只在 world 覆写存 `实体 + 通道 → 槽 id`，解析到静态 def，不 mutate（保持 main.ts 现状方向）。
  - **R4 语义保持证据（G7 锚点化）**：callScript stop-continue（script-runner.ts:395-417 的
    ScriptStopped 捕获）与 jumpScript 尾转移（:757-760 ScriptJump）在结构化/lowering 后必须有
    等价测试；`script.ts:364` 的“主脚本期间暂停”旧注释不是运行时真值，实际语义是 auto 与
    主脚本并行、仅被 authority 接管的实体暂停冲突动作、hidden 实体在段边界挂起
    （main.ts:2569-2594,2782-2813）。100ms command pace、40ms 段间让步、120ms hidden
    轮询以及 authority move/chase 的 150/200ms 等待必须作为显式兼容调度边界保留；
    e2493/e2495、auto 自环、多状态 NPC 金丝雀按验收在 6051 回归。
  - **R5 P0 审计字段（G1 补充）**：除 G1 口径冻结外，入仓审计必须逐 body 输出：address-0 语义
    分类（空指针 vs 自环控制值）、0x6D 目标 scene 上下文、`d-<hash>` 入口态清单（供 P3 相容性
    证明）、源 CFG 326 循环 vs 产物 676 SCC 口径并列解释；任何数字变化必须可追溯到审计脚本
    版本，不手改卡内终值。
- 是否建议进入 build: **是**——三签齐（2026-07-23），R1-R5 与 G1-G7 为 build 必落钉，
  P0/P1 批次输出即冻结物；Status 翻 build 由 Coding Owner 接手时执行。

### 三方争议记录

- Codex: **agree（2026-07-23）**。接受 Kimi R1-R5 与 GLM G1-G7 作为 build 必落钉；P0
  先冻结统一审计口径与机器可读基线，未完成前不进入 schema / save / runtime 改造。
- Kimi: **agree（2026-07-23）**。架构/schema/存档/MG2 压测通过；发现两个真实缺口（MG2 无
  rename/remap、版本轴未点名）升为 R1/R2 必落钉而非 counter——卡内 P1 本就负责冻结 schema/
  存档/MG2 冲突键，钉子是把冻结标准写具体。与 GLM 的口径修正互洽：卡内数字勾稽自洽，
  GLM 独立复跑的口径差异（7,932 vs 8,102 等）由 G1/R5 在 P0 同口径审计中冻结终值。
  对 G4 的一处事实精确化：旧档不存在持久 mutate 态（结构性保证），升级是新增持久层而非
  抢救旧指针；真正的旧档断点是 sceneScriptOverrides 里的 ScriptRef 值（R2）。
- GLM: **agree**。覆盖/迁移/审计/测试矩阵审查通过；顶层统计成立，可达性与引用计数因入口覆盖范围
  存在口径差异（见「GLM 数据审查」），P0 入仓审计冻结同口径后不阻塞。附 G1-G7 必改项。
- 用户拍板: 用户已确定目标方向；具体 schema、存档升级和批次风险待三方设计签字。

### GLM 数据审查（2026-07-15）

**方法**：只读审查，不改实现文件。独立复跑 `buildPalMigration(sources)` + 逐行核对 schema/迁移/运行时代码锚点。

#### 独立复跑冻结统计（顶层成立 + 口径差异标注）

| 指标 | 卡内冻结 | GLM 独立复跑 | 结论 |
|---|---:|---:|---|
| 脚本体总数 | 11,447 | **11,447** | ✅ 一致 |
| 场景 scope bodies | — | **11,428** | ✅ |
| 共享 scope bodies | — | **19**（13 scc + 6 user） | ✅ |
| `shared/scc-*` | 13 | **13**（逐条 id 列出见下） | ✅ 一致 |
| `shared/user/*` 作者根 | 6 | **6**（pal-item-use/265,267,280,293 + 2） | ✅ 一致 |
| 场景根外部绑定 | 5,942 | **5,935 场景根** + 6 作者根 + 1 s018 = 5,942 | ✅ 一致 |
| runtime reachable body | 8,102 | **7,932** | ⚠️ 口径差异（见下） |
| unreachable body | 3,345 | **3,515** | ⚠️ 口径差异（见下） |
| callScript 递归引用 | 675 | **6,515**（全量 callSite） | ⚠️ 口径差异（见下） |
| jumpScript 递归引用 | 2,642 | **2,641** | ✅ 近似一致 |
| setEntityAuto.script | 342 | **388** | ⚠️ 口径差异 |
| setEntityTrigger.script | 198 | **200** | ✅ 近似一致 |

**口径差异分析**：
- **可达性（7,932 vs 8,102）**：GLM 的 BFS 只从场景根 callScript/jumpScript 出发标记可达体，**未覆盖** author
  roots（`shared/user/*` 入口）、item use 脚本入口、skill 入口和动态 binding（setEntityAuto/Trigger 的 script.id）。
  卡内 8,102 包含了这些额外入口。**G1 必落**：P0 审计入仓必须明确列出全部入口来源分类，用同口径脚本冻结。
- **callScript（675 vs 6,515）**：卡内 675 可能是"去重后的 distinct callScript 目标 id 数"或"外部绑定中的 callScript
  数"，而非全量 callSite。GLM 全量 walk 得到 6,515 个 callScript callSite。**G1 必落**：P0 审计明确区分
  callSite（每次调用点）与 distinct target（不同目标 id）。
- **setEntityAuto（342 vs 388）**：GLM 的全量 walk 计 388；卡内 342 可能排除了已被 SpriteDef action 折叠的实例。
  **G1 必落**：P0 审计明确 setEntityAuto 的计数口径（含/不含已折叠）。

**GLM 结论**：顶层统计（11,447 / 13 scc / 6 user / 5,935 场景根）成立。可达性与引用数字的口径差异不阻塞签字——
卡内已明确 P0 必须入仓审计脚本并冻结同口径。但 **G1 必落**要求 P0 审计脚本的入口覆盖列表、callSite vs target
定义和折叠排除规则必须在 build 前冻结。

#### e2493/e2495 + s018 + 13 scc + 6 作者根 逐项核对

- **e2493（s154）**：page[0] trigger 3 stages，各为 `callScript → scene/s154/root/entity-e2493/page-0/trigger/stage-{0,1,2}`
  = 存储壳，真实逻辑在内部 target。✅ 金丝雀用例成立。
- **e2495（s154）**：page[0] trigger 2 stages，同模式 `callScript → scene/s154/root/entity-e2495/page-0/trigger/stage-{0,1}`。✅ 金丝雀用例成立。
- **s018 异常**：卡内称 1 个 s018 直接绑定内部体；GLM 在迁移产物中确认 s018 存在非标准绑定模式。**G2 必落**：P0 审计单独钉死 s018 的绑定来源和归属。
- **13 shared/scc-***：GLM 逐条列出 id——全部 `scc-L-<address>/...` 命名，用 `migrate-content.ts:1885-1889 sccFor()` 的
  `component?.[0]`（Tarjan SCC 首地址）。卡内称"全部无环"——GLM 未独立验证 SCC 无环性（需 script-graph.ts 的 Tarjan），
  但命名机制确认。**G3 必落**：P0 审计验证 13 个 scc 的实际 SCC 状态并解释为何命名错误。
- **6 shared/user/***：`pal-item-use/265,267,280,293 + 2`，全部通过 call 再进入内部 target（C8 的 267 已迁移为
  `shared/user/pal-item-use/267`，body = `callScript → shared/scc-L-39805/...`）。✅ "空壳桥接内部块"确认。

#### 关键代码锚点核对

- **ScriptBinding 双形态**（script.ts:14-19）：`{ stages } | { script: ScriptRef }` —— 作者行为和分片实现混在同一
  公共 schema。setEntityAuto/Trigger/setSceneOnEnter/Teleport（script.ts:207-211）都携带 ScriptBinding。
  ✅ 确认是 N3-1 要消灭的"作者行为 = 裸 ScriptRef"形态。
- **jumpScript 在作者 Command 联合**（script.ts:229）：`{ kind: 'jumpScript'; ref: ScriptRef; self?: string }` —— 作者可见。
  ✅ 确认 N3-1 目标"jumpScript 不再是作者命令"。
- **EntityPage 已有 stages 地基**（script.ts:358-364）：`{ state?, trigger?: TriggerSpec, animation?, auto?: { stages } }`。
  ✅ 确认 N3-1"优先演进现有 page/stage"可行，不另造第二套实体系统。
- **main.ts:1950-1979 setEntityAuto/setEntityTrigger 直接 mutate pages[0]**：GLM 逐行确认——`e.pages[0] = { ...e.pages[0], auto: ... }`
  直接修改活体场景实体，**不持久化到 world.entityAuto 或任何 world state 字段**。sceneScriptOverrides 存在于
  WorldScriptState（script.ts:389），但 **entity auto/trigger 动态覆写没有对应持久层**。
  ⚠️ **G4 必落**：这是 N3-1 最大的存档/schema 风险——当前动态 auto/trigger 切换在场景重载/读档后丢失。
  P1 schema 冻结必须给出 world state 持久层（稳定行为 id 存入 save），且旧存档升级要把 mutate 态迁成持久态。
- **sccFor 命名**（migrate-content.ts:1885-1889）：`scc-L-${component?.[0] ?? address}` —— 用 Tarjan SCC 首地址命名。
  ✅ 确认命名机制；若 SCC 实际无环则命名误导。

#### GLM 必改项（G，build 验收核对）

- **G1 P0 审计口径冻结**：入仓审计脚本必须明确列出全部入口来源分类（场景根 / author roots / item use / skill /
  dynamic bindings / hostile / sceneScriptOverrides），区分 callSite vs distinct target，setEntityAuto 计数口径
  （含/不含已折叠），可达性 BFS 的完整入口集。用同口径脚本冻结全部数字，替换卡内手算值。
- **G2 s018 异常钉死**：P0 审计单独列出 s018 的绑定来源、归属和迁移方案，不得混入合计。
- **G3 13 shared/scc SCC 验证**：P0 审计用 script-graph.ts Tarjan 验证 13 个 scc-* 的实际 SCC 状态（是否有环），
  解释命名错误的根因，确认 P2 停止生成该命名后无引用残留。
- **G4 entity auto/trigger 持久层**：P1 schema 冻结必须给出 world state 持久层（稳定行为 id），当前 main.ts:1950-1979
  的 mutate pages[0] 不进存档/读档。旧存档升级要把 mutate 态迁成持久态，缺失目标 fail-loud。
- **G5 P4 具名行为迁移覆盖**：本条签字时记录的 342 auto + 198 trigger 是 stored-body ScriptRef
  引用子口径；P1 的 G1 最终冻结全命令口径为 388 auto + 202 trigger，两者都必须对账并全部迁到具名槽；e2493/e2495 端到端
  金丝雀（实体检查器可见全部槽、切换按名字选择、运行时只记活动槽 id、存档重载一致）。
- **G6 MG2 冲突键**：MG2 合并必须以 canonical author identity（行为槽/状态机/共享脚本的稳定 id）为冲突键，
  不以生成 block 做冲突键；每批三方合并 fixture + 冲突 fail-loud + 二跑 0/0/0。
- **G7 循环/状态机测试矩阵**：331 runtime reachable 循环逐类测试（结构化 loop / 领域行为 / 具名状态机）；
  loop yield/退出保护、call-vs-jump 退出语义、auto 节拍回归；不可约图不允许匿名 private block。

## 额度 / 代班记录

- 缺席 Agent: Kimi
- 缺席原因: 订阅额度耗尽
- 代班 Agent: GLM
- 代班范围: 在 Kimi 缺席期间，把原 Kimi 的架构/语义审查与原 GLM 的数据/覆盖/测试矩阵审查
  合并为一次只读审查；Codex 仍只负责实现和自验，不冒充独立审查席。
- 风险: 独立外部视角由两席缩为一席；以可复跑的全量 shadow、ledger、MG2 反例和根检查补偿，
  并保留 Kimi 补审债务。
- 是否需要补审: 额度恢复后补审；当前批次不因该债务阻塞。N3-1 最终验收时若仍未补签，须再次
  请用户决定是否延续豁免。
- 用户裁决: 2026-07-24 用户明确说明“Kimi 没有额度了，合成一个都让 GLM 审核”；P3/P4 已按此
  完成，P5 继续采用同一代班方式。P5 仍须 GLM `accept` 才能进入 P6。

## Build: 实现与自测

- Coding Owner: Codex（2026-07-23 接手；build 阶段唯一实现文件修改者）
- P0 修改文件:
  - `packages/migrate/src/script-control-flow-audit.ts`
  - `packages/migrate/src/script-control-flow-audit.test.ts`
  - `packages/migrate/src/script-control-flow-audit.pal.test.ts`
  - `packages/migrate/scripts/audit-script-control-flow.mts`
  - `packages/migrate/baselines/script-control-flow/pal-v1.json`
  - `packages/migrate/src/translate-events.ts`
  - `packages/migrate/src/migrate-content.ts`
  - `packages/migrate/src/pal-migration.ts`
  - `packages/migrate/src/script-overlays.ts`
  - `packages/migrate/package.json`
- P0 实现摘要（2026-07-23）:
  - 新增默认只读、仅显式 `--write-baseline` 才更新的 PAL 控制流审计 CLI；基线使用紧凑 JSON，
    `--json` 仍输出便于阅读的格式，避免 Vitest 对 30+ MiB 文本构造巨型 diff。
  - 同时冻结 legacy raw CFG、按 auto/trigger 上下文拆分的 semantic CFG、产物同步调用图三套口径；
    动态实体绑定与场景 hook payload 均作为 deferred binding，不参与同步 SCC。
  - 入口分类账覆盖最终 scenes/items/skills/enemies/actors、作者库声明及 s018 直接绑定；区分 site、
    distinct target、distinct caller，并输出每个 body 的 product component、可达性、前驱与来源分类。
  - 迁移器只增加审计旁路证据：registry 逐 body 源地址、对话入口/出口态、scene root/0x6D override
    origin，以及 SpriteAction/HostileBehavior 折叠前入口；不改变 canonical content、runtime、save
    或 `projects/pal`。
  - address 0 按 opcode 与入口通道分类；未知语义、悬空引用、未分类 body/不可达体、折叠重叠、
    非法 0x6D scene 和缺失 hook 上下文均 fail-loud。
  - 61/61 个动态场景 hook 均能从调用 body 自身 provenance 回溯到精确安装源地址；87 个
    override body 均保留安装 path/address 和目标 scene/slot。修复 `script-overlays` 深克隆丢失
    WeakMap 审计证据的上游根因，6,453 个 content-entry body 均有非空源地址；删除曾短暂采用的
    “全源唯一目标反推”，并以合成测试证明缺少调用体 provenance 时不得猜测来源。
  - deferred 传播覆盖 scene hook 与 entity auto/trigger 两类 binding 的 ScriptRef 和 inline stages；
    绑定 payload 中的调用不参与当前 tick 同步 SCC，合成自环测试防止伪循环回归。
  - 金丝雀钉死 s018、e2493/e2495 trigger/auto 分通道、6 个作者桥接根、13 个误导性
    `shared/scc-*`、532 个共享尾部和对话入口态。
- P0 冻结结果:
  - source：43,503 commands；6,767 entry sites / 6,747 graph seeds；legacy raw
    42,680 edges、40,205 components、326 cyclic；semantic 42,028 nodes、
    38,802 components、302 cyclic；address-zero unknown=0。
  - product：11,447 bodies；3,857 reference sites（execution 3,222 / deferred 635）；
    5,942 runtime entry sites；8,102 reachable / 3,345 unreachable；
    676 cyclic components / 778 bodies；532 shared tails。
  - folded：SpriteAction 387 entities / 863 bodies；HostileBehavior 828 entities /
    2,482 bodies；overlap=0、unclassified=0。
  - baseline digest:
    `97d3a22a28b2d8dd0d26a007e05e009576a1b8815b5b332a64954dd88c61bdbc`。
- P0 运行命令:
  - `pnpm --filter @type-pal/migrate typecheck` → pass。
  - `pnpm --filter @type-pal/migrate exec vitest run src/script-control-flow-audit.test.ts
    --reporter=verbose` → 10 passed；含反误配与 entity inline-stage deferred 假 SCC。
  - `pnpm --filter @type-pal/migrate exec vitest run src/script-control-flow-audit.pal.test.ts
    --reporter=verbose` → 2 passed；含 Map 逆序字节确定性。
  - `pnpm --filter @type-pal/migrate audit:script-control-flow -- --check` → baseline 一致，
    issues=0。
  - `pnpm --filter @type-pal/migrate test` → 40 files passed，295 passed / 1 skipped。
  - `pnpm exec biome check <P0 files>`、`git diff --check` → pass。
- 浏览器 / 手工检查: P0 是迁移审计与机器基线，不改变编辑器或游戏 UI，无适用视觉检查。
- 跳过的检查及原因:
  - 未全量运行仓库根 `pnpm check`；P0 变更只在 migrate 包，已完成该包 typecheck、全量测试、
    Biome 与 PAL 真源审计。进入 P1 前仍需独立设计审查，不在 P0 提前修改 schema/runtime。
  - 额外试跑未启用的 `exactOptionalPropertyTypes` 得到 194 行既有跨包/迁移包错误；其中
    `script-control-flow-audit.ts` 无命中。该实验开关不是当前 tsconfig 门禁，不在 P0 扩修既有
    optional 字段债务。

### P2 影子迁移实现与自测（2026-07-24）

- P2 边界:
  - 只新增 `packages/migrate/src/experimental/script-v5/`、影子 CLI
    `packages/migrate/scripts/migrate-script-v5-shadow.mts` 和包脚本；影子根固定为已被
    `.gitignore` 命中的 `packages/migrate/.shadow/N3-1/v5/p2/`。
  - 没有改 `CONTENT_VERSION`、现行 v4 schema/validator、runtime/editor loader、
    `projects/pal/**` 或权威 PAL v4 baseline；影子 manifest 明示
    `canonical=false`、`runtimeConsumable=false`。
  - 影子 target 不是摘要壳：它包含真实 base/ours/current-generator 三方预检后的完整
    842 文件 v4 author-preserving merged layer，再叠加 P2 IR、transition ledger 和验证报告；
    `content/locale.json` 的作者改动按 ours 原字节保留。
- P2 IR / ledger:
  - 冻结守恒 `11,447 = 8,102 retained + 3,345 tombstone`；tombstone 精确为
    `863 folded-sprite-action + 2,482 folded-hostile-behavior`，overlap/unknown 均为 0。
  - 3,345 tombstone 全部带 P0 source audit 证据和枚举 reason；ledger 有 3,347 entries
    （3,345 tombstone outcome + s018 body/installer 两个 group outcome）、1 个一等
    `s018-owner-resolution` TransitionGroup，采用 `resolve-s018-owner-v1` +
    `conflict-if-modified`。
  - s018 跨场景内部 trigger body 迁为唯一
    `s015/e204/trigger/enter-s018` 归属，installer 同组改为具名行为选择；body 与 installer
    任一被作者修改/删除或新增入站引用时均冲突且零写。
  - 13 个误导性 `shared/scc-*` 仅退役 shadow active identity，保留为有证据的
    `pending-owner`；P2 没有声称现行 v4 generator 已停止生成。其余 P3/P4/P5/P6 pending
    分别为 1,715 / 5,939 / 433 / 14，共 8,101。
  - 全 legacy mutation census 为 844：
    `388 auto + 202 trigger + 192 triggerMode + 60 onEnter + 1 onTeleport + 1 clear`。
    P2 精确迁 1 个 s018 trigger，留下 843；trigger 守恒为 `202 = 201 pending + 1 P2`，
    其中输入事实仍为 `198 stored-body ScriptRef + 3 stored-body inline + 1 s018 scene-direct`。
- MG2 / 确定性 / 写入安全:
  - 使用真实 PAL baseline、当前项目和 current generator 做 v4 三方合并预检：
    `842 managed / 0 writes / 0 deletes / 0 conflicts / kept 1`；完整 merged v4 target digest
    `b41c0f7cef5d67170160f9eedd19158274ce03b40721415eaf81b84921c29db4`。
  - P2 transition 首跑为 `2 writes / 3,346 deletes / 0 conflicts`（1 个具名 behavior、
    1 个 installer rewrite、3,345 tombstone body 与旧 s018 body 删除）；对虚拟结果再跑为
    `0/0/0`。这与 v4 三方预检、shadow 文件写盘计划是三套独立口径。
  - 影子包两次独立构建（第二次逆序输入）字节一致；IR digest
    `84513fb87d8298b2181359dcd0a94941d52dd89bb0a8e3d9b087ef0015754f1d`，
    ledger digest
    `31c0a2e46c8311e93883ebe1c6c104a1a4f891236f82c6937253a5548291cac5`，
    validation digest
    `63919e17fa6be6d69ba24ceaa33fdde75c6c7353a7b6a1c1ac5cf74e4fd12e88`，
    bundle CLI digest
    `e80638f09cc195622441e9f30c983dd9ee80667bb1a838b2827fa3dffea243bc`。
  - 固定目录共 853 个文件（852 个 manifest artifacts + manifest 本身）；真实写盘后再次
    运行的首计划与复核计划均为 `0/0/0`。
  - writer 拒绝绝对/非 canonical/反斜线/NFC 碰撞/大小写碰撞/父子冲突路径、symlink 与
    非普通文件；apply 会复算计划、拒绝伪造或过期 plan，使用 sibling lock + staging +
    backup 的事务式目录替换，并在失败时恢复旧根。
- P2 验证命令:
  - `pnpm --filter @type-pal/migrate typecheck` → pass。
  - `pnpm exec biome check packages/migrate/scripts/migrate-script-v5-shadow.mts
    packages/migrate/src/experimental/script-v5 packages/migrate/package.json` → pass。
  - strict JSON / CLI parser / shadow writer：3 files / 30 tests passed。
  - PAL 真源 P2：1 file / 8 tests passed；覆盖 s018 原子组、作者修改/删除、作者新增入站引用、
    ScriptRef chunk 非身份、library metadata source drift、ledger 关系篡改与完整 bundle 闭包。
  - `pnpm --filter @type-pal/migrate audit:script-control-flow -- --check` → P0 digest
    `97d3a22a28b2d8dd0d26a007e05e009576a1b8815b5b332a64954dd88c61bdbc`
    一致，issues=0。
  - `pnpm --filter @type-pal/migrate migrate:script-v5:shadow -- --check` →
    853 artifacts，临时根写盘后 second file plan `0/0/0`。
  - `pnpm --filter @type-pal/migrate migrate:script-v5:shadow` 连跑两次 → 固定根第二次
    `first=0/0/0, second=0/0/0`。
  - `pnpm --filter @type-pal/migrate test` → 44 files passed，333 passed / 1 skipped。
  - 仓库根 `pnpm check` → 7 个 workspace package 的 typecheck/test 全通过，随后
    `biome check .` 检查 865 files 通过；其中 migrate 仍为 44 files / 333 passed + 1 skipped，
    editor 81 files / 691 passed，其余包门禁亦无失败。
  - `git diff --check` 与 P2 范围审计 → pass；确认无 `projects/pal`、权威 v4 baseline、
    runtime/loader 越界改动，shadow 根确被 ignore。
- P2 未做事项:
  - 仍未进入 P3，不生成 canonical v5，不发布 runtime/editor/save 接线，不更新 capability map。
  - P2 代码与证据现进入 Kimi / GLM 独立只读审查；三方 P2 `accept` 前不得进入 P3。

### P3 无环控制流影子实现与自测（2026-07-24）

- P3 边界:
  - 继续只产出 `canonical=false`、`runtimeConsumable=false` 的累计 shadow IR / ledger；
    `n3P3FlowExit` 是带来源证据的 generated lowering 节点，不是 `AuthorCommand`、作者身份、
    save key 或 runtime 输入。
  - 未改 `CONTENT_VERSION`、v4 schema/validator/runtime/editor loader、`projects/pal/**`、
    P0 权威 baseline 或 P2 固定根；CLI 默认最新 `--through p3`，同时保留
    `--through p2` 的历史批次复跑入口。
- 1,715 个 P3 candidate 全量分类，无 unknown:

  | 分类 | body | 入站处理 | P3 结论 |
  |---|---:|---:|---|
  | 唯一 jump tail | 579 | 579 sites | 原位吸收到唯一 caller，保留 non-returning + `macroTask`、世界钟 +0 |
  | 同 caller 条件臂 diamond/join | 20 | 76 sites | 恢复为共享 branch/switch continuation，不复制 shared tail |
  | call boundary | 622 | 原样保留 | call 正常/stop 返回契约不变，转 P4 owner allocation |
  | entity auto/trigger binding | 455 | 原样保留 | deferred binding 不冒充执行前驱，转 P4 |
  | 跨 caller shared join | 38 | 原样保留 | 单 owner 结构化证据不足，显式转 P4，禁止复制 |
  | jump + auto binding 混合入口 | 1 | 原样保留 | 绑定与执行必须同组归属，显式转 P4 |

  守恒为 `1,715 = 579 + 20 + 622 + 455 + 38 + 1`。P3 共吸收 599 bodies、把 655 个
  active `jumpScript` site 改写为 generated flow exit；P2 的 8,102 retained 表示为
  `7,503 retained + 599 structured`，反向恢复 8,102/8,102，dangling=0，
  absorbed target active jump ref=0，`callScript` site change=0。
- 相容性与体积门禁:
  - 每个结构化目标都重新核对 registry `d-<hash>` 入口身份、target self 与全部 incoming
    command self；599/599 通过。
  - 按 P0 source addresses 检查 `lastRngChunk` 的 0x36/0x37 与 `pendingAuto` 的
    0x8A/0x07：所有 599 个目标均无“先消费继承态再定义”的入口，RNG / pending battle-auto
    violation 均为 0；同 caller diamond 的全部入口都位于 `then/else/onNo/onLose/onFlee/onFail`
    条件臂。
  - 门限固定为 materialized AST 512、单 target 65,536 bytes、projected chunk 1,048,576
    bytes；PAL 观测最大分别为 **318 / 2,354 / 313,528**，violations=0。跨 caller join 不靠
    复制绕过门禁。
- 累计 ledger / MG2 作者保护:
  - P3 ledger 有 4,601 entries：P2 的 3,347 entries 原样保留，再加 599 target body cell +
    655 incoming jump cell；共有 600 groups（P2 s018 组 + 599 flow absorption groups）和
    3,945 evidence（P2 3,346 + P3 599）。
  - 每个 flow group 使用 `conflict-if-modified`，同时锁定 target body 与全部 incoming cell；
    依赖另一结构化 tail 的组显式登记 `dependsOn`。作者修改 target、修改入站 jump、删除或
    新增入站引用均整批零写冲突；纯 `ScriptRef.chunk` 变化仍不算作者身份/正文变化。
  - 首次 v4 -> 累计 P3 dry plan 为 **657 writes / 3,945 deletes / 0 conflicts**
    （含 P2 2/3,346，再加 655/599）；P3 -> 同一 P3 repeat plan 为 **0/0/0**。
  - pending 由 P2 的 `P3:1,715 / P4:5,939 / P5:433 / P6:14` 收口为
    **`P3:0 / P4:7,055 / P5:433 / P6:14`**；P4 增量 1,116 全部有枚举 reason，不把
    call、binding 或多 owner join 静默当作已完成。
- P3 验证证据:
  - `pnpm --filter @type-pal/migrate typecheck` → pass。
  - migrate 全量测试 → **46 files passed，343 passed / 1 skipped**；新增 P3 单元与 PAL
    golden 覆盖分类、RNG/pendingAuto 反例、8,102 全量可逆、599/655 守恒、作者 body/ref
    修改、新增入站引用、rechunk 非冲突、ledger 关系篡改、deterministic bundle 与完整
    manifest 闭包。
  - 仓库根 `pnpm check` → 7 个 workspace package 的 typecheck/test 全通过，随后
    `biome check .` 检查 870 files 通过；其中 editor 81 files / 691 passed，
    migrate 46 files / 343 passed + 1 skipped，其余包门禁亦无失败。
  - `pnpm --filter @type-pal/migrate audit:script-control-flow -- --check` → P0 baseline
    digest `97d3a22a…61bdbc` 一致，issues=0。
  - `pnpm --filter @type-pal/migrate migrate:script-v5:shadow -- --through p3 --check` →
    **854 artifacts，first=854/0/0，second=0/0/0**，bundle digest
    `eee18a789d88c68bbd350dd5b813b5e45414991edf1003592218e64bc3b0d7d3`。
    IR / ledger / validation digest 分别为
    `3af213880ccd41ba49b22c3c80c395a1232f4d8924933a617e3f6548159c14ef` /
    `7444c3ac2e89297acd4650ccf3278b633584418fb9e8d0d3fd02095f3651a574` /
    `f18f91d6403493e2532720ad2c82daff1fa623ec03a02dac0edbc092497051a1`。
  - 固定根 `packages/migrate/.shadow/N3-1/v5/p3/` 写入后再次运行 →
    **first=0/0/0，second=0/0/0**。
  - `git diff --check` → pass；P3 范围审计确认未触碰 canonical/runtime/editor/project/
    baseline。
- P3 未做事项:
  - 622 call owner、455 entity binding、38 跨 caller join 与 1 个混合入口只完成显式重分类，
    归属/具名行为吸收属于 P4；433 cyclic bodies 属于 P5，14 author roots 属于 P6。
  - P3 Codex 自验完成，现进入 GLM 架构、控制流语义、数据守恒与测试矩阵合并只读代审；
    GLM `accept` 前不得进入 P4，更不得把 N3-1、C8 或 ED-5I 标记 done。

### P4 实体/场景具名行为影子实现与自测（2026-07-24）

- P4 边界:
  - 继续只生成 `canonical=false`、`runtimeConsumable=false` 的累计 shadow IR / ledger；
    新增 Page、EntityBehavior、SceneHook 的显式升级分配，但没有把它们接入现行 v4
    schema/validator/runtime/editor/save。
  - 未改 `CONTENT_VERSION`、`projects/pal/**`、P0 权威 baseline 或现行 loader；固定影子根为
    `packages/migrate/.shadow/N3-1/v5/p4/`。当批 CLI 默认最新 `--through p4`，仍可复跑 P2/P3。
- 稳定作者身份与 stage 分配:
  - 3,616 个单页实体获得显式 Page identity；4,300 个实体行为 owner 精确分为
    `2,834 static trigger + 987 static auto + 172 dynamic trigger + 307 dynamic auto`。
  - 284 个场景 hook owner 精确分为
    `160 static onEnter + 67 static onTeleport + 56 dynamic onEnter + 1 dynamic onTeleport`。
    作者 owner 合计 4,584；Page 与 owner 是不同身份层，不能用位置、地址、hash 或 chunk 派生。
  - 6,502 个 stage 分配精确分为
    `5,664 static entity + 479 dynamic entity + 271 static hook + 88 dynamic hook`。
    升级器只显式分配 `default`、金丝雀 `enter-s018`、`legacy-###` 和 stage
    `initial` / `legacy-###`；同一输入顺序变化不改变 id。
- P4 owner 收口与用户方向:
  - 7,055 个 P4 candidate 全量归属：7,038 个单作者 owner 直接吸收，P2 已迁的 s018 与其 owner
    fragment 汇合，累计得到 7,039 个 owner fragment；17 个真正跨作者 owner 的复用体不复制、
    不猜唯一 owner，以 `p4-cross-owner-reuse` 明确转交 P6。
  - pending 收口为 **`P3:0 / P4:0 / P5:433 / P6:31`**；P6 从 14 增至 31，增量恰为上述
    17 个跨作者复用体，零 body copy。
  - 按用户裁决，“shared”只表示真正跨调用方复用的业务逻辑，不表示复杂。物品 268
    `craftRecipe`、270 `drawFromResourcePool` 已属于领域模型，P4 没有把它们重新分配成共享
    脚本；剩余 item `runScript` 的领域化判断留给 P6。蓝图编辑视图只保留在
    `docs/phase2/design-backlog.md` 议题 17，N3-1 P7 后另开卡。
- legacy 选择命令归零计划:
  - 累计 844 个 legacy mutation site 全部有具名选择 rewrite：P2 s018 1 个 + P4 843 个；
    目标命令精确为 `590 selectEntityBehavior + 192 setEntityTriggerActivation +
    62 selectSceneHooks`。
  - 这组 844 与 P2 冻结的
    `388 auto + 202 trigger + 192 triggerMode + 60 onEnter + 1 onTeleport + 1 clear`
    一一守恒；P4 owner body 中遗留 legacy selection command=0。
- 累计 ledger / MG2 作者保护:
  - ledger 为 **16,325 entries / 5,220 groups / 8,565 evidence / 464 pending**；
    P4 新增 4,620 个原子 group，重算 owner source、全部 inbound 引用和 command inventory，
    不是只比较自带摘要。
  - 首次 v4 -> 累计 P4 dry plan 为
    **5,343 writes / 10,983 deletes / 0 conflicts**，包含 5,220 groups、3,345 tombstone、
    3,616 Page、4,584 owner、7,039 fragment、843 个 P4 selection rewrite，并保留
    P3 的 599 bodies / 655 sites；P4 -> P4 repeat plan 为 **0/0/0**。
  - 作者修改 body/Page/command、删除或新增 P4 fragment 入站引用、owner inventory 漂移、
    ledger 关系篡改都会整组冲突且零写；纯 ScriptRef rechunk 不制造假冲突。
- P4 验证证据:
  - `pnpm --filter @type-pal/migrate typecheck` → pass。
  - P4 单元、PAL 真源和 CLI 测试覆盖 owner/stage cardinality、e2493/e2495/s018、844 全命令
    rewrite、17 个跨 owner 零复制、268/270 领域方向、8,102 可逆、deterministic bundle、
    作者修改/新增引用/rechunk/ledger 篡改和重复运行。
  - `pnpm --filter @type-pal/migrate migrate:script-v5:shadow -- --through p4 --check` →
    **854 artifacts，first=854/0/0，second=0/0/0**，bundle digest
    `28c118af64963694bcbe89fdac5b6f3edba0566fafbfa11cefa141af3d376a82`。
    manifest core / IR / ledger / validation digest 分别为
    `90a061318a1e0db0c769ce904b77b2cd132131118fb263f38d36c642835be874` /
    `a3f238d937e3a28ef6e349c0741ceb0194813870dd72a72600d800066cf701ac` /
    `cf995a372ad4bb3214e00ef2e348c95d3faba3ce30ffb94f3c8055779ad60635` /
    `060ff7fac9d791b8bd302fcb3eb0b06e0b65dc75da4af15ec6212d16078dc42`。
  - 固定 P4 根首次写入为 `first=854/0/0, second=0/0/0`，再次运行两次均为 `0/0/0`。
  - 仓库根 `pnpm check` → 7 个 workspace package typecheck/test 全通过；migrate
    **48 files / 354 passed + 1 skipped**，editor **81 files / 691 passed**，随后 Biome
    检查 **875 files** 无问题。既有 sprite-action PAL census 在新增重 PAL 用例并发时曾触及
    默认 30 秒上限，独立复跑 16.29 秒通过；只把该既有测试预算显式设为 120 秒，未改断言。
  - 范围审计与 `git diff --check` 通过；未触碰 canonical/runtime/editor/project/baseline。
- P4 未做事项:
  - P4 只冻结影子 author allocation 与可执行迁移关系，不发布 canonical v5，不修改 runtime、
    editor、save 或 capability map。433 个循环体属于 P5，31 个作者/跨作者共享候选属于 P6。
  - Codex P4 自验 `accept`；现交 GLM 做架构 + 数据合并只读代审。GLM `accept` 前不得进入 P5，
    更不得把 N3-1、C8 或 ED-5I 标记 done。

### P5 循环与状态机影子实现与自测（2026-07-25）

- P5 边界:
  - 继续只生成 `canonical=false`、`runtimeConsumable=false` 的累计 shadow IR / ledger；
    新增的 `n3P5FlowExit` 只是 generated lowering 证据，明确不进入现行 `AuthorCommand`。
  - 未改 `CONTENT_VERSION`、现行 v4 schema/validator/runtime/editor/save、`projects/pal/**`、
    P0 baseline 或 capability map。固定影子根为
    `packages/migrate/.shadow/N3-1/v5/p5/`；CLI 默认最新 `--through p5`，仍可复跑 P2-P4。
- 331 个 runtime reachable product SCC 的完整分类:
  - 433 个 P5 body 精确分为 331 个 component：
    `275 size-1 + 10 size-2 + 46 size-3`；owner 通道为
    `323 auto + 6 trigger + 2 scene hook`，unknown=0。
  - 作者投影为
    **99 auto-runner repeat + 162 structured until loop + 70 named state machine /
    172 states**。auto 尾自环恢复为 auto runner lifecycle，条件自环恢复为
    `loop mode=until`；其余多节点/复杂图完整进入显式状态机，不保留匿名 private block。
  - 所有 flow/state/transition id 均由 owner/component 局部分配为
    `cycle` / `legacy-cycle-###`、`initial` / `legacy-###` 与
    `legacy-transition-###`；不含源地址、hash、chunk 或数组位置。3 个跨 owner component
    共享同一 cycle structure，body copy=0。
- 调度、退出与命令结果语义:
  - 冻结 P1 调度常量
    `command=100ms / stage=40ms / hidden=120ms / authority=150ms / chase=200ms`。
    694 个 SCC 回边全部使用可取消 `worldTick` yield；前向 flow transfer 使用
    `macroTask`，`worldClockAdvanceMs=0`，并显式终止当前 segment。
  - 结构化 loop 全部具有有限 `maxIterations=10,000`；validator 独立拒绝缺少 yield、
    cancellation、有限上限或悬空 flow/state 目标的形态。
  - P4 表示层内 1,297 个 `jumpScript` site 中，P5 精确改写 1,286：
    `753 cycle body + 528 owner fragment + 5 P3 flow structure`。其中
    `694 SCC back edge + 51 cross-component + 464 owner inbound + 69 acyclic owner flow`；
    剩余 11 个全部只指向 P6 synthetic target。
  - 753 个 cycle-body transfer 另有一等、可编辑的 author transition allocation：
    `230 body-end + 522 condition/then + 1 command-outcome(confirm:no)`；每条显式记录稳定 id、
    from state/body、trigger、target、scheduling 与 cancellation，并与 generated lowering
    一一反查，不再把状态机转移只埋在 generated body 中。
  - `confirm.onNo` 内嵌跳转金丝雀保留为 1 个显式 command-outcome transition；
    P7 必须把这类命令结果分支纳入 canonical transition/compiler，而不能静默丢弃。
- 累计 ledger / MG2 作者保护:
  - P5 新增 400 个原子 group（331 cycle structure + 69 acyclic flow-exit rewrite）；
    累计 ledger 为 **17,291 entries / 5,620 groups / 8,965 evidence / 31 pending**，
    pending 收口为 **`P5:0 / P6:31`**。
  - 首次 v4 -> 累计 P5 dry plan 为
    **6,207 writes / 11,416 deletes / 0 conflicts**；P5 -> P5 repeat plan 为
    **0/0/0**。
  - 作者修改任一 cycle body、修改或新增指向 cycle body 的入站引用、篡改 ledger/target
    关系均冲突且零写；仅 ScriptRef rechunk 不产生假冲突。累计反向重建仍为
    **8,102 / 8,102 bodies 可逆**，重复 stable id、悬空 flow target、跨 owner copy、
    pending unknown 均为 0。
- P5 验证证据:
  - `pnpm --filter @type-pal/migrate typecheck` → pass。
  - `pnpm --filter @type-pal/migrate test` →
    **50 files passed / 364 passed + 1 skipped**；覆盖 ID 分配、分类、PAL 真源 cardinality、
    753 个一等 author transition、调度/yield/loop cap、
    trigger/auto/state-machine/`confirm.onNo` 金丝雀、1,286 rewrite、
    3 个 cross-owner 零复制、8,102 可逆以及 MG2 fail-loud/rechunk/repeat。
  - `pnpm --filter @type-pal/migrate migrate:script-v5:shadow -- --through p5 --check` →
    **854 artifacts，first=854/0/0，second=0/0/0**，bundle digest
    `e6cf5374a0e5376b88846142ec0c5f71b19cf7929ded94482c91e6b9176dd0d2`。
    manifest core / IR / ledger / validation digest 分别为
    `a33bd2f4c6f2aaf6aec7a4e247efced6bd4a4da493ea0ee9719f504d11f6a410` /
    `fe27809368ef03f0d030fdba64725ec9bfaab7bc88d1d06030c0234a220fe69c` /
    `0d9a5801e48230cff95e9693259e687d62712641c67bdd1dffb47e6495b1c868` /
    `fc333f6007cc186a1a9e96c15deb8c5bd8eb78ce8d0cf202c3b932ffd7adc5c3`。
  - 固定 P5 根已刷新同一 854-artifact bundle（6 个变化文件），写入后复核计划为 `0/0/0`。
  - 仓库根 `pnpm check` → 7 个 workspace package typecheck/test 全通过；migrate
    **50 files / 364 passed + 1 skipped**，editor **81 files / 691 passed**，随后 Biome
    检查 **880 files** 无问题。`git diff --check` → pass。
- P5 未做事项:
  - P5 只冻结影子 cycle/state-machine author projection 与可执行迁移关系；canonical
    schema/compiler/runtime/editor/save 仍由 P7 一次事务发布。
  - 31 个 author-root / cross-owner / synthetic-target 候选仍属于 P6；P5 没有抢先宣称其
    shared 归属。Codex P5 自验 `accept`；现交 GLM 做架构 + 数据合并只读代审。GLM
    `accept` 前不得进入 P6，更不得把 N3-1、C8 或 ED-5I 标记 done。

### P6 共享脚本收口与旧模型退役影子实现与自测（2026-07-25）

- P6 边界:
  - 继续只生成 `canonical=false`、`runtimeConsumable=false` 的累计 shadow IR / ledger；
    固定影子根为 `packages/migrate/.shadow/N3-1/v5/p6/`，CLI 默认最新
    `--through p6`，仍可复跑 P2-P5。
  - 未改 `CONTENT_VERSION`、现行 v4 schema/validator/runtime/editor/save、
    `projects/pal/**`、P0 baseline 或 capability map。用户 2026-07-25 裁决的
    item-private schema / 存储归属 / 工作台内联编辑只在 P6 影子类型和迁移投影中冻结；
    canonical 发布仍由 P7 原子事务完成。
- 共享判据与 532 个 shared tail 收口:
  - 532 个 shared tail 全量、互斥分类为
    **433 P5 cycle + 80 P4 named owner + 17 P6 owner-local flow +
    2 P6 item-private**；真正跨使用方复用的共享作者脚本为 **0**。
  - 13 个历史 `shared/scc-*` 误导身份在 active author output 中为 **0**；
    `sharedAuthorScripts=[]`，迁移内部块和仅因复杂而共享的假公共库不再保留。
  - P5 active projection 中的 580 个内部调用精确分为 **574 owner-local call +
    6 item bridge shell**。P6 后 `callScript=0`、`jumpScript=0`、bridge author root=0；
    574 个局部调用全部内联并保留 call-return 证据，其中 22 个 auto-owner 外层兼容边界
    继续显式记录 100ms scheduling，其余调用不伪造等待。
- owner-local flow 与稳定身份:
  - 21 个唯一局部 source body 按 owner 分配为 **42 个 owner-local flow allocation**；
    由于 2/3-owner 分裂，显式记录 **21 个 additional body copy**。
  - 稳定 id 为 owner 局部分配的 `legacy-continuation-###`，不从地址、hash、chunk 或数组位置派生。
    5 个历史尾转移降为 `n3P6FlowExit` shadow evidence，均为
    `macroTask / 0ms / cancellable / terminate-current-segment`；作者层只看到 owner-local flow。
- 六个物品私有脚本:
  - 265/266/267/280/290/293 分配为六个显式
    `{ kind: "item-private-script", itemId, scriptId: "use" }` 身份，脚本正文归物品定义拥有，
    不进入共享脚本库，也不生成“打开脚本 ↗”式共享引用。
  - 迁移证据按四个 closure family 组织：
    `spirit-orb-altar`（265/266/267）、`reward-bundle`（280）、
    `narrative`（290）、`teach-skills`（293）；六份 author body 均无内部 call/jump。
  - 灵珠保留 s241 场景、e4286/e4283/e4285 placement、e4282-e4286 状态 0/2 完成守卫、
    600ms fade 与 s227 fallback；280 保留 money 500 与
    101x2/105x2/238/253/168/293；293 保留技能 377/307。268 `craftRecipe` 与
    270 `drawFromResourcePool` 保持既有结构化领域用途，不回退为脚本。
- 数据守恒、ledger 与事务计划:
  - active author output 为 **7,035 owner fragments + 598 flow structures +
    433 cycle bodies + 21 local source bodies + 6 item-private scripts**；
    retained legacy body 与 P6 pending 均为 0。
  - 反向来源守恒为
    **7,035 + 598 + 433 + 21 + 15 = 8,102 / 8,102** 个唯一 legacy body；
    item-private 的六份正文携带 15 个 legacy provenance，而不是按脚本数冒充 body 数。
  - 累计 ledger 为 **18,383 entries / 5,630 groups / 8,975 evidence / 0 pending**；
    P6 新增 10 个原子 group（1 个局部调用闭包、5 个局部 flow、4 个 item-private closure）。
  - 首次 v4 -> 累计 P6 dry plan 为
    **6,793 writes / 11,447 deletes / 0 conflicts**，精确退役全部 11,447 个 legacy body identity；
    P6 -> P6 repeat plan 为 **0/0/0**。修改 item 280 源 body、伪造共享作者脚本、
    新增引用或篡改 ledger/target 均 fail-loud 且零写。
- P6 验证证据:
  - P6 isolated PAL / unit：
    **2 files / 6 tests passed**；覆盖 532 分类、局部 call/flow、六个物品私有脚本、
    268/270 不回退、8,102 守恒、事务幂等与负向冲突。
  - `pnpm --filter @type-pal/migrate check` →
    **52 files / 372 passed + 1 skipped**。
  - `pnpm --filter @type-pal/migrate migrate:script-v5:shadow -- --through p6 --check` →
    **854 artifacts，first=854/0/0，second=0/0/0**，bundle digest
    `58d5ab9778694c6ae28975c58e52bf375eb96563d21a0e755b75dda766e9f255`。
  - 仓库根 `pnpm check` → 7 个 workspace package 全绿；migrate
    **52 files / 372 passed + 1 skipped**，Biome **885 files** 无问题；
    targeted Biome、typecheck 与 `git diff --check` 均通过。
- P6 未做事项:
  - P6 只冻结 shared/private/local 的影子 author projection、退役证据与累计事务关系；
    canonical v5 schema/compiler/runtime/editor/save、物品工作台内联编辑和全量发布属于 P7。
  - Codex P6 自验 `accept`；现交 GLM 做架构 + 数据合并只读代审。GLM `accept` 前不得进入 P7，
    更不得把 N3-1、C8 或 ED-5I 标记 done。

### P7 canonical 投影进度与状态机 schema delta 门禁（2026-07-25）

- 已完成并独立提交的 P7 前置批次:
  - `35f53753 feat(content): define canonical script v5 schema`：建立 v5 canonical 类型与
    fail-loud validator，但尚未切换 `CONTENT_VERSION` 或 loader。
  - `96e5a45e feat(save): add script v5 migration preflight`：建立 SAVE 5 预检、版本双轴和
    sidecar 允许/拒绝矩阵地基，但尚未发布 SAVE 5。
  - `312cd8d9 fix(migrate): preserve PAL state anchors`：修复上游迁移器误删 132 个
    `spriteNum=0` 状态/区域锚点（至少 112 个被脚本引用，91 个带 state=2/collision），并把唯一
    `0x9A [1051,0,0]` 反向空区间恢复为 no-op；更新 P0 baseline 后全量重建 P6 shadow，
    digest 为 `16aedd4fd5080aaf295cfe55562cf4a1db3263f0aa52214e5e79972f45bc1857`，
    二跑 `0/0/0`。
  - `dbc04f4c feat(migrate): project simple script v5 owners`：完成实体复合地址、稳定选择、
    P3/P5/P6 局部结构展开和旧 binding/jump fail-loud；PAL **4,519 个不含状态机的 owner**
    全部通过最终 `checkScriptFlowV5`，专项 4/4、migrate typecheck 通过。
- 状态机投影可复跑审计:
  - 新增 `p7-state-machine-audit.ts`，从 P6 IR 重新计算而非手填数字；PAL 结果为
    **70 cycle / 172 state / 65 owner**。
  - owner stage 分布为 `59×1 + 1×2 + 5×9`；其中 6 个多 stage owner 合计 47 个稳定 stage
    入口，必须保留“提交 next cursor 并结束本次激活”的 stage 语义。machine 分布为
    `60×1 + 5×2`，P7 必须按 owner 合并多个 cycle 并显式分配无碰撞 StateId。
  - 438 条状态机 transition 分为
    **131 body-end + 306 condition + 1 command-outcome(confirm:no)**；306 条 condition 中只有
    30 条位于 body 尾部，另有 **276 条中段条件退出**。136 个 state 有多条 transition。
  - 唯一 `confirm:no` 位于 `s081` onEnter state 的中段，选择“是”后仍有后续命令；因此
    中段条件 fallthrough 276 处 + confirm 继续路径 1 处，共 **277 处必须同步继续当前激活**。
    若硬套现有 `to { yield:'macroTask' }`，会新增可观察的调度/并发让步；若丢弃命令结果，则
    `confirm:no` 回环失真。
- 由上述真源证据确认，P1 冻结的四种 `StateTransitionV5`
  （`stay | restart | to(yield) | branch`）不足以无损承接 P5。GLM P5 历史结论
  “compiler 消费 command-outcome、无需 schema 变更”保留为审查事实，但已被 P7 canonical
  validator 的反证更新；不得据此静默丢字段或把迁移 IR 变成运行时旁路。
- Codex 提交 GLM 复审的最小 schema delta 候选（**尚未修改实现**）:

```ts
type CommandId = string

type AuthorConfirmCommandV5 = {
  kind: 'confirm'
  /** 仅被 commandOutcome 引用时必填；owner/state 内显式分配，不从地址/hash/数组位置派生。 */
  id?: CommandId
  onNo: AuthorCommandV5[]
}

type StateTransitionV5 =
  | { kind: 'stay' }
  | { kind: 'restart' }
  /** 同步尾转移：不提交持久 cursor、不让步，继续同一次 activation；纯 continue SCC 非法。 */
  | { kind: 'continue'; state: StateId }
  /** stage 语义：原子提交目标 state，并结束本次 activation。 */
  | { kind: 'advance'; state: StateId }
  /** safe-point 尾转移：提交目标后让步，再在同一次 activation 继续。 */
  | { kind: 'to'; state: StateId; yield: 'macroTask' | 'worldTick' }
  | { kind: 'branch'; cond: AuthorConditionV5; then: StateTransitionV5; else: StateTransitionV5 }
  | {
      kind: 'commandOutcome'
      commandId: CommandId
      command: 'confirm'
      outcome: 'no'
      then: StateTransitionV5
      else: StateTransitionV5
    }
```

- 候选语义与 lowering 约束:
  - `continue` 只服务同一 author state 被中段 exit 切开的具名 continuation；不更新 save cursor、
    不形成 save safe-point、不得构成无 yield 环，因而保持原命令序列的同步 fallthrough。
  - `advance` 是 state-machine 合并多 stage 后的必要终态：提交下一个稳定 stage/state 并返回，
    下次外部激活才执行目标；不得用 `to+macroTask` 伪装。
  - `commandOutcome` 只能引用同一 state 顶层 body 中唯一、具名且已执行的结果命令；结果只存在于
    当前 activation，不进 save。P7 把 s081 的 confirm 前缀与“是”分支后缀拆成两个具名 state：
    `no -> to(initial, worldTick)`，`yes -> continue(continuation)`，不得重放 RNG/对话或执行后缀。
  - 原 P4 StageId 作为 47 个多 stage 入口的稳定 StateId/alias 保留；cycle 内部 state 和
    277 个 continuation 由 owner 局部显式 allocator 分配，并写入 transition ledger/sidecar，
    不从 source address、pointer、hash、chunk 或数组位置派生。
  - validator/compiler 必须拒绝悬空 command/state、重复 CommandId、跨 state outcome 引用、
    `continue` SCC、无取消让步的持久循环；editor 必须把三种执行语义显示为
    “同步继续 / 下次激活 / 让步后同次继续”，不能都渲染成“跳转”。

#### P7 状态机 schema delta 推进签字

| 席位 | 结论 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **agree** | 2026-07-25 | 4,519 simple owner canonical validator 闭环；P6 IR 可复跑审计冻结 70/172/65、277 synchronous continuation、47 multi-stage entry，并给出最小 delta 与负向 validator 约束。 |
| Kimi | **waived（额度耗尽）** | 2026-07-25 | 用户已批准 P3-P7 架构席位由 GLM 合并代审；保留恢复后的非阻塞补审债务。 |
| GLM | **agree（合并代审）** | 2026-07-25 | 独立复跑 p7-state-machine-audit（70/172/65 + transition 全分布逐项匹配）+ p7-canonical（6/6）+ 4519/4519 simple owner validator + s081 confirm:no 中段回环反证；continue/advance/commandOutcome+CommandId 最小必要，stay/restart/to/branch 不足以无损承接 277 同步 continuation + 47 multi-stage + 1 command-outcome。见「GLM P7 schema delta 合并代审」。 |

- 门禁: **schema delta allowed（2026-07-25；GLM 合并代审 agree，Kimi 用户豁免）**。
  Codex 可修改 canonical transition schema/compiler/runtime/editor 并发布 v5，但须按 GLM 指出的
  3 条必落约束落地。
  N3-1 仍为 `build`，C8/ED-5I 继续 blocked。

#### P7 schema 与状态机 owner canonical 实现进度（2026-07-25）

- `b1598e84 feat(content): extend script v5 state transitions`：
  - canonical schema 已加入 `CommandId`、confirm 可选 `id` 与
    `continue / advance / commandOutcome`；
  - validator 已落实同 state 顶层 CommandId 唯一与 outcome 引用、悬空 state 拒绝、
    纯 `continue` SCC 拒绝三类负向门禁；
  - content **27 files / 335 tests passed**，7 个 workspace package typecheck 全绿，
    Biome 与 `git diff --check` 通过。
- `476d75db feat(migrate): project script v5 cycle machines`：
  - 70 个 P5 irreducible cycle / 172 个原始 state 全部投影为 canonical machine；
  - 生成 277 个同步 continuation 与 5 个受调度退出 state，合计 **454 state**；
  - s081 `confirm:no` 保持“否 → worldTick 回环；是 → 同步后缀”，专项
    **3 files / 9 tests passed**，typecheck / Biome 通过。
- `282253ee feat(migrate): merge script v5 owner machines`：
  - 按 owner 合并 stage root、结构化 loop、一个或多个 cycle 与退出 continuation，
    保留稳定 StageId，并把 legacy `next` 降为真实 `advance`；
  - PAL **65/65 state-machine owner** 全部通过最终 `checkScriptFlowV5`，合计
    **771 canonical state**；`60×1 + 5×2` machine 分布已归并到一 owner 一 machine；
  - simple owner / gap audit / cycle / owner 合并专项 **4 files / 12 tests passed**，
    migrate typecheck、Biome 与 `git diff --check` 通过。
- 当前边界：以上实现尚未接入 compiler/runtime/editor/SAVE 5，也未切换
  `CONTENT_VERSION`、loader 或发布 canonical project；N3-1 仍为 `build`，
  C8/ED-5I 继续 blocked。

### GLM P7 schema delta 合并代审（2026-07-25）

**方法**：只读合并代审（架构 + 数据），不改实现文件。读 p7-state-machine-audit.ts / p7-canonical.ts /
content/src/script-v5.ts 全部源码 + 独立复跑 `auditP7StateMachineProjectionNeeds` + p7-canonical 测试 +
4519/4519 simple owner validator + s081 confirm:no 反证分析。

#### 重点 1：状态机审计逐项对账 ✅

GLM 独立复跑 `auditP7StateMachineProjectionNeeds(p6ir)`：

| 口径 | 卡内冻结 | GLM 复跑 | 结论 |
|---|---:|---:|---|
| cycles (state-machine) | 70 | **70** | ✅ |
| states | 172 | **172** | ✅ |
| owners | 65 | **65** | ✅ |
| stageHistogram 1 / 2 / 9 | 59 / 1 / 5 | **59 / 1 / 5** | ✅ |
| machineHistogram 1 / 2 | 60 / 5 | **60 / 5** | ✅ |
| multiStageEntries | 47 | **47** | ✅ |
| transitions.bodyEnd | 131 | **131** | ✅ |
| transitions.condition | 306 | **306** | ✅ |
| transitions.conditionAtBodyEnd | 30 | **30** | ✅ |
| transitions.conditionMidBody | 276 | **276** | ✅ |
| transitions.commandOutcome | 1 | **1** | ✅ |
| commandOutcomeWithFollowingCommands | 1 | **1** | ✅ |
| statesWithMultipleTransitions | 136 | **136** | ✅ |
| synchronousContinuationSites | 277 | **277** | ✅ |

审计从 P6 IR 独立重算（非手填），`synchronousContinuationSites = conditionMidBody(276) + commandOutcomeWithFollowingCommands(1)`。

#### 重点 2：stay/restart/to/branch 不足以无损承接 ✅（delta 必要）

**277 个同步继续点**无法用现有 `to { yield }` 表达：
- `to + macroTask` 会新增可观察的 JS 宏任务让步——原版命令序列是同步 fallthrough（command pace 100ms
  在每个 AuthorCommand 后，不是在状态转移后），增加 macroTask 会改变 NPC 行为节奏。
- `to + worldTick` 会等待下一次世界拍（STEP_MS=100ms），更不可接受——等于多了一个 tick 的延迟。
- 拆成独立 state + `stay` 会让 save cursor 停在中间状态，下次激活从中段续跑——但原版逻辑是从头跑
  到尾的，不是"保存中间态"。

**47 个 multi-stage entry**无法用 `to + macroTask` 伪装 `advance`：
- `advance` 语义：提交目标 state cursor + 结束本次激活 + 下次外部激活才执行目标。
- `to + macroTask` 语义：提交目标 state cursor + 让步 + **同次激活继续**执行目标——调度语义不同。
- 6 个 multi-stage owner（s004/e93, s049/e825, s049/e828, s206/e3493, s206/e3494, s081/onEnter）
  合计 47 个 stage 入口，必须保留"提交 next cursor 并结束本次激活"的 stage 语义。

**s081 confirm:no 回环**（GLM 独立验证）：
- confirm 位于 body index 26 of 67——**不是尾命令**。
- 选"否" → 回环到 initial（`to(initial, worldTick)`——可取消让步，安全）。
- 选"是" → 继续执行 index 27-66（**必须同步 continuation，不能让步**）。
- 丢弃命令结果会让 confirm:no 回环失真；硬套 `to` 会增加调度让步。
- `commandOutcome { commandId, command:'confirm', outcome:'no', then: to(initial, worldTick), else: continue }`
  是唯一能同时表达"命令结果分支 + 同步继续 + 安全回环"的方式。

**结论：现有 stay/restart/to/branch 不足以无损承接 P5。delta 必要。**

#### 重点 3：continue / advance / commandOutcome + CommandId 最小充分集 ✅

**候选 delta 三种新 kind 是否最小且充分：**

| 新 kind | 服务的真源需求 | 是否最小 | 是否充分 |
|---|---|---|---|
| `continue { state }` | 277 处同步 fallthrough（中段条件退出 + confirm:yes 后缀） | ✅ 最小：`to` 已有让步语义，`stay` 不切 state；`continue` 唯一表达"切 state + 不让步 + 不进 save safe-point" | ✅ |
| `advance { state }` | 47 处 multi-stage entry 的"提交 cursor + 结束激活" | ✅ 最小：`to+macroTask` 同次继续 ≠ 下次激活；`stay` 不提交 cursor | ✅ |
| `commandOutcome { commandId, command, outcome, then, else }` | 1 处 confirm:no 中段回环 | ✅ 最小：`branch` 消费 ScriptCondition（flag/var），不消费命令执行结果 | ✅ |

**CommandId 是否必要**：`commandOutcome` 必须引用"同一 state 顶层 body 中唯一、具名且已执行的结果命令"。
没有 CommandId，compiler 无法区分同一 state 中多个 confirm 的结果分支。当前只有 1 个 command-outcome，
但 schema 设计不应按当前数据量限缩——如果未来 PAL 有多个 confirm，没有 CommandId 就无法表达。
**CommandId 是最小必要的。**

**不接受的替代方案**：
- ❌ 把 command-outcome 埋在 generated lowering（runtime side channel）——违反 canonical 作者可见原则。
- ❌ 把 277 continuation 拆成独立 state——save cursor 停在中间态，破坏原版"从头跑到尾"语义。
- ❌ 把 `advance` 伪装成 `to+macroTask`——调度语义不同（同次 vs 下次激活）。

#### 负向 validator 约束审核 ✅

Codex 候选已列出必要的负向约束，GLM 确认以下必须落地：
- 悬空 command/state → 拒绝
- 重复 CommandId（同一 state 内）→ 拒绝
- 跨 state outcome 引用 → 拒绝（commandOutcome 只能引用本 state body 内的命令）
- `continue` SCC（无 yield 环）→ 拒绝（continue 不形成 save safe-point，纯 continue 环永远不可中断）
- 无取消让步的持久循环 → 拒绝（与 P5 loop `maxIterations` 门禁一致）
- `continue` 目标 state 必须存在且属于同一 machine → 拒绝悬空

**save safe-point 约束**：
- `continue` 不进 save safe-point——它不更新 cursor、不让步，是纯同步 fallthrough。
- `advance` 进 save safe-point——提交 cursor 并结束激活。
- `to` 进 save safe-point——提交 cursor 并让步。
- `commandOutcome` 本身不进 save——命令结果只存在于当前 activation；`then/else` 内的 transition
  按 kind 决定是否进 save。

#### GLM 必落约束（3 条）

1. **`continue` 禁止 SCC**：validator 必须静态检查 `continue` 转移不形成环（同 machine 内的 continue
   目标 state 不能通过 continue 链回到自身）。纯 continue 环永远不可中断，也不形成 save safe-point。
2. **`commandOutcome` 只引用本 state body**：commandId 必须解析到同一 state 顶层 body 中唯一已执行
   的 confirm 命令。跨 state outcome 引用必须 fail-loud。
3. **editor 三种语义可视化**：continue/advance/to 必须在编辑器中分别显示为
   "同步继续 / 下次激活 / 让步后同次继续"，不能都渲染成"跳转"。

#### 结论

**GLM P7 schema delta agree**。审计数字逐项匹配（70/172/65 + transition 全分布）；
stay/restart/to/branch 经反证确认不足以无损承接 P5（277 同步 continuation + 47 multi-stage + 1 confirm:no）；
continue/advance/commandOutcome+CommandId 是最小充分集；负向 validator 约束完整。

**schema delta allowed**：Codex 可修改 canonical transition schema 并发布 v5。
GLM 3 条必落约束（continue SCC 禁止 / commandOutcome 本 state 限定 / editor 三态可视化）
必须在 v5 validator 和 editor 中落地。

#### Kimi 补审债务

P7 schema delta 是 N3-1 最关键的架构决策——StateTransitionV5 从 4 种扩展到 7 种，直接影响 canonical
作者模型。Kimi 恢复后**强烈建议补审**（不阻塞当前 allowed，但 N3-1 最终验收前应补签）。

## 视觉验证记录

- Visual Verification Owner: Codex + User
- 验证方式: P0/P2/P3/P4/P5/P6 与当前 P7 审计均为迁移审计、影子 IR/ledger 与文件事务，
  尚未改变编辑器或游戏 UI。
- 截图 / 像素检查路径: N/A
- 结论: 无适用视觉检查；以 PAL 真源、字节确定性、作者保护与零计划门禁替代。
- 未完成项: 后续批次若开始改 editor/runtime，必须重新登记视觉验证。

## Review: 审查与返工

- Reviewer: GLM（P7 schema delta + 最终架构/数据合并代审；Kimi 额度耗尽）
- Codex 内部只读红队（2026-07-23）:
  - 首轮发现 overlay `structuredClone` 丢 WeakMap provenance，导致 119 个 scene root 无直接
    源地址，且“全源唯一目标反推”可误配；已改为深克隆时转交审计旁路、删除反推并补反误配测试。
  - 首轮发现 entity auto/trigger inline stages 未传播 deferred，可能制造当前 tick 假 SCC；
    已覆盖四类 binding 容器并补 inline self-call 回归。
  - 返工后复审 `ACCEPT`：11,447/11,447 body 来源非空，61/61 hook installer address，
    6,453 content-entry 与 87 override provenance 完整；额外逆序 `eventsByScene` 后 audit、
    digest、文件顺序和内容一致。
- 审查结论: Codex 内部复审 accept；**GLM P0 复审 accept（2026-07-15，G1-G3/入口分类/site-target-caller 口径/s018/13 scc/折叠守恒/PAL golden）**；**Kimi P0 复审 accept（2026-07-23，R5/三套 SCC 口径/0x6D/overlay 证据/digest，见下）**。
- 必须返工项: 内部红队两项已闭合；GLM、Kimi 均无返工。
- Accept / rework: **P0 accept（GLM + Kimi，2026-07-23）**；P1 仍须先冻结 schema/save/MG2 设计（R1-R3）后再实现。

### P2 阶段审查推进签字

| Agent | 结论 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **accept** | 2026-07-24 | Coding Owner 自验；P2 shadow-only 实现、PAL 8 tests、migrate 44 files / 333 passed + 1 skipped、真实 v4 MG2 预检、transaction writer 与固定根双跑 `0/0/0` 均通过。 |
| Kimi | **accept** | 2026-07-24 | 独立只读复审架构边界、transition relationship、MG2 作者保护与 writer 安全；通读 experimental/script-v5 全部实现（p2-transform/p2-transition-plan/source-v4/validate-ir/shadow-writer/shadow-harness/CLI）与 8 条 PAL golden；独立复跑 shadow `--check`（853 artifacts、second `0/0/0`、bundle digest `e80638f0…a243bc` 复现）、experimental 38/38、P0 audit `--check` 一致、迁移 dry-run `0/0/0`（v4 generator 零漂移）。见「Kimi P2 复审」。 |
| GLM | **accept** | 2026-07-15 | 独立复跑 P2 shadow `--check`（853 artifacts / 0/0/0）+ PAL golden（8 tests）+ 全 migrate（44/333+1skip）；11,447=8,102+3,345 / 3,345=863+2,482 / ledger 3,347 entries+1 group+3,346 evidence+8,101 pending / 844=388+202+192+60+1+1 / trigger 202=201+1s018 / 13 scc 仅退役 active identity 全部 retained / validation 从 corpus 重算非摘要比对 / P1 trigger 200→P2 202 差异由 body 内嵌命令消解。见「GLM P2 复审」。 |

- counter / 返工: 当前无；GLM、Kimi 均无返工。任一方 `counter` 时 P2 留在 build 并按反例返工。
- P2 -> P3 准入: **allowed（2026-07-24；Codex / GLM / Kimi 三方 P2 accept 齐）**。P3 仍须遵守
  P1-1 影子纪律与 P1-8 矩阵，P3 完成后同样需三方批次审查。
- 本表只控制 P2 内部分批推进，不替代整个 N3-1 进入 `done` 前的三方最终验收门禁；任务状态仍为
  `build`。

### P3 阶段审查推进签字

| Agent | 结论 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **accept** | 2026-07-24 | Coding Owner 自验；1,715 全分类、599 bodies / 655 sites 结构化、8,102/8,102 可逆、RNG/pendingAuto/self/dialogue/size 全门禁、累计 transition/repeat plan 与 migrate 46 files / 343 passed + 1 skipped 均通过。 |
| Kimi | **absent（用户豁免）** | 2026-07-24 | 额度耗尽，本批不再单独审查；原架构/语义席位由 GLM 合并代审。额度恢复后补审，但不阻塞本次 P3 → P4；若 N3-1 最终验收时仍未补签，须再由用户决定是否延续豁免。 |
| GLM | **accept（合并代审）** | 2026-07-24 | 同时承接 Kimi 的结构化语义、call/jump 边界、generated/canonical 隔离、ledger 原子关系与 P4 重分类，以及原 GLM 的数据/覆盖席位；独立复跑 9 项门禁，无 counter/rework。见「GLM P3 合并代审」。 |

### GLM P3 合并代审（2026-07-24）

**方法**：只读合并代审（架构 + 数据），不改实现文件。读 p3-control-flow.ts / p3-validate.ts / p3-transition-plan.ts 全部源码 + 独立复跑 `migrate:script-v5:shadow --through p3 --check` + P3 PAL golden + 全 migrate + P0 audit + script-runner.ts call/jump/pace 语义。

#### 重点 1：579 unique tail + 20 conditional join 控制流语义 ✅

**分类逻辑**（p3-control-flow.ts:103-134 `classifyP3ReferenceShape`）：
- **579 tail-inline**：单 caller 单 jumpScript execution 边 → 原位吸收到唯一 caller。语义正确：原版 jumpScript 是尾转移（script-runner.ts:757-760 `ScriptJump`），吸收后用 `n3P3FlowExit { scheduling: macroTask, worldClockAdvanceMs: 0, continuation: terminate-current-activation }` 表达，保持"不返回 + 至少一次宏任务让步"（P1-5 调度规则）。
- **20 branch-switch-join**：同一 caller 的多个 conditional arm（`then/else/onNo/onLose/onFlee/onFail`）jump 到同一 target → 恢复为共享 branch/switch continuation，不复制 shared tail。语义正确：diamond/join 不膨胀正文，原版多臂汇合到同一地址的 clean 表达。

**守恒**：`1,715 = 579 + 20 + 622 + 455 + 38 + 1`，census 函数（:229-265）硬断言精确值。GLM 独立复跑确认。

#### 重点 2：n3P3FlowExit 严格隔离在 generated shadow ✅

- `n3P3FlowExit` **不在 AuthorCommand 联合**（content/src/script.ts AuthorCommand 不含此 kind）。
- IR 标记 `canonical: false, runtimeConsumable: false`（:738-739）。
- shadow 根固定 `packages/migrate/.shadow/N3-1/v5/p3/`（gitignored）。
- CLI `--through p3` 只产出 shadow IR/ledger，不改 `CONTENT_VERSION`/v4 validator/runtime/editor loader/projects/pal/baseline。
- GLM 验证：retained bodies 中 `n3P3FlowExit` 出现 610 次（599 tail/branch 结构的 owner body + 部分 target body 内引用其他结构），全部在 shadow 内；无 canonical/runtime 污染。

#### 重点 3：622 call / 455 binding / 38 cross-caller / 1 mixed P4 分类完整 ✅

- **622 deferred-call-owner**：所有 incoming 都是 `callScript` → 转入 P4 owner allocation。call 正常/stop 返回契约不变（P1-5）。
- **455 deferred-entity-binding-owner**：所有 incoming 是 `setEntityAuto`/`setEntityTrigger` deferred binding → 转入 P4。不冒充执行前驱。
- **38 deferred-multi-owner-join**：跨 caller shared join，单 owner 结构化证据不足 → 显式转 P4，**禁止复制**（防止指数膨胀）。
- **1 deferred-mixed-flow-binding**：jump + auto binding 混合入口 → 绑定与执行必须同组归属，显式转 P4。

GLM 独立复跑 census 确认：`{tailInline:579, branchSwitchJoin:20, deferredCallOwner:622, deferredEntityBindingOwner:455, deferredMultiOwnerJoin:38, deferredMixedFlowBinding:1, unknown:0}`。

#### 重点 4：599 atomic group + dependsOn + 作者冲突保护 ✅

- **599 flow-absorption-group**：每个 group `editPolicy: 'conflict-if-modified'`，锁定 target body + 全部 incoming cell（:506-521）。
- **dependsOn**：9 个 group 有 dependsOn（target body 内含指向其他 structure 的 n3P3FlowExit）；依赖显式登记，排序稳定（:528）。
- **作者冲突保护**：作者修改 target body / 修改入站 jump / 删除或新增入站引用 → 整批零写冲突（P3 PAL test 2-7 覆盖）；纯 ScriptRef.chunk 变化不算冲突。
- **ledger entries 互不重叠**（:571-574 `transitionEntryKey` 去重断言）：P2 3,347 + P3 1,254（599 target + 655 incoming）= 4,601 entries，source key 无碰撞。

#### 重点 5：1,715 分类 / 599 bodies / 655 sites / 8,102 可逆 + P3→P6 守恒 ✅

GLM 独立复跑确认：

| 口径 | 卡内冻结 | GLM 复跑 | 结论 |
|---|---:|---:|---|
| P3 candidates | 1,715 | **1,715** | ✅ |
| absorbed bodies (flowStructures) | 599 | **599** | ✅ |
| rewritten jump sites | 655 | **655** | ✅ |
| retained bodies | 7,503 | **7,503** | ✅ |
| retained + structured | 8,102 | **7,503 + 599 = 8,102** | ✅ 守恒 |
| reversible bodies | 8,102 | **8,102**（validate reverseP3Body 零语义变化） | ✅ |
| pendingByPhase | P3:0 P4:7,055 P5:433 P6:14 | **完全一致** | ✅ P3→0 |
| pending sum | 7,502 | **7,502** | ✅（8,102 - 599 structured - 1 s018 resolved） |

#### 重点 6：dialogue/self/RNG/pendingAuto/conditional-arm 覆盖 ✅

GLM 独立验证全部 599 个结构：
- **dialogue**：全部 `context.dialogue.registryIdentityMatched: true` + `legacyScriptId.endsWith('/d-' + dialogue.hash)` 断言（:343-345）。
- **self**：全部 `context.self.allIncomingMatched: true` + 逐 site `actualSelf === audit.source.owner` 断言（:329-331）。
- **RNG (lastRngChunk)**：全部 `context.rng.inheritedConsumer: false`——0x37（继承消费）不存在于任何结构化 target 的 source addresses（:350-353）。
- **pendingAuto (0x07/0x8A)**：全部 `context.pendingBattleAuto.inheritedConsumer: false`（:354-357）。
- **conditional-arm**：20 branch-switch-join 的全部 incoming 路径匹配 `/then|else|onNo|onLose|onFlee|onFail/`（:99-101,113-116）。

#### 重点 7：AST/target/chunk 体积门禁 ✅

| 门禁 | 限制 | PAL 观测最大 | 结论 |
|---|---:|---:|---|
| materialized AST nodes | 512 | **318** | ✅ |
| target bytes | 65,536 | **2,354** | ✅ |
| projected chunk bytes | 1,048,576 | **313,528** | ✅ |
| violations | 0 | **[]** | ✅ |

跨 caller join（38）不靠复制绕过门禁——显式 deferred 到 P4。

#### 重点 8：ledger / 迁移计划 / 重复运行 / fail-loud 反例 ✅

**ledger**：4,601 entries / 600 groups（1 s018 + 599 flow）/ 3,945 evidence（3,346 P2 + 599 P3）/ 7,502 pending。digest `7444c3ac…`。

**迁移计划**：首次 v4→累计 P3 = `657 writes / 3,945 deletes / 0 conflicts`（含 P2 2/3,346 + P3 655/599）；P3→P3 repeat = `0/0/0`。

**重复运行**：shadow `--through p3 --check` → 854 artifacts, first=854/0/0, second=0/0/0；固定根写入后 first=0/0/0, second=0/0/0。

**fail-loud 反例**（PAL test 2-8）：作者修改 absorbed target body → `identity-flow-group-modify` 零写；新增指向 absorbed target 的引用 → 冲突零写；纯 rechunk 不误报；ledger 关系篡改零写。

**全包门禁**：typecheck pass；migrate 46 files / 343 passed + 1 skipped；P0 audit digest 不变；bundle digest `eee18a78…`。

#### 结论

**GLM P3 合并代审 accept**。架构（tail-inline/branch-switch-join 语义 + n3P3FlowExit 隔离 + call/jump 边界）+ 数据
（1,715 全分类守恒 / 599 bodies / 655 sites / 8,102 可逆 / P3→0 P4→7,055 / ledger 4,601+600+3,945 / context 全覆盖 /
size 门禁零违规 / 迁移计划双跑 0/0/0 / fail-loud 反例）逐项成立。validateP3ScriptMigrationIR 从 corpus 独立重算
（reverseP3Body 零语义变化 + visitScriptRefs 零悬空 + callSitesChanged=0）。无 counter/rework。
**P3 准入 P4**。

#### Kimi 补审债务登记

Kimi 额度耗尽，本批 P3 缺签经用户豁免。GLM 合并代审同时承接了原 Kimi 的架构/语义席位（tail-inline/branch-switch-join
控制流语义、call/jump 边界、generated/canonical 隔离、ledger 原子关系）和原 GLM 的数据/覆盖席位。Kimi 额度恢复后
应补审 P3 架构视角（尤其 callScript 622 deferred 的 P4 owner allocation 边界和 38 cross-caller join 的复制禁令设计），
但**不阻塞 P3→P4**。若 N3-1 最终验收时 Kimi 仍未补签，须再由用户决定是否延续豁免。

- 额度与代班记录（用户裁决，2026-07-24）:
  - 缺席 Agent: Kimi；原因：订阅额度耗尽。
  - 代班 Agent / 范围: GLM 合并承接 P3 架构、控制流语义、generated/canonical 边界、
    transition ledger 原子关系、数据守恒、覆盖清单和测试矩阵独立审查；Codex 仅保留已完成的
    Coding Owner 自验，不冒充独立审查席。
  - 风险: 外部独立审查由两席缩为一席，架构视角多样性下降；以 GLM 一次合并审查和可复跑
    证据补偿，但仍登记 Kimi 后续补审债务。
  - 豁免: 用户明确批准本批 Kimi 缺签豁免；GLM `accept` 后可进入 P4，不因 Kimi 本批缺签阻塞。
- counter / 返工: 当前无；GLM 无返工。
- P3 -> P4 准入: **allowed（2026-07-24；GLM 合并代审 `accept`，Kimi 用户豁免）**。
- 本表是 N3-1 内部批次门禁；即使 P3 三签齐，也不等于整个 N3-1、C8 或 ED-5I 已完成最终验收。

### P4 阶段审查推进签字

| Agent | 结论 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **accept** | 2026-07-24 | Coding Owner 自验；3,616 Page、4,584 owner、6,502 stage、7,039 fragment、844 selection rewrite、17 cross-owner 零复制、8,102 可逆、累计/repeat plan 与根 `pnpm check` 全部通过。 |
| Kimi | **absent（用户豁免）** | 2026-07-24 | 额度仍耗尽；依用户“合成一个都让 GLM 审核”的裁决，本批原架构/schema/owner identity 席位继续由 GLM 合并代审。额度恢复后补审，但不阻塞 GLM `accept` 后的 P4 → P5；最终验收时若仍缺签须再请用户裁决。 |
| GLM | **accept（合并代审）** | 2026-07-25 | 独立复跑 shadow `--through p4 --check`（854/0/0）+ PAL golden + 全 migrate（48/354+1skip）+ P0 audit；3,616 Page / 4,300 behavior / 284 hook / 6,502 stage / 7,039 fragment / 17 cross-owner 零复制 / 844 rewrite / legacy=0 / 268 craftRecipe+270 drawFromResourcePool 未退 shared / ledger 16,325+5,220+8,565 / 8,102 守恒 / 首跑 5,343/10,983/0 重复 0/0/0 / ID 全显式分配。见「GLM P4 合并代审」。 |

- counter / 返工: 当前无；GLM 无返工。
- P4 -> P5 准入: **allowed（2026-07-25；GLM 合并代审 `accept`，Kimi 用户豁免）**。Codex 可启动 P5。
- Kimi 补审债务: P3/P4 两批均登记；不阻塞当前内部批次，但不自动等于 N3-1 最终缺签豁免。
- 本表只控制 P4 内部分批推进；N3-1、C8、ED-5I 仍未完成最终验收。

### GLM P4 合并代审（2026-07-25）

**方法**：只读合并代审（架构 + 数据），不改实现文件。读 p4-owner-allocation.ts / p4-validate.ts /
p4-transition-plan.ts 全部源码 + 独立复跑 `migrate:script-v5:shadow --through p4 --check` + P4 PAL golden
+ 全 migrate + P0 audit。

#### 重点 1：shadow-only + ID 不由地址/hash/位置推导 ✅

- IR `canonical: false, runtimeConsumable: false`（:1234-1235）；未改 `CONTENT_VERSION`/v4 schema/runtime/editor/projects/pal/baseline。
- **Page/Behavior/Hook/Stage ID 全部显式分配**（GLM 独立验证）：
  - pageId：唯一值 `default`（单页实体的显式默认页）
  - behaviorId：`default`（静态页行为）+ `legacy-001..007`（动态绑定按 owner 内序分配）+ `enter-s018`（P2 金丝雀）
  - hookId：`default`（静态场景钩子）+ `legacy-001..003`（动态钩子）
  - stageId：`allocateP4StageId(index)` → `initial` / `legacy-###`（:126-130）
  - **全部 ID 不含地址、hash、chunk、数组位置**——GLM 确认 `all explicit = true`

#### 重点 2：3,616 Page / 4,300 EntityBehavior / 284 SceneHook / 6,502 Stage 可从 PAL 真源重算 ✅

GLM 独立复跑 `buildP4ScriptMigrationIR` ownerCensus：

| 口径 | 卡内冻结 | GLM 复跑 | 结论 |
|---|---:|---:|---|
| pages | 3,616 | **3,616** | ✅ |
| entityBehaviors total | 4,300 | **4,300**（2834+987+172+307） | ✅ |
| sceneHooks total | 284 | **284**（160+67+56+1） | ✅ |
| stages total | 6,502 | **6,502**（5664+479+271+88） | ✅ |
| commandRewrites | 844 | **844** | ✅ |
| resolvedFragments | 7,039 | **7,039** | ✅ |
| deferredCrossOwner | 17 | **17** | ✅ |

ownerCensus 函数（:197-274）`isDeepStrictEqual(actual, expected)` 硬断言——**真实计算非摘要比对**。

#### 重点 3：7,055 candidate → 7,039 fragment + 17 cross-owner 零复制转 P6 ✅

- **7,055 P4 candidate** → `classifyP4OwnerCardinality`（:132-138）：7,038 `resolved-owner`（单 owner）+ 17 `deferred-cross-owner`。
- **7,039 fragment** = 7,038 singleOwner + 1 s018 P2 body（:1092）。
- **17 cross-owner** 零 body copy → `p4-cross-owner-reuse` reason 转 P6（:1127-1128）。
- **守恒**：ownerFragments(7,039) + flowStructures(599) + retainedBodies(464) = **8,102** ✅
- pending 收口：`{P4:0, P5:433, P6:31}`（P6 从 14→31，增量 17 恰为 cross-owner）

#### 重点 4：844 rewrite 全覆盖 + legacy selection command=0 ✅

GLM 独立验证：

- **844 command rewrites**（:1029 硬断言）：590 `selectEntityBehavior` + 192 `setEntityTriggerActivation` + 62 `selectSceneHooks`。
- **843 P4 rewrite + 1 P2 s018**（:1030 `rewriteByCell.size === 843`）。
- **legacy selection command 在 ownerFragments body 中 = 0**（GLM walk 全量验证）。
- **commandTransition**：`{input:844, legacyPending:0, transitionedP2:1, transitionedP4:843}`——P4 后 legacy pending 归零。

#### 重点 5：268 craftRecipe / 270 drawFromResourcePool 没有退回 shared ✅

GLM 独立验证 PAL 产物中 268/270 的 use.effects：
- **268 炼蛊皿**：`craftRecipe`（5 条 ordered first-match 配方）——领域模型，未变 shared。
- **270 紫金葫芦**：`drawFromResourcePool`（collectValue/maxRoll=9/9 档奖励表）——领域模型，未变 shared。
- 物品 scc body 在 retainedBodies 中保持 P6 `pending-author-root-absorption` / `pending-shared-tail`——P6 审计时按用户裁决处理。

#### 重点 6：ledger 16,325 entries / 5,220 groups / 8,565 evidence + 首跑/重复 plan ✅

GLM 独立复跑确认：

| 口径 | 卡内冻结 | GLM 复跑 | 结论 |
|---|---:|---:|---|
| entries | 16,325 | **16,325**（P3 4,601 + P4 11,724） | ✅ |
| groups | 5,220 | **5,220**（P3 600 + P4 4,620） | ✅ |
| evidence | 8,565 | **8,565**（P3 3,945 + P4 4,620） | ✅ |
| entries 互不重叠 | — | `Set(entries.map(key)).size === entries.length` | ✅ |
| 首跑 plan | 5,343 writes / 10,983 deletes / 0 conflicts | 卡内一致 | ✅ |
| 重复 plan | 0/0/0 | shadow `--check` second=0/0/0 | ✅ |

#### 重点 7：作者修改/新增引用/owner 漂移/ledger 篡改冲突零写 + rechunk 不误报 ✅

P4 PAL golden 覆盖（p4-shadow.pal.test.ts）：
- 作者修改 owner fragment body → `identity-owner-group-modify` 零写
- 作者修改 Page/command cell → 冲突零写
- 新增 owner surface/fragment 入站引用 → 冲突零写
- owner inventory 漂移 → 冲突零写
- ledger 关系篡改 → 零写
- 纯 ScriptRef rechunk → 不误报冲突

#### 独立复跑全绿

| 命令 | 结果 |
|---|---|
| typecheck | pass |
| migrate test | **48 files / 354 passed + 1 skipped** |
| shadow `--through p4 --check` | **854 artifacts, first=854/0/0, second=0/0/0** |
| P0 audit `--check` | digest 不变 |
| bundle digest | `28c118af…376a82` |

#### 结论

**GLM P4 合并代审 accept**。架构（稳定 author identity + Page/Behavior/Hook 分层 + cross-owner 零复制禁令 +
generated/canonical 隔离）+ 数据（3,616/4,300/284/6,502 可重算 / 7,039+17 fragment 守恒 / 844 rewrite 全覆盖 /
legacy=0 / 268+270 领域方向 / ledger 16,325+5,220+8,565 / 8,102 守恒 / 双跑 0/0/0 / fail-loud 反例）逐项成立。
无 counter/rework。**P4 准入 P5**。

#### Kimi 补审债务

P3/P4 两批 Kimi 均缺签（额度耗尽，用户豁免）。GLM 合并代审承接了架构/schema/owner identity 席位。
Kimi 恢复后应补审 P4 的 owner identity 分层设计（尤其动态 behavior `legacy-###` id 的 P6 收口策略和
cross-owner 17 体的共享判据），不阻塞 P5。

### P5 阶段审查推进签字

| Agent | 结论 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **accept** | 2026-07-25 | Coding Owner 自验；331 components / 433 bodies 全分类为 99 auto repeat + 162 loop + 70 state machine / 172 states；753 个 author transition 一等分配、1,286 jump rewrite、694 回边可取消 yield、3 cross-owner 零复制、8,102 可逆、累计/repeat plan、migrate 全量与 P5 shadow 双构建均通过。 |
| Kimi | **absent（用户豁免）** | 2026-07-25 | 额度仍耗尽；依用户“合成一个都让 GLM 审核”的裁决，本批原架构/控制流/调度语义席位继续由 GLM 合并代审。额度恢复后补审，但不阻塞 GLM `accept` 后的 P5 → P6；最终验收时若仍缺签须再请用户裁决。 |
| GLM | **accept（合并代审）** | 2026-07-25 | 独立复跑 shadow `--through p5 --check`（854/0/0, digest `e6cf5374…`）+ PAL golden（6/6 isolated pass）+ typecheck + P0 audit；331 components/433 bodies（99 auto+162 loop+70 SM/172 states）/ 753 transitions（230 body-end+522 condition+1 confirm:no）/ 1286 rewrite/694 worldTick/11 deferred P6 / 3 cross-owner 零复制 / 8,102 可逆 / pending P5:0 P6:31 / ledger 17,291+5,620+8,965 / 首跑 6,207/11,416/0 重复 0/0/0 / ID 全显式 / confirm.onNo 有充分 P7 落点。见「GLM P5 合并代审」。 |

- counter / 返工: 当前无；GLM 无返工。全量并行测试有 1 个 flaky timeout（P5 PAL test 5 在并行压力下 120s 超时），隔离复跑 78.6s 通过；建议 Codex 将该测试 timeout 提到 180s（Codex 后续已采纳，见交接日志）。
- P5 -> P6 准入: **allowed（2026-07-25；GLM 合并代审 `accept`，Kimi 用户豁免）**。Codex 可启动 P6。
- Kimi 补审债务: P3/P4/P5 三批均登记；不阻塞当前内部批次，但不自动等于 N3-1 最终缺签豁免。
- 本表只控制 P5 内部分批推进；N3-1、C8、ED-5I 仍未完成最终验收。

### GLM P5 合并代审（2026-07-25）

**方法**：只读合并代审（架构 + 数据），不改实现文件。读 p5-cycle-structure.ts / p5-validate.ts /
p5-transition-plan.ts 全部源码 + 独立复跑 `migrate:script-v5:shadow --through p5 --check` + P5 PAL golden（隔离）+
typecheck + P0 audit。

#### 重点 1：331 components / 433 bodies 分类 ✅

GLM 独立复跑 cycleCensus（`isDeepStrictEqual` 硬断言）：

| 口径 | 卡内冻结 | GLM 复跑 | 结论 |
|---|---:|---:|---|
| components | 331 | **331** | ✅ |
| bodies | 433 | **433** | ✅ |
| size1 / size2 / size3 | 275 / 10 / 46 | **275 / 10 / 46** | ✅ |
| auto-runner-repeat | 99 | **99** | ✅ |
| structured-loop | 162 | **162** | ✅ |
| state-machine | 70 | **70** | ✅ |
| state-machine states | 172 | **172** | ✅ |
| owner channels (trigger/auto/hook) | 6 / 323 / 2 | **6 / 323 / 2** | ✅ |
| cross-owner structures | 3 | **3** | ✅ |
| body copies | 0 | **0** | ✅ |

**分类逻辑**（p5-cycle-structure.ts:202-219 `classifyP5CycleShape`）：
- size-1 + exact tail self-jump + auto channel → `auto-runner-repeat`（auto runner lifecycle 承接，不造 `while(true)`）
- size-1 + simple conditional self-jump（`/N/then/0`）→ `structured-loop`（`loop mode=until`）
- 其余（多节点 / 复杂图）→ `state-machine`（完整具名状态机）

#### 重点 2：753 author transitions = 230 body-end + 522 condition + 1 confirm:no ✅

GLM 独立验证：
- **753 cycle-body transfer** 有一等可编辑 author transition allocation（稳定 ID + from/to/trigger/scheduling/cancellation）
- trigger 分类：`230 body-end`（尾转移）+ `522 condition`（branch.then/0 条件臂）+ `1 command-outcome`（confirm:no）
- **transitionId 全部 `legacy-transition-###`**（显式分配，不从地址/hash/chunk 推导）
- generated lowering 与 author transition 一一反查（`nestedOutcomeTransitions: 1`）

#### 重点 3：1,286 jump rewrite / 694 worldTick / 剩余 11 属 P6 ✅

| 口径 | 卡内冻结 | GLM 复跑 | 结论 |
|---|---:|---:|---|
| input jumpScript | 1,297 | **1,297** | ✅（P4 表示层总量） |
| rewrittenP5 | 1,286 | **1,286** | ✅ |
| deferred P6 | 11 | **11** | ✅（全部只指向 P6 synthetic target） |
| SCC back edges (worldTick) | 694 | **694** | ✅（全部可取消 worldTick yield） |
| cross-component | 51 | **51** | ✅ |
| owner inbound | 464 | **464** | ✅ |
| acyclic owner flow | 69 | **69** | ✅ |
| cycleBody / ownerFragment / flowStructure | 753 / 528 / 5 | **753 / 528 / 5** | ✅ |

**调度语义**：694 SCC 回边全部 `worldTick`（可取消让步）；前向 flow transfer `macroTask`（worldClockAdvanceMs=0）。
loop 全部 `maxIterations=10,000`（有限上限）；validator 拒绝缺少 yield/cancellation/上限/悬空目标。

#### 重点 4：confirm.onNo transition 为 P7 提供充分落点 ✅

GLM 独立验证 confirm:onNo transition：
- **1 个 `command-outcome` transition**：`confirm` + `outcome: 'no'` + `fallback: 'continue'`
- 来源：`scene/s081/L-14461/...#/26/onNo/0`（confirm 命令的 onNo 臂内嵌 jump）
- 目标：`cycle` structure（`p5-cycle-141`）
- transitionId `legacy-transition-001`（显式分配）
- **P7 必须把 confirm:no 命令结果分支纳入 canonical transition/compiler**——该 transition 为 P7 提供了
  充分的落点证据（from state + trigger + target + scheduling），不允许静默丢弃。
- **结论**：充分。P7 compiler 只需消费该 author transition 的 `command-outcome` trigger kind，
  在 confirm 命令执行后根据结果选择 transition，不需要额外 schema 变更。

#### 重点 5：3 cross-owner 零复制 / 8,102 可逆 / pending ✅

- **3 cross-owner structures**：共享同一 cycle structure，`bodyCopies: 0`（零复制，多 owner 引用同一结构）
- **8,102 可逆**：累计反向重建 8,102/8,102 bodies（validateP5 独立重算）
- **pending**：`{P5: 0, P6: 31}`——P5 全部收口，31 个 author-root/cross-owner/synthetic-target 属 P6

#### 重点 6：ledger 17,291 / 5,620 / 8,965 + plan + 冲突零写 ✅

| 口径 | 卡内冻结 | GLM 复跑 | 结论 |
|---|---:|---:|---|
| entries | 17,291 | **17,291** | ✅ |
| groups | 5,620 | **5,620**（P4 5,220 + P5 400） | ✅ |
| evidence | 8,965 | **8,965**（P4 8,565 + P5 400） | ✅ |
| pending | 31 | **31** | ✅ |
| 首跑 plan | 6,207 writes / 11,416 deletes / 0 conflicts | 卡内一致 | ✅ |
| 重复 plan | 0/0/0 | shadow `--check` second=0/0/0 | ✅ |

**作者保护**（PAL test 5-6）：作者修改 cycle body → 整组冲突零写；新增指向 cycle body 的入站引用 → 冲突零写；
纯 rechunk → 不误报；ledger 关系篡改 → 零写。

#### 独立复跑

| 命令 | 结果 |
|---|---|
| typecheck | pass |
| migrate test（隔离 P5 PAL） | **6/6 passed**（78.6s 最长 test） |
| migrate test（全量并行） | 49/50 files passed；**1 flaky timeout**（P5 PAL test 5 并行压力下 120s 超时，隔离 78.6s 通过） |
| shadow `--through p5 --check` | **854 artifacts, first=854/0/0, second=0/0/0** |
| bundle digest | `e6cf5374a0e5376b88846142ec0c5f71b19cf7929ded94482c91e6b9176dd0d2` ✅ |
| P0 audit `--check` | digest 不变 |

**flaky timeout 说明**：P5 PAL test 5（'author cycle-body modifications...'）在全量并行时超 120s。
隔离复跑 78.6s 通过，是并行 I/O 压力导致的性能 flaky，非正确性问题。建议 Codex 将 timeout 提到 180s。

#### 结论

**GLM P5 合并代审 accept**。架构（cycle 分类 auto/loop/state-machine + 稳定 ID + worldTick 回边 + macroTask 前向 +
loop cap + confirm:onNo author transition）+ 数据（331/433 守恒 / 753 transitions / 1,286 rewrite / 694 worldTick /
3 cross-owner 零复制 / 8,102 可逆 / pending P5:0 P6:31 / ledger 17,291+5,620+8,965 / 双跑 0/0/0 / fail-loud 反例）
逐项成立。无 counter/rework。**P5 准入 P6**。

#### Kimi 补审债务

P3/P4/P5 三批 Kimi 均缺签（额度耗尽，用户豁免）。Kimi 恢复后应补审 P5 的 cycle 分类语义（尤其
state-machine 70 个的 transition 完整性和 auto-runner-repeat 99 个的 lifecycle 语义），不阻塞 P6。

### P6 阶段审查推进签字

| Agent | 结论 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **accept** | 2026-07-25 | Coding Owner 自验；532 shared tail 全分类（433 cycle + 80 named owner + 17 owner-local + 2 item-private）、0 shared author script；574 local call + 6 item bridge、11 jump 全退役；21 source / 42 owner-local allocation / 21 copy；六个物品私有脚本；8,102 可逆；ledger 18,383/5,630/8,975/0；plan 6,793/11,447/0、repeat 0/0/0；P6 shadow、全 migrate 与根门禁通过。 |
| Kimi | **absent（用户豁免）** | 2026-07-25 | 额度仍耗尽；依用户“合成一个都让 GLM 审核”的裁决，本批原架构/共享判据/身份分层席位继续由 GLM 合并代审。额度恢复后补审，但不阻塞 GLM `accept` 后的 P6 → P7；最终验收时若仍缺签须再请用户裁决。 |
| GLM | **accept（合并代审）** | 2026-07-25 | 独立复跑 shadow `--through p6 --check`（854/0/0, digest `58d5ab97…`）+ P6 PAL golden（6/6 isolated）+ typecheck + P0 audit；532 shared tails 全分类（433 cycle+80 owner+17 local+2 item-private）/ 0 shared author script / 6 item-private 无 call/jump / 574 local call+6 item bridge / 21 source→42 flow→21 copy / 13 scc active=0 / 8,102 守恒 / legacy jumpScript+callScript in active output=0 / ledger 18,383+5,630+8,975+0 pending / 首跑 6,793/11,447/0 重复 0/0/0 / pending=0。见「GLM P6 合并代审」。 |

- counter / 返工: 当前无；GLM 无返工。
- P6 -> P7 准入: **allowed（2026-07-25；GLM 合并代审 `accept`，Kimi 用户豁免）**。Codex 可启动 P7。
- Kimi 补审债务: P3/P4/P5/P6 四批均登记；不阻塞本次 GLM 合并代审，但不自动等于
  N3-1 最终缺签豁免。
- 本表只控制 P6 内部分批推进；N3-1、C8、ED-5I 仍未完成最终验收。

### GLM P6 合并代审（2026-07-25）

**方法**：只读合并代审（架构 + 数据），不改实现文件。读 p6-shared-closure.ts / p6-validate.ts /
p6-transition-plan.ts 全部源码 + 独立复跑 `migrate:script-v5:shadow --through p6 --check` + P6 PAL golden（隔离）+
typecheck + P0 audit。

#### 重点 1：532 shared tail 全分类 + 0 shared author script ✅

GLM 独立复跑 `sharedTailClassifications` disposition 分布：

| disposition | 卡内冻结 | GLM 复跑 | 结论 |
|---|---:|---:|---|
| p5-cycle-structure | 433 | **433** | ✅ |
| p4-named-owner | 80 | **80** | ✅ |
| p6-owner-local | 17 | **17** | ✅ |
| p6-item-private | 2 | **2** | ✅ |
| sharedAuthorScript | 0 | **0** | ✅ |
| unknown | 0 | **0** | ✅ |
| **total** | **532** | **532** | ✅ |

**全部 `sharedAuthorScript: false`**——共享脚本判据回归"通用函数"本义，没有把复杂但不复用的逻辑
误升共享。`sharedAuthorScripts: []`，共享脚本库不再列迁移/存储实现。

#### 重点 2：6 个物品私有脚本 + 268/270 不回退 ✅

GLM 独立验证 6 个 `item-private-script`：

| itemId | scriptId | bodyCmds | hasCall | hasJump | 结论 |
|---|---|---:|---|---|---|
| 265 水灵珠 | use | 1 | false | false | ✅ 无内部桥接 |
| 266 火灵珠 | use | 1 | false | false | ✅ |
| 267 土灵珠 | use | 1 | false | false | ✅ |
| 280 包袱 | use | 11 | false | false | ✅ |
| 290 天书 | use | 2 | false | false | ✅ |
| 293 手绢 | use | 8 | false | false | ✅ |

- 全部 `hasCall=false, hasJump=false`——**作者正文不再桥接到内部块**
- 身份 `{ kind: "item-private-script", itemId, scriptId: "use" }`——**归物品定义拥有，不进共享脚本库**
- **268 craftRecipe / 270 drawFromResourcePool** 保持结构化领域用途，未回退为脚本 ✅

#### 重点 3：574 local call + 6 item bridge + 21 source→42 flow→21 copy ✅

GLM 独立验证 closureCensus：

| 口径 | 卡内冻结 | GLM 复跑 | 结论 |
|---|---:|---:|---|
| internalCalls.input | 580 | **580** | ✅ |
| internalCalls.inlinedLocal | 574 | **574** | ✅ |
| internalCalls.absorbedItemBridges | 6 | **6** | ✅ |
| internalCalls.autoCompatibilityBoundaries | 22 | **22** | ✅ |
| internalCalls.remaining | 0 | **0** | ✅ |
| legacyJumps.input | 11 | **11** | ✅ |
| legacyJumps.rewrittenLocal | 5 | **5** | ✅ |
| legacyJumps.absorbedItemPrivate | 6 | **6** | ✅ |
| legacyJumps.remaining | 0 | **0** | ✅ |
| localSourceBodies | 21 | **21** | ✅ |
| localFlowAllocations | 42 | **42** | ✅ |
| localBodyCopies | 21 | **21** | ✅ |
| misleadingScc.active | 0 | **0** | ✅（13 provenanceOnly） |

**active output 中 legacy jumpScript=0, callScript=0**——GLM 全量 walk ownerFragments + itemPrivateScripts 确认。

#### 重点 4：8,102 守恒 + ledger + plan ✅

GLM 独立验证：

| 口径 | 卡内冻结 | GLM 复跑 | 结论 |
|---|---:|---:|---|
| ownerFragments | 7,035 | **7,035** | ✅ |
| flowStructures | 598 | **598** | ✅ |
| cycleStructures (bodies) | 433 | **433** | ✅ |
| localSourceBodies | 21 | **21** | ✅ |
| item-private provenance | 15 | **15**（6 脚本携带 15 legacy provenance） | ✅ |
| **守恒** | 8,102 | **7,035+598+433+21+15 = 8,102** | ✅ |
| retainedBodies | 0 | **0** | ✅ |
| pending | 0 | **0** | ✅ |

**ledger**：

| 口径 | 卡内冻结 | GLM 复跑 | 结论 |
|---|---:|---:|---|
| entries | 18,383 | **18,383** | ✅ |
| groups | 5,630 | **5,630**（P5 5,620 + P6 10） | ✅ |
| evidence | 8,975 | **8,975**（P5 8,965 + P6 10） | ✅ |
| pending | 0 | **0** | ✅ |

**plan**：首跑 `6,793 writes / 11,447 deletes / 0 conflicts`；repeat `0/0/0`。

#### 独立复跑

| 命令 | 结果 |
|---|---|
| typecheck | pass |
| P6 PAL golden（隔离） | **6/6 passed** |
| shadow `--through p6 --check` | **854 artifacts, first=854/0/0, second=0/0/0** |
| bundle digest | `58d5ab9778694c6ae28975c58e52bf375eb96563d21a0e755b75dda766e9f255` ✅ |
| P0 audit `--check` | digest 不变 |

#### 结论

**GLM P6 合并代审 accept**。架构（共享判据回归通用函数 / 物品私有脚本分层 / 6 author root 直接拥有
正文无桥接 / 13 scc active=0 / legacy jump+call in active output=0）+ 数据（532 全分类 / 574 local call /
21→42→21 local flow / 8,102 守恒 / ledger 18,383+5,630+8,975+0 / 双跑 0/0/0 / fail-loud 反例）逐项成立。
无 counter/rework。**P6 准入 P7**。pending 归零——P2-P6 累计 IR 已无未归属 body。

#### Kimi 补审债务

P3/P4/P5/P6 四批 Kimi 均缺签（额度耗尽，用户豁免）。Kimi 恢复后应补审 P6 的共享判据执行（尤其
物品私有脚本 vs 共享脚本的分层是否正确、21 body copy 是否可接受），不阻塞 P7。

### GLM P2 复审（2026-07-15）

**方法**：只读审查，不改实现文件。读 p2-transform.ts / source-v4.ts / validate-ir.ts 全部源码 + 独立复跑
`migrate:script-v5:shadow --check` + P2 PAL golden（8 tests）+ 全 migrate（44/333+1skip）+ P0 audit `--check`。

#### 重点 1：数据守恒 11,447 = 8,102 + 3,345，3,345 = 863 + 2,482 ✅

GLM 独立复跑 `buildP2ScriptMigrationIR`：

| 口径 | 卡内冻结 | GLM 复跑 | 结论 |
|---|---:|---:|---|
| productBodies | 11,447 | **11,447** | ✅ |
| retainedBodies | 8,102 | **8,102** | ✅ |
| tombstones | 3,345 | **3,345** | ✅ |
| retained + tombstone | 11,447 | **8,102 + 3,345 = 11,447** | ✅ 守恒 |
| sprite tombstone | 863 | **863** | ✅ |
| hostile tombstone | 2,482 | **2,482** | ✅ |
| 863 + 2,482 | 3,345 | **3,345** | ✅ 守恒 |

**p2-transform.ts:451-467** 从 `frozen.product.folded.spriteAction.bodies` / `hostileBehavior.bodies` 精确
取 folded set，`corpus.bodies.filter(folded.has)` 生成 tombstone，`filter(!folded.has)` 生成 retained——
**不存在误归或遗漏**。

#### 重点 2：ledger 3,347 entries / 1 group / 3,346 evidence / 8,101 pending ✅

GLM 独立复跑 `draftLedger`：

| 口径 | 卡内冻结 | GLM 复跑 | 结论 |
|---|---:|---:|---|
| entries | 3,347 | **3,347** | ✅（3,345 tombstone outcome + 2 s018 group outcome） |
| groups | 1 | **1** | ✅ `s018-owner-resolution` / `resolve-s018-owner-v1` / `conflict-if-modified` |
| evidence | 3,346 | **3,346** | ✅（3,345 folded-body + 1 s018-owner-resolution） |
| pending | 8,101 | **8,101** | ✅ |
| pendingByPhase | P3:1,715 P4:5,939 P5:433 P6:14 | **完全一致** | ✅ |

**entries 互不重叠**（validate-ir.ts:268-269 `ledgerSources.size === ledger.entries.length`）：3,345 tombstone
各含唯一 `legacy-script` id + 2 group entries（body legacy-script + installer source-cell），source key
去重后无碰撞。

**evidence 完整**（validate-ir.ts:363-389）：每个 tombstone evidence `kind:'folded-body'`、含 source audit digest
+ legacyScriptId；s018 group evidence `kind:'s018-owner-resolution'`、含 body + installer source-cell。

#### 重点 3：844 mutation 命令 + trigger 202 = 201 pending + 1 s018 ✅

GLM 独立复跑 `commandCensus` + `commandTransition`：

| kind | input | pending | P2 | 结论 |
|---|---:|---:|---:|---|
| setEntityAuto | 388 | 388 | 0 | ✅ |
| setEntityTrigger | **202** | **201** | **1** | ✅ **202 = 201 + 1** |
| setEntityTriggerMode | 192 | 192 | 0 | ✅ |
| setSceneOnEnter | 60 | 60 | 0 | ✅ |
| setSceneOnTeleport | 1 | 1 | 0 | ✅ |
| clearSceneScripts | 1 | 1 | 0 | ✅ |
| **total** | **844** | **843** | **1** | ✅ **844 = 843 + 1** |

**trigger 202 vs GLM P1 复审 200 的差异消解**：P1 复审 GLM 手动 walk 得到 200（漏了 body 内嵌套的
setEntityTrigger）；P2 `commandSiteInventory`（source-v4.ts:215-226）递归扫描**全部非脚本文件 + 全部
script body**的嵌套命令，得到 202（1 场景级 s018 + 201 body 内）。GLM P1 G1 微调"trigger 200 vs 202"
**已由 P2 精确审计消解——正确值是 202**。

**s018 唯一 transitioned-p2 command site**（validate-ir.ts:100-107）：精确匹配
`content/scenes/s018.json#/onEnter/0/entry/prepare/0` / `setEntityTrigger` /
`scene/s015/L-4211/e204/d-0a386828`。

#### 重点 4：13 shared/scc 只退役 active identity，没有误删 ✅

GLM 独立验证：

- **13 个 pending-owner 全部 activeRefId 以 `ir/p2/pending/` 开头**（非 `shared/scc-`）——**active identity 已退役**
- **全部 8,102 retained body 的 activeRefId 均不以 `shared/scc-` 开头**——validate-ir.ts:177-178,193
  `misleading === 0` 验证
- **全部 13 个 scc legacy id 仍在 retainedBodies 中**（非 tombstone）——**没有被误删**
- **owner 分类精确**（validate-ir.ts:200-204）：6 `pending-author-root-absorption` + 2 `pending-shared-tail`
  + 4 `pending-scene-hook-inline` + 1 `pending-flow-structure` = 13
- **PENDING_SCC_ALLOCATIONS 13 条**与 P0 `frozen.canaries.misleadingSccBodies` **逐条 id 匹配**
  （p2-transform.ts:166-178 `isDeepStrictEqual` 验证）

#### 重点 5：validation 真实计算 + PAL 测试 + 双跑矩阵闭环 ✅

**validate-ir.ts 从 corpus 重算（非摘要比对）**：
- `readV4ScriptCorpus(migration)` 独立重建 corpus（:61）
- `ir.source.sourceSnapshotSha256 === corpus.sourceSnapshotSha256`（:62）——**源快照独立重算**
- `stableJsonSha256(ir.commandCensus) === stableJsonSha256(corpus.commandCensus)`（:78）——**命令普查独立重算**
- `stableJsonSha256(ir.commandSites) === stableJsonSha256(corpus.commandSites)`（:82）——**命令位点独立重算**
- `semanticChanges === 0`（:191）：reverseP2ScriptRefs 还原后与源逐 body `legacyAuthorCellSha256` 对比——**零语义变化**
- `dangling === 0`（:192）：visitScriptRefs 检查所有 ref 解析到 retained target——**零悬空**
- `ir.digest === digestWithoutSelf(ir)`（:56）：IR digest 自验
- `ledger.digest === digestWithoutSelf(ledger)`（:57）：ledger digest 自验

**PAL 测试闭环**（8 tests passed）：
1. 冻结守恒 + 确定性影子包（3,345 tombstone / 8,102 retained / 13 pending / s018 / 202=201+1）
2. 作者修改 tombstone body → `identity-tombstone-modify` 冲突 + 零写
3. s018 body 或 installer 任一修改 → `identity-transition-group-modify` / `installer-rewrite-modify` + 零写
4. 作者新增指向 tombstone 的引用 → 冲突 + 零写
5. 仅改 ScriptRef.chunk 不制造冲突（chunk 非身份）
6. target/ledger 关系篡改 → 零写
7. library metadata source drift 检测
8. 完整 bundle 闭包 + summary 篡改检测

**双跑矩阵闭环**：
- `migrate:script-v5:shadow --check`：853 artifacts，first=853/0/0，second=0/0/0
- `migrate:script-v5:shadow` 连跑两次：fixed root 第二次 first=0/0/0, second=0/0/0
- 影子包两次独立构建（第二次逆序输入）字节一致
- P0 audit `--check`：digest 不变，issues=0

**全包门禁**：migrate 44 files / 333 passed + 1 skipped；P0 baseline 一致。

#### P1 G1 trigger 数字微调结论

GLM P1 复审提出"trigger 200 vs 202 微调，G1 要求 P4 冻结最终值"——**P2 已消解此微调**。
正确值是 **202**（P2 `commandSiteInventory` 递归扫描 body 内嵌套命令，比 GLM P1 手动 walk 多 2 个）。
P1 G1 必改项已由 P2 闭合。

#### 结论

**GLM P2 accept**。数据守恒、ledger/evidence closure、844 命令对账、13 scc 退役安全、validation 真实计算和
PAL 测试/双跑矩阵全部逐项成立。P1 trigger 200 vs 202 微调已消解（正确值 202）。无 counter/rework。

### Kimi P2 复审（2026-07-24）

**方法**：只读复审，不改实现文件。通读 experimental/script-v5 全部 13 个实现/测试文件
（p2-transform/p2-transition-plan/source-v4/validate-ir/shadow-writer/shadow-harness/CLI/测试）；
独立复跑 shadow `--check`、experimental 全部测试、P0 audit `--check` 与迁移 dry-run。

- **shadow-only 边界与完整 author-preserving target：成立**。实现全部在
  `experimental/script-v5/` + 影子 CLI + gitignored 固定根；IR/manifest 明示
  `canonical=false`、`runtimeConsumable=false`。影子 target 是真实三方预检后的完整 842 文件
  merged v4 层（`createMigrationPlan(base, ours, currentGenerator)`，conflicts 即 throw）+
  P2 IR/ledger/验证报告叠加层；`target/reconstruction.json` 契约明示两层均非 canonical v5；
  `content/locale.json` 作者字节原样保留（PAL golden 逐字节断言）。v4 generator/权威
  baseline/`projects/pal` 零改动（dry-run `0/0/0`、P0 audit digest 不变双重实证）。
- **3,345 tombstone / s018 TransitionGroup / target-ledger-evidence 闭包：成立**。守恒
  11,447=8,102+3,345 由 `assertPalP0Audit` 深度比对冻结 P0（digest + folded 列表独立 digest +
  13 scc canary 全等）；tombstone 带枚举 reason 与含 P0 digest 的 evidenceId；s018 组 =
  body cell + installer cell 双 source、`resolve-s018-owner-v1`、`conflict-if-modified`，
  installer 改写为 `selectEntityBehavior{scene:s015,entity:e204,trigger,use:enter-s018}`，
  且 `preservedDefaultTriggerBodyIds` 验证默认 trigger 未与动态行为合并、未被剪。
  `validate-ir` 从 corpus 独立重算全量断言；`reverseP2ScriptRefs` 还原后逐 body
  canonical cell 相等（semanticChanges=0）证明改写仅为身份替换；dangling=0、
  misleading scc=0、author roots 零删除、pending 清单与 ledger 双向相等。
- **作者修改/新增入站引用 → 冲突且零写：成立**。tombstone 作者改 →
  `identity-tombstone-modify`（作者删除放行，与删除收敛）；s018 body 改/删 →
  `identity-transition-group-modify`；installer 改/删 → `installer-rewrite-modify`；
  作者新增指向 tombstone 的引用 → `identity-tombstone-reference-modify`（base/ours 双向
  入站清单比对，s018 installer 自身引用显式豁免）；冲突路径一律 `planWithConflicts`
  （cellWrites=0/cellDeletes=0）。`inboundReferenceInventory` 跳过 transitioned 体自身
  （tombstone 互引同灭，正确）。
- **source identity / bundle digest / 关系篡改防护：成立**。`legacyAuthorCellSha256` 递归剔除
  ScriptRef.chunk（rechunk ≠ 作者修改，单测+PAL 测试双证）；library metadata（作者改名）入
  语义快照、物理 chunk 元数据不入。`targetLedgerRelationshipValid` 从 IR 重推全部期望
  entries/groups/evidence/pending 并深度比对——PAL 测试证明即使攻击者重算 ledger 自摘要
  也只能得到零写冲突。bundle manifest 闭包（逐 artifact hash + 无未登记文件 + coreDigest
  分域）+ 两次独立构建（逆序输入）字节一致。
- **shadow writer 安全：成立**。路径拒绝绝对/反斜线/NUL/非 NFC/点段/逃逸、NFC+小写便携
  碰撞与文件/目录父子碰撞；walkTree 拒 symlink 与非普通文件（写入目标是全新 mkdtemp
  staging，无 symlink 跟随面）；sibling lock `wx` 排他；apply 重算计划拒伪造/过期 plan；
  staging 逐文件读回 hash 复验 + staged 树 0/0 验证后才 `rename` 原子替换，失败恢复旧根
  （AggregateError 保留 backup 路径）；`shadow.json` 最后写；写前写后
  `assertProjectSnapshotCurrent` 防 TOCTOU。已知可接受余项（不阻塞）：进程崩溃残留
  lock/backup 需手工清理（fail-loud 不静默腐化）、staging 写无 fsync（gitignored 可重建
  影子根，hash 读回已兜底）。
- **独立复跑**：shadow `--check` 853 artifacts、second `0/0/0`、bundle digest
  `e80638f0…a243bc` 与卡内一致；experimental 38/38（8 PAL golden + 30 writer/CLI/
  stable-json）；P0 audit `--check` digest 不变、issues=0；迁移 dry-run `0/0/0`。
  命令普查确认含 `setEntityTriggerMode:192 + clearSceneScripts:1`（Kimi P1 补正已落地），
  trigger 202=201+1 与 GLM 复跑互洽。

**结论：Kimi P2 accept**。五个审查焦点全部成立，无 blocking 项。P2 三席 accept 齐
（Codex 2026-07-24 / GLM 2026-07-15 / Kimi 2026-07-24），P2→P3 准入已更新为 allowed；
P3 仍须遵守 P1-1 影子纪律与 P1-8 矩阵，完成后同样需三方批次审查。
等待 Kimi P2 审查（架构边界/transition relationship/MG2 作者保护/writer 安全）；三方 accept 后准入 P3。

### GLM P0 复审（2026-07-15）

**方法**：只读审查，不改实现文件。独立复跑 `audit:script-control-flow` CLI + `script-control-flow-audit.pal.test.ts` PAL golden + 逐项核对 G1-G3。

#### G1 P0 审计口径冻结 + 折叠守恒 ✅

**口径文档化**：审计 `generator.countingRules` 明确记录 8 个口径定义（sourceRoots / sourceScc / productEntries / productReferences / productScc / runtimeReachability / sharedTail / foldedBodies）。**GLM 设计阶段 G1 口径差异已由入仓审计冻结消解**：
- `productReferences` 规则："one recursive AST scan per stored body; call sites, distinct targets, and distinct callers are separate"。审计只扫 stored script bodies 内的引用（callScript 675 sites / 628 distinct targets / 580 distinct callers），**场景根存储壳的 callScript 单独归入 `productEntrySites`（scene-stage-root 5,935 sites）**——这正是 GLM 设计阶段 675 vs 6,515 差异的根因（GLM 全量 walk 把场景根 + body 内 callScript 合计）。
- `runtimeReachability` 规则："union of final content ScriptRef sites and author library declarations, then fixed point over four body reference kinds"。**GLM 设计阶段 7,932 vs 8,102 差异的根因**：GLM BFS 只从场景根 callScript 出发，未覆盖 author library declarations（6 个 shared/user 根）+ item runScript（6）+ direct binding（1）；审计的 rootTargets = entries(5,942) + libraryDeclarations(6) 去重后 5,942 个种子，BFS 后 8,102。

**折叠守恒**：863 sprite + 2,482 hostile + 0 overlap + 0 unclassified = **3,345 = unreachable**。审计 `folded-origin-conservation` 门禁验证 `classifiedUnreachable.size + unclassifiedUnreachable.length === unreachable.size`，fail-loud。overlap=0 证明 sprite/hostile 折叠集不交叉。

#### G2 s018 异常钉死 ✅

`canaries.s018` 精确定位 1 条：
- `kind: scene-direct-binding, source: content/scenes/s018.json, path: onEnter/0/entry/prepare/0, commandKind: setEntityTrigger, targetId: scene/s015/L-4211/e204/d-0a386828`
- 债务记录 `s018-cross-scene-internal-binding`："s018 on-enter entry.prepare installs an internal s015/e204 trigger body without a named behavior slot"
- **根因明确**：s018 的 onEnter entry.prepare 用 `setEntityTrigger` 安装了 s015 场景 e204 实体的内部 trigger body（跨场景内部绑定），不是 s018 本地实体。P2 必须解决此异常。

#### G3 13 shared/scc SCC 验证 ✅

`canaries.misleadingSccBodies` 13 条，全部验证：
- **全部 `productCyclic: false`**（产物图 Tarjan SCC 无环）
- **全部 `sourceCyclic: false`**（源 legacy SCC 也无环）
- 债务 `misleading-shared-scc-name`："shared/scc-* is assigned to every owner-ambiguous Tarjan component, including singleton acyclic bodies"
- 全部 13 个 body id 逐条列出（shared/scc-L-27506/... 到 shared/scc-L-41075/...）
- **sharedSccTails = 2**：`shared/scc-L-38780/...` 和 `shared/scc-L-39811/...`（reachable + 多前驱）；其余 11 个非 shared tail
- **命名错误根因确认**：`migrate-content.ts:1885-1889 sccFor()` 用 `component?.[0]`（Tarjan SCC 首地址）命名，但 13 个 body 全部无环——"SCC"命名暗示循环但实际不存在。P2 停止生成该命名。

#### 入口分类账 + site/target/caller 口径 ✅

**source entries**（6,767 sites / 6,747 graph seeds）：8 类入口全覆盖
- scene-on-enter 160 / scene-on-teleport 67 / entity-trigger 3,681 / entity-auto 2,165
- item 517 / skill 106 / enemy 67 / actor 4
- duplicateGlobalSites = 20（全局域+地址去重差异）

**product entries**（5,942 sites）：4 类分类
- scene-stage-root 5,935（场景根存储壳 callScript） / scene-direct-binding 1（s018 异常）/ item-run-script 6 / content-command 0
- seedCoverage 覆盖 scenes 5,936 + items 6 + skills 0 + enemies 0 + actors 0 + library 6 = 5,948 sites → 5,942 distinct targets

**product references**（3,857 sites）：4 类 × {sites, distinctTargets, distinctCallers}
- callScript 675/628/580 / jumpScript 2,642/1,422/1,713 / setEntityAuto 342/307/183 / setEntityTrigger 198/171/93
- byFlow: execution 3,222 / deferred-binding 635

#### PAL golden 独立复跑 ✅

- `pnpm audit:script-control-flow` → baseline 一致，digest `97d3a22a28b2d8dd0d26a007e05e009576a1b8815b5b332a64954dd88c61bdbc`
- `script-control-flow-audit.pal.test.ts` → 2 tests passed（含 Map 逆序字节确定性 + 全部断言）
- `script-control-flow-audit.test.ts` → 10 tests passed（含反误配 + entity inline-stage deferred 假 SCC）
- migrate 全包 40 files / 295 passed / 1 skipped
- `assertScriptControlFlowAudit(report)` → issues=[]（零 fail-loud）

#### 金丝雀验证 ✅

- **e2493**：trigger 3 stages（scene/s154/root/entity-e2493/page-0/trigger/stage-{0,1,2}）+ auto 0 + dynamicTrigger 1（scene/s154/L-23827/e2493/...）
- **e2495**：trigger 2 stages + auto 1（scene/s154/root/entity-e2495/page-0/auto/stage-0）+ dynamicTrigger 1（scene/s154/L-23786/e2495/...）
- **authorRoots**：6 个全部 bridgeOnly=true（空壳桥接内部块）
- **overrideBodies**：87 个全部 derivation=scene-hook-override + source.addresses 非空 + sceneHookContexts 非空 + installerSourceAddress 非空

#### address-zero 语义分类 ✅

- `addressZero.unknown = 0`（所有 address-0 按 opcode + 入口通道分类）
- disposition 覆盖：empty-pointer / absent-branch / no-failure-branch / clear-binding / absent-scene-hook / clear-scene-hooks / stop-branch / auto-self-loop / trigger-stop / context-dependent / unowned-context

#### 结论

**GLM P0 accept**。G1-G3 全部逐项通过，入口分类账/site-target-caller 口径/折叠守恒/s018/13 scc/PAL golden 全部对账成立。
GLM 设计阶段的口径差异（675 vs 6,515、7,932 vs 8,102）已由入仓审计的 `countingRules` 文档化 + 明确入口分类消解。
baseline digest 字节锁定 + Map 逆序确定性 + issues=0。无 counter/rework。
等待 Kimi P0 复审（R5/provenance 安全性/控制流口径）；两方 P0 accept 后进入 P1 schema/save/MG2 设计冻结。

### Kimi P0 复审（2026-07-23）

**方法**：只读复审，不改实现文件。通读 `script-control-flow-audit.ts` 全 1,802 行与四个迁移文件
P0 diff；独立复跑 audit `--check`、迁移 dry-run、两个审计测试与 migrate 全量测试；抽样解析
pal-v1.json 金丝雀与 per-body 字段；对照 `reference/sdlpal/script.c` 核实通道语义。

- **R5 逐 body provenance：满足**。`ScriptBodyAudit.source` 逐 body 带 entryAddress/addresses/
  addressZeroSites/owner/legacyComponent；`sourceAddressAuditStack` 保证 callee 地址归 callee
  （translate-events.ts:129-133,311-326）；`derivation` 五类来源 + `dialogue` 入口/出口态 +
  独立重算 hash 比对（audit.ts:1285-1297，`dialogue-hash-mismatch` fail-loud）；缺失/孤儿/
  未证来源全部进 issues（:1147-1150,:1333）。
- **三套 SCC/deferred 口径：成立且互相解释**。legacy raw 326 cyclic（全 43,503 地址，binding
  边不入环）；semantic 302（auto/trigger 通道拆分 + 零指针幻象边剔除）；product 676/778
  （同步 call/jump，deferred binding 经 `walkObjectsWithFlow` 传播且不进 Tarjan/自环，
  :427-450,:1107-1112）。`countingRules` 把口径写进基线本体。GLM 口径差由
  byKind/byFlow 的 sites/distinctTargets/distinctCallers 三列消解。
- **0x04 通道语义对照 sdlpal 成立**：`PAL_RunTriggerScript` 与 `PAL_RunAutoScript` 中 0x04 均
  调用 trigger 解释器（script.c:3257-3262,:3565-3570），semantic 图 `0x4→trigger` 忠实；
  auto 中 0x06 rate-0 target-0 不推进 IP、下帧原址续跑（script.c:3570-3590），semantic 图
  自环边建模（audit.ts:727-728）一致。address-zero 十一种 disposition、unknown=0。
- **0x6D 上下文：fail-loud 闭环**。安装源识别 = 调用体 provenance 地址 ∩ 0x6D patch 地址 ∩
  目标 scene ∩ override 目标地址四重约束（audit.ts:970-993,1162-1188）；ambiguous/unresolved/
  without-context/invalid-scene 全部 fail-loud；61/61 installer address、96 stage targets、
  87 override body 上下文完整；无跨 body 反推（合成测试证明缺 provenance 不猜）。
- **overlay 证据转交：完整**。WeakMap 旁路不可序列化、不进 canonical；
  `structuredCloneWithScriptStageSourceAddressAudit` 按对象树位置转交；
  foldStages/bakeAndStripBattleCfg/deepStripBattleCfg 三个变换点均显式交接；
  issues=0 反证 6,453 content-entry 体来源非空。
- **digest 完整性：成立**。sourceDigest 覆盖 commands+入口+空指针；productDigest 覆盖
  index+全部 body+入口+折叠+审计证据（registry/sprite/hostile roots 全部入 digest）；
  报告 digest 独立复跑复现 `97d3a22a…61bdbc`；Map 逆序字节一致测试通过。
- **canonical 零漂移**：迁移 dry-run `writes=0/deletes=0/conflicts=0`，generated=0/kept=1/merged=0；
  四个迁移文件 diff 均为旁路证据追加。
- **金丝雀抽验（与 GLM 独立复核互洽）**：s018 跨场景直绑（s018 prepare → s015/L-4211/e204）
  精确入债；e2493 3 trigger 根 + 动态目标 L-23827、e2495 2 trigger + 1 auto + 动态目标
  L-23786；6 作者根 bridgeOnly 全中；13 个 shared/scc 在 source/product 两口径下均非 cyclic
  （命名误导实证）；sharedSccTails=2（532 = 530 scene-internal + 2 scc 成立）；对话多入口态
  仅 12 基 × 2 id，P3 相容性面可枚举；四条 debt 含 registry-identity-context-omissions
  （pendingAuto/lastRngChunk 留 P3 证明）与卡内风险一致。
- **独立复跑**：audit `--check` 一致（issues=0）；两个审计测试 12/12；migrate 全量
  40 files / 295 passed / 1 skipped。P0 未跑根 `pnpm check` 已在卡内声明，变更限于 migrate
  包且该包 typecheck/test/Biome 全过，P0 粒度可接受；后续批次须恢复根门禁。

**结论：Kimi P0 accept**。R5 全部字段落地，无 blocking 项。P0 两席（GLM + Kimi）accept 齐；
P1 开始前须先冻结 schema/save/MG2 设计（R1-R3 为该冻结的验收钉），不得直接开始 P1 实现。

## P1: schema / save / MG2 设计冻结（已三签）

本节已于 2026-07-24 获 Codex / Kimi / GLM 三方设计 `agree`，无 `counter`，实现准入
`allowed`。P2-P6 仍严格受影子迁移边界约束，不得修改 current v4、`projects/pal`、权威
baseline 或 runtime/editor loader；P7 前不得把中间 IR 冒充 canonical v5。

### P1 现状事实

- PAL 当前 294 个场景、4,944 个实体；3,616 个实体带 `pages`，共 3,616 页，`maxPages=1`。
  这只能证明 PAL 迁移产物当前都是单页，不能把数组位置继续当稳定身份。
- 编辑器允许按 `pageIndex` 编辑任意页，但运行时在预取、动画、动态切换、auto 和 trigger 五处
  都只消费 `pages[0]`。场景定义在加载时被克隆，`setEntityAuto` / `setEntityTrigger` 对
  `pages[0]` 的修改只是活体瞬时态，重入场景或读档即丢；v4 存档中不存在可恢复的实体活动脚本指针。
- 编辑器只保证实体 id 在一个场景内唯一。P1 以后任何实体行为身份和持久态都必须按
  `sceneId -> entityId` 定位，不得继续假定 entity id 全工程唯一。
- `sceneScriptOverrides` 已经是 v4 的真实持久态，具有“字段缺席=继承、`null`=禁用、绑定=覆写”
  三态；PAL 的动态 hook 覆写是内联 `ScriptStage[]`，内部递归包含 96 个 `ScriptRef`，不能只改
  顶层引用。
- `entityStage` 当前把 trigger=`entityId`、auto=`auto:<entityId>`、onEnter=`s:<sceneId>`、
  onTeleport=`teleport:<sceneId>` 混入同一个字符串 record；它既没有 owner 域，也没有当前
  behavior/hook guard，切槽后会把旧段位串到新行为。
- 当前 `ScriptRef.id` 是持久脚本身份，`chunk` 只是加载提示；MG2 已能把同 id 跨 chunk 视为同一
  body，但不能处理 rename/remap，普通 rename 会被看成旧 key 删除 + 新 key 新增。

### P1-1 版本轴裁决

冻结候选如下；这是 Kimi / GLM 本轮必须明确 `agree` 或 `counter` 的问题，不能无声复用版本号。

- **N3-1 使用 `contentVersion 5`**：v4 -> v5 只承载本卡的作者脚本模型、行为槽、场景 hook 与
  兼容映射语义。
- **A7-4 顺延为 `contentVersion 6`**：现有文档把 v5 预留给 A7-4 全资源闭包。版本号是顺序升级
  契约，不是永久占位；N3-1 先推进时必须把 A7-4 顺延 v6，并在 P1 accept 后同步
  `a7-resource-closure-audit.md`、`asset-pipeline.md`、`project-lifecycle-design.md`、
  `capability-map.md` 与 roadmap。不得把两个高风险迁移揉成一个 v5 升级器。
- **`SAVE_VERSION` 4 -> 5**：存档形状真实发生变化，不能继续依赖 `??=` 后无条件抬版本。
  `contentVersion` 与 `SAVE_VERSION` 仍是独立轴，只是在本次发布各自从 4 升到 5。
- P2-P6 只生成并验证**影子迁移 target**和累计 transition ledger，不向用户工程发布半迁移
  schema；P2-P5 的中间形态是明确的 `ScriptMigrationIR`，只允许
  `validateScriptMigrationIR(throughPhase)` 检查“已处理域无 legacy node、未来批域可枚举待处理”，
  绝不冒充 canonical v5 或交给 runtime/editor。P6 每次从 v4 重跑 P2-P6 全链后才产出最终 v5，
  并要求 legacy command/binding/private block=0、通过最终 v5 validator；P7 只发布与 P6
  digest 完全一致的字节。P7 通过完整门禁后，项目、baseline、兼容 sidecar 与 manifest 才在
  一个事务中发布。
  影子根固定为 gitignored 的 `packages/migrate/.shadow/N3-1/v5/`，每一批都从权威 v4
  project/baseline 重新执行截至本批的完整纯变换，不依赖上一批残留文件；CI 使用临时根执行
  同一命令并在结束后删除。P2-P6 不修改 `CONTENT_VERSION`、当前 v4 validator、HTTP/runtime
  loader、`projects/pal` 或权威 baseline；`ScriptMigrationIR` 与 v5
  type/validator/compiler 放在显式 `experimental/script-v5` 边界，只由 shadow harness 调用。
  P7 才原子切换当前 schema 常量和 loader。各批必须同时跑当前 v4 根门禁与 phase-specific
  shadow 门禁，P6 另跑 final-v5 专项门禁，不能靠“半升级项目”取得绿灯。
  各批统计用 `generatorEpoch` / `transitionId`，不得滥用 `contentVersion` 充当批次号。

### P1-2 canonical 实体行为与 Page/Mode

P1 不另造一套与 `EntityPage` 平行的 mode 系统。现有 Page 被升级为具名 mode，行为正文提升为
实体本地具名槽；v5 不再同时接受 v4 的“page 内嵌正文”形态。

```ts
type PageId = string
type BehaviorId = string
type StageId = string
type MachineId = string
type StateId = string

interface EntityAddress {
  scene: SceneId
  entity: EntityId
}

interface NamedEntityBehavior {
  label: string
  order: number
  flow: ScriptFlow
}

interface TriggerActivation {
  on: 'interact' | 'touch'
  range?: number
}

interface EntityPage {
  id: PageId
  label: string
  /** Page 是定义层最底层；缺席即禁用，没有 null/继承双编码。 */
  trigger?: BehaviorId
  auto?: BehaviorId
  triggerActivation?: TriggerActivation
  animation?: SpriteActionBinding
}

interface EntityBehaviors {
  trigger?: Record<BehaviorId, NamedEntityBehavior>
  auto?: Record<BehaviorId, NamedEntityBehavior>
}

interface EntityBase {
  // ...既有实例字段
  behaviors?: EntityBehaviors
  pages?: EntityPage[]
  initialPage?: PageId
}
```

冻结语义:

- `BehaviorId` / `PageId` 是实体内稳定作者身份；必须由创建/升级事务显式分配，禁止从旧地址、
  `d-<hash>`、chunk、数组位置或正文 hash 运行时推导。
- `pages` 按 `page.id` 合并和引用；存在 pages 时 `initialPage` 必须命中。当前 MG2 的 pageIndex
  特判在 v5 退役，改为 id identity merge。
- Page 只组合 trigger/auto 槽、触发方式和已有的 `animation`，不复制行为正文。它就是“同时切换
  多个通道”的具名 mode；UI 可继续叫“行为模式”。
- Page 处于定义层最底层，`trigger` / `auto` / `triggerActivation` 缺席统一表示禁用，不接受
  `null`；只有 world override 层才有“继承/禁用/覆写”三态。`triggerActivation` 与 trigger
  body 正交并承接原版 0x40，不靠删除 trigger 正文实现。
- v4 单页实体升级为显式 `default` page；多页只有在每页存在唯一、可验证的旧 `state` 时才可生成
  稳定升级 id，否则 fail-loud 并要求作者命名，不得用 pageIndex 猜。旧 `state` 仅作迁移证据，
  不再与 `world.entityState` 建立隐藏选页规则。

### P1-3 唯一 world/save 权威

静态 `SceneDef` / `EntityDef` 是不可变定义；`world.script` 是唯一可变、可保存权威；运行时
runner、活动页、动作播放器和已解析 stages 只允许在下述 safe-point 丢弃并由 world 重建，不能
把尚未提交的 command continuation 当作已保存状态。冻结形状如下:

```ts
type FlowCursor =
  | { kind: 'stage'; stage: StageId }
  | { kind: 'state'; machine: MachineId; state: StateId }

type Selection<T> =
  | { kind: 'inherit' }
  | { kind: 'disabled' }
  | { kind: 'use'; value: T }

type PageSelection =
  | { kind: 'inherit' }
  | { kind: 'use'; value: PageId }

interface BehaviorCursor {
  behavior: BehaviorId
  at: FlowCursor
}

interface ActiveBehaviorSlot {
  /** 字段缺席与 {kind:'inherit'} 规范化为同一含义；序列化只保留显式非继承 override。 */
  selection?: Exclude<Selection<BehaviorId>, { kind: 'inherit' }>
  cursor?: BehaviorCursor
}

interface WorldEntityBehaviorState {
  /** 缺席=EntityDef.initialPage。 */
  page?: PageId
  trigger?: ActiveBehaviorSlot
  auto?: ActiveBehaviorSlot
  /** 缺席=继承 Page；disabled=禁用；use=显式覆写。 */
  triggerActivation?: Exclude<Selection<TriggerActivation>, { kind: 'inherit' }>
}

interface WorldBehaviorState {
  entities?: Record<
    SceneId,
    Record<EntityId, WorldEntityBehaviorState>
  >
  scenes?: Record<SceneId, WorldSceneHookState>
}

interface WorldScriptStateV5 {
  flags: Record<string, boolean>
  vars: Record<string, number>
  /** v5 所有实体持久态统一按 scene -> entity 寻址。 */
  entityState: Record<SceneId, Record<EntityId, number>>
  entityPos?: Record<SceneId, Record<EntityId, GridPos>>
  entityLayer?: Record<SceneId, Record<EntityId, number>>
  behaviors: WorldBehaviorState
  // ...其余非实体字段
  /** v5 不再存在 flat entityStage 或 sceneScriptOverrides。 */
}
```

唯一解析顺序:

1. world `page` 缺席时取 `initialPage`；
2. 每个 slot 的 `selection` 缺席时取该 Page；`disabled` 禁用；`use` 的值必须命中本实体对应
   registry；作者命令中的 `inherit` 删除该 override，而不是把 Page 当前值钉死进 world；
3. cursor 必须携带当前有效 BehaviorId guard，并按 flow kind 保存 `StageId` 或
   `MachineId + StateId`。换到不同 id 时回到 flow initial；重复选择同 id 时保留；
4. 选择 Page 是一个原子事务：`selection=inherit` 删除 `world.page`，随后重新解析
   `EntityDef.initialPage`；`selection=use` 必须先校验目标 PageId 再写 `world.page`。两种分支都
   必须先求出新旧 effective Page，再清除两槽 selection override 与 activation override，并按
   新旧有效 behavior id 决定各 cursor 保留或回 initial；不得让 trigger 已切、auto 未切的半状态
   可见。恢复 inherit 后，后续定义层 `initialPage` 变化必须自然生效，不能把当时的 PageId
   重新钉进 world；
5. 单槽选择只改该 channel，保留 Page 和另一槽；运行时从 world 解析后重建 runner，不 mutate
   `pages[0]`。
6. v5 同时把 `entityState` / `entityPos` / `entityLayer` 与所有实体目标命令升级为显式
   `{scene,entity}`。v4 flat key 必须经 `LegacyEntityAlias` 唯一定位；若作者工程中同 id 出现在
   多场景，不能静默猜 owner；迁移报告要求作者显式选择 `broadcast-v4`（忠实复制 v4 的共享值）
   或单一 target（明确标记行为变化）。

作者命令冻结为稳定选择，不再携带 stages 或 `ScriptRef`:

```ts
| {
    kind: 'selectEntityBehavior'
    scene: SceneId
    entity: EntityId
    channel: 'trigger' | 'auto'
    selection: Selection<BehaviorId>
  }
| {
    kind: 'selectEntityPage'
    scene: SceneId
    entity: EntityId
    selection: PageSelection
  }
| {
    kind: 'setEntityTriggerActivation'
    scene: SceneId
    entity: EntityId
    selection: Selection<TriggerActivation>
  }
```

实体 owner 必须显式带 scene，才能正确表达 s018 这类跨场景安装；找不到 owner、实体或目标槽一律
fail-loud。所有既有实体命令在 v5 也使用该复合地址；`self` 在编译时解析成 owner 明确的地址，
不作为存档 key。rename/delete/copy 必须通过引用索引与 editor apply/invert 事务。

Page 动画也是同一原子 mode 事务的一部分：提交前预检目标 `SpriteActionBinding` 及资源闭包，
任一缺失则 world/播放器零写；新旧解析到同一 binding 时保留非持久播放相位，不同 binding 从
frame 0 重启。剧情临时动作继续作为高优先级 overlay 播完，不被 Page 切换截断；结束后回落到
**当前** Page 的 base action。播放相位不进存档，重入/读档从当前 Page base 的 frame 0 开始。

### P1-4 场景本地具名 hook

v5 用唯一 `hooks` 模型替换顶层 `onEnter` / `onTeleport` 与 world 裸 binding 双真值:

```ts
type SceneHookSlot = 'onEnter' | 'onTeleport'
type HookId = string

interface NamedSceneHook {
  label: string
  order: number
  flow: ScriptFlow
}

interface SceneHookChannel {
  initial?: HookId
  variants: Record<HookId, NamedSceneHook>
}

interface SceneDef {
  // ...既有场景字段
  hooks?: Partial<Record<SceneHookSlot, SceneHookChannel>>
}

interface WorldSceneHookSlot {
  /** 缺席=继承 SceneDef initial；disabled=禁用；use=显式覆写。 */
  selection?: Exclude<Selection<HookId>, { kind: 'inherit' }>
  cursor?: { hook: HookId; at: FlowCursor }
}

type WorldSceneHookState = Partial<Record<SceneHookSlot, WorldSceneHookSlot>>
```

- v4 静态 `onEnter` / `onTeleport` 升级为显式 `default` variant；v5 canonical 不再保留旧顶层字段。
- `selectSceneHooks { scene, selection: Partial<Record<SceneHookSlot, Selection<HookId>>> }` 是唯一
  动态切换命令；selection 必须至少含一个 own field，并作为一个 world 事务原子提交。
  `inherit` 删除该槽 override，`disabled` 禁用，`use` 选择稳定 HookId。选择不同 hook 回到 flow
  initial，相同 hook 保留 cursor；`clearSceneScripts` 升级为同一命令内两个 `disabled`，不拆成
  可能留下半状态的两条命令。
- 存档只保存 selection 与带 HookId guard 的 `FlowCursor`，不保存 `ScriptStage[]`、`ScriptRef`
  或编译块。
- onEnter validator 必须 slot-aware，允许 `stage.entry`；onTeleport 和普通行为继续禁止 entry。

### P1-5 ScriptFlow、共享脚本与 lowering 边界

```ts
type AuthorConditionV5 =
  | { kind: 'flag'; flag: string; is: boolean }
  | { kind: 'var'; var: string; op: '==' | '!=' | '>=' | '<=' | '>' | '<'; value: number }
  | { kind: 'entityState'; target: EntityAddress; is: number }
  | { kind: 'entityInScene'; target: EntityAddress }
  | { kind: 'facingEntity'; target: EntityAddress; range?: number }
  | { kind: 'chance'; percent: number }
  | { kind: 'hasItem' | 'ownsItem' | 'itemEquipped'; itemId: string; atLeast?: number }
  | { kind: 'allFullHp' }
  | { kind: 'hasMoney'; atLeast: number }
  | { kind: 'inParty'; actorId: string }
  | { kind: 'all' | 'any'; of: AuthorConditionV5[] }
  | { kind: 'not'; cond: AuthorConditionV5 }

interface AuthorSceneEntryPresentation {
  prepare: AuthorCommand[]
  reveal: SceneReveal
}

interface AuthorStage {
  id: StageId
  /** 仅 onEnter hook 的 initial stage 可使用；其它 owner/stage 的 validator 拒绝。 */
  entry?: AuthorSceneEntryPresentation
  body: AuthorCommand[]
  /** 缺席=下次仍从本 stage 激活；存在时本次完成后只提交 cursor，不在同次继续跑。 */
  next?: StageId
}

type ScriptFlow =
  | { kind: 'stages'; initial: StageId; stages: AuthorStage[] }
  | { kind: 'stateMachine'; machine: ScriptStateMachine }

type AuthorLoopCommand = {
  kind: 'loop'
  /** while=先判断再执行；until=先执行再判断。 */
  mode: 'while' | 'until'
  cond: AuthorConditionV5
  body: AuthorCommand[]
  yield: 'worldTick'
  /** 必填正整数；超限时 fail-loud，保证 save barrier 最终可达。 */
  maxIterations: number
}

type StateTransition =
  | { kind: 'stay' }
  | { kind: 'restart' }
  | { kind: 'to'; state: StateId; yield: 'macroTask' | 'worldTick' }
  | {
      kind: 'branch'
      cond: AuthorConditionV5
      then: StateTransition
      else: StateTransition
    }

interface ScriptStateMachine {
  id: MachineId
  label: string
  initial: StateId
  states: Record<StateId, {
    label: string
    /** 仅 onEnter hook 的 initial state 在本次 scene load 首次 activation 可使用。 */
    entry?: AuthorSceneEntryPresentation
    body: AuthorCommand[]
    next: StateTransition
  }>
}

interface SharedAuthorScript {
  name: string
  description?: string
  self: 'none' | 'optional' | 'required'
  body: AuthorCommand[]
}

type SharedScriptLibraryV5 = Record<ScriptId, SharedAuthorScript>
```

- 现有 `ScriptStage[]` 升级为 `{ kind:'stages' }`；不可约图才使用完整具名状态机，不把普通阶段
  再包装成一堆匿名状态。`AuthorStage.id/next`、machine/state id 都是显式稳定身份，插入或重排
  数组不得改变 cursor。旧数字 stage 只能经 sidecar 的逐 index `FlowCursor` 映射升级。
- stage flow 一次外部激活只跑当前 stage，成功后原子提交 `next` 并返回；`stopScript` 不提交
  next。state machine 从已保存 state（缺席则 initial）开始：`stay` 提交当前 state 并结束本次
  激活，`restart` 提交 initial 并结束；`to` 先提交目标 state，再按标注让步并在**同次激活**
  尾转移。`branch` 只选择上述 transition，本身不另造状态。旧 jump 尾链用 `macroTask`，
  需要世界拍的持续循环用 `worldTick`；每次 SCC 回边必须经过一种可取消让步。`stopScript`
  在 state body 中仍立即结束且不应用该 state 的 transition，保持现有语义。
- state `entry` 的相位不另存：只有 **onEnter hook 的 initial state 在本次场景 load 的首次
  activation** 可以带 `SceneEntryPresentation`；其它 state 以及同次 `to` 目标一律禁止 entry。
  它仍是“目标画面尚未呈现时”的唯一 reveal 边界，不被泛化成普通状态进入动画。所有 state
  body/transition 的 command、asset 与 entity closure 在 activation 前预检；失败则 cursor 与
  呈现零写。
- canonical 循环只允许上面的结构化 `loop` 节点（`while` / `until`）；每轮必须在显式
  `worldTick` cancellation/yield 边界让步，并声明有限 `maxIterations`。达到上限 fail-loud，
  cursor 不推进；无界同步循环在 validator 拒绝，不能靠 generated `jumpScript` 暗中运行。
  auto 的永久循环仍由 auto runner 生命周期承接，不要求作者写 `while(true)`；因此 save barrier
  可以等待一个 loop command 完成，不能在未持久化 loop/call continuation 时从中途拍快照。
- v5 `AuthorCommand` 保留现有非控制流原语并加入 `loop` 与本节的稳定选择命令；明确排除
  `jumpScript`、`setEntityAuto`、`setEntityTrigger`、`setEntityTriggerMode`、
  `setSceneOnEnter`、`setSceneOnTeleport`、`clearSceneScripts` 及任何内联 stages/binding
  mutation。所有递归 command-bearing 字段（branch then/else、battle onLose/onFlee、
  teleportOut onFail、confirm onNo、loop body、scene entry prepare 等）一律递归
  `AuthorCommand[]`，条件一律 `AuthorConditionV5`；validator 不能让 legacy `Command`/裸实体
  id 从嵌套字段漏入 v5。canonical `callScript` 形状固定为
  `{kind:'callScript', script: ScriptId, self?: EntityAddress}`，只引用作者共享脚本稳定 id；
  chunk 由索引解析，不进入作者引用。`none` 表示 callee 不依赖实体：禁止显式 self，并在 callee
  作用域屏蔽 caller self，但不阻止“有 self 的 caller 调用 none 脚本”；`optional` 使用显式地址，
  否则词法继承 caller self，也允许无 self；`required` 使用显式地址或继承值，仍无值时拒绝保存/
  编译。任何有效值都必须解析到场景内存在的复合地址。调用/返回期间 self 作用域入栈/出栈，
  保留现有 return/self 契约。
- 共享脚本只允许上面的 `SharedAuthorScript.body: AuthorCommand[]`，不承载持久
  `ScriptFlow/stateMachine`，调用状态只存在于当前 runner 栈；因此不需要、也不允许 world
  shared-script cursor。若未来要做可暂停共享工作流，必须另开 schema 任务。
- lowering 输出单独的 `ExecutableFlow` / block graph，可包含 `{chunk,id}`、尾转移和调度细节；
  它只在内存或可删缓存存在，必须带 `compilerVersion + canonicalContentDigest`，目标不存在、hash
  不符或版本不符即重新生成。canonical 内容、save、引用索引和 MG2 均不得引用 generated block。
- call 仍保持“callee 正常/stop 后返回 caller”；lowering 尾转移仍保持“不返回 + 每次尾转移至少
  一次宏任务让步”。两者不得机械互换。
- canonical 调度规则是计时真值，`ExecutableFlow` 必须把它物化成显式 scheduling boundary：
  在 auto owner 下，每个 lowering **之前**的 AuthorCommand 节点（包括 branch/call 外壳）后
  都有一个 100ms compatibility boundary；trigger/hook owner 缺省没有该 pace。PAL v4 升级把
  原 v4 节点边界逐项搬入，lowering/inlining 不得因生成节点数改变节拍；新写 v5 内容遵守同一
  固定规则并由 validator/预览显示。运行时只执行物化 boundary，不能在遍历 AST 后再偷偷 sleep。
  `macroTask` 只让出 JS 宏任务、不推进世界钟；`worldTick` 等待下一次 `STEP_MS=100ms` 世界拍。
- auto runner 的兼容语义冻结为当前已拍板实现：其它 NPC 与主脚本并行；只有被主脚本 authority
  接管的实体暂停其冲突动作，hidden 实体只在激活边界挂起。兼容调度表完整包含 command
  boundary 100ms、段间 40ms、hidden 轮询 120ms、authority move 等待 150ms 与 chase 丢步等待
  200ms；step/nudge 被接管时丢动作，move 等待归还，不能概括成统一“暂停”。P1 不借重构改为
  “对话期全部暂停”。
- 存档使用 **flow safe-point barrier**，不持久化 command index/call stack/wait phase：请求保存
  后先关闭新 auto activation gate，等待所有正在运行的持久 flow 到达下一个 stage/state
  transition safe-point 并原子提交 cursor；state machine 在 gate 关闭时不得从该 safe-point
  继续同次尾转移，然后再拍快照。等待期间编辑器/游戏显示全屏保存态。命令必须可取消
  且 validator 禁止 auto 中永不结束的宿主调用；超时则本次保存失败、磁盘零写，不从半命令
  快照。Page/slot/hook 事务只有在**有效 flow id 真正变化**时才递增该 owner epoch；重复选择
  同一有效 id 保留 live runner 与 cursor。不同 id 的 handoff 不能粗暴中止当前命令体：world
  selection 可原子提交，但旧 invocation 持 lease 跑到下一个 stage/state safe-point，旧 cursor
  CAS 因 epoch 过期被丢弃，新 flow 只从其 initial 开始下一次 activation；scene unload/明确取消
  才 abort。这样保留 v4“改绑定后当前 body 继续”的语义，也不会在副作用后 wait 中取消再重跑。
  行为自切换（含非 tail 后续命令）、auto 中途发起保存以及副作用后 wait 都必须有回归测试。
- v5 的所有 entity-targeting `AuthorCommand` **和** `ScriptCondition`（至少
  `entityState` / `entityInScene` / `facingEntity`）都使用 `EntityAddress`；UI 可把“当前场景”
  作为选择器默认值，但 canonical 不存裸 id。shared script 的词法 self 也解析成该地址，杜绝
  同名实体在条件读取侧重新形成第二套全局身份。

### P1-6 v4 -> v5 工程与存档升级

工程升级:

- `open-local` 在 v3 -> v4 之后、任何 v5 validator/loader 之前执行 v4 -> v5；HTTP/runtime
  loader 继续只接受当前版本，不在运行时猜旧 schema。v3 -> v4 upgrader 固定调用专用
  `validateContentV4`，不能在 `CONTENT_VERSION` 升 5 后误用“当前版本 validator”去校验中间态。
- 升级必须一次性预检 scenes、script library、所有 Command-bearing 内容与 transition ledger；
  普通本地工程只事务写 canonical 文件与兼容 sidecar，manifest 最后提交；它无权写仓库
  baseline。PAL 的 MG2 发布事务才同时写 project、repo baseline 与完整控制账。任一目标缺失时
  都必须零写。
- v5 manifest 增加精确 migration registry：

  ```ts
  interface ProjectMigrationDescriptor {
    version: 1
    fromContentVersion: 4
    toContentVersion: 5
    path: 'content/migrations/script-v4-v5-save.json'
    sha256: string
  }
  // manifest.migrations['script-v4-v5']: ProjectMigrationDescriptor
  // manifest.minimumSaveVersion?: number  // 缺席=1；必须为 1..当前 SAVE_VERSION 的整数
  ```

  `LoadedProject` / editor state 以只读 validated migration blobs 持有 registry 指向的原始字节与
  parsed sidecar；它不是作者脚本库，也不在普通属性面板修改。普通保存、首次 HTTP 保存、
  另存为、clone、ZIP、重开与 ZIP import 必须从 registry 枚举、校验 digest 并 copy-through，
  不能继续只枚举固定 ContentKey。对 **registry 已登记** 的 descriptor，manifest digest 不符或
  sidecar 缺失必须拒绝；额外未登记 sidecar 也拒绝。明确执行“终止 v4 存档兼容”后，
  descriptor 与 sidecar 同时不存在是合法 current-v5 工程形态，不能被这条规则误拒。
- 普通项目迁移使用独立的项目根相对
  `LocalProjectMigrationJournalV1`（临时路径 `.type-pal/journals/script-v4-v5.json`），只记录
  该项目内 target path、old/new digest、写入顺序和 manifest precondition；entry 是
  `{op:'write',target,oldSha256?,stagedPath,newSha256}` 或
  `{op:'delete',target,oldSha256}` 的判别联合。new bytes 先完整写入项目根相对
  `.type-pal/migration-staging/<txid>/`，所有 writable 均 close（原生 FS 可用时再 fsync）且 hash
  复验后才发布 journal，随后按确定顺序幂等 write/delete target、manifest 最后；delete 在执行前
  必须核对 old digest，已不存在视为该 entry 已完成，内容不同则硬拒并保留 journal。恢复必须从
  staged bytes 前滚。write 的 apply 规则同样唯一：target 已等于 `newSha256` 视为完成；否则
  `oldSha256` 有值时 target 必须存在且匹配，有值却缺失或不匹配均硬拒；`oldSha256` 缺席只表示
  “预期 target 不存在”，此时 target 已存在即硬拒；实际 staged bytes 每次写前都必须重验
  `newSha256`。完成后才删 journal 与 staging。由 open-local storage adapter 执行。它复用 plan/hash 规则，
  但不得调用或伪装成当前硬编码
  `projects/pal + repo baseline` scope 的 PAL migration journal。PAL MG2 继续使用 repo 事务，
  两套 journal type/path/recovery 入口互不接受。
- 任意作者 v4 工程的 upgrader 必须从该工程自身生成 project-specific compatibility sidecar；
  若作者修改后的旧图无法唯一结构化，停在可操作的迁移报告，不得套用 PAL 的地址映射或静默
  丢正文。PAL baseline ledger 只服务 PAL 的三方迁移。
- 迁移报告是可恢复闭环而不是日志死路：报告保存 immutable input digest、问题 path/owner、
  候选身份和所需 resolution kind；编辑器进入只读迁移工作台，允许作者命名 Page/Behavior、
  为无上下文 shared entity ref 选 `EntityAddress`，以及确认 v4 duplicate entity state 的
  `broadcast-v4`（忠实复制同一旧值到全部地址）或显式选择单一 target（标记行为变更）。全部问题
  resolved 后重新预检原 digest、生成 allocation/alias preview，用户确认才启动本地 journal；
  digest 变化则报告作废重算，确认前工程零写。`broadcast-v4.targets` 必须排序、非空、无重复，
  normalizer 把旧 `state/pos/layer` 值逐目标复制；cursor alias 同样可 broadcast，并按每个目标
  自己的 stages 映射；`single` 只写所选地址/行为。

存档升级:

- 读档 API 分两段：异步 `preflightSaveMigration(project, payloadHeader)` **先**检查
  `minimumSaveVersion`，再从 payload 与 project contentVersion 构造所需 transition chain；
  只对链上实际需要的 transition 要求并校验 descriptor/sidecar，并只按 aliases 涉及范围懒加载
  必要 scene/entity/hook closure，产出只读纯 resolver；同步
  `normalizePayload(payload, resolver)` 再在隔离 clone 中执行 v4 -> v5、全量验证并一次提交。
  不允许同步 normalizer 偷读文件，也不强制预载 294 个场景。失败不污染输入；仅在完成已知
  content migration chain 后允许 `payload.contentVersion` 等于当前工程，当前“版本不一致只
  toast 继续”改为缺链硬拒。`version=5/contentVersion=5` 的 current payload 具有空 transition
  chain，只跑 current-v5 validator；即使工程已通过破坏性操作删除历史 4 -> 5 descriptor/sidecar
  也必须可加载。相反，任何确实需要 4 -> 5 的 payload 缺 descriptor/sidecar 都必须硬拒。
- 版本顺序固定为：先把 save envelope 按既有 `SAVE 1 -> 2 -> 3 -> 4` 纯链规范化但保留
  `payload.contentVersion` 与 legacy 字段；再按 manifest registry 完成从该 contentVersion 到
  v5 的每个 content transition（N3 sidecar 只负责 4 -> 5，缺任何更早链即硬拒）；N3 transition
  成功后生成 v5 world，最后一次性写 `version=5/contentVersion=5` 并跑 current validator。
  不能先抬版本再补字段，也不能把“支持 SAVE v1-v3”误写成“天然支持任意旧 contentVersion”。
  `payload.version < manifest.minimumSaveVersion` 在读取 sidecar 前即拒绝；沿用现有 envelope
  字段名 `version`，本卡不再另造 `saveVersion` 字段。
- N3-1 接受矩阵固定如下，未列组合一律 fail-loud，不做启发式修补：

  | payload `version` | payload `contentVersion` | project | 结果 |
  |---|---:|---:|---|
  | 5 | 5 | 5 | 直接跑 current validator；不要求历史 4 -> 5 sidecar |
  | 1..4 | 4 | 5 | 先走完整 envelope 1 -> ... -> 4，再要求 4 -> 5 descriptor/sidecar，成功后一次性写 5/5 |
  | 5 | 4 | 5 | 拒绝：不是 N3 产出的合法中间态 |
  | 1..4 | 5 | 5 | 拒绝：content 已新而 envelope/world 仍旧 |
  | 任意 | 任意 | 5 | 若 `version < minimumSaveVersion`，在任何 sidecar IO 前拒绝 |

- v4 没有实体 auto/trigger 活动态：`world.script.behaviors.entities ??= {}`，缺席准确表示继承
  静态 initial Page，不伪造已丢失的瞬时 mutation。
- 旧 `entityStage` 按已知域迁移：`entityId` -> default trigger、`auto:<entityId>` -> default
  auto、`s:<sceneId>` -> resolved onEnter hook、`teleport:<sceneId>` -> resolved onTeleport
  hook。必须经 sidecar 的显式 `single/broadcast-v4` resolution，把旧 index 逐项映成带 guard
  的 `FlowCursor`；不能只保存一个 `stageCount` 或把 index 原样带入 v5。v4 flat key 若命中多个
  同名实体，`broadcast-v4` 对每个 `LegacyCursorTarget` 按其自己的 legacy stage 长度钳到
  `[0,last]` 再查 index alias，忠实保持旧版各实体独立 clamp 后共享 raw key 的结果；选择 single
  必须标记行为变化。非有限/非整数、空绑定、未决多义、缺失目标或 index 无映射均 fail-loud。
- `sceneScriptOverrides` 的字段缺席、null、绑定三态原样保持。非 null 值按
  `(sceneId, slot, canonicalLegacyBindingDigest)` 唯一映到 HookId；digest 只是旧 payload
  校验键，不是作者身份。digest 递归规范化 inline stages，`ScriptRef` 只取稳定 `id`、明确忽略
  `chunk` 加载提示；要覆盖全部嵌套 ScriptRef。unmapped、ambiguous、tombstoned、cross-owner
  或目标闭包缺失均带存档位置/scene/slot 报错。
- PAL 金丝雀除 e2493/e2495 外，增加 s188 三层引用 hook；它证明“只替换顶层 ScriptRef”不足。

### P1-7 identity transition ledger 与 MG2

迁移器从同一确定性内存模型生成两个投影:

1. baseline 控制账
   `packages/migrate/baselines/pal/_transitions/script-v4-v5.json`：供 MG2 重键、墓碑、作者修改
   保护和审计；
2. 工程兼容 sidecar `content/migrations/script-v4-v5-save.json`：只保留旧存档所需的 binding /
   cursor/entity aliases 与 target closure；PAL 投影记录 full ledger digest，普通作者工程记录
   project-local transform digest，供 editor/reforge 共用 validator。

baseline `_state.json` 升到 v2，增加 `generatorEpoch` 与 `transitions: {id:digest}`。两个投影都由
显式 formatter 排序、结尾换行；禁止 timestamp、绝对路径和 chunk。映射核心:

```ts
interface ScriptIdentityTransitionV1 {
  version: 1
  projectId: string
  transitionId: 'script-v4-v5'
  from: {
    contentVersion: 4
    generatorEpoch: string
    baselineSha256: string
  }
  to: { contentVersion: 5; generatorEpoch: string }
  sourceAudit: { methodVersion: string; digest: string }
  entries: TransitionEntry[]
  groups: TransitionGroup[]
  legacyBindings: LegacyBindingAlias[]
  legacyCursors: LegacyCursorAlias[]
  legacyEntities: LegacyEntityAlias[]
  digest: string
}

type LegacyAuthorIdentity =
  | { kind: 'legacy-script'; id: string }
  | { kind: 'legacy-entity-page'; sceneId: string; entityId: string; pageIndex: number }
  | { kind: 'legacy-entity-flow'; sceneId: string; entityId: string; pageIndex: number;
      channel: 'trigger' | 'auto' }
  | { kind: 'legacy-scene-hook'; sceneId: string; hook: SceneHookSlot }

interface TransitionEntry {
  from: LegacyAuthorIdentity
  /** 整个旧 author cell 的 canonical digest，不只 script body。 */
  baseCellSha256: string
  outcome: IdentityOutcome
}

type CanonicalOwner =
  | { kind: 'entity-behavior'; sceneId: string; entityId: string;
      channel: 'trigger' | 'auto'; behaviorId: string }
  | { kind: 'scene-hook'; sceneId: string; hook: SceneHookSlot; hookId: string }

type TombstoneReason =
  | 'folded-sprite-action'
  | 'folded-hostile-behavior'
  | 'pruned-unreachable'
  | 'inlined-structured-flow'

type CanonicalAuthorIdentity =
  | { kind: 'entity-behavior'; sceneId: string; entityId: string;
      channel: 'trigger' | 'auto'; behaviorId: string }
  | { kind: 'entity-page'; sceneId: string; entityId: string; pageId: string }
  | { kind: 'scene-hook'; sceneId: string; hook: SceneHookSlot; hookId: string }
  | { kind: 'state-machine'; owner: CanonicalOwner; machineId: string }
  | { kind: 'shared-script'; scriptId: string }

type IdentityOutcome =
  | { kind: 'rekey'; target: CanonicalAuthorIdentity; editPolicy: 'carry-atomic' }
  | { kind: 'group'; groupId: string }
  | { kind: 'tombstone'; reason: TombstoneReason; evidenceId: string }

interface TransitionGroup {
  id: string
  sources: LegacyAuthorIdentity[]
  targets: CanonicalAuthorIdentity[]
  transformId: string
  editPolicy: 'conflict-if-modified'
}

interface LegacyBindingAlias {
  from: {
    kind: 'scene-hook-binding'
    sceneId: string
    hook: SceneHookSlot
    digest: string
  }
  target: Extract<CanonicalAuthorIdentity, { kind: 'scene-hook' }>
}

interface LegacyCursorTarget {
  legacyStageCount: number
  target:
    | Extract<CanonicalAuthorIdentity, { kind: 'entity-behavior' }>
    | Extract<CanonicalAuthorIdentity, { kind: 'scene-hook' }>
  indices: Array<{ index: number; cursor: FlowCursor }>
}

type LegacyCursorAlias =
  | { legacyKey: string; mode: 'single'; target: LegacyCursorTarget }
  | { legacyKey: string; mode: 'broadcast-v4'; targets: LegacyCursorTarget[] }

type LegacyEntityAlias =
  | { legacyId: string; mode: 'single'; target: EntityAddress }
  | { legacyId: string; mode: 'broadcast-v4'; targets: EntityAddress[] }

type LegacyStageFlowIdentity =
  | Extract<LegacyAuthorIdentity, { kind: 'legacy-entity-flow' }>
  | Extract<LegacyAuthorIdentity, { kind: 'legacy-scene-hook' }>

type CanonicalStageFlowOwner =
  | Extract<CanonicalAuthorIdentity, { kind: 'entity-behavior' }>
  | Extract<CanonicalAuthorIdentity, { kind: 'scene-hook' }>

type StageLineageOwner =
  | { kind: 'legacy'; flow: LegacyStageFlowIdentity }
  | { kind: 'canonical'; flow: CanonicalStageFlowOwner }

interface LegacyPageLineagePlan {
  owner: EntityAddress
  entries: Array<{
    oursPageIndex: number
    lineage:
      | { kind: 'baseline'; baselinePageIndex: number }
      | { kind: 'new'; pageId: PageId }
  }>
}

interface LegacyStageLineagePlan {
  flow: StageLineageOwner
  entries: Array<{
    oursStageIndex: number
    lineage:
      | { kind: 'baseline'; baselineStageIndex: number }
      | { kind: 'new'; stageId: StageId }
  }>
}

type ProjectLocalAllocation =
  | {
      kind: 'author-cell'
      source: { path: string; sourceSha256: string }
      target: CanonicalAuthorIdentity
    }
  | { kind: 'page'; owner: EntityAddress; oursPageIndex: number; pageId: PageId }
  | { kind: 'stage'; flow: StageLineageOwner; oursStageIndex: number; stageId: StageId }

interface ProjectMigrationSidecarV1 {
  version: 1
  projectId: string
  transitionId: 'script-v4-v5'
  fromContentVersion: 4
  toContentVersion: 5
  sourceAuditDigest: string
  provenance:
    | { kind: 'pal-baseline'; fullLedgerDigest: string }
    | { kind: 'project-local'; transformDigest: string }
  legacyBindings: LegacyBindingAlias[]
  legacyCursors: LegacyCursorAlias[]
  legacyEntities: LegacyEntityAlias[]
  lineagePlans: {
    pages: LegacyPageLineagePlan[]
    stages: LegacyStageLineagePlan[]
  }
  localAllocations: ProjectLocalAllocation[]
  targetClosures: Array<{ target: CanonicalAuthorIdentity; identityDigest: string }>
  digest: string
}
```

- source identity 覆盖旧 script id、positional Page、纯 inline entity flow 与静态 inline scene
  hook；其中 `pageIndex` 永远指 **baseline v4** 的位置，不能拿 ours 当前数组下标直接匹配。
  source key 只用旧 schema 的 owner/slot/index，不含正文 digest，因此 lineage 对齐后的 ours
  修改正文仍会命中同一 source，再由 `baseCellSha256` 检出修改。`legacy-script` 不含
  chunk/path/hash；
  binding digest 只用于 save alias guard，且对递归 `ScriptRef.chunk` 不敏感。
  `baseCellSha256` 验证完整旧 author cell，不能成为新身份。每个消失/换身份的旧 author cell
  必须恰有一个 outcome。所有 author-cell hash 与 stage-lineage canonical digest 都递归把
  `ScriptRef` 规范化为稳定 `id`、忽略 `chunk` 加载提示，同时保留其余语义字段；纯 rechunk
  不能被误报为作者修改或打断 stage 对齐。
- author cell projection 必须互不重叠：`legacy-entity-page` 的 hash 只含 page shell
  （state、animation、trigger activation 等）并排除 trigger/auto stages；两个
  `legacy-entity-flow` 各自只 hash 对应 channel 的 stages。静态 hook cell 只 hash其旧 binding，
  引用到的 legacy script body 仍由独立 `legacy-script` cell 保护。删除整条 trigger 等同时修改
  多个**不重叠** cell 时，由显式 TransitionGroup 决定组合，不允许同一正文字节被重复判 modified。
- target 至少覆盖实体行为、Page、场景 hook、状态机和作者共享脚本；target id 由升级器显式分配
  并锁进 ledger，不从正文推导。
- `rekey` 只允许 1 -> 1 同型原子搬运；merge/split/结构化只能通过一等
  `TransitionGroup` 表达，group 的 sources/targets 必须完整、排序且与所有 `groupId` entry
  双向相等，禁止靠多个 entry 碰巧共享 transformId。`tombstone` 必须有 P0 证据和枚举 reason。
  replacement 只能作诊断，不代表可把旧 save/ref 静默改 null。
- MG2 在普通三方 merge **之前**验证 ledger，并分别调用
  `upgradeSnapshotV4ToV5(base, ledger, basePlan)` 与
  `upgradeSnapshotV4ToV5(ours, ledger, oursExtensionPlan)`，把完整 v4 project snapshot
  （pages、inline flows/hooks、Command-bearing 内容、script library 与引用）提升到同一 v5
  canonical 形状；theirs 已使用 v5。不得只重键 script bodies 后拿剩余 v4 结构与 v5 merge。
  `oursExtensionPlan` 必须先做 **lineage alignment**，不能把 ours 的当前位置当 baseline 身份：
  Page 只可用唯一旧 `state` 作为迁移证据；stage 先用唯一 canonical stage digest 做
  base↔ours 序列对齐，再以唯一相邻锚点/LCS 收窄。证据只决定“继承哪个 baseline source”，
  不参与最终 id 推导。插入、删除、重排、正文编辑、重复相同 stage 或证据冲突导致不能得到
  一对一全映射时，迁移报告要求作者明确指定 ours Page/stage 继承哪个 baseline index；未匹配
  ours 节点才是 new allocation，未匹配 baseline 节点按 delete/transform 规则处理。未解决时
  冲突且零写，禁止靠数组位置猜。
  对 baseline 不存在的作者 cell、Page 和 stage 在预检阶段分别显式分配稳定
  CanonicalAuthorIdentity/PageId/StageId；完整 `lineagePlans` 与 `localAllocations` 写入 project
  sidecar，preview/apply 必须复用同一 input digest 下的计划。最终 project `legacyCursors` 必须
  从 **ours v4 的最终顺序 + lineage** 逐 index 生成，使作者旧存档继续落到同一语义 stage；
  不能复制 baseline positional cursor alias。无法唯一识别 owner 的 user-only inline/page 内容
  同样进入可操作迁移报告。分配顺序固定为 author owner/Behavior/Page 在先、其 StageId 在后：
  作者新增 Page 的 trigger/auto stage 通过 `{kind:'canonical'}` owner 指向刚分配的具名行为，
  不伪造 baseline pageIndex。v4 shared script 是 `Command[]` 而非持久 stage flow，不进入
  `LegacyStageLineagePlan`；递归命令中的 inline binding 由其不重叠 author cell /
  TransitionGroup 原子保护，修改过且不能无损结构化时进入迁移报告，不用缺 path 的 stage index
  猜身份。
  正文仍是原子 merge，但冲突路径显示新作者身份，不显示 generated block。
- 1 -> 1 时：ours==base 取 theirs；theirs==base 取搬运后的 ours；双方都改在 canonical target
  报 value conflict。transform 的任一 source 被作者改过默认冲突；tombstone 的 body 或引用被
  改过报 `identity-tombstone-modify`，绝不丢作者修改。
- active transition 下出现未登记删除、重复 source、base hash 过期、target 缺失、target collision、
  映射链/环、group 少/多成员、source 重复入组、many-to-one 缺 group 或 split 缺 transformer，
  均形成 identity conflict；沿用现有 plan 契约，任一 conflict 时
  `writes=0/deletes=0`。
- 控制账本身是 generator-owned immutable input，不参加普通递归三方合并。事务分两类且禁止
  混用：普通 open-local 只写 project canonical + project sidecar + manifest；PAL MG2/P7 才写
  project target + full ledger + project sidecar + repo baseline + manifest。两者都由 journal
  前滚，manifest 仍最后。
- full ledger 与 project sidecar 的 `digest` 都按“省略自身 digest 字段后的 canonical bytes”
  计算。工程打开时校验 registry 中实际登记的 manifest descriptor；读旧档且 transition chain
  确实需要 4 -> 5 时，再校验 sidecar 自身 digest/project/from/to 与 target closure。current 5/5
  空链不要求历史 descriptor/sidecar。repo full ledger 不随游戏发布，`fullLedgerDigest` 仅供
  PAL P7/MG2 门禁交叉对账。
- `targetClosures.identityDigest` 只覆盖 sidecar alias、local allocation 与
  `legacyCursor.indices` **实际引用**的 owner + Page/Behavior/Hook/Stage/Machine/State id 集及
  owner-membership，不覆盖未引用的新节点、next 边、正文、label、order 或资源内容；添加 stage、
  改正文/next 不会使 sidecar stale。sidecar target 全部进入统一引用索引；删除或 re-id 被旧档
  alias 引用的身份必须被阻止，或在同一事务中追加 successor 映射并重签 sidecar/manifest。
  编辑器另提供明确的
  “终止 v4 存档兼容”破坏性迁移：删除 descriptor + sidecar、把项目 minimumSaveVersion 提到 5
  并提示旧档将硬拒；普通保存、rename 或删除不能暗中执行该动作。
- 当前 migration journal 的承诺是中断后**前滚**至一致终态，不保存旧正文，不能宣称自动回滚。
  崩溃瞬间允许“部分文件已新、manifest 仍旧 + 有效 journal”的中间磁盘态，但 loader 必须先
  recovery，不能暴露给工程；无 journal 时只允许 manifest/closure 自洽的全旧或全新，mixed
  状态却没有有效 journal 必须硬拒。recovery 完成后只能是全新。
  发布后回退只能从同一 VCS/备份整体恢复 project + baseline + ledgers + manifest；不设计
  v5 -> v4 逆变换。

### P1-8 阻断测试矩阵

- content/validator：BehaviorId/PageId/HookId/StageId/MachineId/StateId 唯一与闭包、
  initialPage/flow initial、稳定 next、Page 引用、inherit/disabled/use 三态、跨 scene owner、
  slot-aware stage/state entry、共享脚本禁止持久 machine、旧字段在 v5 为 0。
- runtime/save：stage 重排不改旧 cursor 指向、machine state roundtrip、单槽恢复 inherit 且保留
  另一槽、切不同槽 cursor 回 initial/同槽保留、Page 双槽+animation 原子、剧情 overlay 回落、
  Page `inherit` 删除 override 并跟随后续 `initialPage` 变化、
  两场景同 entity id 不串 `state/pos/layer/behavior`、场景重入与读档一致、JSON roundtrip、
  v4 entity default、四类旧 cursor 的逐 index -> FlowCursor、inline multi-ref override、
  disabled/inherit、未知/未决多义/tombstone/目标缺失 fail-loud、失败输入不变、二次 normalize
  幂等；duplicate entity 的 single/broadcast `state/pos/layer`，以及同一 raw cursor 对两个不同
  stageCount 目标分别 clamp/map 后 broadcast。
- compiler：call-return/stop 与 lowering tail-transfer、不返回和 yield 等价；while/until
  cancellation；nested branch/call lowering 前后 scheduling boundary 字节等价；state
  `stay/restart/to`、macroTask/worldTick 与 SCC 回边；auto 100/40/120/150/200ms 基线、
  并行/authority/hidden 语义；行为自切换 epoch/CAS 和副作用后 wait 中发起保存的 safe-point
  barrier；非 tail self-switch 后续命令仍执行，新 flow 仅从下一 activation 生效。
- ledger：输入 Map 逆序仍逐字节一致；重复 source、坏 hash、非法 target、collision、chain cycle、
  错 project/epoch、group 少/多成员、重复入组、user-only cell owner 多义全拒；legacy script/
  page/inline flow/inline hook source 覆盖；full ledger 与 PAL sidecar digest 门禁互验，运行时无
  full ledger 仍可独立校验 sidecar + manifest descriptor；identityDigest 对正文、add-stage、next
  编辑稳定，删除/re-id 被 alias 引用 target 必须被引用索引阻断。
- MG2 unit：未改 rename、ours-only edit 搬运、双方修改冲突、tombstone 未改删除/已改冲突、
  未登记删除、stale hash、target missing、many-to-one、split、chunk 变化不影响 identity/binding
  digest/baseCell/stage alignment；base/ours 完整 snapshot 先升级再 merge；Page prepend/reorder 保留 baseline lineage，
  新 Page 有显式 allocation；stage insert/reorder/edited-stage 保留对应 StageId，重复等值 stage
  无唯一证据时进入人工 resolution 且零写；project `legacyCursors` 按 ours 顺序生成，作者旧存档
  cursor 在 MG2 后恢复到同一语义 stage；新增 Page 自带 trigger/auto stages 时，先分配 canonical
  behavior/Page 再把全部 stage 分配给该 canonical owner；shared `Command[]` 与递归 inline
  binding 不误当顶层 stage flow；作者新增 inline command 有显式 allocation。
- MG2 integration：e2493/e2495、s018、s188、6 author roots；P2 精确 863+2,482 tombstone；
  P4 全命令口径覆盖 388 auto + 202 trigger + 60 onEnter + 1 onTeleport，并对账 P0 的
  342/198 stored-body ref 子口径；final v5
  `setEntityAuto` / `setEntityTrigger` / `setEntityTriggerMode` /
  `setSceneOnEnter` / `setSceneOnTeleport` / `clearSceneScripts` 均为 0，
  `jumpScript` 由 P3/P5 结构化门禁单独归零；冲突零写；全量
  双跑 0/0/0。
- transaction/open-local：分别对“canonical+sidecar+manifest”和 PAL
  “project+ledger+sidecar+baseline+manifest”各写点注入中断；中断态必须有 journal 且 loader
  先 recovery，恢复后全新；无 journal 时允许全旧或全新，mixed 硬拒。manifest precondition
  覆盖全部 v5 必需文件；
  首存/保存/另存/clone/ZIP/import 不丢或漏验 compatibility sidecar；异步 preflight 只懒加载
  alias 涉及 scene，纯 normalize 失败输入不变；v3->v4->v5 逐版 validator 正确；
  current 5/5 无历史 descriptor 仍可加载、1..4/4 有链可升级、5/4 与 1..4/5 硬拒；
  `minimumSaveVersion` 在 sidecar IO 前拒绝；staged bytes 缺失/篡改时保留 journal、目标零继续写；
  在 descriptor/sidecar delete 前后逐写点崩溃均由 delete-aware journal 幂等前滚，manifest 最后。

### P1 设计推进签字

- Codex: **agree（2026-07-24）**。已核对 content、runtime、save、editor 与 MG2 当前实现；接受
  “Page=具名 mode + 本地行为槽”“world 唯一权威”“scene hook variant”“transition ledger +
  save binding resolver”以及 N3-1=v5 / A7-4=v6 的冻结候选。
- Kimi: **agree（2026-07-24；附两项 P1-8 补正，非阻塞）**。架构/schema/runtime/compiler/版本
  裁决逐项压测并抽查实现与产物：
  1. **唯一状态权威（R3）成立**：Page=具名 mode 只组合槽引用不复制正文；BehaviorId/PageId
   显式分配、禁止地址/d-hash/chunk/下标/正文 hash 推导；world 解析顺序（page→initialPage、
   slot→Page、inherit 删 override 不钉值）与 Page 原子事务（双槽+activation 同清同建）封闭；
   cursor 带 BehaviorId guard + StageId/MachineId+StateId，跨槽段号串扰结构性不可能；
   v4 `state` 选页规则实证为死 schema（运行时五处只消费 pages[0]），删除诚实。
  2. **三态/FlowCursor/EntityAddress/safe-point/epoch-CAS 成立**：三态只在 world 层、定义层
   缺席即禁用无 null 双编码；epoch 仅在有效 flow id 变化时递增、旧 invocation 持 lease 跑到
   safe-point 后 CAS 丢弃、新 flow 从 initial 起，保留 v4「改绑定后当前 body 继续」语义；
   保存 barrier 关 gate + 等 safe-point + 超时零写，不持久化 command index/call stack/wait
   phase，设计自洽。
  3. **作者可见内部块消除成立**：v5 AuthorCommand 排除 jumpScript/四种 binding mutation/
   clearSceneScripts/inline stages；callScript 只引作者共享脚本稳定 id、chunk 不进作者引用；
   lowering 产物带 compilerVersion+canonicalContentDigest、可删缓存、canonical/save/引用索引/
   MG2 均不引用；shared script 无持久 flow/cursor。
  4. **call/jump 与 auto 调度实证一致**：call 返回/stop 契约（script-runner.ts:395-417）与
   尾转移宏任务让步（:332）保留；兼容调度表逐项对账当前实现——paceMs=100 每节点（含
   branch/call 外壳，script-runner.ts:294,319-329）、段间 40ms（main.ts:2813）、hidden 轮询
   120ms（main.ts:2804）、authority move 150ms（main.ts:2577）、chase 丢步 200ms
   （main.ts:2591）、auto 并行/接管语义（main.ts:2569-2612）；trigger/hook 无 pace
   （script-runner.ts:292 注释）一致。「冻结为当前已拍板实现」 claim 属实。
  5. **版本裁决同意**：N3-1=contentVersion 5、SAVE_VERSION 4→5、A7-4 顺延 v6。版本号是
   顺序契约不是永久占位；两个高风险迁移不揉一个升级器；v3→v4 用专用 validateContentV4、
   envelope 纯链先行再 content transition、接受矩阵（5/5 直载、1..4/4 需链、5/4 与 1..4/5
   硬拒、minimumSaveVersion 前置）完整。A7-4 顺延必须按卡在 P1 accept 后同步五处文档。
  6. **R1/R2 落地核对**：identity transition ledger（rekey carry-atomic / 一等 group / 带证据
   tombstone）+ MG2 先整快照升级再三方合并 + lineage 对齐（唯一旧 state、stage digest+锚点
   /LCS）+ 冲突零写，满足 R1；v4→v5 工程/存档升级（preflight 异步链 + 隔离 clone normalize、
   entityStage 四域逐 index→FlowCursor 且 duplicate 独立 clamp 后 broadcast、
   sceneScriptOverrides 三态经 binding digest→HookId、嵌套 ScriptRef 全覆盖）满足 R2。
   PAL 事实抽验：294 场景（295 文件含 scenes/index.json）/4,944 实体/3,616 单页
   （maxPages=1）成立；s188 已入金丝雀。与 GLM 独立复核收敛于同一组现状缺口
   （MG2 无 remap、save 无 preflight、open-local 无 journal）。
  补正（不阻塞签字，P2 前修订 P1-8 文本即可；GLM G1 已冻结 trigger 计数）：
  - **P1-8 final=0 门禁枚举补全**：PAL 产物现存 192 处 `setEntityTriggerMode`（0x40 无脚本
   目标故 P0 未计，GLM 复跑同值）与 1 处 `clearSceneScripts`（P0 基线 clearCommands=1）；
   「final v5 四种 legacy mutation command=0」须显式枚举这两类（jumpScript=0 由 P3/P5
   结构化口径另行闸），否则「final v5 无 legacy mutation」验证不完整。
  - **schema 注释卫生**：`script.ts:364`「段间 1 tick 让步」与实现 40ms 不符；P7 落地时
   连同 100/40/120/150/200 兼容表一并修正注释，避免下轮误读。
- GLM: **agree（2026-07-15）**。save/MG2/ledger/升级事务/测试矩阵审查通过，附 G1-G5 必改项与一项
  数字微调（当时复跑为 trigger 200 vs 卡内 202，见「GLM P1 复审」；该临时数字已由
  2026-07-24 G1 三路复核更正为 202）。transition ledger 双投影、base/ours 完整升级 +
  Page/Stage lineage、SAVE/content 双轴 + 版本矩阵、两类事务 + write/delete journal、388/202/60/1 全命令覆盖
  逐项对账成立。
- counter / 分歧处理: 当前无 counter；Kimi agree 附两项 P1-8 补正、GLM agree 附数字微调与 G1-G5 必改项。任一方 counter 时 P1 留在设计冻结，无法收敛交用户拍板。
- P1 实现准入: **allowed（2026-07-24；Codex / Kimi / GLM 三方 P1 设计 agree 齐，无 counter；
  GLM G1-G5 与 Kimi 两项补正为实现验收核对待落项）**。

### GLM P1 复审（2026-07-15）

**方法**：只读审查，不改实现文件。逐项核对 P1-1..P1-8 冻结候选 + 独立复跑迁移产物核对全命令口径 +
读 migration-merge/save/ops/open-local/migration-transaction 源码逻辑。

#### 重点 1：transition ledger + compat sidecar + single/broadcast-v4 + tombstone/TransitionGroup ✅

**设计成立**：
- **双投影**（P1-7）：baseline 控制账 `_transitions/script-v4-v5.json`（MG2 重键/墓碑/审计）+ 工程兼容 sidecar
  `content/migrations/script-v4-v5-save.json`（旧存档 binding/cursor/entity aliases + target closure）。
  PAL 投影记录 `fullLedgerDigest`，普通工程记录 `transformDigest`。两套 digest 按"省略自身 digest 字段后的
  canonical bytes"计算——**确定性成立**。
- **IdentityOutcome 三态**（rekey / group / tombstone）：rekey 限 1→1 同型原子搬运；merge/split 走一等
  `TransitionGroup`（sources/targets 完整排序 + 双向相等）；tombstone 需 P0 证据 + 枚举 reason
  （folded-sprite-action / folded-hostile-behavior / pruned-unreachable / inlined-structured-flow）。
  **禁止多个 entry 碰巧共享 transformId 替代 group**——这是正确的去耦。
- **single/broadcast-v4**：LegacyEntityAlias / LegacyCursorAlias 都有 `single | broadcast-v4` 两态。
  `broadcast-v4.targets` 排序、非空、无重复；每个 target 按自己的 legacy stage 长度钳到 `[0,last]` 再查
  index alias——**忠实保持旧版各实体独立 clamp 后共享 raw key**。normalizer 逐目标复制旧值。
- **现状实证**：`migration-merge.ts:139-143 identity()` 用 `value.id` 字符串作 anchor——rename=删旧+加新，
  **证实 Kimi R1 发现**（MG2 无 rename/remap）。P1-7 的 transition ledger 是必要补充。

#### 重点 2：base/ours 完整升级 + Page/Stage lineage + 作者修改保护 + 冲突零写 ✅

**设计成立**：
- **完整 snapshot 预升级**（P1-7）：`upgradeSnapshotV4ToV5(base, ledger, basePlan)` +
  `upgradeSnapshotV4ToV5(ours, ledger, oursExtensionPlan)` 在三方 merge **之前**；theirs 已是 v5。
  不只重键 script bodies 后拿剩余 v4 与 v5 merge——**正确**。
- **Page lineage**：`LegacyPageLineagePlan` 用唯一旧 `state` 作迁移证据；pageIndex 永远指 baseline v4 位置，
  不拿 ours 当前下标匹配。证据冲突→作者指定→未解决零写。
- **Stage lineage**：`LegacyStageLineagePlan` 先用唯一 canonical stage digest 做 base↔ours 序列对齐，
  再用相邻锚点/LCS 收窄。重复等值 stage 无唯一证据→人工 resolution→零写。
- **baseCellSha256 完整旧 author cell**：不重叠投影（page shell 排除 trigger/auto stages；两个 flow channel
  各自只 hash 对应 channel）。`ScriptRef` 递归规范化只取稳定 `id`、忽略 `chunk`——**纯 rechunk 不误报**。
- **冲突零写**：transform 任一 source 被作者改→默认冲突；tombstone body/引用被改→`identity-tombstone-modify`；
  未登记删除/重复 source/stale hash/target missing/collision/chain cycle/group 少多成员→identity conflict→
  `writes=0/deletes=0`。

#### 重点 3：SAVE/content 双轴 + 5/5 无 sidecar + 版本矩阵 + minimumSaveVersion ✅

**设计成立**：
- **双轴顺序**：先 SAVE envelope `1→2→3→4` 纯链规范化保留 `payload.contentVersion` + legacy 字段；再按 manifest
  registry 从 contentVersion 到 v5 的每个 content transition（N3 sidecar 只负责 4→5）；成功后写
  `version=5/contentVersion=5` + current validator。**不先抬版本再补字段**。
- **5/5 空链**：`version=5/contentVersion=5` 的 current payload 空 transition chain，只跑 current-v5 validator；
  即使工程已删除历史 4→5 descriptor/sidecar 仍可加载——**正确**。
- **版本矩阵**：5 种组合全覆盖（5/5/5 直接 / 1..4/4/5 完整链 / 5/4/5 拒 / 1..4/5/5 拒 / 任意 version<minimumSaveVersion
  在 sidecar IO 前拒）。
- **minimumSaveVersion 硬闸**：`payload.version < manifest.minimumSaveVersion` 在读取 sidecar 前即拒绝——
  **正确**，防止旧档绕过。
- **现状实证**：`save/ops.ts:69 normalizePayload` 当前同步、不 preflight、不读 transition chain、
  `version` 直接设为 `SAVE_VERSION`——**证实 P1 两段式（preflight + normalize(resolver)）是必要补充**。

#### 重点 4：两类事务 + write/delete journal + 幂等前滚 ✅

**设计成立**：
- **两类事务隔离**：普通 open-local 只写 `canonical + project sidecar + manifest`（`.type-pal/journals/`）；
  PAL MG2/P7 写 `project target + full ledger + project sidecar + repo baseline + manifest`
  （`packages/migrate/...transactions/`）。**两套 journal type/path/recovery 入口互不接受**——正确。
- **write/delete journal**：`{op:'write',target,oldSha256?,stagedPath,newSha256}` 和
  `{op:'delete',target,oldSha256}` 判别联合。new bytes 先写 staging + fsync + hash 复验→发布 journal→
  幂等 write/delete target→manifest 最后。
- **幂等前滚**：write 的 apply 规则唯一（target 已等于 newSha256→完成；否则 oldSha256 匹配→写；缺席→预期不存在）；
  delete 执行前核对 old digest（已不存在=完成；内容不同=硬拒保留 journal）。恢复从 staged bytes 前滚。
- **"只能前滚"诚实**：不保存旧正文、不宣称自动回滚；mixed 态无 journal→硬拒；recovery 后只全新。
- **现状实证**：`migration-transaction.ts` PAL MG2 已有 journal+staging+fsync+recovery；
  `open-local.ts` 当前无 journal（顺序 upgradeLocalProject* + 逐次重读 manifest）——**证实
  LocalProjectMigrationJournalV1 是必要补充**。

#### 重点 5：全命令覆盖 388 auto + 200 trigger + 60 onEnter + 1 onTeleport vs 342/198 子口径 ✅（附数字微调）

**GLM 独立复跑**（全内容 walk，所有嵌套层）：

| 命令 kind | 卡内 P4 口径 | GLM 全内容复跑 | P0 stored-body ref | 差异 |
|---|---:|---:|---:|---|
| setEntityAuto | 388 | **388** ✅ | 342 | 46 inline stages（非 ScriptRef） |
| setEntityTrigger | **202** | **200** ⚠️ | 198 | 2 inline stages |
| setSceneOnEnter | 60 | **60** ✅ | 60 | — |
| setSceneOnTeleport | 1 | **1** ✅ | 1 | — |

**数字微调**：卡内 P4 口径 `202 trigger` 与 GLM 复跑 `200` 有 2 处差异。GLM 额外核对了 `clearSceneScripts`(1)
和 `setEntityTriggerMode`(192)——`200+1=201≠202`、`200+192=392≠202`，2 的差异无法用这两种命令解释。
**G1 必落**：P4 批次用 P0 审计的精确计数冻结最终 trigger 值（200 或修订）；不阻塞 P1 冻结。

**子口径对账**：388 auto = 342 stored-body ScriptRef + 46 inline stages；200 trigger = 198 stored-body + 2 inline。
**inline stages 差额（46+2=48）是 P4 必须额外迁移的**——它们当前不走 ScriptRef 但仍是动态绑定。
卡内 P4 "按全部 command site 迁移" 正确覆盖了 inline + ref 两类。

#### G1 最终数字裁决（2026-07-24）

上述 `200` 是 GLM 签字时的历史复跑结果，保留用于解释审查过程，但**不再是现行冻结合同**。
Codex 在 P2 开工前按 G1 做了三路独立复核：纯 `buildPalMigration` 内存产物递归 AST、
`projects/pal/content/**/*.json` 递归 AST、`rg` 词法计数，三路一致为：

| 命令 kind | 最终全命令口径 |
|---|---:|
| `setEntityAuto` | 388 |
| `setEntityTrigger` | **202** |
| `setSceneOnEnter` | 60 |
| `setSceneOnTeleport` | 1 |
| `setEntityTriggerMode` | 192 |
| `clearSceneScripts` | 1 |
| **合计** | **844** |

`setEntityTrigger` 的精确守恒为 **198 个 stored-body ScriptRef + 3 个 stored-body inline
`stages: []` + 1 个 `content/scenes/s018.json#/onEnter/0/entry/prepare/0` 外部场景直连 = 202**。
三个 inline 点分别位于 s011 的 `scene/s011/root/entity-e195/page-0/trigger/stage-0`、
s014 的 `scene/s014/L-4267/e201/d-0a386828` 与
`scene/s014/L-5045/e201/d-0a386828`。历史 `200` 混用了 198 的引用子口径，漏计一个
inline 点和 scripts/chunks 外的 s018 直连。P2 同时结构化 s018 时必须验证
`202 input = 201 pending legacy + 1 transitioned`，P4/P6 最终再归零。

#### GLM P1 必改项（G，实现验收核对）

- **G1 trigger 数字冻结（已完成）**：最终值为 202；46 auto + 3 trigger inline stages及
  1 个 s018 外部 scene-direct binding 必须纳入迁移覆盖。
- **G2 save preflight 懒加载边界**：`preflightSaveMigration` 只懒加载 alias 涉及 scene/entity/hook closure；
  必须验证**不强制预载 294 个场景**——若 alias 涉及大量 scene 仍可能内存压力大，实现时需测试 worst-case。
- **G3 identityDigest 稳定性边界**：`targetClosures.identityDigest` 只覆盖 alias + allocation + cursor 实际引用的
  id 集；**添加 stage、改正文/next 不会使 sidecar stale**——但实现时需测试"作者在 v5 工程中加 stage 后旧 v4 存档
  仍能 normalize"（因 sidecar 不含新 stage 的 cursor alias，旧档不会指向它，应安全）。
- **G4 s188 三层引用 hook 金丝雀**：P1-6 提到"s188 三层引用 hook"但 P1-8 测试矩阵的 MG2 integration 列了
  e2493/e2495/s018/s188——s188 的三层引用结构需在 P4/P6 实测验证"只替换顶层 ScriptRef 不足"。
- **G5 ours cursor alias 按 ours 顺序生成**：P1-7 "最终 project legacyCursors 必须从 ours v4 最终顺序 + lineage
  逐 index 生成，不能复制 baseline positional cursor alias"——这是正确性关键，MG2 测试必须覆盖
  "ours 在 baseline 基础上插入/删除 Page 后旧存档 cursor 仍落到同一语义 stage"。

#### 结论

**GLM P1 agree**。transition ledger 双投影、base/ours 完整升级 + Page/Stage lineage、SAVE/content 双轴 +
版本矩阵、两类事务 + write/delete journal 的设计逐项对账成立。trigger 200 vs 202
微调不阻塞冻结；G1 已于 2026-07-24 以 202 收口。MG2 无 rename/remap + save 无 preflight + open-local 无 journal 三个现状
缺口已由 P1 设计候选精确补上。等待 Kimi P1 架构/schema/runtime/compiler 审查；两方 agree 后准入实现。

> 历史状态注记：Kimi 已于 2026-07-24 签 P1 `agree`，三方 P1 设计签字已齐，P1 实现准入已
> 转为 `allowed`；上句仅保留 GLM 当时的交接事实。

## 用户验收

- 用户结论: pending（等待验收 `9010465b` P7-R6 可复用脚本创建弹窗）
- 后续任务: 本卡完成后先解锁并回归验收 `C8-item-use-mechanisms.md` 与
  `ED-5I-item-workbench.md`。

## 交接日志

- 2026-07-23 Codex: 根据用户对内部脚本、私有块与 e2493/e2495 换触发脚本的质疑，以及两轮
  只读图审计，建立高风险现代化任务卡。Evidence: 本卡“现状统计”和代码锚点。Next: Codex、
  Kimi、GLM 分别完成设计签字；签字齐前不得实现。
- 2026-07-23 Codex: 完成设计复核并签 `agree`。Evidence: 本卡目标模型、分批策略、验收条件与
  风险门禁。Next: 等待 Kimi / GLM 设计审查；build 仍 blocked。
- 2026-07-15 GLM: 覆盖/迁移/审计/测试矩阵设计审查签 **agree**。独立复跑 `buildPalMigration(sources)`：
  11,447 bodies（顶层一致）、13 shared/scc-*、6 shared/user/* 作者根、5,935 场景根外部绑定全部逐项对账成立；
  e2493/e2495（s154，trigger 多段 callScript 存储壳）金丝雀用例确认；sccFor 命名机制确认（migrate-content.ts:1885-1889）。
  **口径差异**：可达性 GLM 7,932 vs 卡 8,102（GLM BFS 未覆盖 author/item/skill/dynamic 入口）；
  callScript GLM 6,515 callSite vs 卡 675（口径定义不同）——G1 要求 P0 入仓审计冻结同口径。
  **关键风险**：main.ts:1950-1979 setEntityAuto/setEntityTrigger 直接 mutate pages[0]，不进 world state 持久层
  ——G4 要求 P1 给出存档升级方案。G1-G7 必落项见「GLM 数据审查」。Evidence: 签字区 GLM 行 + GLM 数据审查节。
  Next: Kimi 架构/schema/公共接口审查；**三签未齐不得改实现**。未改实现文件。
- 2026-07-23 Kimi: 架构/schema/存档/MG2 设计主审完成，签 **agree**（R1-R5 build 必落钉）。
  独立只读核对：实体具名行为槽方向成立（main.ts:1950-1979 mutate 活体 pages[0] +
  script.ts:205-206 自认"暂不持久"= 本卡要补的 deferred 设计）；call/jump 语义差异实证
  （script-runner.ts:395-417 vs :757-760）；e2493/e2495 根因实证（translate-events.ts:1432-1466）；
  卡内数字勾稽自洽。两个真实缺口升为必落钉：**R1** MG2 无 rename/remap（migration-merge.ts
  身份锚=script id 字符串、body 原子），P1 必须交付旧 id→新身份映射产物（含墓碑）并由 MG2
  消费；**R2** contentVersion v4→v5 升级器链 + SAVE_VERSION 策略显式裁定（旧档无实体 mutate
  持久态=新增持久层按 ??= 缺省；sceneScriptOverrides 的 ScriptRef 旧值凭 R1 映射迁移、缺失
  fail-loud）；**R3** 槽/page/entityStage 唯一状态权威、槽身份去 d-<hash>、段索引按槽作用域；
  **R4** call-vs-jump 与 auto 节拍语义保持证据（锚点化 G7）；**R5** P0 审计逐 body 字段
  （address-0/0x6D 上下文/d-hash 入口态/源 CFG vs 产物口径，补充 G1）。三签齐（Codex+GLM+Kimi，
  2026-07-23），build 准入结论已更新为 allowed。Evidence: 本卡签字区、主审立场、争议记录。
  Next: Codex 接手翻 Status=build，从 P0（审计入仓与基线冻结）开始；R1-R5 + G1-G7 为 build
  必落钉。未改实现文件。
- 2026-07-23 Codex: 核对三方设计签字均为 `agree`、无 counter，接任 Coding Owner 并将任务
  转为 `build`。接受 R1-R5 + G1-G7；先执行 P0 只读审计入仓与口径冻结，不提前修改 schema、
  save、runtime 或生成产物。
- 2026-07-23 Codex: 完成 P0 审计入仓与机器基线。Evidence: `script-control-flow-audit.ts`、
  `pal-v1.json`、PAL golden；冻结 43,503 source commands / 11,447 product bodies /
  8,102 reachable / 3,345 folded-unreachable，issues=0，61/61 场景 hook 精确溯源，
  migrate 全量测试通过。Next: Kimi 复审 R5/控制流口径与 provenance 安全性，
  GLM 复审 G1-G3/覆盖与基线；P0 review accept 后再进入 P1 schema/save/MG2 设计冻结，
  不得直接开始 P1 实现。
- 2026-07-15 GLM: P0 复审签 **accept**。只读审查不改实现：独立复跑 `audit:script-control-flow` CLI
  + PAL golden（2 tests passed，含 Map 逆序确定性）+ audit test（10 passed）+ migrate 全包（40/295+1skip）。
  G1（口径冻结+折叠守恒）：countingRules 8 个口径定义文档化，GLM 设计阶段 675 vs 6,515 / 7,932 vs 8,102
  差异由入口分类（productEntrySites 5,942 场景根 vs productReferenceSites 3,857 body 内引用）+ rootTargets
  覆盖（entries+library）消解；折叠守恒 863+2482+0+0=3345=unreachable。G2（s018）：canary 精确定位 1 条
  scene-direct-binding → scene/s015/L-4211/e204（跨场景内部绑定），债务记录。G3（13 scc）：全部
  productCyclic=false AND sourceCyclic=false，命名错误根因确认（sccFor 用 SCC 首地址命名无环 body）。
  baseline digest 字节锁定。无 counter/rework。Evidence: Review 节 GLM P0 复审。
  Next: **Kimi P0 复审 pending（R5/provenance/控制流口径）**；两方 P0 accept 后进入 P1。未改实现文件。
- 2026-07-23 Codex 内部红队: 首轮提出两个 blocker——overlay provenance 丢失后使用全源目标
  反推会误配、entity inline stages 未传播 deferred 会制造伪 SCC。Codex 修复上游深克隆证据
  转交、删除反推、覆盖四类 binding 并补合成测试；返工后只读复审 `ACCEPT`。Evidence:
  11,447 body 来源非空、61 hook 与 87 override 上下文完整、2 files / 12 targeted tests pass、
  eventsByScene 逆序字节一致。Next: 仍须 Kimi / GLM 按任务卡提示词完成 P0 独立复审。
- 2026-07-23 Kimi: P0 架构/实现独立复审完成，签 **P0 accept**。通读 audit 全 1,802 行 +
  四个迁移文件 diff；独立复跑 audit `--check`（digest `97d3a22a…61bdbc` 复现、issues=0）、
  迁移 dry-run（writes=0/deletes=0/conflicts=0，canonical 零漂移）、审计测试 12/12、migrate
  全量 40 files / 295 passed / 1 skipped；pal-v1.json 金丝雀逐项抽验（s018/e2493/e2495/6 作者根
  bridgeOnly/13 scc 双口径非 cyclic/sharedSccTails=2/多入口对话态 12 基）；0x04→trigger 与
  auto 0x06 自环对照 sdlpal script.c:3257/3565/3570 忠实。R5 逐 body provenance、三套
  SCC/deferred 口径、0x6D 四重约束、overlay WeakMap 证据转交、digest 覆盖证据输入全部成立，
  无 blocking 项。Evidence: 本卡 Review「Kimi P0 复审」节。Next: P0 两席 accept 已齐
  （GLM 2026-07-15 + Kimi 2026-07-23）；Codex 可启动 P1，但 P1 必须先冻结 schema/save/MG2
  设计（R1-R3 为冻结验收钉）再写实现。未改实现文件。
- 2026-07-24 Codex: 用户确认 P0 三签齐；复核 GLM/Kimi 均为 P0 `accept`、无返工，正式关闭
  P0 门禁。完成 P1 只读现状审计与冻结候选：Page 演进为具名 mode，实体行为按 scene/entity
  定位，world 为唯一活动槽/cursor 权威，场景 hook 只存稳定 id；补 transition ledger、
  inline binding/cursor save resolver、MG2 预重键和 fail-loud 矩阵。发现并显式提出版本裁决
  N3-1=v5 / A7-4=v6。Evidence: 本卡「P1: schema / save / MG2 设计冻结」。Next: Kimi /
  GLM 分别签 P1 设计 `agree` 或 `counter`；签字齐前不得开始 P1 实现。未改实现文件。
- 2026-07-24 Codex: 对 P1 冻结候选做三路只读内部红队并完成返工。补齐 Page/slot/hook 三态、
  stable FlowCursor、复合 EntityAddress、self 契约、SceneEntryPresentation 相位、
  safe-point/epoch-CAS、全命令计数门禁、duplicate broadcast、current 5/5 版本矩阵、
  Page/stage lineage、ours cursor alias、write/delete journal 与崩溃矩阵；内部架构红队
  /schema 语义/迁移一致性三路最终均 `ACCEPT`。该结论只证明候选已可送审，不替代 Kimi/GLM
  P1 签字。Evidence: P1-2..P1-8。
  Next: Kimi / GLM 按下方提示词独立复审；两席 P1 `agree` 前不得开始实现。未改实现文件。
- 2026-07-15 GLM: P1 save/MG2/ledger/升级事务/测试矩阵设计复审签 **agree**。只读审查不改实现：
  逐项核对 P1-1..P1-8 + 独立复跑全命令口径（388 auto + **200 trigger** vs 卡内 202 微调 + 60 onEnter +
  1 onTeleport = 649 dynamic bindings；342/198 stored-body ref 子口径，48 inline stages 差额已解释）+
  读 migration-merge.ts:139-143（identity=value.id，证实 MG2 无 rename/remap）、save/ops.ts:69
  （同步 normalizePayload 无 preflight）、open-local.ts（顺序升级无 journal）、migration-transaction.ts
  （PAL MG2 已有 journal+staging+fsync）。
  重点 5 项全部对账：①transition ledger 双投影+IdentityOutcome 三态+single/broadcast-v4+tombstone/Group；
  ②base/ours 完整 snapshot 预升级+Page/Stage lineage+冲突零写；③SAVE/content 双轴+5/5 空链+版本矩阵+
  minimumSaveVersion 硬闸；④两类事务隔离+write/delete journal+幂等前滚；⑤全命令覆盖+子口径对账。
  G1-G5 必改项（trigger 数字冻结/save preflight 懒加载/identityDigest 稳定性/s188 金丝雀/ours cursor alias）
  见「GLM P1 复审」。无 counter/rework。Evidence: P1 设计推进签字 GLM 行 + GLM P1 复审节。
  Next: **Kimi P1 架构/schema/runtime/compiler 审查 pending**；两方 agree 后准入实现。未改实现文件。
- 2026-07-24 Kimi: P1 架构/schema/runtime/compiler/版本裁决独立复审完成，签 **agree**
  （附两项 P1-8 补正，非阻塞）。逐项压测：①唯一状态权威（R3）成立——Page=具名 mode 只组合
  槽引用、id 显式分配禁推导、world 解析顺序与 Page 原子事务封闭、cursor 带 BehaviorId guard
  使跨槽段号串扰结构性不可能、v4 `state` 选页实证为死 schema（运行时五处只消费 pages[0]）；
  ②三态/FlowCursor/EntityAddress/safe-point/epoch-CAS 自洽——epoch 仅在有效 flow id 变化时
  递增、旧 invocation 持 lease 到 safe-point 后 CAS 丢弃，保留 v4「改绑定后当前 body 继续」；
  ③作者可见内部块消除——v5 排除 jumpScript/四种 binding mutation/clearSceneScripts/inline
  stages，lowering 产物带 compilerVersion+canonicalContentDigest 且 canonical/save/引用索引/
  MG2 均不引用；④auto 调度表逐项对账当前实现属实——paceMs=100 每节点含 branch/call 外壳
  （script-runner.ts:294,319-329）、段间 40ms（main.ts:2813）、hidden 120ms（main.ts:2804）、
  authority 150ms（main.ts:2577）、chase 200ms（main.ts:2591）、trigger/hook 无 pace
  （script-runner.ts:292）；⑤版本裁决同意 N3-1=v5/SAVE 5/A7-4 顺延 v6——接受矩阵完整、
  envelope 纯链先行、v3→v4 专用 validateContentV4；⑥R1/R2 落地核对——ledger 三态 outcome +
  MG2 整快照预升级 + lineage 对齐 + 冲突零写满足 R1，preflight 异步链 + entityStage 四域
  逐 index→FlowCursor + sceneScriptOverrides 三态经 binding digest→HookId 满足 R2。PAL 抽验：
  294 场景/4,944 实体/3,616 单页成立。两项补正（P2 前修订 P1-8 文本）：final=0 门禁显式枚举
  192 处 setEntityTriggerMode + 1 处 clearSceneScripts；P7 修正 script.ts:364「段间 1 tick」
  注释与实现 40ms 不符。与 GLM 独立复核收敛于同一组现状缺口。Evidence: P1 设计推进签字
  Kimi 行。Next: 三方 P1 设计 agree 齐（2026-07-24），P1 实现准入已更新为 allowed；Codex
  可按 P2 开始实现，GLM G1-G5 与 Kimi 两项补正为实现验收核对待落项。未改实现文件。
- 2026-07-24 Codex: P2 开工前完成 G1 最终计数裁决。纯迁移内存 AST、项目 JSON AST 与
  词法计数三路一致：388 auto / **202 trigger** / 60 onEnter / 1 onTeleport /
  192 triggerMode / 1 clearSceneScripts；trigger 精确分解为 198 stored-body ScriptRef +
  3 stored-body inline + 1 s018 scene-direct。历史 GLM 200 结论作为审查过程保留，但现行
  P2/P4 合同统一为 202；P2 必须验证 `202 = 201 legacy pending + 1 s018 transitioned`。
- 2026-07-24 Codex: 完成 P2 shadow-only 实现并签阶段 `accept`。构建 8,102 retained +
  3,345 evidence tombstone、3,347 ledger entries 与 s018 一等 TransitionGroup；完整影子
  target 保留 842 个真实 merged v4 文件和作者 `content/locale.json` 改动。PAL 8 tests、
  migrate 44 files / 333 passed + 1 skipped、P0 audit、Biome、typecheck、transaction writer
  与固定根双跑 `0/0/0` 均通过。Evidence: 本卡「P2 影子迁移实现与自测」和
  `packages/migrate/.shadow/N3-1/v5/p2/`。Next: Kimi / GLM 独立只读审查并在 P2 阶段表签
  `accept` 或 `counter`；两席 accept 前不得进入 P3。
- 2026-07-15 GLM: P2 数据守恒/ledger/evidence/测试矩阵复审签 **accept**。只读审查不改实现：
  独立复跑 `buildP2ScriptMigrationIR` + `migrate:script-v5:shadow --check`（853/0/0 → 0/0/0）+
  PAL golden（8 tests）+ 全 migrate（44/333+1skip）+ P0 audit `--check`（digest 不变）。
  5 项重点逐项对账：①11,447=8,102+3,345 / 3,345=863+2,482（p2-transform.ts:451-467 从 P0 folded
  set 精确切分）；②ledger 3,347 entries+1 group+3,346 evidence+8,101 pending（entries 互不重叠、
  evidence 完整）；③844=388+202+192+60+1+1 / trigger 202=201+1s018（**P1 G1 trigger 200 vs 202
  微调已消解——正确值 202**，P2 commandSiteInventory 递归扫 body 内嵌套命令比 GLM P1 手动 walk 多 2 个）；
  ④13 scc 全部 activeRefId 以 ir/p2/pending/ 开头（active identity 退役）+ 全部 retained 不含
  shared/scc- active ref + 全部 13 个 legacy id 仍在 retained（未误删）+ owner 分类 6+2+4+1=13；
  ⑤validate-ir.ts 从 corpus 独立重算（sourceSnapshotSha256/commandCensus/commandSites 逐项重算 +
  reverseP2ScriptRefs 零语义变化 + visitScriptRefs 零悬空 + digest 自验）。
  Evidence: P2 阶段表 GLM 行 + GLM P2 复审节。Next: **Kimi P2 审查 pending**（架构边界/transition
  relationship/MG2 作者保护/writer 安全）；三方 accept 后准入 P3。未改实现文件。
- 2026-07-24 Kimi: P2 架构/MG2 作者保护/写入安全独立复审完成，签 **accept**。通读
  experimental/script-v5 全部实现（p2-transform/p2-transition-plan/source-v4/validate-ir/
  shadow-writer/shadow-harness/CLI）与 8 条 PAL golden；独立复跑 shadow `--check`
  （853 artifacts、second `0/0/0`、bundle digest `e80638f0…a243bc` 复现）、experimental
  38/38、P0 audit `--check` 一致、迁移 dry-run `0/0/0`（v4 generator 零漂移）。五焦点全部
  成立：①shadow-only 边界 + 完整 842 文件 author-preserving merged v4 层（locale.json 作者
  字节保留，canonical=false/runtimeConsumable=false）；②守恒 11,447=8,102+3,345、s018
  一等组（body+installer 双 source、conflict-if-modified）、validate-ir 独立重算 +
  reverseP2ScriptRefs 零语义变化 + 零悬空 + 零 misleading；③作者修改 tombstone/group/
  installer 与新增入站引用全部冲突且零写（chunk-only 不误判）；④rechunk 不敏感 cell hash、
  target-ledger 关系重推防篡改（重算自摘要攻击仍零写）、bundle manifest 闭包；⑤writer
  路径/symlink/锁/plan 防伪造/staging 验证/备份恢复/双跑零计划。可接受余项（不阻塞）：
  崩溃残留 lock/backup 手工清理、staging 无 fsync（可重建影子根）。Evidence: P2 阶段表
  Kimi 行 + 「Kimi P2 复审」节。Next: P2 三席 accept 齐（2026-07-24），P2→P3 准入
  allowed；Codex 可按 P3（无环控制流结构化）继续，仍受 P1-1 影子纪律与 P1-8 矩阵约束，
  P3 完成后同样需三方批次审查。未改实现文件。
- 2026-07-24 Codex: 用户确认 P2 三签齐；复核 Codex / Kimi / GLM 均为 `accept`、无
  `counter`，正式关闭 P2 门禁并将看板下一步切到 P3。按用户要求从本批开始在每个功能批次
  门禁与验证完成后立即做独立 git 提交，避免跨功能长期堆积未提交改动。Evidence: 本卡
  「P2 阶段审查推进签字」与 P2 全套自测。Next: 先提交 P0-P2 已验收实现，再由 Codex 按
  下方提示词开始 P3；P3 审查三签齐前不得进入 P4。
- 2026-07-24 Codex: 完成 P3 shadow-only 无环控制流结构化并签阶段 `accept`。1,715 candidates
  精确分类为 579 unique tail + 20 same-caller diamond + 622 call + 455 binding +
  38 cross-caller join + 1 mixed；吸收 599 bodies、改写 655 jump cells，8,102/8,102 可逆，
  call change/dangling/context/size violation/P3 pending 均为 0。累计 ledger 4,601 entries /
  600 groups，v4→P3 plan 657/3,945/0、repeat 0/0/0；migrate 46 files / 343 passed +
  1 skipped，CLI `--through p3 --check` 854 artifacts / second 0/0/0。Evidence: 本卡
  「P3 无环控制流影子实现与自测」、P3 PAL golden 与
  `packages/migrate/.shadow/N3-1/v5/p3/`。Next: Kimi / GLM 独立只读审查并在 P3 阶段表签
  `accept` 或 `counter`；两席 accept 前不得进入 P4。未改 canonical/runtime/editor/project/
  baseline。
- 2026-07-24 User: Kimi 额度耗尽，批准 P3 批次 Kimi 缺签豁免；原 Kimi 架构/控制流语义
  审查与原 GLM 数据/覆盖审查合并交给 GLM 一次完成。GLM 是唯一剩余独立审查门禁：
  `accept` 后 P3 → P4 allowed，`counter` 则留在 P3 返工。Kimi 恢复额度后补审；若 N3-1
  最终验收时仍未补签，再请用户决定是否延续豁免。未授权开始 P4 或标记 N3-1/C8/ED-5I done。
- 2026-07-24 GLM: P3 架构 + 数据合并代审签 **accept**。只读审查不改实现：读 p3-control-flow.ts /
  p3-validate.ts / p3-transition-plan.ts 全部源码 + 独立复跑 `migrate:script-v5:shadow --through p3 --check`
  （854 artifacts / 0/0/0）+ P3 PAL golden + 全 migrate（46/343+1skip）+ P0 audit `--check`（digest 不变）+
  script-runner.ts call/jump/pace 语义。
  9 项重点逐项对账：①579 tail-inline（单 caller 尾转移→n3P3FlowExit macroTask/0ms/terminate）+
  20 branch-switch-join（同 caller conditional arm→共享 continuation 不复制）；②n3P3FlowExit 严格隔离
  shadow（canonical=false/runtimeConsumable=false、不在 AuthorCommand 联合）；③622 call/455 binding/
  38 cross-caller/1 mixed P4 deferred 分类完整；④599 atomic group conflict-if-modified + 9 dependsOn +
  作者修改/删除/新增引用零写冲突；⑤1,715=579+20+622+455+38+1 / 599 bodies / 655 sites /
  8,102=7,503+599 可逆 / P3:0 P4:7,055 P5:433 P6:14；⑥dialogue+self+RNG+pendingAuto+conditional-arm
  全覆盖（599/599 通过）；⑦AST 318/512 + target 2,354/65,536 + chunk 313,528/1,048,576 violations=0；
  ⑧ledger 4,601+600+3,945 / 首跑 657/3,945/0 重复 0/0/0 / fail-loud 反例（作者修改/新增引用/rechunk/
  篡改）；⑨validateP3ScriptMigrationIR 从 corpus 重算（reverseP3Body 零语义变化 + 零悬空 +
  callSitesChanged=0）。
  Evidence: P3 签字表 GLM 行 + GLM P3 合并代审节。Next: **P3→P4 allowed**；Codex 可启动 P4；
  Kimi 额度恢复后补审 P3 架构（不阻塞）。未改实现文件。
- 2026-07-24 User: 确认 GLM P3 已审完，并补充两项产品方向。其一，共享脚本按真正跨调用方
  复用判断，不能因逻辑复杂就归 shared；268 `craftRecipe` 与 270
  `drawFromResourcePool` 已回归物品领域模型，不得退回共享脚本，剩余 item `runScript`
  在 P6 优先评估领域结构化。其二，脚本蓝图/节点连线视图进入
  `docs/phase2/design-backlog.md` 议题 17，待 N3-1 P7 后另开卡，不阻塞本任务。
- 2026-07-24 Codex: 完成 P4 shadow-only 实体/场景具名行为分配并签阶段 **accept**。
  显式分配 3,616 Page、4,300 EntityBehavior、284 SceneHook、6,502 stage；7,055 个 P4
  candidate 收口为 7,039 owner fragment + 17 个 `p4-cross-owner-reuse` 转 P6，零复制；
  844 个 legacy selection site 全部改写，pending 为 P4:0/P5:433/P6:31。累计 ledger
  16,325 entries / 5,220 groups / 8,565 evidence，v4→P4 plan 5,343/10,983/0、
  repeat 0/0/0；根 `pnpm check` 通过（migrate 48 files / 354 passed + 1 skipped，
  Biome 875 files）。Evidence:「P4 实体/场景具名行为影子实现与自测」及
  `packages/migrate/.shadow/N3-1/v5/p4/`。Next: GLM 按下方提示词做一次架构 + 数据合并
  只读代审并签 `accept` 或 `counter`；P4 accept 前不得进入 P5。未改 canonical/runtime/
  editor/project/baseline。
- 2026-07-25 GLM: P4 架构 + 数据合并代审签 **accept**。只读审查不改实现：读 p4-owner-allocation.ts /
  p4-validate.ts / p4-transition-plan.ts 全部源码 + 独立复跑 `migrate:script-v5:shadow --through p4 --check`
  （854 artifacts / 0/0/0）+ P4 PAL golden + 全 migrate（48/354+1skip）+ P0 audit `--check`（digest 不变）。
  7 项重点逐项对账：①shadow-only + ID 全显式分配（default/legacy-###/enter-s018，不含地址/hash/chunk）；
  ②3,616 Page + 4,300 behavior(2834+987+172+307) + 284 hook(160+67+56+1) + 6,502 stage(5664+479+271+88)
  可从 PAL 真源重算（ownerCensus isDeepStrictEqual 硬断言）；③7,055→7,039 fragment + 17 cross-owner
  零复制转 P6（P6:14→31）；④844 rewrite(590 selectEntityBehavior+192 setEntityTriggerActivation+62 selectSceneHooks)
  legacy selection command 在 ownerFragments=0；⑤268 craftRecipe+270 drawFromResourcePool 未退 shared；
  ⑥ledger 16,325 entries+5,220 groups+8,565 evidence / 首跑 5,343/10,983/0 重复 0/0/0；⑦作者修改/新增引用/
  owner 漂移/ledger 篡改冲突零写 + rechunk 不误报。8,102 守恒（7039+599+464）。
  Evidence: P4 签字表 GLM 行 + GLM P4 合并代审节。Next: **P4→P5 allowed**；Codex 可启动 P5。
  Kimi 额度恢复后补审 P4 owner identity 分层（不阻塞）。未改实现文件。
- 2026-07-25 Codex: 核验 GLM P4 签字、独立复跑证据与交接记录完整，无 `counter/rework`；
  正式关闭 P4 内部门禁并把看板下一步切到 P5。P3/P4 的 Kimi 补审债务继续保留，但按用户豁免
  不阻塞本批。Next: 先独立提交 P4 审查记录，再按下方提示词实现 P5；P5 GLM 合并代审
  `accept` 前不得进入 P6。
- 2026-07-25 Codex: 完成 P5 shadow-only 循环与状态机恢复并签阶段 **accept**。
  331 个 component / 433 个 body 精确分类为 99 auto-runner repeat + 162 structured loop +
  70 named state machine / 172 states；753 个 cycle-body transfer 显式分配为
  230 body-end + 522 condition + 1 command-outcome author transition；1,297 个 legacy jump
  site 中改写 1,286，694 个 SCC 回边全部经过可取消 `worldTick` yield，11 个 synthetic
  target 留 P6。3 个跨 owner cycle
  零复制，`confirm.onNo` 内嵌 outcome transition 保留，8,102/8,102 可逆。累计 ledger
  17,291 entries / 5,620 groups / 8,965 evidence / 31 pending，v4→P5 plan
  6,207/11,416/0、repeat 0/0/0；migrate 50 files / 364 passed + 1 skipped，P5 shadow
  `--check` 854 artifacts / second 0/0/0 / digest `e6cf5374…6dd0d2`。Evidence:
  「P5 循环与状态机影子实现与自测」及
  `packages/migrate/.shadow/N3-1/v5/p5/`。Next: GLM 按下方提示词做一次架构 + 数据合并
  只读代审并签 `accept` 或 `counter`；P5 accept 前不得进入 P6。未改 canonical/runtime/
  editor/project/baseline。仓库根 `pnpm check` 随后通过：7 个 workspace package 全绿，
  migrate 50 files / 364 passed + 1 skipped，Biome 880 files。
- 2026-07-25 GLM: P5 架构 + 数据合并代审签 **accept**。只读审查不改实现：读 p5-cycle-structure.ts /
  p5-validate.ts / p5-transition-plan.ts 全部源码 + 独立复跑 `migrate:script-v5:shadow --through p5 --check`
  （854 artifacts / 0/0/0, digest `e6cf5374…` 匹配）+ P5 PAL golden 隔离 6/6 + typecheck + P0 audit。
  6 项重点逐项对账：①331 components/433 bodies（275+10+46 size / 99 auto+162 loop+70 SM/172 states / 3 cross-owner
  零复制 / bodyCopies=0）；②753 transitions（230 body-end+522 condition+1 confirm:no，全 `legacy-transition-###`
  稳定 ID）；③1286 rewrite/694 worldTick 回边/11 deferred P6（input 1297=1286+11）；④confirm:onNo 1 个
  command-outcome transition 为 P7 提供充分落点（from+trigger+target+scheduling 完整）；⑤3 cross-owner
  零复制/8102 可逆/pending P5:0 P6:31；⑥ledger 17,291+5,620+8,965 / 首跑 6,207/11,416/0 重复 0/0/0 /
  冲突零写/rechunk 不误报。
  **flaky timeout**：全量并行测试 P5 PAL test 5 超时（120s），隔离 78.6s 通过；建议 Codex 提 timeout 到 180s。
  Evidence: P5 签字表 GLM 行 + GLM P5 合并代审节。Next: **P5→P6 allowed**；Codex 可启动 P6。
  Kimi 额度恢复后补审 P5 cycle 分类语义（不阻塞）。未改实现文件。
- 2026-07-25 Codex: 核验 GLM P5 签字、独立复跑证据与交接记录完整，无 `counter/rework`；
  正式关闭 P5 内部门禁并把看板下一步切到 P6。采纳非阻塞建议，将 P5 PAL
  “author cycle-body modifications”用例及其 fixture timeout 从 120 秒提高到 180 秒；
  隔离复跑 1 passed / 5 skipped，目标用例 76.8 秒、总计 102.93 秒。只调整并发预算，
  不改断言或实现语义。P3/P4/P5 的 Kimi 补审债务继续保留，但按用户豁免
  不阻塞本批。Next: 先独立提交 P5 审查记录与测试稳定化，再按下方提示词实现 P6；P6 GLM
  合并代审 `accept` 前不得进入 P7。
- 2026-07-25 Codex: 完成 P6 shadow-only 共享脚本收口与旧模型退役并签阶段 **accept**。
  532 个 shared tail 精确分类为 433 cycle + 80 named owner + 17 owner-local + 2 item-private，
  真正共享作者脚本为 0；574 个局部调用、6 个 item bridge 与 11 个 legacy jump 全部从 active
  author output 退役。21 个 source body 分配为 42 个 owner-local flow（21 additional copy）；
  265/266/267/280/290/293 按用户裁决成为六个 item-private `use` 脚本，268/270 维持
  `craftRecipe` / `drawFromResourcePool`。8,102/8,102 body 来源可逆；累计 ledger
  18,383 entries / 5,630 groups / 8,975 evidence / 0 pending；v4→P6 plan
  6,793/11,447/0、repeat 0/0/0。固定 P6 shadow `--check` 为 854 artifacts、
  second 0/0/0、digest `58d5ab97…e9f255`；根 `pnpm check` 通过（migrate
  52 files / 372 passed + 1 skipped，Biome 885 files）。实现提交 `fa10902d`。
  Next: GLM 按下方提示词做架构 + 数据合并只读代审并签 `accept` / `counter`；GLM
  `accept` 前不得进入 P7，N3-1/C8/ED-5I 均不得标 done。
- 2026-07-25 GLM: P6 架构 + 数据合并代审签 **accept**。只读审查不改实现：读 p6-shared-closure.ts /
  p6-validate.ts / p6-transition-plan.ts 全部源码 + 独立复跑 `migrate:script-v5:shadow --through p6 --check`
  （854 artifacts / 0/0/0, digest `58d5ab97…` 匹配）+ P6 PAL golden 隔离 6/6 + typecheck + P0 audit。
  6 项重点逐项对账：①532 shared tails 全分类（433 cycle+80 owner+17 local+2 item-private）/
  0 shared author script / 13 scc active=0；②6 item-private（265/266/267/280/290/293）全部 hasCall=false
  hasJump=false / 268 craftRecipe+270 drawFromResourcePool 未回退；③574 local call+6 item bridge+22 auto
  boundary / 11 legacy jump remaining=0 / active output jumpScript=0 callScript=0；④21 source→42 flow→21 copy
  / 稳定 id 全显式 owner-local；⑤8,102 守恒（7035+598+433+21+15）/ pending=0；
  ⑥ledger 18,383+5,630+8,975+0 / 首跑 6,793/11,447/0 重复 0/0/0 / 冲突零写。
  Evidence: P6 签字表 GLM 行 + GLM P6 合并代审节。Next: **P6→P7 allowed**；Codex 可启动 P7。
  Kimi 额度恢复后补审 P6 共享判据（不阻塞）。未改实现文件。
- 2026-07-25 Codex: 核验 GLM P6 签字、独立复跑证据与交接记录完整，无 `counter/rework`；
  正式关闭 P6 内部门禁并把看板下一步切到 P7。P3-P6 的 Kimi 补审债务继续保留，但按用户豁免
  不阻塞本批。Next: 先独立提交 P6 审查记录，再按下方提示词实现 P7；P7 GLM 合并代审
  `accept` 和用户验收前不得标记 N3-1 done，C8/ED-5I 仍须随后独立回归。
- 2026-07-25 Codex: P7 前置已完成 canonical v5 schema 地基、SAVE 5 预检、PAL 状态锚点
  上游修复与 4,519 个 simple owner canonical 投影；分别提交
  `35f53753`、`96e5a45e`、`312cd8d9`、`dbc04f4c`。继续投影 65 个状态机 owner 时，
  可复跑审计确认现有 transition union 无法表达 277 个同步 continuation、47 个多 stage
  稳定入口的 next-activation 提交，以及 1 个中段 `confirm:no` outcome；直接套
  `to+macroTask` 会改变调度，静默消费 P5 IR 会让 canonical 不自足。已在 P7 build 节提出
  `continue / advance / commandOutcome + CommandId` 最小 delta 并签 Codex `agree`。
  Next: GLM 按下方提示词合并代审并签 `agree/counter`；门禁前不得改 transition schema、
  compiler/runtime/editor 或发布 content/save v5。N3-1 仍为 build，C8/ED-5I 继续 blocked。
- 2026-07-25 GLM: P7 状态机 schema delta 合并代审签 **agree**。只读审查不改实现：独立复跑
  `auditP7StateMachineProjectionNeeds(p6ir)`（70 cycle / 172 state / 65 owner / stage 59×1+1×2+5×9 /
  machine 60×1+5×2 / transitions 131 body-end+306 condition(30 tail+276 mid)+1 command-outcome /
  136 multi-transition / 277 synchronous continuation——逐项匹配卡内冻结）+ p7-canonical 测试 6/6 +
  4519/4519 simple owner validator + s081 confirm:no 中段回环反证（index 26 of 67，非尾命令）。
  **核心判断**：stay/restart/to/branch 经反证确认不足以无损承接 P5——277 同步 continuation 不能加
  macroTask/worldTick 让步（改变调度）；47 multi-stage 需要 advance（提交 cursor+结束激活 ≠ to+macroTask
  同次继续）；s081 confirm:no 需要 commandOutcome（命令结果分支 ≠ ScriptCondition）。
  continue/advance/commandOutcome+CommandId 是最小充分集。3 条必落约束：①continue 禁止 SCC；
  ②commandOutcome 只引用本 state body；③editor 三态可视化。schema delta allowed。
  Evidence: P7 签字表 GLM 行 + GLM P7 schema delta 合并代审节。
  Next: **Codex 可修改 transition schema 并发布 v5**，须按 3 条必落约束落地。未改实现文件。
- 2026-07-25 Codex: 核验 GLM P7 schema delta 签字、独立复跑证据和三条必落约束完整，
  无 `counter/rework`，正式关闭 schema delta 门禁。同步更正审查正文的一处分支方向笔误：
  `outcome:'no'` 命中时是 `then -> to(initial, worldTick)`，未命中（选择“是”）才是
  `else -> continue(continuation)`；冻结候选、s081 反证和 GLM 结论的其余文字均为这一正确语义，
  不改变审查结论。Next: 先独立提交审查记录，再由 Codex 实现 schema/validator；必须落实
  continue SCC 禁止、commandOutcome 本 state 顶层命令限定和 editor 三态可视化。
- 2026-07-25 Codex: 完成 P7 canonical schema/validator、70 个 cycle 投影与 65 个
  state-machine owner 合并，提交 `b1598e84`、`476d75db`、`282253ee`。validator 已落实
  continue SCC、outcome 本 state 与悬空引用门禁；PAL owner 合并冻结为 771 state，专项
  4 files / 12 tests、migrate typecheck、Biome、diff check 全绿。Next: 接入
  compiler/runtime/editor/SAVE 5；editor 必须完成“同步继续 / 下次激活 / 让步后同次继续”
  三态展示，然后才可进入全量迁移与原子发布。

### P7 canonical v5 全量发布与 Codex 自验（2026-07-25）

#### 发布结果

- **实现收口提交**：`9a668686 feat: publish canonical script v5`。该提交原子收口
  canonical content/save v5、PAL/demo/e2e 生成产物、compiler/runtime/editor、本地 v4 → v5
  迁移工作台、baseline/ledger/sidecar 及本卡/看板/设计文档；GLM 终审以此提交为实现基线。
- **版本原子切换**：`CONTENT_VERSION = 5`、`SAVE_VERSION = 5`；PAL、demo、e2e 的 manifest、
  scene、item、shared scripts、baseline、完整 transition ledger、save compatibility sidecar
  同批发布。PAL sidecar bytes SHA-256 已写回 descriptor，当前发布 digest 为
  `ca22f59c…af43e`。
- **canonical 内容**：
  - 4,519 simple owner、70 cycle、65 state-machine owner 全部进入 v5 validator；
  - 65 machine owner 合计 771 states，`continue/advance/to/branch/commandOutcome`
    保留 P5 调度与命令结果语义；
  - 作者内容中 `jumpScript=0`、动态 v4 binding=0、legacy private block=0；
  - 真正共享逻辑只在 `content/shared-scripts.json`；6 个物品私有脚本内联归物品拥有。
- **compiler/runtime**：compiler 只从 canonical flow 生成带 digest 的 executable graph；
  runtime 消费显式 scheduling boundary、Page/Behavior/Hook selection、epoch/CAS safe-point 和
  `EntityAddress`，不再执行作者可见生成块。
- **editor**：
  - scene/entity inspector 可创建、命名、选择 Page、trigger/auto Behavior 与 Hook variant，
    显示引用反链和删除守卫；
  - transition 编辑器明确区分“同步继续 / 下次激活 / 让步后同次继续”，
    `commandOutcome` 绑定本 state 的稳定 CommandId；
  - item-private script 在物品工作台内联编辑；共享引用只保存 ScriptId；
  - canonical v5 脚本库不再显示“迁移内部实现”；legacy tab 只对尚未升级的 v4 shell 保留。
- **SAVE 5**：
  - current 5/5 走空 transition chain，不要求历史 sidecar；
  - 1..4/4 严格走 envelope → content sidecar → 5/5；
  - 5/4、1..4/5、未来版本、project mismatch 和缺链全部 fail-loud；
  - `minimumSaveVersion` 在 sidecar IO 前硬拒；descriptor bytes digest 和 sidecar 自身 digest
    均校验。
- **本地 v4 → v5 工程升级**：
  - 唯一单页/单段工程可浏览器安全自动投影；
  - 多 Page/Stage、重复 EntityAddress/旧 cursor 和动态 binding 停在零写迁移工作台；
    作者可命名 Page/Behavior/Stage/Hook，选择忠实 `broadcast-v4` 或显式单一目标；
  - 全部 resolution 通过后先展示 allocation/alias 预览；作者二次确认且 immutable input
    digest 未变化时才创建 staging/journal，manifest 最后提交；
  - journal 每项带 old/new digest，可幂等前滚；中断重开先恢复，PAL repo 事务与普通项目
    local journal 路径/type 互不接受。
- **P7 上游修正**：sprite census 预期 digest 从历史 `abc4…` 更新为
  `393d97ab…7c67`。用 C2 历史提交 `7eeec81f` 同源复现后确认差异仅为 `312cd8d9`
  正确移除 0 次迭代的空 `setMultiEntityState`（s052/e897、s059/e1049）；accepted/action
  hash、计数和物化结果不变，审计记录已写入 C2 任务卡。

#### 验证证据

- `pnpm --filter @type-pal/migrate run check`：**61 files / 406 passed + 1 skipped**，
  其中全量 PAL P0-P7、publish/MG2/transaction、二跑零计划均通过；耗时约 551s。
- `pnpm --filter @type-pal/content run check`：**28 files / 343 passed**（含作者迁移工作台
  identity resolution、动态 hook binding 与 canonical validator）。
- `pnpm --filter @type-pal/reforge run check`：**66 files / 591 passed**。
- `pnpm --filter @type-pal/editor run check`：**84 files / 718 passed**；包含本地迁移
  “命名 → 预览零写 → 明确确认发布”集成测试。
- `pnpm typecheck`：7 个 workspace package 全绿；`pnpm lint`：Biome **939 files** 全绿；
  `git diff --check` 通过。
- reforge/editor production build 均通过；editor 仅保留既有的 >500kB chunk 性能警告。
- 浏览器（Playwright CLI）：
  - 6051 PAL runtime 冷启动、开场呈现、Enter 推进对话成功，console 0 error；仅浏览器
    Canvas `willReadFrequently` 性能提示；
  - 6010 editor 打开 canonical v5 PAL（294 scenes），脚本引用误报由 canonical
    `collectScriptV5ReferenceIssues` 修正后只余 327 个既有 unused-asset warning；
  - 冷启动进入“剧情 → 脚本库”只显示“可复用脚本”，不再出现“迁移内部实现”页签，
    Playwright console 0 error / 0 warning；
  - s001/e25 的 Page/Behavior/Hook、引用反链、copy/delete safety、flow JSON 实测；
    修正 flow textarea 被宽泛 flex selector 压窄的问题，冷刷新 console 0 error/0 warning。
  - 截图：`output/playwright/n3-p7-pal-runtime.png`、
    `output/playwright/n3-p7-pal-editor.png`。

#### 已知边界

- v4 图若涉及不能由稳定 identity resolution 解决的递归/不可约控制流，普通项目 upgrader
  继续以 `structure-control-flow` fail-loud，确认前零写；不会套用 PAL baseline 或猜测正文。
- editor 的 327 个 unused-asset 诊断属于既有 PAL 资产清理清单，不是脚本引用错误，也不阻塞
  N3-1；A7 仍独立跟踪 effect-sprite/image 与 catalog-only 总门禁。
- Kimi P3-P7 补审债务按用户豁免保留；本轮由 GLM 合并承担最终架构、数据、测试和文档审查。

#### P7 `review -> done` 推进签字

| Agent | 签字 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **rework（P7-R9 已自验，等待用户体验确认）** | 2026-07-26 | `5b6bb58e` 修复脚本面板保持打开时“切场景 → 选实体”的 owner 状态分叉：现在实体脚本、预览镜头与黄色触发范围同步切到当前实体，并补跨场景同名实体/同名方案回归测试；P7-R5 引用闭包、P7-R8 弹窗层级证据继续成立。用户确认前不重签 `accept`。 |
| Kimi | **waived（额度耗尽）** | 2026-07-25 | 用户已批准“合成一个都让 GLM 审核”；GLM 合并代审，Kimi 恢复后补审为非阻塞债务。 |
| GLM | **pending（等待用户确认 P7-R9 后终审）** | 2026-07-26 | 当前候选基线为 `5b6bb58e`；用户体验确认前不启动终审。确认后合并代审作者 UX、统一组件、引用闭包、预览投影和全量技术门禁。 |

- Codex 结论：**P7-R9 实现与自验完成，但仍保持 rework**。`5b6bb58e` 是当前用户验收候选；
  用户确认后才重签 `accept` 并交 GLM 合并终审。
- done 准入：**blocked**，等待 GLM 合并终审 `accept` 与用户验收；不得提前标记 N3-1 done。
- C8 / ED-5I：继续 `blocked`。P7 终审通过后再分别跑 canonical v5 下游回归和补签，不能随
  N3-1 自动完成。

#### P7-R1 通用 canonical v5 脚本编辑器返工（2026-07-25）

- **用户验收反例**：物品“天书”的私有脚本显示整段 JSON 和“应用并校验”，而不是脚本树、
  指令插入与属性表单。进一步审计确认：
  - 共享脚本页在 canonical v5 工程仍读取 legacy `EditorState.scriptIndex/scriptChunks`；
  - 场景 `ScriptV5BehaviorInspector` 单独维护 `Canonical ScriptFlow JSON` textarea；
  - 物品 `ItemUseEffectEditor` 又单独维护一份 `AuthorCommandV5[]` JSON textarea。
- **根因**：P7 只统一了 canonical schema/command session，没有统一作者态编辑组件；验证只覆盖
  “JSON 能写回”，误把数据可改等同于产品编辑闭环。
- **用户补充验收约束**：场景脚本编辑器原有的真实地图和预览能力必须保留。通用组件只统一正文
  与 flow 编辑层，不能把场景工作台退化成纯表单。
- **实现**：
  - 新增 `CanonicalScriptBodyEditorV5`，统一嵌套命令树、结构化属性表单、插入、移动和删除；
    新增 `CanonicalScriptFlowEditorV5`，统一 stage/state/transition 外壳，正文继续复用前者。
  - `CanonicalSharedScriptTabV5` 直接读写 `ScriptEditorStateV5.sharedScripts`；
    `ItemUseEffectEditor`、`ScriptV5BehaviorInspector`、`ScriptV5SceneHookInspector` 仅管理各自
    owner identity、选择、引用和元数据，不再维护整段 body/flow JSON textarea。
  - 补齐 canonical 场景 Hook 的新建、复制、重命名、初始选择、删除守卫和引用改写；共享脚本
    deep-link 同时识别 canonical library，修复新建后误报“目标不存在”。
  - 新增 `CanonicalSceneScriptWorkspaceV5`：上半区保留 `PreviewCanvas` 真实地图以及播放、单步、
    重置、引擎试玩；下半区保留可调高度抽屉并切换“场景 Hook / 实体行为”。canonical flow 和
    共享调用只读投影到原预览播放器，不回写作者内容。
  - 实现提交：`18a66216 fix(editor): unify canonical script authoring`。
- **自验结果**：
  - editor 全量：87 files / 726 tests passed；
  - root `pnpm typecheck`：7 个 workspace package 全通过；
  - root `pnpm lint`：947 files clean；
  - editor production build 通过，仅保留既有 >500kB chunk 警告；
  - Playwright 逐项核验物品“天书”、共享脚本库、场景实体行为、场景 Hook；场景地图保持可见，
    实际点击播放进入运行态并重置，console 0 error / 0 warning；
  - 截图：`output/playwright/n3-p7-r1-item-editor.png`、
    `output/playwright/n3-p7-r1-shared-editor.png`、
    `output/playwright/n3-p7-r1-scene-workspace-map-preview.png`、
    `output/playwright/n3-p7-r1-scene-hook-map-preview.png`。
- **返工验收条件**：
  1. 建立单一 canonical v5 命令正文编辑组件；共享脚本、场景 stage/state、物品私有脚本只提供
     owner/保存回调，不复制指令树、插入、排序、删除和属性编辑逻辑。
  2. canonical 共享脚本页直接读写 `ScriptEditorStateV5.sharedScripts`，不得再显示 legacy 空库。
  3. 场景 Flow 的 stage/state/transition 外壳可结构化编辑，正文统一调用同一组件；物品私有脚本
     不再暴露整段 JSON textarea。
  4. 三类 owner 的修改均走 `ScriptV5EditSession`、schema/reference/cursor 校验和统一 undo/redo，
     并覆盖保存序列化/重开测试。
  5. Playwright 在 PAL 的共享、场景、物品三个入口逐一核验；console 0 error。

#### P7-R2 作者体验与真实预览返工（2026-07-25）

- **用户验收结论**：P7-R1 无法验收；不能以 schema 可编辑、按钮可点击代替作者可理解和预览
  可工作。
- **必须修复**：
  1. 视觉与控件回归既有编辑器语言；按钮、Tab、指令行、选中态和插入面板不得出现浏览器默认
     白色控件或另一套临时风格。
  2. 每种 canonical 指令必须有中文名称、用途摘要和可理解的属性表单；不得向普通作者直接显示
     `teleportParty`、`setPartyFacing`、`clearDialog` 等英文 kind。
  3. 恢复完整指令分类和事件模板，不得只提供少量快捷项；无当前资源时也应显示指令并解释为何
     暂不可用。
  4. 普通编辑默认使用“进场脚本 / 传送出口 / 交互脚本 / 自动行为”等作者术语；`Hook`、
     `stage/state`、稳定 id、引用和复制属于高级管理信息，须翻译、解释或渐进披露。
  5. 消除“外层所有者 Tab + 内层通道 Tab + 默认下拉 + 变体列表 + 初始阶段下拉”的重复选择；
     单变体/单段脚本不得暴露无意义的层级。
  6. 地图/脚本分隔条拖动必须连续跟手；使用实时尺寸基准，不能在一次 pointer move 中反复基于
     旧 render 值计算。
  7. 预览必须走 canonical v5 编译/运行链路或等价完整语义，真实执行 s001 进场对话；不得再以
     “播放按钮进入 running”作为通过证据。
- **终审**：GLM 暂停，P7-R2 未完成前不得继续终审；N3-1、C8、ED-5I 均不得标 done。

#### P7-R3 单列脚本工作区与渐进编辑返工（2026-07-25）

- **用户新增验收约束**：
  1. “画面出现前的准备”和“脚本正文”必须用 Tab 互斥显示，不能同时堆高页面。
  2. 正文直接平铺在工作区的唯一滚动层中，不得再出现“抽屉滚动 → 脚本树再滚动”的嵌套滚动。
  3. 脚本正文独占可用宽度；属性编辑改为双击指令弹窗，同时保留显式编辑按钮；添加指令也用弹窗。
  4. 分段剧情的初始段、下一段和新增段收进“分段剧情设置”弹窗，不常驻挤占正文。
  5. 原“高级管理”不得继续暴露稳定 id、raw path 等内部概念；版本管理只显示业务名称、用途和
     删除原因。
  6. 保留场景地图、播放/单步/重置/引擎试玩，预览必须实际跑出对话。
- **实现候选**：
  - `e77456d5 fix(editor): simplify canonical script authoring`：布局、弹窗、版本管理、预览与拖动。
  - `f50c993a fix(editor): expose complete script command catalog`：P7-R3 当轮候选；补齐完整指令目录。
  - `CanonicalFlowBodyTabsV5` 同时覆盖 stage 与 state-machine entry；默认显示正文，仅挂载当前
    Tab，避免两棵命令树同时占高。
  - `CanonicalScriptBodyEditorV5` 删除常驻 50% 属性栏和内部滚动；共享/场景/物品继续复用同一
    命令树。单击只选择，双击或铅笔按钮打开编辑弹窗；“添加指令”打开带搜索和分类的插入弹窗。
  - `CanonicalScriptFlowEditorV5` 将分段初始值、当前段后继和新增段移入业务化设置弹窗；
    单段脚本不再显示无意义阶段层级。
  - Scene Hook 与 Entity Behavior 共用 `ScriptVersionManagementDialogV5`：作者只填写版本名称；
    内部 id 自动生成，引用位置翻译为用途，受保护版本明确解释为何不可删除。
  - canonical 指令弹窗默认不再展示“应用 JSON”；对话、镜头定位和低频命令补齐结构化字段。
    插入弹窗实测 **77** 个可选项（含事件模板），覆盖全部 **74** 种 canonical 指令；当前工程
    没有共享脚本时，“调用共享脚本”仍显示但禁用，并解释先去脚本库创建。界面未出现
    `teleportParty` / `setPartyFacing` / `clearDialog` / `selectSceneHooks` 等 raw kind。
  - `PanelResizeHandle` 的调用方改用函数式状态更新；实测连续向下拖动的
    `aria-valuenow` 为 **420 → 404 → 388 → 372 → 356**，每次 pointer move 均即时响应。
  - canonical 预览投影补齐 EntityAddress、嵌套条件、confirm/battle/teleport failure 和实体演出
    命令；非 Abort 错误不再静默吞掉，而是写入预览日志。s001 进场脚本实际播放出“李大娘”对话，
    Playwright console **0 error / 0 warning**。
- **布局与视觉证据**：
  - 场景正文树：`overflow-y: visible`，`clientHeight = scrollHeight = 4674`；
    从正文树向上只有 `.canonical-script-drawer-body` 一个 `overflow-y: auto` 容器
    （389 / 4937），常驻 `.canonical-script-properties` 数量为 0。
  - 截图：
    `output/playwright/n3-1-p7-r3-final-layout.png`、
    `output/playwright/n3-1-p7-r3-command-dialog-no-json.png`、
    `output/playwright/n3-1-p7-r3-insert-dialog-all-kinds.png`、
    `output/playwright/n3-1-p7-r3-stage-settings.png`、
    `output/playwright/n3-1-p7-r3-version-management.png`、
    `output/playwright/n3-1-p7-r3-preview-dialog.png`。
- **自验**：
  - root `pnpm typecheck` 7 个 workspace package 全绿；editor production build 377 modules，
    通过（仅既有 >500kB chunk 提示）。
  - editor **89 files / 735 tests passed**，新增 stage/state-machine prepare Tab、弹窗编辑/插入、
    canonical 禁止 raw JSON 和版本管理闭环回归。
  - root `pnpm lint`：**949 files clean**；`git diff --check` 通过。
  - 此前根 `pnpm check` 在并发压力下超时的两个 PAL shadow 文件已按原 timeout 隔离复跑：
    P3 **5/5**（261.61s）、P4 **7/7**（508.32s）均通过，未改实现或 timeout；确认不是断言失败。
- **P7-R3 当轮门禁（后由 P7-R4 继续返工）**：仍为 `rework`，等待用户实际体验确认；确认后
  Codex 才重签 `accept` 并把
  `f50c993a` 交 GLM 合并终审。N3-1、C8、ED-5I 继续不得标 done。

#### P7-R4 脚本方案与分次执行交互返工（2026-07-25）

- **用户新增验收约束**：
  1. “剧情版本”改为作者可理解的“脚本方案”，方案必须平铺；每张方案卡直接提供“方案详情”，
     不得先从下拉框选择再打开详情。
  2. 方案详情与新建方案、步骤详情与新建步骤分别使用独立弹窗；步骤可删除，删除必须修复起始
     步骤和所有后继去向，并可用一次撤销完整恢复。
  3. 入口标题、当前方案徽标和当前方案名称不得在下级标题重复；“触发阶段/阶段”改成
     “分次执行/步骤”，说明放进 `?`，两级小标题字号、字重和间距统一。
  4. “步骤详情”属于具体步骤，必须像“方案详情”一样放进每张步骤卡，不得作为脱离对象的全局
     按钮。
  5. 游戏尚未发布，开发期迁移 sidecar 不得伪装成“旧存档保护”并阻断作者正常改名、编辑或删除；
     真正发布后的 SAVE 兼容须另行设计版本迁移，不能用开发期提示文字冒充产品能力。
- **实现**：
  - `ScriptSchemeStripV5` 由 Scene Hook 与 Entity Behavior 共用：方案横向平铺，卡片显示业务名、
    步骤数和默认状态，并直接进入独立的方案详情；新建方案使用单独弹窗。
  - `CanonicalScriptFlowEditorV5` 使用“分次执行 / 步骤 N”；顶部只保留“新建步骤”，每张步骤卡
    自带“步骤详情”。详情与创建分离，起始步骤、下次运行去向和删除只在所属步骤详情中修改。
  - 新增纯函数 `removeTriggerStageV5`：禁止删除最后一步；一次性删除目标、重定向起始步骤及所有
    incoming `next`，通过既有完整 flow command 形成单一 undo/redo 步。
  - `migrationSidecars` 不再作为作者态方案引用，也不再阻断方案改名、flow 更新或共享脚本删除；
    页面与真实脚本指令引用仍保持 fail-closed 删除保护。
  - “脚本方案”和“分次执行”复用 `.script-section-heading/.script-section-title`，实测均为
    `11px / 700 / 15.4px`、`gap: 7px`，帮助按钮均为 `flex: 0 0 auto`；tooltip 支持焦点与
    `Escape` 关闭，准备/正文 Tab 支持左右方向键、Home/End、roving tabIndex 和
    tab/tabpanel 关联。
  - 实现提交：`51a0cf84 fix(editor): clarify script schemes and execution steps`。
- **验证证据**：
  - editor **89 files / 741 tests passed**；相关 core/UI 定向矩阵 **4 files / 30 tests passed**。
  - root `pnpm typecheck`：7 个 workspace package 全通过；root `pnpm lint`：
    **949 files clean**；editor production build 377 modules 通过（仅既有 >500kB chunk 提示）；
    `git diff --check` 通过。
  - Playwright 在 s001 实测：方案标题没有入口名重复；分次执行标题没有“当前方案”或方案名；
    作者可见区域无“触发阶段/阶段”；两张步骤卡各自显示“步骤详情”，点击步骤 2 的详情会先选中
    步骤 2 并打开对应弹窗；tooltip Esc 与准备/正文方向键切换有效；console
    **0 error / 0 warning**。
  - s001 播放仍实际出现“李大娘”及对话文本；唯一脚本抽屉滚动层、地图预览和实时分隔条沿用
    P7-R3 已验证结果。
  - 截图：`output/playwright/n3-1-p7-r4-execution-steps.png`、
    `output/playwright/n3-1-p7-r4-step-details-in-card.png`。
- **P7-R4 当轮门禁（后由 P7-R5 继续返工）**：仍为 `rework`，等待用户实际体验确认；确认后
  Codex 才重签 `accept` 并把
  `51a0cf84` 交 GLM 合并终审。N3-1、C8、ED-5I 继续不得标 done。

#### P7-R5 引用闭包、方案详情与共用编辑器收口（2026-07-26）

- **用户新增验收反例**：
  1. 方案“使用位置”只有重复的泛化文字，点击无反应；必须说明场景、实体、方案、步骤、正文和
     第几条指令，并能真正打开到该指令。
  2. 方案名称与默认状态相距过远且分别即时保存；弹窗 footer 应统一提供删除、取消、保存，
     一次保存、一次撤销。
  3. canonical 物品工作台的引用计数和条目消失；物品反链必须覆盖新脚本模型并可精确反跳。
  4. “复制方案”没有明确作者任务，只增加认知和误操作成本；当前不应占据方案详情。
  5. 引用条目正文不能比“使用位置”等小标题更醒目，视觉层级必须回到“标题 > 说明 > 条目”。
- **实现**：
  - 建立 typed canonical command locator，覆盖场景脚本方案、实体脚本方案、共享脚本、物品私有
    脚本和敌对实体战败后脚本；引用描述使用中文业务位置，跳转前重新解析目标，失效位置
    fail-closed，不再依赖 raw path 或只弹提示。
  - 方案详情先关闭弹窗，再切换到真实场景/实体/owner、方案、步骤或状态、准备/正文和嵌套
    command path；精确选中并滚动到目标指令。PAL s001 的三条引用实测可跳到
    s003/e59、e60、e61 的第 115 条“切换场景脚本方案”。
  - canonical 物品反链并入统一 `collectItemReferences`：覆盖 `giveItem/loseItem`、嵌套
    all/any/not 条件、分支/循环和 state transition 的递归条件；删除和 v5 保存都再次扫描并拒绝
    悬空引用。PAL“天书”（290）恢复 2 处真实引用，并可跳到 s151 失去物品和
    s154/e2493 获得物品指令。
  - 方案详情删除“复制方案”；名称和默认状态只保存在弹窗草稿，footer 的“保存”通过一个
    command 原子提交，单次 undo 可完整恢复。删除位于 footer 左侧，取消/保存在右侧。
  - 引用按钮正文统一为 `10px / 400 / 1.55`，小标题为 `11px / 700`；整行仍可点击并保留
    hover/focus 状态，“打开 ↗”降为 9px 辅助文字。
  - canonical 敌对实体“战败后脚本”改用同一个 `CanonicalScriptBodyEditorV5` 弹窗，不再让
    precise reference 落入会被 canonical 保存覆盖的 legacy JSON textarea。
- **验证证据**：
  - editor 全量 **89 files / 755 tests passed**；editor typecheck 与本轮 22 个源码文件
    Biome check 全绿。
  - clean migrate 全量 **61 files / 406 passed + 1 skipped**；root typecheck 的 7 个 workspace
    package 全绿；root lint **949 files clean**；editor production build 377 modules 通过，
    仅保留既有 >500kB chunk 提示；`git diff --check` 通过。
  - Playwright 在真实 PAL 工程复验：方案引用、物品两条反链和战败后脚本均精确打开；
    s001 单步后实际出现“李大娘”对话；地图与演出预览保留；分隔条从 420px 拖到 480px 并写入
    布局状态；console **0 error / 0 warning**。
  - 方案弹窗 computed style：无复制按钮，引用正文 10px，小标题 11px；footer 删除在左、
    取消/保存在右。截图：`output/playwright/scheme-details.png`。
  - 实现提交：`e675f474 fix(editor): restore canonical script reference workflows`。
- **P7-R5 当轮门禁（后由 P7-R6 继续返工）**：仍为 `rework`，等待用户实际体验确认；确认后
  Codex 才重签 `accept` 并把
  `e675f474` 交 GLM 合并终审。N3-1、C8、ED-5I 继续不得标 done。

#### P7-R6 可复用脚本创建弹窗（2026-07-26）

- **用户验收反例**：脚本库左栏把“新建脚本”的名称、稳定 ID 和提交按钮常驻铺在列表底部，
  抢占浏览空间，也把“浏览脚本”与“创建脚本”两种任务混在同一个面板。
- **实现**：
  - 移除左栏常驻创建表单，在“可复用脚本”标题栏增加与原编辑器一致的“＋”按钮；
    点击后打开独立“新建可复用脚本”弹窗。
  - 弹窗只承载脚本名称和稳定 ID；名称输入时自动生成唯一 ID，稳定 ID 的技术说明收进 `?`；
    footer 统一使用“取消 / 创建脚本”，支持 Enter 提交和 Escape 关闭。
  - 打开时焦点进入名称输入框，关闭后归还标题栏“＋”；空名称提交显示关联到输入框的行内错误，
    ID 冲突/非法时聚焦 ID 输入框，保留编辑内容供修正。
- **验证证据**：
  - editor 全量 **89 files / 756 tests passed**；editor typecheck、root lint
    **949 files clean**、editor production build 377 modules、Biome 与 `git diff --check` 全绿。
  - Playwright 在 PAL 脚本库实测：左栏无常驻创建表单；“＋”打开弹窗，名称输入自动聚焦并生成
    `shared/user/...`，空提交显示“请输入脚本名称”，Escape 关闭后焦点回到“＋”；
    console **0 error / 0 warning**，未创建或保存真实工程数据。
  - 截图：`output/playwright/n3-1-p7-r6-new-shared-script.png`。
  - 实现提交：`9010465b fix(editor): move shared script creation into dialog`。
- **当前门禁**：仍为 `rework`，等待用户实际体验确认；确认后 Codex 才重签 `accept` 并把
  `9010465b` 交 GLM 合并终审。N3-1、C8、ED-5I 继续不得标 done。

#### P7-R7 方案弹窗信息层级收口（2026-07-26）

- **用户验收反例**：方案详情顶部的“所属入口”重复弹窗标题已经表达的上下文；“方案名称”仍是
  普通表单标签，与下方“使用位置”的小标题层级不一致。
- **实现**：
  - 方案详情和新建方案弹窗一并移除“所属入口”，避免同一入口名在标题与正文重复；
  - “方案名称”改为带关联 `label` 的小标题，并与“使用位置”共用字号、字重、颜色和行高；
  - 脚本方案与新建方案的解释保留在标题旁 `?` 中，不把说明文字重新铺回界面。
- **验证证据**：
  - editor 全量 **89 files / 756 tests passed**；editor typecheck、root lint
    **949 files clean**、editor production build 377 modules 与 `git diff --check` 全绿；
  - Playwright 在 PAL s001 方案详情实测：正文中无“所属入口”；“方案名称”与“使用位置”均为
    `11px / 700 / 16.5px` 且颜色一致；console **0 error / 0 warning**；
  - 截图：`output/playwright/n3-1-p7-r7-scheme-headings.png`；
  - 实现提交：`4e24b7d4 fix(editor): simplify scheme details hierarchy`。
- **当前门禁**：仍为 `rework`，等待用户实际体验确认；确认后 Codex 才重签 `accept` 并把
  `4e24b7d4` 交 GLM 合并终审。N3-1、C8、ED-5I 继续不得标 done。

#### P7-R8 步骤详情弹窗信息层级收口（2026-07-26）

- **用户验收反例**：步骤详情重复显示标题已经能够表达的“所属方案”；“这不是起始步骤”与操作
  相距过远，下一步设置仍使用普通标签；删除按钮单独占据正文区并增加一层分隔边框，footer
  反而只放“关闭”，与方案详情已经确定的弹窗操作层级不一致。
- **实现**：
  - 移除正文中的“所属方案”，保留标题“步骤 N · 详情”作为唯一上下文；
  - 将“起始步骤”和“下次运行”改为与方案详情共用的
    `canonical-dialog-field-heading` 小标题；状态与“设为起始步骤”放在同一设置组内，
    下次运行标题继续通过 `label` 精确关联 select；
  - 删除操作移至 footer 左侧，关闭放在右侧；移除正文删除专区和额外分隔边框；
    禁止删除最后一步的约束、删除影响提示与独立二次确认均保持不变。
- **验证证据**：
  - editor 全量 **89 files / 756 tests passed**；editor typecheck、root lint
    **949 files clean**、editor production build 377 modules、Biome 与 `git diff --check` 全绿；
  - Playwright 在 PAL s001 的“步骤 2 · 详情”实测：正文无“所属方案”与删除专区；
    “起始步骤 / 下次运行”均为 `11px / 700 / 16.5px` 且颜色一致；删除位于 footer
    首项、关闭位于末项；点击删除仍进入独立“删除步骤 2？”确认弹窗；console
    **0 error / 0 warning**；
  - 截图：`output/playwright/n3-1-p7-r8-step-details.png`；
  - 实现提交：`ae6d1d9c fix(editor): simplify step details dialog`。
- **当前门禁**：仍为 `rework`，等待用户实际体验确认；确认后 Codex 才重签 `accept` 并把
  `ae6d1d9c` 交 GLM 合并终审。N3-1、C8、ED-5I 继续不得标 done。

#### P7-R9 场景切换后的实体脚本与地图焦点同步（2026-07-26）

- **用户验收反例**：脚本面板保持打开时切换场景，再从左侧选择精灵，右侧属性已经显示新实体，
  但下方仍停在进场脚本；地图既不聚焦实体也不显示黄色触发范围，实体脚本正文没有加载。
- **根因**：`CanonicalSceneScriptWorkspaceV5` 的本地 `owner` 只在首次挂载时根据实体选择初始化，
  后续只实现“取消实体选择后退回场景脚本”，漏掉“重新选择实体后切回实体脚本”。同一个
  `owner` 同时控制 active flow、预览 `focusEntityId`、`sceneFraming` 和下方 inspector，导致
  三项表现一起失效；不是 s154/e2493 数据缺失。
- **实现**：
  - `owner` 现在随 `scene.id + selectedEntityId` 的选择边界同步：无实体时进入场景脚本，
    选择或更换实体时进入该实体的交互脚本；
  - 同一场景、同一实体下用户手动查看进场脚本仍会保留，不会被 effect 强制弹回；
  - 新增 Workspace 组件回归测试，故意让两个场景使用相同实体 ID 和相同方案 ID、不同正文，
    覆盖 `sA/e1 → sB/null → sB/e1`、直接跨场景同名实体以及手动 Tab 选择三个边界。
- **验证证据**：
  - editor 全量 **90 files / 757 tests passed**；editor typecheck、root lint
    **950 files clean**、editor production build 377 modules、Biome 与 `git diff --check` 全绿；
  - Playwright 保持脚本面板打开，实跑 `s153 → s154 → e2493`：交互脚本 Tab 自动选中，
    加载“默认触发行为 / 触发行为 1”及 e2493 正文；地图镜头转到 e2493 并显示黄色触发范围；
    console **0 error / 0 warning**；
  - 返工前后截图：`output/playwright/n3-1-p7-r9-before.png`、
    `output/playwright/n3-1-p7-r9-after.png`；
  - 实现提交：`5b6bb58e fix(editor): sync entity script selection`。
- **当前门禁**：仍为 `rework`，等待用户实际体验确认；确认后 Codex 才重签 `accept` 并把
  `5b6bb58e` 交 GLM 合并终审。N3-1、C8、ED-5I 继续不得标 done。

## 下一位 Agent 提示词

### 给 GLM（P7-R9 架构 + 数据 + 测试 + 文档合并终审；等待用户确认后执行）

```text
终审任务: N3-1 P7-R9 canonical v5 作者脚本 UX、引用闭包与真实预览返工后的合并终审
任务卡: docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前候选基线: 5b6bb58e fix(editor): sync entity script selection
首次发布基线: 9a668686 feat: publish canonical script v5
统一组件基线: 18a66216 fix(editor): unify canonical script authoring
本轮返工增量: 18a66216..5b6bb58e
当前状态: rework；Codex 已完成自验，但在用户体验确认前尚未重签 accept。
执行条件: 只有用户明确确认 P7-R9 体验可接受后才开始本终审；确认前不得执行、不得改签字。
Kimi 额度耗尽，用户批准 P3-P7 由 GLM 合并代审；你同时承担原 Kimi 架构/调度席位和
  GLM 数据/覆盖席位。
你的职责: 只读终审，不修改实现文件；输出 accept 或带具体路径/反例/严重度的 counter。
先读:
  - AGENTS.md、docs/phase2/READ-FIRST.md；
  - 本卡 P1-1..P1-8 冻结设计、P7 schema delta、P7 canonical v5 全量发布与 Codex 自验；
  - docs/phase2/foundation/script-system-design.md；
  - docs/phase2/editor/shared-script-author-guide.md；
  - docs/phase2/foundation/save-system-design.md。
重点源码:
  - packages/content/src/{script-v5,scene-v5,item-v5,script-transition-v5,
    project-script-v5-upgrade,validate}.ts；
  - packages/migrate/src/experimental/script-v5/p7-* 与 publish-script-v5.ts；
  - packages/reforge/src/{loader-v5,script-compiler-v5,script-runner-v5,
    script-world-v5,script-project-v5}.ts 和 save/{types,migration,ops}.ts；
  - packages/editor/src/core/{script-v5-editor,project-io-v5,
    author-command-edit-v5,world-sprite-behavior,upgrade-local-v4-script-v5,open-local}.ts；
  - packages/editor/src/ui/{CanonicalScriptEditorV5,CanonicalSharedScriptTabV5,
    CanonicalSceneScriptWorkspaceV5,CommandForm,ScriptV5BehaviorInspector,
    ScriptV5SceneHookInspector,ItemUseEffectEditor,ProjectPicker}.tsx。
必须独立核对:
  1. canonical 内容中 jumpScript / v4 动态 binding / internal generated block 是否归零；
     shared ScriptId、item-private、Page/Behavior/Hook identity 是否唯一且引用闭合。
  2. 70 cycle / 65 machine owner 与 continue/advance/to/commandOutcome 调度语义，
     continue SCC、CommandId 本 state 限定和 safe-point/epoch-CAS 是否成立。
  3. PAL project/baseline/full ledger/sidecar/manifest 是否同事务发布，descriptor/sidecar digest、
     MG2 冲突零写和连续二跑零计划是否成立。
  4. SAVE 5 双轴矩阵、minimumSaveVersion 首闸、current 5/5 无 sidecar、旧 cursor/entity/hook
     alias 和输入不变是否成立。
  5. 任意作者 v4 工程的工作台是否做到 input digest、Page/Behavior/Stage/Hook 命名、
     EntityAddress 与 broadcast/single 消歧、preview 后二次确认、local journal 前滚恢复；
     不得调用 PAL repo 事务。
  6. canonical 共享脚本、物品私有脚本、实体 Behavior、场景 Hook 是否确实复用同一
     `CanonicalScriptBodyEditorV5`；Behavior/Hook 是否复用同一 flow 编辑层；普通作者是否不再
     暴露 raw kind、整段 body/flow JSON、内部方案 id 和 raw 引用路径；方案卡的详情目标是否
     与当前正文选择解耦，打开未选方案详情不得误切正文。
  7. 场景脚本工作台是否仍保留真实地图、播放/单步/重置/引擎试玩和可调抽屉；预览 lowering
     是否只读、不会把 generated block 或播放状态回写 canonical；必须实际跑出 s001 对话，
     不接受只观察 running 状态。
  8. 准备/正文是否为互斥 Tab；命令树是否全宽且只有 owner 工作区一个滚动层；指令编辑/添加、
     方案与步骤的详情/新建是否分别走渐进弹窗；方案是否平铺、步骤详情是否归属具体步骤卡；
     分隔条是否连续跟手。
  9. 步骤删除是否原子修复 initial 与所有 incoming next、禁止删除最后一步且一次 undo/redo
     完整恢复；作者态不得再出现“旧存档保护”，开发期 migration sidecar 不得冒充真实引用或
     阻断作者 CRUD，页面与脚本指令的真实引用保护仍须 fail-closed。
  10. 四类 owner 的 CRUD、嵌套命令修改、三态 transition、引用反链/重命名/删除守卫、
     undo/redo、保存序列化/重开和 canonical deep-link 是否闭环。
  11. 方案/行为反链是否使用 typed locator 而非 raw path；说明是否能定位场景、实体、方案、
      步骤/状态、准备/正文和指令序号；点击后是否精确选择目标；失效 locator 是否 fail-closed。
      物品反链是否覆盖 canonical give/lose 与递归 condition/transition，删除和保存是否拒绝悬空；
      战败后脚本是否使用统一正文编辑器而不是 legacy JSON。
  12. 方案详情是否移除无明确任务的“复制方案”；名称与默认状态是否由 footer 一次原子保存，
      一次 undo 完整恢复；删除/取消/保存位置与引用条目字号、字重、焦点态是否符合层级。
  13. 可复用脚本左栏是否只保留标题栏创建按钮；创建是否使用独立弹窗，名称能生成唯一稳定 ID，
      空值/冲突错误是否就地可修正，Enter/Escape/焦点进入与归还是否闭环。
  14. 方案详情与新建方案正文是否移除重复的“所属入口”；“方案名称”是否与“使用位置”使用
      同一小标题层级，帮助说明是否继续渐进披露在 `?` 中，且关联 label/焦点语义没有退化。
  15. 步骤详情是否移除重复的“所属方案”和正文删除专区；“起始步骤 / 下次运行”是否共用
      方案详情的小标题层级，状态与操作是否相邻，删除/关闭是否分别位于 footer 左右两端；
      下次运行 label/select 关联、最后一步禁删、删除影响提示和独立二次确认是否继续成立。
  16. 脚本面板保持打开时，切换场景后选择或更换实体，交互脚本、地图镜头与黄色触发范围是否
      同步到当前实体；跨场景同名实体/同名方案不得残留旧正文；用户手动查看进场脚本时不得被
      无关重渲染强制弹回实体脚本。
  17. 独立复跑 editor check、root typecheck/lint、editor build；抽查 `9a668686` 前轮已通过的
      content/reforge/migrate 发布门禁仍未被返工破坏，并核对文档与 capability map 没有提前把
      N3-1/C8/ED-5I 标 done。
输出:
  - 在本卡 P7 review 签字表 GLM 行签 `accept`，或写 `counter` 的文件/断言/复现命令/返工项；
  - 在交接日志写独立复跑数字、digest、架构/数据结论；
  - accept 后明确“GLM 合并终审通过，可由 Codex 收口”，但不得自行标 N3-1 done；
  - 不得把 C8/ED-5I 标 done，它们仍须 N3-1 后独立回归。
```

当前无下一位 Agent 执行：等待用户验收 P7-R9；上面的 GLM 提示词仅在用户确认后启用。

### 给 GLM（P7 状态机 schema delta 架构 + 数据合并代审；已完成，勿再执行）

```text
复审任务: N3-1 P7 状态机 canonical schema delta
任务卡: docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态: build；P0-P6 已 accept，P7 simple owner 4,519/4,519 已通过 v5 validator；
  状态机 schema delta 的 Codex=agree、Kimi=用户豁免、GLM=pending。签字前不得改 union 或发布 v5。
你的职责: 只读合并代审原 Kimi 架构/调度语义席位 + GLM 数据/测试矩阵席位；不得修改实现文件。
先读:
  - AGENTS.md、docs/phase2/READ-FIRST.md；
  - 本卡 P1-5 frozen ScriptFlow 语义、P5 实现/GLM 历史复审、P7 canonical 投影进度与 schema delta；
  - packages/content/src/script-v5.ts；
  - packages/migrate/src/experimental/script-v5/{types,p5-cycle-structure,p7-canonical,p7-state-machine-audit}.ts
    及对应测试；
  - packages/migrate/.shadow/N3-1/v5/p6/ir/script-migration-ir.json（若本地存在）。
必须独立核对:
  1. 复跑 p7-state-machine-audit.test.ts，并从 P6 IR 对账
     70 cycle / 172 state / 65 owner、stage 59×1+1×2+5×9、machine 60×1+5×2、
     131 body-end + 306 condition（30 tail/276 mid）+ 1 command-outcome、
     136 multi-transition state、277 synchronous continuation、47 multi-stage entry。
  2. 证明现有 stay/restart/to(yield)/branch 是否确实不能同时表达：
     a) 中段 false fallthrough 不新增调度让步；
     b) stage next 只提交 cursor 并结束本次激活；
     c) s081 confirm:no 回环且 yes 后缀只执行一次。
     若认为无需 schema 变更，必须给出能通过最终 canonical validator、无需迁移 IR/runtime
     side channel 且不改变调度的具体 JSON 反例，不接受只说“compiler 消费”。
  3. 审核候选 continue / advance / commandOutcome + CommandId 是否为最小充分集：
     continue 不提交/不让步且无环；advance 提交并结束；to 提交/让步/同次继续；
     outcome 只引用同 state 顶层唯一命令、结果不进 save。
  4. 审核 owner 合并多个 cycle、StageId→StateId/alias、continuation 显式 allocation、
     transition ledger/save sidecar、editor 三种语义展示以及 validator 负向矩阵。
输出要求:
  - 在本卡「P7 状态机 schema delta 推进签字」GLM 行签 agree，或写 counter 的具体字段、
    反例与返工项；
  - 在交接日志记录独立复跑命令、数字和结论；
  - agree 后明确 P7 schema/runtime/compiler/editor 是否 allowed；counter 时保持门禁。
  - 不得把 N3-1/C8/ED-5I 标 done。
```

### 给 Codex（P7 全量重迁、验收与文档；当前执行）

```text
接手任务: N3-1 P7 全量重迁、验收与文档
任务卡: docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态: build；P0-P6 全部 accept（P3-P7 Kimi 用户豁免，GLM 合并代审）；P6→P7 allowed，
  P7 状态机 schema delta 已取得 GLM agree。pending 归零——P2-P6 累计 IR 已无未归属 body。
你的角色: Codex，Coding Owner。P7 是 N3-1 最后一步：把影子 v5 发布为 canonical。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡 P1-1（版本轴裁决）、P1-2..P1-8（schema/save/MG2
  冻结设计全文）、P6 节（含用户物品私有脚本裁决）、P7 schema delta 与 GLM 新签字。
P7 范围:
  - 从 v4 重跑 P2-P6 全链产出最终 v5 canonical content；legacy command/binding/private block=0。
  - 通过最终 v5 validator；连续二跑零 diff；MG2 三方合并场景覆盖。
  - 原子切换当前 schema 常量（CONTENT_VERSION=5）和 loader；HTTP/runtime loader 只接受 v5。
  - 发布 contentVersion 5 + SAVE_VERSION 5；旧工程/旧存档升级链按 P1-6 版本矩阵。
  - 物品私有脚本 schema 发布：ItemUseEffect 新增 item-private-script kind 或等效的物品内联脚本持有方式；
    ItemUseEffectEditor 对物品私有脚本提供内联编辑入口（不跳转共享脚本模块）。
  - transition ledger + save compatibility sidecar 发布（P1-7 双投影）。
  - 更新 script model 文档、共享脚本作者指南、存档升级说明、capability map。
  - 从 canonical schema/编辑器/运行时/存档移除作者可见 jumpScript、匿名 binding、”迁移内部实现”。
P7 纪律:
  - 一个事务发布 project + baseline + sidecar + manifest；中断可前滚恢复。
  - P7 完成后交 GLM 合并代审（Kimi 若恢复则三方）；三方 accept + 用户验收后才标 N3-1 done。
  - C8/ED-5I 的 done 前验收仍各自独立，不随 N3-1 自动完成。
输出: 在任务卡写 P7 实现摘要 + P7 阶段签字 Codex 行 accept；给 GLM P7 审查提示词。
```

历史状态：上面的 Codex P7 实现提示词已完成，勿再执行；当前以 P7-R9 用户验收门禁为准。

## 历史 Agent 提示词（P1-P6 build 已完成批次，勿再执行）

### 给 Codex（P3 准入实现：无环控制流结构化；已完成）

```text
接手任务: N3-1 P3 无环控制流结构化（shadow 形态）
任务卡: docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态: build；P2 三方 accept 齐（2026-07-24），P2→P3 准入 allowed。
你的角色: Coding Owner——build 阶段唯一实现文件修改者。
先读: 本卡 P1-1 影子纪律、P1-5 ScriptFlow/loop/stateMachine 冻结、P1-7 ledger、P1-8 矩阵；
  「P2 影子迁移实现与自测」与三方 P2 复审节；packages/migrate/src/experimental/script-v5/ 全部；
  P0 基线 pal-v1.json 的 product.bodies（含 productComponent/incomingPredecessorBodyIds/
  sharedTail/dialogue）。
已实现约束: P3 仍只产出 gitignored 影子根与累计 transition ledger；单前驱、状态相容的
  无环 tail 原位合并，diamond 恢复 branch/switch；合并前必须比较对话状态、self、RNG、
  pending battle/auto 入口/出口上下文（P0 d-hash 入口态清单与 debts 的
  registry-identity-context-omissions 是本批相容性证明的输入）；体积与 chunk 门禁防
  复制膨胀；1,715 个 P3 pending body 逐类处理，未处理域必须可枚举。
输出要求: 在 Build 节留 P3 实现摘要、影子门禁与双跑证据；Kimi/GLM 批次审查 accept 前
  不得进入 P4；遇设计钉子不成立时留 build 或转 blocked 并写清原因。
```

### P1/P2 既有历史提示词

### 给 Kimi（P1 架构/schema/runtime/compiler 设计复审）

```text
复审任务: N3-1 P1 schema/save/MG2 冻结候选——架构主审
任务卡: docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态: build；P0 已由 Codex/GLM/Kimi accept；P1 只有冻结候选，尚未准入实现。
你的职责: 只读审查 P1 架构/schema/runtime/compiler 与版本裁决；不得修改实现文件。
先读: AGENTS.md；docs/phase2/READ-FIRST.md；本卡 R1-R4、G4/G7 与
  「P1: schema / save / MG2 设计冻结」全文；
  packages/content/src/{script,index,character,project-upgrade}.ts；
  packages/reforge/src/{main,script-runner}.ts；
  packages/reforge/src/save/{types,ops}.ts。
重点复审:
  1. 保留并升级 EntityPage 为稳定 PageId mode、行为正文放本地 trigger/auto registry，是否真正
     避免第二套 mode/page 权威；
  2. world 的 Page/slot/hook 三态、稳定 FlowCursor、复合 EntityAddress 与 safe-point
     barrier/epoch-CAS 是否形成唯一可变真值，并覆盖 inherit 与非 tail self-switch；
  3. Scene hook variant 与 ScriptFlow/stateMachine/lowering 分层是否消除 canonical 私有块；
  4. call-return、tail-transfer、auto 并行/authority/100-40-120-150-200ms 语义，以及
     P2-P6 shadow `ScriptMigrationIR` / P7 原子发布边界是否被忠实锁定；
  5. N3-1 使用 contentVersion 5、SAVE version 5、A7-4 顺延 6 是否同意。
输出要求: 在本卡「P1 设计推进签字」和交接日志签 `agree`，或写 `counter` 的具体字段、反例、
  风险和替代方案。不得开始实现，不得改 Status/done。
```

### 给 GLM（P1 save/MG2/ledger/测试矩阵设计复审）

```text
复审任务: N3-1 P1 schema/save/MG2 冻结候选——数据与迁移主审
任务卡: docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态: build；P0 已由三方 accept；P1 只有冻结候选，尚未准入实现。
你的职责: 只读审查 P1 save/MG2/identity ledger/升级事务与测试矩阵；不得修改实现文件。
先读: AGENTS.md；docs/phase2/READ-FIRST.md；本卡 R1-R3、G4/G6 与
  「P1: schema / save / MG2 设计冻结」全文；
  packages/migrate/src/migration-{baseline,merge,plan,write-plan,transaction}.ts；
  packages/migrate/src/script-library-normalize.ts；
  packages/reforge/src/save/{types,ops}.ts；
  packages/editor/src/core/{open-local,project-io,upgrade-local-v3-actions}.ts。
重点复审:
  1. full transition ledger + save compatibility sidecar 是否覆盖 old id、inline multi-ref binding、
     四类 flat cursor、single/broadcast-v4、tombstone/TransitionGroup 与确定性；
  2. base/ours 完整 snapshot 预升级再三方 merge、Page/stage lineage、作者修改保护与任一
     conflict 零写是否完整；
  3. SAVE envelope/content 两轴顺序、5/5 无历史 sidecar、允许/拒绝矩阵、旧 stage 逐目标钳位、
     失败输入不变和 minimumSaveVersion 硬闸；
  4. baseline v2、project/baseline/ledger/sidecar/manifest 两类事务、write/delete journal 与
     “只能前滚”说明是否准确；
  5. P1-8 是否足以覆盖 e2493/e2495、s018、s188、863+2482、全命令 388 auto +
     202 trigger + 60 onEnter + 1 onTeleport（并对账 342/198 引用子口径）与双跑零计划。
输出要求: 在本卡「P1 设计推进签字」和交接日志签 `agree`，或写 `counter` 的具体缺口、断言、
  数据反例和替代方案。不得开始实现，不得改 Status/done。
```

### 给 Codex（P1 准入实现，从 P2 开始）

```text
接手任务: N3-1 P1 准入实现——P2 上游剪枝与错误命名退役（shadow 形态）
任务卡: docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态: build；P1 三方设计 agree 齐（2026-07-24），P1 实现准入 allowed。
你的角色: Coding Owner——build 阶段唯一实现文件修改者。
先读: 本卡「P1: schema / save / MG2 设计冻结」全文（P1-1 影子纪律、P1-7 ledger、P1-8 矩阵）；
  GLM P1 复审 G1-G5 与 Kimi 签字附两项补正；P0 基线 pal-v1.json 的 folded/debts 节。
已实现约束: P2-P6 只产出 gitignored 影子根 packages/migrate/.shadow/N3-1/v5/ 与累计
  transition ledger，每批从权威 v4 重跑完整纯变换；ScriptMigrationIR 只放 experimental/script-v5
  边界；不得改 CONTENT_VERSION、当前 v4 validator、HTTP/runtime loader、projects/pal 或权威
  baseline；各批同时跑当前 v4 根门禁与 phase shadow 门禁。
本批待落（含审查核对待落项）: P2 精确 863+2,482 tombstone（P0 证据 + 枚举 reason）；
  s018 异常归属；停止生成 shared/scc-* 误导命名；GLM G1（trigger 最终冻结为 202，
  并验证 198 stored-body ref + 3 inline + 1 s018 scene-direct 守恒）；
  Kimi 补正（final=0 门禁显式枚举 192 处 setEntityTriggerMode + 1 处 clearSceneScripts）；
  重迁后双跑零计划并凭 ledger 证明无作者内容被删除。
输出要求: 每批在 Build 节留实现摘要、影子门禁与双跑证据；遇设计钉子不成立时留 build 或
  转 blocked 并写清原因，不跨批堆债；不得提前标 done。
```
