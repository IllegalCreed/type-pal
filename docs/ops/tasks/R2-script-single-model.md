# R2 - 事件脚本单一模型与 unmigrated 退役

Status: done
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
`unmigrated` 节点写进可执行工程；`packages/reforge` 不再保留旧 opcode 第二解释器。修复上游后重新
生成 `projects/pal`，保证现存 66 个残余全部有正确语义或有源数据证据，且不靠手改生成产物。

## 范围

- 范围内:
  - 修复全局脚本地址索引只认显式 `label` 的缺陷，正确解析当前 17 个“目标缺失”节点。
  - 完整迁移当前残余的 `0x78`、`0x6D`、`0xA0`。
  - 将迁移缺口改成迁移期诊断和失败门禁，禁止进入 `Command`、脚本分片和编辑器命令目录。
  - 删除旧 opcode 第二解释器及仅供该兼容层使用的逻辑、测试和 UI 展示。
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
  - `packages/reforge/src/script-runner.ts:620-634`：运行时曾调用旧 opcode 兼容函数，形成第二套解释器。
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
  - 静态扫描 `packages/content`、`packages/reforge`、`packages/editor` 与 PAL 产物均无可执行 `unmigrated`；全仓无旧解释器函数标识符。
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
- Opus: **agree（2026-07-14,附 R1-R3 必改 + S1 建议;含本人 M3 期结论的公开修正）**。独立重验:43,503 全局命令、4,123 显式 label 且 **L_n===下标 n 零例外**(全量断言),15 个唯一缺失地址逐一为有效命令(0x5/end/setDialogStyleBottom 类收尾点,仅无显式 label)——**我 M3 期"源数据悬空指针"结论确证错误**,根因是只验了 label 存在性、未验地址有效性;Codex 的根因定位(labelAt 只登记显式 label)与修法(全地址索引+一致性断言)正确。0x6D 一阶段真值(event-system:4987-5005 both-zero 双清)与 tri-state 契约同构;s059=[60,0,11870]/s172=[183,0,0] 产物复核一致;旧 opcode 兼容函数注释自认"运行时兼容层…0x6D/0x78 留 batch2",第二解释器删除有据。统一 sceneScriptOverrides 裁定采纳(优于双散槽:单一归一化路径/单一三态契约/both-zero 一命令双槽);JSON null 作 tombstone 序列化安全,undefined 禁用正确。详见主审立场。
- GLM: **agree（2026-07-14;附 N1-N2 非阻塞,见下）**。四项复核逐条：

  **(1) 66 项分类矩阵完备性——46+17+2+1 四类证据链与"最终去向"文档要求**：

  全量独立实测（递归 grep PAL 产物 chunks）：
  - **46 × 0x78**：实测 46 个 `opcode:120` 节点，operands 全部 `[0,0,0]`（零例外）。✅ 验收 §88"unmigrated 为 0"+ §93"0x78 迁移期丢弃+已知 no-op 统计"映射 F2。
  - **17 × opcode 0 / 目标缺失**：实测 17 个 `opcode:0` 节点（15 个唯一地址，2 个地址各出现 2 次：L_3925 in s009×2、L_17718 in s100×2）。15 个唯一地址 `[3746,3925,7469,7566,14461,15968,15999,17178,17500,17718,19309,19829,20355,21220,23511]` 全部 < 43,503 且目标命令无显式 label。目标命令种类：`end`/`raw[0,0,0]`/`setDialogStyleBottom`（收尾类）。✅ 验收 §88"17 个地址目标均翻译为真实脚本"映射 F1（全地址索引）。
  - **2 × 0x6D**：s059 `.14` operands `[60,0,11870]`、s172 `.0` operands `[183,0,0]` 精确匹配。✅ 验收 §89"0x6D 四形态"映射 F2。
  - **1 × 0xA0**：s281 `.82`（83 节点末尾=结局脚本）operands `[0,0,0]` 精确匹配。✅ 验收 §90"s281 结局回标题"映射 F2。
  - **L_n===index n 不变量**：4,123 显式 label 全量断言零例外（Opus 已独立验证，我确认方法一致）。✅ 根因定位正确：`labelAt` 只登记显式 label（migrate-content.ts:1401-1409 `if (c.label && ...)`），漏掉无 label 但有有效下标的地址。
  - **"最终去向"文档要求**（验收 §100）：46+17+2+1 四类各有明确处理路径（no-op 丢弃/地址索引翻译/tri-state 映射/quitToTitle），可验收。✅

  **矩阵完备性：零漏项。**

  **(2) 测试矩阵逐条映射**：

  - **全地址索引**：验收 §93 映射 F1。`labelAt` 改为 `allAddressAt[n]` 或等价，为每个有效 n 提供 `L_n→commands[n]`。✅ 可测。
  - **15 地址逐项**：验收 §93"15 个唯一缺 label 地址"。每个地址目标命令种类（end/raw/样式）可独立断言。✅ 可测。
  - **0x78 no-op**：验收 §93。迁移期丢弃+报告计数。✅
  - **0x6D 四形态**（op1-only / op2-only / both-set / both-zero）：验收 §89。**当前 translate-events.test.ts:275-283 只覆盖 op1-only（emit setSceneStage 占位）+ op2-only 落 unmigrated（错误）**。一阶段真值 event-system.test.ts:4587-4624 四形态全覆盖（含 both-zero 双清）。**build 必落：迁移测试升级为四形态，镜像一阶段真值。** ✅ 方向明确。
  - **0xA0→quitToTitle**：验收 §93。当前 translate-events.ts 无 0xA0 分支（落 unmigrated）。✅ build 补。
  - **未知可达命令失败**：验收 §91"错误包含源地址/opcode/operands/归属/引用路径"。✅ MigrationGap 结构（§134）支撑。
  - **静态扫描（三包+产物零 unmigrated / 全仓零旧解释器标识符）**：验收 §94。**实测当前命中点**：content(script.ts:181 类型定义+注释)、reforge(script-runner.ts:620-634 旧兼容函数+case 'unmigrated'+report 分支+dither-transition.ts:244 allowlist+6 test)、editor(CommandForm.tsx/ScriptTree.tsx/command-catalog.ts)。**关键发现：旧兼容函数当前不处理 0x6D/0x78/0xA0**（docblock 自认"留 batch2"）——49 个残余节点运行时静默 fall-through。**这意味着删除它没有现存运行时行为需要保留，删除更安全。** ✅ 静态门禁 grep 口径可执行（命中点即删除清单）。

  **测试矩阵缺口**：
  - **flowCuts=0 无测试断言**：验收 §95"flowCuts=0"——当前 `grep flowCuts *.test.ts` 零命中（仅 translate-events.ts:58,64,489,1183,1201 读写）。**build 必落：补 flowCuts=0 测试断言。** ⚠ 非阻塞，build 必落。
  - 0x6D 迁移四形态升级（如上）。⚠ 非阻塞，build 必落。

  **(3) M3/MG2 门禁回归口径**：

  - **M3 43,503 覆盖**：script-library-audit.test.ts:137 `expect(migrated.scriptGraphReport.commands).toBe(43_503)` 已存在。✅
  - **flowCuts=0**：如上，无断言，build 必落。⚠
  - **体积门禁不放宽**：script-library-audit.test.ts 既有体积门禁（compact/pretty/commands/closure）。✅
  - **MG2 双跑零计划**：pal-migration-integration.test.ts:57-117"二次严格空计划"+ :119-131"已建基线回归空计划"已存在（asserts writes=0/deletes=[]/conflicts=[]）。✅

  **(4) R1 归一化的测试可操作性**：

  - R1 = 旧存档归一化规格：`world.onTeleport`（N6 期形态）逐字段映射进新 `sceneScriptOverrides`；未知/异型 fail-loud（援引 W7F save/ops.ts:65-72 先例）；补"禁用态(null)经存档往返仍为 null、不回退静态脚本"专测。
  - **可操作性**：W7F 的 `validateMapOverride`（reforge/save/ops.ts:64-79）已是同模式先例（数字→throw + 回归测试 ops.test.ts:75-93）。R1 照此实现 `validateSceneScriptOverrides`：旧数字/异型→throw + null 往返专测。✅ 完全可操作。
  - **null tombstone 往返**：JSON.stringify 保 null（不丢），JSON.parse 回 null。专测 = serialize {onEnter:null} → parse → assert null 不回退静态。✅ 秒级单测。

  **总结**：66 项分类矩阵零漏项（46+17+2+1 全独立实测，L_n===n 不变量零例外）；测试矩阵基本完整，两处 build 必落（flowCuts=0 断言 + 0x6D 四形态升级）；M3/MG2 门禁已有覆盖（43,503+双跑零计划）；R1 归一化可操作（W7F 先例可复制）。**agree**。

  **N1-N2 非阻塞（build 必落）**：
  - **N1**：补 `flowCuts===0` 测试断言——当前零命中，验收 §95 要求但无测试钉死。
  - **N2**：0x6D 迁移测试从 op1-only 升级为四形态——镜像一阶段 event-system.test.ts:4587-4624 真值。

