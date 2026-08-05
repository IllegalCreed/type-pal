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
- Kimi: agree（2026-08-05，绑定约束 K1-K4 见「主审立场」；K1 与 GLM 的方案 1
  优先判断冲突，见「三方争议记录」）
- GLM: **agree**（2026-08-05，见交接）
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: 三方 agree 齐，可进 build（必须遵守 Kimi K1-K4；canary 2/2
  与 86bbb33f 不动是 K1 的自执行判据）

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
- 结论: Kimi **agree**（2026-08-05，绑定约束 K1-K4）；GLM **agree**（2026-08-05）
- 必改项: N/A（K1-K4 为选项空间收窄与记录义务，非返工）
- 是否建议进入 build: 是（三方 agree 齐，遵守 K1-K4）

- 2026-08-05 Kimi 设计主审：只读复审，签 **agree**（绑定约束 K1-K4）。一手核实：
  19ce1ca7 diff 实证酒神 370 lossy 备注无条件改写（migrate-content.ts:647-653，
  "按饮酒动态"→"按剩余真气×8 动态"）；机制链码级成立——父账重建以**当前代码**
  跑历史迁移（r13-enemy-script-mg2.ts:466 `migration: args.historicalMigration`），
  disposition 构建读取 report.content.lossySkills
  （source-instruction-disposition.ts:4815+），生成器文档性字符串漂移必入父账字节。
  架构根因：**父账面没有生成器级冻结**，任何备注/文案演进都会打破冻结重放——
  本卡修复必须把这个面封死，不能只治 370 一处。二分证据链（eb921822 绿 /
  19ce1ca7 首破 / 中间形态各异）未逐提交独立复跑，采信依据：首破提交的 diff 与
  机制链均一手核实，且 canary 本身是 build 的终极判据——归因若错修复不会转绿，
  build fail-closed，设计期复跑属冗余。

  绑定约束（build 必须遵守）：

  - **K1 修复选项空间收窄**：卡面方案 1「父账 digest 组成对文档性备注文本不敏感」
    在「不重写 86bbb33f」前提下**逻辑不成立**——pin = 旧组成（含旧备注文本）的
    digest，任何组成/归一化变化 ⇒ 计算值 ≠ 86bbb33f ⇒ 被迫重算 pin，与卡面自身
    约束矛盾。可行空间 = **方案 2（逐贡献者 face-gate，父账面恢复历史字节；可复用
    current-r13-6a profile 机制）**，或 **方案 3（贡献者级联深时为父账面 vendor
    冻结生成器快照）**。方案 1 仅在与"三方批准重算 pin"组合时成立，而重算 pin
    本席已否决。K1 由 canary 自执行：选方案 1 不重算 pin ⇒ 值永不匹配 ⇒ 保持红。
  - **K2 完整贡献者枚举**：19ce1ca7→HEAD 全部贡献者逐一定位（commit/字段/机制/
    门控方式）记入本卡；修一个跑一个，中间形态（oracle bytes / domain observation /
    content authority / parent report）各自闭环，canary 2/2 绿才算完。
  - **K3 当前面字节不变**：默认 dry-run writes=0/deletes=0/conflicts=0；
    `--r13-z --r13-6c --r13-6d` dry-run 的 6C seal=82e9f8f3…/源账=83f68115…/
    运行时=0a67ee07… 逐字节不变；pal-oracle 指纹除 producer-code 外不变；
    86bbb33f 与 6D allowlist 卫生保留。
  - **K4 回归测试与防回潮**：每个贡献者补回归测试；face-gate 处代码注释写明
    "父账面保留历史文案是冻结 artifact，不得回填新文案"；若现有测试对面无差别
    断言新备注文本，须改为面感知。

### 三方争议记录(按需)

- Codex: canary 红系 R13-Z 闭包批次遗留（二分实证，早于 6C/6D）。
- Kimi: 认领 R1 误判并剥离本卡（2026-08-05 accept）。
- GLM: 对 6C/6D 返工 diff accept；本卡设计 agree（2026-08-05）。
- **方案 1 可行性分歧（2026-08-05）**：GLM 设计意见偏好方案 1（digest 对文档性
  备注不敏感）并认为其不重写 86bbb33f；Kimi K1 裁定方案 1 在不重算 pin 下逻辑
  不成立（旧组成 digest ≠ 新组成 digest，除碰撞外必漂移），修复空间收窄为
  方案 2（face-gate）/ 方案 3（vendored 冻结生成器）。该约束由 canary 自执行，
  不阻塞 build；GLM 若坚持方案 1 须在 build 审查时给出不重算 pin 的成立证明。
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
    lossy 备注文本**（”按饮酒动态”→”按剩余真气×8 动态”），该文本进入
    compacted current migration 的 report.content.lossySkills →
    R13-5 父源账 digest 漂移；B11-1/调色盘批次的 disposition/内容改动继续叠加。
  - 修复方向（待三方设计裁定）：父账 digest 组成对”文档性 lossy 备注文本”
    不敏感（只取结构性字段），或 370 备注变更按 successor-only 门控，或经三方
    批准重算 pin（Kimi 明确禁止重写 86bbb33f，故优先前两者）。
