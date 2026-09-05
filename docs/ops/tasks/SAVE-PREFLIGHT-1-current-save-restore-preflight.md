# SAVE-PREFLIGHT-1 - 当前存档预检与恢复失败隔离

Status: draft
Phase: phase2
Capability: X1（审计 B-04 修复，不新增能力格）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Unavailable Agents: none
Branch: main
Revision: r1
Evidence Baseline: 5462d01a

## 目标与范围

损坏的当前版本存档在停止旧脚本、替换世界或提交场景之前被拒绝，并提供稳定错误反馈；合法存档保持现有恢复行为。
与 [SAVE-ISOLATION-1](SAVE-ISOLATION-1-project-workspace-save-scope.md) 分卡：本卡不定义存档命名空间或副本共享策略。
按既定顺序先落实隔离卡的产品边界；本卡可独立设计审查，不能借此宣称已经越过 build 准入。

- 范围内：当前 SAVE8 载荷结构预检、恢复使用的引用准备、槽/快速/文件恢复共路、错误与取消收尾、反例回归。
- 范围外：SAVE9/content21、旧存档修复或升级、生成工程改写、第一阶段 A-04/05/06、任意磁盘故障恢复框架。
- 不改战斗/数值公式、地图默认落点、碰撞/穿墙语义、存档 UI 布局或正常读档后的临时状态清理规则。
- 不把已确认的 B-04 外推成“所有坏字段已穷举”或“任意提交后异常均可回滚”。

## 前提真值门

### 一句话前提

当前 codec 只校验部分持久子树，坏金额、非法朝向和空值队伍仍能进入恢复调用链，分别造成状态污染或未收口异常。