- counter / 分歧处理: 无。Opus 无架构 counter;R1-R3 为设计补明,GLM 覆盖复核无 counter,标 N1-N2(flowCuts 断言+0x6D 四形态测试)build 必落。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex agree + Opus agree + GLM agree），build allowed。** R1-R3 必改 + N1-N2(flowCuts=0 断言+0x6D 迁移四形态升级)纳入 build 范围。

### 进入 done 前:审查签字

- Codex: **accept（2026-07-14）**。实现、自测、MG2 幂等、全仓门禁与浏览器逐帧验证通过；实现提交 `76df4665`。
- Opus: **accept（2026-07-14,实现/视觉主审）**。六项复核全过,无返工项:
  1. **RNG 呈现栈 = 真分层非截图**:`rng-presentation.ts` 四模式状态机(idle/playing/buffered/dialogue)61 行零冗余;main.ts 合成顺序 World → `drawCinematicLayer`(独立 rngLayerCanvas,:2523)→ fade → UI 对话,Cinematic 是每帧参与合成的独立层。`beginPlayback(fallback)` 连续段保留上一张 RNG 至新首帧;`finishPlayback` 零帧诚实(当前段未收到帧则清旧备份,不冒充末帧);`visibleFrame` 仅 playing/dialogue 暴露。生命周期 reset 三边界齐:场景切换原子提交(:665)/quitToTitle(:1739)/abort·读档(:2168)。
  2. **6051 独立复验(前台,与 Codex Playwright 不同路径)**:s281 e4800 真实 touch 触发 → 19 组前置世界对话(idle)→ 最终战战斗态显式 `resolveDone('win')`(印证"只在战斗态显式设胜利";selectAction 态外部改 HP 不结算,胜负检查在行动结算点 battle-session.ts:617/625,合理)→ 6 段 RNG 完整链。**8,438 帧 rAF 逐帧采样:worldFlash=0**(playing/dialogue 帧 rngLayerVisible 全 true)、**dlgNoLayer=0**(无对话叠 buffered 帧),转移序列 `playing → dialogue+dlg → dialogue → playing` 六循环清晰,buffered 从未成为可见持续态(同 tick 转移)。末尾 reset→idle→quitToTitle→`?menu` 导航,console 零错误零警告。审计数据经 sessionStorage 跨导航持久化(quitToTitle 销毁 context 的对策)。
  3. **三态契约**:save/ops.ts 旧 `world.script.onTeleport` 逐字段归一化到 sceneScriptOverrides,ScriptStage[]/ScriptRef/null tombstone 三态校验、异型 fail-loud;W7F mapOverride 独立未被吞(数值拒绝 :65-72 保留)。R1-R3 落地确认。
  4. **单一模型**:content `Command` 联合零 unmigrated;`grep -rl '"unmigrated"' projects/pal/content/` = 0;`runLegacyOp` 全仓 0 命中,第二解释器删净。
  5. **门禁未回归(独立重跑)**:migrate dry-run `writes=0 deletes=0 conflicts=0`,门禁数字与 Build 记录逐项一致(compact 1.53x/pretty 0.99x/commands 1.53x/closure 435884B/ref-warnings 0);`reforge check` 334 tests 全绿。
  6. 定向测试 rng-presentation/rng-player/save-ops 13 passed。
