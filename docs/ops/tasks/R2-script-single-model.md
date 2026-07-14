# R2 - 事件脚本单一模型与 unmigrated 退役

Status: draft
Phase: phase2
Capability: N2 / N3 / X3 / MG1
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex + Opus
Unavailable Agents: none
Branch: current

## 目标

把事件迁移与运行时收敛为唯一一套语义化脚本模型：迁移器可以产生结构化诊断，但不得把旧 opcode 或
`unmigrated` 节点写进可执行工程；`packages/reforge` 不再保留 `runLegacyOp` 第二解释器。修复上游后重新
生成 `projects/pal`，保证现存 66 个残余全部有正确语义或有源数据证据，且不靠手改生成产物。

## 范围

- 范围内:
  - 修复全局脚本地址索引只认显式 `label` 的缺陷，正确解析当前 17 个“目标缺失”节点。
  - 完整迁移当前残余的 `0x78`、`0x6D`、`0xA0`。
  - 将迁移缺口改成迁移期诊断和失败门禁，禁止进入 `Command`、脚本分片和编辑器命令目录。
  - 删除 `runLegacyOp` 及仅供该兼容层使用的逻辑、测试和 UI 展示。
  - 重新生成 PAL 工程，复核 MG2 双跑、M3 分片体积与代表剧情路径。
- 范围外:
  - A7/R7 资源注册表与工程资源闭包。
  - ED-3/ED-4/ED-5 编辑器引用图和业务 CRUD。
  - Q1 数百段完整通关 E2E；本卡只跑能证明本次脚本语义的代表路径。
- 明确不做:
  - 不把未知 opcode 改名后继续留在内容 schema。
  - 不在 `projects/pal` 手工删除或替换残余。
  - 不以“运行时遇到后警告并跳过”冒充迁移完成。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：数据迁移缺陷必须先修上游并重新生成；三方设计签字未齐不得进入 build。
  - `docs/phase2/READ-FIRST.md`：第二阶段只保留 clean content schema，不复制第一阶段旧解释器。
  - `docs/phase2/foundation/content-schema.md:147-149`：脚本是语义动作；不把原 opcode 解释器留作长期运行时。
  - `docs/phase1/status/opcode-status.md:122-128,199`：`0x6D` 的 op1/op2/both-zero 真语义已经由第一阶段验证。
  - `packages/game/src/core/event-system.ts:4987-5005`：第一阶段忠实实现，both-zero 必须同时清除 onEnter 与 onTeleport。
- 代码锚点(`file:line`):
  - `packages/content/src/script.ts:1-6,180-181`：注释称 `unmigrated` 不是兼容执行器，但它仍在公开 `Command` 联合中。
  - `packages/reforge/src/script-runner.ts:620-634`：运行时实际调用 `runLegacyOp`，形成第二套解释器。
  - `packages/migrate/src/migrate-content.ts:1401-1409`：`labelAt` 只登记显式 label，是 17 个假“目标缺失”的根因。
  - `packages/migrate/src/translate-events.ts:138-161`：缺 label 时把 opcode 0 占位写进可执行脚本。
  - `packages/migrate/src/translate-events.ts:1161-1188`：`0x6D` 只覆盖 op1，其他残余继续落 `unmigrated`。
  - `packages/content/src/script.ts:149-160,215-237`：场景传送脚本绑定与世界态当前形态。
  - `packages/reforge/src/main.ts:1586-1596,2896-2899`：onTeleport 覆写以 `??` 回退静态脚本，尚不能表达“显式清空”。
- 已知坑 / 审计文档:
  - `docs/ops/tasks/M3-wander-arm-explosion.md:305-315` 留下 66 个产物残余；其中“目标缺失是源悬空”的旧结论经本卡复核后被推翻。
  - 当前 `data/extracted/events/all.json` 有 43,503 条命令、4,123 个显式 label；所有显式 `L_n` 都位于数组下标 n。
    17 个缺失引用所指的 n 均在数组内且有真实命令，只是该命令没有显式 label；这是迁移地址索引缺陷，不是源悬空。
  - `0x78` 在 `docs/phase1/status/opcode-status.md:34,315` 已钉死为原版显式 no-op。
