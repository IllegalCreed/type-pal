# TEST-GLM-WAVE-Q-1 — runtime/解码冻结交付收口

Status: done
Closed Evidence: main d8a81d4c21a32efa3c140fb5858c83465b01bc5e; GitHub Documentation 37145486289 + Coverage 37145486286 success (2026-10-04); finite regression admission after audit, not historical quota fulfillment.
Phase: mixed（game/pal-extract第一阶段；reforge第二阶段）
Capability: test-coverage
Coding Owner: GLM Q（作者已停止）
Reviewer: Codex
Visual Verification Timing: N/A（纯测试接入；历史未证主张保留）
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是 GLM Q 波（runtime/解码残余十倍量测试）与 O/P 同令冻结、按有限回归准入收口的历史记录；下述数字与门禁结果均为原卡时点陈述，本次文档治理未重跑任何测试或CI。

## 目标

把 Q 波固定 175 项 game/pal-extract/reforge runtime 与解码测试按有限回归准入收口：保留真实 IO/解码、分色近邻、队伍/战斗生命周期等代表证据，按 caller/matcher 排重，不再无限续派。

## 范围

- 范围内：作者固定 5dbf72d78f8df9939a76407c0f17ad10455bbbb5 的 30 个测试/fixture 文件、175 项执行保留为现行回归/交叉核验（172 是历史结构上限，不是整卡语义净新量）；不同 caller 但相同 matcher 的平台/view/direct API 轴不重复计新；CLI 用 mkdtemp 合成数据与公开入口，不触真实 data/raw/extracted；已接收 NEXT/NEXT2 的真实 IO/解码代表证据保留。
- 范围外：700例/50组/50针/Q10视觉历史计划；D-Q01-1 标题读档 IO 错误（属[REFORGE-OPENING-LOAD-ERROR-1](../../../tasks/REFORGE-OPENING-LOAD-ERROR-1.md) draft，本卡不修不标完成）；F1 overlay 恢复主张（withdrawn，维持撤回）；PAL 剧情/E2E002/世界后门；全仓 85%（未达，不是本卡继续工作的条件）。

## 前提与证据

冻结与收口指令同 O 波；共同冻结收口见[glm-tenfold-triple 机账](../../../../testing/archive/legacy/batches/glm-tenfold-triple/README.md)。第一阶段真值、生产源、旧测、数据与统计配置不改，不恢复旧兼容。可证伪反例：拿真实媒体播放或源码推断当 F1 已验恢复；把 1b 基点 CI 冒称 8efe 或今天 main 的结论。
- 当前状态：done（历史终态）

## 验收

原卡记录：83 文件并集完整 check 11875 绿、工具 325 绿、七包 typecheck 与 lint 零诊断、ratchet 通过；旧 16 计数阻塞由用户窄批准关闭，最新 check 11875+345、protected 11461 全绿且五登记通过；新 strict 因旧 I06 game 8280→8279 拒收、main CI 另缺 ignored 头像五旧红，转[QUALITY-TEST-INPUTS-1](QUALITY-TEST-INPUTS-1.md)。以上均为原卡时点结果，本页未复跑。本页迁移验收：source/after SHA、quote 逆回读、模板与历史 overlay 章节、链接通过。

## 状态与交接

原卡明确无下一位 GLM 提示词：固定 175 交付是本卡终点；产品 draft 另行窄准入不夹修。S14 本页治理只改写泛化封套，不重开任务、不恢复旧机制、不改保护参照。

## 历史范围

2026-10-02 冻结、2026-10-03 收口指令与 GitHub 双 CI 成功（2026-10-04）；门基点 1b3bffb7/content21/SAVE10，记录时并行 main 已升级 8efe0486/content22/SAVE11；第一阶段/稳定 IO 合同与二阶段过期模型分开筛选，不用旧 model 兼容或新配额留过期合同。2026-10-17 R41 泛化封套，2026-10-18 S14 逐篇改写。

## 原始结论

`Status: done`：175 项固定交付按有限回归准入收口；D-Q01-1 与 F1 的边界按原卡移交，原卡全文与历史在下方 quote 保全。

## 当时证据

main d8a81d4c2 与 GitHub Documentation/Coverage 37145486289/37145486286（2026-10-04）；作者固定树 5dbf72d78（30 文件、175 执行）；[最新机账](../../../../testing/archive/legacy/batches/finite-test-intake-20261003/README.md)。本页治理未新增任何执行。

## 当前有效性

