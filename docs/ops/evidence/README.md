# 任务专属证据

Status: current
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: governance-index-v1 / 1.0.0

本页是 ops evidence 的当前导航入口；其中列出的交付与历史材料按各自 source revision、任务卡和独立回执解释。索引本身不把旧证据升格为当前 runtime、E2E、视觉或 coverage 通过。

## 目的
- 为任务证据、机器产物和历史交付提供唯一导航入口。

## 范围
- 当前包含：当前证据入口、历史交付入口和 DOCS-FULL-TEMPLATE-1 治理证据。
- 明确不包含：未由当前 consumer 与独立复核确认的 runtime、E2E、视觉、coverage 结论。

## 当前状态
- `status`: current（索引）；被索引的历史回执仍按原日期和适用范围解释。
- `lastReviewed`: 2026-10-17

## 入口与责任
- canonical 入口：本页及各任务卡/证据目录的当前链接。
- Owner：Codex（文档治理）。
- 下游使用者：任务卡、证据 consumer、审计与文档治理账本。

## 证据与下一步
- 关键来源：原始 ops evidence README、对应任务卡、机器 artifact 和本批独立 review。
- 未决/阻塞：历史证据不能单独证明当前产品行为；重新运行时需生成新的 receipt。
- 下一步：按 source/after SHA 和 consumer 复核继续清理 governed-legacy。

## 2026-10-17 当前专项入口

- [94前全部治理成果复审](QUALITY-PRE94-RETROSPECTIVE-1/README.md)：全部83张编号卡仍14 partial / 69 pending / 0整卡accept；历史证据不自动升格。
- [fetch取消生命周期 C1](QUALITY-FETCH-ABORT-LIFECYCLE-1/c1/README.md)：合并最新main后26例定向与game typecheck通过；全仓运行时诊断和统一质量门仍未清零。

## 当前证据目录（逐目录入口）

- [CODE-QUALITY-100](CODE-QUALITY-100/README.md)
- [CODE-QUALITY-101](CODE-QUALITY-101/README.md)
- [CODE-QUALITY-102](CODE-QUALITY-102/README.md)
- [CODE-QUALITY-3Y-CLOSEOUT-1](CODE-QUALITY-3Y-CLOSEOUT-1/README.md)
- [CODE-QUALITY-53](CODE-QUALITY-53/README.md)
- [CODE-QUALITY-80](CODE-QUALITY-80/README.md)
- [CODE-QUALITY-81](CODE-QUALITY-81/README.md)
- [CODE-QUALITY-82](CODE-QUALITY-82/README.md)
- [CODE-QUALITY-83](CODE-QUALITY-83/README.md)
- [CODE-QUALITY-84](CODE-QUALITY-84/README.md)
- [CODE-QUALITY-85](CODE-QUALITY-85/README.md)
- [CODE-QUALITY-86](CODE-QUALITY-86/README.md)
- [CODE-QUALITY-87](CODE-QUALITY-87/README.md)
- [CODE-QUALITY-88](CODE-QUALITY-88/README.md)
- [CODE-QUALITY-89](CODE-QUALITY-89/README.md)
- [CODE-QUALITY-90](CODE-QUALITY-90/README.md)
- [CODE-QUALITY-91](CODE-QUALITY-91/README.md)
- [CODE-QUALITY-92](CODE-QUALITY-92/README.md)
- [CODE-QUALITY-93](CODE-QUALITY-93/README.md)
- [CODE-QUALITY-94](CODE-QUALITY-94/README.md)
- [CODE-QUALITY-96](CODE-QUALITY-96/README.md)
- [CODE-QUALITY-97](CODE-QUALITY-97/README.md)
- [CODE-QUALITY-98](CODE-QUALITY-98/README.md)
- [CODE-QUALITY-99](CODE-QUALITY-99/README.md)
- [QUALITY-EDITOR-DIAGNOSTICS-1](QUALITY-EDITOR-DIAGNOSTICS-1/README.md)
- [QUALITY-EDITOR-DIAGNOSTICS-2](QUALITY-EDITOR-DIAGNOSTICS-2/README.md)
- [QUALITY-EDITOR-DIAGNOSTICS-3](QUALITY-EDITOR-DIAGNOSTICS-3/README.md)
- [QUALITY-EDITOR-DIAGNOSTICS-4](QUALITY-EDITOR-DIAGNOSTICS-4/README.md)
- [QUALITY-EDITOR-FORM-FIXTURES-1](QUALITY-EDITOR-FORM-FIXTURES-1/README.md)
- [QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1](QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1/README.md)
- [QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1](QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1/README.md)
- [QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1](QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1/README.md)
- [QUALITY-EXTRACT-RAW-TEST-EXECUTION-1](QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/README.md)
- [QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1](QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1/README.md)

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `a1ac53bbea78b58ee88e5a3a53894a2fcaf595eb`；本轮为 2026-10-17 R39。
- 归档原因：保留 ops 证据导航的历史入口，同时显式区分当前索引与历史证据。