- 不得重新引入:
  - 原 opcode / IP / 数字场景索引进入二阶段内容和编辑器。
  - `unmigrated` 作为可执行节点、默认跳过节点或可插入命令。
  - 为兼容旧产物保留第二解释器；旧产物应重迁而不是运行时兜底。
  - 把迁移报告的信息性 note 与真正阻塞缺口混在同一计数里。
- 相关测试:
  - `packages/game/src/core/event-system.test.ts:4587-4624`：`0x6D` 三种形态的一阶段真值。
  - `packages/migrate/src/translate-events.test.ts:275-283`：当前 `0x6D` 迁移测试，需要升级为全形态。
  - `packages/reforge/src/script-runner.test.ts:105-199,413-417`：现有兼容解释器测试，完成后应删除或改为拒绝旧节点。
  - `packages/migrate/src/script-graph.test.ts:16-35`：`0x6D` 两条 binding 边必须继续覆盖。

## 当前残余基线

2026-07-14 对 `projects/pal/content/scripts/chunks/**/*.json` 递归统计共 66 个：

| 类别 | 数量 | 当前证据 | 本卡处理 |
|---|---:|---|---|
| `0x78` | 46 | operands 均为 `0,0,0` | 迁移期显式丢弃并计入已知 no-op 统计 |
| opcode 0 / 目标缺失 | 17 | 15 个唯一地址，全部是 `all.json.commands[n]` 的有效下标 | 建全地址索引并翻译真实目标，不再造占位命令 |
| `0x6D` | 2 | s059: `60,0,11870`；s172: `183,0,0` | 分别实现 onTeleport 覆写与 both-zero 显式清空 |
| `0xA0` | 1 | s281 结局脚本 | 迁为已有 `quitToTitle` |

特殊节点位置：

- `scene/s059.json`：`scene/s059/root/entity-e1048/page-0/trigger/stage-0.14`，`0x6D [60,0,11870]`。
- `scene/s172.json`：`scene/s172/root/on-enter/stage-0.0`，`0x6D [183,0,0]`。
- `scene/s281.json`：`scene/s281/root/entity-e4800/page-0/trigger/stage-0.82`，`0xA0 [0,0,0]`。

## 验收条件

- 功能:
  - PAL 生成产物中 `kind: "unmigrated"` 为 0，17 个地址目标均翻译为真实脚本。
  - `0x6D` 独立覆盖 onEnter、onTeleport、两者同时设置、both-zero 同时清空四种形态。
  - s059 打完赤鬼王后可用正式传送出口；s172 的清空不回退到静态脚本；s281 结局能回标题。
  - 未知且可达的原始命令让迁移失败，错误包含源地址、opcode、operands、归属和引用路径。
- 测试:
  - 迁移单测覆盖全地址索引、15 个唯一缺 label 地址、`0x78`、`0x6D` 四形态、`0xA0` 和未知可达命令失败。
  - 静态扫描 `packages/content`、`packages/reforge`、`packages/editor` 与 PAL 产物均无可执行 `unmigrated`；全仓无 `runLegacyOp`。
  - M3 图覆盖仍为 43,503 条源命令，`flowCuts = 0`；脚本产物仍与 `all.json` 同一数量级，既有体积门禁不放宽。
  - MG2 连跑两次后第二次 `writes/deletes/conflicts = 0`，作者内容和 overlay 保留。
  - `pnpm check`、相关包单测、lint、build 全绿。
- 文档:
  - 更新 content schema、迁移报告字段说明、能力/路线真值；删除“运行时兼容层”旧注释。
  - 记录 66 项的最终去向和 17 个假缺失的根因修正，不能只写“数量归零”。
- 视觉 / 手工验证:
  - 浏览器以前台标签运行 s059、s172、s281 代表路径；记录启动参数、存档/检查点和结论。
  - 开场 s000→s003、李大娘脚本和共享脚本懒加载冒烟，确认地址索引修复没有扩大加载或改变演出顺序。

## 推进签字

