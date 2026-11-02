# TEST-CODEX-MIGRATE-PURE-1 — 六组自包含转换边界

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（同步数据转换，无浏览器或生成物写盘）
Production Base: `8add8c66`
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是 +5pp 队列首个 Codex 批的纯测试历史记录（2026-09-26，Production Base 8add8c66）：migrate-content.ts 六组公开纯函数（角色/描述、技能效果、技能记录、装备效果、物品用途/配方、投掷/表记录）的自包含测试——fast 环境无原盘也可验证合法转换、拒绝/诊断与输入保真。

## 目标

为当前 migrateAll:1492 公开调用链的六组纯函数补独立最小输入测试；不改变转换策略、不冒充端到端 PAL 迁移或原版玩法证明。

## 范围

- 范围内：六新测试 migrate-{records,skill-effects,skills,equipment,item-use,throw}.pure.test.ts、pure-migration-fixtures.ts、codex-migrate-pure/ 证据。
- 范围外：产品/旧测试/配置/资产；不运行 migrate/bake 写主树；既有原盘 golden 保留不重复；不改 coverage exclude 伪造增量；场景迁移主链与宿主 IO 另批。

## 前提与证据

四向表：typed SourceCmd/SourceRole/Spell/Magic/Item 最小独立输入、既有 golden 保留、真实公开函数返回值/pending/lossy/不修改实参、fast 明确排除原盘依赖的 migrate-content.test。最强替代解释（零命中仅因 fast/full 口径不同）要求区分原盘已有证明与新输入/错误路径。
- 当前状态：done（历史终态）

## 验收

原卡记录：完成 83 新测试（8/16/24/7/20/8），6 正控+6 代表反控检出、同一 judge 伪红拒绝、TC 与改动 Biome 通过；完整 check8979、官方 ratchet、受保护单次 strict8487/701 exit0；全仓 +527B/+456L/+527S/+42F，生产分母与其它六包基线不变；初次错误与修正留回执。本页未复跑。本页治理验收：quote 字节保全与模板合同。

## 状态与交接

原卡 Codex accept/done（当前临时模式无需其它 AI 签字）；Cursor 候选单独 counter 未计并集。无下一位 Agent 提示词。本页治理不重授。

## 历史范围

2026-09-26 准入、实施与收口同日；固定源 bb7b1d24e9e517e09730282b104ce51b4204cb0b。2026-10-17 R42 泛化封套，2026-10-18 S15 改写。

## 原始结论

`Status: done`：六组自包含转换边界按纯测试批收口。原卡全文在下方 quote 保全。

## 当时证据

四向前提表、83 测分组数、批回执。本页治理未新增执行。

## 当前有效性

historical。转换器现行行为以当前代码为准。

## 继任文档

队列母卡[TEST-COVERAGE-PLUS5-1](TEST-COVERAGE-PLUS5-1-continuous-batches.md)；后续批 codex-migrate-assembly/scenes。

## 原文保全

固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `49f73326d6e677e88f1ca9ae156807fdcd10d70e41ce24d70bcdfd0cd6263a0b`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # TEST-CODEX-MIGRATE-PURE-1 — 六组自包含转换边界
>
> Status: done
> Owner: Codex
> Phase: phase2
> Visual Verification Timing: N/A（同步数据转换，无浏览器或生成物写盘）
> Production Base: `8add8c66`
>
> ## 目标与准入
>
> [持续目标](TEST-COVERAGE-PLUS5-1-continuous-batches.md)首个本席批：
> `packages/migrate/src/migrate-content.ts`的角色/描述、技能效果、技能记录、装备效果、
> 物品用途/配方、投掷/表记录六组公开纯函数。只新增测试与专属证据，不改变转换策略。
> Codex于2026-09-26核定build allowed；当前委派模式由本席自验与质量门收口，不等待固定三席。
>
> ## 前提真值门
>
> 一句话：现有转换器在没有原盘的fast环境也应能验证合法转换、拒绝/诊断与输入保真；
> 新增自包含测试不代表已经重做PAL端到端迁移或证明原版玩法。
>
> | 方向 | 一手证据 | 本批用途 |
> |---|---|---|
> | 提取输入 | `packages/migrate/src/source-facts.ts:9` SourceCmd；migrate-content:44/75/89/151 SourceRole/Spell/Magic/Item | 类型完整的最小独立输入，不伪造运行时世界 |
> | 第一阶段/原版 | migrate-content既有golden `src/migrate-content.test.ts:113-415` 与源码中已登记的装备槽/符号转换来源 | 保留已有原盘golden，不冒充新机制考证；不改变数值/角色映射 |
> | 当前二阶段 | migrate-content:249/276/459/625/801/962/1058/1090/1164/1312/1403，当前migrateAll:1492公开调用链 | 真实公开函数返回值、pending/lossy和不修改实参 |
> | 本批目标 | `scripts/coverage/config.mjs` migrate fast明确排除依赖原盘的migrate-content.test | 独立输入测此前未触达边界，已有语义按去重表披露；不更改exclude以伪造增量 |
>
> 最强替代解释：零命中仅因fast/full口径不同，不是没有测试；必须区分原盘已有证明与新输入/错误路径。
> 出现产物guard拒绝或源语义争议时分类/登记，不按返回值盲目制造合同。未经另核不得修产品或重迁。
>
> ## 范围与验收
>
> - 六新测试：`packages/migrate/src/migrate-{records,skill-effects,skills,equipment,item-use,throw}.pure.test.ts`；
>   可新增`src/__tests__/pure-migration-fixtures.ts`，仅测试目录。
> - 专属报告/代表负控在`docs/testing/archive/legacy/batches/codex-migrate-pure/`；公共索引/看板与官方baseline由本席统一更新。
> - 实际同一入参调用前后深快照；输出对象/数组与诊断精确比较；合法输出在适用范围走content正式guard。
> - 旧测试与产品、配置、资产零改；不运行migrate/bake写主树、不碰GLM content测试与Cursor editor测试。
> - 整批定向/相邻/包TC/Biome，6代表单点负控；随后串行check→ratchet→受保护单次strict-fast。
> - 补测试不保证整个migrate-content达到100%；场景迁移主链与宿主IO仍另批。
>
> ## 推进记录
>
> - 2026-09-26 Codex：已读以上函数、full-only旧标题与所有非golden调用搜索；开始六组实施。done未开放。
> - 2026-09-26 Codex：完成83新测试（records8/effects16/skills24/equipment7/item-use20/throw8），
>   6正控+6代表反控检出、同一judge伪红拒绝、TC与改动Biome通过。完整check8,979、官方ratchet、
>   受保护单次strict8,487/701均exit0；全仓+527B/+456L/+527S/+42F，生产分母与其它六包基线对象不变。
>   初次错误与修正如实记[回执](../../../../testing/archive/legacy/batches/codex-migrate-pure/README.md)，没有产品修改或真实工程写盘。
>   本席核定 **accept / done**；当前临时模式无需其它AI签字。Cursor候选单独counter，未计并集。
>
> 无下一位Agent提示词；本席连续实施与验收。
<!-- original-source-quote:end -->
