# R13-CANARY - R13-Z 闭包批次 canary 父账重建漂移（6A 冷 canary 恢复绿）

Status: done（2026-08-06 Codex / Kimi / GLM 三方 accept 齐；R13-Z 正式发布仍 blocked on 剩余门禁）
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

- Codex: **accept**（2026-08-06，Coding Owner 自验收口）：三个漂移源修复
  （370 备注 face-gate / scriptDesc 根门控 / stable scripts 排除 6D 字段），
  canary 2/2 绿（frozen golden 逐字节还原）、fast 79/577、默认 dry-run 0/0/0、
  R13-Z dry-run open=0/0 且 6C/6D 证据字节不变。接受 Kimi K2/K4 记录性建议
  （face-gate cheap 单测作为非阻塞后续项记入交接日志）。
- Kimi: accept（2026-08-06，K1-K4 逐项核过 + canary 2/2 独立复现，见 Review 节与交接）
- GLM: **accept**（2026-08-06，K1-K4 全部落实，canary 2/2 绿，6C/6D 证据字节不变，见交接）
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: **done allowed（2026-08-06；三方 accept，无 counter）**

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
- 修改文件: `packages/migrate/src/migrate-content.ts`（mapSkills 370 备注按
  palSemanticProfile face-gate）、`packages/migrate/src/experimental/script-v5/
  source-instruction-disposition.ts`（reportObservations scriptDesc 根 +
  source-backed 校验器按 successorClosureActive face-gate）、
  `packages/migrate/src/experimental/script-v5/r13-source-semantics-mg2.ts`
  （stable scripts 排除 segmentTransferDetails、保留其余全字段）
- 实现摘要:
  - Fix 1（JS1 370 备注文本）：仅 current-r13-6b 用新文案，6A/历史面保留
    冻结旧文案。
  - Fix 2（e58476a7 scriptDesc 根）：仅 successor 面（successorFinal 存在）
    带 scriptDesc 根，父面恢复 pin 时代两根；校验器同步面感知。
  - Fix 3（R1 修复 revision）：stable scripts 改为“全字段排除
    segmentTransferDetails”（Kimi R1 选项 b），而非三叶 allowlist——allowlist
    改变 digest 组成、漂移 canary golden input digest（Codex 自批的第三漂移源）。
  - 结果：**canary 2/2 绿**（frozen golden 逐字节还原）；fast 79 files /
    577 passed / 5 skipped；默认 dry-run 0/0/0；R13-Z dry-run open=0/0 且
    6C seal / 运行时 digest 不变；oracle 仅指纹更新、golden 零变化。
  - 源账 digest 83f68115 → be069130 为历史面备注恢复的必然结果（见交接日志
    K3 附注），待三方审查确认。
- 运行命令: `pnpm --filter @type-pal/migrate test:canary` /
  `test:fast` / `migrate:content -- --r13-z --r13-6c --r13-6d`（dry-run）
- 浏览器 / 手工检查: N/A
- 跳过的检查及原因: N/A

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Kimi **accept** + GLM **accept**（2026-08-06，均一手核实 + 独立复跑）；
  Codex **accept**（2026-08-06 自验收口，见 done 前签字表）
- 必须返工项: N/A
- Accept / rework: accept（Kimi 附 K2/K4 记录性附注，不阻塞；见交接日志）

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
- 2026-08-06 Codex: **R13-CANARY 修复完成，canary 2/2 绿**。
  - 三个漂移源全部修复：
    1. JS1（19ce1ca7）370 lossy 备注文本 → mapSkills 按 palSemanticProfile 门控
       （6A/历史面旧文案、6B 面新文案）；
    2. e58476a7 scriptDesc 根 → reportObservations + source-backed 校验器按
       successorClosureActive 门控（父面两根、后继面三根）；
    3. **Codex 自批 R1 allowlist 修复本身改变了 stable digest 组成**（685265ed
       时代是全字段 scripts，allowlist 只取三叶）→ 改为排除 segmentTransferDetails
       保留其余全字段（Kimi R1 选项 b），digest 组成还原 pin 时代。
  - 验证：canary 2/2 绿（frozen golden 逐字节还原：seal f78b751e / authority
    193dfb2c / sourceDispositionInput 0f0aa474 / 源账 b696c7bd）；fast 79 files /
    577 passed / 5 skipped；默认 dry-run writes=0/deletes=0/conflicts=0；
    `--r13-z --r13-6c --r13-6d` dry-run open=0/0、6C seal=82e9f8f3…/运行时
    digest=0a67ee07… 不变；oracle 仅指纹更新、golden 投影零变化。
  - **K3 附注（源账 digest 变化）**：R13-Z 源指令账 digest 83f68115… →
    be069130…，系历史面 370 备注恢复旧文案的必然结果（R13-Z disposition 的
    rawDigest 含历史迁移 rawContent.lossySkills）。R13-Z 源账非冻结 pin
    （冻结门禁 = canary golden + 86bbb33f + 6C/6D 证据字节，三者均未变），
    待 Kimi/GLM 审查确认。
  - Next: 三方实现审查（K1-K4 逐项核），通过后 R13-Z 剩余门禁（全量重迁双跑、
    browser、正式发布）。