historical。F1 overlay 恢复主张维持 withdrawn；D-Q01-1 的当前状态以[REFORGE-OPENING-LOAD-ERROR-1](../../../tasks/REFORGE-OPENING-LOAD-ERROR-1.md)活动卡为准；历史数字不外推为今天 main 或 85% 结论。

## 继任文档

[REFORGE-OPENING-LOAD-ERROR-1](../../../tasks/REFORGE-OPENING-LOAD-ERROR-1.md)（活动 draft）承接标题读档 IO 错误；[QUALITY-TEST-INPUTS-1](QUALITY-TEST-INPUTS-1.md)与[QUALITY-OPQ-RETIREMENT-1](QUALITY-OPQ-RETIREMENT-1.md)承接共同保护账输入。当前测试事实源为 docs/testing/catalog.json。

## 原文保全

固定源 revision `b9901f97a3a09359cbeaed9dde126e6f44b7f229`，source SHA `9a18297801768d3345b163751b3f10720d95d80dab2198aee56e2319c7edd900`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-WAVE-Q-1 — runtime/解码冻结交付收口
>
> Status: done
> Closed Evidence: main d8a81d4c21a32efa3c140fb5858c83465b01bc5e; GitHub Documentation 37145486289 + Coverage 37145486286 success (2026-10-04); finite regression admission after audit, not historical quota fulfillment.
> Phase: mixed（game/pal-extract第一阶段；reforge第二阶段）
> Capability: test-coverage
> Coding Owner: GLM Q（作者已停止）
> Reviewer: Codex
> Visual Verification Timing: N/A（纯测试接入；历史未证主张保留）
>
> ## 冻结边界与历史
>
> 用户2026-10-02冻结现有交付，2026-10-03要求通过后推送/关卡/清分支。700例/50组/50针/Q10视觉是历史计划，不是当前done门，不再无限续派。
> 作者固定5dbf72d78f8df9939a76407c0f17ad10455bbbb5，30测试/fixture文件、175执行；[原完整卡与历史](https://github.com/IllegalCreed/type-pal/blob/9ae1116ec01308ef29f0b08c98f29ab1898ad034/docs/ops/tasks/TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md)不重写。
> [共同冻结收口/证据](../../../../testing/archive/legacy/batches/glm-tenfold-triple/README.md)为现行范围：仅固定交付选择性接入；不修改第一阶段真值、生产源、旧测、数据或统计配置，不恢复旧兼容。
>
> ## 独立裁决
>
> 175保留现行回归/交叉核验；172是历史结构上限，不是整卡语义净新量。不同caller但相同matcher的平台/view/direct API轴不再重复计新，原body和可观察业务oracle保留；CLI用mkdtemp合成数据与公开入口，不触真实data/raw/extracted。
> 已接收NEXT/NEXT2的真实IO/解码、分色近邻、队伍/战斗生命周期代表证据保留，不称新重跑全部历史针；测试输入/fixture/主源未变的旧证明继续有效。
> D-Q01-1另属[标题读档IO错误产品draft](../../../tasks/REFORGE-OPENING-LOAD-ERROR-1.md)，本次不修、不标完成。F1 overlay恢复主张仍withdrawn，不拿真实媒体播放或源码推断当已验恢复。不走PAL剧情/E2E002，不用世界后门。
>
> ## 收口门
>
> 固定并集完整check11875绿、工具325绿、七包typecheck与lint零诊断；ratchet通过，最终受保护strict-fast在下列旧身份保护账阻塞。只有解决保护门后才main/done/可恢复退休。
>
> 上述是先前16计数阻塞的历史，用户窄批准后已关闭；最新check11875+345/ratchet过，protected11461全绿且五登记通过，但旧I06随机少1 game臂而拒收，main CI另有缺ignored头像五旧红。[最新机账](../../../../testing/archive/legacy/batches/finite-test-intake-20261003/README.md)与[两旧输入待准入](QUALITY-TEST-INPUTS-1.md)。Q无作者返工，不能恢复旧机制或改保护参照；未main/done/删除。
> 全仓85%尚未达，不是本卡继续工作的条件；不存在下一波无限补量。
>
> 无下一位GLM提示词，固定175交付是本卡终点。产品draft另行窄准入，不夹修。
>
> 本轮门基于1b3bffb7/content21/SAVE10。并行main已升级8efe0486/content22/SAVE11；第一阶段/稳定IO合同与二阶段过期模型分开筛选，不用旧model兼容或新配额留住过期合同。上述CI是1b原件，不能冒称8efe失败/通过。
<!-- original-source-quote:end -->
