# TEST-RUNTIME-SHELL-COVERAGE-2 — 真实宿主战斗、物品与脚本二批

Status: done
Owner: Codex
Reviewer: N/A（本批用户批准独立推进）
Phase: phase2
Capability: testing
Visual Verification Timing: N/A
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是真实 bootGame 宿主工作流二批纯测试历史记录（2026-09-24，基点 aa508566，用户额度紧张授权 Codex 独立推进）：四组=非空装备交换与取消、物品纯效果/私有脚本/失败与菜单归还、真实战斗准备→会话→结算/写回、场景脚本实体状态/位移提交与切场景取消。

## 目标

一次性补真实宿主闭环：键盘/正式脚本→宿主链路合同，不重复上一批 36 项宿主与 46 项 BattleSession 用例，不发明新移动或战斗规则。

## 范围

- 范围内：测试/薄 fixture/鉴别力工具与文档；真实调用入口 main.ts:2202 战斗启动/:2477 结算/:2526 写回/:3244 移动宿主/:5368 物品派发/:6483 装备输入/:6504 使用输入；仅外部 Canvas/键盘/时钟/文件/IDB 宿主替身，异步以进入/完成信号驱动。
- 范围外：生产、旧断言、配置、排除、超时、阈值；视觉、剧情 E2E、Q1/Q2、DEV-TOAST-1。

## 前提与证据

当前 fast 主壳 1140/3360 行、544/2427 分支；旧 full 为 9 月 12 日须重新校准，不能当本批证据。最强替代解释（缺口已由 full 或底层测试覆盖）要求先比当前 full/fast，新增用例必须证明宿主闭环而非单测重复。
- 当前状态：done（历史终态；用户豁免独立推进）

## 验收

原卡记录：实现 94b59a6f，28 项/8 单点负控、相邻 385、全 reforge 1497/TC、完整 check8412、ratchet 与保护 aa508566 单次 strict7921/633 全 exit0（CI 彩色与编译缓存污染环境下前后 baseline SHA 相同 32a0c23b…）；28 标题/8 针/逐文件增量入机账。本页未复跑。本页治理验收：quote 字节保全与模板合同。

## 状态与交接

用户 2026-09-24 豁免原文「glm额度也比较紧张了，只能你这边先独立推进了」——仅本批测试及质量门，Codex 代覆盖矩阵/代码自审不冒充独立第三方；独立复核不足为保留风险、不外推下一批豁免。无下一位 Agent 提示词。本页治理不重授。

## 历史范围

2026-09-24 准入、实施与收口；固定源 bb7b1d24e9e517e09730282b104ce51b4204cb0b。2026-10-17 R42 泛化封套，2026-10-18 S15 改写。

## 原始结论

`Status: done`：四组真实宿主工作流按用户独立授权收口。原卡全文在下方 quote 保全。

## 当时证据

前批宿主/战斗集成/环境修复三份必读锚点、codex-runtime-shell-wave2 回执与机账。本页治理未新增执行。

## 当前有效性

historical。宿主合同现行状态以当前测试为准；豁免不外推。

## 继任文档

后续补测按新范围另排（原卡交接）；环境稳定见[TEST-ENV-STABILITY-1](TEST-ENV-STABILITY-1-cache-and-host-load.md)。

## 原文保全

