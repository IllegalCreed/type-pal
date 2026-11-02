# TEST-CODEX-PAL-ASSETS-1 — 自包含资源加载与所有权八组回归

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（解码像素/资源字节合同，不代表界面或剧情观感）
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是 +5pp 队列对 pal-assets 公开入口的八组纯测试历史记录（2026-09-26，基点 2838df42）：真实 PNG/WAV 解码、来源/摘要闭包、所有权保持、失败在首写之前拒绝。

## 目标

为 pal-assets.ts:361/601/1161/1201 公开入口与 content/src/asset.ts:136 catalog 守卫补八组合同回归（sound-metadata/sound-closure/palette/portraits/items/backgrounds/ownership/retirements）。

## 范围

- 范围内：八份新测试与专属 pal-asset-fixtures.ts、[证据目录](../../../testing/archive/legacy/batches/codex-pal-assets/README.md)；只用自己 mktemp 根。
- 范围外：产品/旧测试/配置/资产；旧 pal-assets.test.ts 与 pal-assets-paths.test.ts 已证的世界/战斗精灵全量 census、五头像映射、基础 authored 接管、链接竞态；不调用迁移 CLI、不写实际 projects/data。

## 前提与证据

生产链锚点 pal-migration-io.ts:91 与 scripts/migrate-content.mts:85/110；合成提取树只证明格式/拒绝/像素合同，不冒充原盘真值；palette/portrait/items/background 固定数量不放宽。若合法数据过不了正式 guard 或产品有缺陷，单列诊断不改绿预期。
- 当前状态：done（历史终态）

## 验收

原卡记录：84 新增、相邻 114/114、TC/Biome、八对照/八针全过；同一 shell 严格串行 check9272→ratchet→保护 2838df42 单次 strict8780 exit0；全仓 44993/63178=71.216…%，+102B/+139L/+163S/+22F；报告披露本席 fixture 及反控定位错误。本页未复跑。本页治理验收：quote 字节保全与模板合同。

## 状态与交接

原卡 Codex accept/done；当前未发现新增产品缺陷、母目标差 1584B。无下一位 Agent 提示词。本页治理不重授。

## 历史范围

2026-09-26 准入与收口同日；固定源 bb7b1d24e9e517e09730282b104ce51b4204cb0b。2026-10-17 R42 泛化封套，2026-10-18 S15 改写。

## 原始结论

`Status: done`：八组资源加载/所有权回归按纯测试批收口。原卡全文在下方 quote 保全。

## 当时证据

四向真值段与旧测试排重清单、批回执（含本席错误披露）。本页治理未新增执行。

## 当前有效性

historical。资源管线现行行为以当前代码为准；71.22% 为时点数字。

## 继任文档

队列母卡[TEST-COVERAGE-PLUS5-1](TEST-COVERAGE-PLUS5-1-continuous-batches.md)；资产管线现行合同以 asset.ts 守卫为准。

## 原文保全

固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `46a19727fba88f82d0063f6fa1c425c0938129e72212772ae09bb13c80c09714`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # TEST-CODEX-PAL-ASSETS-1 — 自包含资源加载与所有权八组回归
>
> Status: done
> Owner: Codex
> Phase: phase2
> Visual Verification Timing: N/A（解码像素/资源字节合同，不代表界面或剧情观感）
>
> ## 准入与一手依据
>
> 2026-09-26，基点 `2838df42`，Codex premise verified / build allowed。
> 属于[持续+5pp队列](TEST-COVERAGE-PLUS5-1-continuous-batches.md)，单一测试Owner，产品零改。
> 固定三席退休，不等待贡献者返工，不修改Cursor/GLM/架构Owner文件。
>
> 四向真值：原盘/一阶段N/A于本卡的新机制裁决（不变更游戏、PAL实际资源数量或映射）；
> 当前生产 `pal-migration-io.ts:91` 调用 `loadPalAssets`，发布脚本 `scripts/migrate-content.mts:85/110`
> 调用退休计划/物化；`pal-assets.ts:361/601/1161/1201` 是公开被测入口，
> `content/src/asset.ts:136` 是catalog结构守卫。目标为真实PNG/WAV解码、来源/摘要闭包、
> 所有权保持、失败在首写之前拒绝，实际输入与文件不污染。
>
> 最强替代解释是已有full-only PAL全量测试或路径测试已证明同一合同。本席读旧
> `pal-assets.test.ts` 与 `pal-assets-paths.test.ts`，不复制世界/战斗精灵全量census、五头像映射、
> 基础authored接管或链接竞态。合成提取树只证明格式/拒绝/像素合同，不冒充原盘真值。
> palette/portrait/items/background固定数量不放宽；不可达/重叠防御臂不私有调用硬凑。
> 若合法数据不能通过正式guard或产品存在缺陷，单列诊断，不改成绿预期。
>
> ## 范围与验收
>
> - 八份新 `packages/migrate/src/pal-assets.{sound-metadata,sound-closure,palette,portraits,items,backgrounds,ownership,retirements}.test.ts`。
> - 专属 `src/__tests__/pal-asset-fixtures.ts` 与[证据目录](../../../../testing/archive/legacy/batches/codex-pal-assets/README.md)。
> - 只使用自己mktemp根；不调用迁移CLI、不写实际projects/data、不改旧测试/产品/配置。
> - 成功完整记录/像素或字节、失败精确错误/同输入快照；物化拒绝核零写IO，运行真实公开函数。
> - 代表单点负控、定向/相邻/TC/Biome，整批串行check→ratchet→保护基点单次strict-fast。
>   baseline只能官方ratchet生成；统计用最终JSON，不承诺凑够用例或100%。
>
> 无下一位Agent提示词；本席连续实施/自验/收口，不冒充独立第三方。
>
> ## 完成核定
>
> 2026-09-26 Codex accept / done：84新增、相邻114/114、TC/Biome、八对照/八针全部通过。
> 同一shell严格串行check9272→ratchet→保护2838df42的单次strict8780，均exit0。
> 全仓44993/63178=71.21624616163854%，本批+102B/+139L/+163S/+22F，
> 701生产清单/全部分母/其它六包完整baseline对象不变。报告披露本席fixture及反控定位错误，
> 未把产品缺陷改成绿预期；当前未发现新增产品缺陷。母目标仍build，尚差1584B。
<!-- original-source-quote:end -->
