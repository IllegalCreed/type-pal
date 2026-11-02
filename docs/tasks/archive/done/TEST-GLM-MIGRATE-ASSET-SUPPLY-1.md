# TEST-GLM-MIGRATE-ASSET-SUPPLY-1 — asset supply, ownership and publication boundaries

Status: done
Phase: phase2
Capability: migrate / asset supply and publication
Coding Owner: GLM
Reviewer: Codex（独立验收）
Branch: `codex/glm-migrate-asset-supply-r1`
Visual Verification Timing: N/A
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是 GLM 承接的 migrate 资产供应链审计历史卡（2026-10-05，基 f4dbd0e3d）：七文件（pal-assets/authored-overlays/project-map-converter/store-boundary/current-publication/casualty-scripts/world-sprite-registry）排重后 15 净新合同+unreachable/product-counter 账。

## 目标

证明 source ownership、字节/hash/目录闭包、重迁幂等、零写拒绝与 authored 数据不被覆盖；覆盖 missing/extra/hash/size/type、legacy→authored takeover、retirement、map conversion、publication conflict/idempotence、sprite registry identity。

## 范围

- 范围内：七文件公开 loader/materializer/publication caller；mkdtemp 合成工程+finally 清理。
- 范围外：真实 projects/pal/data/raw；产品/旧测/config/baseline/退役迁移器；弱 hash 断言。

## 前提与证据

关键修正：kimi-r1 判 loadPalEffectSprites 合成不可达——本卡以 YJ2 初始平衡树（yj2.ts:74-81）路径确定性构造单字面量合法位流、12 段 frameAnimations 合成全过，effect-sprites 分区（fast 0%）首次合成可达并补 census/magic 两合同。:1154 经 validateAssetCatalog 前缀/路径门证防御重复、:533 sentinel-only 块一手实探。
- 当前状态：done（历史终态）

## 验收

原卡记录：15 tests+13 针严格四态（28 相位 TSV identity 集合 sha256 级、runner 自测 11 例、mkdtemp 残留 0）；定向 15/15、相邻 30 文件 294/294、migrate 全量 738/738、typecheck、lint 0/0/0（3449 文件）、diff 干净；并行卡（reforge bcs1）同树在途以分支稳定门+目标源 index hash 门隔离并披露。Codex 独立复跑 13/13 后合入 main。本页未复跑。本页治理验收：quote 字节保全与模板合同。

## 状态与交接

原卡无下一位实现 Agent；YJ2 位流推导是“合成不可达”判断被一手推导推翻的判例。本页治理不重授。

## 历史范围

2026-10-05 r1 交付、2026-10-06 Codex 验收；固定源 bb7b1d24e9e517e09730282b104ce51b4204cb0b。2026-10-17 R42 泛化封套，2026-10-18 S15 改写。

## 原始结论

`Status: done`：15 条资产供应合同+YJ2 可达性修正经独立验收合入。原卡全文在下方 quote 保全。

## 当时证据

dedup-ledger.md、counterproof.json（13 针四态）、并行披露 concurrentForeignWork。本页治理未新增执行。

## 当前有效性

historical。资产供应链现行合同以当前测试为准。

## 继任文档

后续卡 TEST-GLM-MIGRATE-PLAN-TRANSACTION-1（plan/transaction 域）。

## 原文保全