固定源 revision `cddbd73c682e3264e5d981ba84affab894986be4`，source SHA `c84cb0a22d0d3f909e95375a9578832039b253ac4adc896aeda2f502daf548e6`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # TEST-RUNTIME-SHELL-COVERAGE-2 — 真实宿主战斗、物品与脚本二批
>
> Status: done
> Owner: Codex
> Reviewer: N/A（本批用户批准独立推进）
> Phase: phase2
> Capability: testing
> Visual Verification Timing: N/A
>
> ## 目标与范围
>
> 基点aa508566。一次性补真实bootGame宿主工作流，不重复上一批36项宿主用例和46项BattleSession用例。
> 只增加测试/薄fixture/鉴别力工具与文档，最终由官方ratchet更新基线；生产、旧断言、配置、排除、超时、阈值不变。
> 四组：非空装备交换与取消；物品纯效果/私有脚本/失败与菜单归还；真实战斗准备→会话→结算/写回；
> 场景脚本实体状态/位移提交与切场景取消。仅验证当前合同，不发明新移动或战斗规则。
>
> ## 前提真值门与上下文
>
> - 纯补测，不改用户行为/模型/资产格式，原版和第一阶段实现对照N/A；不是战斗公式或碰撞规则改造。
> - 当前主壳`packages/reforge/src/main.ts:2202`战斗启动、`:2477`结算、`:2526`写回、`:3244`移动宿主、
>   `:5368`物品派发、`:6483`装备输入、`:6504`使用输入是本批真实调用入口。
> - 当前fast主壳1140/3360行、544/2427分支；旧full是9月12日，先重新校准，不能用旧full当本批证据。
> - 最强替代解释：缺口已由full或底层测试覆盖。先比当前full/fast；新增用例必须证明键盘/正式脚本→宿主闭环，
>   不将单测重复执行当新合同。若合法fixture被正式guard拒绝，先修fixture；产品缺陷另记，不为统计硬改实现。
> - 必读：仓库AGENTS/CLAUDE/phase2 READ-FIRST；[前批宿主](../../../../testing/archive/legacy/runtime/engine-boundaries/codex-runtime-shell.md)、
>   [战斗集成](../../../../testing/archive/legacy/runtime/battle/battle-workflows-integration.md)、[环境修复](../../../../testing/archive/legacy/quality/quality-gates/check-environment-stability.md)。
>
> ## 验证
>
> - 工程经正式loader与当前guard；实际被消费输入深快照。真实runner、菜单、战斗、结算不mock。
> - 仅外部Canvas/键盘/时钟/文件/IDB宿主替身；异步以进入/完成信号驱动，finally放行实际挂起请求。
> - 开发中定向/相邻/TC/Biome；单点负控必须精确候选AssertionError，不以timeout/环境异常作红。
> - 整批末串行check→ratchet→保护aa508566的单次strict-fast；只统计并集，不逐用例跑覆盖率。
> - full只作非浏览器覆盖校准；视觉、剧情E2E、Q1/Q2、DEV-TOAST-1不在本卡。
>
> ## 推进签字
>
> - build：Codex premise verified（上述当前源与旧证据）/design agree。
> - GLM：用户2026-09-24告知额度紧张，不等待本席；Kimi：此前额度耗尽，本轮仍由用户明确要求Codex独立推进。
> - 用户豁免：2026-09-24“glm额度也比较紧张了，只能你这边先独立推进了”；仅本批测试及质量门，
>   Codex代覆盖矩阵/代码自审，不冒充独立第三方。独立复核不足为保留风险，本批不要求补签，不外推产品修复。
> - build结论：allowed。
> - done准入：Codex **accept**（实现94b59a6f；28项/8针、check8412、ratchet与受保护单次strict7921/633全部exit0）；
>   Kimi/GLM本批用户豁免，不代签。源码分母不变、旧测试/产品零改；结论：2026-09-24准入满足，Codex核done。
>
> ## 交接
>
> - 2026-09-24 Codex：main清洁且fetch后同步，启动当前树full校准；独立连续完成整批，不调用其他Agent。
> - 2026-09-24 Codex：实现94b59a6f，28项/8单点负控、相邻385、全reforge1497/TC、完整check8412通过。
>   [回执](../../../../testing/archive/legacy/runtime/engine-boundaries/codex-runtime-shell-wave2.md)与正式ratchet7921/633已通过；另六包基线对象不变，
>   Reforge逐文件分母不变/无回退。此时进入review，等待严格复验。
> - 2026-09-24 Codex：单次strict7921/633 exit0，CI彩色与编译缓存污染环境下通过，前后baseline SHA-256
>   `32a0c23bddf240ca801e3e4be1c3ace275af7cc96b37f7f2fe457add4d16382a`相同。
>   [机账](../../../../testing/archive/legacy/runtime/engine-boundaries/codex-runtime-shell-wave2-evidence.json)记录所有命令结果/28标题/8针/逐文件增量。
>   本批独立核done并同步看板/索引；没有独立第三方审查、没有像素或完整E2E声明，不外推下一批豁免。
>
> ## 下一位Agent提示词
>
> 无下一位Agent提示词；本批已按用户独立推进授权收口，后续补测按新范围另排。
<!-- original-source-quote:end -->