| 维度 | 当前真值 | 一手证据 |
|---|---|---|
| 原版 / primary source | 这是 TypeScript 当前合同与实际恢复调用顺序的工程缺陷，不需要从原版推导新的存档格式；IndexedDB 结构化存储不承担应用字段校验。 | `packages/reforge/src/save/types.ts:38`；[IndexedDB 值存储](https://w3c.github.io/IndexedDB/#value-construct)；本卡直接执行真实函数体的探针 |
| 第一阶段 | 单游戏存档 API 拷贝并存取 GameState，不验证当前 Reforge WorldState；只借鉴“所有恢复入口共路”经验，不移植旧 upgrader。 | `packages/game/src/core/save/api.ts:55`、`:67`；[harvest X9](../../phase2/reference/phase1-knowledge-harvest.md#x9-存档版本化迁移--读档归一化) |
| 当前二阶段 | SAVE8/content20 header 有 guard；normalize 深拷贝并校验 script、awareness、skillUseCounts、lifecycles，但不验证 money/party/position 核心形状。 | `packages/reforge/src/save/current-codec.ts:62`、`:91`；`packages/content/src/character.ts:16`、`:187` |
| 当前提交边界 | party[0] 在恢复准备 try 外；非法 facing 到同步 commit 才使 follower 计算抛错，而 abortScript/replaceWorld 已执行。 | `packages/reforge/src/main.ts:5692`、`:5723`；`packages/reforge/src/scene-transition.ts:24`；`packages/reforge/src/follower.ts:51` |
| 当前入口 | F9 未 catch quickLoad；槽恢复与 e2e-load 已使用同一 normalize/restore 路径，必须继续共路。 | `packages/reforge/src/main.ts:5743`、`:6730`、`:6895` |
| 本任务目标 | 非法已知结构在任何活动状态提交前失败；合法载荷不重建开局、不纠正坐标、不修数值。 | 现行类型、`current-save.current-characterization.test.ts:82`；`actor-condition-lifecycle.ts:40`；`author-script-core.ts:1255` 的有限分数坐标合同 |

### 直接复算（2026-09-06，基线 5462d01a）

`node --import tsx docs/ops/audits/pre-e2e/probe-reforge-restore.mjs` 的八项观察：

| 输入 / 控制 | 实际结果 |
|---|---|
| 合法载荷 | true，正常替换世界与场景 |
| party=null | TypeError，无提示；旧世界/旧脚本未变 |
| position=null | false，有提示；旧世界/旧脚本未变（保留这个反证） |
| money="not-money" | true，坏值进入世界；真实 shopBuy 后金额 NaN，可再次存入内存 SaveStore |
| facing="sideways" | dcol TypeError；旧脚本已 abort，世界与场景已替换，非法朝向仍在活动态 |
| F9 形态的 party=null | unhandledRejection，无 toast |
| 较晚发起读档胜出 | old=false/new=true，最终金额 222、场景 new-save |
| 预检中调用方取消 | AbortError，旧脚本与 live-scene/world 保留 |

探针通过 AST 抽出当前 main.ts 原函数体，缺函数或重名直接失败；只替换场景/资产 I/O、canvas、自动脚本边界。
它不是完整 bootstrap，也不是实机坏数据库试验；禁止把它当成假造的另一个恢复解释器或已经完成的 E2E。
另复跑 `probe-save-boundaries.mjs` 佐证 codec 接受核心坏字段；其 U-01 只为边界观察，不能替代上述端到端调用域证据。

### 反证与替代根因

- 最强替代解释：header/reference guards 或场景预载已经拒绝全部坏输入。position=null 确实安全，但 money/facing 反例否定“全部”。
- 可证伪观察：若坏金额/朝向在真实调用链中均先于 abort/replaceWorld 被拒绝，或者调用方取消/较新请求控制组不成立，则重核修复层与方案。
- runtime 语义：缺陷在载荷边界与提交顺序，不是给地图/坐标定义新的合法性；禁止通过修改 follower 或猜 facing 默认值掩盖坏存档。
- 原版理解：不以原版毒清理或旧 SAVE 格式推导允许 NaN/非法枚举；保持现行 party+reserve 临时状态清理。
- 提取/解码：内存构造合法当前载荷后只污染一个叶值即可复现，无 PAL 迁移参与，不修生成产物。
- 审计模型：实际 normalize、prepare、commit 函数体及真实 shopBuy/SaveStore 参与；已列外围桩与正向/取消/乱序控制，不声称完整实机。

### 用户可见偏离

- 主动偏离合法既有行为：no。本卡为保护性修复，不换产品存档策略。
- `before -> after`：损坏当前存档可能污染活动态/无反馈 → 在提交前拒绝，并显示准确失败信息。
- 代表：读入 facing=sideways 的 quick 槽，仍留在原地图，旧脚本继续可用；不是读失败后重开新游戏。
- 产品裁决：无需另行选择；用户已授权按审计顺序推进。三方前提/设计门禁仍必须满足。

## 上下文锚点与不可回引

- [READ-FIRST](../../phase2/READ-FIRST.md) 第 2/5/8/9/11 条；[AGENTS](../../../AGENTS.md) save 高风险准入与前提门。
- [B-04 审计](../audits/pre-e2e/world-lifecycle.md#b-04--u-01追证坏核心字段突破恢复边界)、[审计总收口](../audits/pre-e2e/summary.md)。
- [一阶段工程经验](../../phase1/engineering-notes.md) 的存档/持久值与运行态区别、时间状态收尾；不带入旧版归一化 fallback。
- `packages/content/src/author-script-core.ts:1222`：复用现有脚本世界态 guard，不能另写第二套脚本 walker。
- `packages/content/src/grid.ts:53`：脚本有分数格位移；位置不能擅自限定整数/非负/可通行格。
- `packages/reforge/src/actor-condition-lifecycle.ts:40`：恢复临时状态清理只作用于隔离的候选，不作用于当前世界。
- `packages/reforge/src/scene-switch-transaction.ts`、`async-intent.ts`：保留依赖快照、latest-wins 与调用方取消。
- `packages/reforge/src/save/types.ts:38`、`packages/content/src/character.ts:16`：现行载荷/世界字段是检查清单真源；不改字段身份或版本。

## Draft：方案与风险（r1）

1. **先校验再当作类型使用。** 外部槽值/文件 JSON 入口从 unknown 开始。先验证 envelope 为对象与当前 header，
   再验证 world、position 及恢复会读取的已知子结构；禁止在校验前访问 party[0] 或把强转当作校验。
2. **确定性结构 guard。** 在 Reforge save 域定义当前载荷的结构校验，不引入通用 schema 框架：
   position 的 sceneId、三轴有限数与四方向枚举；world 的必需容器、money 有限数；party/reserve 的角色实例、
   equipment/tags/learnedSkills/inventory 等已知容器及叶值形状，存在的可选子树也按现行类型检查。
   对 script、entityLifecycles、awareness、skillUseCounts 复用已有 guard/normalizer；不复制另一套命令解释或引用遍历。
   不在此任务发明数值上限、坐标取整或未知字段清洗策略；负数/小数等更强约束必须由现行字段合同证明，不能凭感觉新增。
3. **克隆与依赖准备。** 保留现行深拷贝语义、允许的当前可选容器缺省；缺必需字段不重建/补默认值。
   guard 后再用现有角色/精灵/场景/资源准备链生成恢复候选。准备期间不得停止旧活动或写活动 world；
   已有 entity lifecycle 引用错误继续 fail-loud。只有预检与最终 dependency/intent 检查都通过才进入同步提交。
4. **收口失败反馈。** 将 store 读取、normalize 和可失败的恢复准备纳入稳定错误边界；保留 AbortError 的调用方协议。
   F9 顶层必须有未预期异常兜底。区分无存档、存档损坏、读取失败与已被新请求取代，不能用“无快速存档”覆盖具体失败提示。
   空数组 party 保留现有“队伍为空”拒绝；null party 不得再产生未处理 TypeError。
5. **复用正式恢复路径。** 菜单槽、quick 和 e2e-load 使用同一结构/引用预检与提交门；不只给 F9 或 E2E 增加局部修补。
   不加任意提交后吞异常并返回成功的 try/catch。为测试做必要的小范围内部提取时，保持原调用/所有权，
   不借机拆整个 main 或改跨包公共模型。

风险：过度校验拒绝合法当前载荷；旧注释中的“旧档缺省”误被扩成兼容层；异步失败后错误提示覆盖；
仅 codec 单测绿但正式调用仍漏 guard。通过字段矩阵、合法保存器 round-trip、同一调用域反例、取消/乱序控制来限制。
当前已知输入诱发的错误必须移到提交前；浏览器/OOM 等任意提交后异常的通用 rollback 不属于本卡承诺。

## 验收与测试矩阵

| 家族 | 必须断言 |
|---|---|
| 当前合法 round-trip | 输入不变、输出独立克隆；合法空可选容器、HP=0、显式静音、有限分数坐标保持；不重播入口 seed/onEnter |
| Envelope / world / position | null、数组、缺必需字段、类型错误、NaN/Infinity、非法 facing 带明确路径拒绝；不把坏值修成默认值 |
| 角色与已知嵌套结构 | party/reserve 元素形状、装备/标签、背包、习得技能与现有持久子树反例；针对每个实际 guard 配正负边界 |
| 四个审计反例 | money 字符串、sideways、party=null、position=null 均无活动态污染；正常加载控制组仍成功 |
| 失败原子性 | world/scene/facing/party/trail/canonical script 与旧 abort controller 不变；失败不写 Store、不启动自动脚本；可继续当前会话 |
| 调用入口 | 菜单、F9、e2e-load 共路；坏输入/读取拒绝有准确反馈，无 unhandledRejection，不伪报无槽或成功 |
| 异步保护 | 较新 load 胜出；准备中 signal abort；依赖签名变化拒绝；旧失败不盖过新请求的结果/提示 |
| 正常玩法 | 清理 party+reserve 临时状态的既有合同、音乐/场景恢复不退化；输入坐标不因“安全校验”被移动 |

- 实现前先将 B-04 实际调用域的反例转为自动回归（先红后绿），不能只增加 payload 叶值单测。
- 新增纯结构校验尽量 100% 分支；为存档核心逐步达到行/函数 ≥95%、分支 ≥90% 建立具体缺口清单。
  每个断言证明业务结果，不靠 skip、ignore、删 guard 或降低 fast 基线取得覆盖率；全包门禁保持只升不降。
- 验证命令：相关 save/actor-condition/scene-switch 测试 → Reforge typecheck → 完整 check → fast coverage，
  重型本地检查顺序执行；PAL/full 覆盖按实际影响与发布门禁另跑，不能把 headless 说成浏览器覆盖。
- 文档：更新修复回执和活动看板，审计历史保留；不因修 bug 改能力格已完成状态或复活版本分支。

### 最小功能与集中 E2E

- dev-functional / Codex：专用测试工程/测试存档，在当前地图运行时加载一个损坏快照，确认错误可见、角色仍能操作，
  再加载合法快照成功；使用专用测试存储，不污染用户现有槽。不要求用户做 JSON 造坏档或跑命令。
- R4/Q1 / Codex：合法 checkpoint → 行走/脚本检查 → 坏 checkpoint 拒绝且保持前一状态 → 正确 checkpoint 成功。
  入口为现有 `e2e-load` 和正式 quick/menu 路径；记录场景、坐标、队伍/金额、脚本活动与关键时序，不以 toast 唯一验收。
- 视觉当前未执行：draft 未改产品；build 功能验证由 Codex 完成，剧情观感留集中 E2E，不重复走整段剧情。

## 推进签字

### 进入 build 前

- Codex:
  - premise: verified（2026-09-06）：真实 codec/main/follower 上述锚点与 B-04 八项探针复算一致；合法/取消/乱序控制通过。
  - design: agree（r1）：限定当前载荷边界与恢复入口；不切版本、不改数值/移动合同，不承诺任意提交后 rollback。
- Kimi:
  - premise: pending。
  - design: pending。
  - 独立一手证据 / 可证伪观察：pending。
- GLM:
  - premise: pending。
  - design: pending。
  - 独立一手证据 / 可证伪观察：pending。
- 独立反证审查：至少一席直接核 current 类型与真实恢复入口并复算控制组，当前未完成。
- counter / 分歧：暂无；任何核心前提变化重开本 revision 的相关签字。
- 缺签豁免：无。
- build 准入结论：blocked（Kimi/GLM 设计签字 pending，不得开始实现）。

### 进入 done 前

- Codex：pending。
- Kimi：pending。
- GLM：pending。
- done 准入结论：blocked。

## Build / Review / 用户验收

均未开始，不得标记已修复或 done。无 Agent 缺席/额度代班，不由内部 Codex 分工代签 Kimi/GLM。
2026-09-06 既有基线测试：save/store、save/ops、save/browser-state、current-save characterization、
actor-condition-lifecycle、scene-switch-transaction 六文件 / 38 项通过；它们尚不覆盖本卡新增反例。

## 交接日志

- 2026-09-06 Codex：基线 5462d01a 复读合同/实际调用链，复跑两份只读内存探针与 38 项既有测试，形成 r1。
- Kimi：待本人追加，不修改 Codex/GLM 日志。
- GLM：待本人追加，不修改 Codex/Kimi 日志。

## 下一位 Agent 提示词

### Kimi（与 GLM 并行，r1）

```text
请在 /Users/zhangxu/illegal/type-pal 审查 docs/ops/tasks/SAVE-PREFLIGHT-1-current-save-restore-preflight.md，r1，产品基线 5462d01a，状态 draft。
你负责架构/前提设计审查。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、任务卡与上下文锚点。
Codex 已复跑 B-04 真实函数体探针及六文件38项基线；未改实现。请独立先读 current-codec/main 的槽、F9、e2e-load、prepare/commit、follower 与现行 WorldState 类型，复跑 node --import tsx docs/ops/audits/pre-e2e/probe-reforge-restore.mjs。
重点反证提交前隔离、合法分数坐标/当前可选字段、取消和新请求胜出；检查方案是否越界为版本切换或巨大重写。不要读取或复述 GLM 结论。
将自己的带证据 premise verified/counter、design agree/counter、可证伪观察和返工项直接写入本卡 Kimi 签字块与本人日志，并提交推送。提交前同步最新分支并保留另一席改动，自行处理 push/rebase 竞态。
不得改产品/测试实现、任务状态或标记 build/done。SAVE-ISOLATION-1 的工作区产品选择尚待用户，不代其裁决，也不把本卡签字扩张为整组修复授权。
```

### GLM（与 Kimi 并行，r1）

```text
请在 /Users/zhangxu/illegal/type-pal 审查 docs/ops/tasks/SAVE-PREFLIGHT-1-current-save-restore-preflight.md，r1，产品基线 5462d01a，状态 draft。
你负责数据/测试覆盖设计审查。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、任务卡与上下文锚点。
Codex 已复跑 B-04 真实函数体探针及六文件38项基线；未改实现。请独立核当前 SAVE8/WorldState/CharacterInstance、既有 guards 和正式恢复入口，复跑 node --import tsx docs/ops/audits/pre-e2e/probe-reforge-restore.mjs。
重点审字段正负边界、四反例与三个正向控制、读失败零污染、提示不被覆盖、现行合法缺省与有限分数坐标；检查是否把类型断言当作校验、是否遗漏正式入口。不要读取或复述 Kimi 结论。
将自己的带证据 premise verified/counter、design agree/counter、可证伪观察和返工项直接写入本卡 GLM 签字块与本人日志，并提交推送。提交前同步最新分支并保留另一席改动，自行处理 push/rebase 竞态。
不得改产品/测试实现、任务状态或标记 build/done。SAVE-ISOLATION-1 的工作区产品选择尚待用户，不代其裁决，也不把本卡签字扩张为整组修复授权。
```
