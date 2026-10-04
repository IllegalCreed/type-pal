# AUDIT-TEST-QUALITY-1 — 全仓测试、fixture 与反控质量审计

Status: done
Closed Evidence: main d8a81d4c21a32efa3c140fb5858c83465b01bc5e; GitHub Documentation 37145486289 + Coverage 37145486286 success (2026-10-04); finite regression admission after audit, not historical quota fulfillment.
Owner: Codex
Reviewer: Codex
Phase: mixed / ops
Capability: test-quality / finite-closeout
Visual Verification Timing: N/A

## 用户授权与范围

用户2026-10-03要求全仓排查低效用例、重复可合并合同、垃圾测试与反控，并明确错误材料修正或删除、不常驻项目。本卡并入当前全部已交付测试收口目标，在最终合并前审计main与候选全部测试/fixture/反控工具。Codex唯一Owner；build allowed只为审计工具、准确机账及已证明的测试/证据窄修，产品、规则、阈值、真实数据不变。

## 核验方法与停止线

1. AST全量清点file/fullName/参数化族、断言与mock、unsafe桥/ignore/skip、磁盘/共享临时路径和配置，保留精确源锚点。
2. 实跑JSON获取时长、状态、执行身份；按包/文件/族找耗时与setup/IO重复，不以次数或单次耗时直接判垃圾。
3. 精确相同body/结构相似只作为排重候选，逐合同核源条件、公开caller、合法输入、旧完整断言和可观察oracle；边界值/独立状态轴不能被数字归一化误删。
4. 反控核完整JSON/raw/exit/signal/spawn/集合/目标/AssertionError/恢复hash；错误有效声明修正或撤销，失效工具、过期转录从工作树删除，Git保存历史，不篡改红的错误类型。
5. 裁决分保留、合并、补强、删除、不可达/blocked；缺事实不得自动删用例或以覆盖/配额凑信用。仅已证重复/非法/无判别力及隔离缺陷在用户授权内修正；新产品真值交用户。

## 当前事实

当前集成候选工作树基于 main `8efe048610fab7aa4a257a716b91ece30194eba8`，HEAD `198f74d88029e7f50b559971c6ce91e1af739fd5` 后仍有审计窄修未提交；产品源无差异。审计已完成机器清点与代表性语义复核，新增/删除均限于已证明的测试合同、fixture 或证据工具。受影响 shared 113、pal-extract 377、migrate fast 630 与 game Grok 400 例已定向实跑通过，三包 typecheck 通过；全仓最终计数仍必须从冻结树重跑，不能沿用审计前快照。官方 ratchet 曾成功生成审计中间基准，最近一次重试因宿主 forks worker 启动超时在 inventory 阶段退出，未形成业务结论；需在不扩 timeout/不降规则的前提下重试。仍未 main/CI/退休。
已发现并撤销Q九枚历史反控的AssertionError信用，P01-C03当前也为Vitest Error，不改失败原文冒充合法红。已从候选删除1664+23个失效/过期过程材料。审计已确认删除/精简合同见[审计报告](../../../../testing/archive/legacy/batches/finite-test-intake-20261003/audit-report.md)与[机器摘要](../../../../testing/archive/legacy/batches/finite-test-intake-20261003/audit-summary.json)：2个extractor重复例、4个framebuffer重复例、5个MKF重复/误记例、7个YJ2/RLE弱重复例、1个隔离候选副本、1个FrameAnimation重复例；另修正一个unsafe typed assetBase、一个重复损坏gzip调用和调试输出。其余弱matcher/强转/慢corpus/CLI重复均未在缺少caller与oracle证据时强删。

此验收口径已同步写入 [`docs/ops/agent-workflow.md`](../../../agent-workflow.md) 与任务模板，作为后续所有贡献者测试任务的统一标准；“全绿”不再单独构成接收条件。最终审计报告明确保留未自动裁决项，不把静态 flag 或私有覆盖百分比当作质量结论。

无下一位贡献者提示词；Codex完成最终测试门、新基准、合并推送、CI与分支清理。