固定源 revision `b3c24c04ddb534b9e8195a074590bea8a233fc93`，source SHA `b8d78ef848f6e3fbf83afa4995372c0890387098f65346f4836745e1bb77e6db`；下方 quote 逆回读规则：直接逆回多 1B；精确排除 end 标记前恰一个未引用分隔 LF 后与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-MIGRATE-ASSET-SUPPLY-1 — asset supply, ownership and publication boundaries
>
> Status: done
> Phase: phase2
> Capability: migrate / asset supply and publication
> Coding Owner: GLM
> Reviewer: Codex（独立验收）
> Contributor: GLM
> Branch: `codex/glm-migrate-asset-supply-r1`
> Visual Verification Timing: N/A
>
> ## 目标
>
> 审计 migrate 资产供应链剩余公开合同，覆盖 PAL asset loaders/materialize、authored takeover、retirement、map conversion、store boundary、publication 和 world sprite registry。目标是证明 source ownership、字节/hash/目录闭包、重迁幂等、零写拒绝和 authored 数据不被覆盖；不触真实 `projects/pal` 生产数据。
>
> ## 范围
>
> - `packages/migrate/src/pal-assets.ts`、`pal-authored-overlays.ts`、`project-map-converter.ts`、`pal-store-boundary.ts`、`pal-current-publication.ts`、`pal-casualty-scripts.ts`、`pal-world-sprite-registry.ts` 及其公开 loader/materializer/publication caller。
> - 优先审计当前 coverage 低且已有合法输入的资产分支：missing/extra/hash/size/type、legacy→authored ownership、retirement path/foreign file、map residual/shape、publication conflict/idempotence、sprite registry identity。
> - 先读并排除 coverage85 Kimi extract/migrate、GLM-O asset、source-facts、sprite/runtime-resource 既有 fullName；CLI 真实写盘和已退役源不借测试覆盖。
> - 不改产品、旧测、config/baseline、真实 `projects/pal`/`data/raw`，不重启退役迁移器；禁止强转、skip、ignore、扩 timeout、真实目录写入或弱 hash 断言。
>
> ## 验收条件
>
> - 逐 source:line × public caller × synthetic legal input × oracle × fullName 建账，existing-proof/unreachable/blocked/product-counter 明确分列。
> - 合成工程必须 mkdtemp + finally 清理；合同同时断言 bytes/hash/path/catalog/ownership/zero-write/zero-delete/idempotence 等真实业务结果。
> - 反控严格绿→指定业务红→恢复绿，唯一 AssertionError、完整 JSON/raw/exit/signal/spawn、file×fullName identity、源/变异/恢复 hash 和临时树清理。
> - 定向/相邻/migrate 全量、typecheck、lint 0/0/0、docs、diff 通过；coverage 只作最终 main 并集统计，不作单卡门槛。
>
>
> ## 交付记录
>
> ### r1（2026-10-05，GLM）
>
> - 分支 `codex/glm-migrate-asset-supply-r1`（基线 `origin/main` `f4dbd0e3d`），唯一新增测试文件
>   `packages/migrate/src/pal-migrate-asset-supply.glm-r1.test.ts`（15 tests）与反控脚本
>   `packages/migrate/scripts/mas1-mutation-counterproof.mjs`；产品/schema/旧测/config/baseline/
>   真实数据零改动。
> - 排重账：7 文件逐轴（source:line × caller × 输入 × oracle × 判定）见
>   [dedup-ledger.md](../../../evidence/TEST-GLM-MIGRATE-ASSET-SUPPLY-1/dedup-ledger.md)；15 净新合同 +
>   unreachable/product-counter 账（含 :1154 经 validateAssetCatalog 前缀/路径门证明为防御重复、
>   :533 经 sentinel-only 块一手实探）。
> - 关键修正：kimi-r1 ledger 判 loadPalEffectSprites 合成不可达（「合法 YJ2 只能由 pal-extract
>   fixture 产生」）——本卡以一手推导修正：YJ2 初始平衡树（yj2.ts:74-81）路径可确定性构造单字面量
>   合法位流，frameAnimations 12 段合成全过，effect-sprites 分区（fast 0%）首次合成可达并补
>   census/magic 两合同。
> - 反控：13 针 × 严格四态（绿→指定业务红→字节恢复绿→rebuilt hash）全 PASS；runner 自测 11 例
>   （9 拒收反例 + 2 放行正例）；完整 file×fullName×status TSV identity artifact（28 phase，集合
>   sha256 级比较）；红相位唯一失败 fullName 精确相等 + AssertionError 片段 + console 旁证；
>   mkdtemp 残留前后扫描 0。见
>   [counterproof.json](../../../evidence/TEST-GLM-MIGRATE-ASSET-SUPPLY-1/counterproof.json)。
> - 门禁：定向 15/15；相邻 30 文件 294/294；migrate 全量 738/738；repo typecheck exit 0；
>   lint 0/0/0（3449 文件）；`git diff --cached --check` 零输出；docs 门主树 2 红项均为并行卡
>   在途目录（非本卡文件），本卡分支干净 worktree 复跑全绿。
> - 并行披露：交付期间另一卡（reforge 侧 bcs1）同工作树在途；反控 runner 加分支稳定门 + 目标源
>   index hash 门，外来未跟踪按前缀豁免并逐相位披露（回执 concurrentForeignWork）。
> - 覆盖率未按单卡统计（卡面口径：只作最终 main 并集统计）。
>
> ## 下一位 Agent 提示词（Codex 独立验收）
>
> ```text
> 你是 TEST-GLM-MIGRATE-ASSET-SUPPLY-1 的独立验收人（Codex）。工作树分支应为
> codex/glm-migrate-asset-supply-r1（基线 origin/main f4dbd0e3d）。先读任务卡
> docs/ops/tasks/TEST-GLM-MIGRATE-ASSET-SUPPLY-1.md、
> docs/ops/evidence/TEST-GLM-MIGRATE-ASSET-SUPPLY-1/{README.md,dedup-ledger.md,counterproof.json}
> 与测试文件 packages/migrate/src/pal-migrate-asset-supply.glm-r1.test.ts。
> 验收点：1) 排重账真实性（抽核 existing-proof/unreachable 判定的一手锚，尤其 :1154 防御重复、
> :533 sentinel 实探、YJ2 位流推导是否成立）；2) 15 合同的 caller/输入/oracle 是否钉定义点且与
> 旧 fullName 不重复；3) 反控四态与 identity TSV 是否可复核（node
> packages/migrate/scripts/mas1-mutation-counterproof.mjs 约 5 分钟，要求工作树对 7 个目标源
> clean）；4) 门禁复跑（定向/相邻/migrate 全量/typecheck/lint/diff --check）；5) 并行卡同树
> 交付的隔离是否成立（回执 concurrentForeignWork + 分支稳定门）。
> 不得改实现文件；验收结论（accept/counter + 理由）写回本卡并按当前模式收口或返工。
> ```
>
> ## Codex 独立验收与收口（2026-10-06）
>
> - 独立复跑：定向 15/15；strict asset-supply counterproof 13/13 PASS，identity TSV、四态 hash 和 mkdtemp 清理一致。
> - 独立质量门：Migrate typecheck、docs、git diff --check 通过；集成全仓 lint 3459 files、0/0/0。
> - 并行卡隔离与 YJ2 合成供应链证据可复核；结论：15 条资产供应合同满足门禁，合入 main，任务归档为 done。
>
> ## 历史：r1 开卡提示词（已被上方交付记录的验收提示词取代）
>
> ```text
> 你是 TEST-GLM-MIGRATE-ASSET-SUPPLY-1 的 Coding Owner（GLM）。先读 AGENTS.md、docs/phase2/READ-FIRST.md、docs/phase2/archive/audits/、coverage85-kimi-extract-migrate-r1、GLM-O asset 证据及本卡。
> 只在 codex/glm-migrate-asset-supply-r1 工作。先对 pal-assets.ts、pal-authored-overlays.ts、project-map-converter.ts、pal-store-boundary.ts、pal-current-publication.ts、pal-casualty-scripts.ts、pal-world-sprite-registry.ts 的公开 caller/合法合成输入/business oracle/fullName 排重。
> 重点审计 asset bytes/hash/path/catalog 闭包、legacy-authored ownership、retirement、map shape/residual、publication conflict/idempotence、sprite identity；不要重复 Kimi/GLM-O 已闭合合同，不写真实 projects/pal/data/raw。
> 只写本卡测试、合法 mkdtemp fixture、证据和回执；禁止产品/旧测/config/baseline/真实数据、退役迁移器、强转、skip、ignore、扩 timeout、弱 hash/路径断言。反控必须严格三态、完整 identity/hash/清理证明。
> 交付定向/相邻 test、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。覆盖率/例数不是完成条件，不得标 done，等待 Codex 独立验收。
> ```
>
<!-- original-source-quote:end -->
