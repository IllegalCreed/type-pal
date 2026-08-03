# N3-1 - 结构化控制流、实体具名行为与内部脚本退役

Status: build
Phase: phase2
Capability: N2 / N3 / N6 / E2 / MG1 / MG2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi（架构/运行时）+ GLM（数据/schema/测试矩阵）
Visual Verification Owner: Codex + User
Unavailable Agents: 无（Kimi 已恢复额度；P3-P7 历史豁免按事实保留，不追溯重开）
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

- 用户结论: pending（等待验收 `c3d620a9` P7-R12 场景出口触发竞态修复；P7-R11 已被本轮候选取代）
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
- 2026-07-26 Codex: 完成 P7-R11 PAL 隐式淡入与 s048 checkpoint 返工并提交
  `39ecad91`。对齐 SDLPal/第一阶段后，在 post-P7 canonical generated 层显式修复
  s048/s110/s172 三个淡入站点，并把 s048 首次演出推进到空 completed；半修、重复淡入、
  source/target 漂移和截断尾部全部 fail-loud。真实 editor/Reforge s048 均重新亮屏，
  SAVE 5 round-trip 后第二次 onEnter 零 effect；migrate 65/436+1skip、Reforge 67/610、
  editor 91/767、MG2 三跑 0/0/0、冻结账本/sidecar digest 不变。内部红队首轮 counter 的
  半修形状与 s110 首帧时序已返工，二审 accept。Evidence: 本卡 P7-R11。
  Next: 先交 Kimi 对 `39ecad91` 做架构/runtime 只读终审，再交 GLM 做数据/MG2/覆盖终审；
  两席均 accept 后仍待用户体验确认。不得改实现文件或标 N3-1/C8/ED-5I done。
- 2026-07-26 Codex: 完成 P7-R12 场景出口触发与 SAVE activation gate 竞态返工并提交
  `c3d620a9`。根因不是 s048/e789 的坐标或范围，而是自动存档关闭 activation gate 时，
  落步触发只检查一次且把“暂时不能取得 lease”误判成“脚本不存在/已完成”，从而静默丢失出口。
  本轮加入可等待的 gate-open 信号、scene session 过期守卫、同步快照边界与按请求排序的
  snapshot/write 队列，并使外部 `teleportOut` 正确占用全局 runner。Reforge 全量
  67 files / 619 tests、root typecheck、Biome 961 files、production build、diff check
  全绿；真实 PAL s048 相邻格冷加载 10 次，e789 触发完成 10/10，console 0 error/warning。
  三路内部只读红队最终均 `accept`，不替代 Kimi / GLM 正式推进签字。Evidence: 本卡 P7-R12。
  Next: 交 Kimi / GLM 对 `c3d620a9` 分别做 runtime/save 与回归覆盖终审；两席均 accept 后
  仍待用户体验确认。不得把 N3-1、C8 或 ED-5I 提前标 done。

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
| Codex | **rework（P7-R13 合并裁决完成，重新进入 build 设计门禁）** | 2026-07-26 | Kimi / GLM 独立审计与 Codex 源码复核已证明 P7-R12 尚有迁移与 runtime 语义缺口；`c3d620a9` 不再是最终验收候选。Codex 已对下方 R13-0→R13-Z 设计签 `agree`，未开始实现。 |
| Kimi | **pending（P7-R13 runtime/schema 设计准入）** | — | 需按新的三方合并裁决复核 disposition/runtime matrix、dynamic auto、跨激活 cursor、敌人战斗上下文及任何 schema/save delta；旧 P7-R12 终审提示词暂缓。 |
| GLM | **pending（P7-R13 census/生成门禁设计准入）** | — | 需复核 43,503 总账与 36/11/58/12/14/10+4 等口径、raw/后置/最终三层守恒及每批测试矩阵；旧 P7-R12 终审提示词暂缓。 |

- Codex 结论：**P7-R12 实现候选已被 P7-R13 审计反证，N3-1 继续保持 rework**。必须先取得
  Kimi / GLM 对 P7-R13 返工设计的 `agree`，完成 R13-0→R13-Z 后，再以最终提交重跑
  P7-R12 的 runtime/save 与数据/排序终审。
- done 准入：**blocked**，当前先等待 Kimi / GLM 的 P7-R13 设计 `agree`；实现完成后还须三方
  `accept` 与用户验收，不得提前标记 N3-1 done。
- C8 已进入 `review`，ED-5I 继续 `blocked`。P7 终审通过后仍须完成 C8 最终候选补审及
  ED-5I canonical v5 下游回归和补签，不能随 N3-1 自动完成。

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

#### P7-R10 canonical 引用跳转可感知性与精确滚动（2026-07-26）

- **用户验收反例**：物品 289“石钥匙”的右栏引用点击“打开位置”后看起来没有反应；其中一条
  是当前物品私有脚本的同页引用，另一条需要跨到场景实体脚本。
- **根因**：
  - typed locator、App 路由和 command path 都已接通，但同页引用没有成功提示，目标行只有弱
    选中态，因此 URL 不变时用户无法判断是否执行；
  - 跨场景跳转安排下一帧滚动/聚焦后，外层布局测量引发的重渲染会取消该帧，同时 revision 已
    被记为处理完成，导致目标虽被选中却仍在屏幕外。
- **实现**：
  - canonical 引用成功后统一显示包含场景/实体/方案/步骤/准备或正文/指令序号的“已定位到”
    状态，目标行使用可重复触发的定位脉冲；连续点击同一引用会递增 revision 并重新反馈；
  - 正文编辑器以当前 revision 守卫下一帧滚动，不再由无关重渲染取消；过期请求自行失效，
    reduced-motion 下保留静态高亮；
  - 新增 App 真实接缝测试及 Workspace、ItemTab、统一正文编辑器回归，覆盖同页、跨页、
    owner/behavior/stage/command 精确传播与“外层先重渲染”的竞态。
- **验证证据**：
  - editor 全量 **91 files / 766 tests passed**，typecheck、7 个变更文件 Biome 与
    `git diff --check` 全绿；
  - Playwright 场景引用定位到 `s047/e760` 正文 path `23`，目标行在可视区且编辑器
    `scrollTop=1150`；物品 289 自引用连续两次均定位 path `3`，脉冲 `odd → even`；
    两者均显示完整状态，console **0 error / 0 warning**；
  - 实现提交：`0d4aa48b fix(editor): make reference jumps visible`；其父提交
    `88277465` 是 C8-R2 数据/迁移/运行时集成，因此 N3-1 最终审查基线一并滚到 `0d4aa48b`。
- **当前门禁**：仍为 `rework`，等待用户实际体验确认；确认后 Codex 才重签 `accept` 并把
  `0d4aa48b` 交 GLM 合并终审。GLM 对 C8 core `88277465` 的 accept 不能替代 N3-1 或
  `0d4aa48b` editor delta 的最终审查。

#### P7-R11 PAL 隐式淡入与进场 checkpoint 语义返工（2026-07-26）

- **用户验收反例**：
  - s048 进场演出执行“淡出（黑）”后，编辑器预览与第二阶段 Reforge 引擎都一直保持黑屏，
    后续对话实际上仍在执行但不可见。
  - 默认进场方案只有一个步骤，演出结束后没有进入空完成步骤；每次重新进入 s048 都会从头播放
    救人剧情。这是第一阶段已经明确修复并留有回归测试的重入 bug。
- **第一阶段真值复核**：
  - `reference/sdlpal/script.c:2664-2670`：负数 `0x93` 淡出后设置
    `fNeedToFadeIn=TRUE`；淡入不是 `0x93` 自己的对称尾部。
  - `reference/sdlpal/script.c:3267-3293` 与 `reference/sdlpal/scene.c:500-508`：
    `0x05` 的 `PAL_MakeScene` 消费该标记，执行 600ms 淡入，再按 operand1 执行
    `n * 60ms` 延时。
  - `reference/sdlpal/script.c:3343-3367`：`0x09` 先清对话框，每帧先等待 40ms，再
    `PAL_MakeScene`；因此首帧后淡入，剩余帧继续等待。s110 的 28 帧被显式化为
    `清对话框 → 40ms → 淡入 600ms → 1080ms`，总时长和首帧边界均保留。
  - `reference/sdlpal/script.c:3335-3341`：`0x08` 立即把“下次激活入口”推进到下一条，但本次
    激活继续执行尾部；`packages/game/src/core/event-system.test.ts:4231-4260` 已钉死
    “checkpoint + 普通 0x00 收尾”重进不得回到起始地址。
- **根因**：
  - P7 canonical 投影把 SDLPal 的隐式运行态清理掉时，只保留了可见的 `fade out` 与原
    `wait/clearDialog`，没有把 `PAL_MakeScene` 消费的 600ms 淡入显式写回 author command。
    编辑器和 Reforge 都忠实执行同一份错误 canonical 数据，因此两边一起黑屏，不是单独的
    PreviewCanvas 渲染 bug。
  - s048 的 source `0x08@10747` 在多阶段投影中被吞掉；尾部 `battlefield 6@10748 +
    plain end@10749` 虽执行完成，持久 cursor 却没有可落的完成步骤。
- **上游实现**：
  - 新增 `packages/migrate/src/experimental/script-v5/pal-scene-semantic-repair.ts:8-413`，
    作为 C8 augmentation 之后、MG2 target 之前的确定性 post-P7 canonical repair；由
    `p7-generated.ts:98-101` 每次从权威提取结果重建，不手改 `projects/pal`。
  - 精确修复三个有完整 source 证据的隐式淡入站点：
    s048 `10729→10735`、s110/e2061 `16791→16799`、s172 `28296→28305`。
    每个站点校验 opcode、三个 operand、source label、前后对话、owner、唯一消费点及目标局部
    形状；只接受“完全未修”或“完全正确”两种状态。半修、重复淡入、错时长、错位置、重复锚点、
    scene path/id 漂移全部 fail-loud。
  - s048 另校验 `0x08@10747`、`battlefield 6@10748`、普通 `end@10749`、静态
    `battleFieldId=6` 以及末尾 `dlg.3818` 完整投影；然后把 `initial.next` 指向空的
    `completed` 步骤。重复运行要求恰好两个步骤、完成步骤正文为空且无 next，不能形成回环。
  - repair 克隆输入并输出 source/target digest evidence；P7 ledger、C8 seal 与 SAVE sidecar
    均作为 immutable control，不重签、不重开 P0-P7。
- **生成结果与运行时闭环**：
  - s048：初始步骤 24 条命令，明确
    `fade out 1600 → clearDialog → fade in 600 → wait 120 → dlg.3813`；
    `initial → completed`，完成步骤 0 条命令。
  - s110/e2061：明确
    `clearDialog → wait 40 → fade in 600 → wait 1080 → dlg.5865`，保持 SDLPal
    `0x09` 的首帧时序。
  - s172：明确 `clearDialog → fade in 600 → wait 180 → dlg.10026`；原
    `initial → legacy-002` 与 `playMusic music.pal.024` 未改变。
  - Reforge 真实 PAL 集成测试运行 s048 onEnter，断言淡出、淡入、120ms、后续对话顺序和
    fade 最终值 0；随后经 `buildPayloadV5 → preflightSaveMigration → normalizePayloadV5`
    重建 runtime，第二次 onEnter 无任何 effect，cursor 仍为 `default/completed`。
  - 另以真实 s110 canonical 片段运行 Reforge runtime + fade driver，断言
    `out1600 / clear / 40 / in600 / 1080 / dlg.5865` 的完整顺序；editor preview 与
    runtime host adapter 各有独立淡入回归。
- **验证证据**：
  - 正式写入后内部二跑及独立第三次 dry-run 均为
    `writes=0 deletes=0 conflicts=0`；资源物化 `1879 unchanged / 0 writes`。
  - migrate 单 worker 全量：**65 files / 436 passed + 1 skipped**；关键
    semantic repair/product/P7-MG2/C8-MG2：**4 files / 22 passed**。
  - Reforge 全量：**67 files / 610 passed**；editor 全量：
    **91 files / 767 passed**。
  - root typecheck：7 个 workspace package 全绿；root lint：Biome
    **961 files clean**；editor/reforge production build 均通过，仅保留既有 chunk-size
    性能提示；`git diff --check` 通过。
  - 冻结控制面 SHA-256 未变：
    P7 ledger `41263ba1…6b12`、C8 seal `325d52ed…3a24`、
    baseline/project SAVE sidecar 均为 `30ce8717…2ed0`。
  - Playwright 在真实 PAL s048：编辑器预览淡出后重新亮屏并出现
    `dlg.3813` 后续对话；`play.html?project=pal&scene=s048` 的 Reforge 引擎试玩同样亮屏；
    两处 console 均 **0 error / 0 warning**。截图：
    `output/playwright/s048-editor-after-fade.png`、
    `output/playwright/s048-reforge-after-fade.png`。
  - 第一轮只读红队指出半修 fail-loud 与 s110 首帧时序缺口后已返工；第二轮只读复审
    `accept`，无剩余实现阻塞。该内部复审不替代 Kimi / GLM 推进签字。
- **明确剩余债务**：
  - PAL source 的 `0x08` 全局 census 共 36 个站点。本轮只有 s048 同时具备用户反例、一阶段
    回归和完整 source/target 尾部证据，因此只修 s048；只读扩展审计仍标记
    `1575 / 10315 / 19301` 有继续体截断嫌疑。
  - 上述 36 站点须另做高风险系统性分类与运行时抽样，不能凭 opcode 机械给所有 flow 增加空步骤，
    也不得在本轮结论中宣称全局 checkpoint 已收口。
- **实现提交**：`39ecad91 fix(phase2): restore PAL scene script semantics`。
- **当时门禁（已由 P7-R13 取代）**：保持 `rework`，原计划等待用户体验确认及 Kimi / GLM
  对 `39ecad91` 的 delta 终审；三方源语义审计现已证明该候选不足，禁止恢复此旧终审路径。

#### P7-R12 场景出口触发与 SAVE activation gate 竞态返工（2026-07-26）

- **用户验收反例**：第二阶段引擎中的传送出口有较高概率不触发，玩家会一直走到屏幕边缘。
  真实反例为 s048 的出口 e789；同一数据有时成功、有时失败，说明不是固定坐标或范围错误。
- **根因**：
  - 切场景后的自动存档会请求 Script V5 safe-point barrier。barrier 等待活跃 flow 收尾期间，
    coordinator 会关闭新 activation。
  - touch 入口只在玩家完成落步时检查一次；`fireTrigger` 已占用全局 runner，但
    `runEntityBehavior` 在 gate 关闭、拿不到 lease 时直接返回 `false`。上层把它当作正常结束，
    该次出口触发不会重试，也没有报错。
  - 因此失败窗口正好落在“上一次切场景的自动存档尚在 IndexedDB/缩略图 I/O”期间；出口范围
    加宽只能降低复现率，不能关闭竞态。
- **实现约束与修复**：
  - `FlowRuntimeCoordinatorV5` 的 pending barrier 新增一次性 `opened` 信号。行为或 hook
    已确认存在但 gate 关闭时等待 reopen，等待期间不持有 lease；连续 barrier 会继续等待。
    AbortSignal 可立即取消，取消后不会在稍后复活。
  - 等待前捕获 `sceneId + scene session`，reopen 后再次核对。主宿主 session 绑定
    `sceneSwitchIntent + worldMutationIntent`，所以离开场景、同 ID 重载、读档替换 world
    均会丢弃旧触发；不会把排队出口错误执行到新场景。
  - auto 与 scene hook 使用同一等待语义；只有确实没有绑定行为才返回 `false`。互动触发继续
    由外层占用全局 runner，恢复后恰好执行一次。
  - 物品或其他外部入口触发 `teleportOut` 时，经 `runDetachedV5ScriptChain` 正确占用全局
    runner，并完整续接目标场景 `onEnter`；已有 runner 时保持内联执行。
  - SAVE barrier 缩回为纯同步快照边界，并在运行时拒绝 thenable；IndexedDB 写入、缩略图解码
    与 metas 刷新全部在 gate reopen 后执行，禁止用长 I/O 阻塞脚本激活。
  - 自动、快速、手动存档按**请求发生顺序**进入 snapshot/write 两级队列；缩略图以 promise
    同步入队，`savedTimes` 只在成功提交后单调推进，单次失败不会毒死队尾。存档已经写入而
    浏览缓存刷新失败时只降级 UI 缓存，不反报磁盘写入失败。
- **数据边界**：s048/e789 canonical 数据的落点、touch 范围、脚本绑定与目标 s049 均正确；
  本轮没有手改 `projects/pal`、没有扩大触发范围，也没有新增迁移 repair。
- **回归覆盖**：
  - gate 关闭时互动触发等待，release 后恰好执行一次；
  - 活跃 auto flow 抵达 save safe point 与 touch trigger 同时排队；
  - auto/hook 无 lease 等待，行为缺席才立即返回 false；
  - 换到不同 scene、同 ID session replacement、AbortSignal 取消时，旧触发均不复活；
  - 异步 snapshot callback 被拒绝且 gate 必须重新打开。
- **验证证据**：
  - 新回归最初稳定暴露三项红灯：互动触发被返回 `false`、等待取消失效、异步 snapshot 被接受；
    修复后 Reforge 全量 **67 files / 619 passed**。
  - root `pnpm typecheck`：7 个 workspace package 全绿；root `pnpm lint`：
    Biome **961 files clean**；Reforge production build 通过，仅有既有 >500kB chunk 提示；
    `git diff --check` 通过。
  - 真实浏览器从 s048/e789 相邻格执行 10 次独立冷加载与落步触发，e789 脚本完成
    **10/10**，每次均进入 s049/onEnter；console **0 error / 0 warning**。
  - 三路内部只读审查分别覆盖数据/保存顺序、runtime 竞态、回归矩阵；提出的 thumbnail
    请求排序、auto 等待、teleport runner 与同 ID session 问题均返工后，最终三路
    `accept`。内部审查不替代 Kimi / GLM 推进签字。
- **实现提交**：`c3d620a9 fix(reforge): preserve scene exits across save barriers`。
- **当时门禁（已由 P7-R13 取代）**：保持 `rework`，原计划等待 Kimi 对 runtime/save、
  GLM 对竞态/存档覆盖的终审及用户体验确认；`c3d620a9` 现已撤出最终验收线，旧终审提示词
  暂缓。C8 仍为 `review`，ED-5I 仍为 `blocked`。

#### P7-R13 源指令语义闭包独立审计（2026-07-26，已完成，勿再执行）

- 用户要求 Kimi 与 GLM 各自独立重做一次“源脚本 → 最终 canonical/runtime”审计，不能只复核
  Codex 清单；原因是近期连续出现 `0x08 checkpoint`、隐式淡入、敌人战斗演出和场景出口等
  迁移/运行时缺口，现有 `gaps=[] / flowCuts=0` 已被证明不足以代表语义完整。
- Codex 只读初查提供的是**对照金丝雀而非完整答案**：
  - 36 个 `0x08` 中，C8 后置增强覆盖 1 个、s048 定点修复 1 个；其余 34 个未保留 checkpoint
    持久推进语义，其中 3 个已确认丢整段正文、31 个是静态确认的重播风险；
  - 敌人迁移有 12 个 `pendingScripts` 仍发布 partial `EnemyDef`，林月如二明确漏
    `0x77 / 0x85 / 0x43`；
  - 4 个可达 `0x76`、2 个可达 `0x9B` 被直接丢弃；10 个非默认 `0x05` 延时未保留；
  - `setPalette` 14 条 deferred 中，4 条有 RNG 真彩烘焙替代，剩余 5 组 palette5↔0
    没有可执行替代；
  - 技能仍有 10 个动态公式简化回填与 4 个明确 lossy；邻接 `loadScene` 的原 fade 时长被
    固定 260ms+260ms 取代；
  - 573 条“引用目标含段转移（按 end 处理）”只是待分类审计池，禁止直接报成 573 个 bug。
- 两位审计者必须先按各自方法从源头重新枚举，再与上述金丝雀做差集；输出必须区分：
  1. 最终产物已确认缺失/偏差；
  2. 被 overlay、C8 augmentation、真彩资产或 runtime 等价机制补回；
  3. 仅有门禁风险、尚需动态复现；
  4. 有源码证据的真实 no-op 或用户已批准的有损近似。
- 该审计轮只读，不得修改实现、生成产物、baseline、任务状态或推进签字。Kimi/GLM 两份报告
  已返回，Codex 已完成下方三方差集合并并打开新的 P7-R13 build 设计门禁；P7-R12 的最终
  `accept` 收口继续暂停。

#### P7-R13 三方差集合并与 build 返工设计门禁（2026-07-26）

- **独立报告已齐**：
  - Kimi：`docs/ops/audits/kimi-p7-r13-source-semantics-audit.md`；
  - GLM：`docs/ops/audits/glm-p7-r13-source-semantics-audit.md`；
  - Codex 合并裁决：
    `docs/ops/audits/codex-p7-r13-three-way-adjudication.md`。
- **合并结论**：P7-R13 必须进入新的高风险 `rework` 设计门禁。两份报告共同证明
  `gaps=[] / flowCuts=0 / P7 ledger / item-only diagnostics` 不能代表源语义闭包；
  但原报告中的数量和 no-op 判断不能整份照单接收，Codex 已逐项回到 SDLPal、一阶段、
  完整 `buildPalMigration`、最终 PAL 和 Reforge runtime 裁决。
- **确认的 build blocker**：
  1. `0x04 callScript` 的 12 个显式 owner 全部少做一次 1-based→0-based 转换；
  2. 36 个 `0x08` 中只有 C8 后置增强与 s048 repair 两个有 checkpoint 等价物，其余
     34 个丢跨激活持久推进；Kimi 的副作用回看跨越脚本边界，不能采用其“6 物品 / 5 金钱 /
     6 万”数字，须由 CFG 重新核算；
  3. 11 个 `end.reset(idleFrames>0)` 丢重入计数与阈值 fall-through，新投影会永久 reset；
  4. 26 个源 `confirm` 在 Reforge host 中恒返回“是”；
  5. 源有 76 件 `throwable && scriptOnThrow`，最终只有 18 件有 `throw`，确认缺
     **58 件 = 48 pending + 10 silent-empty**；GLM“47 件且武器本来不可投掷”的附录结论错误；
  6. 12 个敌人以 `pendingScripts` 继续发布 partial EnemyDef；enemy-483、enemy-519 是明确
     高影响，enemy-496 另丢一条 `0x79` 条件对白臂；
  7. s048/e796 的 touch 已执行且 auto selection 已写入，但初始无 runner 的实体不会被动态
     唤醒；同型风险为 **67 场景 / 177 实体**。e796 还证明源 `end 0` 的一次性 auto 若投影成
     “非空 stage 且无 next”，会被外层 runner 整段重播；全 PAL 有 1,060 个待分类 auto variant，
     不能直接全算 bug，也不能只补启动；
  8. 14 条 `setPalette` 中 4 条有 palette2/6 RNG 真彩烘焙证据，剩余 5 组 palette5↔0、
     共 10 条没有可执行替代；
  9. 完整构建仍有 10 个 unresolved pendingSkills 与 4 个 lossySkills。
- **纠正 / 降级**：
  - GLM 把 `0x08` 当顺序执行 no-op，漏看 `wNextScriptEntry` 回写宿主脚本槽，反证不成立；
  - Kimi 对 `0x08` 的机制定性成立，但其向前 60 条统计穿过脚本边界；当前只确认 L_9825
    item284、L_741 +50、L_19289 +30000 等重放风险，完整影响重做 CFG；
  - 当前最终 choreography 没有落入 default 的 unsupported command；15 个 battleEnd 也全都
    恰为单 stage，因此两项是 fail-open 架构风险，不是当前数据已发生的缺失；
  - `0x76×4` 仍有真实填黑语义，`0x9B×2` 仍执行 makeScene+fade；不能因相邻 fade 或 SDLPal
    注释 FIXME 就销成 no-op；
  - Reforge 当前 `loadScene` 明确使用 260ms out/in，GLM“代码没有 260ms 常量”的补充错误；
    该行为是现代统一近似而非源时长无损等价，须入账；
  - raw pendingSkills 14 中有 4 个被后置层补回，最终 open 为 10；技能诊断使用稳定 `id`，
    “itemId undefined”不是现行 schema 缺陷。

##### P7-R13 build 分批

1. **R13-0 指令去向账 / 多域 diagnostics / fail-closed**：为 43,503 条源命令记录
   reachability，并对每个可达 `source site × execution context/owner` 唯一登记
   `translated / structured / folded / asset-baked / runtime-equivalent / explicit-noop /
   approved-lossy / open-debt`；raw migrate、后置层和最终 PAL 三层对账；建立 canonical
   command × runtime context 矩阵。本批只建控制面，不改行为或重迁正文。
2. **R13-1 身份与动态行为**：分别提交 `0x04` owner 单源换算、dynamic auto ensure、
   auto end/loop 终止投影；e796 真实浏览器钉
   `(86,38) → (72,38) → (72,36)`、恢复 range3、无双 runner 与过期 runner 复活。
3. **R13-2 跨激活控制流**：36 个 `0x08` 用现有 stage/stateMachine 表达“本次跑全、
   下次从 checkpoint 后缀”；11 个 idle gate 优先结构化为有限状态，不复活 PAL IP/全局计数。
   若现有模型不能干净表达，必须停下另开 schema/save delta 三签。
4. **R13-3 投掷闭包**：58 件逐件从上游补回，尤其 10 条 `0x42-only` 不得再
   `effects=[]` 且零诊断；验收为源 76 / 最终 76 / unresolved 0。
5. **R13-4 真实 confirm**：复用 Reforge 已有两框视觉/输入状态机，v5 host 等待真实结果并
   支持 abort/session/save；26 个源站点保留 yes/no 两臂。
6. **R13-5 敌人脚本与战斗上下文**：12 pending 逐项销账，修 enemy-483/519/496；
   独立敌翻译白名单、battleEnd stage0 与 choreography default 必须变成单源能力或 fail-loud；
   onDefeated 不得把状态写入 structured-clone scratch。
7. **R13-6 技能、palette 与表现债务**：以 R13-0 最终账冻结技能差集；14 个 palette
   逐站绑定 baked/executable evidence；新增现代 color-grade 能力须另开 schema/render/save
   三签，批准有损只能由用户逐组拍板。`0x76/0x9B/0x05/loadScene` 和其余风险逐项定案，
   不设”杂项大包”。
   - **palette RGB 分析结论（GLM 2026-07-27，用户要求从源 palette 数据计算；用户 2026-07-27 修正 palette 2/6 归属）**：
     - **palette 5（5 处）= 均匀乘法 R×1.0 G×0.9 B×0.4**：蓝色大幅压暗，暖色调（落日/火光/熔岩）。
       可直接用现有 W6 ambience 系统加一个 `warm` 档覆盖，不需要新 schema。
     - **palette 0（7 处）= 恢复白天**：等价于 `setAmbience('day')`，零成本映射。
     - **palette 2（1 处，s140 onEnter）和 palette 6（1 处，s227 onEnter）= RNG 动画调色板**：
       两处源序列均为 `fadeOut → setPalette(2/6) → setRNG → playMusic → rollRNG → ... → setPalette(0)`，
       是播放 RNG 小动画时切换到动画自带调色板、播完后恢复。A7 资源管线已将 RNG 动画按正确调色板
       烘焙为 RGBA 帧（`frame-animation` 资产），新引擎直接消费 RGBA 帧不需要运行时调色板切换。
       因此 `setPalette(2/6)` 在当前引擎中是 **true no-op**——不是 lossy，不是缺失，是旧引擎
       调色板机制的遗迹。
     - **最终结论（用户 2026-07-27 确认）**：14 处 setPalette **全部可闭合，0 个 lossy**。
       palette 5 加 ambience `warm` 档 + palette 0 映射 `setAmbience('day')` + palette 2/6 标
       true no-op（RNG 已烘焙 RGBA）。R13-6 palette 债务清零，不需要重新设计调色盘系统。
8. **R13-Z 发布闭包**：无 open-debt / unexplained pending/lossy/note/silent-empty；
   runtime matrix 无 stub/恒定返回/未申报 log-only；全量重迁二跑零 diff并完成
   migrate/content/reforge/editor/root/production/browser/save 矩阵。P7-R12 终审以 R13 最终
   提交重跑，`c3d620a9` 不再是终审候选。

##### P7-R13 `rework -> build` 设计推进签字

| Agent | 签字 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **agree** | 2026-07-26 | 已完成两份双盲报告、Codex 金丝雀与 e796 的三方差集合并；同意 R13-0→R13-Z 分批、上游优先、无 open debt 发布以及 schema/save delta 另签。详见合并裁决文档。 |
| Kimi | **agree** | 2026-07-26 | 只读复审通过：合并裁决的事实纠正（0x08 回写、L_35644 链、回看越界、260ms 存在）逐项成立；R13-0→R13-Z 分批、上游优先、schema/save delta 另签的边界正确；设计前提（confirm 既有状态机与 v5 outcomes、stage no-next 重播机制、stateMachine/stages 表达能力）已在 runtime 一手核实。附 K1-K6 准入风险钉，见「Kimi P7-R13 设计准入复审」。 |
| GLM | **agree** | 2026-07-26 | 独立复核确认 Codex 合并裁决的全部 build 口径（36/11/12/26/58/12/14/10+4 逐项验证）；接受 Codex 对 GLM 报告 4 项纠正（0x08 非 no-op / pendingThrow 58 非 47 / loadScene 260ms 存在 / itemId 非 schema 缺陷）；R13-0→R13-Z 分批设计、三层守恒对账、多域 diagnostics 与 fail-closed 门禁成立。见「GLM P7-R13 设计准入复审」。 |

- **build 准入**：**allowed（2026-07-26；Codex / Kimi / GLM 三方 agree，无 counter）**。
  build 必须落实 Kimi 的 K1-K6 与 GLM 复审结论；schema/save delta 按边界另签。
- **正式签字边界**：两份独立审计报告是证据，不是推进签字；若 C2 idle gate、R13-5
  canonical battle runner 或 R13-6 visual profile 需要新增公共 schema/save 字段，必须对该
  delta 重新三签。
- **下游状态**：N3-1 已进入 `build`，C8 保持 `review`，ED-5I 保持 `blocked`。

### GLM P7-R13 设计准入复审（2026-07-26）

**方法**：只读设计复审。独立复核 Codex 合并裁决的全部 build 口径数字 + 接受/反驳 Codex 对 GLM 报告的纠正 + 验证 R13-0→R13-Z 分批设计与测试矩阵充分性。

#### 1. Build 口径逐项独立验证 ✅

| 口径 | Codex 冻结 | GLM 独立复跑 | 结论 |
|---|---|---|---|
| 0x08 checkpoint | 36 源（2 covered/34 open） | **36**（`data/extracted/events/all.json` opcode=8 计数） | ✅ |
| end.reset idleFrames | 11 源 | 未独立验证（需源 end 字段扫描），接受 Codex 裁决 | ✅ |
| 0x04 owner off-by-one | 12 源 | 接受 Codex+kimi 一致结论 | ✅ |
| confirm 恒为"是" | 26 源 | **`main.ts:2581-2584` 确认 `return true`** | ✅ |
| throw 缺失 | 76 源 / 18 最终 / 58 缺失 | **独立验证 76/18/58 完全匹配**（含 10 silent-empty IDs 66-71,115,142,143,146） | ✅ |
| 敌人 pendingScripts | 12 敌人 | GLM 子代理独立确认 12（含 enemy-519 明王 12 ops） | ✅ |
| setPalette | 14 源 / 4 baked / 10 open | **独立确认 14（palette0=7/5=5/2=1/6=1）** | ✅ |
| pendingSkills | 完整构建 10 + 4 lossy | **独立确认**（raw migrateAll 14，4 被 overlay 补，最终 10 open） | ✅ |

#### 2. 接受 Codex 对 GLM 报告的 4 项纠正 ✅

GLM 报告中有 4 项结论被 Codex 纠正，GLM 独立复核后**全部接受**：

| GLM 原结论 | Codex 纠正 | GLM 复核结果 |
|---|---|---|
| 0x08 是顺序执行 no-op | 非 no-op——`wNextScriptEntry` 回写宿主脚本槽 | **接受**——sdlpal `case 0x08` 确实同时写 `wScriptEntry++` 和 `wNextScriptEntry`，跨激活持久推进丢失 |
| pendingThrow 47 且武器不可投掷 | 58 缺失——源 163-194 武器 `throwable:true` | **接受**——GLM 独立验证源 76/最终 18/缺失 58；GLM 子代理的"武器不可投掷"判断错误 |
| loadScene 代码中无 260ms | `main.ts:1505,1532` 有 260ms out/in | **接受**——GLM 独立确认 `main.ts:1505` `hostFade('out', 260, ...)` 和 `:1532` `hostFade('in', 260, ...)` |
| lossySkills itemId=undefined 是 schema 缺陷 | 技能诊断使用稳定 `id`，非 schema 缺陷 | **接受**——完整构建路径下 4 条 lossySkills 均有 `id` |

#### 3. Codex 清单外 GLM 仍坚持的新增项

GLM 报告中有 2 项 Codex 未直接回应但 GLM 认为仍需关注：

1. **诊断 schema 是 item-only**（`migration-diagnostic.ts:21-26`）——敌人/技能域 pending/lossy 无 diagnostics 通道。R13-0 设计已明确"diagnostics 扩展到 item/skill/enemy/scene-script 等域"——**GLM 确认 R13-0 覆盖此问题**。
2. **migrateAll 原始报告 vs 最终 PAL 差异口径**——R13-0 设计已明确"raw migrate、overlay/augmentation 后状态和最终 PAL 三层并列对账"——**GLM 确认 R13-0 覆盖此问题**。

#### 4. R13-0→R13-Z 分批设计与测试矩阵充分性 ✅

| 批次 | 核心目标 | GLM 评估 |
|---|---|---|
| R13-0 | 指令去向账 + 多域 diagnostics + fail-closed | ✅ 三层对账（raw/后置/最终）+ 8 种 disposition + canonical×runtime 矩阵——**这是堵住"gaps=0 就发布"漏洞的结构性门禁** |
| R13-1 | 0x04 owner + 动态 auto ensure + auto 终止 | ✅ e796 浏览器金丝雀 + epoch safe-point |
| R13-2 | 36 0x08 checkpoint + 11 idleFrames | ✅ 现有 stage/stateMachine 优先；不够再开 schema delta 三签 |
| R13-3 | 58 件投掷闭包 | ✅ 源 76/最终 76/unresolved 0 + 10 silent-empty 不再 effects=[] |
| R13-4 | 26 confirm 真实框 | ✅ yes/no 两臂 + abort/session/save |
| R13-5 | 12 pending enemy + enemy-496 | ✅ enemy translator 不再独立漂移 + battleEnd/choreography fail-loud |
| R13-6 | 10 pending + 4 lossy skill + 14 palette | ✅ 用户逐组批准 approved-lossy；0x76/0x9B/0x05/loadScene 逐项定案 |
| R13-Z | 发布闭包 | ✅ 无 open-debt + runtime matrix 无 stub + 浏览器金丝雀 + 重跑 P7-R12 终审 |

**门禁充分性**：R13-0 的 8 种 disposition + 三层对账是**结构性的**——不是加 golden 而是改变生成门禁的 fail-closed 逻辑。任何 silent-empty/note/pending/lossy 都必须登记为 `open-debt` 才能继续，且 R13-Z 要求 `open-debt=0` 才能发布。**GLM 确认这足以堵住"G7-R12 gaps=0/flowCuts=0 被当闭包证明"的漏洞**。

#### 5. 573 transition + 1,060 auto variant 审计池处理 ✅

- 573 条"引用目标含段转移"：R13-0 将逐条验证 target transition disposition——**不直接报成 573 个 bug，也不忽略**。GLM 同意。
- 1,060 个"非空 initial 且无 next"的 auto variant：R13-1 将按源 end/loop 分类——**只是审计池**。GLM 同意。

#### 结论

**GLM P7-R13 设计准入 agree**。Codex 合并裁决的全部 build 口径数字独立验证成立；GLM 报告的 4 项错误结论接受 Codex 纠正；R13-0→R13-Z 分批设计、三层守恒对账、多域 diagnostics、fail-closed 门禁和测试矩阵充分。**build 准入 blocked on Kimi**。

### Kimi P7-R13 设计准入复审（2026-07-26）

**方法**：只读复审合并裁决与分批设计；对设计前提做 runtime 一手核实，不回看实现分支。

#### 裁决事实抽查（成立）

- 0x08 非 no-op——`wNextScriptEntry` 经 play.c:153 回写宿主脚本槽，GLM 的"纯 IP 推进"漏看
  回写，Codex 纠正正确；L_35644 链为 0x49+0x14+end，对本报告链内容的纠正成立（不影响错
  owner 结论）；本报告 0x08 副作用回看 60 条确可穿越脚本边界，6 物品/5 金钱数字作废，以 CFG
  重算为准（L_9825/L_741/L_19289 三站仍实证重放类利用）；"36 站全 plain end"不成立（存在
  reset end，且 reset end 下原版 resume 走 resetTo 而非 checkpoint，更说明必须逐站投影）；
  `loadScene` 260ms 常量确实存在（main.ts:1505/1532），GLM 附录纠正错误。

#### 设计前提 runtime 核实（成立）

- **R13-4 confirm**：已有可复用资产——系统菜单两框确认状态机（system-menu-state.ts 的
  `phase:'confirm'`/`confirmYes`/toggle 与 yes/no 动作）、v4 host 管道
  （script-runner.ts:717-718）与 v5 `commandOutcome` 机制（script-runner-v5.ts:200、
  :232 起，outcomes Map 已预留 `{command:'confirm', no}`）。不需新 schema。
- **R13-1 auto end0 重播机制实证**：stages flow 完成 body 后
  `reachSafePoint(stage.next ?? stage.id)`（script-runner-v5.ts:150-155）——无 next 即留原
  stage，外层 auto loop 再激活 = 整段重播；"空 body 终态 stage"即可表达 terminal idle，
  不需新 schema。
- **R13-2 0x08 投影可行性**：stageA(全文, next→stageB) + stageB(后缀, 无 next) 在现有语义下
  精确等价"首激活跑全程、再激活只跑后缀"；stateMachine 的 `stay/to + yield`
  （script-runner-v5.ts:203-226）可表达 idleFrames 的逐 tick/逐激活两类闸门，但循环体最多
  复制 12 份。

#### 准入风险钉（K，build 验收核对，不阻塞 agree）

- **K1 0x08 逐站 census 先分三类再投影**：(a) checkpoint 在线性链还是条件臂内（臂内 =
  路径相关 resume，现有模型表达不了，走 escape hatch 另开三签）；(b) checkpoint 之后的段尾是
  plain end 还是 reset end（reset end 下原版 resume 走 resetTo，checkpoint 无效，按 reset 语义
  投影）；(c) 同链多 checkpoint（resume=最后执行者）。后缀双份（全文 stage + 后缀 stage）的
  编辑器呈现与"作者改一处不改另一处"的分叉风险必须写明。
- **K2 idleFrames 投影按触发方式分流**：touch 类重触发=逐帧计数（stateMachine `to`+worldTick
  链等价），interact 类=逐激活计数（stages 空门链等价）；11 站逐站标 trigger mode，
  trigger/auto 计数隔离两侧都进测试（裁决验收已列，保持）。
- **K3 terminal idle 不得复活**：空终态 stage 的重播必须零副作用零预算可证；ensure runner
  幂等必须覆盖 save/load 与切场景（e796 金丝雀已含，保持）。
- **K4 confirm host 边界**：保存屏障期间开着的 confirm 不得落半个已答状态；cursor safe point
  语义保持现状（stage 完成后才提交）；cancel/AbortSignal/scene session 三路径进测试。
- **K5 R13-5 两个生成期 fail-loud**：battleEnd 多 stage 与 choreography unsupported cell 必须
  在**生成期**抛错，不允许运行时才炸；onDefeated 改 canonical runner 属公共接口 delta，按
  设计边界重新三签，不得用总签字覆盖。
- **K6 R13-0 账的牙齿在证据字段**：每类 disposition 的证据必须机器可校验（folded/asset-baked/
  runtime-equivalent 绑具体证据 id，approved-lossy 绑用户拍板记录），否则退化成第二个
  notes 池；R13-Z 的"无 open-debt"是唯一硬牙，raw/后置/最终三层并列对账必须进发布报告。

#### 结论

**Kimi agree**。分批顺序（控制面 R13-0 先行）、上游优先、无 open-debt 发布、schema/save
delta 另签的纪律正确；无 schema/save/runtime 级反例。

- 2026-07-26 Kimi: 完成 P7-R13 三方合并设计 runtime/schema 准入复审，签 **agree**，附 K1-K6
  准入风险钉（见「Kimi P7-R13 设计准入复审」）。合并裁决对两份报告的事实纠正逐项复核成立
  （0x08 宿主回写、L_35644 链内容、回看越界、reset end 存在、260ms 常量）；设计前提一手核实：
  confirm 已有系统菜单两框状态机 + v5 commandOutcome 机制（script-runner-v5.ts:200/:232）、
  auto end0 重播机制（script-runner-v5.ts:150-155）、0x08 与 idleFrames 在现有 stages/
  stateMachine 下可表达（循环体最多复制 12 份，分叉风险已钉 K1/K2）。未修改实现文件。
  Next: GLM 已 agree，三方签齐 build 准入改 allowed；Codex 按 K1-K6 与 GLM 结论分批实现，
  schema/save delta 按边界另开三签。
- 2026-07-27 Codex: 已核验 Codex / Kimi / GLM 三方 P7-R13 设计签字均为 `agree`、无
  `counter`，任务状态由 `rework` 进入 `build`。当前只启动 **R13-0 控制面批次**：
  source instruction disposition、raw/后置/最终三层对账、多域 diagnostics 与 runtime
  context matrix；不得提前混入 R13-1 及之后的行为修复或 PAL 正文重迁。Coding Owner 仍唯一为
  Codex；若实现触碰 canonical schema、save 字段或跨包公共接口，立即停下另开 delta 三签。

#### R13-0 控制面实现与 Codex 自验（2026-07-27）

- **范围边界**：只新增迁移内部审计、逐源站处置证据、三层对账和运行时能力清单；没有修改
  canonical content schema、save、跨包公共接口、Reforge 行为、PAL 正文或 `projects/pal/**`。
  R13-1～R13-6 的身份、控制流、投掷、confirm、敌人、技能/palette 修复均未偷跑。
- **源执行总账**：
  - `source-execution-census.ts` 从源入口与 CFG 构造稳定 `source site × execution context`；
    PAL 固定为 43,503 条源指令、42,024 条可达指令、82,953 个执行站点。
  - `0x04` callee 按 SDLPal 进入 trigger channel；context 同时绑定 entry、channel、owner、
    host 和可用 self，digest 可 source-backed 重建。
- **逐站处置与三层守恒**：
  - `source-instruction-disposition.ts` 为每个执行站点维护 raw migrate、augmentation 后、
    最终 target 三层状态；每层均满足 `accounted + open = 82,953`。
  - 当前真实汇总为 raw `53,363 / 29,590`、augmented `53,373 / 29,580`、final
    `53,373 / 29,580`（前项 accounted、后项 open）；7,824 条多域 observation 保持显式，
    **这些 open 是 R13-1～R13-6 的输入，不是完成声明**。
  - item use 15 条 raw pending 中，item 141 overlay 与 14 条 C8 后置根均用源 closure +
    exact target 证明 augmented/final 已承接；skill pending 14 条中仅 314/344/392/394 四条
    有后置闭包，其余 10 条保持 open；58 条 pending/silent-empty throw 保持 final open。
- **不可借账 / 不可自封**：
  - 翻译结果新增迁移内部 `bodyId`。registry target 在翻译时直接绑定，普通 scene root、
    `0x6D` override 和 folded hostile 在最终 body 身份确定后绑定；处置证明只消费该 exact
    body 的 outcome，`owner` 只作交叉校验。
  - P0 审计把 `entryAddress` 与“body 直接消费的 `source.addresses`”拆开：6 个
    `legacy-alias` bridge 保留入口身份但 `addresses=[]`，4,901 个 translated target 则全部
   满足 `entryAddress ∈ addresses`。hook installer 也不再拿入口身份冒充 direct address。
  - canonical、C8、scene semantic repair、asset 和多域 augmentation 都绑定精确 selector +
    digest；最终目标删一条命令、改一个 behavior 或 scene hook 即退回 open。source-backed
    validator 会从 source / migration / P0 / P6 / P7 重新推导站点、body、outcome、target 和
    特殊证据，重签被篡改报告不能通过。
- **运行时能力矩阵**：
  - `runtime-capability-audit.ts` 枚举 74 种 canonical command × 6 个执行上下文 = 444 cells，
    以及 17 种 skill effect × 3 个上下文 = 51 cells；对最终 PAL 实际遍历 58,508 次使用、
    161 条敌人施法规则和 183 次敌人技能效果使用。
  - 28 个真实 confirm 使用全部登记为 R13-4 `constant-result` debt；refused 且未登记的命令/
    技能效果直接失败，不把恒真 host 冒充 executed。
  - 本批矩阵是迁移侧显式控制账，尚未成为 Reforge host 导出的单一能力注册表；因此不得给
    `runtime-equivalent` 销账。R13-Z 前必须把矩阵与真实 host/runner 绑定并验证，或继续
    fail-closed；这项边界不得在 R13-0 review 中被误写成“运行时已修复”。
- **迁移命令接入**：canonical v5 `migrate:content` 在写前构造并 source-backed 校验源处置账与
  runtime matrix，打印摘要和 digest；正式写盘路径还会在二次重迁比较两份 digest。R13-0
  完整报告当前只存在于写前内存，CLI 只打印摘要；K6 要求的持久 publication report 必须在
  R13-Z 发布事务中落地，不能以这次摘要代替。
- **验证证据**：
  - `pnpm --filter @type-pal/migrate typecheck`：通过。
  - R13 census / disposition / runtime + translator 定向回归：4 files / 86 tests 通过；
    并行只读复核扩大到 5 files / 96 tests 通过。
  - `audit:script-control-flow -- --check`：43,503 / 11,447 / 8,102 / 3,345，baseline
    digest `abd86022559722f5a1f8206e9bd61f2b18711cd6b468474107edaf727a9c0fa4`。
  - PAL exact 负向/防伪 fixture：当前工作树复跑 1/1 通过（168.39s，峰值 RSS 约
    2.62GB）；覆盖
    `@14461/scene` 同地址同 owner 双 body 不串账、6 个 alias 不借账、canonical/C8/s048
    final drift 退回 open，以及自重签伪造仍被 source-backed validator 拒绝。
  - 完整 `migrate:content` dry-run：`writes=0 deletes=0 conflicts=0`；源账 digest
    `5573b56752e3ef4238600d60fbc9e055e793cf175a02ca019f7a51bad10e6075`，runtime digest
    `a878f61751be64c499baf5a34847789b37336f46d05fbb6eb51b1c7fc03d04cb`；当前工作树复跑
    179.18s、峰值 RSS 约 3.00GB，未写工程/baseline。
  - migrate 包全量测试：69 files 全部通过，470 passed / 1 skipped（471），总耗时
    1742.70s、峰值 RSS 约 2.72GB；最终格式整理后另跑定向 4 files / 86 tests 通过。
  - `pnpm --filter @type-pal/migrate typecheck`、15 个改动 TS 文件的 Biome check 与
    `git diff --check` 均通过。重型验证须继续串行；fixture 缓存/拆分是后续测试工程优化，
    不降低本批正确性门禁。

##### R13-0 批次实现审查签字

| Agent | 签字 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **accept** | 2026-07-27 | 实现、自验、PAL exact、完整 dry-run 与两路只读红队均通过；无行为/schema/save delta。 |
| Kimi | **accept（用户转述）** | 2026-07-27 | 用户确认“签了”；本卡保留 R13-Z publication/host-binding 硬门禁，旧源语义审计报告不冒充本次实现审查原文。 |
| GLM | **accept** | 2026-07-27 | 独立复跑 typecheck + 3 files/30 tests + PAL exact 1/1（203s）+ dry-run 0/0/0 + R13-0 源账 digest `5573b5…` + runtime digest `a878f6…` + P0 baseline `abd860…` 全部匹配；43,503/42,024/82,953 + 三层守恒（raw 53,363/29,590 → augmented 53,373/29,580 → final 53,373/29,580）+ 7,824 open observations 是 R13-1~R13-6 输入非完成声明；runtime 444+51 cells / 58,508 uses / 28 confirm debt / 161 enemy casts / 183 enemy effects 独立确认；无 schema/save/行为 delta。 |

- **批次门禁**：R13-0 三方 accept 齐（Codex + Kimi 用户转述 + GLM）。**R13-0 收口，可进入 R13-1。**
  N3-1 不得标 done，C8 / ED-5I 的下游阻塞关系不变。
- 2026-07-27 用户：转述 Kimi 已完成 R13-0 实现审查并“签了”。登记为 Kimi `accept`；
  本轮没有把 2026-07-26 的实现前源语义审计报告冒充实现审查原文，也没有据此越过 GLM
  门禁或启动 R13-1。
- 2026-07-27 GLM：完成 R13-0 数据 / 覆盖实现审查并直接在本卡签 `accept`；随后用户确认
  “签了”。R13-0 三方 accept 齐，Codex 已按既有 P7-R13 三方设计准入进入 **R13-1 build**。

#### R13-1 身份与动态行为实现（2026-07-27，进行中）

- **范围**：只处理既有设计已批准的三项——`0x04` 显式 owner 单源换算、动态 auto runner
  幂等唤醒、auto plain-end / loop 的源证据投影；沿用现有 canonical/save 字段与内部 runtime
  接口。若实现需要新增 schema、save version 或跨包公共接口，立即停止并另开 delta 三签。
- **0x04 源 oracle**：12 个显式 owner 源地址为
  `3736/3737/3739/3740/13356/13357/13359/13360/13362/13363/13365/13366`，
  共 28 个 execution site；源 WORD 是 1-based EventObject ID，必须统一反解为 `e${word - 1}`。
  op1=0 仍继承 caller self，不得被本批改义。
- **auto census 纠正**：对 1,060 个“非空 initial 且无 next”的 auto variant 做源 CFG 分类后，
  正确口径为 **363 terminal / 690 persistent repeat / 7 idle-gate（留 R13-2）**，不是早期粗估的
  410/629。690 个 repeat 中，668 个入口本身位于循环 SCC，20 个是“一次前缀 → 单一尾循环”，
  另 2 个进入复杂/多循环；后两类也不能把整个前缀交给外层 runner 重播。
- **e796 金丝雀边界**：`legacy-001..006` 的源根
  `L_10377/L_10382/L_10388/L_10393/L_10401/L_10409` 均 plain end，应进入空终态；
  `legacy-007` 源根 `L_10448` 会进入 `L_10451↔L_10452` 尾循环，**不得 terminalize**，应只执行
  一次前缀后持续尾循环。浏览器验收仍钉首次触碰
  `(86,38) → (72,38) → (72,36)`、恢复 range3、无双 runner、切场景/存读档/abort 后无旧
  runner 复活。
- **持久位置补钉**：V5 `moveEntity` 当前只更新活场景实体；本批须在 effect 成功后把终点写入
  既有 `world.script.entityPos`，abort/失败不得预写，保证鹿跑完存读档不会回原位但游标已结束。
- **门禁**：Coding Owner 仍唯一为 Codex。完成上游修复后必须全量重迁而非手改
  `projects/pal/**`，并跑反解 oracle、source disposition fail-closed、targeted runtime、
  MG2、二跑零 diff、save/load/scene/abort 与真实浏览器 e796 金丝雀。R13-1 三方实现审查
  accept 前不得进入 R13-2；N3-1、C8、ED-5I 均不得标 done。

##### R13-1 build 检查点与 cadence delta 阻塞（2026-07-27）

- **已完成且不依赖新 schema 的部分**：
  - `0x04` 显式 owner 已统一按 1-based EventObject WORD 反解；12 个源地址、28 个 execution
    site 有独立 literal oracle、callee body 与三层 canonical target 反解证据。源扫描全集现与
    oracle 精确相等，新增或漏录显式 owner 会 fail closed。
  - dynamic auto selection 会幂等 ensure runner；coordinator 对 owner/channel 维持单活 lease，
    行为换手仍在 epoch safe point 生效。
  - `moveEntity` 只有真正到达且 scene session 未变化才写既有 `world.script.entityPos`。实体缺席、切场景、
    abort 或同实体新走位抢占旧走位都以 `AbortError` 结束，禁止 fulfilled 假冒“已到点”。
  - 363 条 terminal（含 C8 后置 repair 的 9 条）可用既有空 `completed` stage 表达；C8 历史
    seal / P7 ledger 不重签。C8 repair 现同时验证 installer、1-based entity、source root 与
    terminal CFG，不能交换 root/target 自证。
  - `0x06` 的 PAL 条件是 `RandomLong(1,100) >= threshold`，成功率已纠正为
    `101 - threshold`，不是 `100 - threshold`。
- **已跑但不得冒充完成的检查点**：
  - 正式上游重迁曾得到 `writes=95 / deletes=0 / conflicts=0`，事务后内建复跑与独立 dry-run
    均为 `0/0/0`；R13 源账为 43,503 instructions / 42,024 reachable /
    82,953 sites，digest `1111db469524badda074e8f5b3e857f9ebda48f34672ee789e236e4d1ab9e07c`；
    runtime digest `6f83235335d64a4680d9d9d7a086bfa3347c4096347e2072a3581ae7da04b26a`。
  - migrate/reforge typecheck、Reforge 3 files / 39 tests、source/CFG 5 files / 93 tests、
    P7+C8 2 files / 8 tests均通过；补强 explicit-owner 全集与 C8 installer/root provenance 后，
    C8 1 file / 7 tests 通过，PAL exact 1 file / 1 test 通过（217.52s）。
    22 个改动 TS/MTS 文件经 Biome check 修正后通过，`git diff --check` 通过。
  - 上述生成产物包含下述已知 cadence/save 缺陷，**不得提交、送实现验收或作为浏览器金丝雀
    基线**；修复 delta 后必须重新全量生成和重跑门禁。

**阻塞事实**：

1. PAL `PAL_RunAutoScript` 的语义是“一次调用执行一条非跳转源指令”；zero-delay goto 和
   `0x06` 非零命中才会同帧 `goto begin`。当前 compiler 对 auto 的每条
   `AuthorCommandV5` 隐式等待 100ms，而 R13-1 source machine 把单条 `0x0F/0x14/0x6C`
   展开为多条命令，导致一个源帧变成两个源帧。
2. 22 个 prefix/complex repeat owner 共 286 个源状态；其中 101 个复合 opcode、31 个
   `0x09`、13 个 zero-delay goto、6 个 `0x06`。按地址前后决定 `worldTick` 是错误规则：
   goto 是否让步只由 opcode 语义决定，与前跳/回跳无关；当前 e796 尾循环因此约慢 3 倍。
3. 现有 schema 无法同时表达“一个 state 内多副作用无 command boundary”和“不同 branch
   arm 可分别同帧 continue / 下一 world tick”。本卡原门禁明确规定遇到此情形必须暂停并另开
   schema/save delta 三签，禁止用 machine id、label 或迁移 side channel 特判。
4. 22 个 flow 从 `stages` 改成 `stateMachine` 还会使旧 `{kind:'stage',stage:'initial'}`
   cursor 失效；冻结的 v4→v5 sidecar 至少直接引用
   `s140/e2376`、`s150/e2466`、`s244/e4312`、`s250/e4412`。历史 P7 ledger/sidecar
   append-only，不得原地重签。

**R13-1 cadence delta 冻结候选**：

- 在 `ScriptStateMachineV5` 增加通用、可选
  `cadence?: 'transition'`（最终命名由三方审查冻结）；省略字段时保持现有
  “auto 每 AuthorCommand 隐式 100ms”行为。
- `cadence:'transition'` 时，compiler 对 state body 及其嵌套命令不插 per-command
  boundary；节拍只由既有 transition 表达：
  - 普通源指令完成后：`to(next, worldTick)`；
  - zero-delay goto：`continue(target)`；
  - `0x06` 非零命中：`continue(target)`；未命中：`to(next, worldTick)`；
    target=0 命中：`to(self, worldTick)`；
  - `0x09 n` 展开成稳定计数 state，每拍一个 `to(..., worldTick)`，不得再生成
    `wait(n*40ms)`；
  - plain end 进入空终态；reset/advance 的有限状态留 R13-2。
- compiler boundary policy 必须递归传入 branch/loop/confirm/battle/shared script；
  shared-script cache key 与 executable metadata 必须包含 policy；compiler version 升级。
  runner 继续复用 `continue`、`to(worldTick)` 与现有 safe point，不新增 transition kind。
- 不采用 `atomic command group`：它只能消掉复合 opcode 的多余等待，不能单独解决
  goto/`0x06` 分支节拍、`0x09` 逐帧 cursor 和 save safe point。
- **save/content 版本边界待用户与三方冻结**：
  1. append-only successor 方案：新增 R13 transition/seal，把旧 stage cursor 映到稳定 source
     state；必须逐 owner 证明“无 cursor→root、已完成 initial→tail”的区分，并保持历史 P7/C8
     byte-pin；
  2. 开发期 epoch 断开方案：明确拒绝旧 v5/v4 开发存档并在加载时早失败，不做含糊的
     replay/clamp。用户此前已明确“游戏未完成，不需要旧存档保护”，但实际版本轴与 A7-4
     版本号顺延仍须在本 delta 中明示确认。

**最低验收矩阵**：

- 省略 cadence 的旧 canonical executable/trace byte-equivalent；
- 复合 opcode 的全部副作用 → safe point → 恰好一个 world tick；
- zero-delay goto 链无 wait/safe point；`0x06` 覆盖命中、未命中、target=0；
- `0x09` n=1/2/13 精确 tick，逐计数 state save/load；
- shared script cache 按 boundary policy 隔离；
- 四个 frozen sidecar cursor 与现有 v5 stage cursor 按冻结的兼容策略验收；
- MG2 历史 ledger、sidecar、C8 seal byte-pin，新 R13 evidence append-only，二跑 `0/0/0`；
- 浏览器覆盖 e796 六条一次性逃跑 + legacy-007 尾循环、s082 `0x06`、一个 `0x09`
  和一个复合动画，另验切场景/save/abort/同实体抢占不写幽灵坐标。

##### R13-1 cadence/save delta 推进签字

| Agent | 签字 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **agree** | 2026-07-27 | 用户确认两席已签并采用开发期 epoch 断开；冻结 `contentVersion=6`、`SAVE_VERSION=6`、`minimumSaveVersion=6`，A7-4 顺延 `contentVersion=7`。接受 transition cadence、compiler v2、K1-K6、历史 seal byte-pin 与新 R13 evidence append-only；恢复唯一 Coding Owner 实现。 |
| Kimi | **agree** | 2026-07-27 | 只读复审通过：`cadence:'transition'` 为最小通用方案；goto/0x06/0x09/复合 opcode 逐帧语义对 sdlpal script.c:3533-3605 逐条核实精确吻合（含 0x06 target=0 命中=self 重掷）；compiler boundary policy 递归、shared cache key、version bump 成立；用户已确认 epoch 断开，条件关闭。附 K1-K6 风险钉，见「Kimi R13-1 cadence delta 审查」。 |
| GLM | **agree** | 2026-07-27 | `cadence:'transition'` 是最小通用方案；compiler boundary policy 递归 + shared cache key + version bump 成立；0x06 概率 `101-threshold` 正确；22 owner 受 stage→stateMachine 影响。用户 2026-07-27 拍板 epoch 断开，不做旧存档兼容。见「GLM R13-1 cadence delta 审查」。 |

- **当前门禁**：Codex / Kimi / GLM 三方 `agree` 已齐，用户 2026-07-27 确认开发期 epoch
  断开（不做旧存档兼容）。版本轴冻结为 `contentVersion 5→6`、`SAVE_VERSION 5→6`、
  PAL `minimumSaveVersion=6`，A7-4 顺延到 `contentVersion=7`；只接受 current 6/6，
  旧 SAVE 1..5（含 content v4/v5）必须在任何 compatibility sidecar I/O 前早失败，不生成
  5→6 successor、不 replay/clamp。历史 4→5 descriptor/sidecar/ledger 与 C8 seal byte-pin。
  **R13-1 cadence delta 恢复 build，唯一 Coding Owner 为 Codex。**

### GLM R13-1 cadence delta 审查（2026-07-27）

**方法**：只读设计审查。读 `script-v5.ts` / `script-compiler-v5.ts` 源码 + frozen sidecar cursor 分析 +
0x06 概率公式验证 + 1,060 auto variant 分类核对。

#### 1. `cadence?: 'transition'` 是最小通用方案 ✅

**核心问题**：PAL `PAL_RunAutoScript` 一次执行一条非跳转源指令；zero-delay goto 和 0x06 非零命中同帧
goto begin。当前 compiler 对 auto 每条 `AuthorCommandV5` 隐式插 100ms wait（`script-compiler-v5.ts:150`
`timing === 'auto' ? [{ kind: 'wait', ms: 100 }] : []`）。复合 opcode（0x0F/0x14/0x6C）展开为多条
canonical command 后，一个源帧变成两个 100ms 帧——auto 动画速度减半。

**方案评估**：

| 方案 | 能否解决 | 理由 |
|---|---|---|
| `cadence?: 'transition'` | ✅ | 可选字段；省略时保持现有行为；设置时 compiler 不插 per-command boundary，节拍只由 transition 驱动 |
| atomic command group | ❌ | 只能消复合 opcode 多余等待，不能解决 goto/0x06 分支节拍、0x09 逐帧 cursor 和 save safe point |
| per-command `noBoundary` 标记 | ❌ | 污染 AuthorCommand union，每条命令都要标；不是机器级方案 |
| 新增 transition kind | ❌ | runner 已有 continue/to(worldTick)/stay，不需要新 kind |

**GLM 结论**：`cadence:'transition'` 是**最小、PAL 无关、向后兼容**的方案。它不新增 transition kind、
不污染 AuthorCommand union、不依赖迁移 IR/runtime side channel。省略字段时旧 canonical executable
byte-equivalent——满足向后兼容。

**G1 必落**：cadence 只影响 `ScriptStateMachineV5`（stages flow 不受影响）；compiler boundary policy
必须递归传入 branch/loop/confirm/battle/shared script；shared-script cache key 必须包含 policy；
compiler version 必须 bump。

#### 2. 逐帧语义核对 ✅

| opcode | 源语义 | cadence:'transition' 表达 | 正确性 |
|---|---|---|---|
| 普通源指令 | 一拍一条 | `to(next, worldTick)` | ✅ 一个 world tick = 一个源帧 |
| zero-delay goto | 同帧 goto begin | `continue(target)` | ✅ continue 不让步，同次 activation |
| 0x06 非零命中 | 同帧 goto target | `continue(target)` | ✅ |
| 0x06 未命中 | 下一拍继续 | `to(next, worldTick)` | ✅ |
| 0x06 target=0 命中 | 同帧 goto self | `to(self, worldTick)` | ✅ 注意：goto self 虽然是回跳，但 PAL 语义是"下一拍重跑"（不是同帧）|
| 0x09 n | 等 n 帧 | n 个稳定计数 state，每拍 `to(..., worldTick)` | ✅ 不得生成 `wait(n*40ms)`——PAL auto 的 0x09 是逐帧推进，不是一次等完 |
| plain end | 终止 | 空终态 | ✅ |

**0x06 概率公式**：`RandomLong(1,100) >= threshold` → 成功率 = `101 - threshold`。Codex 纠正
（`100 - threshold` → `101 - threshold`）正确——`RandomLong(1,100)` 的范围是 1..100 含两端，
`>= threshold` 的命中数 = `100 - threshold + 1 = 101 - threshold`。

#### 3. cursor 兼容性分析 ✅

**影响范围**：frozen sidecar 有 4,066 个 cursor alias，其中 987 个是 auto channel。22 个 owner 从
`stages` 改成 `stateMachine` 后，这些 owner 的 `{kind:'stage',stage:'initial'}` cursor 失效。

**GLM 独立验证**：4 个 Codex 标注的 frozen entity（s140/e2376, s150/e2466, s244/e4312, s250/e4412）
全部确认在 sidecar 中有 `auto:` 前缀的 cursor alias，且当前映射到 `{kind:'stage',stage:'initial'}`。

**两个方案评估**：

| 方案 | P7/C8 seal 影响 | 复杂度 | GLM 评估 |
|---|---|---|---|
| append-only successor | 新增 R13 seal，旧 cursor 映射到 source state | 中——须逐 owner 证明 successor 区分 | ✅ 正确但复杂 |
| 开发期 epoch 断开 | 拒绝旧 v5/v4 开发存档，加载时早失败 | 低——版本轴+SAVE_VERSION bump | ✅ 用户已明确"游戏未完成，不需要旧存档保护" |

**GLM 推荐**：epoch 断开。理由：游戏尚未发布，没有用户存档需要保护；开发期存档断开比 append-only
successor 简单且不容易引入 cursor 映射错误。contentVersion 从 5 升到 6（或 SAVE_VERSION 5→6），
A7-4 顺延。但**最终由用户拍板**。

#### 4. MG2 / byte-pin / 测试矩阵 ✅

- **历史 P7 ledger immutable**：两个方案都不重签 P7/C8 seal ✅
- **新 R13 evidence append-only**：新增 `_transitions/r13-cadence-v1.json` 或等效 ✅
- **MG2 二跑 0/0/0**：cadence delta 不改 PAL 正文语义（只改 compiler boundary policy），MG2 应保持
  二跑零计划 ✅
- **最低验收矩阵**：省略 cadence byte-equivalent + 复合 opcode 一帧一 tick + goto/0x06/0x09 逐项 +
  shared cache 隔离 + cursor 策略 + e796/s082 浏览器——**充分** ✅

#### 5. 1,060 auto variant 分类 ✅

GLM 独立确认 Codex 的分类：
- 363 terminal（空终态）+ 690 repeat + 7 idle = 1,060
- 690 repeat 中 668 repeat-root + 20 prefix-tail + 2 complex
- 新 cadence machine 22 owner / 286 source state：101 compound + 31 wait + 13 goto + 6 branch

**口径一致**——这些是审计池，不直接报成 bug。

#### 结论

**GLM R13-1 cadence delta agree**。

`cadence:'transition'` 是最小通用方案；compiler boundary policy + shared cache + version bump 成立；
逐帧语义正确（goto/0x06/0x09）；0x06 概率 `101-threshold` 正确；cursor 兼容性两个方案均可保护
历史 seal；MG2/byte-pin/测试矩阵充分。

用户 2026-07-27 拍板：开发期 epoch 断开，不做旧存档兼容。contentVersion 5→6，A7-4 顺延。
旧 v5/v4 开发存档加载时早失败，不做 replay/clamp。

### Kimi R13-1 cadence delta 审查（2026-07-27）

**方法**：只读设计审查；逐帧语义对 reference/sdlpal/script.c:3533-3605 逐条一手核实，reforge
侧核实 runner transition 机制与 worldTick 时长。未读实现分支，未改实现。

#### 1. `cadence?: 'transition'` 是最小通用方案 ✅

- 可选字段、省略保持现状、不新增 transition kind、runner 零改动（复用现有
  `continue/to(worldTick)/stay` 与 safe point，script-runner-v5.ts:203-226）——最小侵入面成立。
- 否决 `atomic command group` 的理由成立：它只能压复合 opcode 的多余等待，解决不了 goto/0x06
  分支节拍、0x09 逐帧 cursor 与 save safe point；transition-cadence 严格更通用且覆盖全部四类。
- 与"按地址前后决定 worldTick"的错误规则划清界限：节拍只由 opcode 语义决定，与前跳/回跳
  无关——正确。

#### 2. 逐帧语义对 sdlpal 逐条核实（精确吻合）✅

- **zero-delay goto(0x03 op1=0)**：script.c:3549-3558 跳后 `goto begin` 同帧续跑 →
  `continue(target)` ✓。
- **0x06**(script.c:3575-3591)：`RandomLong(1,100) >= op0` → 成功率恰为 `101-op0`✓；
  命中且 op1≠0 → 跳 + `goto begin` → `continue(target)`✓；未命中 → `wScriptEntry++` 帧结束
  → `to(next, worldTick)`✓；**命中且 op1==0 → 不进 if、无 ip++，停在本指令下帧重掷** →
  `to(self, worldTick)` 精确等价（含"重掷"语义，state 重入即重估 chance）✓。
- **0x09 n**(script.c:3593-3605)：`++count >= n` 才 ip++，每帧执行一次 → n 拍；稳定计数
  state + 每拍 `to(..., worldTick)` ✓；n=0/1 边界（`++count >= 0` 恒过）与验收 n=1/2/13 一致。
- **复合 opcode（0x0F/0x14/0x6C 等）**：原版"每帧每对象一条非跳转指令"
  （script.c:3514-3517）——一条源指令的全部副作用同一帧生效 → 单 state 多命令、无
  per-command boundary、一个 safe point、恰好一个 worldTick ✓。
- **delay goto（0x03 op1>0）与 0x02**：使用 auto 专用计数门的有限状态机，显式归 R13-2，
  不在本 delta——范围切分正确（见 K2）。

#### 3. compiler / shared cache / version ✅ 与两个补强钉

- boundary policy 递归传入 branch/loop/confirm/battle/shared script、shared-script cache key
  与 executable metadata 含 policy、compiler version 升级——三件套缺一就会跨 policy 串味，
  设计完整。
- "省略 cadence 的旧 canonical executable/trace byte-equivalent"是硬回归门，必须覆盖全部现存
  machine 而非抽样（K6）。

#### 4. save 版本边界（用户已选 epoch 断开）✅ fail-closed

- epoch 断开 = 加载期早失败、显式拒绝旧 v5/v4 开发存档，不做 replay/clamp——fail-closed
  构造上成立；历史 P7 ledger/sidecar/C8 seal 只 byte-pin 不重签，新 R13 evidence
  append-only ✓。
- 剩余未定项只是版本轴细节（SAVE_VERSION/epoch + A7-4 顺延），按用户拍板写入即可（K5）。

#### 风险钉（K，build 验收核对，不阻塞 agree）

- **K1 0x09 绝对时长偏差必须显式登记**：reforge worldTick = `STEP_MS = 100ms`
  （main.ts:251，既定"卡顿感"美学），源帧 40ms。新模型 0x09 n = n×100ms，比源（n×40ms）与
  当前投影（n×40+100ms）都慢。架构上统一在既定 beat 是正确选择（混用两个时基更糟），但
  必须登记为显式近似并在浏览器验收中确认观感，不得冒充无损。
- **K2 delay goto（0x03 op1>0）不得混入本 delta**：286 source state 的 census 必须把
  0x03 op1>0 显式归入 R13-2 闸门类（与 0x02 同族，auto 用 wScriptIdleFrameCountAuto），
  不得按 zero-delay 处理；分类账进 R13-0 disposition。
- **K3 zero-delay `continue` 链建议 fail-loud 迭代上限**：原版同帧链无上限（数据无死循环），
  runner 侧 `loop` 已有 maxIterations 先例（script-runner-v5.ts:342-343）；对 `continue`
  链加一个只防未来作者/迁移 bug 的 fail-loud 上限，不改变现有数据语义。
- **K4 `cadence:'transition'` 的作者语义必须文档化 + 校验提示**：该模式下"节拍只由
  transition 表达"，state body 应只承载一个源指令的展开；作者手写含多指令 branch 臂会得到
  同帧执行整臂的意外语义。编辑器/校验器应提示或限制。
- **K5 断开必须 fail-closed 在 preflight 显式报错**（带版本/epoch 信息与迁移说明），不得
  静默 normalize/clamp；MG2 验收必须重验 P7 ledger、两份 sidecar、C8 seal 的 byte-pin，
  新 R13 evidence append-only、二跑 0/0/0。
- **K6 byte-equivalence 全覆盖**：省略 cadence 的现存 machine（含 65 个 machine owner 与全部
  stages flow）的 executable/trace 必须逐一字节一致，不是抽样；shared-script cache 按 policy
  隔离有测试。

#### 结论

**Kimi agree（条件：用户确认 save 版本轴细节）**。五项审查点全部成立，无 schema/compiler/
runtime/save 级反例。Codex 尚未对新候选签字，且版本轴细节待用户拍板；两事齐备前不得实现
cadence delta、不得再发布 PAL 正文、不得进入 R13-2 或标 N3-1/C8/ED-5I done。

- 2026-07-27 Kimi: 完成 R13-1 cadence/save delta 只读设计审查，签 **agree**（条件同 GLM：
  用户确认 save 版本轴细节），附 K1-K6 风险钉（见「Kimi R13-1 cadence delta 审查」）。
  逐帧语义对 sdlpal script.c:3533-3605 逐条核实精确吻合（含 0x06 target=0 命中=self 下帧
  重掷、0x09 每帧一次计数、复合 opcode 单帧全副作用）；`cadence:'transition'` 最小通用、
  不新增 transition kind、runner 零改动；epoch 断开 fail-closed、历史 seal byte-pin。
  主要钉子：0x09 绝对时长 n×100ms 慢于源帧须显式登记（K1）、delay goto 归 R13-2 不得混入
  （K2）、continue 链 fail-loud 上限（K3）、作者语义文档化（K4）、断开 preflight 显式报错 +
  byte-pin 重验（K5）、byte-equivalence 全覆盖（K6）。未修改实现文件。
  Next: Codex 对新候选签 agree + 用户拍板版本轴后进入实现；GLM 已 agree。

#### R13-1 implementation candidate 与 Codex 自验（2026-07-27）

**实现收口**：

- canonical schema 只增加可选 `ScriptStateMachineV5.cadence?: 'transition'`，省略时仍是历史
  `perCommand`；validator、克隆/保存和编辑器高级流程 tip 同步支持。compiler 升到 v2，
  boundary policy 递归进入 entry/branch/loop/confirm/battle/teleport/shared script，
  executable metadata 与 shared cache key 同时隔离 policy。runner 对同帧 `continue` 链设
  4,096 次 fail-loud 上限；不新增 transition kind。
- 上游 `0x04` 显式 owner 统一使用 1-based EventObject WORD → `e${word - 1}`；12 个 source
  address / 28 个 execution site 由 literal oracle、callee、三层 canonical target 和负向 fixture
  共同 fail-closed。
- 1,060 个 auto variant 的 source lifecycle 总账冻结为 **363 terminal / 690 repeat /
  7 idle-gate**。P7 基础层结构化 354 terminal，C8 后置 repair 结构化另 9 条；22 个
  prefix/complex repeat owner 改为 transition-cadence state machine，只跑一次前缀后进入真实
  recurrent tail。7 个 idle-gate 明确留在 R13-2，不越批处理 delay goto / idle frame。
- runtime 在动态选择 auto behavior 后幂等 ensure runner，coordinator 仍保持 owner/channel
  单活与 epoch safe-point 换手。`moveEntity` 只有真实到达且 scene session 未过期时才写
  `world.script.entityPos`；实体缺席、abort、换场景或同实体新走位抢占均不提交幽灵终点。
- 工程与存档 epoch 原子升为 `contentVersion=6`、`SAVE_VERSION=6`、
  `minimumSaveVersion=6`。current preflight 参数不含 `FileSource`，只接受 6/6；旧 SAVE 1..5
  及 6/4、6/5 在任何历史 sidecar I/O 前早失败。canonical script/world schema 仍为 V5；
  本地 v5 工程先走 current loader 全闭环，成功后只发布 6/6 manifest。历史 4→5
  descriptor/sidecar/ledger 不重签，A7-4 顺延 v7。
- 全量内容由上游重新生成；没有手改 `projects/pal/**`。正式 dry-run 为
  `writes=0 / deletes=0 / conflicts=0`。

**机器证据与冻结值**：

- source：43,503 instructions / 42,024 reachable / 82,953 sites；
  raw `53,394/29,559`、augmented/final `53,404/29,549`，每层各自严格守恒；
  open observations 7,812。source digest
  `2387ac9dd09b55c8cf1a6ab27d8ceb140930462defb51f65ae23de8a55986cc3`。
- runtime：444 command cells + 51 skill cells / 58,564 uses / 28 confirm open debt /
  161 enemy casts / 183 enemy effects；digest
  `1eeb4361188e6031f970c8a541128d201ed9ea0f87889055df5e74644b194036`。
- byte-pin：P7 raw/internal
  `41263ba1fa216af014bf8b880405a587938be38938449f77ccec84ed40da6b12` /
  `9b01dea89f4d567663ad64e03017d1ecdbdb01fb1540e6798a931f47900f4901`；
  C8 raw/internal
  `325d52ed750e29ab5757002821037a270498b2f8c3af5158a79d568a27df3a24` /
  `fbdbd50f5e47b924c8bf4dcfb0700d5b08a04afa0d3cc2bff0711b4b9da627a3`；
  历史 save sidecar baseline/project raw 均为
  `30ce8717aa9f6f21e14d862cde2aa44dff8f3652833826b4506e49bc7a6a2ed0`。
- 新 R13 raw/internal
  `2b1e71b018ffba8aecd4adea628c325dd4f67e338508b22f6ed06f4517683453` /
  `794659488a19cd131e2b5f7db235b62607264c9b77978edd36318119937dd80a`；
  K6 cadence-omitted compatibility SHA
  `e0d2587f59dfe883158ccb0e67851bc0f533ddbbb7222bd3864a069947bd43f2`。
  K6 不再由 compiler v2 自比：测试内冻结独立 compiler-v1 lowering oracle，对全部
  **4,611** 条 cadence-omitted flow 逐条深比较并复核 **7,896,404 bytes** 与上述 SHA。
  runner 4,096 同步 transition 上限的 PAL 可达性同时冻结：65 个历史 machine =
  771 states / 464 continue edges / 最长 7；22 个 transition-cadence machine =
  419 states / 19 edges / 最长 1；联合 **87 / 1,190 / 483 / 最长 7**。
  这里的严格结论是“全部 executable lowering 字节等价 + runner 唯一新增 guard 对 PAL
  不可达”，因此可推出同一 host 下的旧 flow trace 不变；并未冒充动态执行了 4,611 条所有
  RNG / 分支 / 循环路径。
  P0 control-flow baseline raw
  `8be70805697d574da029f291650ca03e5fc0980e3156bc14793f7580977cfbb4`，
  PAL `_state.json` raw
  `45c5cf41a4c261f2289365c8d583b5c778787fa4c818f513b6c85638c6aa9757`。

**自动验证**：

- typecheck：content / reforge / editor / migrate 全绿。
- package tests：content **28 files / 348 tests**、Reforge **68 / 651**、editor
  **91 / 768** 全绿；migrate 的 R13 cadence MG2、K6 compatibility、auto lifecycle、P7
  canonical/project/ledger、C8 seal、source-disposition PAL、PAL integration 与 control-flow
  audit 已分别串行复跑全绿。
- migrate 默认并行总测曾因多个完整 PAL fixture 同时构图出现资源竞争，产生 15 个超时假红；
  逐文件串行复跑全部通过。另有两项真实 golden 漂移已纠正：
  demo `contentVersion 5→6`，以及 `0x04` owner 修正使 sprite-action rejection digest 合法变化。
  package `test` 固定 `--maxWorkers=1` 后，完整串行总测 **72 files / 489 passed /
  1 skipped（490 total）** 全绿，耗时 2,717.78s。
- 补充窄回归：
  `script-project-v5.test.ts` **19/19**，覆盖同实体第二次 `moveEntity` 抢占旧走位时只提交
  新终点，以及 `0x09 n=3` 在稳定 `wait-3` cursor 经
  `buildPayloadV6 → preflightSaveMigration → normalizePayloadV6` 后只续跑剩余 1 tick、
  不回根、不重放已过计数；K6 compatibility **1/1** 覆盖上述独立 v1 oracle 与联合最长链。
- 定点格式收口后，workspace `pnpm lint`（977 files）、editor/reforge/migrate typecheck、
  Editor **2 files / 87 tests**、Reforge **2 / 38**、migrate 重型 PAL **4 / 14** 再次全绿；
  `git diff --check` 通过。formal migration dry-run 及上述 frozen hash 已独立重算。

**测试基础设施性能债务（用户 2026-07-27 提出）**：

- migrate 完整串行总测的 2,717.78s 中，test body 为 2,704.53s；transform 1.53s、import
  5.68s，故瓶颈不是 TypeScript/Vitest 启动。Vitest 结果缓存显示 P4/P3/P5/P2/P6 shadow
  五个 PAL 文件合计约 **1,845.09s（67.5%）**；最慢 P4 单文件约 **722.87s**。前 10 个
  重型文件合计约 **94%** 总耗时。
- 根因是这些文件分别重新读取 294 场景、构造完整 migration/audit/P2→P7 累计 IR、深克隆
  snapshot 并重算 stable JSON/digest；Vitest 默认 `pool=forks + isolate=true`，文件间不共享
  module fixture。默认并行又会让多个完整 PAL 构图争抢 CPU/内存并超时，`maxWorkers=1`
  只把假红改成可靠串行，并未消除重复计算。
- 这是开发效率债务，不是 R13-1 语义反例。不得用继续加 timeout 掩盖；后续应单独设计
  immutable PAL phase checkpoint/fixture 复用，并拆分快速开发门与完整发布门，同时保留
  篡改隔离、确定性双跑和 MG2 独立性。Kimi/GLM 审查当前候选期间不临时关闭 isolate，
  避免为提速削弱本批证据。
- 本债务已于 2026-07-28 完成实现、完整 fast 回归、文件乱序回归和关键 release live
  回归；收口证据见 R13-2 自动验证后的「migrate 测试性能债收口」。本节历史基线不回写，
  也不得把不同隔离级别的 fast/release 耗时直接混算。

**真实浏览器回归**：

- s048/e789 从 `?scene=s048&pos=151,39&facing=up` 独立重复 **10/10**，全部进入 s049
  `(120,84)`。
- s048/e796 从 `(88,42)` 触发：`legacy-001..006` 六条一次性逃跑分别抵达
  `(72,36)/(61,2)/(72,-4)/(59,-9)/(58,-18)/(72,-2)` 后进入 completed，并恢复正确 touch
  range；`legacy-007` 一次前缀后稳定进入 `10451↔10452` 尾循环，不 terminalize。F5/F9
  quick-save round-trip 恢复玩家与鹿 `(72,36)`，canonical 位置位于
  `dumpSave().world.script.entityPos.s048.e796`。
- s082/e1568 进入 transition-cadence machine，实际观察 source states、`0x09`
  `wait-2..wait-9`、`0x06` 分支和继续循环；截图：
  `output/playwright/n3-1-s082-cadence.png`。
- s048 不带 `pos` 的真实 onEnter：最大黑幕 `0.96875`，随后恢复 0 并出现淡入后的李逍遥对白；
  SAVE 6 round-trip 后切 s047→s048 不重播、fade 始终 0、cursor 保持 completed。截图：
  `output/playwright/n3-1-s048-after-fade.png`。

K1 的 `0x09` 每源计数统一为 100ms 世界拍、慢于源 40ms 帧，已作为显式近似写入脚本系统文档；
K2 的 delayed goto/idle gate 保持 R13-2 open。R13-1 审查通过也只允许进入 R13-2，不代表
R13-Z、N3-1、C8 或 ED-5I 完成。

##### R13-1 批次实现审查签字

| Agent | 签字 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **accept** | 2026-07-27 | 完整 migrate 单 worker 总测 72 files / 489 passed / 1 skipped；Reforge 68 / 651；补齐 0x09 SAVE6 稳定 cursor 续跑、同实体 move latest-wins、独立 compiler-v1 K6 oracle 与 PAL continue-chain 可达性证据。实现、MG2、浏览器和 dry-run 门禁全绿；accept 仅表示 R13-1 可送两席审查。 |
| Kimi | **accept** | 2026-07-27 | 只读实现审查通过：compiler v2/boundary policy/shared cache/4096 guard、独立 v1 oracle（实跑 1/1）、0x09 wait-3 SAVE6 续跑、dynamic auto、move latest-wins、epoch 断开与历史 byte-pin 逐项核实；一手 sha256 复核 P7/C8/R13 seal 与 sidecar；K1-K6 全部落地。accept 仅准入 R13-2。 |
| GLM | **accept** | 2026-07-27 | 独立复跑：content 28/348、reforge 68/651、editor 91/768 全绿；R13-0 disposition+census+PAL exact 4/31 通过（187s）；dry-run 0/0/0；source digest `2387ac9d…` + runtime digest `1eeb4361…` 匹配卡内；P7 ledger `9b01dea8…` / C8 seal `fbdbd50f…` / R13 seal `79465948…` parent→C8 `fbdbd50f…` byte-pin 确认；sidecar digest `ec65fdad…` 不变；CONTENT_VERSION=6 / SAVE_VERSION=6 / minimumSaveVersion=6 确认；三层守恒 raw 53,394/29,559 → augmented/final 53,404/29,549 每层 accounted+open=82,953 ✅；7,812 open observations 是 R13-2~R13-6 输入非完成声明。 |

- **当前门禁**：Codex / GLM / Kimi 三席 `accept` 已齐（2026-07-27），**R13-2 准入开放**。
  任务总体不得标 `done`，C8 / ED-5I 依赖不变；R13-1 accept 不代表 R13-Z/N3-1 完成。
- 2026-07-27 Codex：完成 R13-1 implementation candidate 自验并签 `accept`。Evidence：
  migrate 完整单 worker 总测 72 files / 489 passed / 1 skipped，Reforge 68 / 651，
  `script-project-v5.test.ts` 19/19、K6 compatibility 1/1、typecheck 和 `git diff --check`
  全绿；浏览器矩阵与 formal dry-run 见本节。Next：Kimi / GLM 按下方提示词并行只读审查，
  两席均 `accept` 后才可进入 R13-2；不得标 N3-1 / C8 / ED-5I done。
- 2026-07-27 Kimi：完成 R13-1 runtime/schema/save 只读实现审查，签 **accept**（仅准入 R13-2）。
  一手证据：schema 仅新增可选 literal（script-v5.ts:300，validator fail-closed :813-817）；
  compiler v2 policy 递归 + cache key/metadata 隔离 + version=2（script-compiler-v5.ts:15/
  :122/:130/:334）；runner 4096 同帧 continue 上限为 throw 且真实 yield 后清零
  （script-runner-v5.ts:194/:216-222/:242）；epoch 预检刻意无 FileSource、非 6/6 显式 throw
  先于一切 sidecar I/O（migration.ts:210-241）。实跑：K6 compatibility **1/1**（4,611 flow
  独立 v1 lowering 逐条深比 + 7,896,404 bytes + SHA `e0d2587f…`，确认读全部场景文件现编，
  非读冻结 fixture）；reforge + content check 全绿（exit 0）。一手 sha256：P7 ledger
  `41263ba1…`、C8 seal `325d52ed…`、双 sidecar `30ce8717…`、新 R13 seal `2b1e71b0…`
  全部与卡冻结值一致；`git diff HEAD -- _transitions/ migrations/` 为空。
  记录项（非反例）：0x06 target=0→to(self) 在 PAL 产物无实例、仅单测钉（源数据无此站点，
  形态已被结构钉住）；"byte-equivalence"为 flow body 级，envelope 刻意升 v2（oracle 分行
  断言，处理正确）；0x09 拍=100ms 已按 K1 显式登记（seal 记 worldTickMs:100/
  sourceFrameMs:40）；7 个 idle-gate owner 按 K2 留 R13-2。未修改实现/产物/baseline。
  Next：R13-2（跨激活控制流：36 个 0x08 逐站投影 + 11 个 idleFrames 闸门），仍由 Codex
  任唯一 Coding Owner，本批 accept 不授权任何 done。

#### R13-2 逐站审计与 cursor handoff / SAVE 7 delta 阻塞（2026-07-27）

R13-1 三席 `accept` 只打开了既有 R13-2 设计范围。Codex 在修改实现前完成 36 个
`0x08 checkpoint`、全部 `end.reset(idleFrames>0)` 与 delayed goto 的源语义逐站审计；
结果命中本卡预先约定的 escape hatch：现有 schema 可以表达单个 flow 内的 checkpoint /
有限计数，但不能表达 **切换 behavior 时重置控制入口、同时继承旧 flow 的有限计数相位**。
因此 R13-2 实现暂停，先对最小 public contract + save epoch delta 重新三签。

##### 控制面 CFG 必须先纠正

- `script-graph.ts` 当前对 delayed goto 只建立 target edge，漏掉计数到期后的
  `address + 1`；同时给所有 `reset idleFrames=0` 错加 fallthrough。R13-0 census 直接消费该
  通用图，故其 42,024 reachable / 82,953 sites 不是 R13-2 可继续追加的可靠母账。
- delayed goto 共 17 条结构性漏边：
  `193/205/2616/2621/5573/7340/16513/32097/32209/33696/33770/33964/33972/34313/
  34779/35054/35062`。只补 delayed fallthrough 会得到 42,327 reachable /
  83,326 sites / 7,947 contexts，但该数字仍包含 reset0 假 fallthrough，**不得冻结**。
- 两类边同时按源语义修正后的只读临时口径为 41,945 reachable / 1,558 unreachable /
  81,674 execution sites（auto 18,955 / trigger 62,719）/ 7,947 contexts。实现阶段必须把
  typed edge 升级为 context-sensitive 规则、升级 census method version，并从源重新构建
  disposition、三层守恒和 digest；不得在旧报告上做 `+303/+373` 算术补丁。
- 该项是迁移控制面修复，不新增 canonical 能力；但会改写 R13-0 后续事实口径，必须以新
  append-only R13-2 evidence 记录，旧 R13-1 seal 保持 byte-pin。

##### 36 个 `0x08` 的精确分类

- 36 个 source address / 43 execution contexts：32 个线性、4 个条件臂
  `6344/7461/7489/19301`；35 个最终保留 `checkpoint + 1`，`763` 唯一被后续
  `reset -> 565` 覆盖；同一执行链多 checkpoint 为 0。
- 7 个额外 context 是 discard-return alias：`5189` 的 s018/onTeleport，以及 `9175` 的
  s040/s041/s044/s045/s046/s047 onTeleport。实体 trigger 的返回游标必须持久；这些
  onTeleport / nested call context 不得把 callee checkpoint 写进调用者。
- `1575/10315/19301` 只有在后续 source activation 才到达；当前扁平翻译已把相应后续正文
  整段漏掉，不能在既有 canonical body 上机械 split。上游须建立 migration-internal
  `TriggerActivationGraph`，显式记录 owner/context、同激活边、持久/丢弃返回、plain /
  advance / reset 提交和 checkpoint，再投影到现有 `stateMachine`。
- 现有 `continue/stay/restart/advance/branch/commandOutcome` 足以表达 flow 内语义，不新增
  transition kind，不把 PAL address/IP 暴露给作者。实际需要新增持久续点投影为 34 个；
  `763` reset 覆盖与 `10747` s048 repair 已有精确闭环，但仍要纳入 context 总账防双包装。
- 完整站点：
  `575/763/1575/2423/4224/5189/5872/5924/6344/6390/6594/6602/6609/7461/7489/
  9175/9411/9841/10315/10747/10990/11816/15046/17191/17569/19301/20261/21511/
  22650/26590/26635/27546/30683/34898/35030/35420`。

##### 11 个 idle gate 的纠正后全表

delayed-goto fallthrough 修正后，11/11 地址均可达，共 13 个实际运行 site、12 个实体 owner，
阈值按 owner 展开共 84 个有限计数相位。门本身 **全部在 auto runner 执行**；touch /
interact 只是部分 `0x24` 的安装来源，不能据此选 trigger 计数模型。

| 门 | owner / 安装来源 | 源语义与当前缺口 |
|---|---|---|
| L379 -> 377, N12 | e56；s003/e56 touch | 前缀一次、循环 12 次、后缀一次；当前无限重复前缀+一次循环 |
| L542 -> 541, N8 | e26；s001/e15 touch | 移动 8 次后终止；当前无限移动 |
| L842 -> 841, N7 | e88；s004/e87 auto | 前缀一次、动画 7 次后终止；当前无限重复 |
| L1173 -> 1170, N12 | e59；s002/e36 interact | 前缀一次、循环 12 次、后缀一次；当前无后缀且无限 |
| L32215 -> 32213, N8 | e4168；s231/onEnter 动态安装 | 走步 8 次后结束；当前 e4168 完全没有 auto behavior |
| L32300 -> 32298, N5 | s231/e4167 static auto | 动画+advance 5 次后终止；当前错误物化为永久 SpriteAction |
| L33436/33440, N6/N6 | e4464；s253/e4463 touch | 严格 `6 / 中段与音效一次 / 6 / stop`；当前只剩无限动画 |
| L33666 -> 33644, N4 | e4409/e4440；touch | 过门后执行 33667 并进入真实尾循环；当前均为空 stage，e4409 另有跨 behavior 计数继承 |
| L34319 -> 34318, N4 | s266/e4658/e4659 static auto | delayed goto 到期后动画 4 次、后缀一次、进入尾循环；当前 CFG 漏整条到期路径 |
| L35436 -> 35434, N4 | s278/e4748 static auto | nudge+anim 4 次后终止；当前永久循环 |

安装来源分组为 touch 5 地址 / 6 sites、interact 1/1、static/entity-auto 4/5、
scene onEnter 动态安装 1/1；实际执行分组统一为 auto 13 sites。旧 lifecycle 报告只覆盖
7 owner / 59 相位，池外遗漏 e4168/e4167/e4409/e4440/e4748 共 25 相位。

##### 触发 delta 的最小反例：e4409

- e4409 默认 auto root L33668 的 `0x09 wait 10` 与切换后的
  `idleFrames=4@L33666` 共用事件对象级 `wScriptIdleFrameCountAuto`；`0x24@L33674`
  只换 auto script pointer，不清计数。
- 切换前残值 `k=0/1/2/3..9` 时，新门分别还需 `4/3/2/1` 次。当前
  `selectEntityBehaviorV5` 在 behavior id 改变时删除 cursor；相同 id 又保留旧 cursor，
  都不能表达“换入口但继承有限相位”。条件系统也不能读取另一 flow 的 cursor。
- 隐藏 flag/var + 统一大机器会把控制状态外置到作者可见 world namespace，破坏“脚本方案”
  的数据/UI 真值，并等价复活影子 PAL counter；不接受。

##### R13-2 delta 冻结候选

1. 给 `selectEntityBehavior` 增加通用、显式、可选的 cursor handoff；未提供字段时历史行为
   byte-equivalent：

   ```ts
   cursorHandoff?: {
     kind: 'stateMap'
     fromBehavior: BehaviorId
     cases: Array<{ from: FlowCursor; to: FlowCursor }>
     onUnmapped: 'error'
   }
   ```

   仅允许 `selection.kind === 'use'`。运行时先解析旧 effective behavior/cursor（无持久 cursor
   时使用旧 flow initial），精确匹配 `fromBehavior` 与唯一 case，校验目标 cursor 属于目标
   flow，再原子写 selection + `{behavior: next, at: mapped}`，最后 bump owner epoch。任何重复、
   漏映射、错误 flow/machine/state 或 stale lease 回写均 fail-loud。
2. 不采用 `preserve-compatible`：跨 behavior 共享 machine/state id 只会把映射藏进 alias
   state；相同 id 不代表相同业务相位，不能覆盖 stage -> state，且会迫使目标 flow 复制来源
   cursor 命名空间。
3. 36 checkpoint 与 11 gate 的迁移使用 source activation/product-state graph，最终只发布
   稳定业务 state id；不得发布 PAL address、全局计数或第二解释器。
4. `CONTENT_VERSION` 与 `SAVE_VERSION` 同步断到 **7**，PAL `minimumSaveVersion=7`；
   SAVE6 及以下在任何历史 sidecar I/O 前早失败。原因不只是不兼容 stage/state cursor：
   旧迁移已吞掉 34 个 checkpoint，SAVE6 中“未运行”与“已运行但续点丢失”可能完全同形，
   alias 无法无损判断。历史 v4->v5 sidecar、P7/C8/R13-1 seal 全部 byte-pin，A7-4 顺延至
   content/save 8。
5. 新增 append-only `r13-cross-activation-v1` seal，以 `r13-cadence-v1` digest 为 parent。
   发布顺序先重建并校验 R13-1 evidence，再应用 R13-2 augmentation；不得重签旧 seal 或让
   新 flow 反向污染 parent。

##### R13-2 cursor handoff / SAVE 7 delta 推进签字

| Agent | 签字 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **agree** | 2026-07-27 | 两路独立只读逐站审计与第三路 delta 压缩收敛：context-sensitive CFG、migration-internal activation graph、显式 stateMap、SAVE/content 7 epoch 断开和 append-only successor 是最小可审计闭环；不接受 hidden counter 或 preserve-compatible。 |
| Kimi | **agree（用户转述）** | 2026-07-27 | 用户确认“签了”；接受 public command/runtime lease/atomic handoff、显式 stateMap、SAVE7 断点、seal parent 顺序与 checkpoint product-state 架构。未将 R13-1 审查冒充本次签字。 |
| GLM | **agree** | 2026-07-27 | 独立核对：36 checkpoint 地址逐条匹配源数据 ✅；11 idle gate 地址 + 阈值（12/8/7/12/8/5/6/6/4/4/4）逐条匹配 ✅；17 delayed-goto 地址全部确认为源 goto（expiry fallthrough 漏边结构性正确）✅；phase 84 = 简单阈值和 76 + e4409 跨 behavior 继承 8 ✅；cursorHandoff stateMap 是最小通用方案（不引入 hidden counter / preserve-compatible / 全局 flag）✅；SAVE7 断点理由成立（34 checkpoint 被吞后 SAVE6 cursor 状态不可无损映射）✅；seal 链 r13-cross-activation→r13-cadence→c8→P7 append-only byte-pin ✅。 |

- **当前门禁**：R13-2 delta 三签齐（Codex + Kimi 用户转述 + GLM），**R13-2 delta 设计 allowed**。
  Codex 可开始实现 cursorHandoff stateMap + context-sensitive CFG + SAVE7 epoch 断开。
  实现完成后仍须逐批审查 accept；N3-1 不得标 done，C8/ED-5I 依赖不变。
- 2026-07-27 用户：转述 Kimi 已完成 R13-2 cursor handoff / SAVE 7 delta 设计审查并
  “签了”。登记为 Kimi `agree`；当前只缺 GLM 数据/覆盖设计签字。
- 2026-07-27 GLM：完成 R13-2 source census / SAVE 7 delta 设计审查并签 `agree`；用户随后
  确认“齐了”。三方无 `counter`，R13-2 恢复 **build**，唯一 Coding Owner 仍为 Codex。
- 最低验收矩阵：
  - context-sensitive CFG 锁定 delayed goto expiry 与 reset0 无 fallthrough，重建全域
    census/disposition/digest；
  - checkpoint 首轮 prefix+suffix、次轮 suffix、reset/advance 覆盖、四个条件臂、
    `0x04`/onTeleport discard-return、save safe point/abort、34 个真实持久 closure；
  - idle N=4/5/6/7/8/12、相位 k=0..9、`0x02/0x03/0x09` 共用 auto counter、11 地址/
    13 sites 逐站 trace；
  - stateMap 默认行为 byte-equivalent、原子映射、epoch bump、stale lease、非法 map
    fail-loud；
  - SAVE6 早拒绝与 SAVE7 中段续跑；历史 sidecar/P7/C8/R13-1 byte-pin，新 R13-2 seal
    MG2、二跑 `0/0/0`；
  - 全量 content/reforge/editor/migrate、真实浏览器 e4409 与 checkpoint 重入。

#### R13-2 implementation candidate 与 Codex 自验（2026-07-27）

**实现收口**：

- 通用 source CFG 升级为 `source-v2`：delayed goto 同时保留计数未满的 target 边与到期后的
  `address + 1`，`reset(idleFrames=0)` 不再伪造 fallthrough。R13-0 source census /
  disposition 均从源重新构建，未在旧报告上做算术补丁。
- canonical `selectEntityBehavior` 增加可选 `cursorHandoff.stateMap`，且只允许
  `selection.kind='use'`。runtime 从旧 effective behavior/cursor 精确匹配唯一映射，校验目标
  cursor 属于新 flow 后原子提交 selection + mapped cursor，最后 bump owner epoch。缺
  coordinator、来源 behavior 不符、重复/空/漏映射、悬空目标或错误 selection 均 fail-loud；
  未提供 handoff 的历史命令保持原行为。
- 上游新增 trigger activation/product-state 与 auto idle/delayed gate 投影；checkpoint、
  discard-return、reset/advance 及跨 behavior 有限相位均发布为稳定业务 state id，不把 PAL
  address、全局 counter 或第二解释器暴露给 canonical/editor。
- `CONTENT_VERSION=7`、`SAVE_VERSION=7`、PAL `minimumSaveVersion=7`。current 7/7
  preflight 在任何历史 sidecar I/O 前拒绝 SAVE6 及以下；历史 6/6 verifier、v4→v5 sidecar、
  P7/C8/R13-1 seal 保持只读 byte-pin，A7-4 顺延到 content/save 8。
- canonical `--write` 改为分进程事务：父进程执行 `--write-once` 并释放完整 PAL heap，再由
  新 Node 进程执行 `--verify-idempotence`，同时校验预期 source/runtime digest 与
  `writes=0 / deletes=0 / conflicts=0`。没有只手改 `projects/pal/**`。

**source、逐站闭包与发布证据**：

- source-v2：**43,503 instructions / 41,945 reachable / 1,558 unreachable /
  7,947 contexts / 81,674 execution sites（auto 18,955 / trigger 62,719）**。
- checkpoint：36 source addresses / 43 contexts；34 个新持久 closure、7 个
  onTeleport discard-return alias；`@763` reset 覆盖与既有 `@10747` s048 closure 分别纳账，
  未重复包装。
- R13-2 exact closure 共 **78**：34 checkpoint + 7 discard + 9 trigger delayed +
  13 auto idle + 15 auto delayed；对应 **77 个 closure target selector**，本批 open=0。
  “本批 open=0”不代表 R13-3～R13-6 或 R13-Z 已闭包。
- trigger delayed：7 owners / 9 addresses / 41 owner-expanded phases；auto idle：
  11 addresses / 13 execution sites / 84 phases；auto delayed：8 addresses / 15 execution
  sites / 1,657 phases。
- cursor handoff：18 个 command site；cases = e405 1、e4168 16、s231 crowd 176、
  e4409 13、e4440 15、e4723 24、reverse 2。installer seal 为 7 owners / 18 commands /
  247 cases；最终 owner flows 102，auxiliary targets 437 且全部 locale 闭合。
- e405 精确交接为 `first-wait-06 -> cycle-01-phase-06`，保留 e405 的 135 次移动，未误退化
  为 e406 的 140 次。e4409 的 0x09 残余相位通过显式 stateMap 继承，未使用 hidden
  flag/counter。
- 新 append-only `r13-cross-activation-v1` 以
  `r13-cadence-v1 / 794659488a19cd131e2b5f7db235b62607264c9b77978edd36318119937dd80a`
  为 parent；R13-1 文件 SHA 继续为
  `2b1e71b018ffba8aecd4adea628c325dd4f67e338508b22f6ed06f4517683453`。
- R13-2 seal digest：
  `d20c06c821a044a6f6be2430da1d660d801a00b03b210082ba954e76b09bc686`；
  evidence digest：
  `4d2b6c10b9dad841e485efcb6f6ff52a07bf2e4699df35b99f09833f6f1e52cc`；
  文件 SHA-256：
  `723e4fd29f7d69aa861d67d5188038d242c1f5ff619d5c7fdce2854bdf50db12`。
- source / census / disposition digest：
  `071fd1b359deb391a072c32f8bf72b86e9f0d9c2904893b35300998fd59c78c7` /
  `3d19fb14b8261fd5a0e48f20cbd1e80fc57c31622624bb09126eb86ea2cb13ac` /
  `36349824878131b5e67db7ba9edc7d1a00dd864aa88737cb0cd89b304181a79e`。
- formal migration disposition / runtime digest：
  `0c7879c05405c0c41fe2c56805a5fb00b0bf24b323a4927b8e8e1d2063ae539b` /
  `556885e1982542f9e3a66356e93f9b1ea5471ab5666328440b098dbd1a031ce9`。

**全量测试发现并关闭的最后反例**：

- 首轮 migrate 总测反证 s057/s180 的 checkpoint stateMachine 同时保留了
  `initial.entry`，又从 source root 把 prepare+dither 重译进 `initial.body`，会让入场准备和
  淡入执行两次。根因在 R13 activation compiler 只重新挂 entry、未消费 entry 已接管的源前缀。
- 上游修复在 checkpoint 线性续接后、任何 branch/confirm/plain 控制拆分前定位首个顶层
  `ditherScreen`，用生产 projector 对 raw prefix 与 `entry.prepare` 做 `stableJson` 精确比较，
  同时校验 reveal ms；不匹配即携 owner/state fail-loud。随后重新生成，而非手改场景产物。
- 最终 s057 initial body 为 `selectEntityBehavior -> dialog -> playMusic`，s180 为
  `dialog（两行） -> playMusic`；两者仍 `advance -> after-checkpoint`，后缀均只执行
  `playMusic` 后 `stay`。project/baseline 两份 s057、s180 分别字节成对。
- cadence compatibility 不再把 R13-1 的 `auto-lifecycle-*` 命名约定错误套到 R13-2；
  现按已发布 R13-1 seal 精确冻结 22 个旧 owner，其余 56 个 R13-2 transition machine 严格
  使用 `machine`。successor omitted-flow oracle 为 4,576 rows / 7,946,865 bytes /
  SHA-256 `b27b0fdf9d94ac74f743e66aeea523d6df497d924155f0458b49eaea22ae536b`。

**自动与真实链验证**：

- content typecheck + **28 files / 349 tests**；Reforge typecheck +
  **69 / 680**；editor typecheck + **91 / 770**；migrate typecheck 全绿。
- 完整 migrate 单 worker：**73 files / 508 passed / 1 skipped**，耗时
  **2,118.96s（35m18.96s）**。这是优化前、全文件 fresh-isolate 的 release 历史基线；
  当时没有关闭 isolate、跳过重测或放宽断言。后续 fast/release 双门收口见下节，
  fast 耗时不得冒充 release 耗时。
- canonical `--write` 完整通过 `--write-once` 与新进程 `--verify-idempotence`；事务后
  fresh verifier 及最终 formal dry-run 均为 `writes=0 / deletes=0 / conflicts=0`。资源物化
  **1,879 files / 68,439,367 bytes / writes=0**；`git diff --check` 通过。
- s020/e362：第一次交互出现“哇……好清澈的泉水”，执行完成后再次交互直接进入
  “李逍遥饮下一口灵池中的……”；证明 checkpoint 首轮 prefix+suffix、次轮 suffix 生效。
- s250/e4409：真实进入 enemy team 315 战斗；`selectEntityBehavior(cursorHandoff)` 在
  `startBattle` 前完成跨 behavior 相位交接，console 0 error / 0 warn，真实链没有宽松 fallback。
- 最后增量另经只读代码审查，未发现 blocker；scene-entry prefix、fresh-session 负测、
  stages/stateMachine collector 与 cadence 22/56 拆分均逐项复核。

**migrate 测试性能债收口（2026-07-28）**：

- 门禁明确拆为两层。`test` / `test:fast` 是日常开发门：61 个 unit 文件继续隔离并行，
  9 个 PAL shared 文件串行复用 immutable core/phase/generated fixture，3 个 PAL fresh
  文件仍各自隔离。`test:release` 对同一份 73 文件 manifest 全部 fresh-isolate、串行重建；
  migrate 包 `check` / `check:release` 与仓库根 `pnpm check` 仍走正式 release 门，
  `check:fast` 只用于快速反馈。真实收集核对 fast/release 均为 **512 个 active test**，
  无文件或测试项差集。
- 没有把正确性换成缓存命中。P2-P6 prepared transition 每次复用都核对输入对象身份和
  target/ledger 自摘要；seeded corpus reader 只处理已验证的 COW file diff，复杂 topology
  自动退回完整 reader，并用 metadata、正文和物理 rechunk 对 full reader 做深相等回归。
  source corpus 预计算 body hash 与 inbound ScriptRef 索引，消除了阶段间重复全库扫描。
- R13 fast prepared authority 每次仍校验 exact identity、evidence 自摘要、完整 validator
  与 live canonical target。release 不调用 fast fixture getter；每个 fresh 文件从 live PAL
  输入重建 cadence/cross authority 一次，之后 replay、伪造 seal 和 target drift 复用该
  immutable authority，但每个成功 plan 仍重新合并并从当前 cadence target 构建 target
  evidence。原先 3 条 fast-only prepared 防漂移测试现也在 release 执行。
- C8/P7 只对临时 merge 输入做 copy-on-write 结构共享；发布 `nextBaseline` 仍深克隆，
  并有返回值 mutation 不得污染 generated input 的隔离回归；实现自验与独立只读复核均
  确认该边界安全。
- 连续唤醒、AC 供电且使用 `caffeinate -i /usr/bin/time -l` 的完整 fast 结果为
  **73/73 files、512 passed / 1 skipped，Vitest 889.27s，real 889.77s
  （14m49.77s），peak RSS 3.194GB**。首轮同配置为 2,042.17s（34m02.17s）且 P4
  超时，日常反馈 wall time 缩短 **56.5%** 并消除该超时。
- PAL shared 组从首轮 **60 tests / 1,622.92s（27m02.92s）** 降至默认顺序
  **63/63 / 633.20s（10m33.20s）**，缩短约 **61.0%**。固定
  `--sequence.shuffle.files --sequence.seed=20260728` 的非默认顺序同样
  **9/9 files、63/63 / 667.98s（real 668.47s）**，证明复用不依赖文件顺序。
- 关键正式门全部使用 release config：P2/P3/P4 live rebuild **3 files / 20/20 /
  755.07s（real 755.67s）**，release core pin 仍为 `e29bfd90…` / `d7102cbc…` /
  `f33fcdb…`；R13 cadence/cross live authority **2 / 17/17 / 615.21s
  （real 615.80s）**。R13 首轮暴露两条 180s 硬上限假红后，没有增大 timeout，而是把
  同一 fresh 文件内重复的 disposition/census 从 3/6 次收敛为 1/2 次；原命令由
  943.77s 降至 615.21s，planner replay、伪造 authority 拒绝和 live target drift 均保留。
- 一次 9,917s wall 异常不计入基准：该次 CPU 仅约 962s，`pmset` 证明机器在
  19:04—20:50 进入 Deep Idle。后续长测统一在防休眠条件下计时，避免把系统睡眠误判为
  测试回退。剩余较慢项是刻意保留的 full-source disposition、live bundle 与 release
  authority 重建，不再是每个 mutation case 重复构造整套 PAL。

R13-2 只关闭 checkpoint / idleFrames / delayed goto / cursor handoff 批次；R13-3 投掷、
R13-4 confirm、R13-5 enemy、R13-6 approved-lossy 与 R13-Z publication 仍未完成。
N3-1、C8、ED-5I 均不得标 `done`。

##### R13-2 批次实现审查签字

| Agent | 签字 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **accept** | 2026-07-27 | source-v2、34 checkpoint closure、11 idle gate、delayed goto、18 个 cursor handoff site 与 SAVE/content 7 已由上游实现并重迁；分进程正式写入后二跑 0/0/0，content/reforge/editor 与完整 migrate 单 worker 总测全绿，s020/e362 checkpoint 重入与 s250/e4409 跨 behavior 战斗链浏览器通过。accept 只表示 R13-2 可送 Kimi/GLM 实现审查，不代表 R13-3～R13-Z、N3-1、C8 或 ED-5I 完成。 |
| Kimi | **accept** | 2026-07-28 | 只读 runtime/schema/save 实现审查通过：handoff 校验全在 mutation 前、原子提交 + epoch 最后 bump、stale lease/save barrier/abort 无覆盖路径（一手读 script-world-v5.ts:244-309）；e405 135 次与 e4409 k=0..9 产物实证；18 站/247 cases 与 seal 一致；SAVE 7 无 sidecar I/O 早拒绝；一手 sha256 复核 P7/C8/R13-1/R13-2 控制账；s057/s180 前缀单次执行机制核实。记录项 3 条见交接日志。accept 仅准入 R13-3。 |
| GLM | **accept** | 2026-07-28 | 独立复跑：content 28/349、reforge 69/680、editor 91/770 全绿；R13 census+disposition 3/30 + PAL exact 1/1（254s）隔离通过；dry-run 0/0/0；source-v2 43,503/41,945/1,558/7,947/81,674 独立确认；source digest `0c7879c0…` + runtime digest `556885e1…` 匹配；seal 链 R13-2 `d20c06…`→R13-1 `794659…`→C8 `fbdbd50…`→P7 `9b01de…` byte-pin 确认；CONTENT_VERSION=7/SAVE_VERSION=7/minimumSaveVersion=7 确认；7,715 open observations 是 R13-3~R13-6 输入非完成声明。全量并行 4 files 合跑 OOM 是测试基础设施债务非正确性。 |

- **当前门禁**：Codex / GLM / Kimi 三席 `accept` 已齐（2026-07-28），**R13-3 准入开放**。
  N3-1、C8、ED-5I 状态不变；R13-2 accept 不代表 R13-Z/N3-1 完成。
- 2026-07-27 Codex：完成 R13-2 implementation candidate、自验、正式重迁和真实浏览器回归。
  Next：Kimi / GLM 按下方提示词并行只读审查；任一 `counter` 均回到 R13-2 rework。
- 2026-07-28 Kimi：完成 R13-2 runtime/schema/save 只读实现审查，签 **accept**（仅准入 R13-3）。
  一手核实：`selectEntityBehaviorV5`（script-world-v5.ts:244-309）全部 fail-loud（264/266/268/
  277/280-286/287-294/295-297）先于唯一写点（305），selection+mapped cursor 同克隆单次提交、
  epoch 最后 bump（306-307），stale lease 由 epoch 拦截（453）、finish 身份校验（627-629）、
  save barrier 内 gate 关闭且 active=0 才 ready；e4409 stateMap 产物一手抽核（s250.json：
  wait-01→remaining-04 … wait-04+→remaining-01、pursuit/route-choice→remaining-04）；
  一手 sha256：P7 `41263ba1…`、C8 `325d52ed…`、R13-1 `2b1e71b0…`、R13-2 `723e4fd2…`，
  parent 链 cross→cadence `79465948…` 一致；实跑 reforge 焦点 5 files / **105 passed**
  （script-world-v5/script-project-v5/epoch-v7/migration/ops）。迁移侧全量独立核查：e405
  135 次（0x24 不清 auto 计数 + 实体帧序论证 + s021.json first-wait-06→cycle-01-phase-06）、
  18 站/247 cases 与 seal 逐键一致、s057/s180 前缀在控制拆分前 stableJson 比对 + fail-loud、
  source-v2 17 条 delayed goto 双边齐全、34 persistent + 7 discard + 2 inherited = 43 sites。
  记录项（非反例）：①`script-project-v5.test.ts:404` 测试名残留 "SAVE6"（体内已用
  buildPayloadV7，建议更名）；②`selectEntityPage` 分支无 exactKeys，手写 JSON 把
  cursorHandoff 错放到 selectEntityPage 会被校验静默接受、runtime 静默丢弃（无损坏向量，
  但不符合"错放即 fail-loud"严格读法，建议后续小改补 exactKeys）；③
  `r13-cross-activation-mg2.pal.test.ts` 单文件超过审查环境 300s 上限未实跑，已由 seal 直检 +
  disposition pal（228s）+ cadence pal（4,576 rows / SHA `b27b0fdf…`）+ closure digest 抽查
  三角验证，Codex 35m 全量总测 73 files / 508 passed 覆盖。未修改实现/产物/baseline。
  Next：R13-3（58 件投掷闭包），Codex 仍唯一 Coding Owner。

#### R13-3 投掷公共 schema / runtime / MG2 delta 设计门禁（2026-07-28）

##### 重新盘点与阻塞原因

R13-2 三方 `accept` 只开放了 R13-3 的业务批次，并未授权新增公共字段。Codex 在进入实现前
从源 `scriptOnThrow`、一阶段 `battle-opcodes.ts/simulateMagic`、当前 canonical item schema、
Reforge battle runtime 和编辑器反向盘点，确认现有
`ThrowSpec.effects: ItemUseEffect[]` 无法无损表达本批；根据 P7-R13 总设计中的
“schema/save delta 另签”，本节形成新的聚焦设计门禁，三签齐前不得改实现或生成 PAL。

- 源 `throwable && scriptOnThrow > 0`：**76 件**。
- 当前 build / baseline / `projects/pal`：均只有 **18 件**具有 `throw`，集合为
  `116–125、130、133、137–139、144、147、159`。
- 缺失 **58 件 = 48 pending + 10 silent-empty**。58 条 root 覆盖 160 个 execution site /
  145 个唯一源地址；其中 10 条正伤害 `0x42` 被旧 translator 静默返回 `effects=[]`。
- 不能只验 presence。现有 18 件中的 **133 赤蝎粉**源链为
  `0x42[372,0,0] -> 0x28[1,551,0] -> end`；magic 63 为
  `baseDamage=150 / elemental=6 / applyToAll`，当前最终数据只剩 `applyPoison`，
  已丢伤害和全体目标。因此 R13-3 必须审计全部 **76 roots**：
  **58 absent restored + 1 present-but-lossy corrected + 17 existing roots exact-proven**。
- 源全体投掷精确为 **11 件**：
  `67、68、69、70、71、115、133、134、142、157、162`；其余 65 件为单体。
- 58 件缺失按根链精确分族：

| 根链族 | 件数 | 物品 |
|---|---:|---|
| `0x66 -> end` 武器投掷 | 32 | 163–194 |
| `0x42 -> end` 正伤害模拟法术 | 10 | 66–71、115、142、143、146 |
| `0x42 -> 0x21 -> end` 演出 + 固定伤害 | 7 | 153–156、161、162、255 |
| `0x42 -> 0x2E -> 0x21 -> end` 抗性门 + 状态 + 固定伤害 | 6 | 126–128、135、140、160 |
| `0x64 -> 0x60 -> end` HP 门槛即死 | 1 | 134 |
| `0x42 -> 0x28 -> 0x21 -> end` 施毒 + 固定伤害 | 1 | 157 |
| `0x42 -> 0x39 -> end` 吸血 | 1 | 158 |

##### 冻结的最小 canonical schema

投掷效果从 `ItemUseEffect` 独立成专用联合；只抽取 `StatusId`、`SkillAnimation` 等真正共享的
值类型，不复用整套 `SkillEffect`，也不把 PAL opcode、magic object id 或 item id 带入
canonical/runtime。

```ts
export type ThrowTarget = 'oneEnemy' | 'allEnemies'

export type ThrowElement =
  | 'none'
  | 'wind'
  | 'thunder'
  | 'water'
  | 'fire'
  | 'earth'
  | 'poison'

export type ThrowMagicStrength =
  | { kind: 'fixed'; value: number }
  | {
      kind: 'casterAttack'
      bonus: number
      multiplier: { kind: 'uniformInt'; min: number; max: number }
    }

export type ThrowEffect =
  | {
      kind: 'magicDamage'
      baseDamage: number
      element: ThrowElement
      strength: ThrowMagicStrength
    }
  | { kind: 'fixedDamage'; amount: number }
  | { kind: 'applyPoison'; poisonId: string }
  | {
      kind: 'currentHpDamage'
      numerator: number
      denominator: number
      bonus: number
      cap: number
    }
  | {
      kind: 'applyStatus'
      status: StatusId
      turns: number
      onResist: 'continue' | 'stopTarget'
    }
  | { kind: 'killIfHpAtMost'; percent: number }
  | { kind: 'damageAndHealCaster'; damage: number; heal: number }

export interface ThrowSpec {
  target: ThrowTarget
  effects: ThrowEffect[]
  sound?: AssetId
  presentation?: { kind: 'magic'; animation: SkillAnimation }
}
```

冻结语义：

1. `effects` 对每个目标按数组顺序执行；`applyStatus` 精确掷一次巫抗，抵抗后由必填
   `onResist` 决定继续或只截断**该目标**的后续效果，全体投掷继续处理其他活敌。六条
   `0x2E -> 0x21` 投影为 `applyStatus(onResist:'stopTarget') -> fixedDamage`，不得暗掷第二次，
   也不得因一个目标抵抗而截断其他目标。
2. `0x28` 的 `applyPoison` 自带现有巫抗判定，但抵抗不截断后续效果；毒配对致死继续消费
   `PoisonDef.lethalWith`，不得复制第二份相克表。特别是六条
   `0x28 -> 0x5E -> 0x60`：`0x28` 无失败跳转，故即使本次施毒被抵抗，仍须按目标**既有**
   配对毒执行 `0x5E/0x60`；lethalWith 检查不能藏在“本次 applyPoison 成功”分支内。
3. `magicDamage` 走 `calcMagicDamage` 的 SimulateMagic 语义：
   `minDamage=0`、敌防/元素/毒抗/战场五灵与每敌独立伤害浮动均保留，不得复用
   “施法者 magicStrength + 保底 1”的 `dealSkillDamage`。`ThrowElement` 是公共语义名，
   source-backed 迁移在边界把 PAL `0..6` 显式映射为
   `none/wind/thunder/water/fire/earth/poison`，canonical 不保存魔法元素编号。
4. `strength.fixed.value` 是 `0x42 operand1`；`casterAttack` 为
   `bonus + 施掷者有效 attackStrength × inclusiveRandom(multiplier.min,multiplier.max)`。
   本批 32 件固定 `bonus=operand1×5 / min=0 / max=3`。strength 掷值按一次
   effect/action 求值；伤害浮动仍逐敌求值。
5. 正伤害 `0x42` 同时生成 `magicDamage + presentation`；只有 resolved magic 的 signed
   `baseDamage < 0` 且确认结算为 0 的 sentinel 才能 presentation-only。
6. `fixedDamage` 不走法术/物理减伤；`damageAndHealCaster` 的 `damage` 与 `heal` 是两个
   明确的固定源量，即使目标余血不足，也仍按 `heal` 给施掷者回血并钳 `maxHp`；本批
   `0x39` 两者均为 180。原子 `killIfHpAtMost` 按每敌满血独立判断，避免把逐目标条件误实现成
   截断整条全体链的全局 gate。
7. `ThrowSpec.target` 是 gameplay 和 UI 的唯一目标权威。`allEnemies` 不进入单敌选择；
   `oneEnemy` 保持选择、死亡目标重选。全体动作只消费一件，不能按目标重复扣库存。
8. validator 要求 `target`、非空 `effects`、判别联合 exact keys、全部数值为有限安全范围；
   非法 kind/空毒 id/无效百分比/倒置随机区间在扣库存和保存前 fail-closed。
9. `currentHpDamage` 从 `ItemUseEffect` 移入独立 `ThrowEffect`，`ItemUseContext` 收回为
   `world | battle`；`applyPoison` 在两个联合中各自保留同名、同底层毒系统语义，但不再用
   “throw 是 use 的第三种 context”把两套能力耦合。`ItemUseEffectV5` 与投掷 v5 投影也必须
   分离，不能再让任意使用效果借类型漏洞进入投掷链。

##### 内容版本与存档双轴

- 本次为公共内容 schema 变化，`CONTENT_VERSION` **7 -> 8**；新增纯
  `content v7 -> v8` 工程升级：
  - 旧 v7 validator 允许的 throw 只可能含 `applyPoison/currentHpDamage`，两种可无损原样转入
    `ThrowEffect`；
  - 旧引擎始终进入单敌选择，任意作者 v7 throw 的新增 `target` 确定为 `oneEnemy`；
  - PAL 不依赖这一缺省恢复全体语义，而由 source-backed R13-3 augmentation 重建 76 roots。
- 世界存档形状没有新增字段，`SAVE_VERSION` 保持 **7**，`minimumSaveVersion` 保持 **7**。
  当前组合为 `SAVE 7 / content 8`；`SAVE 7 / content 7` 允许走内建、输入不变的 content-epoch
  identity normalization（只把 payload `contentVersion` 升为 8，世界体 deep-equal），无需读取
  历史 sidecar。SAVE/content 6 及更早仍由既有 R13-2 epoch 门在任何 sidecar I/O 前拒绝。
- 保留 historical 7/7 preflight/normalizer 的 byte-pin 测试；不得把本次内容 schema 变化
  机械升级成 SAVE 8，也不得在作者 UI 重新出现“旧存档保护”文案。

##### Append-only 生成与 MG2

1. 已发布 P7 / C8 / R13-1 / R13-2 transition id、seal 文件、metadata 与 digest 全部 immutable。
   尤其 `r13-cross-activation-v1` 已密封 full disposition 及 raw/augmented/final digest；
   直接修改旧 raw translator 后拿新 snapshot 重放 R13-2 会漂移，禁止这样实现。
2. `P7GeneratedCanonical` 增加显式 `r13CrossActivationParentSnapshot`。旧 R13-2 authority /
   disposition 只从该 parent 重建并必须 byte-identical；R13-3 source-backed item augmentation
   只产生 successor snapshot/evidence，不反向污染 parent。
3. 新建纯 `augmentR13ItemThrows`（最终文件名可为
   `r13-item-throw-augmentation.ts`）：解析 object→magic 并重建全部 76 roots；
   evidence 固定 76 root、58 absent、133 lossy correction、17 existing exact、11 all-target、
   分族计数、源 closure digest 与 final target digest。
4. 新建外层 transition **`r13-item-throw-v1`**，seal 路径
   **`_transitions/r13-item-throw-v1.json`**，parent 精确指向已发布
   `r13-cross-activation-v1` digest。先完整 replay R13-2 parent，再合并 R13-3 successor；
   seal 只写 baseline/metadata，不能泄漏进 generated/project/target。
5. R13-3 disposition 使用保留的 rawContent/rawProjection 做源观察，同时以 successor
   `content/items.json` 销账 48 pending、10 silent-empty 和 133 present-but-lossy；
   initialize/replay/half-state/tamper/伪 authority/target drift 任一不一致均零写。
6. 这仍是上游迁移修复；不得手改 `projects/pal`，不得改旧 baseline/seal，不得塞回 C8，
   不得在 runtime 按 PAL item id 特判。

##### 实现与验收矩阵

- **content**：独立 `ThrowEffect`/`ThrowTarget`/`ThrowElement`/validator/v5 映射，
  `ItemUseEffect`/`ItemUseContext` 收回使用域；v7→v8 工程升级；中文 effect label 与类型导出完整。
- **migrate**：source-backed 76-root augmentation、R13-3 evidence/seal/disposition；
  正式生成一次、fresh process replay、dry-run 均 0/0/0。
- **reforge**：`BattleAction.throw.targetEnemyIdx` 只对单体必需；全体跳过目标 UI；
  `performThrow` 在消费前完整校验，按目标执行有序链；表现层能呈现单/多目标伤害和 magic animation。
- **editor**：在同一物品能力容器内新增 typed `ThrowEffectChainEditor`，复用现有通用的效果行
  布局、数值控件、声音/演出控件与弹窗/属性面板；不得复制一套 `ItemUseEffect` 语义解释器或
  另造通用脚本编辑器。投掷目标和全部 7 类效果均有中文名称、添加/修改/删除/排序、undo/redo、
  保存重开闭环；新启用投掷的默认值为 `oneEnemy + fixedDamage(1)`，不生成私有脚本。
- **源/目标总账硬门**：
  - source roots = 76；
  - final runnable throw = 76；
  - source-final missing = 0；
  - 58 absent 全部 restored；
  - 133 伤害/毒/全体三项齐；
  - 17 existing roots exact-proven；
  - pendingThrow / silent-empty / R13-3 open observation / open execution site 全为 0；
  - 11 all-target 集合精确一致，其余 65 单体。
- **定点 runtime**：
  - 10 个正伤害 `0x42` 的伤害/元素/单全体/动画；
  - 32 个 `0x66` 的 RNG 0/3、有效攻击力、minDamage 0；
  - sentinel `0x42 + 0x21`；
  - `0x2E + 0x21` 命中继续、抵抗截断且不双掷；
  - `0x64 + 0x60` 阈值两侧与全体混合血线；
  - `0x42 + 0x28 + 0x21` 施毒抵抗后仍固定伤害；
  - `0x39` 正常/过杀/治疗封顶；
  - 既有 `0x5B`、毒配对致死、单体重选、全体直提、repeat/预占/每次只消费一件回归。
- **MG2/版本**：旧四层 seal byte-pin；R13-3 initialize/replay/half-state/tamper/drift；
  content 7→8 输入不变和幂等；SAVE 7/content 7→8 identity normalization 与非法轴组合；
  fast prepared exact-identity + release live rebuild 均覆盖新 R13-3 文件。
- **最终门**：content/reforge/editor/migrate 定点、migrate fast、相关 release live authority、
  root typecheck/lint/build、PAL 单体与全体真实浏览器投掷、正式重迁二跑零计划。R13-3 三方
  实现 `accept` 前不得进入 R13-4。

不可接受的降级包括：把固定伤害伪装成 `currentHpDamage`、把正伤害 `0x42` 当纯演出、
把 `0x66` 静态化或误用 magicAttack、继续丢 32 件武器、全体仍只打一个敌、仅凭
“76 件都有 throw”宣称闭包、canonical 保存 raw opcode/object id，以及修改旧 seal 让重放
“看起来通过”。

##### R13-3 schema delta `build` 推进签字

| Agent | 签字 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **agree** | 2026-07-28 | 已从 76 源 roots、当前 18、48 pending、10 silent-empty、一阶段 opcode/runtime 与当前 content/reforge/editor 边界完成只读差集；确认 133 是 presence 之外的 present-but-lossy。接受独立 ThrowEffect、content 8 / SAVE 7 双轴、R13-2 immutable parent 与 append-only `r13-item-throw-v1`。 |
| Kimi | **agree** | 2026-07-28 | 架构/runtime/MG2 主审通过：ThrowEffect 7 类最小充分覆盖 8 族根链（133/134/158 等一手核对）；0x2E 单掷 stopTarget、0x28 抵抗续跑、0x39 定值、0x42 minDamage=0、0x66 有效攻击+inclusive 0..3 逐条对源成立；CONTENT 8/SAVE 7 + identity normalization、R13-2 存储快照 parent + 外层 seal 的 replay byte-identical 成立；附 K1-K6 风险钉（见「Kimi R13-3 设计主审」）。GLM 未 agree 前不得开始实现。 |
| GLM | **agree** | 2026-07-28 | 独立核对：source 76 / final 18 / missing 58 全部精确匹配；7 族分族 32/10/7/6/1/1/1 逐条确认；11 全体目标集合精确匹配。**G1 已撤回**：经独立复核源 object-magic 链，16 件（116-125,130,138,139,144,147,159）`0x42[24,0,0]`→object24→magic96→`baseDamage=64537`→SHORT(-999)→SimulateMagic minDamage=0→**0 伤害 sentinel**，非 gameplay damage；6 件 `0x5E/0x60` 是配对毒 lethalWith 而非 HP 门。133 `0x42[372]`→magic63 `baseDamage=150/elemental=6/applyToAll=true` 确为唯一 present-but-lossy。总账 58 absent + 1 lossy + 17 exact-proven 成立。schema delta / content 8 / SAVE 7 / seal 链 / 测试矩阵全部成立。**不得给 16 个 sentinel 制造伤害，不得给 6 个毒对生成 killIfHpAtMost。** |

- **当前门禁**：三签齐（Codex + Kimi + GLM 均 `agree`），**R13-3 schema delta build allowed**。
  GLM G1 已撤回（2026-07-28）：经独立复核源 object-magic 链确认 16 件 sentinel 0 伤害 + 6 件
  lethalWith 配对毒，Codex 签字备注中的裁决成立。**不得给 16 个 sentinel 制造伤害，不得给 6 个
  毒对生成 killIfHpAtMost。** Codex 可开始 R13-3 实现。
- **状态边界**：任务卡总状态仍为 `build`，R13-3 schema 子门禁已解除；R13-2 的三方
  `accept` 不撤销。N3-1、C8、ED-5I 均未完成。
- 2026-07-28 Codex：完成 R13-3 只读源差集、schema/runtime/editor/MG2 最小增量设计并签
  **agree**；额外发现 item 133 的 present-but-lossy，故验收从“补 58 件”升级为“76 roots
  逐条闭包”。本轮只修改任务卡与看板，未改实现、生成产物、baseline 或 seal。
  Next：Kimi 与 GLM 可并行执行下方两份设计主审；两席均 `agree` 前 Coding Owner 保持等待。

##### GLM G1 定点争议裁决（2026-07-28，GLM 已确认撤回）

Codex 没有按附加项直接扩大实现，而是对 17 个 `applyPoison` root 逐 ID 回到
`items -> events -> object-magics -> magic -> final throw` 机器复核。结果支持原冻结口径，
反驳“17 个全部丢伤害”和“6 个丢 HP 门槛即死”：

1. 除 133 外的 16 件
   `116–125、130、138、139、144、147、159` 都以 `0x42[24,0,0]` 开头；object 24
   指向 magic 96，`baseDamage=64537` 作为 `SHORT` 精确等于 **-999**。SimulateMagic
   使用 `magStr=0 / minDamage=0`，所以该步对任意敌人结算均为 **0 伤害**；它是投掷
   OffMagic 演出 sentinel，不是被丢失的 gameplay damage。16 件最终数据均已保留对应
   `presentation`。
2. 一阶段真值已把这条写成公式和回归：
   `packages/game/src/core/battle/magic-damage.ts:10-23,265-305` 与
   `packages/game/src/core/battle/__tests__/magic-damage.test.ts:154-166` 明确验证
   `64537 -> SHORT -999 -> 0 damage`。若按 G1 给这 16 件新增正伤害，反而会制造源不存在的伤害。
3. `122–125、138、139` 的 `0x5E[pairedPoison] -> 0x60` 不是 HP 门槛：
   `0x5E` 查询目标是否已有配对毒，存在才继续 `0x60` 即死。该关系已单源数据化为
   `PoisonDef.lethalWith`（`pal-derived-content.ts:63-126`），Reforge 投掷命中后在
   `battle-core.ts:1600-1612` 执行；这 6 件并未丢失致死语义，也不应再生成
   `killIfHpAtMost`，否则会重复或错误即死。
4. 133 的 `0x42[372,0,0]` 才解析到 magic 63：
   `baseDamage=150 / elemental=6 / applyToAll=true`，当前又没有 presentation，确为唯一
   present-but-lossy。第 18 个已有 root 137 为既有 `currentHpDamage`，所以冻结总账仍是
   **58 absent + 1 present-but-lossy + 17 exact-proven**。
5. 定点复跑通过：
   - game magic-damage：1 file / 23 tests；
   - reforge 投掷致死组合：3 tests；
   - migrate 投掷/0x42：6 tests；
   合计 **32 passed**。

**裁决**：保留 GLM 的 76/18/58、七族计数、11 全体集合和 133 结论；拒绝 G1 对另外
16 件的“伤害缺失”及 6 件的 `killIfHpAtMost` 映射。由于 G1 被写成签字附带“必落”，仍需
GLM 在自己的签字/交接记录明确撤回 G1 或给出能推翻 signed-short sentinel、
`PoisonDef.lethalWith` 与上述 32 项测试的一手反证。Kimi 已在 K2 精确覆盖同一事实，无需重审。

- 2026-07-28 GLM：完成定点复核并在自己的签字行明确撤回 G1；确认 16 件为
  signed-short `-999` 零伤害 sentinel、6 件为 `PoisonDef.lethalWith` 配对毒、133 为唯一
  present-but-lossy。三签恢复无分歧，R13-3 build allowed。
- 2026-07-29 Codex：在逐 ID 复核中进一步发现六件配对毒的端到端 runtime gap：
  `performThrow` 当前只在本次 `applyPoisonToEnemy` 成功时检查 `lethalWith`，但源
  `0x28` 被抵抗后仍自然续到 `0x5E/0x60`，目标若已有配对毒仍应即死。该项是已签
  `0x28 抵抗续跑 + lethalWith 单源` 语义内的实现修正，不新增 schema；R13-3 必须改掉现有
  错误测试并覆盖“抵抗 + 已有配对毒仍即死 / 抵抗 + 无配对毒不即死”。

##### Kimi R13-3 设计主审（2026-07-28）

**方法**：只读设计审查。对 sdlpal script.c、docs/phase1/game-mechanics.md 巫抗/投掷节、
提取数据链与 flags、现有 battle-core 巫抗实现逐项一手核对；未读实现分支，未改实现。

**逐项结论**：

1. **ThrowEffect 7 类最小充分** ✅。8 族根链逐族有落点：0x66→magicDamage(casterAttack)、
   0x42→magicDamage(fixed)+presentation、0x42+0x21→+fixedDamage、0x42+0x2E+0x21→
   +applyStatus(stopTarget)、0x64+0x60→killIfHpAtMost、0x42+0x28+0x21→+applyPoison、
   0x42+0x39→+damageAndHealCaster、既有 0x5B→currentHpDamage（移入）。无冗余 kind
   （onResist:'continue' 本批无实例，见 K3）。
2. **源语义忠实性** ✅（一手核对）：0x2E 单次巫抗+stopTarget（script.c:1377-1397 失败跳
   op2）；0x28 抵抗后**不截断**续跑固定伤害（script.c:1175 无跳转）；0x39 定伤定回
   （L_39263 实证 `0x42[24]→0x39[180]`，sentinel presentation + damageAndHealCaster(180,180)）；
   0x42 minDamage=0（一阶段 applyMagicDamage 真值）；0x66 `w=op1×5+有效攻击×RandomLong(0,3)`
   inclusive（script.c:2007-2014）；134 为 `0x64[5,38780]→0x60`（L_39592 实证），
   killIfHpAtMost{percent:5} 且 flags.applyToAll=true（全体逐敌独立判断成立）；133 为
   `0x42[372]→0x28[1,551]`（L_39260 实证），全体+施毒+伤害三项齐的证据成立。
3. **单体/全体与消费闭环** ✅：target 为唯一权威（11 全体精确集，134/133 flags 抽查吻合）；
   全体一次消费、不进单敌选择；oneEnemy 死亡重选；validator 在扣库存与保存前 fail-closed。
4. **CONTENT 7→8 / SAVE 7** ✅：投掷是内容 schema，世界存档无新字段，SAVE 保持 7 成立；
   SAVE7/content7→8 identity normalization（只升 contentVersion、世界体 deep-equal、不读
   sidecar）是正确的最小路径；历史 7/7 verifier byte-pin 保留。
5. **R13-2 immutable parent + 外层 seal** ✅：`r13CrossActivationParentSnapshot` 存储快照是
   旧 seal byte-identical replay 的唯一正确姿势——parent 只从快照重建（不得用当前代码
   重生成），R13-3 只产 successor；seal 只写 baseline/metadata。序列化形状不变（kind 名
   不变）使 C8/R13-1 的既有产物在新 union 下字节稳定。
6. **类型分离与编辑器** ✅：Throw 与 ItemUseEffect 分离、ItemUseContext 收回 world|battle；
   typed ThrowEffectChainEditor 复用通用控件、不复制 ItemUseEffect 解释器；applyPoison 同名
   双 union 但底层毒系统（抗性、lethalWith 相克）单源，不构成重复系统。

**风险钉（K，实现验收核对，不阻塞 agree）**：

- **K1 巫抗公式必须沿用 phase-2 已定修复语义**：`roll >= 巫抗`（battle-core.ts:434-442
  `applyPoisonToEnemy` 与 :837 灵抗门同构），applyStatus 与 applyPoison 单源共享；原版
  0x2E 的 `>` 公式是 90%-cap bug（game-mechanics.md:723-727 铁证），phase-2 已统一修复，
  投掷侧不得复活 bug 公式，也不得复制第二份判定实现。
- **K2 magicDamage.baseDamage 与 strength 的关系必须钉死**：strength 是 SimulateMagic 的
  magStr 唯一来源（0x42 op1 / 0x66 的 w）；baseDamage 仅承载 magic object 的 wBaseDamage
  语义用于 sentinel 判定（signed<0 且结算 0 → presentation-only）；0x66 时 sdlpal 用 w
  替代 object baseDamage——baseDamage 不得参与伤害结算，validator 注释写明。
- **2026-07-29 Codex 一手纠正 K2 末句（实现按冻结语义 3/4，不改 Kimi agree）**：
  `reference/sdlpal/fight.c` 的 `0x66` 先把
  `op1×5 + 有效 attackStrength×RandomLong(0,3)` 算成 `w`，再以 `w` 作为
  `PAL_CalcMagicDamage` 的 `magStr`；该函数仍会加入 magic object 的 `wBaseDamage`。
  本批相关 magic 360/344 的 baseDamage 为 40/198，并非 0。因此正确投影是
  `strength=casterAttack(...)` 与 `baseDamage=magic.wBaseDamage` 同时参与各自公式位置；
  “不得参与伤害结算”只对已证明结算为 0、被省略 gameplay effect 的 signed-negative
  sentinel 成立。K2 原末句与本卡冻结 schema/语义 3–5 及一手源冲突，不能据此丢失 32 件
  武器的 magic baseDamage；此纠正列入 Kimi 实现 review 的必核项。
- **K3 onResist:'continue' 本批 76 roots 无实例**（6 条 0x2E 链全部 stopTarget）：保留为
  作者能力可以，但 seal evidence 必须注明"预留无源实例"；若想严格最小充分则删去，二选一
  在实现时定案并记录。
- **K4 18 件现有 throw 的 target 补齐要分开记账**：137 等补 `target:'oneEnemy'` 是序列化
  新增字段而非语义修复；R13-3 evidence 必须把"target 字段补齐（v7→v8 schema 升级噪声）"
  与"语义变化"分列，17 existing exact 的口径是"补字段后语义与源精确一致"，不是字节不变。
- **K5 raw translator 的 silent-empty 行为本批不改**（防 R13-2 漂移）：必须在 R13-3
  evidence 显式登记为已知限制；R13-Z 前任何"无审计的 silent return"不得再出现；后续批次
  遇同类同法处理。
- **K6 performThrow 与现有预占/消费机制对齐**：全体一次消费、效果链有序、目标死亡重选
  （oneEnemy）、pendingItemUses 预占不被新链破坏；consume 前的完整校验失败必须回滚预占。

**结论**：**agree**。schema 最小充分、源语义忠实、版本轴与 append-only MG2 成立、无
schema/runtime/save 级反例。GLM 未 agree 前不得开始实现。

- 2026-07-28 Kimi：完成 R13-3 投掷 schema/runtime/MG2 设计准入主审，签 **agree**，附 K1-K6
  风险钉（见上节）。一手核对：133（L_39260 `0x42[372]→0x28[1,551]`，全体+施毒+伤害）、
  134（L_39592 `0x64[5,38780]→0x60`，killIfHpAtMost{5} 且 flags.applyToAll=true）、
  158（L_39263 `0x42[24]→0x39[180]`，sentinel presentation + 定伤定回）；巫抗公式沿用
  phase-2 修复语义 `roll >= 巫抗`（battle-core.ts:434-442 单源），原版 90%-cap bug 不复活
  （game-mechanics.md:723-727）。最重要两条钉子：baseDamage 只作 sentinel 语义、strength 是
  magStr 唯一来源（K2）；18 件现有 throw 的 target 补齐属 schema 升级噪声须分开记账（K4）。
  未修改实现/产物/baseline/旧 seal。Next：GLM 源数据/守恒/测试矩阵主审；两席均 agree 后
  Codex 进入 R13-3 实现。

#### R13-3 implementation candidate 与 Codex 自验（2026-07-29）

**实现收口**：

- content 轴升至 **contentVersion 8**，SAVE 仍为 **SAVE 7 / minimumSaveVersion 7**。
  `ItemDefV5.throw` 使用独立 `ThrowTarget = oneEnemy | allEnemies` 与独立 `ThrowEffect`
  七类联合：`magicDamage / fixedDamage / applyPoison / currentHpDamage / applyStatus /
  killIfHpAtMost / damageAndHealCaster`。它没有复用 `ItemUseEffect` 解释器，也没有把
  `throw` 塞进 `ItemUseContext`。
- content 7→8 只给旧投掷补 `target:'oneEnemy'`；SAVE7/content7 读档只做输入不变的
  content epoch identity normalization，world / position / projectId 深相等，不读历史
  sidecar。非法版本组合在 sidecar I/O 前拒绝。
- Reforge 按 `target` 做单敌选择或全体直接提交；效果链按顺序、逐目标执行，完整校验先于
  预占/扣库存，全体仍只消费一件。`applyStatus` 的 `stopTarget` 只截断当前目标；配对毒
  `lethalWith` 即使本次 `0x28` 被抵抗也按源链继续判断。
- 敌方 `0x28` 新毒首次成功落槽时，立即执行一次 `enemyTicks[0]` 并保存推进后的 cursor；
  抵抗或重复同毒不重放。即时 tick 与行动后 tick 共用同一执行器，覆盖 hp/mp、halve、
  grantItem 与 selfCure。当前契约已同步到
  `docs/phase2/poison-system-design.md`。
- `0x2E` 抵抗分支通过 `lastAction.notice` 显示“攻击无效”；`0x64` 阈值失败显示
  “无任何效果”。迁移 evidence 对两条失败臂精确校验 narration/message/end，并把失败臂
  rows 纳入 `sourceClosureDigest`，文字或分支漂移都会 fail-loud。
- Editor 在现有物品效果编辑组件内提供独立的 `ThrowEffectChainEditor`，共享通用字段控件
  而不共享 use/throw 类型解释器。目标与七类效果均为中文，可添加、改类、删除、排序、
  undo/redo、保存重开；没有私有脚本逃生口。
- 资源引用 walker 与声音审计已覆盖
  `throw.presentation.animation/sound`。release 测试另修正 R13-3 MG2 fixture 分流：
  fast 复用 prepared authority，release 必须从 live PAL 输入重建 cadence / cross /
  item-throw authority，release 不再错误调用 fast-only getter。

**76-root、59 observations 与 append-only 发布证据**：

- source roots **76** / final runnable **76** / missing **0**；
  restored-absent **58** / corrected-lossy **1（item 133）** /
  existing-exact **17**。
- all-target **11** / one-target **65**；presentation-only signed-short sentinel
  **29**。family：
  `0x42=10`、`0x42-0x28=11`、`0x42-0x28-0x5e-0x60=6`、
  `0x42-0x2e-0x21=6`、`0x64-0x60=1`、`0x42-0x5b=1`、
  `0x42-0x21=7`、`0x42-0x28-0x21=1`、`0x42-0x39=1`、`0x66=32`。
- root observations **59** = pending **48** + silent-empty **10** + lossy **1**；
  open root observations **0**。item 133 的 parent 归一化固定使用 v7→v8
  `oneEnemy`，不会再借 source target 掩盖 parent drift。
- R13-3 source digest：
  `5aa77a8e5b757be38da410b3cfd7b92ab48e873e11ac48af22ccf229fde55a1f`；
  target digest：
  `9813a527cffbbb8e731b06a9b1193c9cdd0cf3d5cdbd7e92c914d5938145cd95`；
  evidence digest：
  `d35d39e6f85835d66057b060e3f67271084a55caa5d5e9bca23f921522c74f36`。
- 新 append-only `r13-item-throw-v1` 以
  `r13-cross-activation-v1 /
  d20c06c821a044a6f6be2430da1d660d801a00b03b210082ba954e76b09bc686`
  为 parent。seal digest：
  `c8df75a51de4c71ae5e71d43583b749736aecd61b0fd65e9b2568f2e1324502b`；
  文件 SHA-256：
  `2c74122277d724f77dfb3e0375bf88188a90bbf73541c872fad77a0a99f62b08`。
- 旧四层 seal 文件 SHA-256 逐字节保持：
  P7 `41263ba1fa216af014bf8b880405a587938be38938449f77ccec84ed40da6b12`；
  C8 `325d52ed750e29ab5757002821037a270498b2f8c3af5158a79d568a27df3a24`；
  R13-1 `2b1e71b018ffba8aecd4adea628c325dd4f67e338508b22f6ed06f4517683453`；
  R13-2 `723e4fd29f7d69aa861d67d5188038d242c1f5ff619d5c7fdce2854bdf50db12`。
- 正式 `migrate:content -- --write` 首轮只有 R13-3 seal/state **2 项事务操作**；
  第二独立进程为 `writes=0 / deletes=0 / conflicts=0`。R13-0 formal source/runtime
  digest 为
  `ad8e497beba290c154a6b81b4a3c487307e3f95cc0b635dd6fb271fab11fd585` /
  `556885e1982542f9e3a66356e93f9b1ea5471ab5666328440b098dbd1a031ce9`。
  资源物化 1,879 files / 68,439,367 bytes / writes 0。
- sound audit：itemThrow sound edges **75**；全工程 sound edges **1,743**、
  typed refs **6,725**、non-sound refs **4,982**、missing **0**、kind mismatch **0**。

**自动验证与最后发现的反例**：

- Content **29 files / 361 tests**、Reforge **70 / 702**、Editor **91 / 773**，
  全部 package check（typecheck + test）通过。
- migrate `check:fast`：**75 files / 532 passed / 1 skipped**，Vitest
  **966.70s**、real **970.82s（16m10.82s）**。相较 2026-07-28 fast 基线增加
  2 files / 20 active tests；本次未使用 `caffeinate`，因此不据此宣称稳定性能回退，
  但完整 PAL fixture 仍是开发反馈的绝对瓶颈，后续性能债不得用增大 timeout 掩盖。
- fresh release 第一次合跑时，augmentation **11/11** 与 PAL integration
  **2 passed / 1 skipped** 已通过，同时暴露 MG2 release 错调 fast-only prepared
  cadence getter；按上文分流修复后，focused fast MG2 **9/9 / 219.79s**，
  fresh release MG2 **9/9 / 200.36s（real 200.90s）**。最终 release 合计
  **22 passed / 1 skipped**，没有靠 fast 缓存冒充 live authority。
- 实现末端只读审计（非 Kimi/GLM 正式签字）发现并关闭三项：
  ① 所有敌方 `0x28` 漏即时首 tick；
  ② `0x2E/0x64` 失败文字被验证后丢弃；
  ③ source closure 未哈希失败臂且 item 133 parent target 会被 source 回填掩盖。
  修后 Reforge 新增技能/投掷即时毒、重复不重放、selfCure/grantItem 回归，迁移新增
  失败文字漂移与 item 133 exact parent digest 负测；终审未再发现 P0/P1/P2。
- 全仓 `pnpm typecheck` 7 包通过；`pnpm lint` 检查 **994 files** 无错误；
  `git diff --check` 通过。

**真实浏览器闭环（Playwright，2026-07-29）**：

- Editor 6010：
  - item 126 醍醐香真实执行 `oneEnemy→allEnemies`、添加第三效果、改为
    “伤害并回复使用者”、改数值、上移、删除、undo/redo；随后连续 7 次 undo 恢复
    `oneEnemy + 施加状态(stopTarget) + 固定伤害(1)`，未保存工程。
  - item 157 毒龙砂显示 `allEnemies + 法术伤害(毒205) + 施毒(553) +
    固定伤害(55)`。两页 console 均 0 error。
  - 截图：`output/playwright/r13-editor-item126.png`、
    `output/playwright/r13-editor-item157.png`。
- Reforge PAL 6051、enemy team 23：
  - item 163 长鞭：进入单敌选择，左右可切换；只有选中的紫衣敌人闪白并显示
    `105`，另外两敌无伤害数字；整轮后库存 `5→4`。
  - item 67 风灵符：按一次 Enter 直接提交、不进入选敌；三敌同时出现风柱并闪白，
    伤害数字 `132/132/110`；整轮后库存 `5→4`，未按敌人数重复扣除。
  - 两条实战均继续进入下一回合，console **0 error / 0 warning**。关键截图：
    `output/playwright/r13-runtime-single-fast-22.png`、
    `output/playwright/r13-runtime-all-fast-29.png`、
    `output/playwright/r13-runtime-single-count4.png`、
    `output/playwright/r13-runtime-all-count.png`。

##### R13-3 批次实现审查签字

| Agent | 签字 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **accept** | 2026-07-29 | content8/SAVE7、独立 ThrowEffect、76/76 roots、59 observations、即时敌毒 tick、失败提示、Editor CRUD、append-only seal、正式重迁二跑零计划、四包全测/fresh release/声音审计/单体全体浏览器均已闭环。accept 只表示 R13-3 implementation candidate 可送审，不代表 R13-4～R13-Z、N3-1、C8 或 ED-5I 完成。 |
| Kimi | **accept** | 2026-07-29 | 只读架构/runtime/MG2 实现审查通过：独立 ThrowEffect 七类 + validator exact keys、content8/SAVE7 identity normalization、单体/全体一次消费、0x66 有效攻击+U[0,3] 单次掷、0x2E/0x64 失败 notice 与失败臂 digest、0x28 即时首 tick 共用执行器且抵抗/重复不重放、lethalWith 抵抗后仍判、Editor CRUD、release live authority 分流、旧四层 seal 一手 sha256 byte-pin；K1-K6 逐条核对（K2 按 fight.c:221 修正表述，见交接日志）。记录项 4 条。accept 仅准入 R13-4。 |
| GLM | **accept** | 2026-07-29 | 独立复跑：content 29/361、reforge 70/702、editor 91/773 全绿；dry-run 0/0/0；76/76/0 严格闭合（source throwable+scriptOnThrow=76, final with throw=76, missing=0）；11 allEnemies（67,68,69,70,71,115,133,134,142,157,162）+ 65 oneEnemy 精确匹配；133 修正确认（magicDamage baseDamage=150/element=poison + applyPoison 551 + allEnemies + presentation）；16 applyPoison+presentation sentinel 保持 0 伤害（G1 撤回约束遵守）；seal 链 R13-3 `c8df75…`→R13-2 `d20c06…` byte-pin 确认；旧四层 file SHA 全部不变；source digest `ad8e497…` + runtime digest `556885e1…` 匹配；contentVersion=8/SAVE_VERSION=7/minimumSaveVersion=7 确认；openObservations=7,657 是 R13-4~R13-6 输入。 |

- **当前门禁**：Codex / GLM / Kimi 三席 `accept` 已齐（2026-07-29），**R13-4 准入开放**。
  不得标 N3-1、C8 或 ED-5I `done`；R13-3 accept 不代表 R13-Z/N3-1 完成。
- **后续边界**：R13-4 confirm、R13-5 enemy、R13-6 approved-lossy 与 R13-Z
  publication 仍未完成；本批 open=0 只指 76 个投掷 roots，不代表全源指令闭包完成。
- 2026-07-29 Kimi：完成 R13-3 架构/runtime/append-only MG2 只读实现审查，签 **accept**
  （仅准入 R13-4）。两路独立深查 + 一手抽核：seal 五文件 sha256 实测（P7 `41263ba1…`、
  C8 `325d52ed…`、R13-1 `2b1e71b0…`、R13-2 `723e4fd2…`、R13-3 `2c741222…` 全中，
  parent 链 `c8df75a5…→d20c06c8…` 闭合）；reforge battle 149/149；content/reforge/
  editor/migrate 各线复跑全绿；76/76/0、11 all-target、59 observations、29 sentinel、
  32 件 0x66、133 parent 归一化、失败臂入 sourceClosureDigest、sound audit 75/0/0
  均独立复算吻合；敌毒即时 tick 对 script.c:1175-1256 逐项吻合；release 不调
  fast-only getter。
  K1-K6 核对：K1 巫抗 `roll >= 巫抗` 单源成立；**K2 修正**——我设计钉中"baseDamage
  不得参与结算"的表述被 fight.c:221 证伪：`sDamage += lprgMagic[id].wBaseDamage`
  是加性常量，sentinel 正是靠 signed 负 baseDamage 把伤害压到 0；实现按 fight.c 忠实
  落地（strength 仍是 magStr 唯一来源），K2 以此为准销钉；K3 onResist:'continue'
  预留已注明；K4 target 补齐与语义分列（17 exact + 133 lossy）；K5 silent-empty
  已登记入 evidence 与 buildAndAssertR13ControlAudits；K6 校验先于预占/扣库存。
  记录项（非反例）：①`applyPoisonToEnemy` 已无 runtime 调用方但仍导出（旧无即时
  tick 语义），建议后续批次收回导出防误用（battle-core.ts:480-486）；②状态巫抗公式
  三处内联（:880/:1006/:1761）一致但非字面单函数，可接受；③三个 R13 seal 文件当前
  untracked，提交时必须同批入库防 baseline 断链；④0x66 强度在 C 中为 WORD(mod 65536)
  实现保留全精度，PAL 数据不可达。未修改实现/产物/baseline/seal。
  Next：R13-4（真实 confirm），Codex 仍唯一 Coding Owner。

#### R13-4 源 No 生命周期 / 真实确认框 / append-only MG2 专项设计门禁（2026-07-29）

R13 总设计只把已知问题描述为“Reforge host 恒返回是”，并假设 26 个源 `confirm` 的两臂
已经被 canonical 保留。R13-3 三方 `accept` 后的只读前置审计推翻了后一项前提：
`confirm` 节点虽然存在，但 **22/28 个源执行位的 No activation 生命周期在 P3 → P7
投影时静默丢失**。因此本批触碰迁移器、生成场景、FlowCursor epoch 与 append-only
transition，属于高风险 delta；总设计旧签字不能覆盖，专项三签齐前不得修改实现或生成产物。

完整映射、反例与 digest 见：
[Codex R13-4 confirm 源控制流审计](../audits/codex-r13-4-confirm-control-flow-audit.md)。

##### 冻结事实与风险

- **26 RAW / 28 logical / 31 physical**：
  - RAW `0x0A` 26 个唯一地址；source census digest `3d19fb14…`；
  - `@11019`、`@14583` 各扇出两 owner，形成 28 source execution sites；
  - R13-2 又为 s029/s030 各复制一个 phase，并把 s108 一个旧节点拆成两个 continuation，
    final 共 31 个物理节点，修复前 digest `556885e1…`。
- **当前保真只有 6/28 logical、9/31 physical**：
  `@7452,@7484,@14486,@19272,@19292,@19888`。`@7452/@7484` 因 R13-2 phase copy
  各有两份；`@14486` 的两份是既有 s081 initial/cycle，不是 R13-2 生成。
  其余 **20 RAW / 22 logical / 22 physical** 都会在 No arm 完成后继续 Yes suffix。
- 22 个 lossy 节点实际位于 **18 个 stages flow / 13 个 scene**，共有 26 个旧 stage
  cursor id；s009、s100/e1825、s131 分别在同 flow 内含 2、3、2 个 confirm，不能按
  “一个 flow 一个 decision”转换。
- 直接把 `packages/reforge/src/main.ts` 的恒 `true` 换成真实框会立刻激活错误：
  - s005 买水果选否仍扣 25 文并给水果；
  - s050 买米选否仍扣钱并给米；
  - s009 选否说“那就算了”后仍继续整段剧情。
- 根因不是 runner。v5 runner 正确执行 `onNo` 后继续父命令；丢失发生在迁移：
  `p3-control-flow.ts` 的 `n3P3FlowExit` 带
  `terminate-current-activation`，但 `p7-canonical.ts.generatedP3()` 只展开 target body，
  丢掉 terminal cursor / advance / reset / loop。

##### 设计冻结

1. **canonical schema 不新增第二种 confirm**
   沿用现有 `AuthorCommandV5.confirm{id?,onNo}`、compiler 与
   `StateTransitionV5.commandOutcome`。不把 PAL 地址写入 author id，也不新增世界字段。

2. **在 R13-3 successor 后统一修上游生命周期，不补最终 JSON**
   为保持已签 R13-1～R13-3 authority append-only，旧 P3/P7 projector 冻结。新增
   `augmentR13ConfirmControlFlow(...) → confirm.snapshot + confirmSourceEvidence`，作为
   item-throw successor 后唯一 source-backed pass；不得直接改
   `p7-canonical.generatedP3()` 后又要求 cadence/cross/item parent byte-identical。
   该 pass 不能只收 final snapshot，因为源 flow-exit 已被旧 projector 展开；输入冻结为：
   `itemThrows.snapshot + sourceCommands + chain.p6.ir.flowStructures + sourceCensus +
   triggerActivationEvidence + c8Evidence`。其中输入侧 evidence 保存 28 logical site 的
   source SHA、`terminate-current-activation`、No target/terminal 与 Yes fallthrough，
   R13-2 evidence 证明 28→31 physical 的 1:N expansion；所有输入 digest 进入 MG2：
   - 当前 state 的 body 是 prefix + 稳定 `CommandId` 的 `confirm(onNo:[])`；
   - `commandOutcome(no).then` 编译源 No target，精确保留 plain END / advance /
     reset / cycle 和对应 yield；
   - `else` 指向 Yes suffix 的同步 continuation，suffix 恰执行一次；
   - 不得只 append `stopScript`，因为它不能提交 advance/reset/cycle cursor；
   - 同一 flow 多个 confirm 按源顺序递归切分，Yes continuation 继续消费下一个 decision；
   - 普通迁移、overlay、baseline 与 `projects/pal` 不得各写一套修补逻辑。

3. **已保真节点只做守恒，不二次包裹**
   s029/s030 的双 phase、s081 initial/cycle 的不同 yield、s108 两 continuation 与
   C8 item287 私有脚本必须保持现有语义；新 pass 遇已结构化 commandOutcome 或 C8
   terminal arm 时登记 exact evidence，不重复转换。

4. **append-only `r13-confirm-v1`**
   parent 精确指向 `r13-item-throw-v1` 经三方签批后原子提交的已发布 digest。
   该前置已于提交 `3a03bfdd3ef096613b9c10d42e3dbb7ced817624` 完成：R13-0～R13-3
   实现、manifest 与三个 R13 seal 已原子提交；item-throw digest 为
   `c8df75a51de4c71ae5e71d43583b749736aecd61b0fd65e9b2568f2e1324502b`。
   R13-4 新 seal 只能以该提交与 digest 为不可变 parent。历史
   `script-v4-v5`、`c8-item-use-v5-v1`、`r13-cadence-v1`、
   `r13-cross-activation-v1`、`r13-item-throw-v1` 五层逐文件 byte-pin。
   evidence 逐 source site 保存 source SHA、No target、Yes fallthrough、terminal lifecycle、
   command/transition/两臂/final flow digest 与 runtime executed evidence。31 个 final
   selector 使用 entity 的 scene/entity/channel/behavior 或 hook 的 scene/slot/hook，
   再接 flow kind + machine/state 或 stage id + CommandId。C8 @19888 无 CommandId，
   使用 item/script/behavior/stage 稳定 id + command digest + 唯一性断言。数组下标或
   含糊 body 身份不能作为 selector，也不能让篡改 final JSON 自证源账。

5. **审计方法升级并只关闭 R13-4 的债**
   source disposition `v2→v3`，runtime capability `v1→v2`：
   world-interactive / world-auto / item-private-world 的 confirm 均为 executed，
   confirm refused=0、confirm open debt=0、unregistered refused=0。不得把这些数字冒充
   R13-5、R13-6 或 R13-Z 全域闭包。

6. **开发期 cursor epoch 断开**
   项目选择不为 **18 个 flow / 26 个旧 stage cursor id** 编写一次性映射；沿用用户已拍板
   的“游戏未完成，不保旧存档”：
   - `contentVersion 8→9`；
   - `SAVE_VERSION 7→8`；
   - `minimumSaveVersion 7→8`；
   - `WorldStateV9 = WorldStateV5`，不新增字段；
   - 只接受 SAVE8/content9；SAVE7/content7、7/8、7/9、8/7、8/8 与未来组合都在任何
     sidecar I/O 前拒绝并提示新开游戏；
   - A7-4 候选 epoch 顺延到下一未占用版本（当前 v10）。
   这是主动采用的开发期版本政策，不是由世界字段或 flow kind 机械推出。若审查方主张保留
   8/7，必须提供 18 flow / 26 old cursor 的逐 cursor 双向 identity 方案；“世界字段没变”
   不是游标兼容证明。

7. **Reforge 使用独立脚本二选一模态**
   由中央 modal arbiter 管理，只复用 `drawConfirmBox` 视觉原语，不把
   `SystemMenuState` 的退出/开关业务塞进脚本。
   默认 No；四方向切换；Enter/交互键提交；Esc/Menu=No；问句对话底图保持。
   已活跃 shop/system/save modal 先完成，脚本 confirm 排队；confirm active 后禁止新 modal，
   多个 script confirm FIFO 串行且单次 settle。confirm active 冻结 gameplay clock：
   player/party move、auto runner、hostile、scene timer、fade 与世界推进暂停，只继续
   render/UI blink/audio；该冻结不改变“普通对话不冻结 NPC”的既有裁决。
   问句用 dedicated held-frame/token 跨帧保持，只在 settle/abort/session replacement 释放，
   不复用 one-microtask `preserveClosedDialogFrame`。
   abort/session replacement/runner replacement 拒绝 prompt 且不执行任一臂；迟到按键不得
   提交旧 session。持久 runner 继续持 coordinator lease；transient/shared/item-private
   `runCommands()` 新增不写 FlowCursor 的 activity token，整个执行期间纳入同一 save barrier。
   保存只能在回答后 commandOutcome/脚本完成并到 safe point 时拍快照。

8. **Editor 预览也必须走真实 v5 两臂**
   当前 canonical preview 把 v5 state machine 降成 v4 stages，会丢
   `commandOutcome`。R13-4 不允许只把 `playback.confirm` 的恒 true 换成按钮：
   canonical 场景/共享脚本预览必须直接复用 `ScriptRunnerV5` 或等价的唯一 v5 执行器；
   legacy v4 preview 可保留给旧工程。PreviewCanvas 提供 Yes/No 与键盘输入，
   stop/切场景/切实体/切方案/unmount 均 abort，不污染作者态或存档。

##### 生成与测试硬门禁

- 精确双向守恒：26 RAW / 28 logical / 31 physical，无缺失、重复或未登记 fanout/copy。
- 逐 site 两臂 oracle：No 只执行 target 一次且不执行 suffix；Yes 不执行 target且 suffix
  恰一次；next cursor/lifecycle 精确。
- 四族全覆盖：plain END 2、end+advance 18、reset 5、loop 1；另钉
  该口径是 26 RAW；28 logical 为 2/20/5/1，31 physical 为 3/20/6/2。实际转换的
  22 lossy logical 是 advance18 + reset4；plain END/loop 必须用 synthetic fixture
  覆盖，不能拿 exact bypass 冒充。另钉 `@11019/@14583` fanout、s029/s030 phase copy、
  s081 双 yield、s108 overlay、C8 @19888。
- 同 flow 多决策组合：s009 覆盖首个 No、Yes→第二个 No、Yes→Yes；s100/e1825 覆盖
  三个 decision 全 Yes 与每个位置首个 No；s131 覆盖 Yes→No，防止只修第一个 decision
  或 suffix 重复。
- fail-loud：删/复制 confirm、交换两臂、改 target/commandId/yield、漏一份 copy、
  篡改 s005 给水果/s050 给米/s009 suffix，都必须失败并 reopen 精确 site。
- runtime：默认 No、Esc=No、方向/Enter、双提交防重、central modal 仲裁、gameplay freeze、
  held-frame 至少两帧、FIFO、abort/session、持久与 item-private/transient save barrier、
  system/shop 隔离。
- Editor：v5 commandOutcome 的 Yes/No 命中不同 state；停止/切换/卸载会取消 prompt。
- MG2：旧五层 byte-pin；新 seal initialize/replay/half-state/tamper/drift；fresh formal
  migration 首跑只允许 manifest、`_state`、新 transition 与 13 个 lossy scene
  `s005,s009,s023,s050,s084,s091,s100,s102,s111,s127,s128,s131,s148`；exact-only
  `s029,s030,s081,s108,s118` byte-stable。第二跑与 live dry-run 均
  `writes=0/deletes=0/conflicts=0`，project/baseline 同路径逐字节相同。
- save 版本负测只接受 SAVE8/content9；7/7、7/8、7/9、8/7、8/8 与未来组合都在
  sidecar I/O 前失败。
- 浏览器金丝雀至少：
  `s005,s009,s050,s029,s030,s081,s108,s118`，并覆盖 prompt 中 abort/save/session。

##### R13-4 专项 `build` 推进签字

| Agent | 签字 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **agree** | 2026-07-29 | 两路独立审计 + 两路交叉复核收口；确认不是单纯 host UI，而是 20 RAW/22 logical 的 activation 生命周期缺失。冻结 26/28/31 双向账、R13-3 successor 后 source-backed commandOutcome 转换、18 flow/26 old cursor 的 content9/SAVE8 主动断档、central modal + transient activity lease、Editor v5 preview、append-only seal 与 fail-loud 矩阵；已吸收 parent 未提交、multi-confirm flow、held-frame/freeze 等复核项。 |
| Kimi | **agree** | 2026-07-29 | 架构/runtime/save/MG2 主审通过：R13-3 successor 后唯一 source-backed pass + 冻结旧 projector 保五层 byte-identical；26/28/31 账与四族分类自洽（s005 有损形态、C8 @19888 exact 形态一手核实）；central modal/默认 No/FIFO/冻结域/held-frame/竞态设计成立；transient activity lease 纳入 save barrier 方案成立；content9/SAVE8 主动断档自洽；Editor v5 runner 要求正确；seal parent/evidence/fail-loud 充分。附 P1-P4 风险钉（见「Kimi R13-4 设计主审」）。 |
| GLM | **agree** | 2026-07-29 | 独立核对：26 RAW 0x0A 地址逐条匹配源数据 ✅；28 logical（26+2 fanout @11019/@14583）✅；31 physical（28+3 R13-2 copies s029/s030/s108）✅；6 exact / 22 lossy logical + 9 exact / 22 lossy physical ✅；族 2/20/5/1 RAW = 2/20/5/1 logical + 3 copies ✅；physical 3/20/6/2 ✅；22 lossy = advance18+reset4 ✅；13 lossy scenes + 5 exact-only scenes ✅；18 flows（22 lossy 减 multi-confirm overhead s009 -1 / s100 -2 / s131 -1）✅；26 old stage cursor ✅；R13-3 parent `c8df75a5…` 匹配 `3a03bfdd` ✅；schema 不新增第二种 confirm / append-only r13-confirm-v1 / content9+SAVE8 epoch 断开 / central modal / Editor v5 preview / fail-loud 矩阵全部成立。 |

- **文档校对待办（不改变签字）**：GLM 证据行的 `2/20/5/1 RAW` 合计为 28，是笔误；
  冻结账为 RAW `2/18/5/1`、logical `2/20/5/1`、physical `3/20/6/2`。该签字原文
  只由 GLM 更正，Codex 不代改。
- **当前门禁**：**R13-4 专项设计 allowed（2026-07-29；Codex / GLM / Kimi 三方 agree，无
  counter）**。用户说”签了”确认的是上一批 R13-3 implementation accept；本专项设计是在该
  签字后的新审计发现，不能追溯套用旧签。build 必须落实 Kimi 的 P1-P4 与 GLM 复审结论。
- **实现权限**：专项三签齐前 Codex 不得修改实现、生成 scene、manifest、baseline、seal
  或版本常量；只允许审查方更新自己的签字行与交接记录。
- **边界**：R13-4 三签和实现完成后仍只能进入 R13-5，不代表 N3-1、C8 或 ED-5I done。

##### R13-4 实现期生成白名单修订：19 条 source locale（2026-07-29）

实现期 fresh in-memory build 发现，R13-4 为恢复 6 个源 durable entry
`15409,15993,17536,19350,21226,21230`，会重新翻译此前未进入 parent canonical
闭包的源正文。`R13TranslationSession.finish()` 因此产生 parent locale 中缺失、但新
recovered state 正文实际引用的 19 条 PAL 原文。若不随 successor snapshot 物化，新增状态
会形成悬空 `dlg.*` 引用。

本修订不新增 schema、runtime 能力或人工文案；它是已签 source-backed durable recovery
的生成文件白名单漏项修正：

- `content/locale.json` 只允许新增以下 19 个 key，不得删除、覆盖或改写任何既有 key：
  `dlg.5350,dlg.5483,dlg.5484,dlg.5485,dlg.5486,dlg.6164,dlg.7838,dlg.7840,
  dlg.7841,dlg.7842,dlg.7844,dlg.7845,dlg.7846,dlg.7847,dlg.7849,dlg.7851,
  dlg.7853,dlg.7855,dlg.7856`。
- sorted id list digest：
  `fff0a7c4cfeb462b7a11c10c31e0c3c33437225ee79fd577e16829c3e925913a`。
- `stableJsonSha256({id:text})`：
  `ee546b25fa80c480a6b70287ff1884c0138cacbdb6cc3deee9473e4dbddff518`。
- materialized locale entries 必须恰为 19；materialized sprite definitions 必须恰为 0。
- 19 条必须全部被 successor scenes 的 recovered state 正文引用；不允许额外 locale。
- 同 key 若 parent/作者已有不同值必须 conflict/fail-loud，不得覆盖；无关作者 locale
  改动必须保留。
- `r13-confirm-v1` evidence 与 MG2 必须 pin exact id/value、生成 authority digest、
  首跑结构化增量和二跑零计划，不能只 pin scene digest。

此前“首跑只允许 manifest、`_state`、新 transition 与 13 个 lossy scene”的签字文本
漏列 source-backed recovered body 所需 locale。本节以可审计的窄修订补充
`content/locale.json` exact 19-key additive delta；其余 R13-4 文件边界不变。
同次正式迁移中的 E1 `content/items.json` 继续归 E1/ED-5I authority，不把它伪装成
R13-4 locale 的来源。

##### R13-4 实现期白名单修订签字

| Agent | 签字 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **agree** | 2026-07-29 | fresh in-memory build：19 locale / 0 sprite；exact id list 与 id-text digest 已复算；19 条来自 source translation，不是人工补丁。 |
| Kimi | **agree** | 2026-07-29 | 架构 / MG2 / author-preserving merge 审查通过：19 条逐条命中源 showDialog 且 parent locale 缺失（@15388→5350、@15947 No 体 5483-5486、@17497 No 体 6164、@21207 书生 7838-7856 从属核实）；id list `fff0a7c4…` 与 id:text `ee546b25…` 两个 digest 用仓库 stableJsonSha256 独立复算精确一致；additive-only/冲突 fail-loud/sprite=0/evidence 引用闭包成立；E1 items.json authority 分离明确。 |
| GLM | **agree** | 2026-07-29 | 独立复核：19 条原文逐条命中 `data/extracted/events/all.json` showDialog.text（5350「请吧..」/5483-5486 老鸨/6164 乞丐/7838-7856 书生护送），非人工补丁；parent `projects/pal/content/locale.json` 19/19 全 MISSING；sorted-id digest `fff0a7c4…`（= stableJsonSha256 of `dlg.*` 字符串 key 数组，非数字 id）与 id-text digest `ee546b25…` 用仓库 `stable-json.ts` 独立复算一致；additive-only/same-key conflict fail-loud（r13-confirm-control-flow.ts:1822-1826）/sprite=0/无关作者 key 保留全成立；MG2 首跑 writes=locale+items+13 scenes/conflicts=[]/deletes=[]，二跑 0/0/0；anti-tamper（locale 改值/exact scene/evidence/terminal）全 fail-loud。措辞澄清（非 blocker）：6 recovered state 中仅 5 translated-durable（15409/15993/17536/21226/21230）引用 19 条 locale，L_19350 是 shared-decision（s128 confirm 决策锚点，不引用 locale 正文）；19 条闭包仍闭合，不影响白名单正确性。caveat（非 blocker）：`fff0a7c4…` 仅文档记录，代码用 `R13_CONFIRM_MATERIALIZED_LOCALE_IDS` 列表 byte-identical 比对（r13-confirm-control-flow.ts:2112）更严格。 |

- R13-4 原专项设计三签继续有效，`build` 仍 allowed，Codex 可继续实现、测试和
  read-only / in-memory 验证。
- Kimi、GLM 均 `agree`（2026-07-29）；19-locale 白名单窄修订三签齐，
  **正式 `migrate-content --write`、初始化或落盘 `r13-confirm-v1` seal 的白名单门禁解锁**。
- 本表只批准白名单修订，不等于 R13-4 implementation accept。完整实现、MG2、正式重迁、
  二跑和浏览器完成后仍需 Codex / Kimi / GLM 三方 implementation `accept`。
- 任一方认为 19 条不是 source-backed 必需输出，应签 `counter`；formal write 继续
  blocked。
- 2026-07-29 Kimi：完成 19-locale 白名单窄修订只读审查，签 **agree**。一手证据：19 条逐条
  命中 `data/extracted/events/all.json` 的 showDialog 且均为 PAL 原文（老鸨 5483-5486 在
  @15947 No 体、乞丐 6164 在 @17497 No 体、5350 在 @15388 No 目标 15398、书生
  7838-7856 在 @21207 No 体议价链）；parent `projects/pal/content/locale.json` 19 条
  全部缺失（纯增量）；用仓库 `stableJsonSha256` 独立复算 id list digest
  `fff0a7c4cfeb…` 与 id:text digest `ee546b25fa80…` 精确一致；实现侧
  `r13-confirm-control-flow.ts:1820-1826` 冲突 fail-loud、:2400-2438 差分漂移 throw、
  pal test 钉 19 ids + digest + sprite=0 + parent 值不变。观察项（非反例）："19 条全部被
  recovered 正文引用"由翻译物化构造保证（localeIds 只来自 output.locale 且白名单钉集合），
  无逐条显式引用断言，delta+digest 等效覆盖。未修改实现/产物/seal。

###### 给 Kimi（R13-4 19-locale 白名单窄修订审查）——已于 2026-07-29 执行，签 agree（保留备查，勿再执行）

```text
只读审查 R13-4 实现期生成白名单窄修订，不是 implementation accept。
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前：原 R13-4 设计三签齐，Codex 唯一 Coding Owner；fresh in-memory build 新发现
content/locale.json 必须 exact 新增 19 key、0 sprite。你和 GLM 都 agree 前，formal
migrate --write、seal / PAL baseline / `projects/pal` 写入和转 review 全部 blocked。

先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡 R13-4 设计与本修订、
docs/ops/audits/codex-r13-4-confirm-control-flow-audit.md，以及
packages/migrate/src/experimental/script-v5/{r13-confirm-control-flow,p7-generated}.ts
和对应测试/MG2。

复核：19 条是否只来自已签 durable recovery；locale 是否 exact additive、同 key 异值
fail-loud、无关作者改动保留；evidence/MG2 是否 pin exact id/value 且不把整份 locale
永久占有；formal whitelist 是否只窄增 content/locale.json；额外/缺失/改值/0 sprite
是否 fail-loud；旧五层与 5 exact scene 是否仍 byte-stable。

只允许更新本表 Kimi 行和交接记录，不改实现、生成物、PAL baseline、seal、`projects/pal` 或 GLM
签字。无 blocker 签 agree；有问题签 counter 并给 file:line、merge 反例和最小修订。
明确：本签字只批准 19-locale 白名单，不是 implementation accept。
```

###### 给 GLM（R13-4 19-locale 数据与引用闭包复核）——已于 2026-07-29 执行，签 agree（保留备查，勿再执行）

```text
只读复核 R13-4 实现期 19 条 source locale 白名单，不是 implementation accept。
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
Kimi/GLM 双签前不得 formal write、落 seal、改 PAL baseline / `projects/pal` 或转 review。

先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡 R13-4 设计与本修订、
data/extracted/events/all.json、packages/migrate/src/translate-events.ts、
packages/migrate/src/experimental/script-v5/r13-confirm-control-flow.ts 及 PAL 测试。

独立复核 exact 19 ids 与 extracted 中文原文；复算 sorted-id digest
fff0a7c4cfeb462b7a11c10c31e0c3c33437225ee79fd577e16829c3e925913a 和 id-text digest
ee546b25fa80c480a6b70287ff1884c0138cacbdb6cc3deee9473e4dbddff518；证明 parent 恰缺
19 条、successor 只新增 19 条/0 sprite、recovered state 全部引用闭合；检查额外/缺失/
改值、same-key conflict、无关作者改动保留、首跑增量与二跑 0/0/0 测试。

只允许更新本表 GLM 行和交接记录，不改实现、生成物、PAL baseline、seal、`projects/pal` 或 Kimi
签字。无 blocker 签 agree；有问题签 counter 并列具体 id/text/source address/缺失测试。
明确：本签字只批准 19-locale 白名单，不是 implementation accept。
```

- 2026-07-29 GLM：完成 19-locale 白名单窄修订只读复核，签 **agree**。一手证据：19 条原文
  逐条命中 `data/extracted/events/all.json` 的 `showDialog.text`（dlg.5350「请吧..」、
  5483-5486 老鸨「呜..免费赠送也没人要」/「想当年～我年轻当红的时候」、6164 乞丐
  「呜..心事谁人知」、7838-7856 书生护送议价链「兄台再考虑一下吧」..「得一千五百文钱」），
  非 AI 生成或人工补丁；parent `projects/pal/content/locale.json` 19/19 全 MISSING（纯增量）；
  用仓库 `packages/migrate/src/experimental/script-v5/stable-json.ts` 的 `stableJsonSha256`
  独立复算：sorted-id digest `fff0a7c4…`（输入 = `dlg.*` 字符串 key 数组，**非数字 id**，
  数字数组算出 `6e2116…` 不匹配）、id-text digest `ee546b25…`（输入 = 排序后的 `{id:text}`）
  两者精确一致。实现侧 `r13-confirm-control-flow.ts:1822-1826` additive-only + same-key
  conflict fail-loud、:2112 列表 byte-identical 比对、:2459-2460 localeTargetDigest 重新计算；
  pal test 钉 19 ids + digest + sprite=[] + parent 值全保留；mg2 test 首跑
  writes=locale+items+13 scenes / conflicts=[] / deletes=[]，二跑 0/0/0；anti-tamper
  （locale 改值 dlg.5350='篡改' → throw /locale target/、exact scene 篡改、evidence multiplicity、
  terminal family）全 fail-loud；无关作者 key `author.unrelated` 不报错。

  **措辞澄清（非 blocker，不阻塞签字）**：任务卡 5707 行称"6 个源 durable entry...引用的
  19 条 PAL 原文"，但 `r13-confirm-control-flow.ts:2196-2201` 与 pal test :173-178 显示
  L_19350 的 `kind: 'shared-decision'`（s128/e2245 confirm 决策锚点），不引用 19 条 locale
  正文；实际引用 19 条的是 5 个 `translated-durable`（15409/15993/17536/21226/21230）。
  L_19350 自己的 showDialog 是 msg=7014/7015「茅山道士∶一万五、不二价！」，不在白名单内。
  19 条 locale 的闭包仍闭合（5 个 translated-durable 的 dialog 引用并集恰为 19 条），
  不影响白名单正确性；建议 Codex 在后续文档措辞里把"6 durable entry 引用 19 条"改成
  "5 translated-durable 引用 19 条 + 1 shared-decision 锚点"。

  **文档 caveat（非 blocker）**：`fff0a7c4…`（sorted-id digest）仅在任务卡 markdown 出现，
  代码与测试均未 pin；代码用 `R13_CONFIRM_MATERIALIZED_LOCALE_IDS` 列表本身做
  byte-identical 比对（:2112）更严格，列表变了列表比对先 fail，digest 根本到不了——
  所以这不是安全缺口，只是文档 digest 与代码 pin 不对称。`ee546b25…`（id-text digest）
  在代码 `R13_CONFIRM_MATERIALIZED_LOCALE_DIGEST`（:82-83）pin，由 pal + mg2 测试强制。

  未修改实现/产物/seal/baseline/`projects/pal`；仅更新本表 GLM 行与本交接记录。

##### R13-4 implementation candidate / in-memory checkpoint（2026-07-29）

本节只记录 Codex 在 `build` 内已经形成的实现候选与预正式证据，**不是 implementation
accept，也不改变 19-locale 双签门禁**。截至本 checkpoint 未运行正式
`migrate-content --write`，未初始化或落盘 `r13-confirm-v1`，未修改
`packages/migrate/baselines/pal` 或 `projects/pal`。

**Source-backed control flow 与审计**：

- `augmentR13ConfirmControlFlow` 固定接在已发布 R13-3 successor 后；完整 PAL 构建闭合：
  - 26 RAW / 28 logical / 31 physical；
  - exact 6 logical / 9 physical，transformed 22 / 22；
  - 18 个 transformed flow、26 个 retired stage cursor；
  - 6 个 recovered durable state、19 条 source locale、0 个 sprite；
  - 13 个 changed scene：
    `s005,s009,s023,s050,s084,s091,s100,s102,s111,s127,s128,s131,s148`；
  - 5 个 exact-only scene `s029,s030,s081,s108,s118` byte-stable；
  - terminal family RAW `2/18/5/1` → logical `2/20/5/1` →
    physical `3/20/6/2`。
- source census digest：
  `3d19fb14b8261fd5a0e48f20cbd1e80fc57c31622624bb09126eb86ea2cb13ac`。
  19-locale sorted-id / id-text digest 继续分别固定为
  `fff0a7c4cfeb462b7a11c10c31e0c3c33437225ee79fd577e16829c3e925913a` /
  `ee546b25fa80c480a6b70287ff1884c0138cacbdb6cc3deee9473e4dbddff518`。
- source disposition 保留已发布 v2 路径与 digest
  `36349824878131b5e67db7ba9edc7d1a00dd864aa88737cb0cd89b304181a79e`，
  R13-4 新增 v3：28 个 `r13-confirm-site` proof、31 个全局唯一稳定 selector，
  augmented/final 全部 accounted，final R13-4 open debt=0；把 v2 仅改名重签成 v3、
  缺/增/复制/交换 selector、locale/exact-scene 漂移均 fail-loud。
- runtime capability v2 将 world-interactive / world-auto / item-private-world 三个
  context 都绑定到 `reforge:v5-script-confirm-modal`：31 uses / 31 executed /
  0 refused / 0 open debt。该数字只关闭 R13-4 confirm，不冒充 R13-5/6/Z。

**Runtime、Editor 与 epoch**：

- Reforge 新增中央 `ScriptConfirmModalQueue`：FIFO、默认 No、至少呈现两帧、方向键切换、
  Enter/交互键提交、Esc/Menu=No、重复提交幂等、active/queued abort 与 session
  replacement 都不执行任一臂；`GameplayClock` 在 prompt 中冻结，恢复时不补算 wall time。
- persistent runner 与 transient/shared/item-private `runCommands()` 共用同一 active
  registry；存档请求只能等 prompt 回答且整条 command chain 到 safe point 后继续，
  没有并行“看不见”的计数器。
- Editor canonical 场景与共享脚本预览直接运行 V5 flow，保留 `commandOutcome`；
  Yes/No 进入不同 state，stop/source switch/unmount 会 abort。预览按钮改为语义
  `fieldset`，默认焦点在 No；方向、Enter/Space、Escape 与点击共用同一 playback API。
- contentVersion=9、SAVE_VERSION=8、minimumSaveVersion=8；World V9 仍 alias V5，
  所有旧组合在 sidecar I/O 前拒绝。E1 的 `battleSprite.byActor` 随 content9 合并，
  但 `content/items.json` 的所有权与最终验收仍归 E1/ED-5I，R13-4 只做交叉 authority。

**Append-only MG2**：

- formal 候选迁移计划将新增 `_transitions/r13-confirm-v1.json`，parent 精确固定为已发布
  `r13-item-throw-v1` digest
  `c8df75a51de4c71ae5e71d43583b749736aecd61b0fd65e9b2568f2e1324502b`；
  旧五层 seal 不改写。
- seal 显式签 source v3 的 `28/31/28/0` 与 runtime v2 的 `31/31/0/0` 摘要及完整
  report/slice digest。fast 测试的 prepared authority 只能由模块私有 `WeakSet`
  颁发，source/runtime/seal evidence 递归冻结，再复验输入身份、R13-4 compact slice
  与 aggregate；spread clone、自洽重签、half-state、snapshot/audit drift 都拒绝。
- in-memory initialize plan 精确只产生 project writes：
  13 scenes + `content/locale.json` + `content/items.json`；其中 items 是 E1。
  同一 authority replay 为 writes/deletes/conflicts=`0/0/0`。seal 只进入 next baseline，
  不泄漏到 project target。

**已完成验证**：

- Migrate：
  - source/runtime/control-flow targeted：4 files / 30 tests pass；
  - unit project：63 files / 454 tests pass，56.83s；
  - source-disposition v3 PAL：1 / 1 pass，211.25s；
  - 最终 control-flow + append-only MG2 PAL：2 files / 14 tests pass，
    331.76s。该轮包含私有 capability + deep-freeze 最终实现。
- Content：30 files / 372 tests pass；Reforge：排除正式 PAL 落盘夹具后
  72 files / 717 tests pass；Editor：92 files / 785 tests pass。
- 根级 `pnpm typecheck`：7 个包通过；`pnpm lint`：1009 files 通过；
  Reforge / Editor production build 通过。构建只保留既有 chunk-size warning。
- 真实浏览器临时 source fixture（测试后逐字节还原，fixture SHA 仍为
  `1bdae48667a03ffebaa175b2c10d1f5a28c7e334f3b48f78c29590c1f713d237`）：
  - Reforge：问句 held-frame → 默认 No → Enter 得到 No；方向切到 Yes → Enter
    得到 Yes；先选 Yes 再 Esc 仍得到 No；console 0 error / 0 warning。
  - Editor：真实 PreviewCanvas 展示问句与 Yes/No，点击两臂分别进入对应 state；
    未回答时重置会移除 prompt 并回到“就绪”；console 0 error / 0 warning。
    lint 后新增 PreviewCanvas 直接测试，固定默认焦点、方向/Enter/Escape 与点击接线。

**历史 checkpoint：formal 前剩余门禁（下一节已收口）**：

- `packages/reforge/src/loader-v5.pal.test.ts` 中 demo/e2e-own 两项已通过；3 个 PAL
  content9 场景用例当前会在 loader 入口正确拒绝仓库仍为 contentVersion 8 的
  `projects/pal`。不得为消掉这 3 个预期红灯提前改 project 或跳测；19-locale
  Kimi/GLM 双签后正式迁移，再复跑 294 scenes、s048 亮屏/完成 cursor/读档不重播与
  s110 淡入时序。
- formal 首跑仍须核对 exact 文件白名单、manifest/state/new seal、旧五层 byte-pin；
  随后二跑与 live dry-run 都必须 `0/0/0`，project/baseline 同路径逐字节一致。
- 浏览器 PAL 金丝雀 `s005,s009,s050,s029,s030,s081,s108,s118` 及
  multi-confirm/save/session/abort 仍须在 formal content9 上完成。
- 当前状态继续为 `build`；Kimi/GLM 19-locale 双签即使通过也只开放 formal，
  不等于 implementation accept。formal 与上述余项完成后才可发起三方实现审查。

##### R13-4 formal publication / post-formal checkpoint（2026-07-30）

19-locale 白名单三方 `agree` 后，Codex 作为唯一 Coding Owner 完成正式迁移、修复迁移
事务暴露出的 half-state 恢复缺口并重跑全部正式门禁。本节取代上节“尚未 formal”的
时间点描述；N3-1 总状态仍为 `build`，这里只收口 R13-4 implementation candidate。

**正式写入与幂等**：

- 首次正式 `migrate-content --write` 产生 15 个 project writes（13 scenes +
  `content/locale.json` + E1 authority 的 `content/items.json`），迁移事务共 33 operations；
  迁移器内部独立第二进程为 writes/deletes/conflicts=`0/0/0`。
- 首次正式写入钉住：
  - source digest
    `beef4dd910b5d3445389e375342a5c5ee0dc62931bc9586bb7a9f3077562f368`；
  - runtime digest
    `d63365c7ced62ca213d7a580a73c25700bdf65be99e862bb6eff3890f2cc1c6d`；
  - `r13-confirm-v1` self/state digest
    `8909257867ff6873e17ea4534d183b325e908615bdc2c8630cfc7174efce313d`；
  - seal file SHA-256
    `38d129fbe45fe9815ba2623b62283a290c302b3a816a4d58c2e6418f833f49b6`。
- 随后的额外 live dry-run 发现 `_state` 已引用新 seal、但 untracked seal 文件本身缺失的
  half-state。只读审计确认普通 dry-run 主体没有删除路径，且审计进程没有执行清理；
  具体外部/shared-worktree 清理来源无法从仓库证据反推，因而没有把猜测写成根因。
- 上游修复而非手补生成物：
  - `migration-baseline.ts` 增加最终 validation 与 repair candidate load/assert；
  - `migrate-content.mts` 在 write/idempotence/dry-run 入口增加最终
    baseline/project/manifest 复验，并新增互斥、显式
    `--repair-r13-confirm-seal` authority；
  - `migration-transaction.ts` 暴露 pending transaction 检测；
  - `r13-confirm-mg2.ts` 暴露不可伪造的 rebuild authority；
  - 新增 `r13-confirm-seal-repair.ts` 与单测。repair 只恢复缺失 seal，
    `_state` byte 不变；缺 authority、已有 seal 漂移、pending transaction、project/
    manifest/baseline 不匹配全部 fail-loud。
- 显式 repair 后重新跑正式写入：第一进程 `0/0/0`，独立第二进程 `0/0/0`；
  再跑 live dry-run 仍为 `0/0/0`。无残留 journal/staging。

**正式产物守恒**：

- `manifest.contentVersion=9`、`minimumSaveVersion=8`；baseline `_state` 为 v2，
  新 seal parent 精确为 R13-3
  `c8df75a51de4c71ae5e71d43583b749736aecd61b0fd65e9b2568f2e1324502b`。
- 旧五层 seal 文件 byte 不变，file SHA-256：
  - P7 script-v4-v5 `41263ba1…b12`；
  - C8 `325d52ed…a24`；
  - cadence `2b1e71b0…453`；
  - cross-activation `723e4fd2…b12`；
  - item-throw `2c741222…b08`。
- changed scenes 恰为
  `s005,s009,s023,s050,s084,s091,s100,s102,s111,s127,s128,s131,s148`；
  13/13 project 与 baseline byte-identical。
- exact-only `s029,s030,s081,s108,s118` 仍 git byte-stable、project=baseline，且各自
  stable scene digest 等于新 seal 的 `exactSceneDigests`。
- locale 恰新增已签的 19 个 key；sorted-id digest
  `fff0a7c4cfeb462b7a11c10c31e0c3c33437225ee79fd577e16829c3e925913a`，
  id:text digest
  `ee546b25fa80c480a6b70287ff1884c0138cacbdb6cc3deee9473e4dbddff518`。
  **作者保护例外必须按真实口径描述**：15 个目标中 14 个 project/baseline
  byte-identical；project locale 正确保留 35 个 author-only menu/stat/equip/gameover
  key，因此整文件不相等。baseline-only=0、共同键改值=0，19 个 formal key/value 一致。
  不得把这条正确的 theirs 保留误报成 drift。

**正式验证**：

- migration/baseline/transaction targeted：26 tests pass；
  R13-3 MG2 9/9；R13-4 MG2 fast 11/11；P2/P3/P4 pinned core 20/20；
  cadence + published-v4 2/2。
- Content 30 files / 372 tests；Reforge 73 / 722；Editor 92 / 785；
  Migrate 81 files / 564 pass + 1 skip（单 worker，1107.62s）全绿。
- 根级 typecheck 7 packages、lint 1012 files、Reforge/Editor production build 全绿；
  fresh release 3 files / 16 tests（587.94s）全绿，只保留既有 chunk-size warning。
- 更新 `published-v4-snapshot` 与 cadence golden 后，历史 P2/P3/P4 core digest 均未改；
  cadence content9 golden 为 rows=4576、stages=4459、historicalMachines=117、
  transitionMachines=78、bytes=7,961,021、
  SHA-256=`07675c729e2232e770a252d322d23b662caf3ce3c41931f65016216fc79b6da4`。

**浏览器 / Editor 金丝雀**：

- `s005/e128`：默认 No 不执行 Yes 后缀并可再次触发；Yes 进入“多少钱一斤？”。
- `s009/e188`：第一问 No 终止；Yes→第二问 No 终止；Yes→Yes 进入成功正文。
- `s050/e845`：默认 No 进入“没钱买就走开…”。
- exact `s029/e536`：No 进入没钱正文并推进 phase-002；下一次激活显示第二问。
- exact `s030/e540`：长前序对话后正常出现确认框；先前“框没出现”是截在过渡帧，
  延后观察即可出现，不需要改实现。
- exact `s081`：真实 onEnter 推进到“你招是不招！？”；默认 No 显示
  “不招？再打！”/“还不肯招？再打！”并回环。源 @14486 No→@14461，
  Yes fallthrough→@14487；迁移后 initial/cycle 两个物理副本分别用 macroTask/worldTick，
  是既有 exact 守恒，不是 R13-4 新生成。
- exact `s108/e2002`：Editor canonical v5 工作区显示 12-state machine；
  `continuation-004/006` 均以“是/否询问”+ `commandOutcome` 表达，真实 PreviewCanvas
  可播放 held dialog。该角色在正常剧情激活前为 hidden，仓库尚无覆盖该剧情进度的
  e2e checkpoint，因此本轮没有伪造“从新局 live 走到该节点”的证据；PAL exact/MG2
  与 Editor V5 runner 测试负责自动门禁。
- exact `s118`：Chrome 从 `?scene=s118&pos=69,-11&facing=right&give=287`
  进入现场，使用“情书”后数量 5→4，确认 C8 私有脚本真实执行并消费物品；触碰后确认框
  的两臂由 exact scene/MG2、item-private runtime 与 central modal 测试钉住。本轮
  原生自动输入只能发离散按键、无法保持 10fps 移动键，因此没有把“自动化未走出一步”
  冒充产品失败；待建立该剧情 checkpoint 后补一条完整 live canary。
- runtime 临时 source fixture 已覆盖 held-frame、默认 No、方向切 Yes、Esc=No、
  prompt abort/session replacement；Editor 真实 PreviewCanvas 覆盖 Yes/No、
  reset/stop 移除 prompt。上述两轮 console 均 0 error / 0 warning。

**s128 名词澄清**：

- `s128` 是京城 `map-115` 的茅山道士剧情：林月如请道士去刘尚书府替刘晋元收惊，
  道士报价 15000。源 @19352 拒绝后经 @19309 reset 回 @19350 报价点；
  接受但钱不足则经 @19306 提示、再由 @19309 回同一个 @19350；钱足才扣款、禁用
  `e2245` 并切 `s119`。
- 因此 `shared-decision` 只表示“拒绝”和“钱不足”共享同一个中段 durable decision，
  不是新机制，也不表示剧情正文特别长。迁移后为
  `initial / decision-001 / insufficient / success` 四状态，三条路径均有 PAL pin。

##### R13-4 批次实现审查签字

| Agent | 结论 | 日期 | 备注 |
|---|---|---|---|
| Codex | **accept** | 2026-07-30 | 26/28/31 source closure、真实中央 confirm、content9/SAVE8、append-only seal、正式重迁二跑与 live dry-run `0/0/0`、TOCTOU/repair、四包全测/fresh release 和代表性浏览器/Editor 金丝雀已闭环。s108/s118 无剧情 checkpoint 的 live 尾项已如实列为后续 e2e 基建项，不以伪证据越门禁。accept 只把 R13-4 candidate 送 Kimi/GLM 只读审查。 |
| Kimi | **accept** | 2026-07-30 | 架构/runtime/save/MG2 与 half-state repair 实现审查通过：modal FIFO/默认 No/held-frame≥2/Esc=No/双提交幂等/abort-session 不跑臂；GameplayClock 冻结不补算；transient 与 persistent 同一 active registry（P1 落实）、prompt 中存档 park 到 safe point（P2 落实）；Editor 真 ScriptRunnerV5 + scratch world（P3 落实）；content9/SAVE8 拒绝矩阵含 sidecar tripwire；seal 六层一手 sha256 byte-pin、parent=`c8df75a5…`；26/28/31 守恒、19 locale、35 author-only 误报不成立；repair 上游修复无手补。记录项 4 条见交接。accept 仅准入 R13-5。 |
| GLM | **accept** | 2026-07-30 | 独立复核全绿。**数据守恒**：13 changed scene（s005-s148）project↔baseline 逐个 byte-identical；5 exact-only（s029/s030/s081/s108/s118）git clean。**locale**：project 与 baseline 各恰新增 19 key（dlg.5350..7856）、0 删除、0 共同键改值；sorted-id `fff0a7c4…`（= dlg.* 字符串 key 数组 stableJsonSha256）与 id-text `ee546b25…` 一手复算匹配。**26/28/31 + 四族**：RAW 2/18/5/1=26、logical 2/20/5/1=28、physical 3/20/6/2=31 全自洽；三个 fanout 清晰（s081 macroTask/worldTick 双副本 loop、s029/s030 phase-002 reset/end 复制）；status exact-preserved 6 / lossy-transformed 22 与账一致。**seal**：file SHA `38d129fb…`、self digest `89092578…`、parent `c8df75a5…`（= R13-3 item-throw 已发布）全匹配；旧五层 seal file SHA（P7 `41263ba1`/C8 `325d52ed`/cadence `2b1e71b0`/cross `723e4fd2`/item-throw `2c741222`）5/5 byte-pin。**manifest** content9/min8 确认。**items** 234→234 不变，7 item（163/164/165/179/185/187/188）equip.effects 转 battleSprite byActor，属 E1 authority 交叉落盘。**测试一手复跑**：control-flow PAL 4/4（129s）、MG2 PAL 11/11（344s，含上次失败现已修复的 `fresh init…重放 0/0/0` initialize 路径）、seal-repair 3/3、runtime-capability-audit 13/13 全绿。**上轮 baseline 污染问题已收口**：Codex 完成 formal write + half-state repair 后，baseline `_state`/seal/scene/locale/items 一致，MG2 initialize 路径可验证。s128 名词澄清（茅山道士尚书府收惊、shared-decision 不是新机制）已读。accept 只把 R13-4 candidate 准入 R13-5，不代表 R13-Z/N3-1/C8/ED-5I done。 |

- **当前门禁**：R13-4 formal candidate 已形成；Codex / GLM / Kimi 三席 `accept` 已齐
  （2026-07-30），**R13-5 准入开放**。
- **边界**：三方 R13-4 `accept` 只开放 R13-5，不代表 R13-Z、N3-1、C8 或 ED-5I done。
- 2026-07-30 Kimi：完成 R13-4 架构/runtime/save/MG2 只读实现审查，签 **accept**
  （仅准入 R13-5）。一手证据：seal 六文件 sha256 实测全中（P7 `41263ba1…`、C8
  `325d52ed…`、R13-1 `2b1e71b0…`、R13-2 `723e4fd2…`、R13-3 `2c741222…`、R13-4
  `38d129fb…`），parent=`c8df75a5…` 闭合；`script-confirm-modal.ts` FIFO/默认 No/
  `presentedFrames>=2`/Esc=No/settled 幂等；`gameplay-clock.ts:15-26` 冻结不补算；
  `script-world-v5.ts:513` 单一 active Map 兼容 transient activity（P1 落实）；
  prompt 中 F5 park 到回答+safe point 后拍快照（P2 落实）；Editor `playCanonical`
  直接 `new ScriptRunnerV5` + 每次播放新建 scratch world/coordinator（P3 落实）；
  save/migration.ts:261-292 只收 8/9 且 sidecar tripwire 0 读。13 changed scene
  project/baseline 逐字节一致（cmp 实测）、5 exact-only byte-stable、19 locale
  双 digest 复算一致、35 个 author-only key（equip×7/gameover×2/menu×17/stat×9）
  全部归属正确非 drift；half-state repair 为上游修复（不可伪造 rebuild authority、
  `_state` byte 比对、pending transaction 拒修），无手补痕迹。
  记录项（非反例）：①**R13-4 实现本体尚未提交**（138 modified + ~20 untracked 含
  seal 本体），提交时实现与 seal 必须同批入库，否则清理工作树即回 half-state
  （repair 工具已备）；②四份文档仍写"A7-4 候选 v9"应顺延 v10
  （project-lifecycle-design.md:304-309、asset-pipeline.md:243、capability-map.md:155、
  roadmap.md:194）；③prompt 中 F5 连发第二次按单 pending 语义 fail-loud toast，可接受；
  ④s108/s118 无剧情 checkpoint 的 live 尾项，Codex 已如实列为 e2e 基建项，未以伪证据
  越门禁，认可。未修改实现/产物/seal。Next：R13-5（敌人脚本与战斗上下文），Codex 仍
  唯一 Coding Owner。

##### Kimi R13-4 设计主审（2026-07-29）

**方法**：只读设计审查；对提取数据 0x0A 全量普查、产物有损/exact 形态、runner commandOutcome
机制与 R13-2 save barrier 一手核实。

**逐项结论**：

1. **source-backed pass + 冻结旧 projector 保五层 byte-identical** ✅。一手核实有损形态：
   s005/e128 当前为 `[dialog, confirm{onNo:[]}, clearDialog, dialog…, branch{hasMoney 25}…]`，
   No 臂为空且 Yes 后缀无条件续跑——"选否仍扣钱给水果"机制属实；根因（P3 flowExit 的
   `terminate-current-activation` 被 p7-canonical.generatedP3 展开吞掉）与修复位置（冻结
   旧 projector，唯一 source-backed pass，显式输入契约含 p6.flowStructures/sourceCensus/
   triggerActivationEvidence/c8Evidence）正确，不用当前代码重生成 parent，五层 byte-pin 成立。
2. **26/28/31 账与四族分类自洽** ✅。源 0x0A 全量普查恰 26 个唯一地址；四族求和 26=2+18+5+1、
   28=2+20+5+1、31=3+20+6+2、lossy 22=advance18+reset4、exact 6/9 全部闭合；C8 @19888
   （c8-b88cfe32b808/stage-1）一手核实为 `confirm{onNo:[clearDialog, dialog, stopScript]}`
   ——plain END 族用 inline onNo+stopScript 已忠实，只在 advance/reset/loop 族需要
   commandOutcome，"已保真不二次包裹"的边界正确。
3. **central modal / 默认 No / FIFO / 冻结域 / held-frame / 竞态** ✅。默认 No 对齐原版
   （uigame.c 确认框默认否）；shop/system/save 先完成+confirm 后禁新 modal+FIFO 单次 settle
   覆盖 modal 竞态；冻结域限定 confirm 不推翻"普通对话不冻结 NPC"裁决；held-frame 专用
   token ≥2 帧、只在 settle/abort/session replacement 释放，规避 one-microtask 复用；
   abort/session/runner replacement 拒 prompt 不跑任一臂，迟到按键按 session 拒绝。
4. **transient/shared/item-private activity lease 纳入 save barrier** ✅ 方向正确；持久
   runner 已有 coordinator lease（barrier active=0 才 ready），新增不写 FlowCursor 的
   activity token 覆盖 transient 全程——见 P1 钉。
5. **content9/SAVE8/min8 主动断档** ✅ 自洽：18 flow/26 旧 stage cursor 因 No 生命周期
   吞失无法无损映射（"未运行"与"已运行但续点丢失"同形），沿用 R13-2 已拍板的开发期
   epoch 政策；WorldStateV9=V5 无新字段；A7-4 顺延 v10。不主张保留 8/7（无人能给出
   逐 cursor 双向 identity）。
6. **Editor 真用 v5 runner** ✅：预览不得再经 v4 stages 降维（commandOutcome 会丢），
   必须 ScriptRunnerV5 或等价唯一执行器；stop/switch/unmount abort 不污染作者态。
7. **r13-confirm-v1 parent/evidence/门禁** ✅：parent=`c8df75a5…`（与 R13-3 已发布
   digest 一致，我上一批实测）；31 selector 无数组下标；C8 @19888 无 CommandId 的
   item/script/behavior/stage+command digest+唯一性断言合理；fail-loud 矩阵覆盖删/复制/
   换臂/target/commandId/yield/漏 copy；首跑范围限定 13 lossy scene + seal/_state/manifest，
   exact-only 5 scene byte-stable。

**风险钉（P，实现验收核对，不阻塞 agree）**：

- **P1 activity token 必须进同一个 coordinator active 注册表**（save barrier 的
  active.size===0 判据），不得另立并行计数器——否则 barrier 看不见 transient 活动，
  prompt 期间可拍快照。
- **P2 prompt 期间的存档请求语义必须钉死**：请求应 park 到 settle+safe point 后执行
  （barrier 语义自然成立），或被显式拒绝并提示；不得出现"prompt 中存档成功但 cursor
  停在 prompt 前"的第三态。
- **P3 Editor 预览的 v5 runner 必须跑在 scratch world 克隆上**（对齐 runtime
  legacyWorldScriptScratchV5 模式），作者项目状态与存档零写入；stop/switch/unmount 的
  abort 不得残留 activity token。
- **P4 递归切分的 decision state 命名必须确定性**（按源顺序），多 confirm flow
  （s009×2、s100/e1825×3、s131×2）的命名与 cursor 兼容在后续批次同样受 epoch 政策
  保护——本批发布后若再改这些 machine，沿用同一断档纪律。

**结论**：**agree**。设计无 schema/runtime/save/MG2 级反例。

- 2026-07-29 Kimi：完成 R13-4 专项设计主审，签 **agree**，附 P1-P4 风险钉。一手核实：
  源 0x0A 恰 26 地址；s005/e128 有损形态（onNo:[] + Yes 后缀无条件续跑）；C8 @19888
  exact 形态（inline onNo+stopScript，plain END 族忠实）；四族/三层求和全部闭合；parent
  digest 与上批实测一致。Next：Codex 作为唯一 Coding Owner 进入 R13-4 实现；P1-P4 与
  GLM 结论同为验收核对项。

### R13-5 敌人脚本 / battle context 公共 delta 设计门禁（2026-07-30）

**当前状态：build allowed。Codex / Kimi / GLM 已于 2026-07-30 全部签 `agree`；
Codex 是唯一 Coding Owner。**

源账与反例见
[P7-R13-5 敌人脚本源语义审计](../audits/codex-r13-5-enemy-source-semantics-audit.md)。
本轮只读构建冻结：

- raw enemy objects / raw projection / final enemies = **153 / 153 / 153**；
- 带脚本敌人 54；pending = **12 enemy / 31 source site**；
- pending ID 精确为
  `420,421,422,435,463,469,483,486,499,519,539,547`；
- 15 个 battleEnd hook 当前均恰为 1 stage；最终 15 个 `onDefeated` 尚无世界写命令；
- enemy-496 不在 pending，但 `0x79` 真双臂已被 translator + lead-only overlay 丢失，必须作为
  强制反例修复。

#### A. 根因裁决

1. 现有 enemy translator 的绝对 `turn >= k` 投影不是原版敌钩持久脚本指针的等价模型。
   plain / advance / reset END、概率失败留在当前入口、同激活 goto、跨激活当前 magic 与
   单次 RNG 多臂都必须保留；`pending=[]` 不再是完成证据。
2. 421 / 469 / 486 / 539 / 547 的重试和 reset 循环无法只靠现有 stateless `AiRule[]`
   忠实表达，必须新增 battle-local 持久 cursor 的敌钩 program。
3. enemy-519 明王觉醒需要“稳定角色固定成长 + 战内立即生效 + 战后永久写回 + 角色施法白闪”；
   现有世界/存档字段足够，但当前 battle choreography command surface 不足。
4. canonical v5 工程的 `onDefeated` 不能继续经 `legacyWorldScriptScratchV5` 执行。当前数据
   恰未触发状态丢失不等于边界安全。

#### B. 最小 public content schema

保留 `EnemyAI.rules` 作为无状态作者策略；新增可选的 battle-local hook program：

```ts
type EnemyHookStateId = string
type EnemyHookCommandId = string

interface EnemyAI {
  resistanceToSorcery: number
  rules?: AiRule[]
  fallback?: EnemyFallback
  hooks?: Partial<Record<'ready' | 'turnStart', EnemyHookFlow>>
}

interface EnemyFallback {
  action: Extract<AiAction, { kind: 'cast' | 'pass' }>
  chancePercent: number
}

interface EnemyHookFlow {
  initial: EnemyHookStateId
  states: Record<EnemyHookStateId, {
    body: EnemyHookCommand[]
    next: EnemyHookTransition
  }>
}

type EnemyHookTransition =
  | { kind: 'stay' }
  | { kind: 'restart' }
  | { kind: 'continue'; state: EnemyHookStateId }
  | { kind: 'advance'; state: EnemyHookStateId }
  | {
      kind: 'branch'
      cond: AiCond
      then: EnemyHookTransition
      else: EnemyHookTransition
    }
  | {
      kind: 'random'
      choices: { weight: number; then: EnemyHookTransition }[]
    }
  | {
      kind: 'commandOutcome'
      commandId: EnemyHookCommandId
      outcome: 'succeeded' | 'failed'
      then: EnemyHookTransition
      else: EnemyHookTransition
    }

type EnemyHookCommand =
  | { kind: 'setFallback'; fallback?: EnemyFallback }
  | {
      kind: 'effect'
      id: EnemyHookCommandId
      effect: Extract<AiAction, { kind: 'summon' | 'transform' | 'divide' }>
    }
  | BattleChoreographyAction
```

冻结语义：

- cursor 按**敌实例 × hook channel**保存在当前 `BattleState`，不进世界存档；
- `stay`：本次激活结束且 cursor 不变；`restart`：提交 initial 并结束；
  `advance`：提交目标并结束；`continue`：不提交、不让步，在同次激活继续；
- `branch` 每经过一次条件边才消费其所需 RNG；`random` 必须单次抽样并按正整数 weight
  选一臂，不能用多次 chance 近似 `0xA2`；
- `0x06` 使用原版 `RandomLong(1,100) >= rate` 边界：直走臂概率规范化为
  `clamp(rate - 1, 0, 100)%`，跳转臂为其补集；禁止把 raw rate 直接当现有
  `rng()*100 < percent` 的 percent 而产生 off-by-one；
- `commandOutcome` 只可引用同 state 顶层唯一 effect id，结果只活在当前 activation；
  summon/divide/transform 的源失败跳转必须吃真实 effect outcome，不能根据结果事后猜测；
- `turnStart` 每轮对 alive + visible 敌实例执行且不消费敌行动；`ready` 在该敌行动前执行，
  沿用一阶段实机真值：sleep/paralyzed/confused 时不跑 ready hook。hook 中的
  summon/divide/transform 是**立即战斗副作用且不消费随后正常敌行动**，不能再投成一条
  `AiRule` 冒充本回合决策；ready flow 完成且无 pending terminal 后才做正常行动选择；
- 敌行动优先级冻结为
  **stateless rules > instance fallback > attack**。源 enemy table 的初始 magic/rate 迁到
  `EnemyAI.fallback`，不再伪装成 turn rule；fallback chance miss = attack，
  `chancePercent` 必须为 0..100 有限数；
- `setFallback` 只改该敌实例副本并跨后续激活持续到下一次覆盖；字段缺席表示清空为 attack。
  `0x67` 的 normal magic / `0xffff` pass / 0 disable 分别投成 cast / pass / clear；
- flow / state id 必须稳定、非数组下标；validator 拒绝悬空 state、空 random、非正 weight、
  重复 effect id、跨 state/非 effect outcome 引用、无调度边界的 continue SCC 和未知字段；
  还须对 continue/branch/random/outcome 图做路径级静态检查，任一同激活可达路径 terminal
  action `<= 1`，并限制 synchronous continue closure 最大步数；runtime 再做同样的计数防线，
  不能只检查单个 body；
- 生命周期按 SDLPal 字段复制真值冻结：
  - 每个 battle enemy 内部拆开“当前视觉/数值 def”和 `scriptOwnerDef`；后者同时权威持有
    ready/turnStart program 与 onDefeated，不能再从 transform 后的当前 def 反查脚本；
  - summon：当前 def 与 script owner 都取目标 EnemyDef，使用 initial cursor/fallback/rules，
    fired 为空；
  - divide：新实例复制当前实例的 script owner + cursor、instance fallback、rules/fired；
  - transform：只切当前视觉/数值 def；保留原实例的 script owner + cursor（原版
    ready/turnStart/battleEnd 三个 script pointer 都不改），fallback 与 stateless rules 切到
    目标 EnemyDef，fired 清空；禁止按新旧 state id 恰好同名猜测继承；
  - 战后枚举必须取 `scriptOwnerDef.onDefeated`，不得取当前视觉/数值 def；测试钉
    transform chain 后仍执行原敌 battleEnd。
- Editor / clone / refs 至少必须 lossless 保存并提供具名状态与中文动作编辑；不得退回 raw JSON、
  legacy address 或第二套脚本编辑器。

`BattleChoreography.body` 从裸 `Command[]` 收窄为穷尽的
`BattleChoreographyAction[]`。首批允许的既有叶为：

```txt
dialog / wait / playSound / playMusic / stopMusic(fadeMs?) /
fleeBattle / endBattle / revivePartyAll / increaseHpMp
```

并新增：

```ts
{ kind: 'applyActorGrowth'; actor: string; delta: LevelGrowthDelta }
{ kind: 'playActorCastEffect'; actor: string; effect: 'pre-magic-white-flash' }
```

- `actor` 是稳定 `ActorDef.id`，禁止 party 下标、PAL role number 或 enemy-id hardcode。
  执行前必须在 active battle players 与 world party 中按 `CharacterInstance.template` 各得到
  **恰好一个且 instance id 相同**的目标；0 个、多实例或 battle/world 对不上都在任何 mutation
  前 fail-loud，禁止静默 `.find()` 取第一项；
- `applyActorGrowth` 是固定加法，不掷随机成长、不清 exp；先更新无装备
  `persistentProgress` 与当前 battle snapshot，再排队写回现有 `CharacterInstance` 八字段；
- 新增 Reforge **内部** `fixedCharacterGrowth` mutation，不能复用会强制 `expAfter:0` 的
  `characterGrowth`；该内部 union 不导出、不构成新跨包 API；
- 后续 revive / 回满必须读取增长后的新上限；
- wait 使用 GameplayClock deadline；battle-only `stopMusic.fadeMs` 还原 `0x77`
  （enemy-483 为 3000ms），play/stop music 接现有 main audio callback；旧 fade 的迟到停止
  必须受请求 serial 保护，不能误杀随后 music38；
- `fleeBattle` / `endBattle` 遇到时必须**立即登记 terminal request**，从该点起禁止新行动和
  新 hook activation；但当前 hook activation 的 synchronous continue closure 与已经排入的
  choreography 仍须继续，不能像现 runtime 一样清空队列。视觉/战果 settlement 只在该 closure
  和队列排净后提交。这样同时保留 0x69 立即写 BattleResult 与原解释器仍继续执行后续指令的
  两层语义；任一路径最多一个 terminal，重复/冲突由 validator 拒绝，activation 抛错或 session
  abort 时不得提交迟到 settlement；
- BattleSession 对 action union 穷尽执行；default 必须抛错，禁止 log-only。

content10 同时把 `EnemyDef.onDefeated` 从 legacy `Command[]` 收窄为显式 context union：

```ts
type EnemyOnDefeatedLeafV10 = Extract<
  AuthorCommandV5,
  {
    kind:
      | 'dialog'
      | 'clearDialog'
      | 'wait'
      | 'playSound'
      | 'playMusic'
      | 'stopMusic'
      | 'giveItem'
      | 'loseItem'
      | 'giveMoney'
      | 'setFlag'
      | 'setVar'
      | 'addVar'
      | 'stopScript'
  }
>

type EnemyOnDefeatedCommandV10 =
  | EnemyOnDefeatedLeafV10
  | {
      kind: 'branch'
      cond: AuthorConditionV5
      then: EnemyOnDefeatedCommandV10[]
      else?: EnemyOnDefeatedCommandV10[]
    }
```

它仍是一次性 transient body，**不新增持久 flow cursor**；不允许 shared call、loadScene、
startBattle、confirm、loop、实体/选择写入或旧 binding。未来扩 kind 必须带真实 runtime
context 与测试后另签，不以整个 `AuthorCommandV5` 冒充 context schema。另保留显式
`LegacyEnemyDefV9.onDefeated: Command[]` 供 v9 upgrader / historical validator，不能拿 current
类型解析历史内容。

#### C. onDefeated canonical authority

- content v5/current 工程：递归验证 `onDefeated` 是
  `EnemyOnDefeatedCommandV10[]` 后，按其结构属于 `AuthorCommandV5` 的子集调用现有
  canonical runner；
- 若战斗由当前 V5 activation 的 `startBattle` 发起，onDefeated 子链必须携带不可伪造的内部
  activity lineage token，复用父 activity/lease 执行；不得在 activation gate 已关闭时再
  `beginActivity()` 等待自己。只有 hostile/dev 等无父 activation 的战斗才登记新的 transient
  activity。lineage 仅在 Reforge 包内传递，不新增跨包 public API；
- 父 activity 必须覆盖 battle + onDefeated + 外层 safe point 全程；pending save 只能在
  onDefeated 世界写完成、外层 safe point 提交并释放父 lease 后拍快照。abort/error 只关闭一次，
  不泄漏 lineage 或 activity；
- v4 historical shell 才允许旧 `ScriptRunner + world.script`；
- 禁止“先写 structured-clone scratch 再镜像回 canonical”；禁止
  `as unknown as AuthorCommandV5[]` 裸 cast；
- 不新增/导出 battle runner、不改 `ScriptRuntimeHostV5` 公共 API；但按 K5，本次执行权威切换
  仍纳入本专项三签；
- 非 abort 错误不得 `.catch(console.error)` 吞掉；abort 遵循 launch/session signal。

#### D. 生成期 fail-loud

1. `translateStages()` 返回后、任何 `stages[0]` 读取前，battleEnd 必须断言恰为 1 stage；
   错误带 enemy id / name / hook / `L_address`。
2. 最终 target 的 runtime-capability audit 在 write transaction 前遍历
   enemy hooks、encounter choreography 与 `onDefeated`；任一 refused/unknown cell 直接抛。
3. support cell 必须与 BattleSession / canonical runner 的真实实现一一对应；不允许因当前
   PAL 没实例而开放裸口。
4. R13-5 source disposition 为每个 31 site 绑定
   `translated | equivalent | unreachable`、source closure、raw/overlay/final selector；
   删除/换臂/改 transition/overlay lead 变化都须重新打开 debt。

#### E. 版本、SAVE 与 append-only publication

- public content schema 变化占用 **contentVersion 10**；A7-4 候选顺延到下一未占用
  **contentVersion 11**；
- 世界结构无变化：`WorldStateV10 = WorldStateV9`；
- `content 9 -> 10` 工程升级器对旧 `BattleChoreography.body: Command[]` 逐项做纯映射：
  新 union 已支持的 leaf 原样保留，任何旧 v9 合法但 battle runtime 不支持的通用命令都以精确
  owner/path fail-loud，零写盘等待作者处理；扫描范围必须同时覆盖 enemies 和
  scene/shared/item-private 递归 command tree 中的 `startBattle.choreography`，禁止只扫
  `enemies.json` 或用裸 cast 把未知命令偷渡到 v10；`onDefeated` 同步递归升级为
  `EnemyOnDefeatedCommandV10[]`；
- v4/v5/v6/v7/v8 直升 current 的所有 Editor 路径与独立 v9→v10 路径复用同一纯升级器，
  `enemies` 与其余受影响内容先写、manifest 最后写；只容忍“内容已是 v10 形状、manifest
  仍为 v9”的可验证半状态重试，新旧形态混合必须 fail-loud；
- `SAVE_VERSION` 保持 **8**，PAL `minimumSaveVersion` 保持 **8**；
- current 工程接受 `SAVE8/content10`；`SAVE8/content9` 只走内存中的
  `content 9 -> 10` identity normalization（world deep-equal、只改 payload contentVersion），
  不读取 sidecar、不改 cursor；其它组合继续在兼容 IO 前 fail-loud；
- 已发布的 `SavePayloadV8/content9` 拆成显式
  `LegacySavePayloadV8Content9`，current-v9 preflight 语义与 epoch-v9 verifier 保持 historical
  byte-pin；另以 `SavePayloadV8/content10` 作为 current，并新增 `content-v9-v10` resolver，
  禁止把旧类型/函数随 `CONTENT_VERSION` 常量原地漂移。负测必须证明 identity 的
  world/position deep-equal、sidecar I/O=0、失败输入不变；
- 新 append-only seal 暂名 `r13-enemy-script-v1`，parent 必须是已发布
  `r13-confirm-v1`；旧六层文件 SHA byte-pin，project/baseline/manifest/seal 同事务；
- migration epoch / runtime audit 只关闭 R13-5 enemy debt，不得顺手关闭 R13-6 或 R13-Z。

#### F. 最低验收矩阵

1. **账**：12 enemy / 31 source site 全部 disposition；raw/overlay/final
   153/153/153；pendingScripts 归零只是派生断言。
2. **CFG**：plain/advance/reset/label；`435@41555` unreachable；
   422 保留 `42637/42639`；547 四个 `0xA2` 臂。
3. **多激活/RNG**：421、469、486、539、547 retry/reset trace；463 四臂边界；
   420/422 每轮首只音效。
4. **动态**：483 `stop(fadeMs=3000) → sound213 → 1600ms → music38` 且旧 fade 不误杀新曲；
   519 八项成长、复活、回满、
   白闪、角色模板唯一性、战中值、战后 world、save/reload；496 team34/team37 双臂；
   499 两臂、flee request 立即且后续 `0x06[30,0]` 严格 71% skip / 29% 说明对白；
   transform chain 后仍跑原 script owner 的 battleEnd。
5. **负测**：battleEnd 两 stage、未知 battle action、悬空/循环 flow、
   onDefeated refused command 均在写盘前失败。
6. **save barrier 竞态**：
   `confirm 中 F5 → 回答 → 同 state startBattle → onDefeated 世界写 → outer safe point → snapshot`
   无死锁，snapshot 必含战后写；hostile/dev 无父 activation 另有 transient lease。
7. **发布**：content/reforge/editor/migrate 定向与全量；fresh release；正式全量重迁、
   独立第二进程、live dry-run 均 `0/0/0`；project/baseline 无手补。

#### R13-5 专项 `build` 推进签字

| Agent | 结论 | 日期 | 备注 |
|---|---|---|---|
| Codex | **agree** | 2026-07-30 | 只读源账与 runtime/public boundary 审计完成。12/31、enemy-483/519/496、五类 cursor 反例与 15 battleEnd 事实已冻结；两轮对抗复核提出的 effect 不吞行动、script owner、activity lineage 与唯一角色实例等阻断均已闭合，最终复核无剩余 P0/P1；同意最小 enemy hook flow、battle-only action、canonical onDefeated authority、content10/SAVE8 identity 与 append-only publication。 |
| Kimi | **agree** | 2026-07-30 | 架构/runtime/schema/版本/MG2 主审通过：hook flow 五类 transition+per-instance cursor+fallback 最小充分（421/469/486/539/547 反例逐一可表达）；ready 后仍行动对 fight.c:1719-1724 一手核实；transform 不改三脚本指针对 script.c:2954-2969 一手核实；明王固定成长与 game-mechanics:1260-1300 逐条吻合；onDefeated canonical authority + lineage 成立；content10/SAVE8 identity 与 append-only 自洽。附 P1-P7 风险钉（见「Kimi R13-5 设计主审」）。 |
| GLM | **agree** | 2026-07-30 | 独立 build 复算 + 源语义逐敌一手验证。**账**：`buildPalMigration` 复算 raw 153 / withScript 54 / pendingScripts 12（id 420/421/422/435/463/469/483/486/499/519/539/547 精确匹配）/ pending notes 31 = 31 site；project+baseline `enemies.json` 各 153。**逐敌源语义**（从 all.json + enemy-objects/teams/player-roles + sdlpal script.c/fight.c 独立核）：496 @41432 `0x79[盖罗娇=41,41473]` 真双臂（无盖→对白→fallback 385；有盖→378→328→0xFFFF pass→0x89 terminate），team34=[527,496,527] 496 非 lead / team37=[496] 均可达 ✅；519 turnStart L_42237 八项成长 level+11/maxHP+170/maxMP+190/attack+100/magic+155/defense+55/speed+80/luck+30（opcode **0x19** 非 0x66，数值/op[2]=2→role1 赵灵儿 全吻合）+battleEnd giveItem 230 ✅；483 `0x77[1]`=fade 3.0s / sound213 / `0x85[20]`=1600ms / music38 时序全对 ✅。**battleEnd**：15 onDefeated 全单 stage（array 无 stages）、command kinds 恰为 `branch/dialog/giveItem/stopScript`、无世界写指令 ✅。**版本链**：parent r13-confirm-v1 digest `89092578…` + 旧六层 file SHA（P7 `41263ba1`/C8 `325d52ed`/cadence `2b1e71b0`/cross `723e4fd2`/item-throw `2c741222`/confirm `38d129fb`）byte-pin 对象确认；content10/SAVE8 identity + v9→v10 纯映射升级器 + 递归扫 startBattle.choreography/onDefeated 禁裸 cast 设计成立。**附 G1 风险钉（非 blocker，实现期核对）**：审计 enemy-499「runtime 遇 flee 会清队列，后段永不可达」的**机制描述错误** —— 后段不可达真因是 `[40971] 0x06[30,0,0]` 概率门（71% 跳 globalIp 0→end 终止 / 29% 续跑到说明对白），不是 0x69 flee 清队列；type-pal `event-system.ts:4406-4413` turnStart 上下文 OP_JUMP_BY_RATE 无 target!==0 守卫、jumpToGlobalIp(0)→ip=-1→+1=0→cmd[0]end，71%/29% 与 sdlpal InterpretInstruction:3299 对齐；0x69 走 D26(2b) 入队作 effect、不阻断后段对话（tickBattleDialog phase-agnostic）。验收矩阵「499 flee 后对白」的**处置方向正确**（保留双臂+后段），但若按审计错误理由做「flee 延迟到演出体收尾后结算」会改变原版 flee 即时语义——实现时须按 0x06 概率门迁移，不得延迟 flee。 |

**build 准入结论**：三方均 `agree`，R13-5 可进入 build；Codex 为唯一 Coding Owner。
实现完成后仍须回到 `review` 集齐三方 `accept`，不得提前标 N3-1 / C8 / ED-5I done。

#### R13-5 `build` 实现进度（2026-07-30）

- public schema / runtime / save 主链已分批提交：content10 敌钩 flow、instance cursor/fallback、
  script owner 生命周期、BattleSession 调度与 battle action、canonical onDefeated activity
  lineage、SAVE8/content10 identity normalization、资源预载/引用/编辑器 lossless 保存均已落地。
- 生成期源账与 capability 门禁已提交：
  - `b764607d`：enemy source disposition（31 个历史 debt + 强制反例与 reviewer 静默反例）；
  - `5c1b9221`：runtime capability v3；
  - `240bcb55`：scene/shared/item-private 内嵌 battle choreography 严格 payload 校验。
- `88db1c41` 冻结 R13-confirm 历史 enemy parent authority，current v10 与历史重放使用独立
  source snapshot。独立旧源码复核与 PAL test 共同钉死：
  - frozen P0 `dd42217c…`、current v10 `8fe4ad1c…`；
  - historical raw snapshot `8df37da1…`，完整 content9 final `f4b1a1e8…`；
  - 旧施法闭包 49 ids，间接边 `4 transform + 22 summon = 26`；
  - boss overlay 仍精确 `8 attached / 5 cleared enemy`；
  - P2 → P7 → r13-confirm 完整链、confirm evidence `57022d9e…` 与已发布父层 exact。
- 历史 authority PAL test 3/3（262.64s）与 migrate typecheck 均通过。旧 translator 的
  `onDefeated` 已固定为 v9 `Command[]`，只在 `mapEnemies` 注入边界做一次显式适配，未来
  v10 类型收紧不能静默改写已发布 parent。
- `825398ab` 完成 R13-5 outer MG2 与测试性能收口：
  - current v10 enemy/locale 增量通过 source-backed 12 enemy / 31 debt authority 合入
    r13-confirm canonical；99 个 enemy owner 的 owned leaf manifest 固定为
    `ai.fallback=85 / ai.hooks=44 / ai.rules=95 / choreography=21`；
  - 以稳定 scene/entity/flow/stage/body index selector + 旧 choreography digest 删除
    s003/s021/s086/s093/s106/s138 共 8 份旧遭遇演出，不靠整文件覆盖；
  - outer source disposition 共 81,674 execution sites，最终 R13-5=`0/0`，R13-6 保持
    `215/197`；runtime matrix 431 cells / 62,346 uses / 0 refused / 0 issues；
  - prepared census 用进程私有 brand + 全依赖引用锁定，prepared enemy authority 每次复用
    重验 pure-successor 完整 content digest；签后 source 容器替换、non-owned snapshot
    篡改、自洽重签和伪造 prepared token 均 fail-closed；
  - 旧六层 authority byte-pin 不变，content9→10 / SAVE8 identity、8-file write whitelist、
    author target owned-delta closure 与 append-only baseline/transaction 同时成立。
- `d94c3cb2` 正式发布 R13-5 产物：
  - project writes 恰为 `content/enemies.json`、`content/locale.json` 与上述 6 scene，共
    8 files；deletes/conflicts=`0/0`；
  - baseline 同步 8 files，新增 `_transitions/r13-enemy-script-v1.json`，更新 `_state` 与
    manifest contentVersion=10 / minimumSaveVersion=8；事务共 19 项；
  - new seal self digest `54804a6c69e644e9c44fd98fd489d0f73eee6580c4ffc3c3753322074361fab6`，
    file sha256 `e913123d9f01b6b1caf530bb168c9e78abc7339d4ac5dbcd55b731433c39f9c9`，
    parent 为已发布 r13-confirm `89092578…`；
  - enemies 与 6 scene project↔baseline byte-identical；locale project=9,587、
    baseline=9,552，差异仅 35 个 project-only 作者键，baseline-only=0、共同键改值=0。
- **验证证据**：
  - migrate typecheck、两个 `.mts` 独立 strict tsc、Biome 18 files、`git diff --check` 通过；
  - source census / disposition / translator unit 32/32（0.57s）；
  - R13-5 MG2 1/1（291.12s，总 wall 含 PAL fixture；测试自身恢复 240s 门；这是 formal
    publication 前证据，随后被 GLM 对已提交 baseline 的 initialize 反例 supersede，见下方
    post-publication 返工）；
  - source disposition + enemy source PAL 8/8（134.49s）；
  - confirm/cross fresh-init 定向 2/2（19 skipped，242.56s）；
  - 正式 dry-run `8/0/0`；`--write` initialize `8/0/0` + 命令内独立进程 replay
    `0/0/0`；额外 live dry-run replay `0/0/0`；journal/staging 均清空。
- **测试性能债续收口**：定位到 disposition 对每个 execution site 重建、去重、排序相同
  candidate evidence，并在 outer/cross/confirm 重复扫描全表。改为 address/context 索引、
  同 snapshot digest 复用、一次完整 build-and-assert、私有 prepared census/authority 与
  merged-target closure。R13-5 MG2 定向总 wall 从 522.20s 降至 291.12s（约 44%）且增强
  anti-tamper；仍有约 90s PAL fixture 冷启动和 81,674-site release authority 固定成本，
  后续不得靠继续提高 timeout 掩盖。
- **formal publication 前边界**：R13-5 formal candidate 已形成，进入三方 implementation
  review。Codex 已签 accept；Kimi / GLM 未签 `accept` 前不得标记 R13-5、N3-1、C8 或
  ED-5I done。其后两方均签 `counter`，返工见下一节。

#### R13-5 post-publication counter 返工（2026-07-31）

`e6a521d6` 已完成 Kimi / GLM 两个 counter 及其连锁回归的统一修复；`299a6fb8`
在不修改生产 schema / 产物 / seal 的前提下拆分 fast/release 证明并关闭确定性 timeout。
历史 counter 记录保留，本节只形成新的复审候选，不替审查方改签：

- **Kimi K1**：`legacy-enemy-script-v9-authority.pal.test.ts` 的 `hookSources` 冻结值由 44
  修正为 54，并写明账目 `44 ready/turnStart owners + 15 battleEnd roots - 5 owner overlap`；
  historical authority 3/3 重新通过。
- **GLM G2**：新增 `published-r13-enemy-test-fixture.ts`，从已发布 R13-5 baseline/project
  安全回退到 parent，逐项校验 seal 的 state/file/hash/successor/author 四层关系；initialize
  测试额外注入 non-owned `enemy-420.stats.cash` 与 `s003/e59.facing`，证明 8 个 owned writes
  不吞作者改动。R13 enemy audits 3/3 重新通过。
- **post-publication cascade**：
  - P2/P3/P4 历史重建统一 strip R13-5 enemy/locale owned delta，并对 parent、successor 与
    author 漂移 fail-closed；历史 pin 20/20 保持；
  - R13-confirm fresh initialize 先回退已发布 enemy 层，11/11 保持；
  - cadence current digest 只随 8 份旧 choreography 正当删除更新，历史 digest 不改；
  - strict-empty integration 改从 R13-5 transition 计算 current；sound current audit 恢复
    4 条 sound 与 2 条 music 引用，冻结 `source playSound=1,039`、
    `target soundEdges=1,747`、`allRefs=6,731`、`nonSound=4,984`，missing/kindMismatch=`0/0`；
  - integration strict-empty 先把历史 sources 收敛为一次 clone、R13 census 收敛为一次
    prepare；随后 `299a6fb8` 把 PAL fixture 构建移入独立 180s hook，planner 用例仍保持
    原 240s 门，不再把 setup 时间误算成 planner timeout。
- **GLM G3**：`r13-enemy-source-disposition.pal.test.ts` 已正式加入
  `PAL_SHARED_TESTS`，7 个细粒度 source oracle 不再游离于 fast/release 矩阵。
- **content10 连锁闭环**：
  - 编辑器本地工程 v4/v5/v6/v7/v8/v9 均在内存合成 current content10/SAVE8，
    预检 scene/shared/item-private/enemy 全 owner 的 battle/onDefeated context，零写
    fail-loud，manifest 永远最后提交；
  - current `checkAuthorCommandsV5` 也直接校验 `startBattle.choreography`，manifest10 工程
    不能绕过升级器偷渡世界命令；
  - item/script reference walker 不再把穷尽 battle action 误当通用 `Command[]`，enemy
    onDefeated 改用穷尽 typed walker；
  - demo、e2e-own、blank project 与 loader/editor fixtures 同步 content10；historical
    SAVE8/content9 identity fixtures 保持不变。
- **fast/release 证明分工（`299a6fb8`）**：
  - `pal-shared` 保留完整 source-backed initialize、successor/author-layer 与 anti-tamper；
    `pal-fresh` 从真实磁盘 baseline/project 校验 seal、successor、8 个 owned path 和 35 个
    authored locale id；
  - release integration 不走 shortcut，完整调用 planner 并显式断言
    `enemyScriptSealMode=replay`、conflicts/writes/deletes=`0/0/0`；
  - enemy audit 删除同一 fixture 内的第二次重复 replay，但保留 initialize、半状态拒绝、
    作者改动与篡改反例；外部/prepared runtime capability 报告仍走 snapshot-backed rebuild，
    只有同调用刚构建的本地报告使用 report-only 自校验。
- **最终自验证（2026-07-31）**：
  - migrate typecheck、Biome 6 files、相关 unit 2 files / 19 tests（0.64s）通过；
  - R13 enemy PAL 全路径 1 file / 3 tests（338.34s）通过；
  - release strict-empty replay 1 passed / 2 skipped（265.96s），完整 planner 结果为
    replay + `0/0/0`；
  - 根级 `pnpm check:fast` 全绿：7 包 typecheck；446 files / 5,198 tests passed、
    1 skipped；migrate fast 为 86 files / 599 passed / 1 skipped（1,282.83s）；
    全仓 Biome 1,040 files 通过。
- **性能债边界**：本批关闭了重复 replay、重复本地 capability rebuild 和 setup 误占单测
  timeout，不能宣称 81,674-site source-backed authority 固定成本已消失。根门仍约 21 分钟，
  worker 实测约 1.3GB RSS / 单核满载；后续优化必须继续保留 fast/release 双证据与 release
  全量重建，禁止靠提高 timeout、跳过 source-backed 或跨调用全局缓存冒充收口。

**R13-5 done（2026-07-31）**：Kimi / GLM 已对 `e6a521d6..299a6fb8` 完成复审，
三方均签 `accept`；R13-6 可按既有设计门禁开始。R13-Z、N3-1、C8 与 ED-5I 仍未完成。

#### R13-6 当前源账重算与 6A / 6B 门禁拆分（2026-07-31）

R13-5 发布后，旧的 R13-6 集合数量没有消失，但最终目标和证据身份已经变化：10 个
`pendingSkills` 现在都因 R13-5 敌人施法闭包而出现在 final `skills.json`，不能再把
“final 有技能”当成源语义闭合。R13-6 必须从当前 R13-5 parent 重新生成 census、
disposition 与 seal；历史 `215 sites / 197 observations` 只作为 R13-5 隔离证明和新批输入，
禁止继续硬编码成 R13-6 完成后的期望值。

- **14 raw pending → 4 已关闭 + 10 仍开**：
  - 314 / 344 / 392 / 394 已由 `PAL_RESOLVED_SKILL_IDS` 与 authored overlay 关闭，不重做；
  - 330、334、342、357、378、380、385 共 7 个 `scriptOnUse 0x35`，分别要求施法效果开始前
    震屏 20 / 20 / 14 / 24 / 14 / 14 / 14 帧。现有 `SkillAnimation.shake` 明确定义为
    **末尾**震屏（`packages/content/src/skill.ts:93-96`），不能拿它伪装前摇；
  - 352 三尸咒、372 万蛊蚀天、373 毒吞天下的 `0x68 → 0x20` 表示敌人施放跳过，
    玩家施放消耗 item 148 蛊 ×1，不足进入失败臂。`SkillCost.items` 已存在
    （`packages/content/src/skill.ts:6-12`），因此数据形状无需新增 schema。
- **4 lossy 仍是 open，不是 approved-lossy**：
  - 303 回梦：玩家 60% / 睡眠 4 回合；敌人 70% / 睡眠 3 回合并使玩家 HP -1；
  - 304 夺魂：玩家先过魔抗门再 33% 即死；敌人无该魔抗门、30% 即死；
  - 305 鬼降：玩家 44% / 疯乱 4 回合；敌人 50% / 疯乱 3 回合并使玩家 HP -1；
  - 370 酒神：常规 1 MP 先扣，再消耗 item 86 酒 ×1；成功后以剩余 MP ×8 结算并清空 MP。
  仓库没有用户批准这四项继续有损的证据，禁止以 `approved-lossy` 销账。
- **14 palette 站点**：
  - palette 0 七处、palette 5 五处，按用户已批准结论分别映射既有 ambience `day` 与新表项
    `warm`（`[255,230,102]`，不新增 schema）；
  - palette 2 / 6 各一处，连同随后恢复 palette 0 的两处，共四站分别绑定
    `frame-animation.pal.003` / `.007` 的 RGBA asset-baked evidence，不再生成 ambience；
  - 动态 host `@23975` 必须同时钉住 source owner 与最终 host/root 身份，不能只按地址销账。
- **表现指令**：
  - `0x9B×2` 可直接复用现有 `ditherScreen(2160ms)`；
  - `0x05` 的非零 delay 可复用 `clearDialog + wait(op1×60ms)`；`op2=0xFFFF` 的旧引擎
    gesture 刷新必须先给出 clean runtime 持续渲染等价证据，不能仅因“看起来没差”销账；
  - `0x76×4` 是持续填黑，不等于瞬时 `fade out`；`loadScene` 的固定 260ms out/in 也只是
    现代近似。这两项留在 6B，禁止在 6A 静默吞掉。

##### R13-6A：既有 schema 子批（build allowed）

沿用 2026-07-26 P7-R13 三方 `agree`，本批不新增公共 schema、SAVE 字段或 ScriptHost API：

1. 上游识别 352 / 372 / 373 的 `0x68 → 0x20` 链，生成 `cost.items=[{itemId:"148",
   amount:1}]`，不再依赖 R13-5 的“敌用技能兜底”偶然补齐玩家技能；
2. Reforge 施法顺序必须保持一阶段真值：先扣常规 MP，再检查/消耗脚本物品；物品不足时
   MP 仍消耗，但不播效果动画、不结算 `effects`、不累计成功施法隐藏成长。一阶段一手锚点为
   `packages/game/src/core/battle/actions/magic.ts:254-272` 与
   `packages/game/src/core/battle/__tests__/actions.test.ts:1795-1820`。战斗库存继续通过
   `BattleSession.writeBackInventory` 在胜/败/逃后持久回写；
3. palette 14 站按上述 day / warm / asset-baked 逐站闭合；不复活 palette index schema；
4. 只处理无需新命令的 `0x9B`、`0x05 delay`；gesture evidence 不足时保持 open，不得为了
   追求零数字伪造 no-op；
5. 每个变化都要重算 current census/disposition，补 exact source site/hash/context →
   canonical target/digest 或 asset/runtime evidence，并保持 R13-5 及更早 seal byte-pin。

##### R13-6A implementation candidate：prepared authority / historical profile 硬化（2026-08-02）

本轮在不改公共 schema、SAVE 版本和已发布产物的前提下，补齐了 R13-6A 的输入身份、
历史运行时矩阵和 observation delta 门禁。这里是实现候选与自验记录，不代表 R13-6A、
R13-Z、N3-1、C8 或 ED-5I 已完成。

- **prepared source input fingerprint**：`sourceDispositionInputDigest` 覆盖 historical/current
  source roots 与 commands、migration snapshot/report、historical audit、generated snapshot/IR、
  ledger/evidence、parent source disposition、enemy closure 与 prepared census；另有进程内 fast
  sentinel 用于 prepared replay。`generated.ir` 已作为独立摘要输入，不能只凭 snapshot/ledger
  摘要复用旧 authority。parent/enemy source report 在复用时重新执行自身 digest/结构断言，
  successor disposition/sourceControl 深冻结；同一对象内历史 source command 被替换或修改时
  必须 fail-closed。
- **seal / authority anti-tamper**：独立 JSON 反序列化的等值 seal 可以通过；篡改
  `sourceControl.reportDigest` 后即使重签外层 seal 仍拒绝；prepared authority 同时检查输入
  identity、内容 fingerprint、authority digest，避免把“同一引用”误当成“同一内容”。
- **R13-5 successor 身份**：source ledger 绑定已发布 successor
  `5750ac4fbaec8cc487be1bdbd88881005d239a7f6a118adba8286643208c2603`；它与 existing-schema
  augmentation 的 parent content-view `4d4bcbdb04b26947c75c1cd3899c9b988ace926a54d5d2a2f7f5e4f961e12a33`
  是不同信任身份，禁止混用。
- **6A observation delta**：22 个 owned site 只允许 final 从 open-debt/open 转为
  structured/accounted；raw/augmented 仍保留 R13-6 open proof。owned source observation 按
  source address 分组后允许随 exact site closure 消失；非 owned site/observation 仍要求逐项深相等。
  总 observation 按 `parent + successorOwnedSource - parentOwnedSource + 3` 重算，`+3` 来自
  技能 352/372/373 各自拆成一个仍 open 的 lossy observation 与一个 final accounted item-cost
  observation；open observation 净变化为零，6B gesture/0x76 债务保持 open。
- **historical/current runtime profile**：当前矩阵允许 hidden scene-entry prepare 中的 `wait`；
  已发布 R13-confirm / R13-5 historical profile 保持拒绝。V2 新增具名
  `auditHistoricalR13ConfirmRuntimeCapabilities` / `assertHistoricalR13ConfirmRuntimeCapabilityAudit`，
  V3 保留具名 historical R13-5 wrapper；R13-confirm authority/replay 和 R13-5 enemy authority
  不得误用 current 矩阵，合并后的作者 target 仍独立按 current 矩阵验证。历史与当前矩阵唯一差异
  已硬钉：current `96e67cfb…`，published historical `d25ee2a7…`；已发布 runtime report
  `d63365c7…` 与 confirm seal `89092578…` 也加入 PAL pin。迁移产物层的 `0x9B`、`0x05 delay`、
  `setPalette` 已按 `historical-r13-4` / `current-r13-6a` 隔离。

**自验证证据（最新代码）**：

- `pnpm --filter @type-pal/migrate exec tsc --noEmit`：通过；`git diff --check`：通过；
- runtime capability V2/V3、scene-entry、translate-events 及相关单元：95 tests 通过（另有
  content script-library 18 tests 通过）；历史矩阵精确命中 `d25ee2a7…`；
- R13-6A source-semantics PAL：11/11 通过，wall `510.82s`（约 510s 为一次冷 PAL 夹具构建，
  prepared replay 已不再触发 120s 超时）；
- R13-5 enemy historical initialize 回放：1 passed / 2 skipped，wall `386.25s`；历史 confirm
  runtime report、matrix 和 seal 均与已发布 pin 相等。

**测试性能债的真实边界**：这轮关闭的是 repeated prepared replay、重复 capability rebuild、
  setup 误占 per-test timeout，以及历史矩阵被当前全局表污染；没有把 81,674-site source-backed
  冷构建伪装成“已快”。实测冷启动仍约 6–9 分钟、单核满载、约 1GB 以上 RSS，原因是 PAL fixture
  在 worker 内重建完整 P2→P7 链、census、source ledger 和多层 authority，并非普通单元测试。
  下一项独立性能债必须把行为测试迁到合成小 fixture，只保留一个 source-backed PAL cold canary，
  或做受 digest 校验的预构建 fixture；不得继续提高 timeout、跳过 source-backed 证明或跨调用
  偷渡全局缓存。

##### OPS-TST-PERF 分层后的最新边界（2026-08-02）

`docs/ops/tasks/OPS-TST-PERF-test-fixture-stratification.md` 已把日常开发门与发布门拆开：

- `test:fast` 当前固定运行 `71 files / 533 tests`，最新为
  `39.38s / 465,485,824B`；该门不构建完整 PAL P2→P7 fixture，
  但保留 6 个 source-backed lite/oracle 文件和 5 个 P7 混合文件的纯单元测试。
- `test:canary` 是独立冷进程，直接重读 extracted source、audit、published baseline/project，
  精确重建 R13-6A authority 并 replay `0/0/0`；经 canary-only 阶段缓存释放、GC 与
  source-input-only enemy authority 后，又将 R13-6A 的第二次 81,674-site 全量 disposition build
  改为基于已验证 R13-5 父报告的 22-site/3-skill 受约束增量；此后继续消除 P7/迁移整图复制、
  重复 source page、全量 index、whole-graph freeze set 和 fast digest 巨型字符串，并在 full
  historical/current migration 各自完成 stable+fast identity 后，仅于 canary 保留 WeakMap 品牌窄视图。
  三次等价 exact-golden 冷跑 wall median/max 为 `405.55s / 562.46s`，RSS median/max 为
  `1,377,386,496B / 1,477,574,656B`，均达到 `≤10min / ≤1.5GB`；相对原
  `484.72s / 3,630,317,568B`，max RSS 下降约 59.3%、wall median 下降约 16.3%。另有等价样本
  `296.88s / 1,383,710,720B`；`1152MiB` 压力跑约 192s OOM，最终使用 `1168MiB` old-space
  fail-loud 上限。原 projection/source disposition/stable source input/seal/golden 与 replay
  `0/0/0` 未改变；Codex、Kimi、GLM 已对 G8 三方 accept。
- `test:release` 继续保留完整 PAL shared/fresh 矩阵；完整 22 文件共享乱序首轮探针在
  `19m36s` 未结束而中止，因此 G7 乱序证据仍待独立顺序探针补齐。这个慢路径只属于发布/审查门，
  不应重新并入每次小功能的 fast 反馈回路。
- 在正式 `release-pal-shared` 配置下定向回归完整 `r13-enemy-audits.pal.test.ts` 为 `3/3`，
  `374.62s`、峰值 RSS `3,740,139,520B`；这证明 canary 的 source-input-only 拆分没有改变
  完整 enemy authority 发布路径，但也确认该路径仍需后续流式化/降峰。
- 增量 disposition 对应的正式 `r13-source-semantics-mg2.pal.test.ts` 此前定向回归 `11/11`，
  `401.44s / 3,415,769,088B`；最终的品牌压缩和 GC 仅在 canary gate 可用，普通 release/shared
  fail-close 且不改写输入。G7 完整 shared 顺序证据与 G1 逐项迁移映射仍未闭合。

结论：81,674-site 冷构建的“每次开发都付费”已从默认门移除，source-backed canary 的 G8
时间/RSS 门槛也已达到；完整 shared 乱序探针与旧断言逐项迁移映射仍是显式技术债，后续不得以
跳过、放宽断言或跨命令缓存假装收口。

##### R13-6A implementation review 签字

| Agent | 结论 | 日期 | 重点 |
|---|---|---|---|
| Codex | **accept** | 2026-08-03 | 独立复核当前候选：`pnpm --filter @type-pal/migrate run check:fast`（typecheck + manifest 72/549，549 passed / 5 skipped）与 4 个 R13-6A 相关单元文件 92/92 全绿；content check 32/387 全绿，reforge/editor typecheck 通过。逐项核对 22 个 source sites、3 个技能 item-cost、16 场景/17 owned paths、14 palette（5 day/5 warm/4 asset-baked）及 prepared authority/historical-current profile 的 fail-closed 约束；无公共 schema/SAVE 变化，6B 仍保持设计阻塞。accept 只收口 Codex 自验，不代表 R13-6A/N3-1/C8/ED-5I done。 |
| Kimi | **accept** | 2026-08-03 | prepared trust boundary、seal/authority 防篡改、historical/current 矩阵隔离及 5750/4d4b 双身份审查通过：输入指纹全覆盖（generated.ir 独立摘要）、双常量分层钉死且混用 fail-closed（一手核对）、brand+freeze+tamper/自洽重签拒绝、current 96e67cfb…/historical d25ee2a7… 矩阵隔离不误用、352/372/373 cost.items 形状链与 +3 拆分/重算式精确、14 palette=5+5+4 无 schema 复活、施法先扣 MP 后物品门（fizzle 语义忠实）、6B 债保持 open。复跑 check:fast 72/549、canary 2/2（222.71s）。记录项 3 条见交接。accept 仅准入 R13-6B 设计评审，不标 R13-6A/N3-1/C8/ED-5I done。 |
| GLM | **accept** | 2026-08-03 | 一手核实全绿。**3 skill item-cost**：源 all.json 三尸咒(352)/万蛊蚀天(372)/毒吞天下(373) scriptOnUse 各有 `0x20[148,1,43058]`=remove item 148(蛊)×1 不够跳失败；与 `r13-existing-schema-augmentation.ts:46-48` oracle `cost.items=[{itemId:'148',amount:1}]` 精确一致（sdlpal 0x20 = RemoveItem with check+jump）。**14 palette**：pal-palette-sites.ts 逐条数 14 = 5 day(palette 0: 21982/21990/23975/28850/30645) + 5 warm(palette 5: 22223/22275/24710/28624/30589) + 4 asset-baked(palette 2/6 + 恢复: 22109/22115→pal.003, 32055/32062→pal.007)，与任务卡完全一致；palette 2/6 烘进 RGBA 不发 setAmbience。**6A 无独立 seal/baseline**（既有 schema 子批，不改产物/contentVersion/SAVE），source-backed 证明由 canary 承担。**canary 2/2 全绿**（266s）：producer rebuild matches exact R13-6A golden + replays to identical seal and zero writes；22-site/3-skill observation delta 与 R13-5 parent 215/197 隔离由 golden 命中证明。**check:fast 549 passed/5 skipped**（72 files, 43s）全绿。**6B open 债仍明确 draft blocked**：7 shake/酒神 MP×8/303-305 分支/0x76 黑屏/loadScene 时序五项（:6780-6784）三方 pending，6A 未吞。accept 只收口 R13-6A source disposition + existing-schema 子批，不代表 6B/R13-Z/N3-1/C8/ED-5I done。 |

三方 implementation review `accept` 已于 2026-08-03 集齐；这只关闭候选实现审查，
不等于正式产物已经发布。当前 `projects/pal` 仍是 R13-5 parent：三项蛊术尚无
`cost.items`，baseline 尚无 `r13-source-semantics-v1` seal。R13-6A 必须完成正式
publication（17 个 owned 写入、append-only seal、随后 replay `0/0/0`）并记录磁盘证据后
才能标记 done；在此之前不得启动需要新公共 schema 的 R13-6B 实现。

**Codex 收敛说明（2026-08-03）**：GLM 交接中的“6A 无独立 seal/baseline”与已审代码、
canary 及 Kimi 一手记录冲突。仓库真值是 `r13-source-semantics-mg2.ts` 已定义独立
`r13-source-semantics-v1` append-only transition，canary 也明确断言 initialize 17 writes、
seal 仅进入 nextBaseline、replay 零写；当前缺的是把该已审 transition 接入正式 CLI 并发布，
不是取消 seal。保留 GLM 原文作为历史审查记录，本说明只收敛 publication 边界。

- 2026-08-03 Kimi：完成 R13-6A prepared trust boundary / runtime 边界只读实现审查，签
  **accept**。一手证据：
  - **双身份**：`R13_ENEMY_SCRIPT_SUCCESSOR_CONTENT_DIGEST=5750ac4f…`
    （r13-enemy-script-augmentation.ts:29-30）与
    `R13_EXISTING_SCHEMA_PARENT_CONTENT_DIGEST=4d4bcbdb…`
    （r13-existing-schema-augmentation.ts:22-23）为两层独立常量；ledger 强制
    `generatedSnapshotDigest===5750ac4f…` 否则抛"successor 漂移"
    （r13-source-semantics-mg2.ts:1408-1412）——混用 fail-closed，一手核对成立。
  - **prepared 边界**：输入指纹覆盖 historical/current roots/commands/migration/audit/
    generated snapshot+IR（独立摘要）/ledger/parent disposition/enemy closure/census；
    brand+深冻结+tamper 测试（sourceControl.reportDigest 重签仍拒、自洽重签拒）。
  - **矩阵隔离**：current 允许 scene-entry wait（`96e67cfb…`）vs historical 拒绝
    （`d25ee2a7…`）双向错 profile 抛错；R13-confirm/R13-5 不误用 current 矩阵；作者
    target 独立按 current 矩阵验证；confirm seal `89092578…` pin 在案。
  - **22 site + 3 item-cost**：352/372/373 的 `0x68→0x20` 形状链（不按 id 硬编码）→
    `cost.items=[{148,1}]`（migrate-content.test.ts:371-394 钉）；+3 拆分（lossy open +
    cost accounted）与 `parent + successorOwnedSource - parentOwnedSource + 3` 重算式
    逐字一致；augmentSkillCosts 防洗钱（parent 必无 items、仅 3 id 变化）。
  - **14 palette**：5 day + 5 warm + 4 asset-baked 站点 oracle 精确；无 palette schema/
    全局状态复活（setAmbience by-id、paletteId 已退役）。
  - **施法顺序**：先扣 MP（battle-core.ts:997）后物品门（:1001-1030），不足则 fizzled
    （MP 已耗、物品未动、无效果/动画/隐藏成长），库存 writeBackInventory 胜/败/逃回写；
    对一阶段 magic.ts:254-272 真值一致。
  - **复跑**：`check:fast` **72 files / 549 passed / 5 skipped**（与 Codex 记录一致）；
    `test:canary` **2/2 绿，222.71s**。
  记录项（非反例）：①卡内"parent/enemy source report 复用时重新执行自身 digest/结构
  断言"措辞略强于实现——实现是 brand+深冻结+digest 钉的刻意 O(1)（该模型本身已过 G8
  三方审查，认可）；②"open observation 净变化为零"无局部等式断言，由重算式 + golden
  传递钉住，残余风险低；③`projects/pal/content/skills.json` 当前三条蛊术仍无
  cost.items——6A 未发布的预期状态（baseline 无 r13-source-semantics seal），非遗漏，
  发布时 17 个 owned 写入将落盘。未修改实现/产物/seal/其他签字。
  Next：GLM 数据守恒审查；两席 accept 后 R13-6A 方可标 done 并进入 R13-6B 设计评审。

**2026-08-03 Codex 自验补记**：本轮没有修改实现/生成产物，工作树保持干净；复核范围覆盖
R13-6A source disposition、existing-schema augmentation、runtime capability V2/V3、palette
site oracle、技能 item-cost 迁移和性能分层后的 fast 门。现有 source-backed PAL 冷门证据仍以
上方 `11/11` 与 `0/0/0` 记录为准，未用 fast 门替代冷门。下一步交 Kimi 做架构/信任边界审查，
交 GLM 做数据守恒/测试矩阵审查；两席未 `accept` 前不得改 6A 状态、启动 6B 或标 N3-1 done。

#### 给 GLM（R13-6A source disposition / 覆盖矩阵实现审查）——待执行

#### 给 Kimi（R13-6A prepared authority / runtime 边界实现审查）——已于 2026-08-03 执行，签 accept（保留备查，勿再执行）

```text
审查任务：N3-1 R13-6A 既有 schema 技能/palette 源语义闭包
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：N3-1 总体 build；R13-6A implementation review，Codex=accept，Kimi/GLM=pending。
你的职责：只读架构/runtime/MG2 主审，不修改实现、生成产物、baseline、seal 或其他签字。

先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；本卡 R13-6A 源账、implementation
candidate、性能边界与本签字区；packages/migrate/src/experimental/script-v5/
{r13-source-semantics-mg2,r13-existing-schema-augmentation,r13-source-semantics-canary,
runtime-capability-audit,runtime-capability-audit-v3}.ts；packages/migrate/src/{pal-migration,
translate-events,pal-palette-sites}.ts。

必须独立核对：
1. prepared authority 是否绑定 historical/current 两个 source identity，拒绝同一对象替换、
   内容漂移、自洽重签和 successor 5750ac4f…/parent 4d4bcbdb… 身份混用；
2. R13-6A 22 source sites、3 item-cost 的 existing-schema augmentation 与 14 palette
   day/warm/asset-baked 处理是否 fail-closed，且不复活 palette schema/全局状态；
3. historical-r13-4 / current-r13-6a runtime profile 是否隔离，R13-5/R13-6A replay 与
   current target 的 capability audit 是否使用正确矩阵；
4. append-only baseline/seal、作者 target 三方合并、旧 control byte-pin 和 0/0/0 replay 是否
   没有把 fast/canary 证据冒充 release 冷门；
5. 独立运行可承受的 unit/fast 门；如能运行 release-pal-shared，记录 11/11 与 wall/RSS。

输出：在本卡“R13-6A implementation review 签字”Kimi 行签 accept，或写 counter（精确
file:line、复现命令、最小返工）；只写自己的交接记录，不标 R13-6A/N3-1/C8/ED-5I done。
```

#### 给 GLM（R13-6A source disposition / 覆盖矩阵实现审查）——已于 2026-08-03 执行，签 accept（保留备查，勿再执行）

```text
审查任务：N3-1 R13-6A 技能/palette 数据守恒、MG2 与测试矩阵
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：N3-1 总体 build；R13-6A implementation review，Codex=accept，Kimi/GLM=pending。
你的职责：只读数据/迁移/测试主审，不修改实现、生成产物、baseline、seal 或其他签字。

先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；本卡 R13-6A 当前源账与签字区；
docs/ops/tasks/OPS-TST-PERF-test-fixture-stratification.md；packages/migrate/src/experimental/
script-v5/{r13-source-semantics-mg2,r13-existing-schema-augmentation,source-instruction-
disposition,r13-source-semantics-canary}.ts；packages/migrate/src/{pal-palette-sites,
migrate-content,translate-events}.ts；projects/pal/content/ambiences.json。

必须独立核对：
1. 22 site / 3 skill-cost / 16 scene / 17 changed-file cardinality，source address/context/hash
   与 final command closure 是否逐项守恒；352/372/373 的 item 148 成本是否仅由源链生成；
2. 14 palette 是否精确为 5 day + 5 warm + 4 asset-baked，palette index 漂移和未知地址是否
   fail-loud，6B 的 7 shake/4 lossy/0x76/loadScene 债务是否仍明确 open；
3. raw/augmented/final observation delta、R13-5 parent 215/197 隔离、owned observation
   +3 拆分与 orphan/cardinality/layer validator 是否成立；
4. MG2 initialize 17 writes、append-only seal、历史 control byte-pin、作者改动保护与 replay
   0/0/0 是否完整；不得把“final 有技能”当成源语义闭合；
5. 独立运行 `pnpm --filter @type-pal/migrate run check:fast` 或定向 PAL 门并记录实际数字，
   不以提高 timeout/跳过 source-backed 证明代替覆盖。

输出：在本卡“R13-6A implementation review 签字”GLM 行签 accept，或写 counter（精确
数字/selector/digest/测试与最小返工）；只写自己的交接记录，不标 R13-6A/N3-1/C8/ED-5I done。
```

- 2026-08-03 GLM：完成 R13-6A source disposition / 覆盖矩阵 implementation review，签
  **accept**。一手核实（源数据 + final oracle + canary 实跑，非 Codex 清单复述）：
  - **3 skill item-cost**：源 all.json 三尸咒(spell 352)/万蛊蚀天(372)/毒吞天下(373)
    scriptOnUse 各有 `0x20[148,1,43058]` = sdlpal RemoveItem(item 148 蛊 ×1, 不够跳失败)；
    与 `r13-existing-schema-augmentation.ts:46-48` oracle `cost.items=[{itemId:'148',
    amount:1}]` 精确一致。任务卡措辞「0x68→0x20 链」略不精确(实际只有 0x20 带
    check+jump,无独立 0x68),但语义结论正确。
  - **14 palette**：pal-palette-sites.ts 逐条核实 14 站 = 5 day(palette 0: 21982/21990/
    23975/28850/30645) + 5 warm(palette 5: 22223/22275/24710/28624/30589) + 4 asset-baked
    (palette 2/6+恢复: 22109/22115→frame-animation.pal.003, 32055/32062→
    frame-animation.pal.007)。palette 2/6 已烘进 RGBA 不发 setAmbience。
  - **6A 无独立 seal/baseline**（既有 schema 子批，不改产物/contentVersion/SAVE/manifest）；
    source-backed 证明由 canary 承担。canary 2/2 全绿（266s）：producer rebuild matches
    exact R13-6A golden + replays to identical seal and zero writes；22-site/3-skill
    observation delta 与 R13-5 parent 215/197 隔离由 golden 精确命中证明。
  - **check:fast** 549 passed / 5 skipped（72 files, 43s）全绿；与 Codex 自验 72/549 一致。
  - **6B open 债仍明确** draft blocked（:6780-6784）：7 shake / 酒神 MP×8+清 MP+酒门禁 /
    303-305 玩家敌人不同 effect chain / 0x76 持续黑屏 transient / loadScene 时序五项，
    三方均 pending，6A 未静默吞掉。

  未修改实现/产物/baseline/seal/Kimi 签字；仅更新本表 GLM 行与本交接记录。
  accept 只收口 R13-6A source disposition + existing-schema 子批。

##### R13-6A formal publication closure（2026-08-03）

三方 implementation review `accept` 已齐，本批已由上游迁移 CLI 正式落盘；以下是磁盘上的
可复核证据，覆盖初始化写入、append-only transition、跨进程重放和快速门禁：

- 正式命令：`pnpm --filter @type-pal/migrate run migrate:content -- --write`；transaction
  `36` operations，initialize `writes=17 / deletes=0 / conflicts=0`。17 个 owned paths
  为 16 个场景文件加 `content/skills.json`，3 个技能（352/372/373）各生成
  `cost.items=[{itemId:"148",amount:1}]`，22 个 source sites、3 个 skill costs、16 个
  changed scenes 与 14 个 palette site 的 cardinality 保持不变。
- 新增 baseline transition：`r13-source-semantics-v1`，父 transition 为
  `r13-enemy-script-v1`；baseline `_state.json` 记录 `managedFiles=544` 和 seal
  `0d52087bfcd78265b01d8eee94a4ca5f089a709ebb76934c30845061e9e52567`。source report digest
  为 `ea30a4a869269fdf8f6f474a0dad3b68d639424681339ee5d70929e15e105b09`，successor content
  digest 为 `d7defbb2b4416c915ebcf0f3b18120a8ae83cba011721248f921d1f1d808b654`。
- 新开独立 Node 进程执行 replay：`writes=0 / deletes=0 / conflicts=0`，source/runtime/seal
  分别稳定为 `ea30a4a869269fdf8f6f474a0dad3b68d639424681339ee5d70929e15e105b09`、
  `48234f8e06d5db3ca741d63035428aa80735ea9c28f9c44f37f8bad71e1a0600`、
  `0d52087bfcd78265b01d8eee94a4ca5f089a709ebb76934c30845061e9e52567`；随后 dry-run 仍为
  严格 `0/0/0`。这证明正式发布不会重复写入，也没有把 canary-only 证据冒充生产发布。
- 回归门禁：`pnpm --filter @type-pal/migrate run check:fast` 通过，`72 files / 549 passed /
  5 skipped`，墙钟 `33.48s`；source-backed canary 独立进程 `2/2` 通过，墙钟 `437.18s`。
  canary 较历史样本更慢的原因是同时有另一工作区的 VitePress 构建占用约 219% CPU；本
  canary worker 自身约 76% CPU、1.3% 内存，未发现死锁或异常增长。
- 代码与生成物均来自迁移器：未手改 `projects/pal`，未改变公共 schema、`contentVersion` 或
  `SAVE_VERSION`。R13-6A 现可标记完成；R13-6B 仍为 `draft / blocked`，不得因本次发布绕过
  设计三签。

本次发布后 N3-1 的下一步是 R13-6B 最小 schema / transient presentation 设计，不是直接实现。
下一位 Agent 提示词（可直接复制）：

```text
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md；N3-1 总体仍 build，R13-6A
已完成正式 publication，R13-6B 仍 draft/blocked。你负责只读产出 R13-6B 最小设计与风险清单，
不得修改实现/生成物/schema/contentVersion/SAVE_VERSION。先读 AGENTS.md、CLAUDE.md、
docs/phase2/READ-FIRST.md、phase1 game-mechanics 真值、本卡 R13-6B 五项 open debt 与 R13-6A
formal publication closure。必须分别冻结：7 项前置震屏、酒神扣 MP 后读取剩余 MP×8/清 MP 与
酒门禁、303/304/305 玩家/敌人 effect chain、0x76 持续黑屏 transient 及 reveal/abort 边界、
loadScene 源时序。输出最小公共 schema/runtime/editor 变更面、是否进入 SAVE、迁移/回滚策略、
测试矩阵和 fail-closed 条件，并在本卡 R13-6B draft->build 设计签字区给 Codex/Kimi/GLM
签 `agree` 或写 `counter`。三签前不得开始实现、不得标记 done。
```

##### R13-6B：公共 schema / 表现状态 delta（build allowed）

以下能力现模型不能无损表达；最小设计已完成并取得 Codex / Kimi / GLM 三方 `agree`，现准入
build。实现仍不得扩大到下列边界之外，也不得在未完成 migration/schema/replay 证据前标记 done：

1. 7 技能“效果动画前震屏”，不可复用末尾 `animation.shake`；
2. 酒神的“扣常规 MP 后读取剩余 MP ×8、清 MP”动态效果与酒门禁；
3. 303 / 304 / 305 玩家和敌人使用时不同的 effect chain；
4. `0x76` 持续黑屏的显式 transient 状态，以及它与 reveal / abort / loadScene 的边界；
5. `loadScene` 是否保留源时序或由用户明确批准统一现代过渡。

预计该子批会触碰 content 公共 schema、Reforge battle/runtime、Editor 和 contentVersion，
但只要黑屏状态不进入存档就不应升级 SAVE_VERSION；若设计要求序列化该状态，必须重新列为
SAVE delta 审查，不能顺手带入。

##### R13-6B 最小设计草案（2026-08-03，draft；三方设计签字前不得实现）

本节是设计候选，不是实现承诺。它把五项 open debt 压到最小的公共模型变化；任何一项若被
Kimi/GLM 证明与一阶段真值不符，必须在本节写 `counter` 后返工，不能直接改代码“试试看”。

**设计锚点**：一阶段演出/资源真值见 `docs/phase1/game-mechanics.md` 与
`docs/phase2/foundation/phase1-knowledge-harvest.md:389,418,481,503`；当前模型和消费点见
`packages/content/src/skill.ts:6-12,80-115`、`packages/content/src/script.ts:59-80`、
`packages/reforge/src/battle/battle-core.ts:970-1060,2057-2130`、
`packages/reforge/src/main.ts:1517-1609`、`packages/reforge/src/screen-fx.ts:90-104`。

###### 1. 技能执行分支：把“谁施放”从技能效果里显式化

不复制技能资源，也不把 PAL magic/object id 重新暴露给作者；在现有 `SkillData` 上增加一个
可选的 `execution` 覆写块，顶层 `cost/target/effects/animation` 仍是未分叉技能的共同默认值：

```ts
interface SkillExecutionOverride {
  effects?: SkillEffect[]           // 有值时替换共同 effects，顺序即执行顺序
  animation?: SkillAnimation        // 有值时替换共同 animation
  prepare?: SkillPrepareEffect[]    // 资源扣除后的 transient 前置准备
}

interface SkillPrepareEffect {
  kind: 'remainingResourceDamage'
  resource: 'mp'
  multiplier: number                // 370 = 8
  consume: 'all'
}

interface SkillData {
  // 现有字段保持；新增字段不进入世界态/存档
  execution?: {
    player?: SkillExecutionOverride
    enemy?: SkillExecutionOverride
  }
}
```

约束：

- `execution` 缺席时，player/enemy 都使用现有共同链，旧内容字节语义不变；出现分支时，
  只允许明确的 `player`/`enemy` 覆写，不允许按“敌人有/没有某字段”隐式猜测另一侧。
- `effects` 仍是有序、门失败截断的 gameplay 链；`prepare` 只计算/消费 transient 资源，
  不直接绕过效果链。`remainingResourceDamage` 必须在常规 MP 扣除后读取剩余 MP，计算
  `remaining × multiplier`，再清空 MP；缺字段、负 multiplier、重复 prepare 或非 MP 资源一律
  fail-closed。
- 303/304/305 使用 `execution.player/enemy.effects` 表达玩家/敌人不同的概率、回合数、
  魔抗门与目标变化：303/305 敌侧的 HP `-1` 必须用“直接资源变化”语义（不走魔法伤害随机数、
  元素抗性或格挡），不能把 `damage(power:1)` 当近似；304 夺魂则是独立的 `instantKill`
  即死效果，不能误套 `resourceDelta(-1)`。若现有 `SkillEffect` 没有直接资源变化形状，需
  新增一个最小 `resourceDelta` effect，并由测试钉住 clamp/日志/命中顺序。
- 370 使用已有 `cost.mp=1` 与 item 86 酒门，成功后执行 `prepare.remainingResourceDamage`
  （该 prepare 本身就是主伤害语义，`execution.player.effects` 不得再放第二份 damage）并清空
  MP；失败门沿用 6A：MP 已扣，酒不足不扣酒、不播效果、不结算成功效果。
- `execution` 只属于 content 技能定义；不进 `WorldState`、`BattleState` 持久快照或
  SAVE。若运行时需要缓存 resolved branch，必须是一次施法的局部值，不能写回技能表。

###### 2. 前置震屏：与现有末尾 `animation.shake` 分成两个时间点

现有 `SkillAnimation.shake` 继续表示特效链**末尾**震屏；新增的候选字段为
`preShake?: { frames: number; level: number }`，只用于 330/334/342/357/378/380/385，帧数
精确为 `20/20/14/24/14/14/14`，level 由源证据钉死（不在 runtime 写隐含常量）。`preShake`
不是一个先执行完再播特效的串行命令，而是挂在 OffMagic 特效起手帧、与特效 timeline 并发的
时间标记；施法时间线固定为：

```text
选择/轮到施法 → MP/物品门 → 成功才同时启动 preShake + effect animation → gameplay effects → postShake
```

资源门失败不能出现前摇；`preShake` 和 `shake` 不得合并、互相覆盖或共用一个“当前震屏”
全局门。运行时沿用 `screen-fx` 的 time-based、AbortSignal 贯穿和 `finally` 收尾约束；编辑器
预览必须能分别显示“前置震屏/特效/末尾震屏”，而不是只显示一个总帧数。

###### 3. `0x76`：显式、不可存档的黑屏保持事务

`0x76` 的源语义是 `ShowFBP`；本作四个可达站点使用 FBP `65535`（无图）退化成填黑，
持续/恢复属性来自相邻的 `0x50/0x93` hold 与 `0x51` reveal。候选公共命令不是把 `0x76`
改名成 `fade`，而是把这组已被源证据证明的配对表达成 transient 表现命令：

```ts
{ kind: 'holdScreen'; color: 'black'; token: string }
{ kind: 'revealScreen'; token: string }
```

`token` 是脚本体内稳定字符串，不是地址/IP；运行态只保存当前 presentation transaction，
不进入 `WorldState`、存档或迁移 cursor。每个 hold 必须有同 token 的 reveal，或有明确的
`loadScene`/脚本 abort finalizer；缺配对、重复 reveal、跨 token reveal 和异常退出必须
fail-closed 并记录诊断，不能静默永久黑屏，也不能自动“猜测”恢复时点。

运行时约束：hold/reveal 的 begin/end 必须是幂等的 owner transaction；`loadScene`、读档、
脚本取消和 renderer error 都走同一个 finalizer；新事务不能被旧事务的 cleanup 清掉。编辑器
预览必须渲染 hold 期间的黑屏，并在 reveal/场景切换时恢复；测试必须覆盖正常配对、abort、
二次 loadScene、旧 token cleanup 不影响新 token 四条路径。

迁移约束：每个可达 `0x76` 必须产出 source address → hold/reveal/finalizer 的 evidence；若
源没有可证明的结束点，保持 open debt，不生成一个自称“完成”的 reveal。

###### 4. `loadScene`：保留源时序的显式 profile，默认行为不变

当前 `loadScene` 没有 profile 时固定走 260ms out/in。候选新增可选 `transition`：

```ts
type SceneTransitionProfile =
  | { kind: 'modern'; outMs: 260; inMs: 260; color: 'black' }
  | { kind: 'source'; outMs: number; inMs: number; color: 'black'; evidenceId: string }

type LoadSceneCommand = { kind: 'loadScene'; scene: string; transition?: SceneTransitionProfile } & SceneSpawn
```

省略 `transition` 等价于当前 260/260，保证手写脚本和旧迁移产物兼容；迁移器只有在 source
address、相邻 fade、目标 scene 与时序都能逐项核对时才生成 `source` profile，否则保留
open/modern，不伪造数值。`evidenceId` 只连接迁移报告，不把旧 opcode/地址暴露给作者 UI。
编辑器显示“现代过渡/源时序（来自迁移证据）”，不允许显示裸地址。

推荐不升级 `SAVE_VERSION`：profile 和 hold/reveal 都是 content/transient；`contentVersion`
若 validator/loader 的公共 schema 发生变化则升到下一版，由单独 migration transition 处理，
但不得把屏幕保持状态写入存档。若审查认为需要持久化中断后的 hold，必须拆成新的 SAVE 高风险
任务重新三签，不能在 R13-6B 顺手加入。

###### 5. 五项债务的迁移、回滚和验证矩阵

| 债务 | 迁移写入 | 回滚条件 | 最小验证 |
|---|---|---|---|
| 7 项前置震屏 | 仅 7 个精确 skill id 写 `animation.preShake` | 帧数/level/source hash 任一不符则 0 写入 | 7 条成功/失败门、前/后 shake 顺序、预览时间线 |
| 酒神 370 | `execution.player.prepare` + item 86 门禁证据 | 公式或清 MP 时点不符则保留 open | MP=1/满/不足、酒足/不足、敌方误用、成功成长 |
| 303/304/305 | player/enemy 分支 effects；303/305 直接 HP delta，304 独立即死 effect | 任一 side branch 缺源链或概率/回合不符则拒绝发布 | 6 个 side matrix、魔抗门、HP -1、即死、失败截断 |
| 0x76 | hold/reveal + token evidence | orphan/跨 token/无终点则不生成 successor | 配对、abort、二次切场、旧 cleanup 隔离 |
| loadScene | source transition profile（仅证据充分的站点） | source 时序证据不完整则保留 modern/open | 260/260 兼容、source out/in、entry fade、abort |

所有迁移均要求：source census、canonical target、作者改动保护、append-only transition、
新进程 replay `0/0/0`；失败时回滚整个 transition，不允许写半个技能分支或半个黑屏事务。
R13-6B 的 fast 门只跑合成/定向 unit，source-backed PAL 冷门只保留一个 initialize canary；
release 门仍需真实磁盘 baseline、seal 和完整 replay，禁止以提高 timeout 或跳过冷门替代证明。

##### R13-6B `draft -> build` 设计推进签字

| Agent | 签字 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **agree** | 2026-08-03 | Kimi/GLM 均已完成只读设计审查并签 `agree`；已吸收 Kimi P1-P6 与 GLM G1：preShake 与 OffMagic 起手帧并发，370 prepare 不得重复结算，303/305 敌侧才是 HP-1，304 为独立即死，0x76 的黑屏持续性来自相邻 hold/reveal。设计门禁通过，准入 build；实现仍须按风险钉逐项自验。 |
| Kimi | **agree** | 2026-08-03 | 架构/battle timing/transient presentation 主审通过：execution 显式分叉（缺席字节语义不变）+ remainingResourceDamage 与 0x57 真值吻合、preShake 与末尾 shake 分时间点、hold/reveal token 事务不可存档且 finalizer 单源、loadScene profile 默认 260/260 字节兼容、无 SAVE bump、content11 独立 transition。附 P1-P6 风险钉（见「Kimi R13-6B 设计主审」），其中 P1（preShake 并发于特效起手帧而非串行先于特效）为实现语义必落钉。 |
| GLM | **agree** | 2026-08-03 | 一手源数据核实（all.json + spells + items + magic + sdlpal script.c/fight.c）。**7 preShake**：330/334/342/357/378/380/385 逐条匹配源 0x35 ShakeScreen 帧数 20/20/14/24/14/14/14 ✅。**酒神 370**：item 86(酒)+ 0x57 默认乘 8 读余 MP×8+清 MP+0x20 酒门失败(MP 已扣不播效果)全闭合 ✅。**0x76**：4 site(2901/3051/4729/28095)全有 hold(0x50/0x93)+reveal(0x51)配对 ✅。**版本边界**：SAVE_VERSION=8 不变、CONTENT_VERSION=10 视 schema 改动升级，与设计一致。**附 G1 风险钉（实现期核对，非 blocker）**：设计草案把 304(夺魂)与 303/305 并列为「HP -1 直接资源变化」，但源数据 304 是即死(0x5F killPlayer/0x60 killEnemy HP 直接置 0)，**不是 HP -1**；只有 303(回梦)/305(鬼降)敌侧是 0x1B HP-1。玩家/敌人分支(0x68)对 3 技能都成立，实现时 304 须按即死形态(独立 effect)处理，不得套 resourceDelta(-1)。另：script-census.md:83 把 0x5F 误标 jumpIfScene(实为 killPlayer)，实现若依赖该表须勘误。 |

##### R13-6B implementation evidence（2026-08-03；待 review）

本轮已按上述三方设计签字进入 build，仍保持 N3-1 `build`，未将 R13-6B 或下游 C8/ED-5I 标记完成。

- **Content/schema**：发布 `contentVersion=11`（SAVE_VERSION/minimumSaveVersion 仍为 8）；新增
  `SkillData.execution.player/enemy`、`SkillPrepareEffect.remainingResourceDamage`、
  `resourceDelta`、7 个 `animation.preShake`；新增 hold/reveal 与 `SceneTransitionProfile` 的
  validator、v10→v11 工程/内容升级链。
- **Reforge/editor**：battle 按施法者解析分支，370 先过 MP/酒门再按剩余 MP×8 清 MP，303/305
  敌侧直接 HP-1，304 使用独立即死；preShake 与 OffMagic 起手帧并发；hold/reveal 由单一
  screen transaction/finalizer 管理；编辑器支持玩家/敌人分支、prepare、前置震屏与 loadScene
  profile，且不把 transient presentation 写入存档。
- **Migration**：上游迁移器先生成并校验 canonical，再写 PAL；4 组 0x76 hold/reveal 配对、
  `loadScene` source profile `applied=860 / already=11 / skipped=0`（总计 871 条证据命中），
  技能/场景覆盖均通过 validator。R13-6B successor 修复了一个门禁缺陷：生成 baseline 时保留
  已发布 v2 `_state` 的 generator epoch/transition ledger，不再降回 v1；oracle 与后续链因此
  仍 fail-closed。
- **发布与幂等**：正式写盘后回放为 `applied=0 / already=871 / skipped=0`，二次计划
  `writes=0 / deletes=0 / conflicts=0`；PAL project/baseline 同一迁移事务更新，未写入源 chunk
  作为 canonical 文件。

自验结果（首次实现）：content **33 files / 391 tests**；reforge **77 / 777**；migrate **75 / 557（5 skipped）**；
editor **93 / 793**；migrate/content/editor typecheck 通过；`git diff --check` 通过。R13-6B
implementation review 仍只登记 Codex 自验，Kimi/GLM 尚未写 `accept`；在两席签字前不得进入
`review -> done`，也不得把 N3-1、C8、ED-5I 标记完成。

##### R13-6B implementation review 签字

| Agent | 结论 | 日期 | 证据 / 备注 |
|---|---|---|---|
| Codex | **accept（返工自验）** | 2026-08-03 | `fd2e4353` 已闭合 Kimi F1-F4：敌侧 70/30/50、303/305 状态 3t→HP-1、7 技能 preShake level=4、编辑器 hold/reveal 与统一 finalizer；四包门禁、正式重迁、replay `0/0/0`、canary 2/2 均通过。仅代表 Coding Owner 自验。 |
| Kimi | **accept（返工复审）** | 2026-08-03 | `fd2e4353` 返工闭合 F1-F4：敌侧 303=70/304=30/305=50 一手核对迁移源与产物；303=sleep(3t)+HP-1、305=confused(3t)+HP-1、304=instantKill；7 preShake 全部 level=4 且帧数不变；编辑器 playback hold/reveal 真实黑幕、token 不匹配拒绝、loadScene/abort 统一 finalizer（测试 11/11）；dry-run `writes=0/deletes=0/conflicts=0`（exit 0，plan 复跑 applied=0/already=871/skipped=0 与 GLM 互证）。accept 仅代表 R13-6B implementation 复审通过，不标 R13-6B/N3-1/C8/ED-5I done。 |
| GLM | **accept** | 2026-08-03 | counter 返工闭合（`46fad115`）：Codex 不重冻 P0 digest，改为隔离 6B——默认 `buildPalMigration` 固定 `current-r13-6a` profile，只显式传 `r13SixBSourceSemantics` 才启用 6B；canary 回放前对 content11 做 fail-closed 6B→6A rewind（逐文件 COW）。一手复跑：**canary 2/2 全绿**（267s，P2 frozen digest 仍 `dd42217c…` 未重冻）；**fast 558/5 skip**（75 files, 20s）；**dry-run writes=0/deletes=0/conflicts=0**。数据层（上轮已核：7 preShake/370/303-305 G1 落实/content11/SAVE8）无反例。accept 只收口 R13-6B implementation，不代表 R13-Z/N3-1/C8/ED-5I done。 |

- 2026-08-03 Kimi：完成 R13-6B implementation review 架构/runtime/editor 只读审查，签
  **counter**（四项，全部一手复现）。通过项先行记录：execution/schema/v10→v11 升级、
  370 酒神防双结算、hold/reveal 运行时 finalizer 单源、loadScene profile 四项证据门槛、
  content11/SAVE8 边界、baseline v2 ledger 保留、source chunk 不冒充 canonical、复跑
  reforge/content check 全绿——均成立，返工后无需复审。
  **反例与最小返工**：
  - **F1 敌侧 gate 概率错用玩家值**。实现 `packages/migrate/src/pal-authored-overlays.ts:32-56`
    为 303→chance 60、304→33、305→44（玩家侧操作数）；产物
    `projects/pal/content/skills.json` 同值，测试同值钉死。一手源核对
    （data/extracted/events/all.json）：303 敌支 @43089 `0x06 [70,43072]`、305 敌支
    @43096 `0x06 [50,43072]`、304 敌支 @43123 `0x06 [30,43072]`。返工：迁移器敌侧按
    敌支操作数 70/50/30（或按 0x06 规范化 69/49/29，与既有 0x06 边界的确定口径一致，
    请 GLM 数据侧定）生成，禁止抄玩家值；修正后重迁，不手改产物。
  - **F2 303/305 敌链缺 0x2D 状态步（核心语义丢失；设计冻结同漏，需三方复核）**。
    一手源核对：303 敌支过门后 L_39391 = `0x2D [2,3,0]`（玩家 sleep 3 回合）
    → `0x1B [0,65535,0]`（HP-1）→ end；305 敌支 L_39398 = `0x2D [0,3,0]`（confused
    3 回合）→ `0x1B [0,65535,0]` → end。当前实现敌支仅 `gate + resourceDelta(-1)`——
    回梦/鬼降的**上状态本身就是技能本体**，缺状态步等于语义丢失。冻结矩阵原文"任一
    side branch 缺源链或概率/回合不符则拒绝发布"，且设计冻结与 GLM G1 均未列 0x2D——
    须先在本卡 R13-6B 设计节补记敌链 `gate → applyStatus(sleep/confused,3) →
    resourceDelta(-1)` 的三方口径，再按此迁移；不得由实现方擅自维持现状。
  - **F3 preShake level 应为 4 非 3**。实现 `pal-authored-overlays.ts:19-25` 全部
    `level: 3`。一手源核对：7 条 scriptOnUse 的 0x35 operands 全为 `[frames,0,0]`
    （@43107=24/@43109=20/@43111=14，帧数全对），script.c:1525-1529
    `i=operand[1]; if(i==0) i=4`——level 默认 4。level 3 疑似从末尾震屏常量
    （fight.c:2718 `VIDEO_ShakeScreen(i,3)`）误抄。返工：7 技能 preShake level 改 4。
  - **F4 编辑器预览未实现 hold/reveal（冻结条款直接漏项）**。编辑器 UI 有展示
    （CommandForm.tsx:422/433、ScriptTree.tsx:124/126、CanonicalScriptEditorV5.tsx:472/492），
    但预览宿主未实现：`packages/reforge/src/script-host-adapter-v5.ts:308` 与
    `script-runner.ts:478` 对无宿主直接 throw「宿主未实现 holdScreen」；editor
    playback.ts 无 holdScreen/revealScreen handler——s003/s020/s174 等含黑屏事务的
    flow 预览必中断。冻结原文要求"编辑器预览必须渲染 hold 期间的黑屏，并在 reveal/
    场景切换时恢复"。返工：在 editor playback host 实现 hold/reveal（可复用
    playback.ts:563-573 的 view.fadeBlack 幕布通道），abort/loadScene/卸载走同一
    finalizer。
  - **F5（GLM 发现，本席复核机制成立）**：6B 给 loadScene 注入 `__palSourceAddress`
    （translate-events.ts:1174）+ foldDoorPattern 吸收 fade 改变了 P2 翻译输出 →
    P2 audit digest 由 `dd42217c…`（p2-transform.ts:31 冻结）漂移为 `7026f9a5…`，
    canary frozen P0 校验失败。返工：证明漂移仅来自 6B 预期改动（逐条 diff P2 输出
    证明无语义破坏）后重冻 P0，或把 `__palSourceAddress` 移出 P2 翻译路径（如改在
    P6/canonical 投影期注入），保持 frozen P0 不变。**本席复跑 canary 实测 2/2 绿
    （265.81s）**——因工作树已含 Codex 未提交返工（`__palSourceAddress` 已改为
    6B 路径条件注入、execution overlay 已加 `r13SixBExecution` 门控），即 F5 正被
    修复中；该结果不等于 F1-F4 已修：同一份未提交返工里 gate 仍为 60/33/44、303/305
    仍无 applyStatus、preShake level 仍为 3、editor playback 仍无 hold/reveal。
  复现命令：`python3` 读取 `data/extracted/events/all.json` 按上述 label 逐项核对
  （@43089/@43096/@43123、L_39391/L_39398、@43107/@43109/@43111）。
  任务转 rework；F1-F3 修上游迁移并重迁、F4 修编辑器、F5 定 drift 口径后，本席按
  diff 复审并改签。
- 2026-08-03 Kimi：对 `fd2e4353` counter 返工只读复审，改签 **accept（返工复审）**。
  历史 counter 按事实保留。五项逐点一手核实：
  1. **敌侧概率**：迁移源 `pal-authored-overlays.ts` 与产物 `projects/pal/content/skills.json`
     均为 303=`gate chance 70`、304=`gate chance 30`、305=`gate chance 50`，与源操作数
     @43089/@43123/@43096 逐项一致（F1 闭合）。
  2. **敌链语义**：303=`gate 70 → applyStatus(sleep,3) → resourceDelta(-1)`、305=
     `gate 50 → applyStatus(confused,3) → resourceDelta(-1)`、304=`gate 30 → instantKill`，
     与源链 L_39391/L_39398 的 `0x2D → 0x1B` 形态吻合（F2 闭合，且设计冻结已补三方口径）。
  3. **preShake**：迁移源与产物 7 技能全部 `level: 4`，帧数保持
     20/20/14/24/14/14/14（F3 闭合）。
  4. **编辑器 hold/reveal**：playback.ts:620-638 实现 holdScreen（abort 检查、
     `view.fadeBlack=1` 真实黑幕）与 revealScreen（token 不匹配 reject、260ms 淡入恢复）；
     `finalizeScreenHold`（:507-520）在 stop(:250)、scene entry(:408)、命令循环(:520)统一
     收尾；loadScene(:671-674) 先 finalize 再切场景；playback.test.ts 新增配对/错 token/
     恢复用例 **11/11 绿**（F4 闭合）。
  5. **迁移幂等**：`migrate-content.mts` dry-run 实测 **exit 0、
     `writes=0 deletes=0 conflicts=0`、generated=0 kept=9 merged=0**；applied=0/
     already=871/skipped=0 与 GLM 复跑互证。
  F5 已由 `46fad115`（6B profile 隔离 + canary 回放前 6B→6A rewind）闭合，GLM 已
  accept；本席此前 canary 2/2 复跑（265.81s）与该路径一致。未修改实现/产物/其他签字。
  本 accept 仅代表 R13-6B implementation 复审通过，**不代表** R13-6B/R13-Z/N3-1/C8/
  ED-5I 完成。

R13-6B implementation review 三席 `accept` 已齐（Codex 自验、Kimi 返工复审、GLM F5 复审）。
该子批门禁关闭；N3-1 总体继续保持 `build`，下一步进入下方既有设计中的 **R13-Z 发布闭包**。
R13-Z 完成前不得推进 N3-1 `review -> done`，也不得提前验收 C8/ED-5I。

##### R13-Z preflight：历史发布夹具回建与共享发布门（2026-08-03，进行中）

本轮先处理发布门在 `content11 / R13-6B` 正式产物上污染历史 P2–R13-5 初始化夹具的问题。此前
历史测试把最新 successor 当作旧 parent，导致 P2/P3/P4 determinism core、R13-4/5 authority
digest 与 MG2 写集同时漂移；这不是生产迁移语义失败，而是测试夹具没有按发布链回到精确 parent。

- 新增 `published-r13-source-semantics-test-fixture.ts`，按“最新发布 → R13-6B → R13-6A
  existing-schema → R13-5 parent”逐文件 COW 回建，校验 baseline/project 四态、hash、17 条
  owned paths 与作者 locale 增量；`published-r13-enemy-test-fixture.ts`、`published-v4-snapshot.ts`、
  source-semantics MG2/canary/P2–P4 shadow 均复用该链。旧 fixture 无 seal 时只允许明确的
  synthetic no-op rewind，不放宽正式发布校验。
- R13-6B 的 `current-r13-6a` authority digest 从旧值
  `8fe4ad1c6dffe273ddbdf5c06a504c34c0e06110dc9bb4696551e908c960a88a` 更新为
  `8962f4249dca34fa351c983ce75c0604b4e591b8882596fa4931ff17d3cad829`；P0 frozen digest
  `dd42217c87ece120140dd302e735460cc48b2570fd993e2c35d614bbc0303004` 未重冻、未修改。
- `r13-enemy-audits` 的深度 MG2 anti-tamper 用例只把局部 timeout 从 240s 调到 600s；没有
  调大全局 timeout、关闭断言或跳过 source-backed release。单测 1/1 通过，耗时 371.68s，
  峰值约 0.8 GiB。

验证证据：

- `release-pal-shared`：24 files / 137 tests 全部通过，1992.69s（约 33.2 分钟）；
- `release-preflight + release-unit`：71 files / 546 tests 全部通过，15.37s；
- `test:canary`：2/2，226.07s；`check:fast`：75 files / 558 passed / 5 skipped，19.46s；
- `test:oracle:verify`：2/2，0.99s；oracle 仅更新 source-tree fingerprint，未出现语义投影漂移。

性能观察仍需诚实记录：共享发布 worker 在审计阶段出现过约 2.6 GiB 的瞬时 RSS，随后回落到
约 1 GiB；本轮尚未把 81,674-site source audit 改造成可跨测试安全复用的 prepared report，
因此不能宣称 R13-Z 或测试性能债已完成。下一步是继续清点 R13-Z 的 open-debt 聚合（当前
published source transition 仍报告约 `27,804` open sites / `7,237` open observations），
并在不触碰 P0 digest 的前提下完成 runtime/save/browser/remigration gates。

只读分组（由 source-backed canary authority 重建，未写入任何产物）进一步得到：

- open sites 按批次：R13-0 `29,006`、R13-3 `320`、R13-5 `720`、R13-6 `373`；
- 主要 source-site 原因：`candidate-only-canonical-body` `18,217`、
  `unclassified-reachable-source-site` `4,825`、`candidate-only-domain-projection` `2,842`、
  `item-scriptOnUse-pending` `1,502`、`item-pending-use-without-observation-closure` `1,439`；
- 观察项按原因：`R13-0:candidate-only-domain-projection` `2,761`、
  `R13-0:unclassified-reachable-source-site` `1,679`、`R13-0:item-scriptOnUse-pending`
  `1,383`、`R13-0:candidate-only-canonical-body` `1,038`，其余为 R13-3/5/6 的 item、enemy、
  skill 与表现债。

这些 candidate/open 仍是**未落账证据**，不等同于“可安全视为已迁移”；R13-Z 的下一批实现必须
为每类补 source-root、context、canonical target 和 runtime 等价/真实替代证据，并让
`assertR13NoOpenSourceDebt` 在最终发布事务中真正通过。

##### R13-6B implementation review 交接提示词（下一位 Agent 可直接复制）

```text
复审任务：N3-1 R13-6B implementation review；任务卡 docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：N3-1 build；R13-6B 已完成实现与 Codex 自验，但不得修改实现、生成产物或签字以外的文件。
先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡 R13-6B 设计草案与 implementation evidence；
再读 packages/content/src/{skill,script,validate,skill-execution-v11-upgrade}.ts、
packages/migrate/src/{pal-r13-six-b-load-scene,pal-r13-six-b-overlays,fold-door-pattern-r13-six-b}.ts、
packages/migrate/scripts/migrate-content.mts、packages/reforge/src/{battle/battle-core,battle/battle-anim,
screen-hold-transaction,main,script-runner}.ts、packages/editor/src/ui/{SkillTab,SkillAnimationEditor,
CommandForm,ScriptTree}.tsx。
独立复跑：content 33/391；reforge 77/777；migrate 75/557（5 skipped）；editor 93/793；四包
typecheck；migrate:content dry-run 与 source profile replay；确认第二次计划严格
writes=0/deletes=0/conflicts=0。
逐项核对：7 preShake 帧数和并发起手时点；370 MP/酒门/剩余 MP×8/清 MP 且无双结算；303/305
敌侧直接 HP-1、304 独立即死；hold/reveal token 配对、abort/loadScene finalizer 与不进 SAVE；
loadScene source profile 的 evidenceId/默认 260/260；content11 与 SAVE8 边界；baseline v2
transition ledger 保留；source chunk 不冒充 canonical；编辑器分支/prepare/profile 可编辑；迁移
作者修改保护与 replay 幂等。任何反例必须写 file:line、命令、实际/期望值和最小返工，不得只写“有风险”。
输出：在本卡“R13-6B implementation review”对应席位签 `accept` 或 `counter`，附独立复跑数字；
不得标记 R13-6B/N3-1/C8/ED-5I done。两席 accept 后由 Codex 收口。
```

##### Kimi R13-6B 设计主审（2026-08-03）

**方法**：只读设计审查；对一阶段 game-mechanics / battle 真值锚（anim-timeline.ts、
magic.ts、battle-opcodes.test.ts、actions.test.ts）逐项一手核对。

**逐项结论**：

1. **execution 显式分叉** ✅：可选 execution.player/enemy 覆写 + 缺席时共享默认链（字节语义
   不变）是最小公共模型；不允许按"敌人有/没有某字段"隐式猜另一侧；remainingResourceDamage
   与 0x57 真值吻合（`baseDamage=剩余MP×(op1?op1:8)` 后清 MP，battle-opcodes.test.ts:960-971）；
   失败门语义吻合（MP 仍扣、不播动画、不跑成功结算，actions.test.ts:1795-1820）。
2. **preShake 分时间点** ✅ 方向正确，但实现语义必须按一阶段真值收敛（见 P1 钉）：0x35
   挂到 OffMagic 起手帧、与特效动画并发（anim-timeline.ts:910/:1657 注释、
   actions.test.ts:2148「斩龙诀式 0x35 振屏挂到 OffMagic 起始，不提前写全局 gs.shakeTime」），
   与末尾 shake 确实是两个时间点；失败门不出现前摇（源链在门后截断）与设计一致。
3. **hold/reveal token 事务** ✅：显式 transient 表现事务、不进 WorldState/存档/cursor；
   配对/token/重复/跨 token/异常退出 fail-closed；finalizer 单源（loadScene/读档/取消/
   renderer error 同一路径）、旧 cleanup 不清新事务——符合项目"不静默永久黑屏"铁律；
   4 个可达 0x76（全 `[0xFFFF,0,0]`）的结束点证据必须来自源（邻接 fade 链），无证据保持
   open debt 的纪律正确。
4. **loadScene transition profile** ✅：默认 modern 260/260 字节兼容；source 档只在
   address+相邻 fade+目标 scene+时序逐项核对齐时生成，不伪造数值；evidenceId 不进作者 UI。
5. **版本纪律** ✅：hold/reveal/transition 均 content/transient，不升 SAVE_VERSION；
   content schema 变化走下一未占用 contentVersion + 独立 migration transition；持久化
   hold 另开 SAVE 三签的边界正确。

**风险钉（P，build 验收核对，不阻塞 agree）**：

- **P1 preShake 时间语义必须是一阶段真值**：起点=特效起手帧、按 frames 持续并与特效
  动画并发（anim-timeline.ts:910/:1657 与 actions.test.ts:2148 为锚），不得实现成串行
  "先震完再播特效"；编辑器预览的"前置震屏/特效/末尾震屏"时间线展示也必须表达并发关系，
  不是一个总时长拼接。
- **P2 酒神防双结算**：370 的 `prepare.remainingResourceDamage` 即伤害语义
  （baseDamage=剩余MP×8），execution.player 的 effects 不得再含第二份伤害结算；
  op1 缺省倍数=8；失败门按 actions.test.ts:1795-1820 复现（MP 扣、酒不动、无动画、
  无成功结算、无隐藏成长）。
- **P3 303/304/305 直接 HP 变化**：若新增 `resourceDelta` effect，clamp/日志/命中顺序
  必须进测试；player/enemy 两侧概率、回合数、魔抗门与源链逐项对账（GLM 数据侧复核），
  不得用 damage(power:1) 近似。
- **P4 hold/reveal finalizer 单源**：loadScene/读档/脚本取消/renderer error 必须同走一个
  finalizer；新事务不能被旧事务 cleanup 清掉（四条路径进测试：正常配对、abort、二次
  loadScene、旧 token cleanup 隔离）。
- **P5 source profile 证据门槛**：source 档只在 source address + 相邻 fade + 目标 scene
  + 时序四项齐全时生成；任一缺项保留 modern/open，迁移 evidence 记录 skipped 原因。
- **P6 版本轴**：contentVersion 升到下一未占用版本（当前应为 v11）并经独立 migration
  transition 发布，A7-4 顺延 v12；hold/reveal/黑屏状态一律不写入存档或迁移 cursor。

**结论**：**agree**。五项债务的最小公共模型成立，无 schema/runtime/save 级反例。

- 2026-08-03 Kimi：完成 R13-6B 最小设计架构/runtime 主审，签 **agree**，附 P1-P6
  风险钉。一手核对：酒神 0x57 公式与失败门真值（battle-opcodes.test.ts:960-971、
  actions.test.ts:1795-1820）、0x35 震屏挂 OffMagic 起手帧真值（anim-timeline.ts:910/
  :1657、actions.test.ts:2148）。最重要钉子：preShake 必须与特效起手帧并发而非串行
  先于特效（P1）。未修改实现/产物/seal。Next：GLM 源分支/数据守恒/测试矩阵主审；
  两席 agree 前 Codex 不得实现。

#### 给 Kimi（R13-6B 最小设计架构/runtime 审查）——已于 2026-08-03 执行，签 agree（附 P1-P6，保留备查，勿再执行）

```text
审查任务：N3-1 R13-6B 最小设计；只读，不改实现、生成产物、schema、contentVersion、SAVE_VERSION。
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md

先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/phase1/game-mechanics.md、
docs/phase2/foundation/phase1-knowledge-harvest.md；本卡 R13-6A formal publication closure、
R13-6B 五项 open debt 与“R13-6B 最小设计草案”。代码锚点：
packages/content/src/{skill.ts,script.ts}；packages/reforge/src/battle/battle-core.ts、
screen-fx.ts、main.ts 的对应行。

必须反证：
1. execution.player/enemy 覆写是否能表达 303/304/305 的概率、回合、魔抗和直接 HP -1，且不把
   共同 SkillData、enemy/player runtime 或 SAVE 状态复制污染；直接 HP delta 是否需要更窄的 effect。
2. 370 是否严格满足“先扣常规 MP → 酒门 → 读取剩余 MP×8 → 清 MP → 成功效果”，失败是否保持
   6A 的 MP 已扣/酒不扣/无效果/无成长；prepare 是否会被敌方分支误用。
3. preShake 与现有末尾 animation.shake 的时间顺序、Abort/finalizer 和渲染层级是否可实现，
   是否需要把 preShake 从 SkillAnimation 拆成更小 presentation 类型。
4. holdScreen/revealScreen token 事务是否能覆盖 abort、读档、二次 loadScene 和旧 cleanup 隔离，
   且不进入 SAVE；无源终点时保持 open 的 fail-closed 条件是否足够。
5. loadScene source profile 是否应 inline 数值、稳定 profile id 或保留现代默认；contentVersion/SAVE
   边界是否正确。

输出：在本卡 R13-6B 设计推进签字 Kimi 行签 `agree`，或给出精确 counter（file:line、真值出处、
最小改动）。不得开始实现，不得标 R13-6B/N3-1/C8/ED-5I done。
```

#### 给 GLM（R13-6B 源数据/迁移/测试矩阵设计审查）——已于 2026-08-03 执行，签 agree（附 G1，保留备查，勿再执行）

```text
审查任务：N3-1 R13-6B 最小设计；只读，不改实现、生成产物、schema、contentVersion、SAVE_VERSION。
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md

先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/phase1/game-mechanics.md、
docs/phase2/foundation/phase1-knowledge-harvest.md；本卡 R13-6A publication evidence、R13-6B
源账与“最小设计草案”；源文件 data/extracted/data/object-magics.json、spells.json、events/all.json，
以及 packages/migrate/src/experimental/script-v5 下 R13 ledger/disposition/canary。

必须逐项核对：
1. 7 个 preShake skill id 与 20/20/14/24/14/14/14 帧是否逐条对应 PAL 源地址/hash，未知站点是否
   fail-loud；不得把现有末尾 shake 当成前摇。
2. 303/304/305 的 player/enemy 分支概率、回合、魔抗、HP -1 是否源链闭合；HP -1 是否不能误映射
   为普通 damage；370 的 item 86、MP×8、清 MP 时点和玩家/敌人适用侧是否闭合。
3. 0x76 每个可达站点是否有可证明 reveal/finalizer；orphan、跨 token、相邻 loadScene 的归属和
   `source` transition profile 是否能形成 source address→canonical target→digest 证据。
4. migration transition 的 cardinality、作者改动保护、半状态拒绝和 replay 0/0/0；contentVersion
   升级是否最小，SAVE_VERSION 是否保持不变且无 transient 落盘。
5. fast/release/canary 测试矩阵是否覆盖正常、失败、abort、二次 loadScene、旧 cleanup 隔离和
   玩家/敌人六个 side cases；不得以提高 timeout、跳过 PAL 或手改 projects/pal 代替。

输出：在本卡 R13-6B 设计推进签字 GLM 行签 `agree`，或给出精确 counter（数字、selector、digest、
测试与最小返工）。不得开始实现，不得标 R13-6B/N3-1/C8/ED-5I done。
```

- 2026-08-03 GLM：完成 R13-6B 源数据/迁移/测试矩阵设计审查，签 **agree**，附 G1 风险钉。
  一手源数据核实（all.json idx=地址 + spells/items/magic + sdlpal script.c/fight.c 逐 opcode 核，
  非设计草案复述）：
  - **7 preShake**（项 1）：330 炼狱真火 / 334 地裂天崩 / 342 斩龙诀 / 357 炼狱爪 / 378 火龙掌 /
    380 横扫千军 / 385 气魔焰。源 scriptOnUse 首条 = opcode **0x35 ShakeScreen**（script.c:1521），
    operands[0]=帧数。逐条核对帧数 = 20/20/14/24/14/14/14（按 330/334/342/357/378/380/385 顺序），
    **7/7 精确匹配，无错位** ✅。330/334 共享 scriptOnUse 43109、342/378/380/385 共享 43111、
    357 独占 43107（按地址共享，非每技能独立）。
  - **酒神 370**（项 3）：scriptOnUse=43075，3 条指令序列 —— `0x20[86,1,43078]` RemoveItem
    item 86（酒，items.json 确认 _name="酒" price=80）不够跳失败 / `0x57[370,0,0]` SetBaseDamageByMP
    （script.c:1848 operand[1]=0 → 默认乘 **8**，读当前 MP×8 设 baseDamage 后**清空 MP**）/ end。
    常规 costMP=1（magic.json magicNumber 75）在 fight.c:4189 先扣，0x57 读的是扣完 1 后的余 MP。
    失败门 43078 → 0x41 MarkFailed → g_fScriptSuccess=FALSE → 不播效果（MP 已扣不退）。**全闭合** ✅。
  - **0x76 黑屏**（项 4）：全文件仅 **4 site**（2901/3051/4729/28095），operands 全为 `[65535,0,0]`
    （FBP id 65535 = 无图 → WIN95 SDL_FillRect 黑）。4/4 有前置 hold（0x50 fadeOut@2900/3050/4728/28094
    或 0x93 sceneFade@3050）+ 后置 reveal（0x51 fadeIn@2902/3052/4744/28100）。**hold/reveal 配对 4/4 成立** ✅。
    措辞修正建议（非 blocker）：0x76 语义是 ShowFBP，本作因 FBP id=65535 退化为纯黑；"持续"属性来自
    配对的 0x50/0x93 设 fNeedToFadeIn，非 0x76 自身。设计功能结论正确。
  - **版本边界**：SAVE_VERSION=8 不变（profile/hold-reveal 都是 content/transient，不落存档）；
    CONTENT_VERSION=10 当前，若 validator/loader 公共 schema 变化则升 11 由独立 transition 处理。
    与设计草案一致 ✅。

  **G1 风险钉（实现期核对，非 blocker，不阻塞 agree）**：设计草案项 2 把 303/304/305 并列为
  「HP -1 必须是直接资源变化（不走魔法伤害/元素抗性/格挡）」。源数据核实：
  - **303 回梦**（scriptOnSuccess 43085）敌侧：0x06 rate70% → 0x1B[0,65535,0] HP-1 ✅（直接资源）
  - **305 鬼降**（scriptOnSuccess 43092）敌侧：0x06 rate50% → 0x1B[0,65535,0] HP-1 ✅（直接资源）
  - **304 夺魂**（scriptOnSuccess 43118）：**无 0x1B HP-1**；玩家侧 0x60 killEnemy（wHealth=0 即死）、
    敌侧 0x5F killPlayer（rgwHP=0 即死）。**304 是即死咒，不是 HP -1** ⚠️
  玩家/敌人分支（opcode 0x68 JumpIfEnemyTurn）对 3 技能都成立；6 个 side case 源链闭合。但实现时
  **304 须按即死形态（独立 kill/instantKo effect）处理，不得套 resourceDelta(-1)**。
  另：`docs/phase2/foundation/script-census.md:83` 把 0x5F 误标为 jumpIfScene（实为 killPlayer，
  script.c:1942），实现若依赖该表须勘误。

  设计方向（execution 覆写 + preShake + hold/reveal token + loadScene profile）成立，5 项 open debt
  均有源数据支撑。agree 仅准入 R13-6B build 设计，实现时须落实 G1（304 即死非 HP-1）+ Kimi P1-P6。

- 2026-08-03 GLM R13-6B implementation review：签 **counter**。数据层精确（非反例），但 canary
  真实失败。一手核实：
  - **数据层全绿**：content11/SAVE8/min8 ✅；7 preShake 逐条精确（330/334/342/357/378/380/385
    = 20/20/14/24/14/14/14 frames）✅；370 酒神 cost.mp=1+items=[{86,1}] execution.player ✅；
    **G1 完美落实**——303/305 `gate+resourceDelta hp -1`，**304 `gate+instantKill`（独立即死，
    非 resourceDelta）** ✅；check:fast 557 passed/5 skipped（75 files, 92.5s）全绿。
  - **canary 真实失败**（blocker）：`pnpm test:canary` → `P2 current audit differs from
    frozen P0: 7026f9a5d61aa1db401facb452a8049445bb59d2edb3f1ded893e6a6219723d5 !=
    dd42217c87ece120140dd302e735460cc48b2570fd993e2c35d614bbc0303004`（p2-transform.ts:146
    assertPalP0Audit）。根因：6B 提交 `b5d25b8d` 改了 `translate-events.ts`（loadScene 加
    `__palSourceAddress` 迁移期私有字段 + foldDoorPattern 吸收 fade 逻辑），改变了 P2 翻译
    输出的命令序列结构 → P2 audit digest 漂移 → canary 的 frozen P0（`PAL_P0_SCRIPT_AUDIT_DIGEST`
    = `dd42217c…`，p2-transform.ts:31）校验失败。fast 门不暴露此问题（fast 用 synthetic/oracle，
    不跑完整 P2 冷构建）；只有 canary 的 source-backed 冷构建才触发 P2 audit digest 比对。
  - **最小返工**：Codex 须二选一 —— ① 证明 P2 digest 漂移仅来自 6B 预期改动（loadScene
    `__palSourceAddress` + foldDoorPattern fade 吸收），非语义破坏，并重新冻结
    `PAL_P0_SCRIPT_AUDIT_DIGEST` 为新值 `7026f9a5…`；或 ② 如果漂移含非预期语义变化，修
    translate-events 使 P2 输出恢复稳定。修后 canary 2/2 必须全绿（producer rebuild matches
    golden + replays to identical seal and zero writes）。
  - 复现：`cd packages/migrate && pnpm test:canary`（86s 后 P2 audit assert 失败，2 tests skip）。

  counter 仅因 canary P2 audit 回归。数据层/schema/skill execution/preShake/hold-reveal 设计
  全部无反例。Codex 修 canary 后 GLM 可改签 accept。未修改实现/产物/baseline/seal/Kimi 签字。

- 2026-08-03 Codex 对 GLM counter 的返工回应：不重冻 P0/P2 digest，保留 `dd42217c…`。已完成
  三层隔离与回放修复：
  - `buildPalMigration` 默认固定 `current-r13-6a`；只有 R13-6B successor 显式传入
    `r13SixBSourceSemantics` 才启用技能 execution/preShake 与 `loadScene` 私有源地址证据；
    `foldDoorPattern` 在默认 profile 恢复 R13-6B 前的命令形状。
  - 历史 R13-5/R13-confirm capability matrix 通过具名选项排除 6B 新增的
    `holdScreen`/`revealScreen`/`resourceDelta`，历史 report digest 保持不变。
  - canary 夹具在回放 R13-6A seal 前，对已发布 content11 基线执行 fail-closed 的 6B→6A
    rewind（860 个唯一 source transition、4 组 hold/reveal、技能 overlay/order）；rewind 使用
    逐文件 copy-on-write，不再深拷贝整份 PAL baseline；真实摘要精确恢复 `d7defbb2…`
    （6A successor）与 `4d4bcbdb…`（R13-5 parent），且逐文件与 `b5d25b8d^` 的 6A baseline
    比对为 0 差异。
  - 证据：`pnpm --filter @type-pal/migrate run test:canary` **2/2 通过**；1168MiB old-space
    成功样本 280.13s，按用户 2026-08-03 裁决放宽为单 worker / 2048MiB 后为
    **256.03s、max RSS 1,583,431,680B**（约快 8.6%，仍远低于旧 3–4GB 路径）；
    `test:fast` **75 files / 558 passed / 5 skipped，22.84s**；正式 `migrate:content` dry-run
    `applied=0 / already=871 / skipped=0`，迁移 plan `writes=0 / deletes=0 / conflicts=0`；
    未修改任何 P0/P2 内容冻结 digest、baseline 正文或 projects/pal 生成产物。
  - 源树 oracle 指纹仅因实现返工按实际值更新：migrate/src **112 files / 2,461,158 bytes /
    4612623f…**；这不是内容 digest 重冻结。
  **GLM 仍为 counter，待其只读复跑并改签 `accept`；Kimi 的 F1–F4 counter 也仍未关闭，
  因此不得标记 R13-6B/N3-1/C8/ED-5I done。**
- 2026-08-03 GLM R13-6B counter 返工复审（`46fad115`）：**counter 改签 accept**。一手复跑（非
  Codex 报告复述）：
  - **canary 2/2 全绿**（267s）：producer rebuild matches exact R13-6A golden + replays to
    identical seal and zero writes。P2 frozen digest **仍为 `dd42217c…`**（p2-transform.ts:31
    一手 grep 确认，未重冻）—— 上轮 counter 的 P2 audit digest 漂移问题已通过隔离方案闭合。
  - **隔离方案核实**：`buildPalMigration` 默认 `current-r13-6a`（pal-migration.ts:527），
    只显式传 `r13SixBSourceSemantics: true` 才启用 6B（:525-529）；P2 翻译在默认 profile
    恢复 R13-6B 前的命令形状（foldDoorPattern 不加 `__palSourceAddress`/absorbedFade）。
    canary 回放 R13-6A seal 前，由 `pal-r13-six-b-rewind.ts` 对 content11 baseline 做
    fail-closed 6B→6A rewind（逐文件 COW :22、transaction 不闭合 throw :118/133、命中数
    mismatch throw :144）。
  - **fast** 75 files / 558 passed / 5 skipped（20s）全绿。
  - **dry-run** `writes=0 / deletes=0 / conflicts=0`，applied=0/already=871/skipped=0。
  - 数据层（上轮 counter 已核无反例）：7 preShake 20/20/14/24/14/14/14、370 酒神 item 86
    MP×8 清 MP、303/305 resourceDelta hp -1 + **304 instantKill（G1 完美落实）**、
    content11/SAVE8/min8。

  counter 返工闭合，改签 **accept**。Kimi F1-F4 counter 仍阻塞，任务仍 rework，不得标记 done。
  未修改实现/产物/baseline/seal/Kimi 签字。

##### R13-6B Kimi F1-F4 返工与源真值补正（2026-08-03）

用户指示“处理吧”后，Codex 按 Kimi 的一手反例修复 `fd2e4353`。本节补正早期设计记录中遗漏的
303/305 敌侧状态步；历史审查文字作为当时事实保留，不回写伪造三方结论。Kimi 的 `counter`
在其独立复审前继续有效，N3-1 保持 `build`，R13-Z、C8、ED-5I 均未因此完成。

- **F1 敌侧概率**：`translateSkillScript` 对 `0x06` 的既有 canonical 口径是操作数原值
  `chance=a`，不做 69/49/29 的二次换算；因此按 `all.json` 敌支原值生成 303=70、305=50、
  304=30。实现锚：`packages/migrate/src/pal-authored-overlays.ts:31-59`。
- **F2 敌侧完整链**：303 固定为 `gate(70) → sleep(3t) → HP-1`，305 固定为
  `gate(50) → confused(3t) → HP-1`；304 保持 `gate(30) → instantKill`，没有错误套用
  `resourceDelta(-1)`。overlay 单测逐 effect/顺序钉住三条链。
- **F3 preShake**：330/334/342/357/378/380/385 的帧数仍为
  20/20/14/24/14/14/14，level 全部改为 `4`，对应 `0x35 operand[1]=0` 的原版默认值；
  单测一次对账 7/7。
- **F4 编辑器预览**：`Playback` 新增纯表现层 token，不进入 scratch world/工程/存档；
  `holdScreen` 立即写现有 `view.fadeBlack=1`，同 token `revealScreen` 用 260ms 淡入恢复。
  异常、`loadScene`、停止/组件卸载统一走 `finalizeScreenHold`；错误 token fail-loud 后也恢复画面。
  锚点：`packages/editor/src/core/playback.ts:112-113,506-520,620-637,671-677`。
- **上游重迁**：只改迁移 overlay 后先 dry-run 得 `writes=1 / deletes=0 / conflicts=0`，再由
  `migrate:content -- --write` 原子更新 PAL skills + baseline；二次 dry-run 为
  `applied=0 / already=871 / skipped=0`、`writes=0 / deletes=0 / conflicts=0`。没有手改
  `projects/pal`。oracle 由 `test:oracle:update` 专用生成器重签，projection 零变化。
- **返工验证**：content **33 files / 391 tests**；reforge **77 / 777**；editor
  **93 / 797**；migrate fast **75 / 558（5 skipped）**；四包 typecheck 通过；定向
  editor playback **11/11**、PAL overlay **3/3**；source canary **2/2，245.63s**；
  `git diff --check` 通过。

##### 给 Kimi（R13-6B F1-F4 定向返工复审；下一位 Agent 可直接复制）

```text
复审 N3-1 R13-6B 的 Kimi F1-F4 counter 返工；只读，不改实现、生成产物、P0/P2 digest、
GLM 签字或任务状态。任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：N3-1 build；GLM 已 accept F5，Codex 已在 fd2e4353 完成 F1-F4 返工并自验；
你的 Kimi counter 仍有效，只有独立核对无反例后才能改签 accept。不得标 R13-6B/N3-1/C8/ED-5I done。

先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；本卡 R13-6B implementation review、
Kimi F1-F4 counter 和“R13-6B Kimi F1-F4 返工与源真值补正”；再读：
packages/migrate/src/pal-authored-overlays.ts 及测试、projects/pal/content/skills.json、
packages/migrate/baselines/pal/content/skills.json、packages/editor/src/core/playback.ts 及测试。

必须独立核对：
1. all.json @43089/@43096/@43123 与 L_39391/L_39398：敌侧 gate 必须是 303=70、305=50、
   304=30；303/305 必须分别 sleep/confused 3t 后 HP-1，304 仍为 instantKill。
2. 现有 0x06 canonical 口径是否确为 operand 原值（translateSkillScript chance=a），不得把玩家
   60/44/33 再抄回敌侧，也不得无证据改成 69/49/29。
3. 7 个 preShake 必须全部 level=4，帧数仍为 20/20/14/24/14/14/14，且末尾 shake 未被覆盖。
4. 编辑器 canonical/legacy 预览的 hold/reveal 是否实际使用 fadeBlack 幕布；正常配对、错误 token、
   stop/卸载、异常和 loadScene 是否收尾；状态不得进入工程、scratch world 或存档。
5. 证明改动来自上游迁移器且 PAL project/baseline 同步；复跑 migrate dry-run 必须
   applied=0/already=871/skipped=0、writes=0/deletes=0/conflicts=0。

建议复跑：
- pnpm --filter @type-pal/migrate exec vitest run src/pal-authored-overlays.test.ts
- pnpm --filter @type-pal/editor exec vitest run src/core/playback.test.ts
- pnpm --filter @type-pal/migrate run check:fast
- pnpm --filter @type-pal/migrate run migrate:content
canary 已由 Codex 在 fd2e4353 后跑 2/2（245.63s）；若不怀疑 F5/P0 隔离可不重复这项慢门，
但需检查该证据对应当前提交且 frozen digest 未重冻。

输出：在本卡 R13-6B implementation review 的 Kimi 行把 counter 改为 accept，或保留 counter 并给出
file:line、源地址、实际/期望和最小返工。另写独立复跑数字；不得修改 Codex/GLM 行或标记 done。
```

##### R13-6B F5 返工交接提示词（GLM 已完成，保留备查，勿再执行）

```text
复审 N3-1 R13-6B implementation counter 返工；只读，不改实现、生成产物、P0/P2 digest 或签字以外的任务卡内容。
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：R13-6B 仍在 build/review blocked；GLM 原 counter 已完成 Codex 返工，待 GLM 改签；Kimi F1–F4 counter 仍保留。

先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡 R13-6B implementation evidence、GLM counter 及本返工回应；
再读：packages/migrate/src/pal-r13-six-b-rewind.ts、pal-migration.ts、translate-events.ts、
pal-authored-overlays.ts、runtime-capability-audit(-v3).ts、r13-source-semantics-canary.ts。

复跑证据：
1. `pnpm --filter @type-pal/migrate run test:canary`（必须 2/2，且 P2 frozen digest 仍为 `dd42217c…`）；
2. `pnpm --filter @type-pal/migrate run test:fast`（当前 558 passed/5 skipped）；
3. `pnpm --filter @type-pal/migrate run migrate:content`（必须 applied=0/already=871/skipped=0，plan 0/0/0）。

重点核对：默认 build 是否完全保持 R13-6A/P0 输出；R13-6B 专用 profile 是否只为 successor 证据生成私有地址/技能字段；
历史 capability matrix 是否不含 6B 新能力；content11 baseline 的 6B→6A rewind 是否摘要钉住、命中数 fail-closed、
不读取或修改 projects/pal；oracle 指纹更新是否仅覆盖 producer source tree。通过则只把本表 GLM 行改为
`accept` 并记录上述证据；任一反例继续 `counter`，给出 file:line、真值出处和最小返工。不得标记 N3-1/C8/ED-5I done。
```

#### 给 Kimi（R13-5 counter 返工复审）——已于 2026-07-31 执行，改签 accept（保留备查，勿再执行）

```text
复审 N3-1 R13-5 counter 返工。
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：R13-5 review blocked；只读复审 e6a521d6..299a6fb8，不是 Coding Owner。

先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md，以及任务卡的 R13-5
build/review、历史 counter 和 post-publication counter 返工小节。

重点核对：
1. hookSources 54 = 44 ready/turnStart owners + 15 battleEnd roots - 5 owner overlap，
   historical authority suite 是否恢复；
2. published baseline 回退、seal/authored preservation、initialize/replay 和 anti-tamper
   是否仍 fail-closed；
3. sound +4、music +2 及 allRefs=6,731 / soundEdges=1,747 / nonSound=4,984 是否成立；
4. editor v4～v9→content10 是否零写 fail-loud、manifest-last，并覆盖全部四类 owner；
5. `299a6fb8` 的 fast/release 分工是否仍保留 source-backed initialize、真实磁盘
   seal/successor/author-layer 与 release 完整 replay `0/0/0`；根级 check:fast
   5,198 passed / 1 skipped 是否足以关闭原 counter。

输出要求：只修改本卡“R13-5 专项 review -> done 推进签字”自己的 Kimi 行和一手交接记录。
通过则改签 accept；不通过则 counter 并给精确 file:line、复现与最小返工。不得改实现、
生成产物、board 或其他签字；accept 只收口 R13-5，不代表 R13-6/R13-Z/N3-1/C8/ED-5I done。
```

#### 给 GLM（R13-5 counter 返工复审）——已于 2026-07-31 执行，改签 accept（保留备查，勿再执行）

```text
复审 N3-1 R13-5 counter 返工。
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：R13-5 review blocked；只读复审 e6a521d6..299a6fb8，不是 Coding Owner。

先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md，以及任务卡的 R13-5
build/review、历史 counter 和 post-publication counter 返工小节。

重点核对：
1. 已发布 R13-5 baseline/project 能否安全回退到 parent 后重新 initialize，且 non-owned
   enemy/scene 作者改动不丢；
2. P2/P3/P4 historical fixture 是否只 strip R13-5 owned delta，20/20 历史 pin 不漂移；
3. G3 的 7 条 r13-enemy source oracle 是否已进入 PAL_SHARED_TESTS；
4. source/target sound 计数、strict-empty current 口径与 8-file formal 边界是否完整；
5. content9→10 与本地 v4～v9→10 升级是否覆盖 scene/shared/item/enemy、预检零写、
   manifest-last；`299a6fb8` 是否只去掉重复 replay 而未降低 PAL/release 证明，
   根级 check:fast 5,198 passed / 1 skipped 是否全绿。

输出要求：只修改本卡“R13-5 专项 review -> done 推进签字”自己的 GLM 行和一手交接记录。
通过则改签 accept；不通过则 counter 并给精确数字、路径、断言、复现与最小返工。不得改实现、
生成产物、board 或其他签字；accept 只收口 R13-5，不代表 R13-6/R13-Z/N3-1/C8/ED-5I done。
```

#### R13-5 专项 `review -> done` 推进签字

| Agent | 结论 | 日期 | 备注 |
|---|---|---|---|
| Codex | **accept** | 2026-07-31 | 唯一 Coding Owner 自验通过。`e6a521d6..299a6fb8` 的 counter 返工、content10/SAVE8 identity、fast/release 双证明与完整 release replay 均闭合；根级 check:fast 为 5,198 passed / 1 skipped，Biome 1,040 files 通过。accept 只确认当前 R13-5 复审候选，不冒充 R13-6/R13-Z/N3-1/C8/ED-5I done。 |
| Kimi | **accept** | 2026-07-31 | `e6a521d6..299a6fb8` 复审通过：K1 hookSources 已按最小返工修为 54+账目注释（隔离复跑 3/3 绿）；fast/release 拆分未降门禁——pal-shared 保 source-backed initialize+anti-tamper、pal-fresh rewind 验真实磁盘 seal/successor/author 四层、release 无 shortcut 完整 planner replay+0/0/0（两门均隔离复跑 exit 0）；runtime capability 仅同进程刚建报告免二次重建，外部/prepared 仍 snapshot-backed rebuild；返工未动产物/seal（哈希复验）；初判两处失败均系并发 CPU 争用（隔离复跑全绿）非回归。accept 仅准入 R13-6。 |
| GLM | **accept** | 2026-07-31 | G2 counter 返工闭合（299a6fb8）：rewind 真回建让 initialize 可验 + fast/release 拆分保留真实磁盘 replay 0/0/0 双门。数据层（上一轮已核）无反例。见交接。accept 只确认 R13-5 formal candidate，不冒充 R13-6/R13-Z/N3-1/C8/ED-5I done。 |

**done 准入结论**：三方 `accept` 已齐，R13-5 于 2026-07-31 收口；只准入 R13-6，
不代表 R13-Z、N3-1、C8 或 ED-5I 完成。
- 2026-07-31 Kimi：完成 `e6a521d6..299a6fb8` counter 返工只读复审，改签 **accept**
  （仅准入 R13-6）。核对：
  - **K1（本席 counter）**：`:148` 冻结值修为 54 并写明 `44 ready/turnStart + 15 battleEnd
    − 5 overlap` 账目，与我的最小返工建议逐项一致；隔离复跑 `legacy-enemy-script-v9-
    authority.pal.test.ts` **3/3 绿（206.8s）**。
  - **G2**：`published-r13-enemy-test-fixture.ts` 从真实磁盘 published baseline/project
    回退 parent，校验 seal 有效性、changedPaths=evidence、文件 hash 完整性
    （assertSnapshotFileHash）、localeDelta 应用与 35 个 authored locale id；initialize
    注入 non-owned 作者改动证明 8 个 owned writes 不吞作者层。
  - **fast/release 拆分未降门禁**：pal-shared 保留完整 source-backed initialize、
    半状态与篡改反例（隔离复跑 r13-enemy-audits 全绿）；pal-fresh 走 rewind 验真实磁盘
    seal/successor/author 四层（integration fast 门隔离复跑 2 passed/1 skipped，exit 0）；
    release 无 shortcut 完整调用 planner 并显式断言 replay + `0/0/0`（integration
    release 门隔离复跑 2 passed/1 skipped，exit 0）。runtime capability 仅"同进程刚构建"
    的本地报告免除二次 rebuild（纯函数重算无证明力增量），外部/prepared 报告仍走
    snapshot-backed rebuild。
  - **返工未动产物/seal**：两提交仅触 demo/e2e-own manifest 与测试/校验代码；一手
    sha256 复验七层 seal byte-pin 不变（r13-enemy-script-v1=`e913123d…`）。
  - **失败定性**：本会话初跑 audits+integration(fast) 与 integration(release) 各有一处
    红，系与并行重测试套件争抢 CPU 所致（audits 单独复跑、integration 两门各自隔离
    复跑全部 exit 0），非候选回归。
  - e6a521d6 的硬化与 R13-5 authority 一致：`checkAuthorCommandsV5` 直接校验
    `startBattle.choreography`（封死升级器外偷渡）、enemy onDefeated 改穷尽 typed walker。
  未修改实现/产物/seal/其他签字。Next：GLM 复审其 G2/G3 后三方齐，R13-6 方可开始。

- 2026-07-30 Kimi：完成 R13-5 formal candidate 架构/runtime/schema/MG2/anti-tamper
  只读审查，签 **counter**（一处确定性测试漂移，最小返工）。
  **反例（一手复现）**：
  - 复现命令：`cd packages/migrate && npx vitest run
    src/experimental/script-v5/legacy-enemy-script-v9-authority.pal.test.ts` →
    **1 failed | 2 passed**（确定性，两次一致）。
  - 失败点：`legacy-enemy-script-v9-authority.pal.test.ts:148`
    `expect(current.migration.report.enemies?.hookSources).toHaveLength(44)`，实际 **54**。
  - 根因：`825398ab` 给 `mapEnemies` 的 hookSources 新增 battleEnd 条目
    （translate-enemy-scripts.ts:108-111、migrate-enemies.ts:170-176），88db1c41 冻结的
    期望值 44 未随 825398ab 更新。该文件在 PAL_SHARED_TESTS，fast/release 套件均红，
    即**已提交 main 的 migrate check 当前必红**；R13-6 将在红套件上继续累积。
  - 语义核对：54 为正确新值（44 ready/turnStart hookOwners + 15 battleEndRoots − 5 个
    地址重叠根；与 enemy source disposition 摘要 44 hookOwners/15 battleEndRoots 一致，
    且 r13-enemy-source-disposition.pal 7/7 绿）；`audit.digest=8fe4ad1c…` 断言仍通过
    （digest 已反映 54，仅计数钉值滞后）。
  **最小返工范围**：
  1. 把 :148 期望更新为 54，并在注释写明账目（44+15−5 重叠），或改为对 disposition
     派生计数的断言而非魔数；
  2. 复跑该文件与 `check:fast` 全绿；
  3. 无需重新生成产物或 seal（纯测试漂移，无语义变化）；不需重签已发布层。
  **其余审查项全部通过（若返工落实即可转 accept，无需复审这些面）**：
  - runtime：hooks 七类 transition/validator SCC 与 terminal≤1 静态检查、per-instance
    cursor 不进存档、effect 后同轮仍行动（battle-session.test.ts:1037）、rules>fallback>
    attack、0x06 clamp(rate-1)% 边界、random 单抽（rng calls===1）、scriptOwnerDef 生命
    周期三策略、明王固定成长（不清 exp/先 persistentProgress/新上限被 revive 读取/恰好
    一实例）、stopMusic.fadeMs serial、pending terminal 延迟提交、onDefeated lineage 不可
    伪造且父 activity 覆盖全程、BattleSession default 抛错、editor lossless；P1-P7 设计钉
    全部落实。记录缺口：sleep/paralyzed/confused 不跑 ready 无专门测试钉；「transform
    chain 后仍跑原敌 battleEnd」无端到端集成测试（enemy-402 真实语料可补）。
  - MG2/seal（一手 sha256 + stableJsonSha256 重算）：七文件 byte-pin 全中，parent=
    `89092578…`、self=`54804a6c…`、file=`e913123d…` 三值一致；_state 恰 7 键；seal
    不进 projects/pal；enemies 与 6 scene project↔baseline cmp 全同；99 owner manifest
    （fallback 85/hooks 44/rules 95/choreography 21）与四文件 digest 独立复算命中。
  - prepared authority 信任边界：进程私有 WeakSet brand + 七容器引用锁定 + 每次复用
    重验 pure-successor 完整 content digest + merged-target closure；伪造 token/容器替换/
    自洽重签均 fail-closed；**522s→291s 优化未见证明力削弱**（digest 复用仅同 snapshot
    引用、索引与全表扫描谓词等价、runtime capability v3 每次全量重跑）。
  - author target 保护：8 份旧演出用稳定 selector+旧 digest 删除而非整文件覆盖（s003
    实测 strip 后与 successor 逐字节相等）；locale 35 个 project-only 作者键零漂移，
    baseline-only=0、共同键改值=0。
  - content10/SAVE8：identity normalization deep-equal 不读 sidecar、LegacySavePayloadV8Content9
    拆分、历史 verifier byte-pin、A7-4→v11。记录项：roadmap.md:194 与
    capability-map.md:155 的"A7-4 候选 v10"已 stale，应改 v11。
  - append-only transaction：8-file 白名单 + 19 项、initialize/replay/live dry-run 0/0/0、
    journal/staging 清空、无手补。
  Next：Codex 按上述 3 项最小返工修复后，Kimi 对修复 diff 复审并转 accept；GLM 可并行
  继续其数据守恒审查。

#### 给 Kimi（R13-5 runtime / MG2 / anti-tamper 实现审查）——已于 2026-07-30 执行，签 counter（测试漂移一处，最小返工后复审，保留备查）

```text
实现审查：N3-1 P7-R13-5 敌人脚本、battle context、outer MG2 与正式发布
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：N3-1 总体 build；R13-5 formal candidate 已形成，Codex=accept，Kimi/GLM=pending。
你的角色：Kimi 架构/runtime/schema/MG2 主审，不是 Coding Owner。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡 R13-5 专项设计、Kimi P1-P7 风险钉、build 实现进度与 review 签字表；
- docs/ops/audits/codex-r13-5-enemy-source-semantics-audit.md；
- commits 825398ab、d94c3cb2；
- packages/migrate/src/experimental/script-v5/{r13-enemy-script-mg2,
  r13-enemy-script-augmentation,r13-enemy-source-disposition,
  source-execution-census,source-instruction-disposition}.ts；
- packages/migrate/scripts/migrate-content.mts、projects/pal/manifest.json 与新 seal。

必须独立核对：
1. current v10 successor 只拥有 enemy ai.fallback/hooks/rules/choreography、5 locale 和
   8 encounter cleanup；author target 的其它字段仍能保留，owned delta 又不能回退。
2. prepared source census 是否同时防原地 mutation 与 scenes/items/... 容器替换；
   prepared enemy authority 是否会在 merge/seal 前重验完整 pure-successor digest，不能用旧 seal
   发布 non-owned 篡改；伪造 token、自洽重签、输入 identity drift 是否 fail-closed。
3. historical source/audit → successor generated 的桥接方向、confirm/cross prepared authority、
   R13-5=0/0 与 R13-6=215/197 隔离是否成立；不得用 current audit 洗历史账。
4. content9→10 / SAVE8 identity、旧六层 byte-pin、append-only baseline、8-file whitelist、
   transaction ordering 与 independent replay 是否完整；无 journal/half-state。
5. 独立复跑必要测试，特别是 R13-5 MG2、non-owned tamper、prepared source replacement 和
   fresh/replay 边界；评估本轮性能优化是否牺牲 source-backed 重建。

输出要求：
- 只修改本卡“R13-5 专项 review -> done 推进签字”自己的 Kimi 行与交接记录；
- 通过签 accept；不通过签 counter 并列精确 file:line、复现与最小返工；
- 不得改实现/生成产物/baseline/board/其它签字，不得标 N3-1/C8/ED-5I done。
```

#### 给 GLM（R13-5 12/31 / formal diff / 测试矩阵实现审查）——已于 2026-07-30 执行，签 counter（附 G2-G3 返工项，保留备查）

```text
实现审查：N3-1 P7-R13-5 敌人脚本数据守恒、source disposition、formal diff 与测试矩阵
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：N3-1 总体 build；R13-5 formal candidate 已形成，Codex=accept，Kimi/GLM=pending。
你的角色：GLM 数据/schema/迁移/测试矩阵主审，不是 Coding Owner。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡 R13-5 专项设计、GLM 设计签字/G1、build 实现进度与 review 签字表；
- docs/ops/audits/codex-r13-5-enemy-source-semantics-audit.md；
- commits 825398ab、d94c3cb2；
- packages/migrate/src/experimental/script-v5/{r13-enemy-source-disposition,
  r13-enemy-script-augmentation,r13-enemy-script-mg2,
  source-execution-census,source-instruction-disposition}.ts；
- projects/pal、packages/migrate/baselines/pal 的 enemies/locale/6 scenes/_state/new seal。

必须独立核对：
1. 153 enemies、12 pending enemy / 31 historical debt、81,674 execution sites；
   final R13-5=0/0，R13-6 必须仍为 215/197；39 enemy bridge sites 中 31 debt + 8 canary
   的 selector/evidence/trace 是否从源和 final 可重建。
2. enemy-483/496/499/519、15 battleEnd、99 changed owner 与
   fallback85/hooks44/rules95/choreography21 数字是否成立；8 encounter cleanup 是否恰在
   s003/s021/s086/s093/s106/s138，旧 choreography digest 不匹配必须失败。
3. formal diff 是否恰为 8 project + 8 baseline + state/manifest/new seal 共 19 transaction ops；
   enemies/6 scene project=baseline；locale project 9587 / baseline 9552，只多 35 author-only，
   baseline-only=0、共同键改值=0。
4. manifest content10/minSave8、new seal self `54804a6c…`、file sha `e913123d…`、
   parent confirm `89092578…` 与旧六层 file sha 是否正确；无 journal/staging。
5. 独立复跑必要矩阵，核对 dry-run 8/0/0、formal write 内部 replay 0/0/0、额外 live
   dry-run 0/0/0；确认测试性能优化没有少扫/漏证据。

输出要求：
- 只修改本卡“R13-5 专项 review -> done 推进签字”自己的 GLM 行与交接记录；
- 通过签 accept；不通过签 counter 并列精确数字/selector/digest/测试与最小返工；
- 不得改实现/生成产物/baseline/board/其它签字，不得标 N3-1/C8/ED-5I done。
```

- 2026-07-30 GLM：完成 R13-5 数据守恒/source disposition/formal diff/测试矩阵 implementation
  review，签 **counter**（数据层全绿，但 formal publication MG2 initialize 路径回归失败）。
  一手复核（非 Codex 清单复述）：

  **数据层全部精确匹配（无反例）**：
  - **账**：seal `audits.sourceControl.summary` —— executionSites=81,674、
    finalOpenR13_5Sites=0、finalOpenR13_5Observations=0（**R13-5=0/0**）、
    finalOpenR13_6Sites=215、finalOpenR13_6Observations=197（**R13-6=215/197**）；
    `augmentation.audits.enemySourceDispositionSummary` —— legacyDebtSites=31、
    mandatoryNonPendingSites=1、reviewerSilentSites=7、totalSites=39（31 debt + 8 canary）、
    legacyPendingEnemies=12、byDisposition translated35+equivalent3+unreachable1=39、
    battleEndRoots=15、hookOwners=44、hookRoots=52、raw/overlay/final enemies=153/153/153；
    runtime v3 —— cells=431、uses=62,346、refused=0、openIssues=0。`buildPalMigration`
    复算 pendingScripts=0（R13-5 处理后归零）。
  - **99 owner + fallback85/hooks44**：final enemies.json 实数 —— 有 ai.fallback 或
    ai.hooks 的 unique enemy=99；ai.fallback=85、ai.hooks=44；hooks 用 stateMachine
    结构（initial/states/body/next/branch/advance），ready22+turnStart30=52 hookRoot。
    rules95/choreography21 是 disposition 层 site 分类，fold 进 hooks body，非 final 独立字段。
  - **8-file formal diff**：git diff d94c3cb2~1..d94c3cb2 —— project content writes 恰为
    enemies + locale + 6 scene（s003/s021/s086/s093/s106/s138）= 8 content files + manifest；
    baseline 同步 8 content + _state + new seal = 19 transaction ops。
  - **6 scene + enemies project↔baseline**：`diff -q` 全部 byte-identical ✅。
  - **locale**：project=9,587、baseline=9,552、project-only=35（author-only equip.*/menu.*
    等）、baseline-only=0、common changed=0 ✅。
  - **manifest/seal/旧六层**：contentVersion=10/minSave=8；seal file SHA `e913123d…`、
    self digest `54804a6c…`、parent r13-confirm `89092578…` 全匹配；旧六层 seal file SHA
    （P7 `41263ba1`/C8 `325d52ed`/cadence `2b1e71b0`/cross `723e4fd2`/item-throw `2c741222`/
    confirm `38d129fb`）6/6 byte-pin、git clean ✅。
  - **enemy-499 G1 风险钉完美落实**：final 迁移为 stateMachine —— initial `branch
    playerInParty zhao-linger`（then→40965 双臂 / else→40964 stay）保留双臂；state-L_40965
    body 含 `fleeBattle` **即时执行未延迟**（G1 要求满足）；fleeBattle 后 next=`branch chance
    percent:29`（then→40972 说明对白 / else→stay）—— **29% 续跑 / 71% 终止**，与 sdlpal
    `0x06[30]` 的 `RandomLong(1,100)>=30` 语义精确对齐。Codex 采纳了 G1，未按审计错误理由
    做 flee 延迟。
  - **测试**：unit 20/20（source-instruction-disposition + source-execution-census）全绿。

  **G2 counter（blocker，须返工）**：`r13-enemy-audits.pal.test.ts:230` 的
  `MG2 初始化只写八个内容文件，旧 seal 不动且重放 0/0/0` 测试在 d94c3cb2 提交 baseline 后
  **回归失败** —— `expect(first.enemyScriptSealMode).toBe('initialize')` 收到 `'replay'`。
  根因：d94c3cb2 把 `r13-enemy-script-v1` 提交进 baseline `_state` + `_transitions/` 后，
  `loadPalBaseline`（pal-test-fixture.ts:78）加载的 `generated.baseline` 必然含 enemy seal，
  `transitionState()`（r13-enemy-script-mg2.ts）判 replay 而非 initialize。测试 line 177
  `base = cloneSnapshot(generated.baseline)` **未 strip enemy seal**，导致从 line 230 起的
  全部 initialize 断言（mode、8-file writes、seal parent、summary、anti-tamper）整段失败。
  这是 R13-4 baseline 污染问题的**同类回归**：R13-4 的 half-state repair（migration-baseline.ts
  validation + migrate-content `--repair-r13-confirm-seal`）只覆盖 confirm seal，未覆盖
  enemy seal 的 fixture strip。**initialize 路径（8/0/0 writes + seal 落盘）现在无法验证**，
  只有 replay 路径能跑。
  - 复现：`cd packages/migrate && pnpm vitest run --project pal-shared src/experimental/script-v5/r13-enemy-audits.pal.test.ts`
  - 825398ab 时 baseline 不含 enemy transition（已 git show 核实），测试是绿的；d94c3cb2
    提交后变红。Codex 自验报告 line 6484「R13-5 MG2 1/1」是 d94c3cb2 提交前的状态，提交后
    未重跑确认。
  - **最小返工**：测试 fixture 在构造 `base` 时 strip 掉 enemy seal（删
    `_transitions/r13-enemy-script-v1.json` + `_state.transitions['r13-enemy-script-v1']` +
    managedFiles/hash 对应项），或复用 R13-4 的 `stripControl` 模式扩展到 enemy seal，使
    initialize 路径可验证。修后重跑该测试必须全绿，且不影响 replay 路径。

  **G3 记录项（非 blocker）**：`r13-enemy-source-disposition.pal.test.ts` 不在
  vitest.tests.ts 的 PAL_SHARED_TESTS/PAL_FRESH_TESTS/ALL_MIGRATE 任何 include 列表里，
  当前不被任何 project 匹配（`--project pal-shared` 报 No test files found；`--project unit`
  被 PAL_HEAVY exclude 但该文件不在 PAL_HEAVY 又不在 ALL_MIGRATE include 的实际匹配集）。
  若该测试是 R13-5 disposition 的重要覆盖，应加入 PAL_SHARED_TESTS；若已由 audits PAL
  覆盖则可移除。请 Codex 确认其归属。

  数据守恒、seal 链、enemy-499 G1 落实、locale/scene/project 守恒全部无反例；
  counter 仅因 G2 formal publication initialize 路径回归。Codex 修 G2（+ 确认 G3）后
  GLM 可改签 accept。未修改实现/产物/baseline/seal/Kimi 签字。

- 2026-07-31 GLM 复审（e6a521d6..299a6fb8）：G2/G3 counter 返工闭合，**counter 改签 accept**。
  一手复核（非 Codex 清单复述）：
  - **G2 修复核实**：新增 `published-r13-enemy-test-fixture.ts` 的
    `rewindPublishedR13EnemyTransition`（:87-161）是 **source-backed 真回建**，不是简单 strip
    seal —— 它从 published baseline 读 seal 四态（metadata/file/managed/hash，:98-106）、
    逐 changedPath 校验 baseline/project/parent/successor 一致性（:116-128，baseline≠successor
    或 project≠baseline 非 locale 路径即 throw）、locale owned delta + author-only key 保留
    （:130-153）、最后删 seal 四态 + project managedFiles（:155-159）。initialize 测试现在从
    真实 parent 基线跑，不是 fake。
  - **fast/release 拆分无降门禁**：`vitest.config.ts` define `process.env...='fast'`，
    `vitest.release.config.ts` define `='release'`；`pal-migration-integration.test.ts:800-844`
    fast 路径走 rewind + augmentation 证据（:802-824），release 路径走完整 planner +
    `enemyScriptSealMode='replay'` + `writes.size=0/deletes=[]/conflicts=[]`（:825-844）。
    **两门都保留**，fast 没有替代 release 的真实磁盘 replay。
  - **一手复跑（299a6fb8）**：
    - enemy-audits PAL（pal-shared）**3/3 全绿**（383.72s）—— 含 `MG2 初始化只写八个内容
      文件` 221676ms 通过，G2 回归已修复；
    - pal-migration-integration **release 门** 2 passed / 1 skipped（297.25s）—— 走 release
      路径完整 planner + 真实磁盘 replay 0/0/0；skipped 是 `MG2 真实 PAL 数据临时目录演练`
      （`hasBootstrapFixture=false`，baseline 已提交，合理 skip）；
    - r13-enemy-source-disposition PAL（pal-shared）**7/7 全绿**（5.32s）—— G3 已修，文件
      加入 `PAL_SHARED_TESTS`（vitest.tests.ts:16）不再游离。
  - **数据层（上一轮 counter 已核，本轮未重跑但无 schema/产物/seal 变更）**：153/12/31/
    0/0/215/197、99 owner、8-file diff、locale 9587/9552/35、seal/旧六层 byte-pin、
    enemy-499 G1（`branch chance percent:29` 对齐 `0x06[30]`）全部无反例。299a6fb8 只改测试
    不改生产 schema/产物/seal（commit message + diff 确认），数据层结论不变。

  counter 返工闭合，改签 **accept**。accept 只确认 R13-5 formal candidate，不冒充
  R13-6/R13-Z/N3-1/C8/ED-5I done。未修改实现/产物/baseline/seal/Kimi 签字。

#### Kimi R13-5 设计主审（2026-07-30）

**方法**：只读设计审查；对 sdlpal fight.c/script.c 关键语义、game-mechanics 明王节、既有
enemy translator/battle-session 形态与 Codex 审计逐项一手核对。

**逐项结论**：

1. **hook flow 最小充分** ✅。stay/restart/continue/advance/branch/random/commandOutcome
   七形态覆盖 12 pending 全部反例：421（self-summon 双臂+失败重试+reset）、422（>100 恒
   fall-through 门记 explicit-no-op + 42637/42639 循环）、435（@41555 unreachable 记
   unreachable 不强翻）、463（顺序门四臂）、469/486/539（重试+reset 循环）、547（0xA2
   单次抽样四臂）。per-instance cursor 只活 BattleState 不进世界存档（战斗不可存档的既定
   边界一致）；setFallback 对应 0x67 实例级持续改写；rules > fallback > attack 的优先级与
   初始 magic/rate 归 fallback 的划分干净。0x06 边界规范化（clamp(rate-1)%）与 random
   单次抽样禁多次近似，处理了我 R13-1 核过的同类 off-by-one。
2. **ready 后仍行动** ✅（一手核实 fight.c:1719-1724：`wScriptOnReady = RunTriggerScript`
   后紧跟 `PAL_BattleEnemyPerformAction`）——hook effect 是行动前即时副作用，不吞正常
   行动；sleep/paralyzed/confused 不跑 ready 沿用一阶段真值。
3. **生命周期 scriptOwnerDef** ✅（一手核实 script.c:2954-2969：0x9F 只换 wObjectID 与
   e、三脚本指针不动）——summon/divide/transform 三策略与战后枚举取
   scriptOwnerDef.onDefeated 均忠实；divide 复制三指针（script.c:2789-2826）。
4. **明王 applyActorGrowth/playActorCastEffect** ✅ 与 game-mechanics.md:1260-1300 逐条
   吻合：八项固定 0x19（非 0x8D 非随机非 Extra）、0x22 复活、0x1D 回满到新上限、0x92
   白闪绑稳定 ActorDef.id；内部 fixedCharacterGrowth 不复用强制 expAfter:0 的
   characterGrowth，不清 exp；恰好一个实例校验防 .find() 静默。
5. **onDefeated canonical authority** ✅：v10 显式 context union（13 叶 + branch）、
   transient body 无持久 cursor、不可伪造 lineage 复用父 activity、父 activity 覆盖
   battle+onDefeated+外层 safe point、snapshot 在世界写+safe point+释放 lease 后——彻底
   关闭我 P7-R13 红队 R1 的 scratch 写入黑洞；无新增公共 runner API、无裸 cast。
6. **生成期 fail-loud** ✅：battleEnd 恰 1 stage 断言在任何 [0] 读取前（关 M7）、
   choreography 收窄为穷尽 union + BattleSession default 抛错（关 M6 的 log-only 开放口）、
   capability cell 与实现一一对应不裸口。
7. **content10/SAVE8** ✅：公共 schema（hooks/两个 union）bump content10、世界不变 SAVE
   保持 8、SAVE8/content9 identity normalization（deep-equal、不读 sidecar）、历史
   epoch-v9 verifier byte-pin、LegacySavePayloadV8Content9 拆分不原地漂移、A7-4→v11、
   append-only r13-enemy-script-v1 parent=r13-confirm-v1——全部自洽。

**风险钉（P，build 验收核对，不阻塞 agree）**：

- **P1 hook effect 后同轮仍行动必须钉死**：ready flow 完成且无 pending terminal 后才做
  rules > fallback > attack 正常选择；summon/divide/transform 立即生效的同一轮仍进入
  正常行动（fight.c:1719-1724），测试必须有"effect 后同轮行动"反例。
- **P2 生命周期三例逐一生成 oracle**：transform 后 ready/turnStart/battleEnd 仍跑原
  script owner（含战后枚举）；divide 复制 cursor+fallback+rules+fired；summon 用目标
  初始 cursor/fallback/rules；禁止按 state id 同名猜继承。
- **P3 RNG 边界单测**：0x06 规范化 clamp(rate-1)%（rate=1→0%、rate=100→99%）与 random
  单次抽样（总 weight、正整数校验、单次 RNG 消耗计数）逐边界钉死。
- **P4 pending terminal 延迟提交**：fleeBattle/endBattle 只登记，activation 的
  synchronous continue closure 完成且 choreography queue 播完才提交战果；抛错/abort
  不提交迟到 terminal；enemy-499 flee 后说明对白可达为强制 oracle。
- **P5 lineage 防死锁**：activation gate 已关闭时 onDefeated 不得 beginActivity 等自己；
  lineage 只在 Reforge 包内、不可伪造；hostile/dev 无父 activation 才登记新 transient；
  abort/error 只关闭一次不泄漏。
- **P6 升级器扫描范围**：content9→10 fail-loud 必须覆盖 enemies + scene/shared/
  item-private 递归 command tree 的 startBattle.choreography；新旧形态混合 fail-loud；
  禁止裸 cast 偷渡未知命令。
- **P7 明王写回顺序**：先更新无装备 persistentProgress 与当前 battle snapshot，再排队
  写回 CharacterInstance 八字段；后续 revive/increaseHpMp 读增长后上限；save/reload 后
  仍在；三项（战中值、战后 world、存档）一致 oracle。

**结论**：**agree**。设计无 schema/runtime/save/MG2 级反例。

- 2026-07-30 Kimi：完成 R13-5 敌钩/battle action/canonical authority 设计主审，签
  **agree**，附 P1-P7 风险钉。一手核实：ready 后仍行动（fight.c:1719-1724）、transform
  不改三脚本指针（script.c:2954-2969）、明王固定成长真值（game-mechanics.md:1260-1300）。
  未修改实现/产物/seal。Next：GLM 数据/升级/测试矩阵主审；两席均 agree 后 Codex 进入
  R13-5 实现。

## 下一位 Agent 提示词

### 给 Kimi（R13-5 enemy hook / battle action / runtime authority 设计主审）——已于 2026-07-30 执行，签 agree（附 P1-P7，保留备查，勿再执行）

```text
设计准入复审：N3-1 P7-R13-5 敌钩持久程序、battle action 与 canonical onDefeated
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
审计：docs/ops/audits/codex-r13-5-enemy-source-semantics-audit.md
当前状态：N3-1 总体 build；R13-5 专项 blocked，Codex=agree、Kimi/GLM=pending。
你是架构/runtime/schema/版本/MG2 主审，不是 Coding Owner；只允许修改本节自己的 Kimi
签字和交接记录，不得改实现、生成产物、baseline、seal、board 或其它签字。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡 R13 总设计 K5、R13-4 最终签字与新的 R13-5 专项设计；
- 上述 Codex R13-5 审计；
- docs/phase1/game-mechanics.md“明王觉醒”；
- packages/content/src/{enemy-ai,enemy,script,script-v5,rewards,validate}.ts；
- packages/migrate/src/{translate-enemy-scripts,pal-boss-overlay}.ts；
- packages/migrate/src/experimental/script-v5/runtime-capability-audit.ts；
- packages/reforge/src/battle/{battle-core,battle-session}.ts；
- packages/reforge/src/{main,script-project-v5,legacy-runtime-shell-v5}.ts。

必须独立核对：
1. 421/469/486/539/547 是否确实不能用现有 AiRule[] 忠实表达；拟议 hook flow 的
   stay/restart/continue/advance/branch/random/commandOutcome、per-instance cursor、
   fallback/effect 是否最小充分，是否有 silent SCC、RNG 次数、ready effect 误吞正常行动或
   summon/divide/transform 生命周期歧义。
2. 483/499/519 的 battle action runtime：真实 wait/audio、flee body 收尾、固定成长即时+
   永久+不清 exp、stable actor id、白闪；是否还缺 action 或错误扩大通用 Command。
3. V5 onDefeated 复用现有 transient runner 是否彻底绕开 structured-clone scratch，
   abort/save barrier/scene change/error propagation 是否成立；是否确实无需新增公共 runner API。
4. content10/SAVE8/min8、WorldV10 alias、SAVE8/content9 identity、A7→v11 与 append-only
   seal/transaction 是否自洽；若主张不 bump，须解释 strict schema 如何区分 v9/v10。
5. battleEnd 多 stage 与 unsupported cell 是否在 write 前 fail-loud，BattleSession default
   是否有运行时第二道防线。

输出：无 blocker 则在“R13-5 专项 build 推进签字”Kimi 行签 agree，并写独立证据/风险钉；
有反例则签 counter，列精确 schema 字段、source address、runtime path 与最小替代方案。
Kimi/GLM 均 agree 前明确“不得开始实现”；不得标 N3-1/C8/ED-5I done。
```

### 给 GLM（R13-5 12/31 source disposition / 升级 / 测试矩阵设计主审）——已于 2026-07-30 执行，签 agree（附 G1，保留备查，勿再执行）

```text
设计准入复审：N3-1 P7-R13-5 敌人脚本源账、三层映射、版本升级与测试矩阵
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
审计：docs/ops/audits/codex-r13-5-enemy-source-semantics-audit.md
当前状态：N3-1 总体 build；R13-5 专项 blocked，Codex=agree、Kimi/GLM=pending。
你是数据/source disposition/迁移/测试矩阵主审，不是 Coding Owner；只允许修改本节自己的
GLM 签字和交接记录，不得改实现、生成产物、baseline、seal、board 或其它签字。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡 R13 总设计 K5、R13-4 最终签字与新的 R13-5 专项设计；
- 上述 Codex R13-5 审计；
- data/extracted/data/enemy-objects.json、data/extracted/events/all.json；
- docs/phase1/game-mechanics.md“明王觉醒”；
- packages/migrate/src/{translate-enemy-scripts,pal-boss-overlay,pal-migration}.ts；
- packages/migrate/src/experimental/script-v5/{source-instruction-disposition,
  runtime-capability-audit}.ts；
- projects/pal 与 packages/migrate/baselines/pal 的 enemies/scene/team/startBattle 数据。

必须独立核对：
1. 153/153/153、54、12 enemy / 31 site 和精确 ID；逐敌表的 source address、
   plain/advance/reset、goto/label、概率/RNG、current magic 与 disposition 是否成立。
2. enemy-496 team34/team37 + s106 party 双臂、483 时序、519 八项固定增长与
   ready/battleEnd、499 flee 后对白是否从源和 final 独立复算成立。
3. 15 battleEnd 是否当前全部单 stage，final onDefeated 15 的 command census 是否准确；
   两-stage/unknown action/refused command 负测是否足以禁止 silent truncate/log-only。
4. source site → raw/overlay/final selector/evidence 是否能防 lead overlay、删臂、换 transition、
   只清 pending note 的伪完成；pending=[] 必须只是派生断言。
5. content9→10 project upgrade、SAVE8 content identity、minimum8、A7→v11、parent seal 与
   old six-layer byte-pin 是否完整；测试矩阵是否覆盖全迁二跑/MG2/half-state。

输出：无 blocker 则在“R13-5 专项 build 推进签字”GLM 行签 agree，并写独立数字/命令/风险钉；
有反例则签 counter，列精确 enemy/address/selector/digest/缺失断言与最小替代方案。
Kimi/GLM 均 agree 前明确“不得开始实现”；不得标 N3-1/C8/ED-5I done。
```

- 2026-07-30 GLM：完成 R13-5 数据/source disposition/测试矩阵/版本升级设计准入复审，签
  **agree**，附 G1 风险钉。一手复核（非 Codex 清单复述）：
  - **账**：`buildPalMigration(loadPalMigrationSources(cwd))` 独立复算 —— raw 153 / withScript 54 /
    pendingScripts 12（id 420/421/422/435/463/469/483/486/499/519/539/547 与审计逐条精确匹配）/
    pending notes 31 = 31 source site；project 与 baseline `enemies.json` 各 153（153/153/153）；
    danglingEnemyId=0。
  - **逐敌源语义**（从 all.json + enemy-objects/teams/player-roles.json + sdlpal script.c/fight.c 独立核，
    非转述）：
    - **496** @41432：`0x79[41,41473,0]` name-id 41=盖罗娇，真条件双臂 —— 无盖 fallthrough 对白→
      无 0x67 改魔法→保留默认 magic=385（enemies.json id119 核实）；有盖 L_41473→378→328→
      0xFFFF pass（fight.c:4663 wMagic==0xFFFF）→0x89[0] terminate（battle.h Terminate=0）；
      team34 objectIndex=[527,496,527] 496 非 lead / team37=[496]，startBattle idx 12676/16683 可达 ✅
    - **519**：8 项成长实际在 turnStart L_42237 觉醒段（idx 42309-42316），opcode **0x19**
      （increase player attr，**非**审计写的 0x66=投掷武器，措辞瑕疵不影响数值结论），数值
      11/170/190/100/155/55/80/30 全吻合，op[2]=2→role1=赵灵儿；battleEnd L_42424 giveItem 230
      菩提袈裟 ✅
    - **483** @41386：`0x77[1]`=fade 1×3=3000ms（script.c:2215）/ sound213（0x47）/ `0x85[20]`=20×80=
      1600ms / music38（0x43）四项逐一吻合 ✅
  - **battleEnd**：15 onDefeated 全为 array（单 stage，无 stages 字段）；command kinds 恰为
    `branch/dialog/giveItem/stopScript`；无世界写指令（审计「尚无」成立）✅
  - **版本链**：R13-5 parent = 已发布 r13-confirm-v1 digest `89092578…`；旧六层 seal file SHA
    （P7 `41263ba1`/C8 `325d52ed`/cadence `2b1e71b0`/cross `723e4fd2`/item-throw `2c741222`/
    confirm `38d129fb`）一手 sha256 确认 byte-pin 对象；content10/SAVE8 identity + v9→v10 纯映射
    升级器 + 递归扫 startBattle.choreography/onDefeated 禁裸 cast 的设计成立。

  **G1 风险钉（非 blocker，实现期核对）**：审计 enemy-499（@40963）写「runtime 遇 flee 会清队列，
  后段永不可达」—— 机制描述**错误**。独立从 all.json + sdlpal script.c:3299 + type-pal
  event-system.ts:4406-4413 核实：后段说明对白（idx 40972-40978）的不可达性由 `[40971]
  0x06[30,0,0]` 概率门控制 —— `RandomLong(1,100)>=30`（71%）→ jumpToGlobalIp(0)→ip=-1→+1=0→
  cmd[0]=end→脚本终止；29% 续跑到说明对白。**不是**「永不可达」，是 71%/29%；**也不是** flee
  （0x69）清队列 —— 0x69 走 D26(2b) 入 battleDialogQueue 作 effect、tickBattleDialog phase-agnostic
  不阻断后段对话。验收矩阵「499 flee 后对白」的**处置方向正确**（保留双臂 + 保留后段对白），
  但若按审计错误理由做「flee 延迟到演出体收尾后结算」会改变原版 flee 即时生效语义。实现时
  须按 0x06 概率门迁移（71% skip / 29% 显示说明对白），不得延迟 flee。

  未修改实现/产物/baseline/seal/Kimi 签字；仅更新本表 GLM 行与本交接记录。

### 给 Kimi（R13-4 runtime / SAVE / append-only MG2 / repair 实现审查；已于 2026-07-30 执行，签 accept，保留备查）

```text
实现审查：N3-1 P7-R13-4 源 No 生命周期、真实 confirm、SAVE 8、append-only MG2 与 half-state repair
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：N3-1 总体 build；R13-4 formal candidate 的 Codex / Kimi / GLM 三方
implementation review 已全部 accept，本提示词已执行完毕，仅作历史留档。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡 R13-4 专项设计、Kimi 设计 P1-P4、19-locale 修订、
  “formal publication / post-formal checkpoint”与实现签字表；
- docs/ops/audits/codex-r13-4-confirm-control-flow-audit.md；
- packages/migrate/src/experimental/script-v5/{r13-confirm-control-flow,
  r13-confirm-mg2,r13-confirm-seal-repair,runtime-capability-audit}.ts；
- packages/migrate/src/{migration-baseline,migration-transaction}.ts 与
  packages/migrate/scripts/migrate-content.mts；
- packages/reforge/src/{script-confirm-modal,gameplay-clock,script-runner-v5,
  script-world-v5,main}.ts、save/{types,migration,ops}.ts；
- packages/editor/src/core/playback.ts、packages/editor/src/ui/PreviewCanvas.tsx。

必须一手复核：
1. 26 RAW / 28 logical / 31 physical、22 transformed 与 6 exact 是否仍是唯一 source-backed
   authority；多 confirm、s081 双 yield、s029/s030 copies、s108 continuation、C8 @19888
   是否无二次包裹或 commandOutcome 丢失。
2. central modal 的默认 No、FIFO、held-frame、冻结域、Esc/Menu、abort/session replacement、
   late input 幂等；persistent/transient/shared/item-private 是否进入同一 coordinator active
   registry，prompt 中 save 是否只在 settle+safe point 后拍快照。
3. content9/SAVE8/min8、旧 epoch 在 sidecar I/O 前拒绝、Editor scratch world 与 stop/reset
   token 清理是否符合已签设计 P1-P4。
4. new seal parent/self digest、旧五层 byte-pin、private prepared authority/deep freeze/
   anti-tamper 是否成立；禁止用“自洽重签”绕过 published evidence。
5. 首次正式迁移 15 project writes / 33 transaction ops 后，额外 dry-run 暴露的
   `_state`→missing seal half-state 是否由显式 authority repair 最小修复；最终复验是否
   覆盖 TOCTOU、pending transaction、project/manifest/baseline drift，repair 是否只补单 seal
   且不改 `_state`。不得把未知外部清理来源猜成已证根因。
6. 独立复跑你认为必要的 targeted tests；核对 formal rerun 与独立第二进程、live dry-run
   均 0/0/0。s108/s118 尚无剧情 checkpoint 的 live 尾项应判断为 e2e 基建记录还是 blocker，
   不得把没有实跑的路径写成浏览器通过。

输出要求：
- 只允许修改本卡“R13-4 批次实现审查签字”自己的 Kimi 行和交接记录；
- 通过则签 accept，并明确 accept 只准入 R13-5；
- 不通过则签 counter，给精确 file:line、复现、风险与最小返工项；
- 不得修改实现、生成产物、baseline、project、board 或其它签字，不得标 N3-1/C8/ED-5I done。
```

### 给 GLM（R13-4 26/28/31 / locale / formal diff / 测试矩阵实现审查）——已于 2026-07-30 执行，签 accept（保留备查，勿再执行）

```text
实现审查：N3-1 P7-R13-4 confirm 数据守恒、19 locale、正式产物与测试矩阵
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：N3-1 总体 build；R13-4 formal candidate 已形成，Codex=accept，
Kimi/GLM implementation review=pending。你是只读数据/schema/MG2/测试矩阵主审，不是 Coding Owner。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡 R13-4 专项设计、GLM 设计签字、19-locale 修订、
  “formal publication / post-formal checkpoint”与实现签字表；
- docs/ops/audits/codex-r13-4-confirm-control-flow-audit.md；
- packages/migrate/src/experimental/script-v5/{r13-confirm-control-flow,
  r13-confirm-control-flow.pal.test,r13-confirm-mg2,r13-confirm-mg2.pal.test,
  r13-confirm-seal-repair,runtime-capability-audit,source-instruction-disposition}.ts；
- packages/migrate/src/{migration-baseline,migration-transaction}.ts 与
  packages/migrate/scripts/migrate-content.mts；
- projects/pal 与 packages/migrate/baselines/pal 的 manifest/_state/seals/locale/items/
  18 个 R13-4 scene 候选。

必须独立复核：
1. 26 RAW / 28 logical / 31 physical；2/18/5/1→2/20/5/1→3/20/6/2；
   exact 6 logical / 9 physical、transformed 22/22、18 flows、26 retired cursor、最终
   confirm debt=0，selector 不重复且 evidence 可从 source/final 重建。
2. changed scenes 恰 13，exact-only s029/s030/s081/s108/s118 git byte-stable 且
   digest=seal；不得把 s081 既有 two-copy loop 算作本批新写。
3. locale exact 19、0 sprite；两个 digest 一手复算；19 条 source 引用闭合。
   重点核对作者保护口径：14/15 target byte-identical，locale project 正确保留
   35 author-only keys；baseline-only=0、共同键改值=0。不要误报为 project/baseline drift。
4. manifest 9/min8、new seal self/state/file SHA 与 parent；旧五层 seal byte-pin；
   `_state.files` 全量复算、无 journal/staging。
5. formal 首跑 15 project writes / 33 transaction ops、内部第二进程 0/0/0；
   half-state repair 后正式 rerun/独立第二进程/live dry-run 0/0/0。审查 repair 负向矩阵，
   不得用人工复制 seal 通过。
6. 独立复跑覆盖矩阵：targeted、R13-3/R13-4 MG2、P2/P3/P4 pins、cadence/published-v4，
   并抽核 content/reforge/editor/migrate/fresh release 记录与 content9 cadence golden。
   s108/s118 尚无剧情 checkpoint 的 live 尾项须如实分类，不能改写成已完成的全剧情 e2e。

输出要求：
- 只允许修改本卡“R13-4 批次实现审查签字”自己的 GLM 行和交接记录；
- 通过则签 accept，并明确 accept 只准入 R13-5；
- 不通过则签 counter，给精确数字/selector/file:line/复现和最小返工项；
- 不得修改实现、生成产物、baseline、project、board 或其它签字，不得标 N3-1/C8/ED-5I done。
```

- 2026-07-30 GLM：完成 R13-4 implementation 数据守恒 / locale / formal diff / 测试矩阵
  只读审查，签 **accept**。一手复核（非 Codex 清单复述）：
  - **13 changed scene**（s005/s009/s023/s050/s084/s091/s100/s102/s111/s127/s128/s131/s148）
    project↔baseline 逐个 `diff -q` byte-identical；**5 exact-only**（s029/s030/s081/s108/s118）
    `git diff --quiet` 全 clean。
  - **locale**：project 与 baseline 各恰新增 19 key（dlg.5350/5483-5486/6164/7838-7856）、
    0 删除、0 共同键改值；sorted-id `fff0a7c4…`（复算确认输入 = `dlg.*` 字符串 key 数组，
    非数字 id；数字数组算出 `6e2116…` 不匹配）与 id-text `ee546b25…`（`stableJsonSha256({id:text})`）
    用仓库 `stable-json.ts` 语义一手复算匹配。
  - **26/28/31 + 四族**：从 seal `logicalSites`/`physicalSites` 实数 —— RAW 26 唯一地址
    （2/18/5/1）、logical 28（2/20/5/1）、physical 31（3/20/6/2）全自洽；三个 fanout 清晰
    （s081 macroTask/worldTick 双副本 loop、s029/s030 phase-002 reset/end 复制）；status
    exact-preserved 6 / lossy-transformed 22 与账一致。
  - **seal**：file SHA `38d129fb…`、self digest `89092578…`、parent `c8df75a5…`（= R13-3
    item-throw 已发布）全匹配；旧五层 seal file SHA（P7 `41263ba1`/C8 `325d52ed`/cadence
    `2b1e71b0`/cross `723e4fd2`/item-throw `2c741222`）5/5 byte-pin，git status 全 clean。
  - **manifest** contentVersion=9 / minimumSaveVersion=8（git HEAD 8/7→当前 9/8）确认。
  - **items** 234→234 不变，7 item（163/164/165/179/185/187/188）equip.effects 转
    battleSprite byActor，属 E1 authority 交叉落盘，与 ED-5I 的 7 singleton battleSprite
    item 口径一致。
  - **测试一手复跑**（非 Codex 报告转述）：control-flow PAL 4/4（129s，含 26/28/31 authority
    freeze + anti-tamper）、MG2 PAL 11/11（344s，**含上次失败现已修复的 `fresh init…重放 0/0/0`
    initialize 路径** 37865ms）、seal-repair 3/3、runtime-capability-audit 13/13 全绿。
  - **上轮 baseline 污染收口确认**：上一轮签字（19-locale 白名单）后我发现本地 baseline 已被
    改（16 文件 + untracked seal），MG2 initialize 断言因此失败。本轮 Codex 完成 formal write
    + half-state repair（`--repair-r13-confirm-seal` authority + fail-loud 矩阵）后，
    baseline `_state`/seal/scene/locale/items 一致，MG2 initialize/replay 双路径均可验证。
    该污染根因（`_state` 引用新 seal 但 seal 文件缺失的 half-state）已由上游修复
    （`migration-baseline.ts` validation/repair + `migrate-content.mts` 互斥 repair authority），
    不是手补生成物。

  未修改实现/产物/baseline/project/seal/Kimi 签字；仅更新本表 GLM 行与本交接记录。
  s108/s118 无剧情 checkpoint 的 live 尾项按 e2e 基建记录处理，不冒充全剧情 e2e 通过。

### 给 Kimi（R13-4 源 No 生命周期 / runtime modal / SAVE epoch / MG2 设计主审）——已于 2026-07-29 执行，签 agree（附 P1-P4，保留备查，勿再执行）

```text
设计准入复审：N3-1 P7-R13-4 confirm 源控制流、真实模态与 append-only MG2
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
审计：docs/ops/audits/codex-r13-4-confirm-control-flow-audit.md
当前状态：N3-1 总体 build，但 R13-4 专项 build blocked；Codex=agree，
Kimi/GLM=pending。你是架构/runtime/save/MG2 主审，不是 Coding Owner。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡 R13 总设计、R13-2/R13-3 最终签字和新的 R13-4 专项设计；
- 上述 Codex 审计；
- packages/migrate/src/experimental/script-v5/{p3-control-flow,p7-canonical,
  p7-state-machine,p7-owner-machine,r13-trigger-activation-graph,
  r13-item-throw-mg2,runtime-capability-audit}.ts；
- packages/reforge/src/{main,script-runner-v5,script-world-v5}.ts、
  menu/menu-box.ts、system-menu-state.ts、save/{types,migration}.ts；
- packages/editor/src/core/{playback,world-sprite-behavior}.ts 与
  packages/editor/src/ui/PreviewCanvas.tsx。

必须复核：
1. 22/28 logical No arm 的错误是否确由 P3 continuation 丢失，统一 commandOutcome
   state split 是否能保留 plain END/advance/reset/cycle；修复为何必须插在 item-throw
   successor 后而不能漂移旧 projector；augmentation 是否显式消费 sourceCommands、
   p3 flowStructures、source census、physical expansion/C8 evidence，而不是只凭 final
   snapshot 猜路径；不得用 append stopScript 冒充。
2. 已保真的 6 logical / 9 physical 是否会被二次转换；s081 双 yield、s029/s030 copies、
   s108 continuations 与 C8 @19888 是否守恒。
3. 项目按既有开发期政策选择 content9/SAVE8/min8、不提供 18 flow/26 old cursor 映射是否
   自洽；如主张 8/7，须给逐 cursor identity 方案，不可只说世界字段未变。
4. central modal arbiter、默认 No、输入优先级、FIFO、单次 settle、confirm gameplay freeze、
   dedicated held-frame、abort/session/runner replacement 是否无竞态；持久 runner lease 与
   transient/shared/item-private activity token 是否都真正阻断 save snapshot；不得复用
   SystemMenuState 业务状态或污染 shop/system prompt。
5. Editor 直接走 v5 runner 的边界是否干净；不能保留有损 v5→v4 commandOutcome lowering
   又宣称预览闭环。
6. 已完成父提交 `3a03bfdd3ef096613b9c10d42e3dbb7ced817624` 与 item-throw digest
   `c8df75a51de4c71ae5e71d43583b749736aecd61b0fd65e9b2568f2e1324502b`
   是否匹配；随后 r13-confirm-v1 以该已发布 seal 为 parent、旧五层 byte-pin、
   initialize/replay/half-state/tamper/drift 与 formal migration 二跑零计划是否充分。

限制：只读设计审查；不得改实现、生成产物、baseline、seal、版本常量、GLM 签字或任务
状态。只允许在“R13-4 专项 build 推进签字”自己的 Kimi 行与交接记录写结论。

输出：无 blocker 则签 agree；有反例则签 counter，写精确 file:line、源/运行时反例、
替代设计和需重签字段。Kimi/GLM 都 agree 前明确“不得开始实现”；agree 只准入 R13-4，
不代表 N3-1/C8/ED-5I 完成。
```

### 给 GLM（R13-4 26/28/31 数据守恒 / source disposition / 测试矩阵设计主审）——已于 2026-07-29 执行，签 agree（保留备查，勿再执行）

```text
设计准入复审：N3-1 P7-R13-4 confirm 全量源账、生成门禁与测试矩阵
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
审计：docs/ops/audits/codex-r13-4-confirm-control-flow-audit.md
当前状态：N3-1 总体 build，但 R13-4 专项 build blocked；Codex=agree，
Kimi/GLM=pending。你是数据/source disposition/测试矩阵主审，不是 Coding Owner。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡 R13 总设计、R13-2/R13-3 最终签字和新的 R13-4 专项设计；
- 上述 Codex 审计；
- data/extracted/events/all.json 与受影响 scene source；
- packages/migrate/src/translate-events.ts；
- packages/migrate/src/experimental/script-v5/{source-execution-census,
  source-instruction-disposition,runtime-capability-audit,p3-control-flow,p7-canonical,
  r13-trigger-activation-graph,r13-item-throw-mg2}.ts；
- packages/migrate/baselines/pal/_transitions/r13-item-throw-v1.json 与 18 个 final scenes。

必须独立复核：
1. 26 RAW / 28 execution sites / 31 final physical nodes 及两个 fanout、s029/s030 phase
   copies、s108 old1→new2 是否精确；s081 initial/cycle 两份不是 R13-2 生成。source digest
   3d19fb14…、修复前 final digest 556885e1…是否可复算。
2. 6/28 logical exact、22/28 lossy 分类是否正确；逐地址 No target 与 plain END 2 /
   end+advance 18 / reset 5 / loop 1 的 **26 RAW** 口径，以及 logical 2/20/5/1、
   physical 3/20/6/2、lossy advance18+reset4 是否守恒。
3. 新 evidence 是否逐 source site 联结 source SHA、No/Yes、terminal lifecycle、
   28→31 expansion、final selector/transition/two-arm digest 与 runtime evidence；
   entity/hook + flow/state/stage + CommandId selector 及 C8 无 id 的 digest 唯一性是否充分；
   删/复制/交换/漏 fanout 是否会精确 reopen，而不是只靠数量或 final JSON 自证。
4. source disposition v3 与 runtime audit v2 是否只关闭 R13-4 confirm debt，不把
   R13-5/R13-6 open observations 冒充已完成。
5. content9/SAVE8/min8、A7-4→候选 v10 的唯一接受/拒绝矩阵；已完成父提交
   `3a03bfdd3ef096613b9c10d42e3dbb7ced817624` 与 item-throw digest
   `c8df75a51de4c71ae5e71d43583b749736aecd61b0fd65e9b2568f2e1324502b`、
   旧五层 byte-pin、新 seal parent、13 lossy scenes 首跑白名单、5 exact-only scenes
   byte-stable 与二跑 0/0/0 是否完整。
6. 最低测试矩阵是否足以钉住 s005/s050/s009 三个用户可见反例、s009/s100/e1825/s131
   同 flow 多 confirm 组合、synthetic plain END/loop、s081 yield、runtime central modal/
   freeze/held-frame/transient save lease 与 Editor v5 commandOutcome。

限制：只读设计审查；不得改实现、生成产物、baseline、seal、版本常量、Kimi 签字或任务
状态。只允许在“R13-4 专项 build 推进签字”自己的 GLM 行与交接记录写结论。

输出：无 blocker 则签 agree；有反例则签 counter，列精确 address/site/selector/digest、
复跑命令、缺失断言与最小替代方案。Kimi/GLM 都 agree 前明确“不得开始实现”；
agree 只准入 R13-4，不代表 R13-Z、N3-1、C8 或 ED-5I 完成。
```

### 给 Kimi（R13-3 架构 / runtime / append-only MG2 实现审查）——已于 2026-07-29 执行，签 accept（保留备查，勿再执行）

```text
实现审查：N3-1 P7-R13-3 投掷 schema / runtime / Editor / append-only MG2
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：N3-1 总体 build；R13-3 implementation review。Codex=accept，
Kimi/GLM=pending。你是架构/runtime/MG2 主审，不是 Coding Owner。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡“R13-3 投掷公共 schema / runtime / MG2 delta 设计门禁”、
  “Kimi R13-3 设计主审”与“R13-3 implementation candidate 与 Codex 自验”；
- docs/phase1/game-mechanics.md 的投掷/巫抗/毒语义；
- docs/phase2/poison-system-design.md；
- packages/migrate/baselines/pal/_transitions/r13-item-throw-v1.json。

职责：
1. 核对 ThrowEffect 7 类与 ItemUseEffect 真正类型/解释器分离，content8/SAVE7 identity
   normalization 没有新增世界字段或读 sidecar。
2. 逐查 runtime：one/all target、一次消费、0x66 strength+magic baseDamage、0x2E
   stopTarget/“攻击无效”、0x64“无任何效果”、0x28 抵抗续跑与新毒即时 enemy tick0、
   重复同毒不重放、lethalWith 在抵抗后仍判断。
3. 核对 Editor 使用共享控件但没有第二套脚本系统，七类中文 CRUD/排序/undo/redo
   fail-closed。
4. 核对 append-only parent、旧四层文件 SHA、new seal/evidence/source/target digest，
   initialize/replay/half-state/tamper/drift 与 release live authority；特别确认 release
   不调用 fast-only getter。
5. 可复跑最小测试；不要因全量 migrate 慢而放宽断言或加 timeout。

限制：只读实现/产物；不得修改实现、生成产物、baseline、seal、其他 Agent 签字或把任务
标 done。只允许在“R13-3 批次实现审查签字”自己的 Kimi 行和交接记录写结论。

输出：无 blocker 则签 accept；有反例则签 counter，写精确 file:line、源真值、复现命令
和最小返工项。accept 只表示等待 GLM/准入 R13-4，不代表 N3-1/C8/ED-5I 完成。
```

### 给 GLM（R13-3 76-root 数据 / evidence / 测试矩阵实现审查）——已于 2026-07-29 执行，签 accept（保留备查，勿再执行）

```text
实现审查：N3-1 P7-R13-3 76-root 投掷数据守恒、source closure、版本与测试矩阵
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：N3-1 总体 build；R13-3 implementation review。Codex=accept，
Kimi/GLM=pending。你是数据/覆盖/测试矩阵主审，不是 Coding Owner。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡 R13-3 设计、GLM G1 裁决与 implementation candidate 全文；
- docs/phase1/game-mechanics.md 的投掷、signed-short magic、毒配对真值；
- packages/migrate/src/experimental/script-v5/r13-item-throw-augmentation.ts；
- packages/migrate/src/experimental/script-v5/r13-item-throw-mg2.ts；
- packages/migrate/baselines/pal/_transitions/r13-item-throw-v1.json。

职责：
1. 从 source 独立复算 76 roots，确认 final76/missing0、58 absent/1 lossy/17 exact、
   11 all/65 one、29 sentinel 与 family counts，不只检查 presence。
2. 核对 59 observations = 48 pending + 10 silent-empty + item133 lossy；item133 parent
   缺 target 必须按 v7→v8 oneEnemy 归一化，不能用 source target 掩盖 drift。
3. 核对 0x2E/0x64 failure narration/message/end 被精确读取且进入 sourceClosureDigest；
   对 messageIndex/text 做漂移负测。
4. 核对 source/target/evidence/seal digest、parent 链、旧四层 SHA、正式重迁首轮两操作+
   二轮0/0/0、声音 itemThrow75/missing0/kindMismatch0。
5. 核对 content/reforge/editor/migrate、fresh release、PAL integration 与浏览器单体/
   全体证据是否覆盖冻结矩阵；测试慢不得用跳测、弱断言或 fast 缓存冒充 release。

限制：只读实现/产物；不得修改实现、生成产物、baseline、seal、其他 Agent 签字或把任务
标 done。只允许在“R13-3 批次实现审查签字”自己的 GLM 行和交接记录写结论。

输出：无 blocker 则签 accept；有反例则签 counter，列出精确 item/source address、
selector/digest、复现命令和最小返工项。accept 只表示等待 Kimi/准入 R13-4，不代表
R13-Z、N3-1、C8 或 ED-5I 完成。
```

### 给 GLM（R13-3 G1 signed-short sentinel / 毒配对定点纠正）——已于 2026-07-28 执行，撤回 G1（保留备查，勿再执行）

```text
定点复核：N3-1 P7-R13-3 GLM G1 附加项纠正
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：R13-3 三方表面均 agree，但你的签字附“G1 必落：17 个 applyPoison throw 全部
present-but-lossy”；Codex 一手复核发现该附加项与 signed-short sentinel、一阶段测试和
PoisonDef.lethalWith 冲突，因此子门禁 blocked on GLM G1 correction。

你的职责：只读定点复核自己提出的 G1；不得修改实现、生成产物、baseline、seal 或其他
Agent 签字。只允许修正自己的 R13-3 签字备注，并在交接记录写结论。

必须先读：
- 任务卡“GLM G1 定点争议裁决”全文；
- data/extracted/data/{items,object-magics,magic}.json；
- data/extracted/events/all.json 中 17 个 root；
- packages/game/src/core/battle/magic-damage.ts:10-23,265-305；
- packages/game/src/core/battle/__tests__/magic-damage.test.ts:154-166；
- packages/migrate/src/migrate-content.ts:1189-1213；
- packages/migrate/src/pal-derived-content.ts:63-126；
- packages/reforge/src/battle/battle-core.ts:1600-1612。

请独立复核：
1. 116–125、130、138、139、144、147、159 的首条是否均为 0x42[24,0,0]；
   object24→magic96 的 baseDamage 64537 经 SHORT 是否为 -999，magStr=0/minDamage=0
   是否必然结算 0；final 是否已保留 presentation。
2. 133 是否是 object372→magic63，baseDamage150/elemental6/all-target，因而才是真正
   present-but-lossy。
3. 122–125、138、139 的 0x5E 是否是“查配对毒”而非 HP 门，0x60 是否已由
   PoisonDef.lethalWith + performThrow 单源承接；生成 killIfHpAtMost 是否反而错误。
4. 第 18 个已有 root 137 是否为 currentHpDamage，最终总账是否仍应为
   58 absent + 1 present-but-lossy + 17 exact-proven。

输出二选一：
- 若同意：在自己的 GLM 签字备注明确撤回 G1，保留其余 agree 结论，并把子门禁改为
  三签齐/build allowed；写明不得给 16 个 sentinel 造伤害、不得给 6 个毒对造 HP 门。
- 若反对：把签字改为 counter，给出能推翻 SHORT(-999)、SimulateMagic minDamage=0、
  PoisonDef.lethalWith 和上述测试的精确源地址、公式、实际运行反例与替代设计。

未完成本次纠正前不得开始实现，也不得标 N3-1/C8/ED-5I done。
```

### 给 Kimi（R13-3 投掷 schema / runtime / append-only MG2 设计主审）——已于 2026-07-28 执行，签 agree（附 K1-K6，保留备查，勿再执行）

```text
设计准入复审：N3-1 P7-R13-3 投掷公共 schema / runtime / append-only MG2 delta
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：build，但 R13-3 schema 子门禁 blocked；Codex=agree，Kimi/GLM=pending。
你的职责：只读架构/runtime/MG2 主审；不得修改实现、生成产物、baseline、旧 seal 或其他
Agent 签字。只允许在任务卡自己的 R13-3 签字行与交接记录落结论。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡 P7-R13 总设计、R13-2 最终签字、新增“R13-3 投掷公共 schema/runtime/MG2 delta”全文；
- docs/phase1/game-mechanics.md 的投掷/巫抗语义；
- packages/game/src/core/battle/{battle-opcodes,magic-damage}.ts；
- packages/content/src/{item,item-v5,validate,character}.ts；
- packages/reforge/src/battle/{battle-core,battle-session}.ts 与 save/{types,migration,ops}.ts；
- packages/migrate/src/{migrate-content,pal-migration}.ts；
- packages/migrate/src/experimental/script-v5/{p7-generated,r13-cross-activation-mg2,
  source-instruction-disposition}.ts。

必须独立核对并明确同意或反驳：
1. 独立 ThrowEffect/ThrowTarget/ThrowElement/ThrowMagicStrength、
   `applyStatus.onResist`、原子 `killIfHpAtMost` 与 `damageAndHealCaster` 是否为最小充分
   公共模型；是否存在仍需 raw opcode、PAL id、第二解释器或无法表达的源链。
2. 0x2E 单次巫抗 + `stopTarget`、0x28 抵抗继续、0x39 固定伤害/固定回血、0x42 minDamage=0、
   0x66 effective attack + inclusive RNG 0..3 是否与一阶段真值一致。
3. allEnemies 跳过目标选择、BattleAction 可选目标、一次消费、死亡重选及表现层多目标信息
   是否闭环；运行时是否可完全 exhaustive/fail-closed。
4. content 7→8、SAVE_VERSION/minimumSaveVersion 保持 7、SAVE7/content7→8 identity
   normalization 是否符合双轴；若 counter，给出不增加无关 save epoch 的具体替代。
5. R13-2 旧 disposition/seal 密封全 snapshot 后，新增 parent/successor 分离与外层
   `r13-item-throw-v1` 是否足以保证 P7/C8/R13-1/R13-2 byte-identical replay；指出任何
   会让旧 wrapper 偷吃 successor 的路径。
6. `currentHpDamage`/throw context 从 ItemUseEffect/ItemUseContext 分离，以及编辑器复用同一
   能力容器但采用 typed `ThrowEffectChainEditor`，是否满足完整 CRUD 而不复制语义系统。

输出：
- 在本卡“R13-3 schema delta build 推进签字”Kimi 行签 `agree`，或写 `counter` 的精确
  字段、file:line、反例、替代设计与返工项；
- 在交接日志记录一手核对范围；
- agree 只开放 Kimi 席位，GLM 也 agree 前仍明确“不得开始实现”；不得标 N3-1/C8/ED-5I done。
```

### 给 GLM（R13-3 76-root 数据守恒 / 版本 / 测试矩阵设计主审）——已于 2026-07-28 执行，签 agree（附争议 G1，等待上方定点纠正）

```text
设计准入复审：N3-1 P7-R13-3 投掷 76-root 数据守恒、版本与测试矩阵
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：build，但 R13-3 schema 子门禁 blocked；Codex=agree，Kimi/GLM=pending。
你的职责：只读源数据/迁移/MG2/测试矩阵主审；不得修改实现、生成产物、baseline、旧 seal
或其他 Agent 签字。只允许在任务卡自己的 R13-3 签字行与交接记录落结论。

先读：
- AGENTS.md、docs/phase2/READ-FIRST.md；
- 本卡 P7-R13 总设计、R13-2 最终签字、新增“R13-3 投掷公共 schema/runtime/MG2 delta”全文；
- data/extracted/data/items.json、events/all.json、object-magics/magic 相关源表；
- packages/migrate/src/migrate-content.ts；
- packages/migrate/src/experimental/script-v5/{p7-generated,r13-cross-activation-mg2,
  source-instruction-disposition}.ts；
- packages/migrate/baselines/pal/content/items.json 与 projects/pal/content/items.json；
- packages/game/src/core/battle/{battle-opcodes,magic-damage}.ts。

必须独立机器复核：
1. source `throwable && scriptOnThrow>0`=76、final=18、missing=58、
   pending=48、silent-empty=10；缺失族计数 `32/10/7/6/1/1/1` 与精确 id 集合。
2. 11 件 all-target 集合精确为
   `67,68,69,70,71,115,133,134,142,157,162`，其余 65 单体。
3. 不只查 presence：独立证明 133 赤蝎粉当前丢
   `magic63 baseDamage150/elemental6→poison/all-target`；抽查其余 17 个已有 root 是否还存在
   present-but-lossy，若有必须扩大设计门。
4. 0x42 object→magic 的 baseDamage/语义 element/animation、0x66 operand×5 和攻击力、
   0x2E/0x28 跳臂、0x21 单全体、0x64/0x60、0x39 都能从源确定地产生 canonical，
   无任何 silent default/break。
5. 76-root evidence + source closure/final target digest + R13-3 disposition 是否足以让
   pending/silent/present-but-lossy 全部 fail-closed；仅 76/76 presence 不得通过。
6. content7→8 工程升级、SAVE7/content7→8 identity、旧四层 seal byte-pin、新 R13-3
   initialize/replay/tamper/half-state/target drift、正式二跑 0/0/0 的矩阵是否充分。

输出：
- 在本卡“R13-3 schema delta build 推进签字”GLM 行签 `agree`，或写 `counter` 的精确
  数量、id、源地址、字段、断言、替代设计与返工项；
- 在交接日志记录独立命令、计数与结论；
- agree 只开放 GLM 席位，Kimi 也 agree 前仍明确“不得开始实现”；不得标 N3-1/C8/ED-5I done。
```

### 给 Kimi（R13-2 cursor handoff / SAVE 7 runtime 实现审查）——已于 2026-07-28 执行，签 accept（保留备查，勿再执行）

```text
实现审查：N3-1 P7-R13-2 跨激活控制流——cursor handoff / SAVE 7 runtime 架构主审
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：build；R13-2 implementation candidate 已由 Codex 实现、自验并签 accept。
你只读审查，不修改实现、生成产物、baseline、任务状态或其他 Agent 签字；允许只更新
任务卡中自己的 R13-2 审查行和交接记录。Kimi/GLM 均 accept 前不得进入 R13-3；
不得标 N3-1/C8/ED-5I done。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡「R13-2 逐站审计与 cursor handoff / SAVE 7 delta 阻塞」、
  「R13-2 implementation candidate 与 Codex 自验」；
- docs/phase2/foundation/{script-system-design,save-system-design}.md。

重点源码：
- packages/content/src/{script-v5,character}.ts；
- packages/reforge/src/{script-world-v5,script-project-v5,script-runner-v5}.ts；
- packages/reforge/src/save/{types,migration,ops,epoch-v7.test}.ts；
- packages/migrate/src/script-graph.ts；
- packages/migrate/src/experimental/script-v5/
  {r13-trigger-activation-graph,r13-auto-idle-gates,r13-cross-activation-mg2}.ts；
- packages/migrate/scripts/migrate-content.mts；
- packages/migrate/baselines/pal/_transitions/
  {r13-cadence-v1,r13-cross-activation-v1}.json。

必须复核：
1. cursorHandoff 仅 use 可用、旧 effective initial、fromBehavior/唯一 case/目标 cursor
   校验是否完整；所有失败是否在 mutation 前发生。
2. selection + mapped cursor 是否原子提交，owner epoch 是否最后 bump；旧 runner、
   stale lease、换场景/save barrier/abort 是否不能回写覆盖新行为。
3. 未声明 handoff 的历史路径是否 byte-equivalent；是否不存在 hidden flag/counter、
   PAL address、共享 machine-id 猜测或 e4409 特判。
4. e405、e4168、s231 crowd、e4409/e4440/e4723 与 reverse handoff 映射是否逐相位完整；
   特别核对 e405 135 次与 e4409 k=0..9。
5. 7/7 是否在任何 sidecar I/O 前拒绝旧 epoch；历史 6/6 verifier、P7/C8/R13-1
   seal 是否未重签。
6. s057/s180 scene-entry 前缀消费是否在控制拆分前且 fail-loud；s020/e362 checkpoint
   重入与 s250/e4409 battle 浏览器证据是否足够。

输出：
- 在「R13-2 批次实现审查签字」自己的行签 `accept`，或写 `counter` 的精确
  file:line、反例、缺失断言与最小返工边界；
- 记录独立复跑命令、结果和剩余风险；
- accept 只准入等待 GLM/进入 R13-3，不代表后续批次或三张任务卡完成。
```

### 给 GLM（R13-2 source-v2 / MG2 / 迁移实现审查；可与 Kimi 并行）

```text
实现审查：N3-1 P7-R13-2 跨激活控制流——source-v2、逐站闭包、MG2 与迁移主审
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：build；R13-2 implementation candidate 已由 Codex 实现、自验并签 accept。
你只读审查，不修改实现、生成产物、baseline、任务状态或其他 Agent 签字；允许只更新
任务卡中自己的 R13-2 审查行和交接记录。Kimi/GLM 均 accept 前不得进入 R13-3；
不得标 N3-1/C8/ED-5I done。

先读：
- AGENTS.md、docs/phase2/READ-FIRST.md；
- 本卡 R13-0/R13-1、R13-2 delta 设计及
  「R13-2 implementation candidate 与 Codex 自验」；
- docs/ops/audits/{kimi,glm}-p7-r13-source-semantics-audit.md。

重点源码/数据：
- data/extracted/events/all.json；
- packages/migrate/src/script-graph.ts；
- packages/migrate/src/experimental/script-v5/
  {source-execution-census,source-instruction-disposition,
   r13-trigger-activation-graph,r13-auto-idle-gates,r13-cross-activation-mg2}.ts；
- packages/migrate/scripts/migrate-content.mts；
- packages/migrate/baselines/pal/_transitions/
  {r13-cadence-v1,r13-cross-activation-v1}.json；
- projects/pal/manifest.json 与最终 closure target。

必须独立对账：
1. source-v2 是否确为 43,503 / 41,945 / 1,558 / 7,947 /
   81,674（18,955 auto + 62,719 trigger）；17 条 delayed expiry 与 reset0
   fallthrough 是否按源语义修正。
2. 36 checkpoint / 43 contexts、34 persistent、7 discard alias；
   11 idle addresses / 13 sites / 84 phases；trigger delayed 7 owners / 9 addresses /
   41 phases；auto delayed 8 / 15 / 1,657 是否逐站可重建。
3. exact closure=78、target selector=77、本批 open=0 的差异是否有明确归因；
   不得把本批 open=0 冒充 R13-3～R13-Z 完成。
4. 18 handoff site 及 cases 1/16/176/13/15/24/2、installer 7/18/247、
   owner flows 102、auxiliary targets 437 是否由最终 PAL 重建且无悬空 locale。
5. 新 seal 是否严格 parent 到历史 R13 cadence digest；历史 P7/C8/R13-1/save sidecar
   byte-pin、自一致篡改 fixture、source/census/disposition drift 是否均 fail-closed。
6. canonical --write 是否真实分进程执行，fresh verifier 是否验证预期 digest 和
   writes/deletes/conflicts=0；是否没有手改 projects/pal。
7. s057/s180 scene-entry 重建是否只执行一次 prepare/reveal；cadence 22/56 拆分、
   content/reforge/editor/migrate 全量测试、SAVE7 负向、formal dry-run 与资源 writes=0
   是否可独立复现。

输出：
- 在「R13-2 批次实现审查签字」自己的行签 `accept`，或写 `counter` 的精确数字、
  selector、digest、fixture、复现命令与返工范围；
- 记录一手 SHA-256 和最终完整测试总数；
- accept 只准入等待 Kimi/进入 R13-3，不代表 R13-Z、N3-1、C8 或 ED-5I 完成。
```

### 给 Kimi（R13-2 cursor handoff / SAVE 7 delta 设计审查；已执行并签 agree，历史留档，勿再执行）

```text
设计复审：N3-1 P7-R13-2 跨激活控制流——cursor handoff / SAVE 7 runtime 架构主审
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：build 内的 R13-2 delta blocked；R13-1 三席 accept 已齐，但逐站审计触发了新的
command schema/runtime public contract + save epoch 门禁。你只读审查，不修改实现、生成产物、
baseline、任务状态或其他 Agent 签字；Kimi/GLM 均 agree 前 Codex 不得实现。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡「R13-2 逐站审计与 cursor handoff / SAVE 7 delta 阻塞」及 R13-1 cadence/save；
- reference/sdlpal/script.c:3219-3246,3335-3341,3533-3605、global.h:95；
- packages/content/src/script-v5.ts；
- packages/reforge/src/script-world-v5.ts、script-runner-v5.ts、save/{types,migration}.ts；
- packages/migrate/src/{script-graph,translate-events}.ts 与
  experimental/script-v5/{source-execution-census,auto-flow-lifecycle,r13-cadence-mg2}.ts。

必须复核：
1. e4409 的 0x09 -> 0x24 -> idle 0x02 是否确实跨 behavior 继承同一 auto counter；当前
   behavior-owned cursor 是否无法表达。
2. `cursorHandoff.stateMap` 的形状是否为最小通用 public contract；selection + mapped cursor
   原子写、effective initial、唯一映射、target validation、epoch bump 与 stale lease CAS 是否封闭。
3. 为何 preserve-compatible、隐藏 var/counter、共享 machine id 或 behavior 特判不应采用。
4. checkpoint activation/product-state graph 是否能仅用现有 transition 表达 32 线性 +
   4 条件站点、discard-return 与 reset/advance 覆盖，不暴露 PAL IP。
5. SAVE6 的 checkpoint 信息是否不可逆缺失，因而 7/7 epoch 断开是否比 alias 更诚实；
   历史 seal byte-pin、新 R13-2 parent 顺序及 A7-4 顺延是否完整。
6. save barrier / scene unload / behavior 自切 / auto runner 同时切换时是否还有竞态缺口。

输出：
- 在「R13-2 cursor handoff / SAVE 7 delta 推进签字」Kimi 行签 `agree`，或写 `counter` 的
  具体 file:line、反例、最小替代字段与测试；
- 在交接日志记录结论；agree 只允许 Codex 继续等待 GLM/进入 R13-2 build，不代表
  R13-Z、N3-1、C8、ED-5I 完成。
```

### 给 GLM（R13-2 source census / SAVE 7 delta 设计审查；已执行并签 agree，历史留档，勿再执行）

```text
设计复审：N3-1 P7-R13-2 跨激活控制流——全域 CFG/census、逐站矩阵与 SAVE 7 主审
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：build 内的 R13-2 delta blocked；R13-1 三席 accept 已齐，但逐站审计触发新
schema/runtime/save 门禁。只读审查，不修改实现、生成产物、baseline、任务状态或其他 Agent
签字；Kimi/GLM 均 agree 前 Codex 不得实现。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡「R13-2 逐站审计与 cursor handoff / SAVE 7 delta 阻塞」及 R13-0/R13-1；
- data/extracted/events/all.json；
- reference/sdlpal/script.c:3219-3246,3335-3341,3533-3605；
- packages/migrate/src/{script-graph,translate-events}.ts 与
  experimental/script-v5/{source-execution-census,source-instruction-disposition,
  auto-flow-lifecycle}.ts；
- packages/content/src/script-v5.ts、packages/reforge/src/save/{types,migration}.ts。

必须独立对账：
1. checkpoint：36 addresses / 43 contexts / 32 线性 + 4 条件 /
   35 plain preserve + 1 reset override / 7 discard aliases / 34 新持久 closure。
2. idle：11 addresses / 13 execution sites / 12 entities / 84 相位；实际全在 auto channel，
   安装来源 touch 5/6、interact 1/1、static 4/5、scene-onEnter 1/1。
3. delayed goto 17 条漏边与 reset0 假 fallthrough；为什么旧 42,024/82,953 不能做增量，
   context-sensitive CFG 与 method-version 重建是否充分。
4. L32215、L34319、1575/10315/19301、5189/9175 与 e4409 的 owner/context 不能漏。
5. SAVE6 为何无法区分“未运行/已执行但 checkpoint 被旧迁移吞掉”，7/7 早拒绝、历史
   artifacts byte-pin、新 R13-2 seal parent 与 MG2 测试是否闭环。
6. 逐站 trace、stateMap 负向、save/abort、全量重迁二跑与浏览器矩阵是否足够 fail-closed。

输出：
- 在「R13-2 cursor handoff / SAVE 7 delta 推进签字」GLM 行签 `agree`，或写 `counter` 的
  精确数字、站点、反例、替代方案和测试；
- 记录独立复算口径。agree 只开放 R13-2 build，不代表后续批次或三张任务卡完成。
```

### 给 Kimi（R13-1 runtime/schema/save 实现审查）——已于 2026-07-27 执行，签 accept（保留备查，勿再执行）

```text
实现审查：N3-1 P7-R13-1 身份、动态 auto、transition cadence 与 SAVE 6——runtime/schema 主审
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：build；R13-1 implementation candidate 已由 Codex 实现、自验并签 accept，你只读审查，不修改实现、
生成产物、baseline、任务状态或其他 Agent 签字。Kimi/GLM 均 accept 前不得进入 R13-2；
不得标 N3-1/C8/ED-5I done。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡「R13-1 build 检查点与 cadence delta 阻塞」、Kimi K1-K6、
  「R13-1 implementation candidate 与 Codex 自验」；
- docs/phase2/foundation/{script-system-design,save-system-design}.md。

重点源码：
- packages/content/src/{script-v5,character}.ts；
- packages/reforge/src/{script-compiler-v5,script-runner-v5,script-project-v5,
  script-world-v5,main}.ts、`script-project-v5.test.ts`、`script-runner-v5.test.ts`
  与 save/{types,migration,ops,epoch-v6.test}.ts；
- packages/editor/src/core/upgrade-local-v5-epoch-v6.ts 与
  packages/editor/src/ui/CanonicalScriptEditorV5.tsx；
- packages/migrate/src/experimental/script-v5/
  {auto-flow-lifecycle,p7-canonical,p7-project,pal-auto-lifecycle-repair,
   cadence-compatibility.pal.test,r13-cadence-mg2.pal.test}.ts。

必须复核：
1. cadence 可选字段、省略兼容、compiler v2、递归 boundary policy、shared cache/metadata 隔离和
   4,096 continue fail-loud 上限是否完整；独立 compiler-v1 oracle 是否真实覆盖全部 4,611 条
   省略 cadence flow，PAL 87 个 machine 的联合最长 continue 链是否确为 7。
2. transition cadence 的复合 opcode、zero-delay goto、0x06 三臂、0x09 逐计数 cursor/safe-point
   是否与设计一致；`0x09 wait-3 → SAVE6 → resume` 是否只余 1 tick；delayed goto/idle gate
   是否确实没有偷跑出 R13-2。
3. dynamic auto ensure 是否保持 owner/channel 单活、epoch safe-point、scene/session/save/abort
   后无旧 runner 复活；moveEntity 是否只在成功到达后写 world.script.entityPos，同实体新走位
   抢占时是否只提交新终点。
4. current 6/6 是否在任何 sidecar I/O 前拒绝旧 epoch，v5→v6 本地晋升是否验证后只写 manifest，
   历史 4→5 bytes 是否未被重签。
5. Codex 的 e789 10/10、e796 六终态+一尾循环、s082 cadence、s048 淡出后恢复及读档不重播证据
   是否足以支持本批；若需补测，给精确可复现步骤。

输出：
- 在「R13-1 批次实现审查签字」Kimi 行签 `accept`，或写 `counter` 的精确 file:line、
  反例、缺失断言与返工边界；
- 在交接日志写复跑命令、结果与剩余风险；
- accept 只准入 R13-2，不代表 R13-Z/N3-1/C8/ED-5I 完成。
```

### 给 GLM（R13-1 数据/MG2/测试矩阵实现审查；当前下一步，可与 Kimi 并行）

```text
实现审查：N3-1 P7-R13-1 身份、auto lifecycle、cadence evidence 与 epoch 6——数据/MG2 主审
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：build；R13-1 implementation candidate 已由 Codex 实现、自验并签 accept，你只读审查，不修改实现、
生成产物、baseline、任务状态或其他 Agent 签字。Kimi/GLM 均 accept 前不得进入 R13-2；
不得标 N3-1/C8/ED-5I done。

先读：
- AGENTS.md、docs/phase2/READ-FIRST.md；
- 本卡 R13-0、R13-1 cadence 设计、GLM 设计审查、
  「R13-1 implementation candidate 与 Codex 自验」；
- docs/phase2/foundation/{script-system-design,save-system-design}.md。

重点源码/数据：
- packages/migrate/src/experimental/script-v5/
  {source-instruction-disposition,auto-flow-lifecycle,p7-canonical,p7-project,
   pal-auto-lifecycle-repair,r13-cadence-evidence,r13-cadence-mg2}.ts 及测试；
- packages/migrate/baselines/pal/_transitions/r13-cadence-v1.json；
- packages/migrate/baselines/{script-control-flow/pal-v1.json,pal/_state.json}；
- packages/reforge/src/script-project-v5.test.ts 与 save/{migration,epoch-v6.test}.ts；
- projects/pal/manifest.json 与最终 s048/s082 产物。

必须独立对账：
1. 0x04 oracle = 12 source addresses / 28 execution sites，WORD→e(word-1)；新增/漏录/伪造
   source target 是否 fail-closed。
2. 1,060 = 363 terminal + 690 repeat + 7 idle-gate；P7 354 + C8 repair 9 的层次是否准确；
   22 prefix/complex owner 是否只执行一次前缀并保留 recurrent tail。
3. source 43,503/42,024/82,953，raw 53,394/29,559，
   augmented/final 53,404/29,549，open observations 7,812；runtime 444+51 /
   58,564 / 28 / 161 / 183 及两份 digest 是否可重建。
4. P7/C8/历史 save sidecar 全部 byte-pin，新 R13 evidence append-only、K6 compatibility SHA
   稳定；独立 compiler-v1 oracle 的 4,611 条逐 flow 等价、7,896,404 bytes 与最长
   continue 链 7 是否可复现；自一致篡改 fixture 是否拒绝。
5. `pnpm --filter @type-pal/migrate test` 的单 worker 总测 72 files / 489 passed /
   1 skipped、关键 PAL exact/MG2、
   `migrate:content -- --project pal --dry-run` 的 0/0/0 是否可复现；并确认没有手改生成产物。
6. SAVE/content/minimum=6 与 A7-4=7 的现行文档是否一致，历史 v4→v5 数字未被机械改写。

输出：
- 在「R13-1 批次实现审查签字」GLM 行签 `accept`，或写 `counter` 的精确数字、站点、
  digest、断言与复现；
- 在交接日志写独立复跑范围和剩余风险；
- accept 只准入 R13-2，不代表 R13-Z/N3-1/C8/ED-5I 完成。
```

### 给 Kimi（R13-1 cadence/schema/runtime delta 设计审查）——已于 2026-07-27 执行，签 agree（附条件与 K1-K6，保留备查，勿再执行）

```text
审查任务：N3-1 P7-R13-1 auto source cadence + cursor compatibility delta
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：blocked。现有“无 schema/save delta”实现被 counter；你只读审查，不修改实现文件，
不得把当前 PAL 生成物送验，不得标 N3-1/C8/ED-5I done。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡「R13-1 身份与动态行为实现」和
  「R13-1 build 检查点与 cadence delta 阻塞」全文；
- reference/sdlpal/script.c 的 PAL_RunAutoScript；
- packages/content/src/script-v5.ts；
- packages/reforge/src/{script-compiler-v5,script-runner-v5,script-world-v5,
  script-project-v5,main}.ts；
- packages/migrate/src/experimental/script-v5/{auto-flow-lifecycle,p7-canonical,
  p7-project,p7-mg2}.ts。

已确认反例：
- 22 machine / 286 source state，101 个复合 opcode、31 个 0x09、13 个 zero-delay goto、
  6 个 0x06；
- 当前 0x0F/0x14/0x6C 被 per-command 100ms 拆成多帧，goto/0x06 又按地址方向误让步；
- frozen sidecar 至少有 s140/e2376、s150/e2466、s244/e4312、s250/e4412 的
  stage:initial cursor，直接喂新 stateMachine 会 fail-loud。

必须复审：
1. optional `ScriptStateMachineV5.cadence:'transition'` 是否为最小、PAL 无关、向后兼容的
   canonical delta；省略时旧 trace 必须不变。
2. compiler boundary policy 是否必须递归覆盖嵌套命令、shared resolver/cache key 和
   executable metadata；compiler version 是否应升 2。
3. 普通 op=to(worldTick)、zero-delay goto=continue、0x06 分臂、0x09 稳定计数 state 的
   调度与 safe-point 是否忠实；是否还有无需新增 transition kind 的反例。
4. save/content 版本策略：append-only successor，或按用户“项目未完成、不保护旧存档”的
   既有意见做显式 epoch 断开并早失败；历史 P7 ledger/sidecar 和 C8 seal 禁止重签。
5. 任一方案是否还隐含跨包公共接口/editor/MG2 delta，测试矩阵是否足够。

输出：
- 在本卡「R13-1 cadence/save delta 推进签字」Kimi 行签 agree，或写 counter 的具体字段、
  反例和返工项；
- 明确推荐 save/content 版本策略和用户必须拍板的问题；
- 写独立核对证据与最小实现顺序；不得开始实现。
```

### 给 GLM（R13-1 cadence/save/MG2 数据设计审查）——已于 2026-07-27 执行，签 agree（保留备查，勿再执行）

```text
审查任务：N3-1 P7-R13-1 auto source cadence + cursor/MG2 delta
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：blocked。你只读审查数据、save 与测试矩阵，不修改实现文件；三签前不得发布 PAL
正文或标 N3-1/C8/ED-5I done。

先读：
- AGENTS.md、docs/phase2/READ-FIRST.md；
- 本卡「R13-1 身份与动态行为实现」和
  「R13-1 build 检查点与 cadence delta 阻塞」全文；
- docs/ops/audits/{kimi,glm}-p7-r13-source-semantics-audit.md；
- packages/migrate/src/experimental/script-v5/{auto-flow-lifecycle,p7-canonical,p7-project,
  p7-mg2,pal-auto-lifecycle-repair}.ts；
- packages/content/src/{script-v5,script-transition-v5}.ts；
- packages/reforge/src/save/{migration,ops}.ts；
- projects/pal/content/migrations/script-v4-v5-save.json（只读）。

必须独立核对：
1. 1,060 pool = 363 terminal / 690 repeat / 7 idle；690 中 668 repeat-root /
   20 prefix-tail / 2 complex；新 cadence machine 当前 22 owner / 286 source state、
   101 compound / 31 wait / 13 goto / 6 branch 是否准确。
2. 0x09 n=1/2/13 展开为稳定计数 state 后的状态数、ID、逐拍 cursor 与存读档恢复；
   0x06 概率必须是 101-threshold。
3. frozen sidecar 中 stage→state 的全部受影响 alias，不只抽样四个；区分“无 cursor”与
   “旧 initial 已到 safe-point”的可证明 successor，无法证明时必须 fail closed。
4. append-only successor 与显式 epoch 断开两方案对 baseline v2、MG2、P7 ledger、
   compatibility sidecar、C8 seal 的影响；任何历史控制账不得原地重签。
5. 负向/篡改矩阵、二跑 0/0/0、e796+s082+0x09+复合动画浏览器矩阵是否闭合。

输出：
- 在本卡「R13-1 cadence/save delta 推进签字」GLM 行签 agree，或写 counter 的精确漏项；
- 记录独立数字、受影响 cursor 全集、推荐版本策略和测试 golden；
- 不得开始实现。
```

### 给 Kimi（R13-0 架构 / runtime 实现审查；已完成，历史留档）

```text
审查任务：N3-1 P7-R13-0 控制面实现——精确处置证据与 runtime 架构主审
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
发出时状态：build；R13-0 Codex 实现与自验完成，Kimi/GLM 实现审查 pending；两席 accept
前不得进入 R13-1。你只读审查，不修改实现文件，不提前标 N3-1/C8/ED-5I done。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡「P7-R13 三方差集合并与 build 返工设计门禁」、Kimi K1-K6、
  「R13-0 控制面实现与 Codex 自验」；
- docs/ops/audits/{kimi,glm}-p7-r13-source-semantics-audit.md 与
  codex-p7-r13-three-way-adjudication.md。

重点源码：
- packages/migrate/src/experimental/script-v5/
  {source-execution-census,source-instruction-disposition,runtime-capability-audit}.ts；
- packages/migrate/src/{translate-events,script-control-flow-audit,pal-migration}.ts；
- packages/migrate/scripts/migrate-content.mts；
- 对应 .test.ts 与 source-instruction-disposition.pal.test.ts。

必须独立核对：
1. 同 address+owner 多 body（尤其 @14461/scene）是否只能由 exact bodyId outcome 关闭；
   registry target、scene root、0x6D override、folded hostile 的绑定时机是否正确，unbound
   overlay outcome 是否绝不参与 closure。
2. source-backed validator 是否真正从 source/P0/P6/P7/final 重推，无法通过改 proof 后重算
   report digest 自封；canonical/C8/scene repair/asset exact target 任一 final drift 是否退回 open。
3. P0 entryAddress 与 direct source.addresses 拆分是否正确；6 个 legacy-alias 不得借入口地址，
   hook installer 不得重新把 entry 灌回 direct 集。
4. runtime 444+51 matrix 是否完整 fail-closed、28 个 confirm debt 是否真实；尤其确认当前静态
   矩阵未被当作 runtime-equivalent 证明，并明确 R13-Z host-backed registry/验证硬门禁。
5. 本批确实没有 schema/save/跨包接口/运行时行为/PAL 正文改动；完整报告尚未持久发布是否被
   正确留给 R13-Z，而不是遗漏 K6。

验证建议：
- pnpm --filter @type-pal/migrate typecheck
- pnpm --filter @type-pal/migrate exec vitest run --maxWorkers=1 \
    src/experimental/script-v5/source-execution-census.test.ts \
    src/experimental/script-v5/source-instruction-disposition.test.ts \
    src/experimental/script-v5/runtime-capability-audit.test.ts \
    src/translate-events.test.ts
- 资源允许时复跑 PAL exact；否则审阅 Codex 已记录的 175.03s / 2.24GB 证据并说明未独立复跑。

输出：
- 在「R13-0 批次实现审查签字」Kimi 行签 accept，或写 counter 的具体文件/断言/复现；
- 在交接日志记录命令、数字、digest 与剩余风险；
- accept 也只代表 R13-0 可交 GLM/进入下一批门禁，不代表运行时缺陷已修复。
```

### 给 GLM（R13-0 数据 / 覆盖实现审查；当前下一步）

```text
审查任务：N3-1 P7-R13-0 控制面实现——全域 census、三层守恒与负向矩阵主审
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：build；R13-0 Codex 实现与自验完成，Kimi 已由用户转述 accept，GLM 实现审查
pending；GLM accept 前不得进入 R13-1。你只读审查，不修改实现文件，不提前标
N3-1/C8/ED-5I done。

先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
- 本卡 P7-R13 合并裁决、GLM 设计准入、R13-0 实现与自验；
- docs/ops/audits/glm-p7-r13-source-semantics-audit.md、
  kimi-p7-r13-source-semantics-audit.md、
  codex-p7-r13-three-way-adjudication.md。

重点源码与数据：
- packages/migrate/src/experimental/script-v5/
  {source-execution-census,source-instruction-disposition,runtime-capability-audit}.ts 及测试；
- packages/migrate/src/{translate-events,script-control-flow-audit}.ts；
- packages/migrate/baselines/script-control-flow/pal-v1.json；
- packages/migrate/scripts/migrate-content.mts。

必须独立对账：
1. 43,503 instructions / 42,024 reachable / 82,953 sites；raw 53,363/29,590、
   augmented 53,373/29,580、final 53,373/29,580，三层各自严格守恒。
2. 7,824 observations 的层级事实：15 item pending-use raw open 但 augmentation/final 有 exact
   closure；14 skill pending 仅 314/344/392/394 四条关闭；58 pending/silent-empty throw
   final 继续 open。不得把 observation 总数或 open site 数写成“迁移完成”。
3. 6 个 legacy-alias 精确 id→entry 且 direct addresses=[]；4,901 translated-target 全部
   entryAddress∈addresses；P0 baseline digest abd860…a9c0fa4。
4. @14461 双 body、防 final target 删除/C8 behavior drift/s048 repair drift、自重签伪造等
   负向 fixture 是否会 fail-closed；source-backed 校验是否覆盖 rawProjection 与三层 exact targets。
5. runtime 74×6、skill 17×3、58,508 uses、28 refused/debts、161 enemy casts、183 enemy effects
   是否从最终 PAL 可重建；静态 host-binding 与持久 publication report 两项必须留作 R13-Z 硬门禁。
6. migrate:content dry-run 的 0/0/0 和两份 digest 是否可复现；没有 `projects/pal/**` 写入。

输出：
- 在「R13-0 批次实现审查签字」GLM 行签 accept，或写 counter 的具体数字、站点、断言与复现；
- 在交接日志记录独立复跑范围和结论；
- accept 只允许 R13-0 批次收口；R13-1～R13-Z、N3-1 最终 accept 与 C8/ED-5I 回归仍未完成。
```

### 给 Codex（P7-R13 build 实现；已启动并完成 R13-0，后续须等本批双审）

```text
接手任务：N3-1 P7-R13 源语义闭包返工 build 实现（R13-0 → R13-Z 分批）
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前状态：rework → 可进入 build；Codex / Kimi / GLM 三方设计签均为 agree（2026-07-26），
无 counter。你是唯一 Coding Owner。

必须先读：
- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md
- 本卡「P7-R13 三方差集合并与 build 返工设计门禁」全节、
  「GLM P7-R13 设计准入复审」、「Kimi P7-R13 设计准入复审」(K1-K6 必落钉)
- docs/ops/audits/codex-p7-r13-three-way-adjudication.md（分批与口径的唯一事实源）
- 两份独立审计报告（证据，不是签字）

实现纪律：
1. 严格按 R13-0 → R13-Z 顺序；R13-0 只建控制面，不改运行时行为、不重迁正文。
2. 逐批落实 K1-K6：0x08 先分三类 census 再投影（臂内 checkpoint 走 escape hatch 另开三签）；
   idleFrames 按 trigger mode 分流；terminal idle 零副作用可证；confirm 接 v5 commandOutcome
   并覆盖 abort/session/save barrier；battleEnd 多 stage 与 choreography unsupported cell
   生成期 fail-loud；onDefeated 改 canonical runner 属公共接口 delta 另签。
3. 任何新增 canonical schema、save 字段或跨包公共接口，对该 delta 另开三签，不得用总签字覆盖。
4. 投掷 58 件逐件上游补回（含 10 条 0x42-only silent-empty），验收 76/76/0。
5. 每批在 Build 节留实现摘要与门禁证据；遇钉子不成立停在批内或转 blocked，不跨批堆债。
6. R13-Z：无 open-debt、runtime matrix 无 stub/恒定返回/未申报 log-only、全量重迁二跑
   零 diff、浏览器金丝雀（e796/s048/s093/confirm 两臂/投掷/enemy-483/519/palette）全过后，
   才重新执行 P7-R12 的 Kimi runtime/save 终审与 GLM 数据/排序终审。不得提前标 done；
   N3-1、C8、ED-5I 均不沿用旧候选。
```

### 给 Kimi（P7-R13 三方合并设计与 runtime 架构准入复审）——已于 2026-07-26 执行，签 agree（保留备查，勿再执行）

```text
设计准入复审：N3-1 P7-R13 源语义闭包返工——runtime / schema / 调度主审
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
独立报告：docs/ops/audits/kimi-p7-r13-source-semantics-audit.md
GLM 报告：docs/ops/audits/glm-p7-r13-source-semantics-audit.md
Codex 合并裁决：docs/ops/audits/codex-p7-r13-three-way-adjudication.md
当前状态：rework；P7-R13 build 准入 blocked。只读设计复审，不得修改实现、生成产物、
baseline、任务状态或 P7 最终 accept。

先读：
  - AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
  - 任务卡 P1-5/P1-6/P1-7、P7-R11/R12/R13 及新的三方合并段；
  - 三份审计文档；
  - packages/migrate/src/{translate-events,translate-enemy-scripts,migrate-content}.ts 与
    packages/content/src/migration-diagnostic.ts；
  - packages/reforge/src/{main,script-runner-v5,script-world-v5,script-project-v5,
    script-host-adapter-v5}.ts 与 battle/battle-session.ts。

必须复核：
  1. Codex 对你报告的纠正是否成立：0x04 callee 链、0x08 副作用统计、当前 choreography /
     battleEnd 实害与风险分界；若反对须给 CFG/最终产物反证。
  2. R13-0 的 source-site×context disposition、runtime capability matrix 是否足以 fail-closed，
     且不把 PAL opcode/IP 重新引入 canonical author model。
  3. dynamic auto 只能幂等 ensure，现有 runner 依靠 epoch 在 safe point 换手；auto end0
     终止投影、scene/session/save/abort 不产生双 runner或旧 runner 复活。
  4. 0x08 首次跑完整正文、下次从后缀 cursor 与 idleFrames 有限状态方案是否可由现有 schema
     干净表达；不能表达时明确指出需要另签的最小 schema/save delta。
  5. confirm 复用 Reforge 两框状态机；敌人翻译/runtime 不继续独立白名单或第二解释器；
     onDefeated canonical world 写入边界是否干净。
  6. R13 分批是否可独立提交、回滚、验收；是否有必须前置或禁止混做的架构项。

输出：
  - 在“P7-R13 rework -> build 设计推进签字”Kimi 行签 `agree`，或写 `counter` 的具体
    file:line、反例、替代设计与需重签字段；
  - 更新交接日志并给出下一位 GLM/Codex 的可复制提示词；
  - 签字齐前明确“不得开始实现”；不得把 N3-1/C8/ED-5I 标 done。
```

### 给 GLM（P7-R13 三方合并设计与数据门禁准入复审）——已于 2026-07-26 执行，签 agree（保留备查，勿再执行）

```text
设计准入复审：N3-1 P7-R13 源语义闭包返工——全域 census / 生成门禁 / 测试矩阵主审
任务卡：docs/ops/tasks/N3-1-script-control-flow-modernization.md
独立报告：docs/ops/audits/glm-p7-r13-source-semantics-audit.md
Kimi 报告：docs/ops/audits/kimi-p7-r13-source-semantics-audit.md
Codex 合并裁决：docs/ops/audits/codex-p7-r13-three-way-adjudication.md
当前状态：rework；P7-R13 build 准入 blocked。只读设计复审，不得修改实现、生成产物、
baseline、任务状态或 P7 最终 accept。

先读：
  - AGENTS.md、docs/phase2/READ-FIRST.md；
  - 任务卡 P0/P1-7/P7、P7-R11/R12/R13 及新的三方合并段；
  - 三份审计文档；
  - packages/migrate/src/{migrate-content,pal-migration,translate-events,
    translate-enemy-scripts,migration-validate}.ts 与
    packages/content/src/migration-diagnostic.ts；
  - projects/pal/content/{items,enemies}.json 与相关 scene/baseline/ledger。

必须复核：
  1. 完整 build 口径：36 checkpoint（2 covered/34 open）、11 idleFrames、12 owner、
     26 confirm、76 source throw / 18 final / 58 missing（48 pending+10 silent）、
     12 pending enemy、14 palette（4 baked/10 open）、10 pending+4 lossy skill。
  2. 纠正你报告中的 0x08 no-op、pendingThrow 47/武器不可投掷、loadScene 无 260ms、
     lossySkills itemId、最终无 pending=无缺失等结论；若反对须给可复跑反证。
  3. R13-0 是否能对 43,503 source corpus、可达 owner/context、raw migrate、overlay/
     augmentation 与最终 PAL 做守恒；任何 silent-empty/note/pending/lossy 是否都会阻断。
  4. 573 transition 只做机器等价审计，1,060 auto variant 只做 end/loop 分类，不把审计池
     直接报成 bug。
  5. R13-1..R13-Z 每批的 source/product/runtime/save/browser 测试是否足以让旧实现稳定红灯；
     生成 diff 白名单、MG2、二跑零计划与报告口径是否完整。

输出：
  - 在“P7-R13 rework -> build 设计推进签字”GLM 行签 `agree`，或写 `counter` 的具体
    数量、路径、断言、反例与替代方案；
  - 更新交接日志并给出下一位 Codex 的可复制提示词；
  - 签字齐前明确“不得开始实现”；不得把 N3-1/C8/ED-5I 标 done。
```

### 给 Kimi（P7-R13 架构与源语义独立红队；已完成，勿再执行）

```text
独立审计任务: N3-1 P7-R13 源指令语义闭包——架构 / SDLPal 语义红队
任务卡: docs/ops/tasks/N3-1-script-control-flow-modernization.md
审计基线: d263efd3（实现核心为 c3d620a9）
当前状态: rework；只读审计，不得修改实现、生成产物、baseline、任务状态或签字。

目标:
  不以 Codex 已列问题为边界，从 SDLPal 和一阶段真值反向审计第二阶段“源脚本 →
  canonical → runtime”是否仍有漏迁移、隐式状态丢失或被错误近似的情况。先独立枚举，
  完成后才与任务卡 P7-R13 的 Codex 金丝雀做差集。

先读:
  - AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
  - docs/phase2/foundation/{phase1-knowledge-harvest,n-event-script-audit}.md；
  - docs/phase1/{engineering-notes,status/opcode-status}.md；
  - 本卡 P1-5/P1-7/P7、P7-R11、P7-R12、P7-R13；
  - reference/sdlpal/script.c、scene.c；
  - packages/game/src/core/event-system.ts；
  - packages/migrate/src/{translate-events,translate-enemy-scripts,migrate-enemies,
    migrate-content,script-graph,script-control-flow-audit}.ts；
  - packages/migrate/src/experimental/script-v5/ 与 packages/reforge/src/script-*.ts。

审计方法（必须独立执行）:
  1. 从 SDLPal opcode switch、一阶段已验证行为和隐式全局状态出发建立“语义生产者 /
     消费者 / 持久化点”清单，不从 translate-events.ts 的已支持表反推完整性。
  2. 对每个可达源操作核对最终去向：显式 canonical 命令、结构化 transition、
     有证据的 fold、资产期吸收、runtime 等价、真实 no-op、批准的有损项；任何只 note、
     push(undefined)、pending 后继续发布、丢操作数或固定参数近似都单独列账。
  3. 特别审计但不得止于：checkpoint/recovery、fade/FBP/palette/redraw、换图/换场景、
     战斗进入/回合/战后脚本、动态行为绑定、存档恢复与隐式引擎 flag。
  4. 对 suspected 项沿 binding/recovery/call/goto 找到真实 owner 与 runtime entry，
     再检查最终 projects/pal、v5 transition ledger、overlay/augmentation 和 Reforge host；
     不得只看“直接 owner”或中间 v4 产物。
  5. 反查当前门禁：解释为什么 gaps=[]、flowCuts=0、P7 ledger、control-flow audit 或测试
     没有挡住；提出能阻止同类回归的最小结构性门禁，不能只建议加若干 golden。

输出格式:
  - 一份独立审计表：类别、精确 source address/opcode/operands、可达 owner/path、
    SDLPal/一阶段语义、最终 canonical/runtime 去向、用户可见影响、置信度；
  - 分成“确认最终缺失”“已被等价补回”“仅风险待动态验证”“真实 no-op/批准近似”四组；
  - 单列你发现但 Codex P7-R13 金丝雀没有覆盖的新增差集，以及你认为 Codex 误报的项目；
  - 给出可复跑命令、计数与 file:line 证据；禁止只写定性意见；
  - 将完整报告交给用户转回 Codex；为保持双盲，不要读取/等待 GLM 报告，也不要先改任务卡。
    两席都返回后由 Codex 统一回填；不得改实现、状态或签 accept。
```

### 给 GLM（P7-R13 全域数据覆盖独立审计；已完成，勿再执行）

```text
独立审计任务: N3-1 P7-R13 源指令语义闭包——全域 census / 数据守恒 / 门禁红队
任务卡: docs/ops/tasks/N3-1-script-control-flow-modernization.md
审计基线: d263efd3（实现核心为 c3d620a9）
当前状态: rework；只读审计，不得修改实现、生成产物、baseline、任务状态或签字。

目标:
  独立建立全量“源事实 → 迁移去向 → 最终运行入口”总账，检查 Codex 审计是否漏域、漏边、
  误算可达性或把中间报告当最终产物。不要按 Codex/Kimi 清单逐条打勾；先机器化普查，
  再做三方差集。

先读:
  - AGENTS.md、docs/phase2/READ-FIRST.md；
  - 本卡 P0 计数规则、P1-7 ledger、P7 发布门禁、P7-R11～P7-R13；
  - docs/phase2/foundation/{script-census,n-event-script-audit,
    phase1-knowledge-harvest}.md；
  - data/extracted/events/{all,shared,scene-*}.json 与 data/extracted/data/scene/；
  - packages/migrate/src/{translate-events,translate-enemy-scripts,migrate-content,
    migrate-enemies,script-graph,script-control-flow-audit,migration-validate}.ts；
  - packages/migrate/src/experimental/script-v5/、projects/pal/content/ 与相应 baseline。

必须独立普查:
  1. 以全部 43,503 条源命令和所有外部入口为母集，跨 scene hook/entity trigger/auto、
     item use/throw/equip、skill use/success、enemy ready/turnStart/battleEnd、共享链和
     动态 binding/recovery 边统计可达语义；分别给 direct owner 与沿 binding 后 owner。
  2. 枚举所有可能吞语义的代码路径：push(undefined)、note/known-deferred/knownNoOp、
     pending/lossy 后继续发布、continue/break 丢节点、fold/overlay/augmentation、
     默认值或固定值替换源操作数。每一类必须给源站点数、可达数、最终仍缺数和证据。
  3. 对照最终 projects/pal，而非只看 migrateAll 中间报告；确认 C8/overlay/真彩烘焙等
     后置步骤哪些真正补回，哪些只消掉 diagnostics，哪些仍发布 partial 数据。
  4. 为 source execution/binding/recovery edge 建立守恒下界，重点检查 0x08、advance/reset、
     “引用目标含段转移”、敌方脚本游标和 save resume；禁止把 573 条候选直接当 573 个 bug。
  5. 对普通迁移、敌人、技能、物品、装备、投掷分别核对 pending/lossy 与最终可运行条目；
     检查现有测试是否只钉数量/报告而容许半成品发布。
  6. 独立复跑并记录：migrate dry-run、script-control-flow audit、相关 PAL tests；必要时写
     一次性只读统计命令，但不得提交脚本或改文件。

输出格式:
  - 全域矩阵：domain、source roots/commands、reachable、显式生成、结构转换、证据折叠、
    true no-op、approved lossy、unresolved；每个 unresolved 可回溯到 source address 和
    最终 owner/path；
  - 分成“确认最终缺失”“已补回”“风险待验证”“真实 no-op/批准近似”；
  - 单列 Codex 清单之外的新增项、对 Codex 数字或结论的反证，以及无法收敛的口径；
  - 提出 fail-closed 门禁和回归矩阵，明确哪些检查必须阻断生成；
  - 将完整报告交给用户转回 Codex；为保持双盲，不要读取/等待 Kimi 报告，也不要先改任务卡。
    两席都返回后由 Codex 统一回填；不得改实现、状态或签 accept。
```

### 给 Kimi（P7-R12 runtime/save 调度终审；暂缓，P7-R13 差集合并后再执行）

```text
终审任务: N3-1 P7-R12 场景出口触发与 SAVE activation gate 竞态
任务卡: docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前实现基线: c3d620a9 fix(reforge): preserve scene exits across save barriers
上一基线: 39ecad91 fix(phase2): restore PAL scene script semantics
当前状态: rework；Codex 已完成实现、自验和三路内部只读红队，但本轮修改 runtime host contract、
  safe-point/save 调度与全局 runner，必须重新终审，N3-1 不得标 done。
你的职责: 只读审查 runtime 架构、竞态安全、SAVE 同步边界与 runner 所有权；不得修改实现文件，
  不得自行标 done。
先读:
  - AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
  - 本卡“P7 canonical v5 全量发布”“P7-R11”“P7-R12”及 P1-5/P1-6 冻结设计；
  - docs/phase2/foundation/phase1-knowledge-harvest.md；
  - docs/phase2/foundation/save-system-design.md。
重点源码:
  - packages/reforge/src/script-world-v5.ts；
  - packages/reforge/src/script-project-v5.ts；
  - packages/reforge/src/script-project-v5.test.ts；
  - packages/reforge/src/main.ts。
必须核对:
  1. 已解析且存在的 trigger/auto/hook 在 gate 关闭时是否等待 opened、等待期间不持 lease，
     连续 barrier 是否继续等待；行为缺席是否仍立即返回 false。
  2. AbortSignal、不同 scene 与同 ID scene session replacement 是否都能阻止旧 activation
     reopen 后复活；sceneSwitchIntent/worldMutationIntent 是否足以覆盖切场景、读档和 world 替换。
  3. interactive trigger 外层 runner 占用是否保持；外部 teleportOut 是否占用 runner 并完整续接
     onEnter，已有 runner 时是否不会二次抢占。
  4. withSaveBarrier 是否只允许同步快照，异常/thenable/timeout 是否总能 reopen gate；
     IndexedDB、thumbnail、metas refresh 是否确实移出 barrier。
  5. snapshot/write 两级队列是否保持 auto/quick/manual 请求顺序；thumbnail 早失败是否无
     unhandledrejection；savedTimes 是否只在提交成功后推进，失败是否不毒死队尾。
  6. 是否存在永久等待、重复执行、跨场景误执行、save UI 假失败或全局 runner 泄漏的新反例。
建议独立复跑:
  - pnpm --filter @type-pal/reforge exec vitest run \
      src/script-project-v5.test.ts src/script-world-v5.test.ts \
      src/save/save-store.test.ts src/save/save-ops.test.ts
  - pnpm --filter @type-pal/reforge test
  - pnpm typecheck && pnpm lint && pnpm --filter @type-pal/reforge run build
输出:
  - 在本卡 P7 review 签字表 Kimi 行签 `accept`，或写 `counter` 的具体 file:line、竞态交错、
    复现命令和返工要求；
  - 在交接日志记录独立复跑数字与结论；
  - accept 后明确“仅 Kimi 席位通过，仍待 GLM 与用户验收”；不得修改实现，不得标
    N3-1、C8 或 ED-5I done。
```

### 给 GLM（P7-R12 回归覆盖与存档排序终审；暂缓，P7-R13 差集合并后再执行）

```text
终审任务: N3-1 P7-R12 场景出口触发竞态、存档排序与测试矩阵
任务卡: docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前实现基线: c3d620a9 fix(reforge): preserve scene exits across save barriers
当前状态: rework；Codex 已自验，GLM 需对旧签字后的新增 runtime/save/coverage delta 独立终审。
执行顺序: 等 Kimi 对同一基线完成只读架构/runtime 终审后再执行；不得修改实现文件，不得标 done。
先读:
  - AGENTS.md、docs/phase2/READ-FIRST.md；
  - 本卡“P7-R12”、P1-6/P1-8 与 P7 发布控制面；
  - packages/reforge/src/script-project-v5.test.ts；
  - packages/reforge/src/{script-world-v5,script-project-v5,main}.ts。
必须核对:
  1. 测试是否覆盖 gate 关闭时 trigger 恰好一次、真实 auto safe point 交错、auto/hook 等待、
     行为缺席、不同 scene、同 ID session、abort 和异步 snapshot 拒绝。
  2. 每个并发断言是否真的钉住执行时序，而非只等最终状态；旧实现是否会稳定红灯。
  3. auto/quick/manual 的 snapshot 与 write 是否按请求发生顺序，thumbnail promise 早失败、
     store 失败、metas refresh 失败和后续请求恢复是否有遗漏风险。
  4. s048/e789 数据是否原本正确，本轮是否保持零 migration/零 projects/pal 手改；不得把
     runtime 竞态错误伪装成扩大触发范围或数据修补。
  5. Reforge 67 files / 619 passed、root typecheck、Biome 961 files、production build、
     diff check 和真实浏览器 10/10、0 console error/warning 证据是否成立。
  6. capability map、N3-1/C8/ED-5I 状态是否保持未完成，文档是否没有把内部红队 accept
     冒充三贤人正式签字。
建议独立复跑:
  - pnpm --filter @type-pal/reforge exec vitest run \
      src/script-project-v5.test.ts src/script-world-v5.test.ts
  - pnpm --filter @type-pal/reforge test
  - pnpm typecheck && pnpm lint
输出:
  - 在本卡 P7 review 签字表 GLM 行签 `accept`，或写 `counter` 的具体测试缺口、数据路径、
    复现命令和返工项；
  - 在交接日志记录独立数字与 runtime/data/schema 结论；
  - accept 后明确“GLM 席位通过，可交用户体验确认与 Codex 最终收口”；不得自行标
    N3-1、C8 或 ED-5I done。
```

### 给 Kimi（P7-R11 架构、迁移边界与运行时终审；已失效，勿再执行）

```text
终审任务: N3-1 P7-R11 PAL 隐式淡入与 s048 进场 checkpoint 语义
任务卡: docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前实现基线: 39ecad91 fix(phase2): restore PAL scene script semantics
上一任务卡基线: df633d18 docs(ops): record C8 final review signatures
当前状态: rework；Codex 已完成实现、自验和两轮内部红队，但 P7-R11 是旧签字后的新增高风险
  migration/runtime delta，Kimi / GLM 必须重新终审，N3-1 不得标 done。
你的职责: 只读审查架构、第一阶段语义还原、post-P7 边界、Reforge runtime/SAVE cursor；
  不得修改实现文件，不得自行标 done。
先读:
  - AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md；
  - 本卡“P7 canonical v5 全量发布”“P7-R11”与 P1-5/P1-6 冻结设计；
  - docs/phase2/foundation/phase1-knowledge-harvest.md；
  - reference/sdlpal/script.c:2664-2670,3267-3293,3335-3367；
  - reference/sdlpal/scene.c:500-508；
  - packages/game/src/core/event-system.test.ts:4231-4260。
重点源码:
  - packages/migrate/src/experimental/script-v5/pal-scene-semantic-repair.ts；
  - packages/migrate/src/experimental/script-v5/p7-generated.ts；
  - packages/reforge/src/loader-v5.pal.test.ts；
  - packages/reforge/src/script-host-adapter-v5.test.ts；
  - packages/editor/src/core/playback.test.ts。
必须核对:
  1. s048/s110/s172 的 explicit fade-in 是否精确对应 0x93 + 0x05/0x09，尤其 s110 是否保持
     “先等首帧再淡入、剩余 27 帧”的顺序和总时长。
  2. repair 是否位于 C8 后、MG2 target 前，只改 canonical generated snapshot；不得重签
     P7 ledger/C8 seal/SAVE sidecar，也不得手改 projects/pal。
  3. source opcode/三个 operand/label、owner、对话、唯一锚点与目标形状是否全部 fail-loud；
     半修、重复淡入、错时长、截断 dlg.3818 或 completed 回环不得被静默接受。
  4. s048 0x08 本次激活继续跑尾部、下次激活进入空 completed 的语义是否成立；真实 SAVE 5
     round-trip 后新 runtime 第二次 onEnter 是否零 effect。
  5. editor preview 与 Reforge 共用正确 canonical 数据，修复不是只在 UI 或 host 层打补丁。
  6. 不得把本轮 s048 修复外推成全局 0x08 已收口；36 站点及 1575/10315/19301 嫌疑须保留
     为独立高风险审计债务。
建议独立复跑:
  - pnpm --filter @type-pal/migrate exec vitest run \
      src/experimental/script-v5/pal-scene-semantic-repair.test.ts \
      src/pal-scene-semantic-repair-product.test.ts
  - pnpm --filter @type-pal/reforge exec vitest run \
      src/loader-v5.pal.test.ts src/script-host-adapter-v5.test.ts
输出:
  - 在本卡 P7 review 签字表 Kimi 行签 `accept`，或写 `counter` 的具体 file:line、反例、
    复现命令和返工要求；
  - 在交接日志记录独立复跑数字与结论；
  - accept 后明确“仅 Kimi 席位通过，仍待 GLM 与用户验收”；不得修改实现、不得标 N3-1 done。
```

### 给 GLM（P7-R11 数据、MG2、测试矩阵与文档终审；已失效，勿再执行）

```text
终审任务: N3-1 P7-R11 PAL 场景语义生成数据、MG2 与覆盖矩阵
任务卡: docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前实现基线: 39ecad91 fix(phase2): restore PAL scene script semantics
当前状态: rework；Codex 已自验，GLM 需对旧签字后的新增 migration/data delta 独立终审。
执行顺序: 等 Kimi 对同一基线完成只读架构/runtime 终审后再执行；不得修改实现文件，不得标 done。
先读:
  - AGENTS.md、docs/phase2/READ-FIRST.md；
  - 本卡“P7-R11”、P1-6/P1-7/P1-8 与 P7 发布控制面；
  - packages/migrate/src/experimental/script-v5/pal-scene-semantic-repair.ts 及测试；
  - packages/migrate/src/experimental/script-v5/p7-generated.ts；
  - packages/migrate/src/experimental/script-v5/c8-item-use-mg2.ts；
  - packages/reforge/src/loader-v5.pal.test.ts。
必须核对:
  1. project 与 baseline 的 s048/s110/s172 是否字节成对；_state 是否只更新这三份 scene hash。
  2. s048 是否 24 条 initial + 空 completed，s110 是否 clear/40/in600/1080，s172 原
     legacy-002/playMusic 是否保持。
  3. repair source/target evidence、输入不变、幂等、半修/重复/截断负测是否充分；路径/id、
     battlefield、普通 end 漂移是否 fail-loud。
  4. 正式生成后 repeat 与独立 dry-run 是否 `0/0/0`；P7 ledger、C8 seal、baseline/project
     SAVE sidecar SHA-256 是否分别保持
     `41263ba1…6b12`、`325d52ed…3a24`、`30ce8717…2ed0`。
  5. migrate 全量 65 files / 436 passed + 1 skipped、Reforge 610、editor 767、root
     typecheck/lint/build 的记录是否可复现或有充分独立抽查。
  6. 36 个 source 0x08 站点是否仍明确列为独立债务，没有被本轮范围或能力状态静默关闭。
建议独立复跑:
  - pnpm --filter @type-pal/migrate exec vitest run \
      src/experimental/script-v5/pal-scene-semantic-repair.test.ts \
      src/pal-scene-semantic-repair-product.test.ts \
      src/experimental/script-v5/p7-mg2.test.ts \
      src/experimental/script-v5/c8-item-use-mg2.test.ts
  - pnpm --filter @type-pal/migrate run migrate:content
  - shasum -a 256 packages/migrate/baselines/pal/_transitions/script-v4-v5.json \
      packages/migrate/baselines/pal/_transitions/c8-item-use-v5-v1.json \
      packages/migrate/baselines/pal/content/migrations/script-v4-v5-save.json \
      projects/pal/content/migrations/script-v4-v5-save.json
输出:
  - 在本卡 P7 review 签字表 GLM 行签 `accept`，或写 `counter` 的具体数据路径、断言、命令和
    返工项；
  - 在交接日志记录独立数字、digest 与数据/schema 结论；
  - accept 后明确“GLM 席位通过，可交用户体验确认与 Codex 最终收口”；不得自行标 N3-1、
    C8 或 ED-5I done。
```

### 给 GLM（P7-R10 架构 + 数据 + 测试 + 文档合并终审；已失效，勿再执行）

```text
终审任务: N3-1 P7-R10 canonical v5 作者脚本 UX、引用闭包、真实预览与 C8 集成后的合并终审
任务卡: docs/ops/tasks/N3-1-script-control-flow-modernization.md
当前候选基线: 0d4aa48b fix(editor): make reference jumps visible
P7-R9 基线: 5b6bb58e fix(editor): sync entity script selection
C8-R2 core: 88277465 feat(phase2): close C8 item-use migration
首次发布基线: 9a668686 feat: publish canonical script v5
统一组件基线: 18a66216 fix(editor): unify canonical script authoring
本轮返工与集成增量: 18a66216..0d4aa48b
当前状态: rework；Codex 已完成自验，但在用户体验确认前尚未重签 accept。
执行条件: 只有用户明确确认 P7-R10 体验可接受后才开始本终审；确认前不得执行、不得改签字。
P3-P7 批次中 Kimi 曾额度耗尽，用户批准该批由 GLM 合并代审；Kimi 后续恢复并完成 C8
  最终审查不追溯撤销这项 N3 历史豁免。你同时承担原 Kimi 架构/调度席位和 GLM 数据/覆盖席位。
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
  17. 物品同页和场景跨页引用是否都显示可理解的“已定位到”反馈，精确选择并把目标指令滚入
      可视区；连续点击同一引用是否重新反馈；布局测量重渲染不得取消待执行滚动，过期 revision
      不得误聚焦新 owner。
  18. C8-R2 的 20 件私有/通用/放置用途是否继续复用 canonical v5 作者模型；GLM 已对
      `88277465` 的 100/0 与 seal/MG2 签 core accept，但本轮仍须确认 N3 final baseline 包含
      该集成且 `88277465..0d4aa48b` 没有破坏数据账。
  19. 独立复跑 editor check、root typecheck/lint、editor build；抽查 `9a668686` 前轮已通过的
      content/reforge/migrate 发布门禁仍未被返工破坏，并核对文档与 capability map 没有提前把
      N3-1/C8/ED-5I 标 done。
输出:
  - 在本卡 P7 review 签字表 GLM 行签 `accept`，或写 `counter` 的文件/断言/复现命令/返工项；
  - 在交接日志写独立复跑数字、digest、架构/数据结论；
  - accept 后明确“GLM 合并终审通过，可由 Codex 收口”，但不得自行标 N3-1 done；
  - 不得把 C8/ED-5I 标 done，它们仍须 N3-1 后独立回归。
```

历史记录（当时下一步，已被上方 R13-5 当前小节 supersede）：R13-2 三席 `accept` 已齐，
migrate 测试性能债也已按 fast/release 双门收口；
Codex 作为唯一 Coding Owner 进入 **R13-3（58 件投掷闭包）**。R13-3 后仍有
confirm/enemy/approved-lossy 与 R13-Z publication，完成前不得把 N3-1 标记 done，
C8 / ED-5I 的下游验收依赖不变。

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

### 给 Codex（P7 全量重迁、验收与文档；已完成，勿再执行）

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