签字是阶段门禁。开卡任务必须集齐三方签字才能推进；缺签只能由用户明确豁免。`Status` 字段不能替代签字。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-14）**。当前 66 项已逐类核对；17 个“目标缺失”是地址索引缺陷，必须先修迁移器。
- Opus: **agree（2026-07-14,附 R1-R3 必改 + S1 建议;含本人 M3 期结论的公开修正）**。独立重验:43,503 全局命令、4,123 显式 label 且 **L_n===下标 n 零例外**(全量断言),15 个唯一缺失地址逐一为有效命令(0x5/end/setDialogStyleBottom 类收尾点,仅无显式 label)——**我 M3 期"源数据悬空指针"结论确证错误**,根因是只验了 label 存在性、未验地址有效性;Codex 的根因定位(labelAt 只登记显式 label)与修法(全地址索引+一致性断言)正确。0x6D 一阶段真值(event-system:4987-5005 both-zero 双清)与 tri-state 契约同构;s059=[60,0,11870]/s172=[183,0,0] 产物复核一致;runLegacyOp 注释自认"运行时兼容层…0x6D/0x78 留 batch2",第二解释器删除有据。统一 sceneScriptOverrides 裁定采纳(优于双散槽:单一归一化路径/单一三态契约/both-zero 一命令双槽);JSON null 作 tombstone 序列化安全,undefined 禁用正确。详见主审立场。
- GLM: pending
- counter / 分歧处理: 无；等待 Opus 审架构与 0x6D 状态表达，GLM 审覆盖矩阵与迁移门禁。
- 缺签豁免: N/A
- build 准入结论: **blocked**

### 进入 done 前:审查签字

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 返工处理:
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

#### A. 可执行内容只有 clean `Command`

- 从 `Command` 联合、editor command catalog/form/tree 和 runner 移除 `unmigrated`。
- 迁移器内部使用独立的 `MigrationGap` 诊断结构，至少包含源地址、opcode、operands、归属、可达性、引用路径、
  原因和处理结论。它不是 content schema，不能被序列化进工程脚本。
- 可达 gap 在写盘前统一失败；已证明不可达或原版 no-op 的项只进入分类报告，不生成命令。
- `TranslateReport` 分成信息性统计、已证明 no-op、已解决转换和阻塞 gap，避免旧 `unmigrated=654` 口径误导。

#### B. 全局脚本地址按数组地址解析

- `all.json` 的全局脚本地址就是 `commands` 数组下标；构建 `allAddressAt[n]` 或等价索引，为每个有效 n 提供
  `L_n -> commands[n]`，不要求源命令携带显式 label。
- 显式 label 仍做一致性断言：若 `L_n` 不在下标 n，迁移立即失败。
- 只对全局 `all.json` 使用地址索引，不能把场景局部数组下标冒充全局地址。
- 17 个当前占位必须通过该索引真实翻译；不得沿用“源悬空”豁免。

#### C. `0x6D` 使用可表达“继承 / 覆写 / 禁用”的场景脚本状态

- 语义契约固定为三态：字段缺席 = 继承场景静态脚本；脚本绑定/阶段 = 运行时覆写；显式 `null`/禁用态 =
  不运行且不得通过 `??` 回退静态脚本。
- clean 命令至少覆盖 `setSceneOnEnter`、现有 `setSceneOnTeleport`、`clearSceneScripts`；both-zero 一条命令同时把
  两个槽设为禁用态。若保留 `setSceneStage`，必须证明它只是 clean 阶段选择而非旧地址解释器。
- Codex 推荐将两个槽统一收进一个按 scene id 索引的 tri-state `sceneScriptOverrides`，并为旧存档写显式归一化；
  Opus 需主审该形态与最小 tombstone 方案的取舍，不能用 `undefined` 表示“清空”。
- op1/op2 独立翻译；两者同时非零时两项都生效，不能写互斥分支。

#### D. `0x78` 与 `0xA0`

- `0x78` 按第一阶段和 sdlpal 真值在迁移期丢弃；报告记录“已证明 no-op”及数量，不写空命令。
- `0xA0` 直接翻译为已有 `quitToTitle`，并补迁移与运行路径测试。

#### E. 删除运行时第二解释器

- 在重新生成 PAL 后删除 `runLegacyOp` 及其 opcode case；不保留“兼容旧工程”的隐藏入口。
- 工程加载/校验若发现旧 `unmigrated`，给出“请重新迁移”的明确错误并拒绝运行，不能静默跳过。
- 仅供 `runLegacyOp` 的 host API 在无 clean 命令调用者后删除；已有 clean 命令继续走各自 host API。