- 2026-08-05 Codex: **K2 贡献者枚举进度（逐提交回放 + 重生成 fixture）**：
  - **19ce1ca7（JS1）= 首个破坏提交**：370 lossy 备注文本无条件改写 →
    parent report pin 86bbb33f 漂移（1a823bc4）。需 face-gate（Kimi 方案 2）。
  - **58f8f846（B11-1 coveredBy）→ parent content pin
    （R13_ENEMY_SCRIPT_PARENT_CONTENT_DIGEST）漂移**：coveredBy 无条件进
    actors.json → 生成的 content digest 变；**已被 0ea144c2 的 6B rewind 在父面
    剥离 coveredBy/casualty 缓解**（HEAD 该检查已过，不再贡献）。
  - **e58476a7 / 0ea144c2 区间新增独立失败形态**：`source-backed domain
    observation 漂移 domain-augmentation:3895b908…`（disposition 重建校验，
    先于 parent report 检查触发）——R13-Z 闭包批次的另一处断裂，需单列修复。
  - parent report 漂移值 1a823bc4 → f021b0a8 的中间贡献者待继续二分
    （候选 0ea144c2/d5c47a79/f0407264/3ed0f77b）。
  - K2 未完成：完整贡献者清单 + 逐形态修复仍在进行；canary 2/2 绿前不得收口。
- 2026-08-05 GLM：设计审查，签 **agree**。一手核实根因机制（非 Codex 摘要复述）：
  - **根因确认**：migrate-content.ts:647-650 JS1 把酒神 lossy 备注”按饮酒动态”改成
    “按剩余真气×8 动态”；该 notes 文本经 `lossy.push({notes:[...]})` →
    source-instruction-disposition.ts:4824 `currentLossySkills.set(id, 'skill-lossy:'+notes)` →
    r13-source-semantics-mg2.ts:243 `lossySkills: migration.report.content.lossySkills` 进入
    compacted migration → parent source report digest → 冻结 pin `86bbb33f...`（:55）不匹配 →
    canary 红。**根因链完整闭合** ✅。
  - **二分证据可信**：eb921822（JS1 前）重生成 fixture 后 canary 2/2 绿（基线干净）→
    19ce1ca7（JS1）红（首次破坏）。首个破坏提交定位成立 ✅。
  - **修复方向判断**：**方案 1（digest 对文档性备注不敏感）优先于方案 2（successor-only 门控）**。
    理由：lossy notes 是给人看的描述性注释，不是结构性数据。digest 应该只取 lossy 的
    结构性标识（`id` + `name`），不应取 `notes` 文本。方案 2 只修 370 一个 case，未来
    任何 lossy 备注文字改动都会再次漂移；方案 1 从根上消除”改注释导致 digest 漂移”的
    脆弱性。两者都不重写 86bbb33f、不回滚 allowlist 卫生 ✅。
  - **6C/6D 证据 pin 护栏**：修复后 `--r13-z --r13-6c --r13-6d` dry-run 的 6C seal
    `82e9f8f3…` / 源账 `83f68115…` / 运行时 `0a67ee07…` 必须逐字节不变 ✅。
  - **canary 2/2 是最终判据**：producer rebuild 命中 R13-6A golden + replay 零写。

  agree 仅准入 build。修复时须保留 allowlist 卫生、不重写冻结 pin、6C/6D 证据字节不变。
- 2026-08-05 Kimi：设计主审签 **agree**（绑定约束 K1-K4，见「主审立场」）。
  一手核实 19ce1ca7 diff 与机制链（父账面以当前代码跑历史迁移，无生成器级冻结）。
  K1 收窄修复空间：方案 1 在不重算 86bbb33f 下逻辑不成立，仅方案 2（face-gate
  恢复历史字节）/ 方案 3（vendored 冻结生成器）可行。三方设计 agree 齐，
  build 准入开放。Next: Codex 进 build（K2 逐贡献者定位 + 修复 + 每步 canary 判据）；
  GLM 若对方案 1 裁定有异议，build 审查时举证。

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
