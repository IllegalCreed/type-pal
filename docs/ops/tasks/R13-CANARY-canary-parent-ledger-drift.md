# R13-CANARY - R13-Z 闭包批次 canary 父账重建漂移（6A 冷 canary 恢复绿）

Status: draft
Phase: phase2
Capability: MG2 / R13 source semantics 父账 / canary 双面重放
Coding Owner: Codex（Kimi R1 剥离裁定指定）
Generation Owner: N/A
Reviewer: Kimi（架构/runtime 主审）+ GLM（数据/测试矩阵主审）
Visual Verification Owner: N/A
Unavailable Agents: none
Branch: TBD

## 目标

修复 R13-Z 闭包批次（a25b1984 → 3ed0f77b 区间）引入的 R13-6A 冷 canary
（r13-source-semantics-canary.pal.test.ts）父账重建漂移：`test:canary` 双面重放恢复
2/2 绿。**冻结 pin `R13_SOURCE_SEMANTICS_PARENT_SOURCE_REPORT_DIGEST`
（86bbb33f…）不得重写**；6D 的 stable/fast scripts allowlist 卫生不得回滚。

## 范围

- 范围内:
  - 定位**首个破坏提交**（a25b1984 → 3ed0f77b 区间逐提交回放），并为每个独立失败
    形态（eb921822 oracle bytes / e58476a7 source-backed domain observation /
    58f8f846 parent content authority / c71482db 起 parent report f021b0a8…）修复
    上游根因。
  - 恢复 canary 双面重放绿（producer rebuild 命中 R13-6A golden + live authority
    重放同 seal 零写），并在保留 allowlist 卫生前提下达成。
  - 相关 oracle golden（若修复改变父账 digest 的合法组成）走显式更新 + 三方审查。
- 范围外:
  - 不重写 86bbb33f；不以回滚 allowlist 卫生蒙混。
  - 不改 R13-6C/6D 已三方 accept 的证据/账户字节（6C seal / 源账 / 运行时 digest
    保持 82e9f8f3…/83f68115…/0a67ee07…）。
  - 不把 R13-Z 其余门禁（全量重迁双跑、browser、正式发布）挪进本卡。
- 明确不做:
  - 不把 canary 红归因给 6C/6D（Kimi 已认领误判并剥离）。

## 上下文锚点

- 已拍板决策 / 铁律:
  - AGENTS.md：schema/save/migration 属高风险，须三方签字；先修上游不堆叠。
  - N3-1 卡 R13-Z 节：Kimi R1 重界定 accept（R1 剥离本卡立项）；GLM accept。
- 代码锚点:
  - `r13-source-semantics-mg2.ts:1455`（parent report 漂移检查）、`:246-262`
    （stable/fast scripts allowlist 对齐，保留）。
  - `r13-source-semantics-canary.ts:146-155`（trusted digest 注册）、
    `published-r13-source-semantics-test-fixture.ts:71-104`（6C/6B 重放链）。
  - 二分证据：N3-1 卡「R1-R5 返工与 R1 二分结论」。
- 已知坑 / 审计文档:
  - 父账 identity 对 report.scripts 内容不敏感（Kimi 实证），漂移源在闭包批次
    对父账重建的改动。
  - 中间提交各自独立失败，非单一回归。
- 不得重新引入:
  - 冻结 pin 重写；allowlist 回滚；R13-6C/6D 证据字节变化。
- 相关测试:
  - `r13-source-semantics-canary.pal.test.ts`（2 测）、`test:canary` 全链路、
    `test:fast`（79 files/577 passed 基线）。

## 验收条件

- 功能: `pnpm --filter @type-pal/migrate test:canary` 2/2 绿；producer rebuild 命中
  R13-6A golden（seal/authority/sourceDisposition digest 逐字节一致）、replay 零写。
- 测试: fast 79+ / 577+ 绿；为每个修复形态补回归测试。
- 文档: 首个破坏提交定位 + 每个失败形态根因 + 修复方式记入本卡。
- 视觉 / 手工验证: N/A。

## 推进签字

### 进入 build 前:设计签字

- Codex: agree（本卡 draft 即实现方设计草案，含二分证据链）
- Kimi: pending
- GLM: pending
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