#### F. 实施分期

1. 建迁移诊断类型和全地址索引，先让 17 个假缺失真实翻译。
2. 落 `0x6D` tri-state 契约、`0x78` no-op 与 `0xA0` clean 映射。
3. 重生成 PAL，静态扫描产物归零并复核图/体积/MG2 门禁。
4. 删除 content/editor/reforge 的 `unmigrated` 与 `runLegacyOp`，补拒绝旧工程的校验。
5. 跑单测、全门禁和浏览器代表路径，进入 review。

### 已知风险

- 风险: 把有效全局地址当源悬空会直接丢剧情；本轮已经确认旧审计结论错误。
- 缓解: 地址索引以 `commands[n]` 为真值，并对所有显式 label 做 `L_n === index n` 全量断言。
- 风险: `0x6D` both-zero 若用 `undefined`/delete，会错误恢复场景静态 onEnter/onTeleport。
- 缓解: schema 明确三态并专测“清空后不回退”。
- 风险: 迁移修复改变脚本归属或重复展开，重新造成 M3 体积膨胀与懒加载回归。
- 缓解: 保留 typed graph/SCC 分片、43,503 覆盖、体积门禁和按需网络检查。
- 风险: 删除兼容解释器时误删已被 clean 命令复用的 host 能力。
- 缓解: 先按调用图分离，再删除无引用 API；runner 单测与代表剧情双验。

### 主审立场

- Reviewer: Opus
- 结论: **agree(2026-07-14)**。六点:
  1. **A 层清洁化** — MigrationGap 诊断与 content schema 分离、可达 gap 写盘前失败、报告四分类(信息/已证 no-op/已解决/阻塞),正确;与铁律 10"不靠运行时兜底冒充迁移完成"一致。
  2. **B 全地址索引** — 独立验证 L_n===n 全量断言成立(4,123/43,503 零错位),索引修法正确;"只限全局流、场景局部下标不得冒充全局地址"边界清晰;17 个占位翻译后目标全是收尾类命令(0x5/end/样式),体积影响可忽略,入口对话态键控(M3-R2)自然覆盖新注册项。
  3. **C 0x6D tri-state** — 与一阶段真值同构(0 哨兵 → 干净 null tombstone);**裁定采纳统一 `sceneScriptOverrides`**,优于双散槽:单一存档归一化路径、单一三态契约、both-zero 一条命令置双槽禁用。JSON null 序列化安全;禁 undefined 表清空正确(JSON.stringify 丢 undefined)。
  4. **D 0x78/0xA0** — 一阶段+sdlpal 双真值已钉,直接。
  5. **E 删除顺序** — 重生成→静态归零→删 runLegacyOp→加载拒绝,顺序正确;孤立 host API 按调用图分离后删。
  6. **验证矩阵** — s059(赤鬼王后传送出口)/s172(清空不回退)/s281(结局回标题)三代表 + 开场冒烟,已写明**前台标签**运行(方法学教训已吸收)。
- 必改项(设计补明,非架构 counter):
  - **R1 旧存档归一化规格写全**:现存 `world.onTeleport`(N6 期形态)逐字段映射进新 `sceneScriptOverrides`;未知/异型 fail-loud(援引 W7F save/ops.ts:65-72 数字 mapOverride 先例);补"禁用态(null)经存档往返仍为 null、不回退静态脚本"专测。
  - **R2 统一槽范围钉死**:`sceneScriptOverrides` 只收 onEnter/onTeleport 两个脚本槽,**不吞并 W7F 刚定的 `mapOverride`**(独立契约,避免二次搬迁与存档双改)。
  - **R3 拒绝旧节点的错误导向**:content 校验层对 `kind==='unmigrated'` 特判错误文案("旧工程产物,请用迁移器重新生成"),editor 与 runtime 共用;默认"未知 kind"报错不足以导向重迁。
- 建议(非必改):
  - **S1**:17 个占位修复后,在迁移报告中把这 15 个地址的翻译结果(目标命令种类)列表归档,作为"审计结论也要可复核"的案例记录——含本人 M3 期误判的教训:审 unmigrated 时"目标缺失"类必须验地址有效性,不能只验 label 集合。