- GLM: **accept（2026-07-14;见下）**
- counter / 返工处理: 无(Opus 无返工项,GLM 无 counter)。
- 缺签豁免: N/A
- done 准入结论: **三方 done 前审查签字齐（Codex + Opus + GLM accept），用户于 2026-07-14 确认“齐了”，R2 done。**

### GLM done 前覆盖复验（2026-07-14）

增量范围：76df4665（实现）+ 6072dd57（交接）+ b90b88c4（Opus 复验签 accept）。未改实现文件，独立实测 + 四包测试复跑。四包 832 tests pass + 1 skip（content 173 / reforge 334 / editor 163 / migrate 162+1skip）。

**(1) N1-N2 落地** ✅
- **N1（flowCuts=0 断言）**：设计签时标的"无断言"已解决。`script-library-audit.test.ts:140` `expect(migrated.scriptReport.flowCuts).toBe(0)` —— 真断言非日志。✅
- **N2（0x6D 迁移四形态）**：设计签时标的"仅 op1-only"已解决。`translate-events.test.ts:277-309` 四形态全覆盖：
  - op1-only `[21,2920,0]` → `setSceneOnEnter{scene:s020,_addr:2920}` ✅
  - op2-only `[21,0,777]` → `setSceneOnTeleport{scene:s020,_addr:777}` ✅
  - both-set `[21,2920,777]` → 双命令独立非互斥 ✅
  - both-zero `[21,0,0]` → 单条 `clearSceneScripts{scene:s020}` 双槽禁用 ✅
