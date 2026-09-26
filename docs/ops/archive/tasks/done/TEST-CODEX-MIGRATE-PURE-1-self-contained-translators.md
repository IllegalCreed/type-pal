# TEST-CODEX-MIGRATE-PURE-1 — 六组自包含转换边界

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（同步数据转换，无浏览器或生成物写盘）
Production Base: `8add8c66`

## 目标与准入

[持续目标](../../../tasks/TEST-COVERAGE-PLUS5-1-continuous-batches.md)首个本席批：
`packages/migrate/src/migrate-content.ts`的角色/描述、技能效果、技能记录、装备效果、
物品用途/配方、投掷/表记录六组公开纯函数。只新增测试与专属证据，不改变转换策略。
Codex于2026-09-26核定build allowed；当前委派模式由本席自验与质量门收口，不等待固定三席。

## 前提真值门

一句话：现有转换器在没有原盘的fast环境也应能验证合法转换、拒绝/诊断与输入保真；
新增自包含测试不代表已经重做PAL端到端迁移或证明原版玩法。

| 方向 | 一手证据 | 本批用途 |
|---|---|---|
| 提取输入 | `packages/migrate/src/source-facts.ts:9` SourceCmd；migrate-content:44/75/89/151 SourceRole/Spell/Magic/Item | 类型完整的最小独立输入，不伪造运行时世界 |
| 第一阶段/原版 | migrate-content既有golden `src/migrate-content.test.ts:113-415` 与源码中已登记的装备槽/符号转换来源 | 保留已有原盘golden，不冒充新机制考证；不改变数值/角色映射 |
| 当前二阶段 | migrate-content:249/276/459/625/801/962/1058/1090/1164/1312/1403，当前migrateAll:1492公开调用链 | 真实公开函数返回值、pending/lossy和不修改实参 |
| 本批目标 | `scripts/coverage/config.mjs` migrate fast明确排除依赖原盘的migrate-content.test | 独立输入测此前未触达边界，已有语义按去重表披露；不更改exclude以伪造增量 |

最强替代解释：零命中仅因fast/full口径不同，不是没有测试；必须区分原盘已有证明与新输入/错误路径。
出现产物guard拒绝或源语义争议时分类/登记，不按返回值盲目制造合同。未经另核不得修产品或重迁。

## 范围与验收

- 六新测试：`packages/migrate/src/migrate-{records,skill-effects,skills,equipment,item-use,throw}.pure.test.ts`；
  可新增`src/__tests__/pure-migration-fixtures.ts`，仅测试目录。
- 专属报告/代表负控在`docs/testing/codex-migrate-pure/`；公共索引/看板与官方baseline由本席统一更新。
- 实际同一入参调用前后深快照；输出对象/数组与诊断精确比较；合法输出在适用范围走content正式guard。
- 旧测试与产品、配置、资产零改；不运行migrate/bake写主树、不碰GLM content测试与Cursor editor测试。
- 整批定向/相邻/包TC/Biome，6代表单点负控；随后串行check→ratchet→受保护单次strict-fast。
- 补测试不保证整个migrate-content达到100%；场景迁移主链与宿主IO仍另批。

## 推进记录

- 2026-09-26 Codex：已读以上函数、full-only旧标题与所有非golden调用搜索；开始六组实施。done未开放。
- 2026-09-26 Codex：完成83新测试（records8/effects16/skills24/equipment7/item-use20/throw8），
  6正控+6代表反控检出、同一judge伪红拒绝、TC与改动Biome通过。完整check8,979、官方ratchet、
  受保护单次strict8,487/701均exit0；全仓+527B/+456L/+527S/+42F，生产分母与其它六包基线对象不变。
  初次错误与修正如实记[回执](../../../../testing/codex-migrate-pure/README.md)，没有产品修改或真实工程写盘。
  本席核定 **accept / done**；当前临时模式无需其它AI签字。Cursor候选单独counter，未计并集。

无下一位Agent提示词；本席连续实施与验收。