- 是否建议进入 build: **待 Codex 落 R1-R3 + GLM 覆盖复核后 build**。

### 三方争议记录(按需)

- Codex: 赞成内容层零 `unmigrated`、迁移期 fail-loud；推荐统一 tri-state 场景脚本覆写状态。
- Opus: 全面同意,统一 sceneScriptOverrides 采纳(R2 钉范围防吞 mapOverride)。**公开修正**:M3 期我把 17 个目标缺失签为"源数据悬空指针"是错误结论(只验 label 存在、未验地址有效),本卡地址索引方案是对该错误的根治;占位 opcode-0 进产物的责任链含我的审计放行。
- GLM: pending
- 用户拍板: 用户要求按推荐顺序推进；本卡三签齐前不实现。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex（待三签）
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + Opus
- 验证方式: pending
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: R3/A7 + R7 资源单一注册表与工程资源闭包。

## 交接日志

- 2026-07-14 Codex: 完成现状复核并建立 R2 设计。证据：PAL 产物 66 项递归统计；`all.json` 43,503
  条命令/4,123 显式 label 全量下标断言；15 个唯一缺失地址逐项读取均为有效命令。Next: Opus 设计主审，禁止实现。
- 2026-07-14 Opus: 设计主审签 **agree + R1-R3 必改 + S1 建议**。独立重验:L_n===下标 n 全量断言零例外;15 个缺失地址逐一有效(0x5/end/样式类收尾点)——**公开修正本人 M3 期"源悬空"错误结论**(只验 label 存在性之误)。0x6D 真值同构/产物双站点复核一致/runLegacyOp 兼容层自认。裁定:统一 sceneScriptOverrides 采纳。R1=旧存档归一化规格+null 往返专测;R2=统一槽不吞 W7F mapOverride;R3=旧节点拒绝文案特判导向重迁。Evidence: 主审立场六点+重验脚本输出。Next: GLM 覆盖复核(66 项分类矩阵/四形态测试/静态扫描口径);三签齐后 Codex 按分期 1-5 build。未改实现文件。

## 下一位 Agent 提示词

```text
接手任务: R2 事件脚本单一模型与 unmigrated 退役,设计复核(GLM)
任务卡: docs/ops/tasks/R2-script-single-model.md
当前状态: draft;Codex agree + Opus agree(附 R1-R3 必改/S1 建议,含 Opus 对自身 M3 期"源悬空"结论的公开修正),GLM pending,build blocked
你的角色: GLM,覆盖矩阵/迁移门禁/测试矩阵复核;只审文档,不改实现
先读: AGENTS.md、docs/phase2/READ-FIRST.md、任务卡全部(尤其"当前残余基线"66 项分类表与 Opus 主审立场六点)
Opus 已验: L_n===下标 n 全量断言零例外(4,123 label/43,503 命令);15 个缺失地址逐一为有效命令(0x5/end/样式类);0x6D 一阶段真值同构+s059/s172 产物复核;runLegacyOp 兼容层自认。R1=旧存档归一化规格(援引 W7F save/ops 先例)+null 往返专测;R2=sceneScriptOverrides 只收双脚本槽不吞 mapOverride;R3=旧 unmigrated 节点拒绝文案特判。
请你复核: (1)66 项分类矩阵完备性——46+17+2+1 四类的证据链与"最终去向"文档要求是否可验收;(2)测试矩阵——全地址索引/15 地址逐项/0x78/0x6D 四形态(op1/op2/双设/both-zero)/0xA0/未知可达失败/静态扫描(三包+产物零 unmigrated/全仓零 runLegacyOp)逐条映射验收,列缺口;(3)M3/MG2 门禁保持(43,503 覆盖/flowCuts=0/体积不放宽/双跑零计划)的回归口径;(4)R1 归一化的测试可操作性。在设计签字 GLM 行签 agree/counter,更新交接日志;三签齐+Codex 落 R1-R3 后按分期 1-5 build
不要做: 不改实现文件;不开始迁移/重生成;不转 build
输出要求: 明确 agree/counter、矩阵缺口清单、提交 hash
```