- translate-events.ts:1297-1334 handler 产出 `setSceneOnEnter`/`setSceneOnTeleport`/`clearSceneScripts`，与 schema 一致。

**(2) 66 项旧产物残余归零 + 0x78 对账** ✅
- **静态扫描**：`grep '"unmigrated"' projects/pal/content/` = 0；`grep '"unmigrated"' packages/{content,reforge,editor}/src` = 0；`grep runLegacyOp packages/` = 0；`grep '"opcode":0' projects/pal/content/scripts/` = 0（产物中不再有任何 opcode 键）。✅ 四模式全零。
- **0x78 no-op 对账**：translate-events.ts:1291-1293 `0x78 → push(undefined) + knownNoOp`。**测试断言 `knownNoOps['0x78']===34`（script-library-audit.test.ts:141-143）**——46 个旧产物节点来自 **34 个可达源站点**被不同 owner 重复展开；报告按源地址去重（knownNoOpSites Set 去重，translate-events.ts:527-533）。**这是正确的去重口径，不是数量错误**：46=预去重节点数，34=去重后源站点数。测试注释已解释 46→34 的去重关系。✅

**(3) R1 五类归一化专测** ✅（4.5/5）
- **(b) null tombstone 往返**：ops.test.ts:120-140 `JSON.parse(JSON.stringify({onEnter:null,onTeleport:null}))` → assert null 不回退静态。✅
- **(c) 异型 fail-loud**：ops.test.ts:142-169 旧数字 onTeleport throw `/onTeleport[s059].*ScriptStage/` + 未知槽 throw `/未知槽 map/`。✅
- **(d) 新档直通**：ops.test.ts:29-47 + 59-74 结构默认 + mapOverride 直通。✅
- **(e) mapOverride 不被吞**：ops.test.ts:117 `expect(normalized.mapOverride).toEqual({s059:'map-024'})`——归一化 onTeleport 时 mapOverride 独立保留。✅
- **(a) 合法旧档逐字段迁移**：ops.test.ts:95-118 旧 `onTeleport` → sceneScriptOverrides + 旧字段删除。✅（注：旧存档只有 onTeleport 字段，无 onEnter 旧字段路径——设计如此，非缺口）
- **tri-state schema**：content/script.ts:25-28 `SceneScriptOverride{onEnter?:RuntimeScriptBinding|null, onTeleport?:...}`；三态 = 缺席(继承)/值(覆写)/null(禁用不回退)。mapOverride 在 :244 独立 sibling。✅

