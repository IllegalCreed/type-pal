# OPS-MAP-1 - 能力地图真值对账与选择器校准

Status: draft
Phase: ops
Capability: capability-map / roadmap truth
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/d15-movement-premise-gate

## 目标

让能力地图、任务卡、git 完成记录和用户验收重新一致，并删除已经完成能力仍被推荐为“下一步”的陈旧
选择器文案。对账完成前不据此启动新产品任务；证据不完整的能力保持未完成或 `blocked`，不猜测补齐。

## 范围

- 范围内:
  - 对账 `docs/phase2/capability-map.md` 中 W9、E18、C8、N3、B11 注记、议题 18 与 §4/§5 选择器；
  - 核对任务卡头部 `Status`、done 前三签、用户验收节与对应 git 提交是否一致；
  - 修正 `docs/ops/board.md` 中违反“只保留进行中/阻塞任务”的 done 行；
  - 按修正后的半 done/缺失格重新运行选择器，给出下一产品任务候选及直接依据。
- 范围外:
  - 不修改任何产品代码、schema、save、migration 或 generated content；
  - 不为缺失的用户验收代签，不把 commit message 单独当作用户验收；
  - 不顺手实现被选中的下一产品任务；
  - 不重写能力地图历史，只修客观陈旧状态和当前选择器。
- 明确不做:
  - 不因任务卡首行写 `done` 就自动把能力格改为 `✅`；
  - 不因地图当前写 `❌/draft` 就忽略任务卡和 git 中更晚的完成证据；
  - 不用本卡替用户补 E18 等缺失的最终产品验收。

## 前提真值门

### 一句话行为 / 工程前提

当前能力地图的多处状态和“下一步”建议落后于任务卡/git，若不先对账，下一轮选择器会推荐已经完成的能力。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：本卡只校准项目治理状态，不改变游戏行为 | 本卡范围；`docs/phase2/capability-map.md:203-224` |
| 第一阶段 | N/A：不作机制判断；下一产品任务另开卡后再核一阶段真值 | 本卡范围外 |
| 当前二阶段 | 地图仍把 W9/E18 写 draft、C8 写 review、N3 写 build，并把 W1/E6 当下一步；对应多张任务卡已写 done，部分源卡自身又有 `done`/用户 pending 矛盾 | `docs/phase2/capability-map.md:62,77,90,98,174,192-199`; `docs/ops/tasks/{W9-entity-lifecycle-respawn,E18-1-editor-actor-battle-fields,C8-item-use-mechanisms,N3-1-script-control-flow-modernization}.md:3` |
| 本任务目标 | 逐能力建立 `task status + 三签 + user acceptance + git` 四证对账；全证成立才更新完成，证据冲突则停线并明确待谁确认 | 本卡验收条件 |

### 已发现的证据冲突

| 项 | 地图 | 任务卡 / git | 初步处置（待审） |
|---|---|---|---|
| W9 | `❌ / draft` | 卡头 `done`；提交 `b9de09d0` 的 diff 记录 User 2026-08-12 accept，但卡内旧“用户结论: pending”未回填 | 核 commit 与三签后回填用户节并更新地图；不得只看卡头 |
| E18 | `— / ❌ / draft` | 卡头 `done`；`9952aa53` 写 three accepts，但同提交仍写“待用户验收后标 done”，当前用户节仍 pending | 无用户证据前 fail-closed：不得把地图改 `✅`；应将源卡状态纠正为 review 或请用户确认 |
| C8 / ED-5I | `⚠️ / review，等待 N3-1` | 两卡卡头均记录 2026-08-06 用户联合验收 + 三方 accept + done | 核证后更新地图，不再保留已解除依赖 |
| N3 | 行状态 `✅/✅`，备注仍称 R13 build/不得 done | N3-1 卡头和用户结论均为 2026-08-06 done | 只更新陈旧备注，不改变已正确的格状态 |
| B11 / 议题18 | 注记仍称 E18/W9 draft | W9 有完成证据；E18 验收冲突待解 | 分别写真实状态，不用一个总称掩盖差异 |
| §4/§5 | 仍称 W1 地图绘制缺、E6 唯一最高优先 | W1/W7 表已 `✅/✅`；E6 引擎及依赖链已完成，残留仅低优先调试可视化 | 删除陈旧推荐，按修正后地图重跑选择器 |
| ops board | 仍保留 `D15-1 done` | board 规则明确只保留进行中/阻塞 | 移除 done 行 |

### 反证与替代解释

- 最强替代解释: 地图的旧文字可能故意保留历史，而非陈旧错误。
- 什么观察会推翻当前前提: 若对应段明确标注为历史快照、且 §5 选择器不会消费这些文字，便不应改；当前
  §4 标题和 §5 标准动作明确声称用于“决定先做谁”，所以该反例暂不成立。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: N/A，本卡不审产品行为；
  - 原版 / 第一阶段理解: N/A，本卡不据此改机制；
  - extractor / 地图 / 数据解码: N/A；
  - audit / test model: 本次 Node 扫描只发现候选 mismatch，不自动决定最终状态；最终以四证人工对账。

### 用户可见偏离