首个破坏提交已定位（19ce1ca7 JS1，370 lossy 备注文本进入父账 digest；B11-1/
调色盘批次继续叠加至 f021b0a8）。修复方向：父账 digest 组成对文档性 lossy 备注
文本不敏感（只取结构性字段），或 370 备注变更按 successor-only 门控——两者都
不重写 86bbb33f、不回滚 allowlist 卫生。修复后先跑 canary 2/2，再跑 fast +
双口径 dry-run 确认 6C/6D 证据字节不变。

### 已知风险

- 风险: 闭包批次改动面大（source-instruction-disposition 多证据族），父账 digest
  组成可能涉及多个字段；修复可能牵动 R13-Z 源账。
- 缓解: 逐提交回放 + 每步只动最小根因；canary 为最终判据；6C/6D 证据字节 pin
  作回归护栏。

### 主审立场

- Reviewer: Kimi（父账/重放语义）+ GLM（数据/测试矩阵）
- 结论: pending
- 必改项: N/A
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: canary 红系 R13-Z 闭包批次遗留（二分实证，早于 6C/6D）。
- Kimi: 认领 R1 误判并剥离本卡（2026-08-05 accept）。
- GLM: 对 6C/6D 返工 diff accept；本卡待审。
- 用户拍板: N/A

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: TBD（定位后）
- 实现摘要: 待填
- 运行命令: `pnpm --filter @type-pal/migrate test:canary` /
  `test:fast` / `migrate:content -- --r13-z --r13-6c --r13-6d`（dry-run）
- 浏览器 / 手工检查: N/A
- 跳过的检查及原因: N/A

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: N/A
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: R13-Z 剩余门禁（全量重迁双跑、browser、正式 --write 发布、
  C8/ED-5I 联合验收）

## 交接日志

- 2026-08-05 Codex: 开卡（Kimi R1 剥离裁定指定）。Evidence: N3-1 卡
  「Kimi R1 重界定 + R2-R5 返工复核」accept、二分证据链。Next: 三方设计签字后
  进入 build（首个破坏提交定位）。
- 2026-08-05 Codex: **首个破坏提交定位完成**。git worktree 逐提交回放
  （含逐提交重新生成 oracle fixture 排除陈旧干扰）：
  - **eb921822（JS1 之前）重新生成 fixture 后 canary 2/2 绿** —— 基线干净。
  - **19ce1ca7（JS1）canary 红：parent report 漂移 86bbb33f… →
    1a823bc4…**（首个破坏提交）。
  - c71482db / HEAD：漂移值进一步变为 f021b0a8…（B11-1/调色盘批次继续贡献）。
  - 根因机制（diff 实证）：JS1 在 migrate-content.ts:647-650 **无条件改写 370
    lossy 备注文本**（“按饮酒动态”→“按剩余真气×8 动态”），该文本进入
    compacted current migration 的 report.content.lossySkills →
    R13-5 父源账 digest 漂移；B11-1/调色盘批次的 disposition/内容改动继续叠加。
  - 修复方向（待三方设计裁定）：父账 digest 组成对“文档性 lossy 备注文本”
    不敏感（只取结构性字段），或 370 备注变更按 successor-only 门控，或经三方
    批准重算 pin（Kimi 明确禁止重写 86bbb33f，故优先前两者）。

## 下一位 Agent 提示词

```text
接手任务: R13-CANARY canary 父账重建漂移（设计复审）
任务卡: docs/ops/tasks/R13-CANARY-canary-parent-ledger-drift.md
当前状态: draft；Codex 已写设计草案 + 二分证据链，未准入 build。
你的角色: Kimi/GLM 设计复审（只读）。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡、N3-1 卡 R13-Z 节（Kimi counter、
  R1 二分结论、R1 重界定 accept）、r13-source-semantics-mg2.ts:1455/:246-262、
  r13-source-semantics-canary.ts、published-r13-source-semantics-test-fixture.ts。
已完成: 二分定位（c71482db 起 parent report f021b0a8…；eb921822/e58476a7/58f8f846
  各自失败形态）；6D allowlist 卫生保留。
请你做: 对设计方向（逐提交定位 + 最小根因修复 + canary 判据 + 6C/6D 证据 pin 护栏）
  签 agree 或 counter；给出首个破坏提交定位的优先建议。
不要做: 不得改实现文件；不得建议重写 86bbb33f 或回滚 allowlist。
输出要求: 签字 agree/counter 理由；build 准入建议。
```