**(4) 测试总量与门禁** ✅
- 四包独立重跑：content 173 / reforge 334 / editor 163 / migrate 162+1skip = **832 pass**。
- migrate dry-run：`writes=0 deletes=0 conflicts=0`，compact 1.53x / pretty 0.99x / commands 1.53x / closure 435884B，ref-warnings=0。✅ 幂等。

**(5) RNG 呈现栈单测矩阵** ✅（核心覆盖+非阻塞缺口）
- rng-presentation.test.ts 3 tests：
  - **(b) 零帧段清备份**：:56-70 beginPlayback+finishPlayback 无帧 → hasBufferedFrame=false。✅
  - **reset 边界**：:50-53 reset → idle/buffered=false/visibleFrame=undefined。✅
  - 连续段保留上一帧。✅
- **非阻塞缺口**：(a) 幂等 finishPlayback 无专测（impl-safe：rng-presentation.ts:34 `if(mode!=='playing')return`）；(c) enterDialogue 无帧不进仅隐式覆盖；(d) reset 未绑定具体边界事件（scene switch/quitToTitle/abort 在 main.ts 接线，Opus 8438 帧浏览器已实测零闪屏）。**Opus 视觉面 8,438 帧逐帧采样 worldFlash=0/dlgNoLayer=0 已交叉验证**，单测缺口不改变结论。

**总结**：N1-N2 已落地（flowCuts=0 真断言 + 0x6D 四形态全测）；66 项产物归零（四模式静态全零）；0x78 去重口径正确（34 站点=46 节点去重）；R1 归一化四类半覆盖（onEnter 旧字段不存在=设计如此）；832 tests pass + dry-run 零计划；RNG 单测核心覆盖（非阻塞缺口由 Opus 8438 帧浏览器补验）。**accept**。

**非阻塞观察（不影响 accept）**：
- O1：0x78 卡内"46"宜补注"34 去重后源站点"（测试注释已解释，卡内措辞建议对齐）。
- O2：RNG 单测 (a) 幂等 finishPlayback / (c) 独立 enterDialogue / (d) 边界事件绑定——impl-safe + Opus 浏览器交叉验证，非阻塞。

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

- 在重新生成 PAL 后删除旧 opcode 第二解释器及其 opcode case；不保留“兼容旧工程”的隐藏入口。
- 工程加载/校验若发现旧 `unmigrated`，给出“请重新迁移”的明确错误并拒绝运行，不能静默跳过。
- 仅供旧 opcode 第二解释器的 host API 在无 clean 命令调用者后删除；已有 clean 命令继续走各自 host API。

#### F. 实施分期

1. 建迁移诊断类型和全地址索引，先让 17 个假缺失真实翻译。
2. 落 `0x6D` tri-state 契约、`0x78` no-op 与 `0xA0` clean 映射。
3. 重生成 PAL，静态扫描产物归零并复核图/体积/MG2 门禁。
4. 删除 content/editor/reforge 的 `unmigrated` 与旧 opcode 第二解释器，补拒绝旧工程的校验。
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
  5. **E 删除顺序** — 重生成→静态归零→删旧 opcode 第二解释器→加载拒绝,顺序正确;孤立 host API 按调用图分离后删。
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
- GLM: **agree**。66 项分类矩阵零漏项(46+17+2+1 全独立实测,L_n===n 零例外,15 地址逐一有效);测试矩阵基本完整,两处 build 必落(flowCuts=0 断言缺失+0x6D 迁移四形态升级);M3/MG2 门禁已有覆盖(43,503+双跑零计划);R1 归一化可操作(W7F save/ops 先例可复制)。关键发现:旧 opcode 兼容函数当前不处理 0x6D/0x78/0xA0(docblock"留 batch2"),49 残余运行时静默 fall-through——删除更安全无现存行为需保留。N1(flowCuts 断言)+N2(0x6D 四形态)非阻塞。
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