- 是否主动偏离已核真值: no
- `before -> after` 一句话: 能力本身不变，只把路线图从陈旧状态改为已有证据支持的真实状态。
- 代表场景: N/A
- 用户裁决: 2026-08-13 用户指示“推进”；本卡不把该指示解释成 E18 的历史用户验收。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md` 前提真值门：关键 unknown 必须 blocked；capability-map 状态变化必须三方介入；
  - `docs/phase2/capability-map.md:203-224`：下一步选择器与“一轮一承诺”；
  - `docs/ops/board.md`：看板只保留进行中和阻塞任务。
- 代码 / 文档锚点:
  - `docs/phase2/capability-map.md:52-174,180-224`；
  - 本卡真值矩阵中列出的五张任务卡；
  - `git show b9de09d0 -- docs/ops/tasks/W9-entity-lifecycle-respawn.md`；
  - `git show 9952aa53 -- docs/ops/tasks/E18-1-editor-actor-battle-fields.md`。
- 已知坑 / 审计文档:
  - 卡头、正文、git 和用户验收可能不同步；任何单一来源都可能陈旧；
  - commit message 的 `done` 不等于用户在产品层验收；
  - 地图表格状态正确但备注错误，仍会污染选择器判断。
- 不得重新引入:
  - 只看任务卡首行；
  - 只看能力地图当前符号；
  - 把“技术三签”冒充“用户验收”；
  - 为了尽快选下一项而把 unknown 写成 done。
- 相关测试:
  - 文档四证对账脚本、链接/状态一致性扫描、陈旧关键词扫描、`git diff --check`。

## 验收条件

- 每个修改的能力格都有任务卡 Status、三方 done 签字、用户验收、git 提交四列证据；缺任一列则保持
  非 done 并写明责任人/下一步。
- W9 卡内历史 `用户结论: pending` 与真实提交证据一致化；若无法证明用户 accept，则 W9 也不得升级地图。
- E18 不得因卡头 `done` 自动升级；无直接用户证据时纠正为 review/pending，并在地图保留未完成。
- C8/ED-5I/N3 的 2026-08-06 联合验收若四证成立，解除地图陈旧依赖说明并更新真实状态。
- §4 不再把已完成的 W1/E6 主链写成当前最高优先；§5 保留通用选择算法，并基于修正后表格给出新一轮候选，
  不把候选自动写成已承诺任务。
- board 移除 D15-1 done 行，只保留本卡及既有 draft/blocked 项。
- `git diff --check`、Markdown 链接检查和陈旧关键词扫描通过。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-08-13）**。直接证据见本卡真值矩阵和逐项 `file:line`/git 提交；地图
    当前会推荐已完成 W1/E6，且 W9/E18 源卡存在不同类型的证据冲突。
  - design: **agree（2026-08-13）**。采用四证 fail-closed 对账；不把用户“推进”代签成 E18 验收。
- Kimi:
  - premise: pending | verified（必附直接证据） | counter | N/A（须说明）
  - design: pending | agree | counter
- GLM:
  - premise: pending | verified（必附直接证据） | counter | N/A（须说明）
  - design: pending | agree | counter
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: pending
  - 独立证据锚点: pending
  - 可证伪观察: pending
- counter / 分歧处理: none
- 缺签豁免: N/A
- build 准入结论: blocked（等待 Kimi / GLM）

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: none
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

先做来源对账，再改地图；先修陈旧状态，再运行选择器。所有更新必须可从四证表回溯，证据冲突优先修源卡，
不能让能力地图成为第五份独立真相。

### 已知风险

- 风险: 历史用户验收存在聊天中但未落卡。
  - 缓解: git diff/任务日志能直接证明的回填；仍无法证明的保持 pending，并只请用户确认具体一项。
- 风险: 广泛对账变成重写整个地图。
  - 缓解: 本卡只处理已发现的明确 stale 项和当前选择器，不改无冲突行。
- 风险: 更新完成状态时误把编辑器/引擎两边混为一谈。
  - 缓解: 每格分别核引擎/编辑器能力与任务范围，不能只以任务名推导两列均 done。

### 主审立场

- Reviewer: Kimi（状态权威/流程边界）+ GLM（四证数据对账/覆盖）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: N/A
- 跳过的检查及原因: 产品测试 N/A；本卡只校准文档状态。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: 地图校准后由选择器提出下一产品任务；该任务另过前提真值门。

## 交接日志

- 2026-08-13 User: 指示继续推进。Evidence: 当前会话。Next: Codex 先提交 D15/OPS-TRUTH，随后
  按新制度建立地图真值对账卡。
- 2026-08-13 Codex: D15-1 与 OPS-TRUTH-1 已分别提交 `18ebeb44` / `81ac410b`，工作树归零；只读
  扫描发现 W9/E18/C8/N3/selector/board 明确不一致，建立本卡并签 premise/design。Next: Kimi / GLM
  独立四证审查；签字前不得修改 capability-map 或源任务状态。

## 下一位 Agent 提示词

```text
接手任务: OPS-MAP-1 能力地图真值对账与选择器校准
任务卡: docs/ops/tasks/OPS-MAP-1-capability-map-truth-reconciliation.md
当前状态: draft；Codex premise verified + design agree；build 准入 blocked on Kimi/GLM
你的角色: Kimi 审状态权威/流程边界；GLM 审四证数据对账/遗漏清单
先读: AGENTS.md 前提真值门、docs/phase2/capability-map.md:52-224、本任务卡、W9/E18/C8/ED-5I/N3-1
  五张任务卡，以及 git show b9de09d0 / 9952aa53 的对应任务卡 diff。
请你做: 独立核每项 task Status + done 三签 + user acceptance + git 四证；重点判断 W9 能否回填完成、
  E18 是否必须 fail-closed 回 review、C8/ED-5I/N3 是否可解除陈旧依赖；验证 W1/E6 选择器确已过时；
  把 premise verified/counter、design agree/counter、直接证据、可证伪观察和必改项写回本卡。
不要做: 不改 capability-map/board/源任务卡；不为用户代签；不开始下一产品任务。
输出要求: 明确 premise 与 design 结论；给出逐项四证表及任何 unknown 的责任人/下一步。三签不齐不得 build。
```
