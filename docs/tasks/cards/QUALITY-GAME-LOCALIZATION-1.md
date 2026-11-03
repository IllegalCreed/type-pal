# QUALITY-GAME-LOCALIZATION-1 — 第一阶段语言资源与展示合同治理

Status: done
Last reviewed: 2026-11-03
Template: task-card-v1 / 1.0.0
Owner: Codex（当前状态维护与后续协调；原执行身份见原件）
Coding Owner: Codex（单 Agent）
Reviewer: Codex（证据及差异复核；不计第三方签字）
Phase: phase1
Capability: code-quality
Visual Verification Timing: N/A（本批仅质量整改；产品显示变化另停线）
Branch: codex/code-quality-94-102

## 目标

接续 pending 队列，完成语言资源、偏好与文本展示边界的逐文件八维、命名组织和测试质量审核。复用英文功能已有一手材料与反控，不把功能 done 或包级通过当作文件关闭。

## 范围

- 固定十二主体：shared/src/localization.ts；game/src/assets/language-pack.ts 及其测试；game/src/localization 下 language.ts、language.test.ts、layout.ts、static-shell.ts、messages.ts、messages.test.ts、presentation.test.ts、shell-surfaces.test.ts；game/src/present/menu/draw-description.ts。均以 packages/ 为前缀。
- 切片：资源合同/下载（3）；偏好/启动壳（3，shell-surfaces 合同随消费者整理）；布局与菜单展示（3）；消息组/换行及真实调用（3）。拆合后的输出逐个复核，原身份有去向。
- 只读相邻：英文提取/SLF、UI字典/地图名/字体、bootstrap、实际菜单/事件/战斗消费者及既有证据。相邻未全文验收者不领取关闭信用。
- 不改译文、资源格式、生成物、存档、玩法或已批准的显示取舍；不进入 GLM 回合测试、E2E、editor 实体任务。若发现行为缺陷先保留反例、另卡裁决。

## 前提与证据

本批准入是行为不变的代码/测试治理。语言展示合同取已完成的 [GAME-ENGLISH-1](GAME-ENGLISH-1.md)，不以 SDLPal 代替原版证据；相同修正脚本与存档、按连续消息范围匹配语言包、译文行数不能改原脚本 IP。调用或 primary source 冲突须停止相应关闭。

## 上下文锚点

- [长期八维与命名合同](../../engineering/guides/code-quality.md)、[开发验收](../../engineering/guides/agent-workflow.md)、[测试治理](../../testing/governance.md)、[文档模型](../../engineering/guides/documentation-model.md)。
- [CLAUDE](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/CLAUDE.md)、[第一阶段工程记录](../../phase1/engineering-notes.md)、[机制记录](../../phase1/game-mechanics.md)。
- [英文功能卡](GAME-ENGLISH-1.md)及其 text/dialog/shell/integration review；实际运行入口为 shell/bootstrap.ts，消息消费为 core/event-system.ts 与 core/menu/script-desc.ts。

## 验收

- 逐输出完整读域、真实 caller/公共出口/类型/生命周期；A–H 各项具体结论与命名拆合依据写同一证据包。不因短文件或旧功能测试通过自动关闭。
- 测试按合同映射、合法输入、独立 oracle、重复/反例、隔离与有效反控核验；迁移保留实际用例身份，不以重新命名增加数量。
- 资源/偏好、展示及消息组切片先定向验证；整模块稳定后统一相邻包、typecheck、全仓 check、官方 coverage ratchet、protected fast、lint-zero、ledger。过程不反复采集覆盖率。
- 基点、候选文件/上下文指纹、旧证据复用与失效条件、原始日志、失败及修复结果留可只读复验材料；尚未执行不写通过。
- 纯重构与行为修复分提交。当前未授权任何新的行为变化。最终全部门零诊断才提交推送、经保护 PR 合 main。

## 当前模式推进记录

- 2026-11-01 Owner 核对：GAME-ENGLISH-1 顶部 done、看板无英语活跃 Owner；三个旧英文隔离树 clean，dialog/text 非祖先的历史交付已在功能卡记录集成，不清理它们。GLM 回合卡与本批文件无重叠。
- 基点 `4f318eb9864eed65021c75bee6ae43286ffea07f`：本治理树 clean，origin/main 与治理分支 0 behind / 0 ahead；主树不动。main Documentation 41227189659、Coverage 41227189612 均 success，两个 job 原始日志无实际诊断、annotations 为空。
- build 准入：Codex build allowed（上述十二主体及有明确合同迁移的测试输出）。单一 Owner；不得为凑百文件扩张。
- 初始机器账：3459 tracked / 827 closed / 0 review / 2632 pending；本卡该初始时点关闭 0。
- 逐文件八维及整改已记录于[本批证据](../evidence/QUALITY-GAME-LOCALIZATION-1/README.md)。两个既有 closed 主测 word-lookup/map-names 接收同职责合同，已全文补核；七产品可执行 AST 不变。本地完整门已通过；Git发布由同一治理分支PR执行并记录。

## 状态与交接

2026-11-03复核：[PR36](https://github.com/IllegalCreed/type-pal/pull/36)已合并为c88be9b3b5b9dc38c77d8c440085e35b8d15fc43；同一merge的[Documentation](https://github.com/IllegalCreed/type-pal/actions/runs/41270110481)、[Coverage ratchet](https://github.com/IllegalCreed/type-pal/actions/runs/41270110417)均为main push、completed/success，merge已在当前主线祖先链。原12主体→21输出、19新关闭+2既有消费者及七产品可执行AST不变的范围保持，不新增21文件复审、行为/译文、普通剧情/E2E/视觉或ledger信用。原本地待发布只是提交前检查点；首次采集中断、比例拒绝与快照计数错误继续按[原门证据](../evidence/QUALITY-GAME-LOCALIZATION-1/gates.json)保留。原main原始日志仍在`/Users/zhangxu/.codex/quality-evidence/type-pal/localization-20261101/`；无新的产品委派。

## 下一位 Agent 提示词

本卡已done，无新委派。旧切片和集中门指令保留其原窗口含义；后续同职责工作须另核当前Owner与任务准入，不据本历史提示重开任务或重复全剧情验收。

## 集中收口

- 12原pending主体八维完成；21当前输出逐项接受，其中19新关闭、2既有消费者补核。删除2混装路径不记新关闭；machine账3466/846closed/0review/2620pending。
- game定向/相邻135、extract相邻33；shared/gameTC0；全check七包20554用例与工具门通过，lint0/0/0。官方fast20205，精确夹具结构重算后同报告ratchet/protected通过。
- 失败事实：首次官方采集合盖睡眠中断、恢复全绿后比例下降拒绝；首个check在快照计数95≠94处停止，补齐精确census后完整重跑通过。无timeout/选择/ignore/判据放宽；[原件和门](../evidence/QUALITY-GAME-LOCALIZATION-1/gates.json)保留。
- 原检查点main重新fetch仍4f318eb9、主树未动；当时的代码/证据待发布的授权与记录保留当时含义；实际PR36合并和同merge main两run成功已在本卡状态段核定，不再作为当前待办。