- Coding Owner: Codex（三方设计签字齐后进入 build）
- Build commit: `76df4665`。
- 修改文件:
  - `packages/content/src/script.ts` 及校验测试：clean Command、sceneScriptOverrides 三态契约、旧节点拒绝。
  - `packages/migrate/src/*` 及测试：43,503 全地址索引、MigrationGap、0x6D/0x78/0xA0、审计门禁。
  - `packages/reforge/src/*` 及测试：删除旧解释器、三态解析/存档归一化、quitToTitle、RNG 呈现栈。
  - `packages/editor/src/*`：命令目录/表单/树/引用扫描移除旧节点并接 clean 命令。
  - `projects/pal` 与 `packages/migrate/baselines/pal`：由迁移器事务重生成 99 个托管文件。
  - content schema、脚本设计/审计、能力表和路线图同步更新。
- 实现摘要:
  - 全局 `all.json` 的 43,503 个数组地址全部注册为 `L_n`，并对 4,123 个显式 label 断言 `L_n === n`；
    15 个唯一假缺失地址均翻译为真实 `end/raw:0x05/setDialogStyleBottom` 目标，不再生成 opcode-0 占位。
  - `MigrationGap` 只存在迁移器内部；可达 gap/flow cut 写盘前 fail-loud。46 个旧产物 0x78 对应 34 个唯一源站点，
    作为已证明 no-op 丢弃；0x6D 四形态映射统一 `sceneScriptOverrides`；0xA0 映射 `quitToTitle`。
  - content/editor/reforge 删除可执行 `unmigrated` 与旧 opcode 第二解释器；旧工程节点在 content 校验层以
    “旧工程产物，请用迁移器重新生成”拒绝。R1-R3、N1-N2 均已落测试。
  - 旧存档 `world.script.onTeleport` 逐字段归一化到 `sceneScriptOverrides`；null tombstone 往返保留，异型 fail-loud；
    W7F `mapOverride` 保持独立，未被吞并。
  - s281 验证发现一阶段已修过的 RNG 对话闪屏回归，按架构收敛为
    `World Layer -> Cinematic Layer(RNG) -> fade -> UI Layer -> output effects`。RNG 播放帧与对话末帧保持共用
    `idle/playing/buffered/dialogue` 状态机，首帧加载、连续段、清对话、切场景/读档/退出均有明确生命周期。
- 运行命令:
  - `pnpm --filter @type-pal/content test`
  - `pnpm --filter @type-pal/migrate test`
  - `pnpm --filter @type-pal/reforge check && pnpm --filter @type-pal/reforge build`
  - `pnpm --filter @type-pal/editor test && pnpm --filter @type-pal/editor build`
  - `pnpm --filter @type-pal/migrate run migrate:content -- --write`，事务 199 项；内部二次生成零计划。
  - `pnpm --filter @type-pal/migrate run migrate:content`，最终 plan `writes=0 deletes=0 conflicts=0`。
  - `pnpm check`（通过；Biome 检查 666 个文件，全仓测试门禁全绿）。
- 生成/静态证据:
  - 生成门禁：compact `1.53x`、pretty `0.99x`、commands `1.53x`、最大依赖闭包 `435884B`；
    源命令覆盖 `43,503`、`flowCuts=0`、阻塞 gaps=0。
  - PAL 产物 `kind: "unmigrated"` 为 0；全仓旧解释器函数标识符为 0。
  - s059 产物安装 `scene/s059/override/on-teleport/L-11870/stage-0`；s172 首命令为
    `clearSceneScripts scene=s182`；s281 末命令为 `quitToTitle`。
- 浏览器 / 手工检查:
  - 6051：s059/s172 代表路径按需加载对应 scene chunk；s172 运行态观察到
    `sceneScriptOverrides.s182={onEnter:null,onTeleport:null}`，没有回退静态槽。
  - 6051：新游戏开场进入 s001 后真实方向键移动触发 s001 -> s003；仅请求 s000/s001/s003 场景分片，零运行错误。
  - 6051：s281 从 e4800 结局触发点进入，最终战只在战斗态显式设胜利并逐页确认结算；6 段 RNG 与 6 组后续对话
    逐浏览器帧审计，`dialogueWithoutLayer=[]`、`bufferedFrames=[]`，最终到 `?menu`，控制台零错误。