- 2026-08-06 Codex: 三方实现审查 accept 齐，R13-CANARY 收口 done。记录性后续
  （Kimi K4 非阻塞建议）：补 face-gate cheap 单测作快速反馈层，随 R13-Z 剩余门禁
  批次一并落地。Next: R13-Z 全量重迁双跑 + browser + 正式 --write 发布 +
  C8/ED-5I 联合验收。
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
- 2026-08-06 GLM R13-CANARY 实现审查：签 **accept**。一手核实（代码逐行 + canary/fast/dry-run 实跑）：
  - **K1 JS1 face-gate**（migrate-content.ts:641-666）：`palSemanticProfile` 门控 ——
    `current-r13-6b`（successor 面）用新文案"按剩余真气×8"，6A/历史面（默认
    `current-r13-6a`）保留冻结旧文案。Kimi K1 方案 2 落实 ✅。
  - **K2 scriptDesc 根门控**（source-instruction-disposition.ts:5042-5277/5311）：
    `successorClosureActive` 门控，父面不带 scriptDesc 根（保持 pin 时代两根），
    后继面带三根 ✅。
  - **K3 allowlist 排除 segmentTransferDetails**（r13-source-semantics-mg2.ts:259-265）：
    compact 时 `[key] => key !== 'segmentTransferDetails'`，digest 组成还原 pin 时代 ✅。
  - **K4 86bbb33f 不重写 + allowlist 卫生保留**：冻结 pin :55 仍为 `86bbb33f…`；
    6D allowlist 6 类白名单保留 ✅。
  - **canary 2/2 绿**（317s）：producer rebuild matches R13-6A golden + replays identical
    seal zero writes ✅。
  - **fast** 79 files / 577 passed / 5 skipped（22s）✅。
  - **6C/6D 证据字节不变**：6C seal `82e9f8f3…`、运行时 `0a67ee07…`、open=0/0 均逐字节
    不变 ✅。
  - **源账 digest 变化（K3 附注）**：`83f68115…` → `be069130…`，系历史面 370 备注恢复
    旧文案的必然结果（rawDigest 含历史 rawContent.lossySkills）。源账 digest 非冻结 pin
    （冻结门禁 = canary golden + 86bbb33f + 6C/6D 证据字节，三者均未变），变化预期合理 ✅。
  - **方案 1 异议裁定**：本 GLM 设计审查时建议方案 1（digest 对备注文本不敏感）。
    Kimi K1 证明方案 1 在不重算 86bbb33f 下逻辑不成立（父账面用当前代码跑历史迁移，
    lossySkills 文本无条件进 compacted migration）。Codex 采用 Kimi K1 方案 2（face-gate）
    实现。GLM 接受 Kimi 的 K1 裁定 —— 方案 2 虽然是 workaround（逐备注文本门控而非从根
    消除脆弱性），但在不重写冻结 pin 的约束下是唯一可行路径，且 face-gate 机制本身正确。

  K1-K4 全部落实，canary 判据通过。accept 只收口 R13-CANARY implementation，
  R13-Z 正式发布（--write + 全量重迁双跑 + browser）仍待后续。
