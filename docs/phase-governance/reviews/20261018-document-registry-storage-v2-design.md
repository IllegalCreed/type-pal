# 文档 registry storage v2 设计

Status: draft
Owner: Codex
Last reviewed: 2026-10-18
Template: design-spec-v1 / 1.0.0

## 问题与目标

`document-registry.json` 在固定源 `3fae68aec8f448bf83d1d85e61da35c94d5200ae` 已达 1,047,444 字节，SHA256 `921eaef61673fdf83c69763e1f2e9a72e55b08afaf67bc8b5930dbd08331ae33`。继续接收逐篇审查即会超过 Biome 默认 1 MiB。采用结构拆分；不缩短语义字符串、放宽 maxSize 或新增排除。任务见[DOCS-REGISTRY-SPLIT-1](../../ops/tasks/DOCS-REGISTRY-SPLIT-1.md)。

目标是存储扩容及验证收敛，不改变审查标准、事实权或已批准的 17 类模板。源 2374 条全部保留；1838 固定 cohort 与后续增量仍分开。

## 真值与约束

源对象的 policy、id、roots、extensions、structuralRoots、scopeNote 及各 entry 原生键值保持。旧 roots 只列五个历史目录，不能暗中改写为当前完整枚举或覆盖声明；迁移 metadata 明确保留其历史含义。summary 按全部条目计算并与源逐字段相等，初始状态 1925 partial / 449 reviewed、1931 needs / 443 compliant 不提升。

registry 只管理文档分类和审查覆盖；任务卡、testing catalog、正文与回执各自保留事实权。source/after SHA 和独立审查仍由 review record 负责，存储分片不引入 artifactOnly 完成通道。新增分片属于结构化候选，要显式登记归属与待审状态，不能靠扩大 structuralRoots 静默排除。

## 方案

### manifest 与分片

原公开路径保持 `docs/phase-governance/document-registry.json`，改 `schemaVersion: 2`、保留上述原生 metadata，移出 `entries`，新增 `shards` 与存储迁移 provenance。初始七片为 `document-registry.{ops,lore,phase1,phase2,phase3,phase-governance,testing}.json`。descriptor 包含唯一 key、phase、同目录相对 path、total、格式化后字节 SHA256。

每片 `schemaVersion: 1`、phase、positions、entries；positions 与 entries 平行，保存原全局索引。不得给 entry 增添排序字段。loader 用 positions 重建原数组，拒绝重复、缺位、负数、非整数、越界及重复文档路径，验证 phase/count/summary/所需原生字段与 descriptor SHA。唯一 key 可支持以后一个 phase 多片，无须立即增加动态分片策略。

manifest/shards 路径仅允许受控同目录普通文件，拒绝 absolute、父路径、符号链接逃逸。loader 提供一个逻辑 registry 视图供 consumer 使用，仅接受当前 v2，不保留 live v1 fallback。旧完整源通过 Git 与迁移映射定位，历史核验不依赖运行时兼容层。

### 公开读写与迁移

公开 writer 接受逻辑 registry，保持所有 entry 对象与顺序，先生成并按现有 Biome 格式化全部分片 bytes，再取 hash，manifest 最后写入；不手改 raw。写入前比较已加载输入文件的 SHA，拒绝其他 Owner 并发修改。物理文件维持原 1 MiB 硬边界，超过即失败并要求继续拆片。

显式一次性迁移工具从固定源 bytes 与预期 SHA 读取 v1，先完整验证，再产生 v2；它不是公开 loader 的 fallback。输出逐条原 path/原索引/源对象 hash/目标 shard/片内索引/原生对象等值结论，以及所有目标字节 hash。源 2374 条迁移与后续新增候选分开，不能把增量并入保真分母。迁移映射与 schema 工具归本卡；格式先于最终 pin。

### consumer 与链接重算

| 入口 | 改动与验证 |
|---|---|
| check-content-review.mjs | 改用 loader，保留全部完成信用与 SHA/撤回检查 |
| report-governance-progress.mjs | 改用 loader，1838/增量/pilot 分母和拒绝条件保持 |
| sync-governed-document-registry.mjs | 改用 loader/writer，review 同步不自授语义信用 |
| classify-governed-documents.mjs | 旧路径启发式全量覆盖器退役，任何读写前非零拒绝 |
| generate-structured-content-reviews.mjs | 旧通用模板伪审生成器退役，任何读写前非零拒绝 |
| enrich-review-metadata.mjs | 旧深审补票/legacy 填充器退役，任何读写前非零拒绝 |
| historical-execution-source.test.mjs、frozen-binding-baseline.test.mjs | 仅文档工具 schema fixture 与读入口迁移，原断言完整保留 |

所有正文链接仍指薄 manifest 原路径；片间引用由 loader 校验，不是 Markdown 路径替换。全仓检索剩余直接 entries 读取及旧临时写入工具；根 Owner 的 `/tmp/sync-integrity-records.py` 在适配前停用。review 中对原 registry 的 after pin 需在实际读过 manifest/各片迁移差异后顺序更新；R94/control root 自身不自嵌 hash，已有 DAG 不能引入环。

## 边界与风险

多文件更新不是文件系统事务；writer 需先验证并准备所有 bytes，冲突时不覆盖，新 manifest 发布前不得让并行 consumer 误收半包；写入后重载验证，失败保持候选且禁止集成。实现必须说明其临时文件/失败清理边界，不能自称原子多文件提交。

反例包括：缺一片、替换一字节、descriptor/hash/summary 伪造、positions 重复或丢位、phase 混入、路径越界、同内容异路径、已加载文件被改动、危险旧生成器尝试覆盖、v1 被 live consumer 悄悄接受。均须真实 consumer 非零拒绝；原有效源需等值重建并维持同一进度及撤回结果。

本设计与任务卡暂未写进逼近上限的旧 entries，缺口已公开；实现接入时另列新增 partial/needs 候选。本轮不新建模板格式豁免，不以存储有效替代 JSON 原生合同的逐篇语义重审。

## 验收

由非作者先复核本设计，然后冻结版本并指定单一实现 Owner；固定实现候选由 Codex 实读代码、源/目标映射与反例。源 2374/2374 对象、顺序和 summary 等值是迁移 oracle；真实 loader/consumer 以及输入冲突/坏片反例是判别 oracle。只跑 JSON deep-equal 不足以接收整个治理任务。

运行文档工具专项测试、实际 check:docs、lint、staged 与完整基点 diff；保存真实失败。源中的未完成语义范围不会因为拆分消失，strict / require-complete 未闭合时保持 rework，不合 main、不标 done。