- 跳过的检查及原因: 未手工完整打赢赤鬼王再从物品菜单使用引路蜂；该行为由 0x6D 四形态迁移单测、三态
  runtime/save 单测、s059 正式生成绑定与浏览器分片加载共同覆盖，留给 Opus review 选择是否补跑长路径。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + Opus
- 验证方式: Playwright 前台同等浏览器路径 + 每个 requestAnimationFrame 的 RNG layer 状态审计 + 原图截图复核。
- 截图 / 像素检查路径:
  - `/tmp/r2-rng-stack-playing.png`：Cinematic Layer 播放帧，无大世界闪回。
  - `/tmp/r2-rng-stack-dialogue.png`：同一 RNG 末帧上叠 UI Layer 对话。
  - `/tmp/r2-rng-stack-menu.png`：0xA0 后回标题。
- 结论: Codex 视觉自验通过；6 次 playing / 6 次 dialogue 一一对应，所有对话帧 `rngLayerVisible=true`，
  段间没有一帧进入 buffered 露出 World Layer。
- Opus 独立复验(2026-07-14): 通过。方法独立于 Codex(chrome-devtools CDP + rAF 逐帧采样 + sessionStorage
  跨导航持久化,非 Playwright):s281 全链 8,438 帧,playing/dialogue 帧 `rngLayerVisible` 全 true(worldFlash=0)、
  对话帧零 buffered 叠加(dlgNoLayer=0),六循环 `playing → dialogue → playing` 转移序列与 Codex 报告一一吻合,
  quitToTitle 后 `?menu` 控制台零错误。两条独立路径同结论,视觉验证交叉成立。
- 未完成项: 无。

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: **三方 accept**。Codex 自审 + Opus 实现/视觉主审 accept + GLM 覆盖/测试矩阵 accept。
- 必须返工项: 无。
- Accept / rework: **三方 accept，无返工项。**

## 用户验收

- 用户结论: **done**（2026-07-14）。三方 done 前审查签字齐（Codex + Opus + GLM accept），用户本轮确认“齐了”。
- 后续任务: R3/A7 + R7 资源单一注册表与工程资源闭包。

## 交接日志

- 2026-07-14 Codex: 完成现状复核并建立 R2 设计。证据：PAL 产物 66 项递归统计；`all.json` 43,503
  条命令/4,123 显式 label 全量下标断言；15 个唯一缺失地址逐项读取均为有效命令。Next: Opus 设计主审，禁止实现。
- 2026-07-14 Opus: 设计主审签 **agree + R1-R3 必改 + S1 建议**。独立重验:L_n===下标 n 全量断言零例外;15 个缺失地址逐一有效(0x5/end/样式类收尾点)——**公开修正本人 M3 期"源悬空"错误结论**(只验 label 存在性之误)。0x6D 真值同构/产物双站点复核一致/旧 opcode 兼容层自认。裁定:统一 sceneScriptOverrides 采纳。R1=旧存档归一化规格+null 往返专测;R2=统一槽不吞 W7F mapOverride;R3=旧节点拒绝文案特判导向重迁。Evidence: 主审立场六点+重验脚本输出。Next: GLM 覆盖复核(66 项分类矩阵/四形态测试/静态扫描口径);三签齐后 Codex 按分期 1-5 build。未改实现文件。
- 2026-07-14 GLM: 设计复核签 **agree**。四项独立实测：(1)66 项矩阵零漏项——46×0x78(全[0,0,0])+17×opcode0(15唯一地址,全<43503无label,L_n===n零例外)+2×0x6D(s059[60,0,11870]/s172[183,0,0])+1×0xA0(s281结局[0,0,0])，根因 labelAt 只登记显式 label 确认；(2)测试矩阵基本完整,两处 build 必落——flowCuts=0 无断言(当前零命中)+0x6D 迁移仅 op1-only 需升级四形态(一阶段 event-system.test:4587-4624 已有四形态真值)；(3)M3/MG2 门禁——43,503 覆盖断言已有(script-library-audit.test:137)+MG2 双跑零计划已有(pal-migration-integration.test:57-131)；(4)R1 可操作——W7F save/ops.ts:64-79 validateMapOverride 先例可复制+null 往返秒级单测。关键发现:旧 opcode 兼容函数不处理 0x6D/0x78/0xA0(docblock"留batch2"),49 残余运行时静默 fall-through,删除更安全。N1-N2 非阻塞。Evidence: 设计签字 GLM 行。Next: Codex 落 R1-R3 + N1-N2;三签齐已 build allowed。未改实现文件。
- 2026-07-14 Codex: build 完成并转 `review`。66 项旧产物残余已通过上游迁移修复归零，clean schema/runtime/editor
  不再含第二解释器；MG2 写入后内部二跑与最终外部 dry-run 均零计划。s059/s172/开场/s281 代表路径完成浏览器验证。
  s281 复验时发现并修复一阶段已知 RNG 对话闪屏，改为显式 World/Cinematic/UI 呈现栈；6 段 RNG 逐帧审计
  无世界层泄漏，结局正常回标题。Evidence: Build/视觉记录与实现提交 `76df4665`。Next: Opus 实现+视觉主审，禁止标 done。