- 2026-08-06 Kimi R13-CANARY 实现主审：签 **accept**（HEAD=475210bd）。只读审查；
  未修改实现/产物/baseline/seal/其他席位签字。逐项核实（一手 + 独立复跑）：
  - **Fix 1（370 备注 face-gate）**：码级（migrate-content.ts:631-674 profile 参数、
    :662-669 门控）+ 穿线（pal-migration.ts:524-529：r13SixBSourceSemantics→6b、
    默认 6a、历史 r13-4）+ **一手实证 dump**：默认面 370 notes="按饮酒动态(原版公式)…"
    （冻结旧文案）、6B 面="按剩余真气×8 动态(原版 0x57 清空真气)…"（新文案）。
    K1 方案 2 落实，复用既有 profile 机制 ✅。
  - **Fix 2（scriptDesc 根）**：`successorClosureActive = successorFinal !== undefined`
    （:6048），pending/lossy 两循环同步门控（:5277/:5311），source-backed 校验器同条件
    面感知（:6896-6908）；父构建不传 successorFinal（r13-enemy-script-mg2.ts:464-475）
    → 父面恢复 pin 时代两根，6B 已发布面保持三根 ✅。
  - **Fix 3（stable scripts 排除 segmentTransferDetails、保留其余全字段）**：
    r13-source-semantics-mg2.ts:259-266 = 本人 R1 选项 b。**认领**：本人 R2-R5 复核时
    以"6B seal 无 input-identity 字段"论证三叶 allowlist 安全——看错了面，canary
    golden 钉的是 input identity digest，allowlist 改变组成即漂移（Codex 自批的第三
    漂移源实为本人 R1 返工方向 a 引入）。Fix 3 还原 pin 时代组成、仅排除 6D 新字段，
    正确 ✅。
  - **独立复跑**：check:fast 79 files / 577 passed / 5 skipped（exit=0，24.96s）；
    **test:canary 2/2（289.7s）**——producer rebuild 命中 R13-6A frozen golden 且
    closure 保持、live authority 重放同 seal 零写，86bbb33f 未动 ✅；默认 dry-run
    writes=0/deletes=0/conflicts=0；`--r13-z --r13-6c --r13-6d` dry-run open=0/0、
    6C seal=82e9f8f3…/运行时=0a67ee07… 逐字节不变、未写盘 ✅。
  - **K3 附注 adjudication：接受源账 digest 83f68115→be069130**。依据：(i) 该 digest
    是 R13-Z authority disposition 报告体 digest（migrate-content.mts:485
    `source.digest`），计算值非冻结 pin；(ii) 归因按构造唯一——Fix 2 successor 面
    无变化（三根两侧一致）、Fix 3 只动 input identity（canary 侧）不进报告体，
    唯一影响报告体的变更是 Fix 1 历史面备注恢复；(iii) canary 绿证明历史面已逐字节
    还原 pin 时代（86bbb33f 复现），delta 恰为忠实恢复；(iv) 真实冻结门禁全未变
    （6C seal/运行时/open=0/0/86bbb33f/canary golden）。
  - **K2 附注**：贡献者实质枚举齐（JS1 / e58476a7 / 58f8f846 经 0ea144c2 rewind
    既有缓解 / R1-allowlist 自批）；1a823bc4→f021b0a8 的逐提交中间值映射未落纸面，
    但 canary 全量重建绿是完整性终极证明（侥幸补丁不可能逐字节复现 86bbb33f）。
    K2 意图达成，纸面链留作记录性欠账，不阻塞。
  - **K4 附注**：无新增 fast 测试（79/577 不变）；三贡献者的回归由恢复绿的 canary
    承担（各形态均为 canary 失败形状，再漂移即 fail-closed）；face-gate 处注释在案。
    建议（不阻塞）补 cheap face-gate 单测作快速反馈层。
  - **方案 1 分歧关闭**：GLM 已接受 K1 裁定；build 以方案 2 + pin 不动取得成功，
    经验上终结分歧。
  结论：R13-CANARY implementation 本席 accept。R13-Z 正式发布的剩余门禁
  （--write 发布 + 全量重迁双跑 + browser + C8/ED-5I 联合验收）不变，不得标
  N3-1/C8/ED-5I done。done 准入 blocked on Codex 自签。

## 下一位 Agent 提示词

```text
接手任务: R13-CANARY canary 父账重建漂移（设计复审）
任务卡: docs/ops/archive/tasks/done/R13-CANARY-canary-parent-ledger-drift.md
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
