# TEST-RUNTIME-SHELL-COVERAGE-2 — 真实宿主战斗、物品与脚本二批

Status: done
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops 任务卡接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始状态、日期、证据、counter、链接和未决项在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标
- 保留原任务的目标、完成边界、历史结论和用户可见适用范围。

## 范围
- 当前包含：原卡声明的实现/测试/证据范围及其历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据或历史结论。

## 前提与证据
- primary source：固定 source revision `cddbd73c682e3264e5d981ba84affab894986be4` 与原卡全文。
- 合法输入、caller、证据和 counter：按原文 quote 解释；本次不重跑原执行。
- 事实权：当前 task card、代码、consumer 和新 receipt；历史卡不单独证明当前行为。

## 验收
- 原卡历史验收、失败、blocked、rework 和未执行边界保持原样。
- 本次迁移验收：source/after SHA、quote inverse、模板章节、链接和历史 overlay 通过。
- runtime/E2E/视觉/coverage：本次均未执行，信用为 0。

## 状态与交接
- `status`: done（历史快照）；当前工作不得从 quote 中自动获得 build 授权。
- Owner/provenance：原卡保留于 quote；当前文档治理 owner 为 Codex。
- 下一步：若需重新启用，创建当前 task card，重新核 primary source、合法输入、business oracle 和独立验收。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `cddbd73c682e3264e5d981ba84affab894986be4`；本轮为 2026-10-17 R43。
- 归档原因：已关闭任务记录只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论
- `Status: done`；原始任务语义完整保留于下方 quote。

## 当时证据
- 原始命令、产物、SHA、签字、counter、链接和状态保留于 quote。

## 当前有效性
historical。do not promote historical task card to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：需由当前 task card、consumer 和新证据重新复核。

## 继任文档
- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全
固定源 revision `cddbd73c682e3264e5d981ba84affab894986be4`，source SHA `c84cb0a22d0d3f909e95375a9578832039b253ac4adc896aeda2f502daf548e6`；下方 quote 可逆回原始 UTF-8 字节。
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