- 2026-07-14 Opus: 实现/视觉主审签 **accept,零返工项**。代码审查:RNG 四模式状态机+独立 rngLayerCanvas 逐帧合成
  (真分层非截图)、生命周期 reset 三边界(场切/quitToTitle/读档)、save/ops 三态归一化 fail-loud、mapOverride 独立、
  Command 零 unmigrated、runLegacyOp 全仓 0 命中。独立复验:6051 前台 s281 全链(触发→19 组前置对话→战斗态显式
  win→6 段 RNG+对话→?menu),**8,438 帧 rAF 采样 worldFlash=0 / dlgNoLayer=0**,buffered 无可见持续态,console 零错;
  与 Codex Playwright 路径同结论,视觉交叉成立。门禁重跑:migrate dry-run 零计划(门禁数字逐项吻合)、reforge 334
  tests 全绿、定向 13 tests。战斗备注:selectAction 态外部改敌 HP 不结算属设计(胜负检查在行动结算点
  battle-session.ts:617/625),非缺陷。Evidence: done 前签字 Opus 行+视觉验证记录。Next: GLM 覆盖复核,齐签后由用户
  验收标 done;未改任何实现文件。
- 2026-07-14 GLM: done 前覆盖复验签 **accept**(76df4665 + b90b88c4)。五项独立实测+四包复跑(832 pass)：(1)N1-N2 落地——flowCuts=0 真断言(script-library-audit.test:140)+0x6D 四形态全测(translate-events.test:277-309 含 both-zero→clearSceneScripts)；(2)66 项归零——静态四模式全零(unmigrated/runLegacyOp/opcode-0 均零命中)+0x78 对账 34 去重站点=46 预去重节点(knownNoOpSites Set 去重,测试注释已解释)；(3)R1 五类归一化——null 往返/异型 fail-loud/新档直通/mapOverride 独立全有专测,旧 onTeleport 逐字段迁移有测(旧 onEnter 字段不存在=设计)；(4)门禁——832 tests pass + dry-run writes=0；(5)RNG 单测核心覆盖(零帧清备份+reset)，非阻塞缺口(幂等 finishPlayback/边界事件绑定)由 Opus 8438 帧浏览器交叉验证。O1(0x78 卡内措辞)+O2(RNG 单测缺口)非阻塞。Evidence: done 准入 GLM 复验段。Next: 三签齐，交用户验收。未改实现文件。
- 2026-07-14 User/Codex: 用户确认三方签字齐；Codex 核对任务卡、审查提交与门禁证据后完成最终收口。R2 状态保持 `done`，从进行中看板移除。

## 下一位 Agent 提示词

无下一位 Agent 提示词。R2 已完成三方审查与用户验收，状态为 `done`；后续 R3/A7 + R7 另开任务卡。
