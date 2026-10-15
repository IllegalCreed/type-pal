# AUDIT-TEST-QUALITY-1 — 全仓测试、fixture 与反控质量审计

Status: done
Closed Evidence: main d8a81d4c21a32efa3c140fb5858c83465b01bc5e; GitHub Documentation 37145486289 + Coverage 37145486286 success (2026-10-04); finite regression admission after audit, not historical quota fulfillment.
Owner: Codex
Reviewer: Codex
Phase: mixed / ops
Capability: test-quality / finite-closeout
Visual Verification Timing: N/A
Last reviewed: 2026-10-15
Governance Owner: Codex（历史卡包 B 文档治理）
Template: task-card-v1 / 1.0.0

## 目标

保留2026-10-03测试/fixture/反控质量审计的授权与有限裁决：只有已证明重复、非法或无判别力才能窄修，静态标记/耗时/覆盖率和配额都不能单独作删除或accept理由。

## 范围

原main与交付候选测试/fixture/反控工具的机器清点、真实身份/输入/oracle审查及已证窄修；产品、规则阈值与真实数据不变，新产品真值仍交用户。

## 前提与证据

原卡的8efe0486基础、198f74d8后未提交窄修与worker inventory超时是审计中间态；顶部d8a81d4c/2026-10-04两项CI及[统一封板卡](TEST-FROZEN-CLOSE-1.md)记录后续闭合。反例为以相同body/unsafe/慢corpus标签直接删，或把普通Vitest Error改称AssertionError。

## 验收

原shared113/pal-extract377/migrate fast630/game Grok400和三包TC是阶段定向，不沿用成最终计数。Q九针与P01-C03有效红信用撤销保持；1664+23失效材料清理仅作历史事实。原2 extractor/4 framebuffer/5 MKF/7 YJ2等卡面清点保留原口径，审计报告另有更细合同统计，不跨集合相加。最终门从冻结树实测，原worker timeout无业务结论。

## 状态与交接

保留原顶部状态、Owner或Coding Owner及原审查身份。2026-10-16根线程已独立接收本次文档迁移并写中央review/SHA；接收范围仅文档，旧产品build不重新准入。原交接提示词与旧“待门禁/待签字”按下述历史时点读取，不作为可执行授权。无下一位产品贡献者提示词；原未决验证按本卡历史范围保留。

## 历史范围

2026-10-03审计/待main阶段至10-04有限封板；原待CI/退休已由后继卡解释，不变成今天执行清理的授权。旧“全仓”是当时测试候选范围，不是1838文档完成。

## 当时证据

原卡全文、[已治理的原审计](../../../../testing/archive/legacy/batches/finite-test-intake-20261003/audit-report.md)与[统一封板卡](TEST-FROZEN-CLOSE-1.md)已核历史范围；本轮没有运行AST census、旧反控或覆盖率。

## 当前有效性

historical。未自动裁决的weak matcher/强转/IO/CLI/慢corpus继续待一手事实；不因done把全部flag判垃圾，也不因已合入把测试质量一概accept。

## 继任文档

历史最终接收取[统一封板卡](TEST-FROZEN-CLOSE-1.md)，现行质量准入取[工作流](../../../agent-workflow.md#测试质量验收用户-2026-10-03-固化)。新审计须钉当前真实候选和证据。

## 原始结论

完整原卡按原始时点保留；原字节可从 Git blob `1acf8220ceab04c5cc99cadc993afd6f456ed29c` 回读。引用中的旧授权、命令、提示词与分支清理不能因本次迁移重新执行。

> # AUDIT-TEST-QUALITY-1 — 全仓测试、fixture 与反控质量审计
>
> Status: done
> Closed Evidence: main d8a81d4c21a32efa3c140fb5858c83465b01bc5e; GitHub Documentation 37145486289 + Coverage 37145486286 success (2026-10-04); finite regression admission after audit, not historical quota fulfillment.
> Owner: Codex
> Reviewer: Codex
> Phase: mixed / ops
> Capability: test-quality / finite-closeout
> Visual Verification Timing: N/A
>
> ## 用户授权与范围
>
> 用户2026-10-03要求全仓排查低效用例、重复可合并合同、垃圾测试与反控，并明确错误材料修正或删除、不常驻项目。本卡并入当前全部已交付测试收口目标，在最终合并前审计main与候选全部测试/fixture/反控工具。Codex唯一Owner；build allowed只为审计工具、准确机账及已证明的测试/证据窄修，产品、规则、阈值、真实数据不变。
>
> ## 核验方法与停止线
>
> 1. AST全量清点file/fullName/参数化族、断言与mock、unsafe桥/ignore/skip、磁盘/共享临时路径和配置，保留精确源锚点。
> 2. 实跑JSON获取时长、状态、执行身份；按包/文件/族找耗时与setup/IO重复，不以次数或单次耗时直接判垃圾。
> 3. 精确相同body/结构相似只作为排重候选，逐合同核源条件、公开caller、合法输入、旧完整断言和可观察oracle；边界值/独立状态轴不能被数字归一化误删。
> 4. 反控核完整JSON/raw/exit/signal/spawn/集合/目标/AssertionError/恢复hash；错误有效声明修正或撤销，失效工具、过期转录从工作树删除，Git保存历史，不篡改红的错误类型。
> 5. 裁决分保留、合并、补强、删除、不可达/blocked；缺事实不得自动删用例或以覆盖/配额凑信用。仅已证重复/非法/无判别力及隔离缺陷在用户授权内修正；新产品真值交用户。
>
> ## 当前事实
>
> 当前集成候选工作树基于 main `8efe048610fab7aa4a257a716b91ece30194eba8`，HEAD `198f74d88029e7f50b559971c6ce91e1af739fd5` 后仍有审计窄修未提交；产品源无差异。审计已完成机器清点与代表性语义复核，新增/删除均限于已证明的测试合同、fixture 或证据工具。受影响 shared 113、pal-extract 377、migrate fast 630 与 game Grok 400 例已定向实跑通过，三包 typecheck 通过；全仓最终计数仍必须从冻结树重跑，不能沿用审计前快照。官方 ratchet 曾成功生成审计中间基准，最近一次重试因宿主 forks worker 启动超时在 inventory 阶段退出，未形成业务结论；需在不扩 timeout/不降规则的前提下重试。仍未 main/CI/退休。
> 已发现并撤销Q九枚历史反控的AssertionError信用，P01-C03当前也为Vitest Error，不改失败原文冒充合法红。已从候选删除1664+23个失效/过期过程材料。审计已确认删除/精简合同见[审计报告](../../../../testing/archive/legacy/batches/finite-test-intake-20261003/audit-report.md)与[机器摘要](../../../../testing/archive/legacy/batches/finite-test-intake-20261003/audit-summary.json)：2个extractor重复例、4个framebuffer重复例、5个MKF重复/误记例、7个YJ2/RLE弱重复例、1个隔离候选副本、1个FrameAnimation重复例；另修正一个unsafe typed assetBase、一个重复损坏gzip调用和调试输出。其余弱matcher/强转/慢corpus/CLI重复均未在缺少caller与oracle证据时强删。
>
> 此验收口径已同步写入 [`docs/ops/agent-workflow.md`](../../../agent-workflow.md) 与任务模板，作为后续所有贡献者测试任务的统一标准；“全绿”不再单独构成接收条件。最终审计报告明确保留未自动裁决项，不把静态 flag 或私有覆盖百分比当作质量结论。
>
> 无下一位贡献者提示词；Codex完成最终测试门、新基准、合并推送、CI与分支清理。