## 原始结论
- 原文语义、入口、任务状态、数字和历史边界保留于下方 quote；本页不重写这些结论为当前事实。

## 当时证据
- 当时的来源、命令、SHA、机器产物和链接保留于原文 quote。

## 当前有效性
current（仅指导航索引）。历史交付不得外推为当前 runtime/E2E/视觉/coverage acceptance。
- 历史冲突/未决：每个证据目录的当前 consumer 与新 receipt 仍是事实权。

## 继任文档
- 当前 canonical 文档：对应任务卡、当前 consumer 和新生成的证据 receipt。
- supersedes / superseded-by：本页替代 governed-legacy 的未分层导航呈现；原始证据内容不被删除。
- 若重新启用的复核条件：重新执行合法输入、确认业务 oracle、记录 artifact/after SHA，并完成独立复核。

## 原文保全
固定源 revision `a1ac53bbea78b58ee88e5a3a53894a2fcaf595eb`，source SHA `a48cc1db49991fc489f07063c2bf635a9996771647f07e025aa735d5a58ff851`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # 任务专属证据
>
> 任务证据与可重跑验证工具按卡分目录存放；关闭后保留唯一工具入口或按验收结论归档。
> 目录存在不代表任务活动；状态以任务总索引为准，历史时点报告见 [archive](../archive/README.md)。
>
> 上级：[协作与工程维护](../README.md)。
>
> ## 当前证据
>
> - [第一阶段 MIDI / DOS FM 音源选择](game-rix-music-1/README.md)（真实FM输出、音源生命周期、独立PCM参考、反控和停服离线缓存；用户accept；CI、阿里云上线、线上切换及issue #4关闭完成）。
> - [酒剑仙传功后场景恢复](game-rng-scene-restore-1/README.md)（issue #3；真实复现、4项回归及反控，CI/阿里云发布/线上复验已完成）。
> - [战斗回合/结算边界返工](../tasks/TEST-GLM-GAME-TURN-BOUNDARIES-1.md#当前裁决2026-10-12)（2026-10-12撤回先前accept；原生反控报告、合法输入与阶段可达性待补）。
> - [2026-10-11 residual 测试派发](TEST-DISPATCH-20261011.md)（ControlForm、ItemEffect、MenuBox 三包已由 Codex 独立验收并收口）。
> - [ControlForm 残余合同](../tasks/evidence/TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1/)（1 合同、2 针反控，已收口）。
> - [ItemEffect 残余合同](TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1/README.md)（3 合同、3 针反控，已收口；puppet product-counter 保留）。
> - [MenuBox 残余合同](TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1/README.md)（5 合同、5 针反控，已收口）。
>
> ## 历史交付入口
>
> 以下保留各批提交时的回执说明；当前验收状态以[任务总索引](../tasks/index.md)和对应卡最后一次 Codex 裁决为准，不能把旧回执中的“待验收”当作当前任务状态。
>
> - [Game 大世界叠层测试性能修复](CI-GAME-OVERLAY-PERFORMANCE-1/README.md)（Codex有限维护；7反控、全包及受保护fast通过，覆盖/基准不变，新托管CI按推送HEAD另核）。
> - [2026年10月8日有限合同派发](TEST-CONTRACT-BATCH-20261008/README.md)（三个 GLM 候选已由 Codex 在当前 main 独立复验；最终裁决见 [独立验收](TEST-CONTRACT-BATCH-20261008/codex-review.md)）。
> - [炼蛊边界贡献候选](TEST-EDITOR-ALCHEMY-BOUNDARIES-1/README.md)、[脚本交互贡献候选](TEST-EDITOR-SCRIPT-INTERACTION-1/README.md)、[工程加载贡献候选](TEST-REFORGE-PROJECT-LOADING-BOUNDARIES-1/README.md)（原件保持历史候选身份；以共同目录的 Codex 当前版本复验为准）。
> - [战斗宿主终局测试确定性与原子性](TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1/README.md)（独立accept；本地三道集成门通过，卡已归档；反控工具与原件保留）。
> - [当前存档精简证据](TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1/README.md)与[三审](TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1/codex-review-r3.md)（r3独立accept；本地三道集成门通过，卡已归档；17针独立重放有效，不继续派发）。
> - [当前作者命令表单引用与草稿合同](TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1/README.md)（独立accept；本地三道集成门通过，卡已归档；反控工具与原件保留）。
> - [TEST-GAME-MEDIA-LIFECYCLE-1 交付证据](TEST-GAME-MEDIA-LIFECYCLE-1/README.md)（已集成 main；r3 媒体生命周期 7 合同、严格四态反控与污染判据探针；M3 产品缺陷另行登记）。
> - [TEST-REFORGE-OPENING-IO-LIFECYCLE-1 交付证据](TEST-REFORGE-OPENING-IO-LIFECYCLE-1/README.md)（已集成 main；r3 标题读档 IO 3 合同、3 针反控与 8 条产品诊断；D-Q01-1 不夹修）。
> - [TEST-REFORGE-BATTLE-PREVIEW-BINDING-1 交付证据](TEST-REFORGE-BATTLE-PREVIEW-BINDING-1/README.md)（已集成 main；r3 D-1 试打接线真实反例、污染判据与清理证明；产品修复另卡裁决）。
> - [TEST-GLM-GAME-SHELL-BOOTSTRAP-1 交付证据](TEST-GLM-GAME-SHELL-BOOTSTRAP-1/README.md)（r1 候选：shell bootstrap 排重账 + syncShellAudio 战斗臂/SW 消息路由/persist 容忍/startRafLoop 帧链 6 新合同 + 6/6 三态反控 + U-1 swc.ready 拒绝悬空登记，待 Codex 验收）。
> - [TEST-GLM-GAME-EVENT-STATE-OPCODES-1 交付证据](TEST-GLM-GAME-EVENT-STATE-OPCODES-1/README.md)（r1 候选：状态 opcode 臂级排重账（两轮 coverage 并集）+ 走位到达/清 pose/零距离/同场景 guard/onEnter goto/菱形回弹/稀疏写回 8 新合同 + 8/8 三态反控（复用已验收 r2 判据库），待 Codex 验收）。
> - [TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 交付证据](coverage85-kimi-extract-migrate-r1/README.md)（已集成 main，Codex quality closure 见历史任务卡）：原始机账、反控件与生成器见 [coverage85-kimi-extract-migrate-r1/](coverage85-kimi-extract-migrate-r1)。
> - [TEST-COVERAGE85-GLM-REFORGE-1 交付证据](TEST-COVERAGE85-GLM-REFORGE-1/README.md)（r5 三态反控、逐 fullName ledger 与 80.44% honest branch 账；覆盖率续跑未结束）。
> - [TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 交付证据](TEST-GLM-GAME-EVENT-CONTROL-FLOW-1/README.md)（r1 候选：事件控制流排重账 + fail-closed/0x7F 豁免 2 新合同 + 2/2 三态反控 + 全库 auto 0x7F 零可达数据面证据，待 Codex 验收）。
> - [TEST-GLM-EDITOR-BATTLE-REGISTRY-1 交付证据](TEST-GLM-EDITOR-BATTLE-REGISTRY-1/README.md)（已集成 main；4 个注册/缺失回落/删帧守卫/深链同步合同与 4/4 三态反控）。
> - [TEST-GLM-GAME-DIALOGUE-PAGINATION-1 交付证据](TEST-GLM-GAME-DIALOGUE-PAGINATION-1/README.md)（r1 候选：6 分页/等待键集合同 + 6/6 三态反控，待 Codex 验收）。
> - [TEST-GLM-GAME-BATTLE-STATE-1 交付证据](TEST-GLM-GAME-BATTLE-STATE-1/README.md)（r1 候选：battle 状态机残余 10 合同 + 10/10 三态反控，待 Codex 验收）。
> - [TEST-GLM-GAME-EVENT-CONTRACTS-1 交付证据](TEST-GLM-GAME-EVENT-CONTRACTS-1/README.md)（已集成 main，Codex quality closure 见历史任务卡）。
> - [TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 交付证据](TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1/README.md)（r1 候选：6 装备效果层/applyAll/抗性边界合同 + 7/7 三态反控，待 Codex 验收）。
> - [TEST-GLM-GAME-MENU-SAVE-IO-1 交付证据](TEST-GLM-GAME-MENU-SAVE-IO-1/README.md)（r1 候选：菜单输入锁/同帧取消/存档真链/坏导入/快存反馈 8 合同 + 8/8 三态反控 + U/B 账，待 Codex 验收）。
> - [TEST-GLM-GAME-TURN-BOUNDARIES-1 交付证据](TEST-GLM-GAME-TURN-BOUNDARIES-1/README.md)（r1 候选：15 回合/结算合同 + 15/15 三态反控，待 Codex 验收）。
> - [TEST-GLM-REFORGE-ASSET-RESOLVER-1 交付证据](TEST-GLM-REFORGE-ASSET-RESOLVER-1/README.md)（r1 候选：8 资源解析/缓存生命周期合同 + 7/7 三态反控，待 Codex 验收）。
> - [TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 交付证据](TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1/README.md)（r1 候选：bgm/midi/readiness 6 生命周期残差合同 + 6/6 四态反控，待 Codex 验收）。
> - [TEST-GLM-REFORGE-BATTLE-FLOW-1 交付证据](TEST-GLM-REFORGE-BATTLE-FLOW-1/README.md)（r1 候选：终局家族/宿主终局/会话残差 12 合同 + 12/12 四态反控 + U-1 零活敌 target 死区发现，待 Codex 验收）。
> - [TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1 交付证据](TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1/README.md)（r1 饱和档案：五族排重账 + 三口径分支覆盖 + 候选解剖，零新增测试、零产品改动，待 Codex 独立验收）。
> - [TEST-GLM-REFORGE-HOST-LIFECYCLE-1 交付证据](TEST-GLM-REFORGE-HOST-LIFECYCLE-1/README.md)（已集成 main，Codex quality closure 见历史任务卡）。
> - [TEST-GLM-REFORGE-RUNTIME-SESSION-1 交付证据](TEST-GLM-REFORGE-RUNTIME-SESSION-1/README.md)（15 合同、反控 5/5、排重/非合同/受阻账与基线缺陷披露；待 Codex 独立验收）。
> - [TEST-GLM-REFORGE-WORLD-LIFECYCLE-1 交付证据](TEST-GLM-REFORGE-WORLD-LIFECYCLE-1/README.md)（r1 候选：四家族排重后 4 残差合同 + 4/4 四态反控 + unreachable 登记，待 Codex 独立验收）。
> - [TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1 交付证据](TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1/README.md)（r2 候选：7 文件排重账 + player-roles 2 新合同 + runner v2 严格反控（JSON reporter 判据/fullName 精确相等/执行集 identity/13 自测反例）+ 全包 417/417，待 Codex 二审）。
> - [TEST-GLM-MIGRATE-ASSET-SUPPLY-1 交付证据](TEST-GLM-MIGRATE-ASSET-SUPPLY-1/README.md)（r1 候选：15 资产供应/所有权合同 + 13 针 identity 反控 + 合成 YJ2 特效链，待 Codex 二审）。
> - [TEST-GLM-REFORGE-MOTION-TRANSITION-1 交付证据](TEST-GLM-REFORGE-MOTION-TRANSITION-1/README.md)（r2 候选：world-motion-runtime 3 残余合同 + identity artifact 严格反控 + 9 自测反例，待 Codex 二审）。
> - [TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 交付证据](TEST-GLM-MIGRATE-PLAN-TRANSACTION-1/README.md)（r1 候选：migration plan/transaction/write-plan 2 净新合同 + 2/2 identity 反控，待 Codex 验收）。
> - [TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1 交付证据](TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1/README.md)（r1 候选：battle core/session 排重后 6 残余合同（敌方施法三门/复活无保底/敌逃战果会计/AI 敌逃回执）+ identity TSV 全量反控 6/6 + 11 自测反例，待 Codex 独立验收）。
> - [TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 交付证据](TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1/README.md)（r1 候选：main 宿主编排排重后 5 残余合同（入场揭幕/触发脚本错误恢复/试打终局与错误回执/存档失败计数与队列）+ identity TSV 全量反控 5/5 + 11 自测反例 + D-1 `?battle-scene=` 投影死路缺陷披露，待 Codex 独立验收）。
>
> ## DOCS-FULL-TEMPLATE-1
>
> - [全 docs 盘点与模板治理证据](DOCS-FULL-TEMPLATE-1/README.md)
<!-- original-source-quote:end -->
